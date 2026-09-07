// Proxy HTTPS -> HTTP para o robô WhatsApp na VPS fixa.
// Necessário porque o frontend roda em HTTPS e o navegador bloqueia
// chamadas diretas a http://217.76.50.145:3001 (Mixed Content).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const BOT_BASE_URL = "http://217.76.50.145:3001";

// Rotas permitidas no proxy (whitelist por segurança)
const ALLOWED_PATHS = new Set([
  "/api/status",
  "/api/pairing-code",
  "/api/logout",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Esperamos algo como: /functions/v1/bot-wpp-proxy/api/status
    const marker = "/bot-wpp-proxy";
    const idx = url.pathname.indexOf(marker);
    const subPath = idx >= 0 ? url.pathname.slice(idx + marker.length) : "";

    if (!ALLOWED_PATHS.has(subPath)) {
      return new Response(
        JSON.stringify({ error: "Rota não permitida", path: subPath }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetUrl = `${BOT_BASE_URL}${subPath}`;
    const init: RequestInit = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      const bodyText = await req.text();
      if (bodyText) init.body = bodyText;
    }

    const upstream = await fetch(targetUrl, init);
    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") ?? "application/json";

    return new Response(text, {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": contentType },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({
        error: "Falha ao contatar a VPS do robô",
        details: message,
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
