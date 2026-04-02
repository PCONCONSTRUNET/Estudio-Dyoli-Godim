import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current date/time in Brasilia timezone (UTC-3)
    const now = new Date();
    const brasiliaOffset = -3 * 60;
    const brasiliaTime = new Date(now.getTime() + (brasiliaOffset + now.getTimezoneOffset()) * 60000);
    
    const todayStr = brasiliaTime.toISOString().split("T")[0];
    const currentHour = brasiliaTime.getHours();
    const currentMinute = brasiliaTime.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    // Fetch all confirmed appointments for today and past dates
    const { data: agendamentos, error } = await supabase
      .from("agendamentos")
      .select("id, data_agendamento, horario, duracao_minutos")
      .eq("status", "confirmado")
      .lte("data_agendamento", todayStr);

    if (error) throw error;

    const toComplete: string[] = [];

    for (const a of agendamentos || []) {
      const [h, m] = a.horario.split(":").map(Number);
      const endMinutes = h * 60 + m + (a.duracao_minutos || 60);

      if (a.data_agendamento < todayStr) {
        // Past dates - always complete
        toComplete.push(a.id);
      } else if (a.data_agendamento === todayStr && currentTotalMinutes >= endMinutes) {
        // Today but service already ended
        toComplete.push(a.id);
      }
    }

    if (toComplete.length > 0) {
      const { error: updateError } = await supabase
        .from("agendamentos")
        .update({ status: "concluido" })
        .in("id", toComplete);

      if (updateError) throw updateError;
    }

    return new Response(
      JSON.stringify({ completed: toComplete.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
