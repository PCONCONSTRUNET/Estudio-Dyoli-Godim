// Permite o cliente autenticado atualizar o próprio número de WhatsApp.
// Como o login é derivado do whatsapp (whatsapp@studio-dyoli.app), também
// atualizamos o email em auth.users. A senha permanece a mesma.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const emailFromWhatsapp = (digits: string) => `${digits}@studio-dyoli.app`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Não autenticado" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // Valida o usuário a partir do JWT
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Sessão inválida" }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const raw = String(body?.whatsapp || "");
    const digits = raw.replace(/\D/g, "");

    if (digits.length < 10 || digits.length > 13) {
      return json({ error: "Número de WhatsApp inválido" }, 400);
    }

    const newEmail = emailFromWhatsapp(digits);

    // Verifica se o número já pertence a outro perfil
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("whatsapp", digits)
      .maybeSingle();

    if (existing && existing.id !== user.id) {
      return json({ error: "Este número já está cadastrado em outra conta" }, 409);
    }

    // Atualiza email no auth (login)
    const { error: authErr } = await admin.auth.admin.updateUserById(user.id, {
      email: newEmail,
      email_confirm: true,
      user_metadata: { ...(user.user_metadata || {}), whatsapp: digits },
    });
    if (authErr) {
      const msg = authErr.message?.toLowerCase() || "";
      if (msg.includes("already") || msg.includes("registered") || msg.includes("duplicate")) {
        return json({ error: "Este número já está cadastrado em outra conta" }, 409);
      }
      return json({ error: authErr.message }, 500);
    }

    // Atualiza profile
    const { error: profErr } = await admin
      .from("profiles")
      .update({ whatsapp: digits })
      .eq("id", user.id);
    if (profErr) return json({ error: profErr.message }, 500);

    return json({ success: true, whatsapp: digits, email: newEmail });
  } catch (err) {
    console.error("update-cliente-whatsapp error", err);
    return json({ error: err instanceof Error ? err.message : "Erro interno" }, 500);
  }
});
