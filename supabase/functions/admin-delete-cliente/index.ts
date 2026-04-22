// Admin endpoint: deleta um cliente completamente do banco de dados
// (perfil, agendamentos, tokens de reset, push subscriptions e a conta auth).
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
    const { user_id } = await req.json();
    if (!user_id || typeof user_id !== "string") {
      return json({ error: "user_id é obrigatório" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Apaga em ordem para evitar referências órfãs
    const errors: string[] = [];

    const { error: agErr } = await admin
      .from("agendamentos")
      .delete()
      .eq("user_id", user_id);
    if (agErr) errors.push(`agendamentos: ${agErr.message}`);

    const { error: tokErr } = await admin
      .from("password_reset_tokens")
      .delete()
      .eq("user_id", user_id);
    if (tokErr) errors.push(`tokens: ${tokErr.message}`);

    const { error: pushErr } = await admin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user_id);
    if (pushErr) errors.push(`push: ${pushErr.message}`);

    const { error: profErr } = await admin
      .from("profiles")
      .delete()
      .eq("id", user_id);
    if (profErr) errors.push(`profile: ${profErr.message}`);

    // Apaga o usuário em auth.users (pode falhar se a conta não existir, ok)
    const { error: authErr } = await admin.auth.admin.deleteUser(user_id);
    if (authErr && !authErr.message.toLowerCase().includes("not found")) {
      errors.push(`auth: ${authErr.message}`);
    }

    if (errors.length > 0) {
      console.error("admin-delete-cliente partial errors:", errors);
      return json({ success: false, errors }, 500);
    }

    return json({ success: true });
  } catch (err) {
    console.error("admin-delete-cliente error", err);
    return json({ error: err instanceof Error ? err.message : "Erro interno" }, 500);
  }
});
