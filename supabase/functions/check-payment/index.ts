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

    const { payment_id, gateway, agendamento_id } = await req.json();

    if (!gateway || (!payment_id && !agendamento_id)) {
      return new Response(JSON.stringify({ error: "gateway and payment_id or agendamento_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get gateway config
    const { data: config } = await supabase
      .from("gateway_configs")
      .select("access_token")
      .eq("gateway", gateway)
      .single();

    if (!config?.access_token) {
      return new Response(JSON.stringify({ error: "Gateway não configurado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check Mercado Pago payment status
    if (gateway === "mercadopago" && payment_id) {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
        headers: { Authorization: `Bearer ${config.access_token}` },
      });
      const data = await res.json();

      return new Response(JSON.stringify({
        status: data.status,
        status_detail: data.status_detail,
        payment_id: data.id,
        amount: data.transaction_amount,
        paid: data.status === "approved",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check Woovi charge status
    if (gateway === "woovi" && agendamento_id) {
      const res = await fetch(`https://api.openpix.com.br/api/v1/charge/${agendamento_id}`, {
        headers: { Authorization: config.access_token },
      });
      const data = await res.json();

      const charge = data.charge;
      return new Response(JSON.stringify({
        status: charge?.status,
        correlation_id: charge?.correlationID,
        paid: charge?.status === "COMPLETED",
        amount: charge?.value ? charge.value / 100 : 0,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Gateway não suportado" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("check-payment error:", err);
    return new Response(JSON.stringify({ error: "Erro ao verificar pagamento" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
