import { describe, expect, it } from "vitest";
import {
  AgendamentoCaixa,
  CaixaMovimentacao,
  calculateCommission,
  calculateDailyClosing,
  normalizePaymentMethod,
  sumMovementsForPeriod,
} from "./caixa";

const movement = (
  id: string,
  referenceId: string,
  value: number,
  paymentDate: string,
  overrides: Partial<CaixaMovimentacao> = {},
): CaixaMovimentacao => ({
  id,
  referencia_tipo: "agendamento",
  referencia_id: referenceId,
  tipo: value >= 0 ? "entrada" : "estorno",
  valor: value,
  forma_pagamento: "pix",
  data_pagamento: paymentDate,
  ocorrido_em: `${paymentDate}T15:00:00.000Z`,
  origem: "test",
  contabiliza_comissao: true,
  inferido: false,
  ...overrides,
});

describe("caixa por data real de pagamento", () => {
  const appointments: AgendamentoCaixa[] = [
    { id: "mayara", data_agendamento: "2026-09-01", status: "concluido", servico: "Design", valor: 65, valor_pago: 65 },
    { id: "fernanda", data_agendamento: "2026-09-01", status: "confirmado", servico: "Micropigmentação", valor: 550, valor_pago: 550 },
    { id: "eduardo", data_agendamento: "2026-09-01", status: "confirmado", servico: "Tatuagem", valor: 200, valor_pago: 0 },
    { id: "angela", data_agendamento: "2026-09-01", status: "confirmado", servico: "Design", valor: 50, valor_pago: 0 },
    { id: "cristiane", data_agendamento: "2026-09-01", status: "confirmado", servico: "A definir", valor: 0, valor_pago: 0 },
    { id: "julia", data_agendamento: "2026-09-10", status: "confirmado", servico: "Tatuagem", valor: 1100, valor_pago: 1100 },
  ];

  const movements: CaixaMovimentacao[] = [
    movement("m-mayara", "mayara", 65, "2026-09-01"),
    movement("m-fernanda", "fernanda", 550, "2026-08-24"),
    movement("m-julia", "julia", 1100, "2026-08-25", { forma_pagamento: "cartao" }),
  ];

  it("não traz para setembro um pagamento de agosto de atendimento futuro", () => {
    expect(sumMovementsForPeriod(movements, "2026-09-01", "2026-09-30")).toBe(65);
  });

  it("fecha 01/09 com R$ 65 recebidos e concilia o pagamento anterior", () => {
    const closing = calculateDailyClosing(appointments, movements, "2026-09-01");

    expect(closing.recebido).toBe(65);
    expect(closing.recebidoAnteriormente).toBe(550);
    expect(closing.total).toBe(865);
    expect(closing.pendente).toBe(250);
    expect(closing.progressPercent).toBe(71);
    expect(closing.qtd).toBe(5);
  });

  it("calcula a comissão apenas sobre o que entrou no dia", () => {
    expect(calculateCommission([movements[0]], 40)).toEqual({ base: 65, tips: 0, total: 26 });
  });

  it("considera estornos no período", () => {
    const refund = movement("refund", "mayara", -15, "2026-09-01");
    expect(sumMovementsForPeriod([...movements, refund], "2026-09-01", "2026-09-30")).toBe(50);
  });

  it("normaliza as formas de pagamento usadas no projeto", () => {
    expect(normalizePaymentMethod("pix_woovi")).toBe("pix");
    expect(normalizePaymentMethod("cartão de crédito")).toBe("cartao");
    expect(normalizePaymentMethod("dinheiro")).toBe("dinheiro");
  });
});
