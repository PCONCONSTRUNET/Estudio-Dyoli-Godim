import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log("Mercado Pago webhook received:", JSON.stringify(body));

    // Mercado Pago sends different event types
    const { type, data, action } = body;

    if (type === "payment" && data?.id) {
      // Fetch payment details from Mercado Pago
      const { data: config } = await supabase
        .from("gateway_configs")
        .select("access_token")
        .eq("gateway", "mercadopago")
        .single();

      if (config?.access_token) {
        const paymentRes = await fetch(
          `https://api.mercadopago.com/v1/payments/${data.id}`,
          {
            headers: { Authorization: `Bearer ${config.access_token}` },
          }
        );
        const payment = await paymentRes.json();
        console.log("Payment details:", JSON.stringify(payment));

        // If payment is approved, update the agendamento
        if (payment.status === "approved" && payment.external_reference) {
          const { error } = await supabase
            .from("agendamentos")
            .update({
              status: "confirmado",
              valor_pago: payment.transaction_amount,
              forma_pagamento: payment.payment_type_id || "mercadopago",
            })
            .eq("id", payment.external_reference);

          if (error) {
            console.error("Error updating agendamento:", error);
          } else {
            console.log(`Agendamento ${payment.external_reference} updated with payment`);
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Return 200 to avoid Mercado Pago retries
    });
  }
});
