// Envia lembretes pre-atendimento (X horas antes) via webhook do WhatsApp.
// - Le configuracoes_lembretes WHERE tipo='lembrete' AND ativo=true
// - Busca agendamentos confirmados que caem na janela
//   [horas_antes - 30min, horas_antes + 30min] a partir de agora (Brasilia)
// - Envia o webhook e marca o agendamento para nao reenviar (usando
//   lembretes_enviados como flag idempotente - UNIQUE(agendamento_id)).
//
// Pensado para rodar a cada ~10-15 minutos via pg_cron.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEBHOOK_URL = "http://217.76.50.145:3001/webhook/notificacao";
const WEBHOOK_TOKEN = "dyoli123";

const fallbackTemplate =
  "Ola {nome}, lembrete: seu atendimento no Estudio Dyoli Godim e em {data} as {horario}.";

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

// Retorna a data/hora atual em Brasilia (UTC-3, sem horario de verao).
const nowBrasilia = () => {
  const now = new Date();
  return new Date(now.getTime() + (-3 * 60 + now.getTimezoneOffset()) * 60000);
};

// Constroi um Date a partir de data (YYYY-MM-DD) e horario (HH:MM) tratados
// como horario de Brasilia (UTC-3).
const parseBrasilia = (data: string, horario: string): Date => {
  const [y, mo, d] = data.split("-").map(Number);
  const [h, mi] = horario.split(":").map(Number);
  // Brasilia = UTC-3 -> adiciona 3h para converter para UTC
  return new Date(Date.UTC(y, mo - 1, d, h + 3, mi));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Carrega configuracao do lembrete pre-atendimento
    const { data: cfg } = await supabase
      .from("configuracoes_lembretes")
      .select("ativo, mensagem, horas_antes")
      .eq("tipo", "lembrete")
      .maybeSingle();

    if (!cfg || cfg.ativo === false) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "lembrete desativado ou nao configurado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const horasAntes = cfg.horas_antes ?? 24;
    const template = (cfg.mensagem && cfg.mensagem.trim()) || fallbackTemplate;

    // 2) Janela estreita: agendamentos que estao a exatamente ~horasAntes
    //    de distancia (+-30 min). Evita capturar todos os agendamentos do dia.
    const agora = nowBrasilia();
    const MARGEM_MS = 30 * 60 * 1000; // 30 minutos
    const alvoMs = horasAntes * 60 * 60 * 1000;
    const limiteMin = new Date(agora.getTime() + alvoMs - MARGEM_MS);
    const limiteMax = new Date(agora.getTime() + alvoMs + MARGEM_MS);

    // Coleta as datas (YYYY-MM-DD) que podem estar na janela
    const datesToCheck = new Set<string>([
      limiteMin.toISOString().split("T")[0],
      limiteMax.toISOString().split("T")[0],
    ]);

    const inWindow = (data: string, horario: string) => {
      const dt = parseBrasilia(data, horario);
      return dt >= limiteMin && dt <= limiteMax;
    };

    // 3) Busca agendamentos elegiveis (app e manual)
    const { data: ags, error } = await supabase
      .from("agendamentos")
      .select("id, user_id, cliente_nome, data_agendamento, horario, servico, valor, status, origem")
      .eq("status", "confirmado")
      .in("data_agendamento", Array.from(datesToCheck));

    if (error) throw error;

    const elegiveis = (ags || []).filter((a) => inWindow(a.data_agendamento, a.horario));

    if (elegiveis.length === 0) {
      return new Response(
        JSON.stringify({ enviados: 0, motivo: "nenhum agendamento na janela" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // 4) Filtra os que ainda nao receberam (flag em lembretes_enviados)
    const ids = elegiveis.map((a) => a.id);
    const { data: jaEnviados } = await supabase
      .from("lembretes_enviados")
      .select("agendamento_id")
      .in("agendamento_id", ids);
    const enviadosSet = new Set((jaEnviados || []).map((r) => r.agendamento_id));

    const pendentes = elegiveis.filter((a) => !enviadosSet.has(a.id));

    let enviados = 0;
    const erros: string[] = [];

    for (const a of pendentes) {
      let numero = "";
      let nomeFinal = a.cliente_nome || "";

      if (a.user_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("nome, whatsapp")
          .eq("id", a.user_id)
          .maybeSingle();

        if (prof?.whatsapp) {
          numero = prof.whatsapp.replace(/\D/g, "");
          if (!nomeFinal) nomeFinal = prof.nome || "";
        }

        if (!numero) {
          const { data: cli } = await supabase
            .from("clientes")
            .select("nome, telefone")
            .eq("id", a.user_id)
            .maybeSingle();

          if (cli?.telefone) {
            numero = cli.telefone.replace(/\D/g, "");
            if (!nomeFinal) nomeFinal = cli.nome || "";
          }
        }
      }

      if (!numero) continue;

      const mensagem = interpolate(template, {
        nome: nomeFinal,
        data: a.data_agendamento,
        horario: a.horario,
        servico: a.servico || undefined,
        valor: typeof a.valor === "number" ? a.valor : undefined,
      });

      try {
        // Grava o flag de idempotencia ANTES de enviar.
        // Se o INSERT falhar (UNIQUE - ja enviado), pula sem enviar.
        const { error: flagError } = await supabase
          .from("lembretes_enviados")
          .insert({ agendamento_id: a.id });

        if (flagError) {
          // Ja enviado anteriormente (duplicate key) ou erro real - pula.
          continue;
        }

        const resp = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numero, mensagem, token: WEBHOOK_TOKEN }),
        });

        if (!resp.ok) {
          // Falhou no envio - remove o flag para tentar de novo na proxima rodada
          await supabase
            .from("lembretes_enviados")
            .delete()
            .eq("agendamento_id", a.id);
          erros.push(`${a.id}: HTTP ${resp.status}`);
          continue;
        }

        enviados += 1;
      } catch (e) {
        // Erro inesperado - remove o flag para tentar de novo
        await supabase
          .from("lembretes_enviados")
          .delete()
          .eq("agendamento_id", a.id);
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
