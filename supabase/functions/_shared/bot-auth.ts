// Shared helper for chatbot endpoints
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-bot-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function checkBotAuth(req: Request): Response | null {
  const expected = Deno.env.get("BOT_API_SECRET");
  if (!expected) {
    return new Response(
      JSON.stringify({ error: "BOT_API_SECRET not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const provided = req.headers.get("x-bot-secret");
  if (provided !== expected) {
    return new Response(
      JSON.stringify({ error: "Unauthorized: invalid x-bot-secret header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  return null;
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Normalize a Brazilian WhatsApp number to digits only (e.g. "+55 (11) 99999-9999" -> "5511999999999")
export function normalizeWhatsapp(input: string): string {
  return (input || "").replace(/\D/g, "");
}

// Generate a synthetic email from a WhatsApp number: "<digits>@gmail.com"
export function whatsappToEmail(whatsapp: string): string {
  const digits = normalizeWhatsapp(whatsapp);
  return `${digits}@gmail.com`;
}

export const DEFAULT_BOT_PASSWORD = "123123";
