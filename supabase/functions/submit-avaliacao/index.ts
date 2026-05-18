import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const agendamento_id = String(body?.agendamento_id || "").trim();
    const nota = Number(body?.nota);
    const comentario = String(body?.comentario || "").trim().slice(0, 500);
    const nome = String(body?.nome || "").trim().slice(0, 100);

    if (!agendamento_id || !Number.isInteger(nota) || nota < 1 || nota > 5) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: ag, error: agErr } = await supabase
      .from("agendamentos")
      .select("id, user_id, cliente_nome")
      .eq("id", agendamento_id)
      .maybeSingle();

    if (agErr || !ag) {
      return new Response(JSON.stringify({ error: "Agendamento não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atualiza nome do perfil, se informado e diferente
    if (nome && ag.user_id) {
      await supabase
        .from("profiles")
        .update({ nome })
        .eq("id", ag.user_id)
        .then(() => {})
        .catch(() => {});
    }

    const { error: upErr } = await supabase
      .from("avaliacoes")
      .upsert(
        {
          agendamento_id,
          user_id: ag.user_id,
          nota,
          comentario,
        },
        { onConflict: "agendamento_id" },
      );

    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
