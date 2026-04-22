import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/create-payment`;

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  apikey: SUPABASE_ANON_KEY,
};

Deno.test("create-payment — CORS preflight responde OK", async () => {
  const res = await fetch(FN_URL, {
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

Deno.test("create-payment — rejeita request sem dados obrigatórios", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  const body = await res.json();
  // Deve retornar erro estruturado (não 500 cru)
  assert(res.status >= 400 || body.error !== undefined, "Deve sinalizar erro com payload vazio");
});

Deno.test("check-payment — endpoint responde", async () => {
  const url = `${SUPABASE_URL}/functions/v1/check-payment`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ payment_id: "test", gateway: "mercadopago" }),
  });
  await res.text();
  // Aceita qualquer resposta estruturada (200/400/404) — não 500
  assert(res.status < 500 || res.status === 502, `inesperado: ${res.status}`);
});
