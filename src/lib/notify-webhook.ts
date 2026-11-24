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

export interface NotifyResult {
  ok: boolean;
  skipped?: boolean;
  reason?: "NO_NUMBER" | "DISABLED" | "NOT_FOUND" | "API_ERROR";
  error?: string;
  numero?: string;
  mensagem?: string;
}

export interface NotifyOptions {
  /** Envia mesmo se o lembrete automático estiver desativado nas configurações */
  force?: boolean;
}

/**
 * Normaliza números brasileiros removendo pontuação/zeros à esquerda e
 * garantindo o DDI 55 quando o telefone tiver 10 ou 11 dígitos.
 */
export const normalizeWhatsappNumber = (raw: string): string => {
  let digits = (raw || "").replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }
  return digits;
};

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

const extractApiError = (data: any): string | null => {
  if (!data || typeof data !== "object") return null;
  if (data.ok === false) {
    return typeof data.error === "string" && data.error ? data.error : "Falha ao enviar via API do WhatsApp";
  }
  if (typeof data.detail === "string" && data.detail.trim()) {
    try {
      const parsed = JSON.parse(data.detail);
      if (parsed && (parsed.sucesso === false || parsed.ok === false || parsed.erro || parsed.error)) {
        return String(parsed.erro || parsed.error || "API do WhatsApp recusou o envio");
      }
    } catch {
      // detail não é JSON
    }
  }
  return null;
};

/**
 * Envia uma mensagem diretamente via Edge Function `send-whatsapp-notification`.
 * Retorna resultado estruturado em vez de silenciar falhas da VPS.
 */
export const sendWhatsAppViaApi = async (numeroRaw: string, mensagem: string): Promise<NotifyResult> => {
  const numero = normalizeWhatsappNumber(numeroRaw);
  if (numero.length < 10 || numero.length > 15) {
    return {
      ok: false,
      skipped: true,
      reason: "NO_NUMBER",
      error: "Número de WhatsApp inválido ou ausente",
      numero,
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke("send-whatsapp-notification", {
      body: { numero, mensagem },
    });
    if (error) {
      throw new Error(error.message || "Erro ao chamar função de WhatsApp");
    }

    const apiError = extractApiError(data);
    if (apiError) {
      console.warn("[whatsapp-api] falha reportada:", apiError, data);
      return {
        ok: false,
        reason: "API_ERROR",
        error: apiError,
        numero,
        mensagem,
      };
    }

    return { ok: true, numero, mensagem };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao enviar webhook";
    console.error("Erro ao enviar webhook", error);
    return {
      ok: false,
      reason: "API_ERROR",
      error: message,
      numero,
      mensagem,
    };
  }
};

/**
 * Reads the saved message template from configuracoes_lembretes for the given tipo,
 * skips if disabled (ativo=false) unless options.force=true, interpolates variables,
 * and POSTs to the WhatsApp API. Never throws.
 */
export const notifyLembrete = async (
  tipo: LembreteTipo,
  params: NotifyParams,
  options?: NotifyOptions,
): Promise<NotifyResult> => {
  const numero = normalizeWhatsappNumber(params.numero);
  if (numero.length < 10 || numero.length > 15) {
    console.log(`[webhook:${tipo}] ignorado — sem número de WhatsApp válido`);
    return {
      ok: false,
      skipped: true,
      reason: "NO_NUMBER",
      error: "Cliente não possui número de WhatsApp válido",
    };
  }
  try {
    const { data: cfg, error } = await supabase
      .from("configuracoes_lembretes")
      .select("mensagem, ativo")
      .eq("tipo", tipo)
      .maybeSingle();

    if (error) console.log(`[webhook:${tipo}] erro ao ler config`, error);

    if (!options?.force && cfg && cfg.ativo === false) {
      console.log(`[webhook:${tipo}] desativado nas Configurações de Lembretes`);
      return {
        ok: false,
        skipped: true,
        reason: "DISABLED",
        error: "Envio automático desativado nas Configurações de Lembretes",
      };
    }

    const template = (cfg?.mensagem && cfg.mensagem.trim()) || fallbackMessages[tipo];
    const mensagem = interpolate(template, {
      ...params,
      servico: params.servico?.trim() || undefined,
    });
    console.log(`[webhook:${tipo}] enviando para ${numero}`);
    return await sendWhatsAppViaApi(numero, mensagem);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    console.log(`[webhook:${tipo}] erro`, error);
    return { ok: false, reason: "API_ERROR", error: message, numero };
  }
};

/**
 * Backwards-compatible: confirmation notification using saved template.
 */
export const notifyAgendamentoConfirmado = async (
  params: NotifyParams,
  options?: NotifyOptions,
): Promise<NotifyResult> => {
  return await notifyLembrete("confirmacao", params, options);
};

/**
 * Lookup the client's whatsapp + name from the agendamento id, then notify
 * using the saved template for the given tipo.
 */
export const notifyLembreteById = async (
  agendamentoId: string,
  tipo: LembreteTipo,
  options?: NotifyOptions,
): Promise<NotifyResult> => {
  try {
    const { data: ag, error: agError } = await supabase
      .from("agendamentos")
      .select("user_id, cliente_nome, data_agendamento, horario, servico, variacao, valor")
      .eq("id", agendamentoId)
      .maybeSingle();

    if (agError || !ag) {
      return {
        ok: false,
        skipped: true,
        reason: "NOT_FOUND",
        error: agError?.message || "Agendamento não encontrado",
      };
    }

    let prof: { nome: string | null; whatsapp: string | null } | null = null;
    let cli: { nome: string | null; telefone: string | null } | null = null;

    if (ag.user_id) {
      const { data: profData } = await supabase
        .from("profiles")
        .select("nome, whatsapp")
        .eq("id", ag.user_id)
        .maybeSingle();
      prof = profData;

      if (!prof?.whatsapp) {
        const { data: cliData } = await supabase
          .from("clientes")
          .select("nome, telefone")
          .eq("id", ag.user_id)
          .maybeSingle();
        cli = cliData;
      }
    }

    const numero = prof?.whatsapp || cli?.telefone || "";
    const nome = ag.cliente_nome || prof?.nome || cli?.nome || "";

    if (!numero) {
      return {
        ok: false,
        skipped: true,
        reason: "NO_NUMBER",
        error: "Cliente não possui número de WhatsApp cadastrado",
      };
    }

    const servicoLabel = [ag.servico?.trim(), ag.variacao?.trim()].filter(Boolean).join(" · ") || undefined;
    const valorNum = ag.valor != null && !Number.isNaN(Number(ag.valor)) ? Number(ag.valor) : undefined;

    return await notifyLembrete(
      tipo,
      {
        numero,
        nome,
        data: ag.data_agendamento,
        horario: ag.horario,
        servico: servicoLabel,
        valor: valorNum,
      },
      options,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao enviar webhook por id";
    console.log("Erro ao enviar webhook por id", error);
    return { ok: false, reason: "API_ERROR", error: message };
  }
};

/**
 * Backwards-compatible alias for confirmation by id.
 */
export const notifyAgendamentoConfirmadoById = async (
  agendamentoId: string,
  options?: NotifyOptions,
): Promise<NotifyResult> => {
  return await notifyLembreteById(agendamentoId, "confirmacao", options);
};
