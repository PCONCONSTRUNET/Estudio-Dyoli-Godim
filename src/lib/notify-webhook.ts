import { supabase } from "@/integrations/supabase/client";

export type LembreteTipo =
  | "confirmacao"
  | "lembrete"
  | "cancelamento"
  | "comparecimento"
  | "pos_atendimento";

interface NotifyParams {
  numero: string;
  nome: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:MM
  servico?: string;
  valor?: number;
}

const formatDate = (iso: string) => {
  try {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  } catch {
    return iso;
  }
};

const formatCurrency = (v?: number) => {
  if (typeof v !== "number") return "";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

/**
 * Replace common placeholders in a saved template message.
 * Supports: {nome} {cliente} {data} {horario} {hora} {servico} {valor}
 * (Aliases also supported with [BRACKETS], e.g. [Nome_do_cliente])
 */
const SITE_URL = "https://www.estudiodyoligodim.com.br";
const LINK_AVALIACAO = `${SITE_URL}/avaliar`;

const interpolate = (template: string, params: NotifyParams) => {
  const map: Record<string, string> = {
    nome: params.nome || "cliente",
    cliente: params.nome || "cliente",
    nome_do_cliente: params.nome || "cliente",
    data: formatDate(params.data),
    data_do_agendamento: formatDate(params.data),
    horario: params.horario,
    hora: params.horario,
    tempo: params.horario,
    servico: params.servico || "",
    valor: formatCurrency(params.valor),
    link_avaliacao: LINK_AVALIACAO,
    link: LINK_AVALIACAO,
  };

  let out = template;
  // {placeholder}
  out = out.replace(/\{([a-zA-Z_]+)\}/g, (_, k) => {
    const key = k.toLowerCase();
    return map[key] !== undefined ? map[key] : `{${k}}`;
  });
  // [Placeholder] (case-insensitive)
  out = out.replace(/\[([a-zA-Z_]+)\]/g, (_, k) => {
    const key = k.toLowerCase();
    return map[key] !== undefined ? map[key] : `[${k}]`;
  });
  return out;
};

const fallbackMessages: Record<LembreteTipo, string> = {
  confirmacao:
    "✅ Olá {nome}, seu agendamento no Estúdio Dyoli Godim está confirmado para {data} às {horario}. Te esperamos! 🌸",
  lembrete:
    "⏰ Olá {nome}, lembrete: seu atendimento no Estúdio Dyoli Godim é em {data} às {horario}.",
  cancelamento:
    "❌ Olá {nome}, seu agendamento no Estúdio Dyoli Godim para {data} às {horario} foi cancelado.",
  comparecimento:
    "💖 Obrigada por comparecer, {nome}! Esperamos te ver novamente em breve.",
  pos_atendimento:
    "⭐ Olá {nome}, esperamos que tenha amado seu atendimento no Estúdio Dyoli Godim! Conte pra gente como foi: {link_avaliacao} 💛",
};

const sendWebhook = async (numero: string, mensagem: string) => {
  try {
    const { error } = await supabase.functions.invoke("send-whatsapp-notification", {
      body: { numero, mensagem },
    });
    if (error) throw error;
  } catch (error) {
    console.log("Erro ao enviar webhook", error);
  }
};

/**
 * Reads the saved message template from configuracoes_lembretes for the given tipo,
 * skips if disabled (ativo=false), interpolates variables, and POSTs to the webhook.
 * Never throws.
 */
export const notifyLembrete = async (tipo: LembreteTipo, params: NotifyParams) => {
  if (!params.numero) {
    console.log(`[webhook:${tipo}] ignorado — sem número de WhatsApp`);
    return;
  }
  try {
    const { data: cfg, error } = await supabase
      .from("configuracoes_lembretes")
      .select("mensagem, ativo")
      .eq("tipo", tipo)
      .maybeSingle();

    if (error) console.log(`[webhook:${tipo}] erro ao ler config`, error);

    if (cfg && cfg.ativo === false) {
      console.log(`[webhook:${tipo}] desativado nas Configurações de Lembretes`);
      return;
    }

    const template = (cfg?.mensagem && cfg.mensagem.trim()) || fallbackMessages[tipo];
    const mensagem = interpolate(template, params);
    console.log(`[webhook:${tipo}] enviando para ${params.numero}`);
    await sendWebhook(params.numero, mensagem);
  } catch (error) {
    console.log(`[webhook:${tipo}] erro`, error);
  }
};

/**
 * Backwards-compatible: confirmation notification using saved template.
 */
export const notifyAgendamentoConfirmado = async (params: NotifyParams) => {
  await notifyLembrete("confirmacao", params);
};

/**
 * Lookup the client's whatsapp + name from the agendamento id, then notify
 * using the saved template for the given tipo.
 */
export const notifyLembreteById = async (agendamentoId: string, tipo: LembreteTipo) => {
  try {
    const { data: ag } = await supabase
      .from("agendamentos")
      .select("user_id, cliente_nome, data_agendamento, horario, servico, valor")
      .eq("id", agendamentoId)
      .maybeSingle();
    if (!ag) return;
    const { data: prof } = await supabase
      .from("profiles")
      .select("nome, whatsapp")
      .eq("id", ag.user_id)
      .maybeSingle();
    let numero = prof?.whatsapp || "";
    let nome = ag.cliente_nome || prof?.nome || "";

    if (!numero && ag.user_id) {
      const { data: cli } = await supabase
        .from("clientes")
        .select("nome, telefone")
        .eq("id", ag.user_id)
        .maybeSingle();
      if (cli?.telefone) {
        numero = cli.telefone;
        if (!nome) nome = cli.nome || "";
      }
    }

    if (!numero) return;
    await notifyLembrete(tipo, {
      numero,
      nome: ag.cliente_nome || prof?.nome || "",
      data: ag.data_agendamento,
      horario: ag.horario,
      servico: ag.servico || undefined,
      valor: typeof ag.valor === "number" ? ag.valor : undefined,
    });
  } catch (error) {
    console.log("Erro ao enviar webhook por id", error);
  }
};

/**
 * Backwards-compatible alias for confirmation by id.
 */
export const notifyAgendamentoConfirmadoById = async (agendamentoId: string) => {
  await notifyLembreteById(agendamentoId, "confirmacao");
};
