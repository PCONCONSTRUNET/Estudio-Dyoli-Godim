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
          // Aceita "WEB_<uuid>" (vindo do app/site) ou UUID puro (legado)
          const agendamentoId = String(payment.external_reference).replace(/^WEB_/, "");

          // Monta nome do pagador (first + last, ou e-mail como fallback)
          const payerName = [payment.payer?.first_name, payment.payer?.last_name]
            .filter(Boolean).join(" ").trim() || payment.payer?.email || null;
          // Link do comprovante (ticket PIX). Em cartão fica vazio.
          const receiptUrl = payment.point_of_interaction?.transaction_data?.ticket_url
            || payment.transaction_details?.external_resource_url
            || null;
          // Data de aprovação
          const paidAt = payment.date_approved || new Date().toISOString();

          const { error } = await supabase
            .from("agendamentos")
            .update({
              status: "confirmado",
              valor_pago: payment.transaction_amount,
              forma_pagamento: payment.payment_type_id || "mercadopago",
              payment_id: String(payment.id),
              paid_at: paidAt,
              payer_name: payerName,
              receipt_url: receiptUrl,
            })
            .eq("id", agendamentoId);


          if (error) {
            console.error("Error updating agendamento:", error);
          } else {
            console.log(`Agendamento ${agendamentoId} updated with payment`);
            // Buscar dados do agendamento pra montar a notificação
            const { data: ag } = await supabase
              .from("agendamentos")
              .select("servico, valor_pago, cliente_nome, user_id, data_agendamento, horario, origem")
              .eq("id", agendamentoId)
              .single();
            if (ag) {
              // Push pra admin — pagamento confirmado
              try {
                await supabase.functions.invoke("send-push", {
                  body: {
                    role: "admin",
                    title: "💰 Pagamento confirmado!",
                    message: `${ag.cliente_nome || "Cliente"} pagou R$ ${Number(ag.valor_pago || 0).toFixed(2)} — ${ag.servico}`,
                    url: "/admin",
                  },
                });
              } catch (e) {
                console.warn("send-push (pagamento) failed:", e);
              }

              // Push pra admin — novo agendamento confirmado
              try {
                await supabase.functions.invoke("send-push", {
                  body: {
                    role: "admin",
                    title: ag.origem === "whatsapp_bot" ? "🔔 Novo Agendamento (WhatsApp)" : "🔔 Novo Agendamento!",
                    message: `${ag.cliente_nome || "Cliente"} — ${ag.servico} em ${ag.data_agendamento} às ${ag.horario}`,
                    url: "/admin",
                  },
                });
              } catch (e) {
                console.warn("send-push (novo) failed:", e);
              }

              // WhatsApp de confirmação pro cliente
              try {
                const { data: prof } = await supabase
                  .from("profiles")
                  .select("nome, whatsapp")
                  .eq("id", ag.user_id)
                  .maybeSingle();
                if (prof?.whatsapp) {
                  const [y, mo, d] = String(ag.data_agendamento).split("-");
                  const dataFmt = `${d}/${mo}/${y}`;
                  const nome = prof.nome || ag.cliente_nome || "";
                  const mensagem = `✅ *Agendamento Confirmado no Estudio Dyoli Godim!* 🌸\n\nOlá ${nome}, recebemos a confirmação do seu pagamento e do agendamento para o dia ${dataFmt} às ${ag.horario}. Te esperamos!`;
                  fetch("http://217.76.50.145:3001/webhook/notificacao", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ numero: prof.whatsapp, mensagem, token: "dyoli123" }),
                  }).catch((e) => console.log("notify webhook failed", e));
                }
              } catch (e) {
                console.warn("whatsapp confirm failed:", e);
              }
            }
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
