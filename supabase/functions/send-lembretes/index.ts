// Envia lembretes pré-atendimento (X horas antes) via webhook do WhatsApp.
// - Lê configuracoes_lembretes WHERE tipo='lembrete' AND ativo=true
// - Busca agendamentos confirmados com origem='app' que caem na janela
//   [horas_antes, horas_antes + 15min] a partir de agora (Brasília)
// - Envia o webhook e marca o agendamento para não reenviar (usando
//   horarios_bloqueados como flag idempotente — motivo='lembrete-enviado:<id>').
//
// Pensado para rodar a cada ~10–15 minutos via pg_cron.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEBHOOK_URL = "https://graffiti-plunging-ravine.ngrok-free.dev/webhook/notificacao";
const WEBHOOK_TOKEN = "dyoli123";

const fallbackTemplate =
  "⏰ Olá {nome}, lembrete: seu atendimento no Estúdio Dyoli Godim é em {data} às {horario}.";

const formatDate = (iso: string) => {
  try {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  } catch {
    return iso;
  }
};

const interpolate = (
  template: string,
  p: { nome: string; data: string; horario: string; servico?: string; valor?: number },
) => {
  const valorStr =
    typeof p.valor === "number"
      ? p.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "";
  const map: Record<string, string> = {
    nome: p.nome || "cliente",
    cliente: p.nome || "cliente",
    nome_do_cliente: p.nome || "cliente",
    data: formatDate(p.data),
    data_do_agendamento: formatDate(p.data),
    horario: p.horario,
    hora: p.horario,
    tempo: p.horario,
    servico: p.servico || "",
    valor: valorStr,
  };
  let out = template.replace(/\{([a-zA-Z_]+)\}/g, (_, k) => map[k.toLowerCase()] ?? `{${k}}`);
  out = out.replace(/\[([a-zA-Z_]+)\]/g, (_, k) => map[k.toLowerCase()] ?? `[${k}]`);
  return out;
};

// Retorna a data/hora atual em Brasília (UTC-3, sem horário de verão).
const nowBrasilia = () => {
  const now = new Date();
  return new Date(now.getTime() + (-3 * 60 + now.getTimezoneOffset()) * 60000);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Carrega configuração do lembrete pré-atendimento
    const { data: cfg } = await supabase
      .from("configuracoes_lembretes")
      .select("ativo, mensagem, horas_antes")
      .eq("tipo", "lembrete")
      .maybeSingle();

    if (!cfg || cfg.ativo === false) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "lembrete desativado ou não configurado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const horasAntes = cfg.horas_antes ?? 24;
    const template = (cfg.mensagem && cfg.mensagem.trim()) || fallbackTemplate;

    // 2) Calcula janela alvo: agora + horasAntes ± 15 minutos
    const target = new Date(nowBrasilia().getTime() + horasAntes * 60 * 60 * 1000);
    const windowStart = new Date(target.getTime() - 15 * 60 * 1000);
    const windowEnd = new Date(target.getTime() + 15 * 60 * 1000);

    // Pesquisa em duas datas possíveis (caso a janela cruze meia-noite)
    const datesToCheck = new Set<string>([
      windowStart.toISOString().split("T")[0],
      windowEnd.toISOString().split("T")[0],
    ]);

    const inWindow = (data: string, horario: string) => {
      const [y, mo, d] = data.split("-").map(Number);
      const [h, mi] = horario.split(":").map(Number);
      const dt = new Date(Date.UTC(y, mo - 1, d, h, mi));
      return dt >= windowStart && dt <= windowEnd;
    };

    // 3) Busca agendamentos elegíveis (somente origem='app')
    const { data: ags, error } = await supabase
      .from("agendamentos")
      .select("id, user_id, cliente_nome, data_agendamento, horario, servico, valor, status, origem")
      .eq("status", "confirmado")
      .eq("origem", "app")
      .in("data_agendamento", Array.from(datesToCheck));

    if (error) throw error;

    const elegiveis = (ags || []).filter((a) => inWindow(a.data_agendamento, a.horario));

    if (elegiveis.length === 0) {
      return new Response(
        JSON.stringify({ enviados: 0, motivo: "nenhum agendamento na janela" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // 4) Filtra os que ainda não receberam (flag em horarios_bloqueados)
    const ids = elegiveis.map((a) => a.id);
    const motivos = ids.map((id) => `lembrete-enviado:${id}`);
    const { data: jaEnviados } = await supabase
      .from("horarios_bloqueados")
      .select("motivo")
      .in("motivo", motivos);
    const enviadosSet = new Set((jaEnviados || []).map((r) => r.motivo));

    const pendentes = elegiveis.filter((a) => !enviadosSet.has(`lembrete-enviado:${a.id}`));

    let enviados = 0;
    const erros: string[] = [];

    for (const a of pendentes) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("nome, whatsapp")
        .eq("id", a.user_id)
        .maybeSingle();

      const numero = prof?.whatsapp || "";
      if (!numero) continue;

      const mensagem = interpolate(template, {
        nome: a.cliente_nome || prof?.nome || "",
        data: a.data_agendamento,
        horario: a.horario,
        servico: a.servico || undefined,
        valor: typeof a.valor === "number" ? a.valor : undefined,
      });

      try {
        const resp = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numero, mensagem, token: WEBHOOK_TOKEN }),
        });

        if (!resp.ok) {
          erros.push(`${a.id}: HTTP ${resp.status}`);
          continue;
        }

        // Marca como enviado (idempotência)
        await supabase.from("horarios_bloqueados").insert({
          data: a.data_agendamento,
          horario: a.horario,
          motivo: `lembrete-enviado:${a.id}`,
        });
        enviados += 1;
      } catch (e) {
        erros.push(`${a.id}: ${(e as Error).message}`);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        elegiveis: elegiveis.length,
        ja_enviados: elegiveis.length - pendentes.length,
        enviados,
        erros,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
