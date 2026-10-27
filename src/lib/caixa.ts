export interface CaixaMovimentacao {
  id: string;
  referencia_tipo: "agendamento" | "venda";
  referencia_id: string;
  tipo: "entrada" | "estorno" | "gorjeta";
  valor: number;
  forma_pagamento?: string | null;
  data_pagamento: string;
  ocorrido_em: string;
  origem: string;
  descricao?: string | null;
  cliente_nome?: string | null;
  contabiliza_comissao: boolean;
  inferido: boolean;
}

export interface AgendamentoCaixa {
  id: string;
  data_agendamento: string;
  status: string;
  servico?: string | null;
  valor: number;
  valor_pago?: number | null;
  valor_gorjeta?: number | null;
  valor_desconto_credito?: number | null;
}

export const isLancamentoOperacional = (servico?: string | null) =>
  servico !== "Adição de Crédito" &&
  servico !== "Entrada Manual" &&
  !servico?.startsWith("Pagamento de Dívida");

export const normalizePaymentMethod = (forma?: string | null) => {
  const value = (forma || "").toLowerCase().trim();
  if (value.includes("pix")) return "pix";
  if (
    value.includes("cart") ||
    value.includes("credito") ||
    value.includes("crédito") ||
    value.includes("debito") ||
    value.includes("débito")
  ) return "cartao";
  if (
    value.includes("dinheiro") ||
    value.includes("especie") ||
    value.includes("espécie") ||
    value.includes("cash")
  ) return "dinheiro";
  return "outro";
};

export const calculateDailyClosing = (
  allAppointments: AgendamentoCaixa[],
  movements: CaixaMovimentacao[],
  selectedDate: string,
) => {
  const items = allAppointments.filter(
    (appointment) =>
      appointment.data_agendamento === selectedDate && appointment.status !== "cancelado",
  );
  const serviceItems = items.filter((appointment) => isLancamentoOperacional(appointment.servico));
  const dayMovements = movements.filter((movement) => movement.data_pagamento === selectedDate);
  const appointmentIds = new Set(serviceItems.map((appointment) => appointment.id));

  const total = serviceItems.reduce(
    (sum, appointment) =>
      sum +
      Math.max(0, Number(appointment.valor) - Number(appointment.valor_desconto_credito || 0)) +
      Number(appointment.valor_gorjeta || 0),
    0,
  );
  const recebido = dayMovements.reduce((sum, movement) => sum + Number(movement.valor), 0);
  const recebidoHojeDosAtendimentos = dayMovements
    .filter(
      (movement) =>
        movement.referencia_tipo === "agendamento" && appointmentIds.has(movement.referencia_id),
    )
    .reduce((sum, movement) => sum + Number(movement.valor), 0);
  const pagoNosAtendimentos = serviceItems.reduce(
    (sum, appointment) =>
      sum + Number(appointment.valor_pago || 0) + Number(appointment.valor_gorjeta || 0),
    0,
  );
  const recebidoAnteriormente = Math.max(0, pagoNosAtendimentos - recebidoHojeDosAtendimentos);
  const pagoComCredito = serviceItems.reduce(
    (sum, appointment) => sum + Number(appointment.valor_desconto_credito || 0),
    0,
  );
  const pendente = serviceItems.reduce(
    (sum, appointment) =>
      sum +
      Math.max(
        0,
        Number(appointment.valor) -
          Number(appointment.valor_pago || 0) -
          Number(appointment.valor_desconto_credito || 0),
      ),
    0,
  );
  const faltas = allAppointments.filter(
    (appointment) =>
      appointment.data_agendamento === selectedDate && appointment.status === "falta",
  ).length;
  const valorJaPagoDosAtendimentos = pagoNosAtendimentos + pagoComCredito;
  const progressPercent = total > 0
    ? Math.round((valorJaPagoDosAtendimentos / total) * 100)
    : valorJaPagoDosAtendimentos > 0 ? 100 : 0;

  return {
    items: serviceItems,
    pagamentos: dayMovements,
    total,
    recebido,
    recebidoAnteriormente,
    recebidoHojeDosAtendimentos,
    pagoComCredito,
    pendente,
    qtd: serviceItems.length,
    faltas,
    progressPercent,
  };
};

export interface CommissionHistoryEntry {
  startDate: string; // ISO date YYYY-MM-DD
  rate: number;      // 0 to 100
}

export const getCommissionRateForDate = (
  dateStr: string,
  history: CommissionHistoryEntry[],
  currentRate: number,
): number => {
  if (!history || history.length === 0) return currentRate;
  // Ordena por data decrescente para pegar a taxa que vigora a partir de cada data
  const sorted = [...history].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const entry = sorted.find((e) => (dateStr || "") >= e.startDate);
  return entry !== undefined ? entry.rate : (sorted[sorted.length - 1]?.rate ?? currentRate);
};

export const getCommissionHistory = (currentRate: number): CommissionHistoryEntry[] => {
  try {
    const raw = localStorage.getItem("dyoli_comissao_history");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Erro ao ler dyoli_comissao_history:", e);
  }
  return [{ startDate: "0000-01-01", rate: currentRate }];
};

export const saveNewCommissionRate = (
  newRate: number,
  effectiveDate: string,
  currentHistory: CommissionHistoryEntry[],
): CommissionHistoryEntry[] => {
  const filtered = currentHistory.filter((e) => e.startDate !== effectiveDate);
  const updated = [...filtered, { startDate: effectiveDate, rate: newRate }].sort(
    (a, b) => a.startDate.localeCompare(b.startDate),
  );
  localStorage.setItem("dyoli_comissao_history", JSON.stringify(updated));
  localStorage.setItem("dyoli_comissao_pct", String(newRate));
  return updated;
};

export const calculateCommission = (
  movements: CaixaMovimentacao[],
  commissionPercent: number,
  history?: CommissionHistoryEntry[],
) => {
  const tips = movements
    .filter((movement) => movement.tipo === "gorjeta")
    .reduce((sum, movement) => sum + Number(movement.valor), 0);
  const base = movements
    .filter((movement) => movement.tipo !== "gorjeta" && movement.contabiliza_comissao)
    .reduce((sum, movement) => sum + Number(movement.valor), 0);

  let totalCommission = 0;
  if (!history || history.length === 0) {
    totalCommission = base * (commissionPercent / 100);
  } else {
    totalCommission = movements
      .filter((m) => m.tipo !== "gorjeta" && m.contabiliza_comissao)
      .reduce((acc, m) => {
        const rate = getCommissionRateForDate(m.data_pagamento, history, commissionPercent);
        return acc + Number(m.valor) * (rate / 100);
      }, 0);
  }

  return { base, tips, total: totalCommission + tips };
};

export const sumMovementsForPeriod = (
  movements: CaixaMovimentacao[],
  startDate: string,
  endDate: string,
) => movements
  .filter(
    (movement) =>
      movement.data_pagamento >= startDate && movement.data_pagamento <= endDate,
  )
  .reduce((sum, movement) => sum + Number(movement.valor), 0);
