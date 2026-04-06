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

    // Find all "pendente" agendamentos older than 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: expired, error } = await supabase
      .from("agendamentos")
      .update({ status: "cancelado" })
      .eq("status", "pendente")
      .lt("created_at", fiveMinAgo)
      .select("id");

    if (error) {
      console.error("Error cancelling expired agendamentos:", error);
    } else {
      const count = expired?.length || 0;
      if (count > 0) {
        console.log(`Cancelled ${count} expired pending agendamentos:`, expired?.map(e => e.id));
      }
    }

    return new Response(JSON.stringify({ cancelled: expired?.length || 0 }), {
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
