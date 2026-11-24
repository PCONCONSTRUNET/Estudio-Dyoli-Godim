import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  normalizeWhatsappNumber,
  notifyAgendamentoConfirmadoById,
  sendWhatsAppViaApi,
} from "./notify-webhook";

const { invokeMock, fromMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
    from: fromMock,
  },
}));

const makeQueryBuilder = (result: any) => {
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  return builder;
};

describe("normalizeWhatsappNumber", () => {
  it("removes formatting and prepends 55 for 10 or 11 digit BR numbers", () => {
    expect(normalizeWhatsappNumber("(48) 93381-8601")).toBe("5548933818601");
    expect(normalizeWhatsappNumber("48933818601")).toBe("5548933818601");
    expect(normalizeWhatsappNumber("04833818601")).toBe("554833818601");
    expect(normalizeWhatsappNumber("5548933818601")).toBe("5548933818601");
    expect(normalizeWhatsappNumber("+55 (48) 99977-9829")).toBe("5548999779829");
    expect(normalizeWhatsappNumber("55999112233")).toBe("5555999112233");
  });
});

describe("sendWhatsAppViaApi", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    fromMock.mockReset();
  });

  it("reports failure when edge function returns HTTP 200 with ok=false fallback", async () => {
    invokeMock.mockResolvedValue({
      data: { ok: false, fallback: true, error: "WEBHOOK_UNREACHABLE", detail: "ECONNREFUSED" },
      error: null,
    });

    const res = await sendWhatsAppViaApi("48933818601", "Olá");
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("API_ERROR");
    expect(res.error).toBe("WEBHOOK_UNREACHABLE");
    expect(invokeMock).toHaveBeenCalledWith("send-whatsapp-notification", {
      body: { numero: "5548933818601", mensagem: "Olá" },
    });
  });

  it("reports failure when VPS returns JSON with sucesso=false inside detail", async () => {
    invokeMock.mockResolvedValue({
      data: { ok: true, status: 200, detail: JSON.stringify({ sucesso: false, erro: "Sessão desconectada" }) },
      error: null,
    });

    const res = await sendWhatsAppViaApi("(48) 93381-8601", "Confirmado");
    expect(res.ok).toBe(false);
    expect(res.error).toBe("Sessão desconectada");
  });

  it("returns ok=true when API accepts the message", async () => {
    invokeMock.mockResolvedValue({
      data: { ok: true, status: 200, detail: JSON.stringify({ sucesso: true }) },
      error: null,
    });

    const res = await sendWhatsAppViaApi("48933818601", "Confirmado");
    expect(res).toEqual({ ok: true, numero: "5548933818601", mensagem: "Confirmado" });
  });
});

describe("notifyAgendamentoConfirmadoById", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    fromMock.mockReset();
  });

  it("interpolates template and sends even when ativo=false if force=true", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "agendamentos") {
        return makeQueryBuilder({
          data: {
            user_id: "u-1",
            cliente_nome: "Kaiane Mazzucco",
            data_agendamento: "2026-12-04",
            horario: "15:30",
            servico: "TATUAGEM ",
            variacao: null,
            valor: 280,
          },
          error: null,
        });
      }
      if (table === "profiles") {
        return makeQueryBuilder({ data: { nome: "Kaiane Mazzucco", whatsapp: "48933818601" }, error: null });
      }
      if (table === "configuracoes_lembretes") {
        return makeQueryBuilder({
          data: { ativo: false, mensagem: "Oi {nome}, {data} às {horario} - {servico} ({valor})" },
          error: null,
        });
      }
      return makeQueryBuilder({ data: null, error: null });
    });

    invokeMock.mockResolvedValue({
      data: { ok: true, status: 200, detail: JSON.stringify({ sucesso: true }) },
      error: null,
    });

    const skipped = await notifyAgendamentoConfirmadoById("ag-1");
    expect(skipped.ok).toBe(false);
    expect(skipped.skipped).toBe(true);
    expect(skipped.reason).toBe("DISABLED");
    expect(invokeMock).not.toHaveBeenCalled();

    const forced = await notifyAgendamentoConfirmadoById("ag-1", { force: true });
    expect(forced.ok).toBe(true);
    expect(invokeMock).toHaveBeenCalledWith("send-whatsapp-notification", {
      body: {
        numero: "5548933818601",
        mensagem: "Oi Kaiane Mazzucco, 04/12/2026 às 15:30 - TATUAGEM (R$\u00a0280,00)",
      },
    });
  });

  it("handles null user_id safely without querying profiles", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "agendamentos") {
        return makeQueryBuilder({
          data: {
            user_id: null,
            cliente_nome: "Sem cadastro",
            data_agendamento: "2026-12-04",
            horario: "15:30",
            servico: "TATUAGEM",
            variacao: null,
            valor: 280,
          },
          error: null,
        });
      }
      return makeQueryBuilder({ data: null, error: null });
    });

    const res = await notifyAgendamentoConfirmadoById("ag-2", { force: true });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("NO_NUMBER");
    expect(fromMock).toHaveBeenCalledTimes(1);
  });
});
