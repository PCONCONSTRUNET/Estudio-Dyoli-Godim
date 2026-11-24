const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WEBHOOK_URL = "http://217.76.50.145:3001/webhook/notificacao";
const WEBHOOK_TOKEN = "dyoli123";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeWhatsappNumber = (raw: string): string => {
  let digits = raw.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }
  return digits;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const body = await req.json().catch(() => null) as { numero?: unknown; mensagem?: unknown } | null;
    const rawNumero = typeof body?.numero === "string" ? body.numero : "";
    const numero = normalizeWhatsappNumber(rawNumero);
    const mensagem = typeof body?.mensagem === "string" ? body.mensagem.trim() : "";

    if (numero.length < 10 || numero.length > 15) {
      return json({ error: "WhatsApp inválido" }, 400);
    }

    if (!mensagem) {
      return json({ error: "Mensagem obrigatória" }, 400);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const resp = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero, mensagem, token: WEBHOOK_TOKEN }),
        signal: controller.signal,
      });

      const responseText = await resp.text().catch(() => "");

      if (!resp.ok) {
        console.error("whatsapp webhook failed", resp.status, responseText);
        // Não falha a request principal — retorna 200 com fallback para o frontend não quebrar
        return json({ ok: false, fallback: true, error: `Webhook respondeu HTTP ${resp.status}`, detail: responseText });
      }

      try {
        const parsed = JSON.parse(responseText) as { sucesso?: unknown; ok?: unknown; erro?: unknown; error?: unknown } | null;
        if (parsed && (parsed.sucesso === false || parsed.ok === false || parsed.erro || parsed.error)) {
          const msg = String(parsed.erro || parsed.error || "Webhook recusou o envio");
          console.error("whatsapp webhook logical failure", responseText);
          return json({ ok: false, fallback: true, error: msg, detail: responseText });
        }
      } catch {
        // resposta não-JSON com HTTP 2xx é considerada aceita
      }

      console.log("whatsapp notification sent", { numero, status: resp.status });
      return json({ ok: true, status: resp.status, detail: responseText });
    } catch (fetchErr) {
      // VPS offline / timeout / connection refused — não derruba o fluxo do usuário
      const isAbort = fetchErr instanceof DOMException && fetchErr.name === "AbortError";
      const message = isAbort ? "Tempo limite excedido ao contatar a API do WhatsApp" : (fetchErr instanceof Error ? fetchErr.message : String(fetchErr));
      console.warn("whatsapp webhook unreachable:", message);
      return json({ ok: false, fallback: true, error: isAbort ? "WEBHOOK_TIMEOUT" : "WEBHOOK_UNREACHABLE", detail: message });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error("send-whatsapp-notification error", error);
    return json({ ok: false, fallback: true, error: error instanceof Error ? error.message : "Erro interno" });
  }
});
