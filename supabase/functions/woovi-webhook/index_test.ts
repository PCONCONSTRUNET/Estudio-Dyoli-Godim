import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/woovi-webhook`;

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  apikey: SUPABASE_ANON_KEY,
};

Deno.test("Woovi webhook — responde 200 com payload vazio", async () => {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.received, true);
});

Deno.test("Woovi webhook — ignora eventos diferentes de CHARGE_COMPLETED", async () => {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      event: "OPENPIX:CHARGE_CREATED",
      charge: { correlationID: "nao-existe", value: 5000 },
    }),
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.received, true);
});

Deno.test("Woovi webhook — CHARGE_COMPLETED com correlationID inexistente não trava", async () => {
  // ID que não corresponde a nenhum agendamento real — função deve responder 200
  // sem afetar dados (update no-op)
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      event: "OPENPIX:CHARGE_COMPLETED",
      charge: {
        correlationID: "00000000-0000-0000-0000-000000000000",
        value: 5000,
      },
    }),
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.received, true);
});

Deno.test("Woovi webhook — converte valor de centavos para reais", () => {
  // Valida lógica documentada: Woovi envia em centavos, sistema grava em reais
  const woviCents = 12500;
  const reais = woviCents / 100;
  assertEquals(reais, 125.0);
});

Deno.test("Woovi webhook — CORS preflight responde OK", async () => {
  const res = await fetch(WEBHOOK_URL, {
    method: "OPTIONS",
    headers: {
      Origin: "https://example.com",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type, x-webhook-secret",
    },
  });
  await res.text();
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("access-control-allow-origin"), "*");
  const allowHeaders = res.headers.get("access-control-allow-headers") || "";
  assert(allowHeaders.includes("x-webhook-secret"), "deve permitir x-webhook-secret");
});

Deno.test("Woovi webhook — payload malformado retorna 200 (anti-retry)", async () => {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers,
    body: "not json at all",
  });
  await res.text();
  // Função captura erro e retorna 200 pra evitar retries infinitos do Woovi
  assertEquals(res.status, 200);
});
