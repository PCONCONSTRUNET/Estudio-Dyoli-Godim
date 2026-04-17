import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  corsHeaders,
  checkBotAuth,
  jsonResponse,
  normalizeWhatsapp,
} from "../_shared/bot-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authError = checkBotAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { whatsapp, status } = body as { whatsapp?: string; status?: string };

    if (!whatsapp) {
      return jsonResponse({ success: false, error: "whatsapp é obrigatório" }, 400);
    }

    const wa = normalizeWhatsapp(whatsapp);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await admin
      .from("profiles")
      .select("id, nome")
      .eq("whatsapp", wa)
      .maybeSingle();

    if (!profile) {
      return jsonResponse({
        success: true,
        cliente: null,
        agendamentos: [],
        message: "Nenhum cliente encontrado para este WhatsApp",
      });
    }

    let query = admin
      .from("agendamentos")
      .select(
        "id, servico, variacao, data_agendamento, horario, valor, valor_pago, status, forma_pagamento, duracao_minutos"
      )
      .eq("user_id", profile.id)
      .order("data_agendamento", { ascending: false })
      .order("horario", { ascending: false })
      .limit(20);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: agendamentos, error } = await query;
    if (error) throw error;

    return jsonResponse({
      success: true,
      cliente: profile,
      agendamentos: agendamentos ?? [],
    });
  } catch (err) {
    console.error("bot-meus-agendamentos error:", err);
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
