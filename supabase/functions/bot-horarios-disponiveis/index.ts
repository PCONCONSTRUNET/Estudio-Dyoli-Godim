import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  checkBotAuth,
  corsHeaders,
  jsonResponse,
} from "../_shared/bot-auth.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeDate(input?: string): string | null {
  if (!input) return null;
  const value = input.trim().toLowerCase();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const today = new Date();
  if (["hoje", "hj"].includes(value)) {
    return `${today.getFullYear()}-${
      String(today.getMonth() + 1).padStart(2, "0")
    }-${String(today.getDate()).padStart(2, "0")}`;
  }
  if (["amanha", "amanhã"].includes(value)) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return `${tomorrow.getFullYear()}-${
      String(tomorrow.getMonth() + 1).padStart(2, "0")
    }-${String(tomorrow.getDate()).padStart(2, "0")}`;
  }

  const ddmm = value.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/);
  if (!ddmm) return null;
  const day = Number(ddmm[1]);
  const month = Number(ddmm[2]);
  let year = ddmm[3] ? Number(ddmm[3]) : today.getFullYear();
  if (year < 100) year += 2000;
  const candidate = new Date(year, month - 1, day);
  if (
    !ddmm[3] &&
    candidate < new Date(today.getFullYear(), today.getMonth(), today.getDate())
  ) {
    year += 1;
  }
  return `${year}-${String(month).padStart(2, "0")}-${
    String(day).padStart(2, "0")
  }`;
}

// Returns available 30-min slots for a given service & date
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authError = checkBotAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const servico_id = body.servico_id ?? body.service_id ?? body.servicoId ??
      body.serviceId;
    const servico_nome = body.servico_nome ?? body.service_name ??
      body.servico ?? body.service;
    const data = normalizeDate(body.data ?? body.date);

    if ((!servico_id && !servico_nome) || !data) {
      return jsonResponse(
        {
          success: false,
          error: "servico_id/servico_nome and data are required",
        },
        400,
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load service
    let servicoQuery = supabase
      .from("servicos")
      .select("id, nome, duracao_minutos, preco")
      .eq("ativo", true);

    servicoQuery = servico_id && UUID_RE.test(String(servico_id))
      ? servicoQuery.eq("id", servico_id)
      : servicoQuery.ilike("nome", servico_nome ?? String(servico_id));

    const { data: servico, error: servicoErr } = await servicoQuery
      .maybeSingle();

    if (servicoErr) throw servicoErr;
    if (!servico) {
      return jsonResponse(
        { success: false, error: "Serviço não encontrado" },
        404,
      );
    }

    // Day of week (0=Sunday, 6=Saturday) — interpret in local time
    const [yy, mm, dd] = data.split("-").map(Number);
    const date = new Date(Date.UTC(yy, mm - 1, dd));
    const diaSemana = date.getUTCDay();

    // Load business hours for that day
    const { data: horario, error: horarioErr } = await supabase
      .from("horarios_funcionamento")
      .select("aberto, hora_inicio, hora_fim")
      .eq("dia_semana", diaSemana)
      .maybeSingle();

    if (horarioErr) throw horarioErr;

    if (!horario || !horario.aberto) {
      return jsonResponse({
        success: true,
        servico,
        data,
        horarios_disponiveis: [],
        motivo: "Estabelecimento fechado neste dia",
      });
    }

    // Load blocked slots for that date
    const { data: bloqueados, error: bloqErr } = await supabase
      .from("horarios_bloqueados")
      .select("horario")
      .eq("data", data);

    if (bloqErr) throw bloqErr;
    const bloqueadosSet = new Set((bloqueados ?? []).map((b) => b.horario));

    const { data: agendamentos, error: agErr } = await supabase
      .from("agendamentos")
      .select("horario, duracao_minutos")
      .eq("data_agendamento", data)
      .in("status", ["pendente", "confirmado", "concluido"]);

    if (agErr) throw agErr;
    (agendamentos ?? []).forEach((ag) => {
      const duracaoAgendamento = ag.duracao_minutos || 60;
      const [ah, am] = ag.horario.split(":").map(Number);
      const startT = ah * 60 + am;
      for (let t = 0; t < duracaoAgendamento; t += 30) {
        const checkT = startT + t;
        const ch = Math.floor(checkT / 60);
        const cm = checkT % 60;
        bloqueadosSet.add(
          `${String(ch).padStart(2, "0")}:${String(cm).padStart(2, "0")}`,
        );
      }
    });

    // Generate 30-min slots between hora_inicio and hora_fim
    const [hIni, mIni] = horario.hora_inicio.split(":").map(Number);
    const [hFim, mFim] = horario.hora_fim.split(":").map(Number);
    const startMin = hIni * 60 + mIni;
    const endMin = hFim * 60 + mFim;
    const duracao = servico.duracao_minutos || 60;
    const slotsNeeded = Math.ceil(duracao / 30);

    const allSlots: string[] = [];
    for (let t = startMin; t + duracao <= endMin; t += 30) {
      const h = Math.floor(t / 60);
      const m = t % 60;
      allSlots.push(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      );
    }

    // Filter: a slot is available only if all `slotsNeeded` consecutive 30-min blocks are free
    const disponiveis = allSlots.filter((slot) => {
      const [sh, sm] = slot.split(":").map(Number);
      const startT = sh * 60 + sm;
      for (let i = 0; i < slotsNeeded; i++) {
        const checkT = startT + i * 30;
        const ch = Math.floor(checkT / 60);
        const cm = checkT % 60;
        const checkSlot = `${String(ch).padStart(2, "0")}:${
          String(cm).padStart(2, "0")
        }`;
        if (bloqueadosSet.has(checkSlot)) return false;
      }
      return true;
    });

    // Filter past slots if requested date is today
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${
      String(today.getMonth() + 1).padStart(2, "0")
    }-${String(today.getDate()).padStart(2, "0")}`;
    let finalSlots = disponiveis;
    if (data === todayStr) {
      const nowMin = today.getHours() * 60 + today.getMinutes();
      finalSlots = disponiveis.filter((s) => {
        const [h, m] = s.split(":").map(Number);
        return h * 60 + m > nowMin + 30; // 30-min buffer
      });
    }

    return jsonResponse({
      success: true,
      servico,
      data,
      horarios_disponiveis: finalSlots,
      horarios: finalSlots,
      available_times: finalSlots,
    });
  } catch (err) {
    console.error("bot-horarios-disponiveis error:", err);
    return jsonResponse(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      500,
    );
  }
});
