import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, checkBotAuth, jsonResponse } from "../_shared/bot-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authError = checkBotAuth(req);
  if (authError) return authError;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("servicos")
      .select("id, nome, categoria, preco, duracao_minutos")
      .eq("ativo", true)
      .order("ordem", { ascending: true });

    if (error) throw error;

    return jsonResponse({
      success: true,
      servicos: data ?? [],
    });
  } catch (err) {
    console.error("bot-servicos error:", err);
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
