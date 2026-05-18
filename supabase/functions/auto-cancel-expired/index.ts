import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Cancel "pendente" agendamentos older than 5 minutes (legacy flow)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: expiredPend, error: errPend } = await supabase
      .from("agendamentos")
      .update({ status: "cancelado" })
      .eq("status", "pendente")
      .lt("created_at", fiveMinAgo)
      .select("id");

    if (errPend) console.error("Error cancelling expired pendente:", errPend);

    // Cancel "aguardando_pagamento" (PIX online) older than 30 minutes — gateway expira em 30min
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: expiredAwait, error: errAwait } = await supabase
      .from("agendamentos")
      .update({ status: "cancelado" })
      .eq("status", "aguardando_pagamento")
      .lt("created_at", thirtyMinAgo)
      .select("id");

    if (errAwait) console.error("Error cancelling expired aguardando_pagamento:", errAwait);

    const total = (expiredPend?.length || 0) + (expiredAwait?.length || 0);
    if (total > 0) {
      console.log(`Cancelled ${total} expired agendamentos (pendente: ${expiredPend?.length || 0}, aguardando_pagamento: ${expiredAwait?.length || 0})`);
    }

    return new Response(JSON.stringify({ cancelled: total }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("auto-cancel error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
