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
      .select("id, nome, categoria, preco, duracao_minutos, descricao, ordem")
      .eq("ativo", true)
      .order("ordem", { ascending: true });

    if (error) throw error;

    // Carrega ordem das categorias definida no admin
    const { data: ordemData } = await supabase
      .from("categorias_ordem")
      .select("nome, ordem")
      .eq("scope", "servicos")
      .order("ordem");

    const ordemMap = new Map<string, number>();
    (ordemData ?? []).forEach((r: any) => ordemMap.set(r.nome, r.ordem));

    const servicos = (data ?? []).slice().sort((a: any, b: any) => {
      const oa = ordemMap.has(a.categoria) ? ordemMap.get(a.categoria)! : Number.MAX_SAFE_INTEGER;
      const ob = ordemMap.has(b.categoria) ? ordemMap.get(b.categoria)! : Number.MAX_SAFE_INTEGER;
      if (oa !== ob) return oa - ob;
      // Categorias sem ordem definida: alfabético
      if (oa === Number.MAX_SAFE_INTEGER && ob === Number.MAX_SAFE_INTEGER) {
        const c = String(a.categoria || "").localeCompare(String(b.categoria || ""), "pt-BR");
        if (c !== 0) return c;
      }
      return (a.ordem ?? 0) - (b.ordem ?? 0);
    }).map(({ ordem: _o, ...rest }: any) => rest);

    return jsonResponse({
      success: true,
      servicos,
    });
  } catch (err) {
    console.error("bot-servicos error:", err);
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
