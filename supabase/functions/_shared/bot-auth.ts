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

// Normalize a Brazilian WhatsApp number to canonical format: 55 + DDD (2) + 9 + 8 digits = 13 digits.
// Examples:
//   "+55 (48) 99918-4231" -> "5548999184231"
//   "48999184231"          -> "5548999184231"
//   "4899184231"           -> "5548999184231" (adds missing 9 for mobile)
//   "5548999184231"        -> "5548999184231"
// Returns the cleaned digits unchanged if it doesn't fit the BR mobile pattern (so we don't corrupt foreign numbers).
export function normalizeWhatsapp(input: string): string {
  let digits = (input || "").replace(/\D/g, "");

  // Strip leading 0s
  digits = digits.replace(/^0+/, "");

  // Already canonical: 13 digits starting with 55
  if (digits.length === 13 && digits.startsWith("55")) {
    return digits;
  }

  // 12 digits starting with 55: BR landline OR BR mobile missing the 9 -> add 9 after DDD
  if (digits.length === 12 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4); // 8 digits
    return `55${ddd}9${rest}`;
  }

  // 11 digits: BR mobile without country code (DDD + 9 + 8) -> prepend 55
  if (digits.length === 11) {
    return `55${digits}`;
  }

  // 10 digits: BR landline OR mobile without 9 (DDD + 8) -> prepend 55 + insert 9 after DDD
  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);
    return `55${ddd}9${rest}`;
  }

  // Anything else (foreign / malformed) — return digits as-is
  return digits;
}

// Backwards-compatible alias (some files imported the camelCase variant)
export const normalizeWhatsApp = normalizeWhatsapp;

// Generate a synthetic email from a WhatsApp number: "<digits>@gmail.com"
export function whatsappToEmail(whatsapp: string): string {
  const digits = normalizeWhatsapp(whatsapp);
  return `${digits}@gmail.com`;
}

export const DEFAULT_BOT_PASSWORD = "123123";
