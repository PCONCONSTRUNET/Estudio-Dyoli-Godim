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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token, newPassword, action } = await req.json();

    if (!token || typeof token !== "string") {
      return json({ error: "Token ausente" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: tokenRow, error: tokenErr } = await admin
      .from("password_reset_tokens")
      .select("id, user_id, expires_at, used_at")
      .eq("token", token)
      .maybeSingle();

    if (tokenErr || !tokenRow) {
      return json({ error: "Link inválido" }, 400);
    }
    if (tokenRow.used_at) {
      return json({ error: "Este link já foi utilizado" }, 400);
    }
    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return json({ error: "Link expirado. Solicite um novo." }, 400);
    }

    // action="validate" só checa se o token está OK (para a tela carregar)
    if (action === "validate") {
      return json({ valid: true });
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return json({ error: "A senha deve ter ao menos 6 caracteres" }, 400);
    }
    if (newPassword.length > 72) {
      return json({ error: "Senha muito longa" }, 400);
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(tokenRow.user_id, {
      password: newPassword,
    });
    if (updErr) {
      console.error("[confirm-reset] updateUser falhou:", updErr);
      return json({ error: "Falha ao atualizar senha" }, 500);
    }

    await admin
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    return json({ success: true });
  } catch (err) {
    console.error("[confirm-reset] erro:", err);
    return json({ error: "Erro interno" }, 500);
  }
});
