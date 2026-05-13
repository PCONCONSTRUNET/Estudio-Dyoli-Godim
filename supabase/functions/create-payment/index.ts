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

    const { amount, description, agendamento_id, payment_method, customer_email, customer_name, customer_cpf } = await req.json();

    if (!amount || !agendamento_id) {
      return new Response(JSON.stringify({ error: "amount and agendamento_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find active gateway
    const { data: gateways } = await supabase
      .from("gateway_configs")
      .select("*")
      .eq("ativo", true);

    if (!gateways || gateways.length === 0) {
      // No gateway active — return local PIX fallback
      return new Response(JSON.stringify({
        gateway: "local",
        method: "pix",
        message: "Nenhum gateway ativo. Use o PIX manual.",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine which gateway and method to use
    const preferred_method = payment_method || "pix";

    // Find a gateway that supports the requested method
    let activeGateway = null;
    for (const gw of gateways) {
      if (preferred_method === "pix" && gw.pix_enabled) { activeGateway = gw; break; }
      if (preferred_method === "cartao" && gw.cartao_enabled) { activeGateway = gw; break; }
      if (preferred_method === "boleto" && gw.boleto_enabled) { activeGateway = gw; break; }
    }

    if (!activeGateway) {
      return new Response(JSON.stringify({
        gateway: "local",
        method: "pix",
        message: "Método de pagamento não disponível nos gateways ativos.",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route to the correct gateway
    if (activeGateway.gateway === "mercadopago") {
      return await handleMercadoPago(activeGateway, {
        amount, description, agendamento_id, payment_method: preferred_method,
        customer_email, customer_name, customer_cpf,
      });
    }

    if (activeGateway.gateway === "woovi") {
      return await handleWoovi(activeGateway, {
        amount, description, agendamento_id,
        customer_name, customer_cpf,
      });
    }

    return new Response(JSON.stringify({ gateway: "local", method: "pix" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-payment error:", err);
    return new Response(JSON.stringify({ error: "Erro interno ao criar pagamento" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Mercado Pago ────────────────────────────────────────────────────────────

async function handleMercadoPago(
  config: any,
  params: { amount: number; description: string; agendamento_id: string; payment_method: string; customer_email?: string; customer_name?: string; customer_cpf?: string }
) {
  const { amount, description, agendamento_id, payment_method, customer_email, customer_name, customer_cpf } = params;
  const token = config.access_token;

  if (!token) {
    return new Response(JSON.stringify({ error: "Access token do Mercado Pago não configurado" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // PIX payment
    if (payment_method === "pix") {
      // 5 min expiration
      const expDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const body: any = {
        transaction_amount: amount,
        description: description || "Agendamento",
        payment_method_id: "pix",
        date_of_expiration: expDate,
        payer: {
          email: customer_email || "cliente@email.com",
          first_name: customer_name || "Cliente",
        },
        external_reference: `WEB_${agendamento_id}`,
      };

      const res = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Idempotency-Key": `${agendamento_id}-pix-${Date.now()}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      console.log("MP PIX response:", JSON.stringify(data));

      if (data.id) {
        return new Response(JSON.stringify({
          gateway: "mercadopago",
          method: "pix",
          payment_id: data.id,
          status: data.status,
          qr_code: data.point_of_interaction?.transaction_data?.qr_code,
          qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
          ticket_url: data.point_of_interaction?.transaction_data?.ticket_url,
          expiration: data.date_of_expiration,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Erro ao gerar PIX", details: data }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Credit card — creates a preference (checkout link)
    if (payment_method === "cartao") {
      const preference = {
        items: [{
          title: description || "Agendamento",
          quantity: 1,
          unit_price: amount,
          currency_id: "BRL",
        }],
        payer: {
          email: customer_email || "cliente@email.com",
          name: customer_name || "Cliente",
        },
        external_reference: `WEB_${agendamento_id}`,
        payment_methods: {
          excluded_payment_types: [{ id: "ticket" }], // exclude boleto
          installments: 6,
        },
        back_urls: {
          success: `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/sucesso`,
          failure: `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}`,
          pending: `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}`,
        },
        auto_return: "approved",
        notification_url: config.webhook_url,
      };

      const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(preference),
      });

      const data = await res.json();
      console.log("MP Preference response:", JSON.stringify(data));

      if (data.id) {
        return new Response(JSON.stringify({
          gateway: "mercadopago",
          method: "cartao",
          preference_id: data.id,
          init_point: data.init_point,
          sandbox_init_point: data.sandbox_init_point,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Erro ao criar preferência", details: data }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Boleto
    if (payment_method === "boleto") {
      const body: any = {
        transaction_amount: amount,
        description: description || "Agendamento",
        payment_method_id: "bolbradesco",
        payer: {
          email: customer_email || "cliente@email.com",
          first_name: customer_name || "Cliente",
          identification: {
            type: "CPF",
            number: customer_cpf || "00000000000",
          },
        },
        external_reference: `WEB_${agendamento_id}`,
      };

      const res = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Idempotency-Key": `${agendamento_id}-boleto-${Date.now()}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      console.log("MP Boleto response:", JSON.stringify(data));

      if (data.id) {
        return new Response(JSON.stringify({
          gateway: "mercadopago",
          method: "boleto",
          payment_id: data.id,
          status: data.status,
          barcode: data.barcode?.content,
          boleto_url: data.transaction_details?.external_resource_url,
          expiration: data.date_of_expiration,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Erro ao gerar boleto", details: data }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("MercadoPago API error:", err);
    return new Response(JSON.stringify({ error: "Erro na API do Mercado Pago" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Método não suportado" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Woovi (OpenPix) ─────────────────────────────────────────────────────────

async function handleWoovi(
  config: any,
  params: { amount: number; description: string; agendamento_id: string; customer_name?: string; customer_cpf?: string }
) {
  const { amount, description, agendamento_id, customer_name, customer_cpf } = params;
  const token = config.access_token;

  if (!token) {
    return new Response(JSON.stringify({ error: "Token da Woovi não configurado" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body: any = {
      correlationID: agendamento_id,
      value: Math.round(amount * 100), // Woovi uses cents
      comment: description || "Agendamento",
      expiresIn: 300, // 5 minutes in seconds
    };

    if (customer_name) {
      body.customer = {
        name: customer_name,
        ...(customer_cpf ? { taxID: customer_cpf } : {}),
      };
    }

    const res = await fetch("https://api.openpix.com.br/api/v1/charge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log("Woovi response:", JSON.stringify(data));

    if (data.charge) {
      return new Response(JSON.stringify({
        gateway: "woovi",
        method: "pix",
        charge_id: data.charge.identifier,
        correlation_id: data.charge.correlationID,
        qr_code: data.charge.brCode,
        qr_code_image: data.charge.qrCodeImage,
        status: data.charge.status,
        expiration: data.charge.expiresDate,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Erro ao criar cobrança Woovi", details: data }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Woovi API error:", err);
    return new Response(JSON.stringify({ error: "Erro na API da Woovi" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
