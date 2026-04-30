import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEBHOOK_URL = "https://graffiti-plunging-ravine.ngrok-free.dev/webhook/notificacao";
const WEBHOOK_TOKEN = "dyoli123";

const fallbackMessages: Record<string, string> = {
  comparecimento: "💖 Obrigada por comparecer, {nome}! Esperamos te ver novamente em breve.",
  pos_atendimento: "⭐ Olá {nome}, como foi seu atendimento? Sua opinião é muito importante!",
};

const formatDate = (iso: string) => {
  try {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  } catch {
    return iso;
  }
};

const interpolate = (template: string, p: { nome: string; data: string; horario: string; servico?: string }) => {
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
  };
  let out = template.replace(/\{([a-zA-Z_]+)\}/g, (_, k) => map[k.toLowerCase()] ?? `{${k}}`);
  out = out.replace(/\[([a-zA-Z_]+)\]/g, (_, k) => map[k.toLowerCase()] ?? `[${k}]`);
  return out;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const brasiliaOffset = -3 * 60;
    const brasiliaTime = new Date(now.getTime() + (brasiliaOffset + now.getTimezoneOffset()) * 60000);

    const todayStr = brasiliaTime.toISOString().split("T")[0];
    const currentHour = brasiliaTime.getHours();
    const currentMinute = brasiliaTime.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    const { data: agendamentos, error } = await supabase
      .from("agendamentos")
      .select("id, data_agendamento, horario, duracao_minutos, servico, cliente_nome, user_id, origem")
      .eq("status", "confirmado")
      .lte("data_agendamento", todayStr);

    if (error) throw error;

    const toComplete: typeof agendamentos = [];

    for (const a of agendamentos || []) {
      const [h, m] = a.horario.split(":").map(Number);
      const endMinutes = h * 60 + m + (a.duracao_minutos || 60);

      if (a.data_agendamento < todayStr) {
        toComplete.push(a);
      } else if (a.data_agendamento === todayStr && currentTotalMinutes >= endMinutes) {
        toComplete.push(a);
      }
    }

    if (toComplete.length > 0) {
      const ids = toComplete.map((a) => a.id);
      const { error: updateError } = await supabase
        .from("agendamentos")
        .update({ status: "concluido" })
        .in("id", ids);

      if (updateError) throw updateError;

      // Load lembrete templates + toggles
      const { data: configs } = await supabase
        .from("configuracoes_lembretes")
        .select("tipo, ativo, mensagem")
        .in("tipo", ["comparecimento", "pos_atendimento"]);

      const cfgMap = new Map((configs || []).map((c: any) => [c.tipo, c]));

      // Fire webhooks for each completed appointment (somente origem='app')
      for (const a of toComplete) {
        if (a.origem !== "app") continue;
        const { data: prof } = await supabase
          .from("profiles")
          .select("nome, whatsapp")
          .eq("id", a.user_id)
          .maybeSingle();

        const numero = prof?.whatsapp || "";
        if (!numero) continue;

        const nome = a.cliente_nome || prof?.nome || "";

        for (const tipo of ["comparecimento", "pos_atendimento"] as const) {
          const cfg: any = cfgMap.get(tipo);
          if (cfg && cfg.ativo === false) continue;
          const template = (cfg?.mensagem && cfg.mensagem.trim()) || fallbackMessages[tipo];
          const mensagem = interpolate(template, {
            nome,
            data: a.data_agendamento,
            horario: a.horario,
            servico: a.servico || undefined,
          });

          fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ numero, mensagem, token: WEBHOOK_TOKEN }),
          }).catch((e) => console.log(`[webhook:${tipo}] erro`, e));
        }
      }
    }

    return new Response(
      JSON.stringify({ completed: toComplete.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
