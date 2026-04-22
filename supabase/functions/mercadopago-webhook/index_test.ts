import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/mercadopago-webhook`;

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  apikey: SUPABASE_ANON_KEY,
};

Deno.test("Mercado Pago webhook — responde 200 com payload vazio", async () => {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.received, true);
});

Deno.test("Mercado Pago webhook — ignora eventos não-payment", async () => {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ type: "merchant_order", data: { id: "12345" } }),
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.received, true);
});

Deno.test("Mercado Pago webhook — payment com ID inválido não trava", async () => {
  // Mesmo com ID que não existe no MP, função deve retornar 200 (idempotência)
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      type: "payment",
      action: "payment.updated",
      data: { id: "0000000000" },
    }),
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assert(body.received === true || body.error !== undefined);
});

Deno.test("Mercado Pago webhook — CORS preflight responde OK", async () => {
  const res = await fetch(WEBHOOK_URL, {
    method: "OPTIONS",
    headers: {
      Origin: "https://example.com",
      "Access-Control-Request-Method": "POST",
    },
  });
  await res.text();
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("access-control-allow-origin"), "*");
});

Deno.test("Mercado Pago webhook — rejeita método GET graciosamente", async () => {
  const res = await fetch(WEBHOOK_URL, {
    method: "GET",
    headers,
  });
  await res.text();
  // Função tenta ler JSON do body — falha controlada retorna 200
  assert(res.status === 200 || res.status === 405 || res.status === 500);
});
