import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log("Woovi webhook received:", JSON.stringify(body));

    const { event, charge } = body;

    // OpenPix/Woovi sends event "OPENPIX:CHARGE_COMPLETED" when payment is confirmed
    if (event === "OPENPIX:CHARGE_COMPLETED" && charge) {
      const correlationID = charge.correlationID;
      const valuePaid = charge.value ? charge.value / 100 : 0; // Woovi sends value in cents

      if (correlationID) {
        console.log(`Payment confirmed for correlationID: ${correlationID}, value: ${valuePaid}`);

        const { error } = await supabase
          .from("agendamentos")
          .update({
            status: "confirmado",
            valor_pago: valuePaid,
            forma_pagamento: "pix_woovi",
          })
          .eq("id", correlationID);

        if (error) {
          console.error("Error updating agendamento:", error);
        } else {
          console.log("Agendamento updated successfully");
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Woovi webhook error:", err);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
