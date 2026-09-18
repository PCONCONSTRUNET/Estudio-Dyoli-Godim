import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  corsHeaders,
  checkBotAuth,
  jsonResponse,
  normalizeWhatsapp,
  whatsappToEmail,
  whatsappVariations,
  DEFAULT_BOT_PASSWORD,
} from "../_shared/bot-auth.ts";

// Creates appointment from WhatsApp bot. Auto-creates user account if not exists.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authError = checkBotAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const {
      whatsapp,
      nome,
      cpf,
      servico_id,
      data,
      horario,
      variacao,
      forma_pagamento,
    } = body as {
      whatsapp?: string;
      nome?: string;
      cpf?: string;
      servico_id?: string;
      data?: string;
      horario?: string;
      variacao?: string;
      forma_pagamento?: string;
    };

    if (!whatsapp || !nome || !servico_id || !data || !horario) {
      return jsonResponse(
        {
          success: false,
          error:
            "Campos obrigatórios: whatsapp, nome, servico_id, data (YYYY-MM-DD), horario (HH:MM)",
        },
        400
      );
    }

    // Normaliza CPF (apenas dígitos) — campo opcional
    const cpfDigits = cpf ? cpf.replace(/\D/g, "") : "";
    const cpfFinal = cpfDigits.length === 11 ? cpfDigits : null;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return jsonResponse(
        { success: false, error: "data deve estar no formato YYYY-MM-DD" },
        400
      );
    }
    if (!/^\d{2}:\d{2}$/.test(horario)) {
      return jsonResponse(
        { success: false, error: "horario deve estar no formato HH:MM" },
        400
      );
    }

    const wa = normalizeWhatsapp(whatsapp);
    if (wa.length < 10 || wa.length > 15) {
      return jsonResponse(
        { success: false, error: "whatsapp inválido (deve conter 10-15 dígitos)" },
        400
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load service to validate and snapshot price/duration
    const { data: servico, error: servicoErr } = await admin
      .from("servicos")
      .select("id, nome, preco, duracao_minutos, ativo")
      .eq("id", servico_id)
      .maybeSingle();

    if (servicoErr) throw servicoErr;
    if (!servico || !servico.ativo) {
      return jsonResponse(
        { success: false, error: "Serviço não encontrado ou inativo" },
        404
      );
    }

    // Check slot availability (any of the 30-min blocks needed)
    const duracao = servico.duracao_minutos || 60;
    const slotsNeeded = Math.ceil(duracao / 30);
    const [sh, sm] = horario.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const slotsToCheck: string[] = [];
    for (let i = 0; i < slotsNeeded; i++) {
      const t = startMin + i * 30;
      const h = Math.floor(t / 60);
      const m = t % 60;
      slotsToCheck.push(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
      );
    }

    const { data: conflitos, error: conflitoErr } = await admin
      .from("horarios_bloqueados")
      .select("horario")
      .eq("data", data)
      .in("horario", slotsToCheck);

    if (conflitoErr) throw conflitoErr;
    if (conflitos && conflitos.length > 0) {
      return jsonResponse(
        {
          success: false,
          error: "Horário não está mais disponível",
          conflitos: conflitos.map((c) => c.horario),
        },
        409
      );
    }

    // Find or create user account
    const email = whatsappToEmail(wa);
    let userId: string | null = null;

    // Build legacy variations of the same number to find pre-normalization profiles
    const variations = whatsappVariations(wa);

    const { data: existingProfiles } = await admin
      .from("profiles")
      .select("id, whatsapp")
      .in("whatsapp", variations);

    const existingProfile = existingProfiles?.[0];

    if (existingProfile?.id) {
      userId = existingProfile.id;
      // Atualiza whatsapp legado + grava CPF se ainda não tiver
      const updates: Record<string, unknown> = {};
      if (existingProfile.whatsapp !== wa) updates.whatsapp = wa;
      if (cpfFinal) updates.cpf = cpfFinal;
      if (Object.keys(updates).length > 0) {
        await admin
          .from("profiles")
          .update(updates)
          .eq("id", existingProfile.id);
      }
    } else {
      // Try to create the auth user
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: DEFAULT_BOT_PASSWORD,
        email_confirm: true,
        user_metadata: { nome, whatsapp: wa, cpf: cpfFinal, source: "whatsapp_bot" },
      });

      if (createErr) {
        // Likely the email already exists — try to look it up
        const { data: list } = await admin.auth.admin.listUsers();
        const found = list?.users?.find((u) => u.email === email);
        if (found) {
          userId = found.id;
        } else {
          throw createErr;
        }
      } else {
        userId = created.user?.id ?? null;
      }

      // Ensure profile row exists / is up to date
      if (userId) {
        await admin
          .from("profiles")
          .upsert(
            { id: userId, nome, whatsapp: wa, ...(cpfFinal ? { cpf: cpfFinal } : {}) },
            { onConflict: "id" }
          );
      }
    }

    if (!userId) {
      return jsonResponse(
        { success: false, error: "Não foi possível criar/recuperar a conta do cliente" },
        500
      );
    }

    // PIX online → reserva o slot como "aguardando_pagamento" (oculto do admin/histórico).
    // Só vira "confirmado" quando o webhook do Mercado Pago confirmar o pagamento.
    // Outras formas (pagar na recepção) entram já como "confirmado".
    const forma = forma_pagamento ?? "pix";
    const isPixOnline = forma === "pix";
    const statusInicial = isPixOnline ? "aguardando_pagamento" : "confirmado";

    const { data: agendamento, error: agendarErr } = await admin
      .from("agendamentos")
      .insert({
        user_id: userId,
        cliente_nome: nome,
        servico: servico.nome,
        variacao: variacao ?? null,
        data_agendamento: data,
        horario,
        valor: servico.preco,
        duracao_minutos: duracao,
        forma_pagamento: forma,
        status: statusInicial,
        origem: "whatsapp_bot",
      })
      .select()
      .single();

    if (agendarErr) throw agendarErr;

    // ⚠️ Para PIX online NÃO disparamos notificações aqui — agendamento está PENDENTE.
    // O webhook do Mercado Pago (mercadopago-webhook) é quem confirma e notifica.
    if (!isPixOnline) {
      // Webhook de confirmação WhatsApp pro cliente (somente pagamento na recepção)
      try {
        const [y, mo, d] = data.split("-");
        const dataFmt = `${d}/${mo}/${y}`;
        const mensagem = `✅ *Agendamento Confirmado no Estudio Dyoli Godim!* 🌸\n\nOlá ${nome}, recebemos a confirmação do seu agendamento para o dia ${dataFmt} às ${horario}. Te esperamos!`;
        fetch("http://217.76.50.145:3001/webhook/notificacao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numero: wa, mensagem, token: "dyoli123" }),
        }).catch((e) => console.log("Erro ao enviar webhook de confirmação", e));
      } catch (e) {
        console.log("notify webhook skipped", e);
      }

      // Push nativo pro admin (via WhatsApp bot)
      try {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
            apikey: SERVICE_KEY,
          },
          body: JSON.stringify({
            role: "admin",
            title: "🔔 Novo Agendamento (WhatsApp)",
            message: `${nome} — ${servico.nome} em ${data} às ${horario}`,
            url: "/admin",
          }),
        }).catch((e) => console.log("send-push failed", e));
      } catch (e) {
        console.log("push skipped", e);
      }
    }

    return jsonResponse({
      success: true,
      message: "Agendamento criado com sucesso",
      agendamento,
      cliente: {
        user_id: userId,
        email,
        senha_padrao: DEFAULT_BOT_PASSWORD,
        whatsapp: wa,
      },
    });
  } catch (err) {
    console.error("bot-agendar error:", err);
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
