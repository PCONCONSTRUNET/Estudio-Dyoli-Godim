// Public endpoint: identifica cliente pelo WhatsApp, cria/atualiza conta e
// devolve uma sessão (access_token/refresh_token) para o front continuar
// usando o fluxo normal de agendamento autenticado, sem precisar pedir senha.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  normalizeWhatsapp,
  whatsappToEmail,
  whatsappVariations,
} from "../_shared/bot-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_PASSWORD = "123123";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { nome, whatsapp } = await req.json();

    if (!nome || !whatsapp) {
      return json({ error: "Informe nome e WhatsApp" }, 400);
    }

    const wa = normalizeWhatsapp(whatsapp);
    if (wa.length < 10 || wa.length > 15) {
      return json({ error: "WhatsApp inválido" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);
    const anon = createClient(supabaseUrl, anonKey);

    const email = whatsappToEmail(wa);

    // 1) Tenta achar perfil pelo WhatsApp
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, nome")
      .eq("whatsapp", wa)
      .maybeSingle();

    let userId: string | null = existingProfile?.id ?? null;
    let isNew = false;

    // 2) Se não existe perfil, cria conta
    if (!userId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { nome, whatsapp: wa, source: "public_booking" },
      });

      if (createErr) {
        // Possível: email já existe (legado). Procura pelo email.
        const { data: list } = await admin.auth.admin.listUsers();
        const found = list?.users?.find((u) => u.email === email);
        if (!found) {
          console.error("createUser error", createErr);
          return json({ error: "Não foi possível criar a conta" }, 500);
        }
        userId = found.id;
      } else {
        userId = created.user?.id ?? null;
        isNew = true;
      }

      if (userId) {
        await admin
          .from("profiles")
          .upsert({ id: userId, nome, whatsapp: wa }, { onConflict: "id" });
      }
    } else {
      // Perfil existe — mantém o nome cadastrado, mas garante whatsapp
      await admin
        .from("profiles")
        .update({ whatsapp: wa })
        .eq("id", userId);
    }

    if (!userId) {
      return json({ error: "Falha ao identificar cliente" }, 500);
    }

    // 3) Faz signin para devolver tokens (reseta a senha caso esteja diferente)
    let signin = await anon.auth.signInWithPassword({ email, password: DEFAULT_PASSWORD });

    if (signin.error) {
      // Reseta a senha via admin e tenta novamente
      await admin.auth.admin.updateUserById(userId, { password: DEFAULT_PASSWORD });
      signin = await anon.auth.signInWithPassword({ email, password: DEFAULT_PASSWORD });
    }

    if (signin.error || !signin.data.session) {
      console.error("signin error", signin.error);
      return json({ error: "Não foi possível iniciar a sessão" }, 500);
    }

    return json({
      success: true,
      is_new: isNew,
      cliente: {
        user_id: userId,
        nome: existingProfile?.nome || nome,
        whatsapp: wa,
        email,
      },
      session: {
        access_token: signin.data.session.access_token,
        refresh_token: signin.data.session.refresh_token,
      },
    });
  } catch (err) {
    console.error("public-cliente-signin error", err);
    return json({ error: err instanceof Error ? err.message : "Erro interno" }, 500);
  }
});
