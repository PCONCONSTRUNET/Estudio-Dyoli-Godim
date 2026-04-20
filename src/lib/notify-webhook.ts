import { supabase } from "@/integrations/supabase/client";

const WEBHOOK_URL = "http://localhost:3000/webhook/notificacao";
const WEBHOOK_TOKEN = "dyoli123";

interface NotifyParams {
  numero: string;
  nome: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:MM
}

const formatDate = (iso: string) => {
  try {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  } catch {
    return iso;
  }
};

/**
 * Sends a confirmation webhook in background. Never throws.
 * Only call after the appointment was successfully created/confirmed.
 */
export const notifyAgendamentoConfirmado = async ({ numero, nome, data, horario }: NotifyParams) => {
  if (!numero) return;
  const mensagem = `✅ *Agendamento Confirmado no Estudio Dyoli Godim!* 🌸\n\nOlá ${nome || "cliente"}, recebemos a confirmação do seu agendamento para o dia ${formatDate(data)} às ${horario}. Te esperamos!`;
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero, mensagem, token: WEBHOOK_TOKEN }),
    });
  } catch (error) {
    console.log("Erro ao enviar webhook de confirmação", error);
  }
};

/**
 * Lookup the client's whatsapp + name from the agendamento id, then notify.
 * Used by admin actions where only the appointment id is known.
 */
export const notifyAgendamentoConfirmadoById = async (agendamentoId: string) => {
  try {
    const { data: ag } = await supabase
      .from("agendamentos")
      .select("user_id, cliente_nome, data_agendamento, horario")
      .eq("id", agendamentoId)
      .maybeSingle();
    if (!ag) return;
    const { data: prof } = await supabase
      .from("profiles")
      .select("nome, whatsapp")
      .eq("id", ag.user_id)
      .maybeSingle();
    const numero = prof?.whatsapp || "";
    if (!numero) return;
    await notifyAgendamentoConfirmado({
      numero,
      nome: ag.cliente_nome || prof?.nome || "",
      data: ag.data_agendamento,
      horario: ag.horario,
    });
  } catch (error) {
    console.log("Erro ao enviar webhook por id", error);
  }
};
