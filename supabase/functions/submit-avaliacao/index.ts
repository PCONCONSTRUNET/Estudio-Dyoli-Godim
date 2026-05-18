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
    const agendamento_id = body?.agendamento_id ? String(body.agendamento_id).trim() : null;
    const nota = Number(body?.nota);
    const comentario = String(body?.comentario || "").trim().slice(0, 500);
    const nome = String(body?.nome || "").trim().slice(0, 100);

    if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
      return new Response(JSON.stringify({ error: "Nota inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!nome) {
      return new Response(JSON.stringify({ error: "Informe seu nome" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let user_id: string | null = null;

    // Se veio agendamento_id, valida e busca user_id
    if (agendamento_id) {
      const { data: ag } = await supabase
        .from("agendamentos")
        .select("id, user_id")
        .eq("id", agendamento_id)
        .maybeSingle();

      if (!ag) {
        return new Response(JSON.stringify({ error: "Agendamento não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      user_id = ag.user_id;

      if (nome && user_id) {
        await supabase.from("profiles").update({ nome }).eq("id", user_id);
      }

      const { error: upErr } = await supabase
        .from("avaliacoes")
        .upsert(
          { agendamento_id, user_id, nota, comentario, cliente_nome: nome },
          { onConflict: "agendamento_id" },
        );
      if (upErr) {
        return new Response(JSON.stringify({ error: upErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Avaliação avulsa (sem agendamento)
      const { error: insErr } = await supabase
        .from("avaliacoes")
        .insert({ nota, comentario, cliente_nome: nome });
      if (insErr) {
        return new Response(JSON.stringify({ error: insErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
