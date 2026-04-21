import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeWhatsapp = (input: string) => (input || "").replace(/\D/g, "");
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

const FROM_EMAIL = "Estúdio Dyoli <no-reply@estudiodyoli.com.br>";
const APP_BASE_URL = "https://estudiodyoli.lovable.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { whatsapp, email } = await req.json();
    const wpp = normalizeWhatsapp(whatsapp || "");
    const mail = (email || "").trim().toLowerCase();

    if (wpp.length < 10 || wpp.length > 15) {
      return json({ error: "WhatsApp inválido" }, 400);
    }
    if (!isValidEmail(mail) || mail.length > 255) {
      return json({ error: "E-mail inválido" }, 400);
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY ausente" }, 500);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Encontra perfil pelo whatsapp
    const { data: profile } = await admin
      .from("profiles")
      .select("id, nome, whatsapp")
      .eq("whatsapp", wpp)
      .maybeSingle();

    // Resposta sempre genérica para não vazar quem está cadastrado
    const successResponse = json({
      success: true,
      message: "Se o WhatsApp estiver cadastrado, o link foi enviado para o e-mail informado.",
    });

    if (!profile) {
      console.log("[reset] whatsapp não cadastrado:", wpp);
      return successResponse;
    }

    // Gera token seguro
    const token = crypto.randomUUID() + "-" + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    const { error: insertErr } = await admin.from("password_reset_tokens").insert({
      user_id: profile.id,
      whatsapp: wpp,
      email: mail,
      token,
      expires_at: expiresAt,
    });

    if (insertErr) {
      console.error("[reset] erro insert token:", insertErr);
      return json({ error: "Erro ao gerar token" }, 500);
    }

    const resetUrl = `${APP_BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;
    const nome = profile.nome || "cliente";

    const html = `<!DOCTYPE html>
<html><body style="margin:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f3;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.05);">
        <tr><td style="padding:40px 36px 24px;text-align:center;background:linear-gradient(135deg,#1a1a1a,#2a2422);">
          <h1 style="margin:0;color:#d4a574;font-size:24px;font-weight:600;letter-spacing:0.05em;">Estúdio Dyoli</h1>
        </td></tr>
        <tr><td style="padding:36px;">
          <h2 style="margin:0 0 16px;font-size:20px;color:#1a1a1a;">Olá, ${nome}!</h2>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a4a4a;">
            Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:
          </p>
          <p style="text-align:center;margin:32px 0;">
            <a href="${resetUrl}" style="display:inline-block;background:#c87a8a;color:#ffffff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:600;font-size:15px;">Redefinir minha senha</a>
          </p>
          <p style="margin:0 0 12px;font-size:13px;color:#888;line-height:1.6;">
            Ou copie e cole este link no navegador:<br/>
            <span style="color:#c87a8a;word-break:break-all;">${resetUrl}</span>
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:28px 0;"/>
          <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
            Este link expira em <strong>30 minutos</strong>. Se você não pediu essa redefinição, ignore este e-mail — sua senha continua a mesma.
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;background:#fafafa;">
          <p style="margin:0;font-size:11px;color:#aaa;">© Estúdio Dyoli · Beleza & Bem-estar</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [mail],
        subject: "Redefinir senha · Estúdio Dyoli",
        html,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("[reset] Resend falhou:", resendRes.status, errBody);
      return json({ error: "Falha ao enviar e-mail. Verifique o domínio no Resend." }, 500);
    }

    console.log("[reset] e-mail enviado para", mail, "wpp", wpp);
    return successResponse;
  } catch (err) {
    console.error("[reset] erro:", err);
    return json({ error: "Erro interno" }, 500);
  }
});
