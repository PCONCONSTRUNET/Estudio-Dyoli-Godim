// Edge function: receives anamnese form from WhatsApp chatbot,
// stores structured data + optional PDF in storage, inserts into anamneses table.
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkBotAuth, corsHeaders, jsonResponse, normalizeWhatsapp, whatsappVariations } from "../_shared/bot-auth.ts";

interface Payload {
  whatsapp: string;
  cliente_nome?: string;
  dados: Record<string, unknown>;
  pdf_base64?: string;
  pdf_filename?: string;
  observacao?: string;
}

function decodeBase64(b64: string): Uint8Array {
  const clean = b64.replace(/^data:[^;]+;base64,/, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const authErr = checkBotAuth(req);
  if (authErr) return authErr;

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  if (!body.whatsapp || typeof body.dados !== "object" || body.dados === null) {
    return jsonResponse({ error: "whatsapp and dados are required" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const whatsapp = normalizeWhatsapp(body.whatsapp);

  // Try to match existing client by WhatsApp variations (existing identification flow)
  let user_id: string | null = null;
  let cliente_nome = body.cliente_nome ?? "";
  try {
    const variations = whatsappVariations(whatsapp);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nome, whatsapp")
      .in("whatsapp", variations)
      .limit(1);
    if (profiles && profiles.length > 0) {
      user_id = profiles[0].id;
      if (!cliente_nome) cliente_nome = profiles[0].nome ?? "";
    }
  } catch (_) { /* non-fatal */ }

  // Upload PDF if provided
  let pdf_url: string | null = null;
  let pdf_path: string | null = null;
  if (body.pdf_base64) {
    try {
      const bytes = decodeBase64(body.pdf_base64);
      const safeName = (body.pdf_filename || `anamnese-${Date.now()}.pdf`).replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${whatsapp || "sem-whatsapp"}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("anamneses")
        .upload(path, bytes, { contentType: "application/pdf", upsert: false });
      if (upErr) {
        return jsonResponse({ error: `Upload failed: ${upErr.message}` }, 500);
      }
      pdf_path = path;
      const { data: signed } = await supabase.storage
        .from("anamneses")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5); // 5y
      pdf_url = signed?.signedUrl ?? null;
    } catch (e) {
      return jsonResponse({ error: `PDF decode failed: ${(e as Error).message}` }, 400);
    }
  }

  const { data, error } = await supabase
    .from("anamneses")
    .insert({
      user_id,
      cliente_nome,
      whatsapp,
      dados: body.dados,
      pdf_url,
      pdf_path,
      observacao: body.observacao ?? "",
      origem: "chatbot",
    })
    .select()
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ ok: true, anamnese: data });
});
