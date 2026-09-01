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

export const calculateCommission = (
  movements: CaixaMovimentacao[],
  commissionPercent: number,
) => {
  const tips = movements
    .filter((movement) => movement.tipo === "gorjeta")
    .reduce((sum, movement) => sum + Number(movement.valor), 0);
  const base = movements
    .filter((movement) => movement.tipo !== "gorjeta" && movement.contabiliza_comissao)
    .reduce((sum, movement) => sum + Number(movement.valor), 0);

  return { base, tips, total: base * (commissionPercent / 100) + tips };
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
