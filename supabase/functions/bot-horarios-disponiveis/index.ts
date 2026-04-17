import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, checkBotAuth, jsonResponse } from "../_shared/bot-auth.ts";

// Returns available 30-min slots for a given service & date
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authError = checkBotAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { servico_id, data } = body as { servico_id?: string; data?: string };

    if (!servico_id || !data) {
      return jsonResponse(
        { success: false, error: "servico_id and data (YYYY-MM-DD) are required" },
        400
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return jsonResponse(
        { success: false, error: "data must be in YYYY-MM-DD format" },
        400
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load service
    const { data: servico, error: servicoErr } = await supabase
      .from("servicos")
      .select("id, nome, duracao_minutos, preco")
      .eq("id", servico_id)
      .eq("ativo", true)
      .maybeSingle();

    if (servicoErr) throw servicoErr;
    if (!servico) {
      return jsonResponse({ success: false, error: "Serviço não encontrado" }, 404);
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
      allSlots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }

    // Filter: a slot is available only if all `slotsNeeded` consecutive 30-min blocks are free
    const disponiveis = allSlots.filter((slot) => {
      const [sh, sm] = slot.split(":").map(Number);
      const startT = sh * 60 + sm;
      for (let i = 0; i < slotsNeeded; i++) {
        const checkT = startT + i * 30;
        const ch = Math.floor(checkT / 60);
        const cm = checkT % 60;
        const checkSlot = `${String(ch).padStart(2, "0")}:${String(cm).padStart(2, "0")}`;
        if (bloqueadosSet.has(checkSlot)) return false;
      }
      return true;
    });

    // Filter past slots if requested date is today
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
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
    });
  } catch (err) {
    console.error("bot-horarios-disponiveis error:", err);
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
