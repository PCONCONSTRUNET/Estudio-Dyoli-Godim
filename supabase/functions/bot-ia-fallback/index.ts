import { corsHeaders, checkBotAuth, jsonResponse } from "../_shared/bot-auth.ts";

// IA fallback: interprets free-form WhatsApp messages and extracts
// the user's intent + parameters using Lovable AI Gateway (free Gemini).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authError = checkBotAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { mensagem, contexto } = body as { mensagem?: string; contexto?: string };

    if (!mensagem || mensagem.trim().length === 0) {
      return jsonResponse({ success: false, error: "mensagem é obrigatória" }, 400);
    }
    if (mensagem.length > 1000) {
      return jsonResponse(
        { success: false, error: "mensagem muito longa (máx 1000 caracteres)" },
        400
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return jsonResponse(
        { success: false, error: "LOVABLE_API_KEY não configurada" },
        500
      );
    }

    const systemPrompt = `Você é um assistente de um estúdio de micropigmentação no WhatsApp.
Sua função é interpretar a mensagem do cliente e classificar a intenção dele.

Intenções possíveis:
- "agendar": cliente quer marcar um horário
- "consultar_agendamentos": cliente quer ver seus agendamentos existentes
- "cancelar": cliente quer cancelar um agendamento
- "listar_servicos": cliente quer saber quais serviços oferecemos
- "consultar_horarios": cliente quer saber horários disponíveis
- "duvida_geral": pergunta livre / dúvida que precisa de resposta humana
- "saudacao": apenas cumprimento (oi, olá, bom dia)
- "outro": não se encaixa em nenhuma das anteriores

Extraia também (se houver):
- servico_mencionado: nome do serviço citado
- data_mencionada: data citada (formato YYYY-MM-DD se possível, senão texto livre)
- horario_mencionado: horário citado (formato HH:MM se possível)

Responda APENAS chamando a função extract_intent.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "extract_intent",
          description: "Extrai a intenção do cliente e parâmetros mencionados",
          parameters: {
            type: "object",
            properties: {
              intencao: {
                type: "string",
                enum: [
                  "agendar",
                  "consultar_agendamentos",
                  "cancelar",
                  "listar_servicos",
                  "consultar_horarios",
                  "duvida_geral",
                  "saudacao",
                  "outro",
                ],
              },
              resposta_sugerida: {
                type: "string",
                description: "Resposta amigável em português para enviar ao cliente",
              },
              servico_mencionado: { type: "string" },
              data_mencionada: { type: "string" },
              horario_mencionado: { type: "string" },
              confianca: {
                type: "number",
                description: "0 a 1, quão confiante está na classificação",
              },
            },
            required: ["intencao", "resposta_sugerida", "confianca"],
            additionalProperties: false,
          },
        },
      },
    ];

    const userContent = contexto
      ? `Contexto da conversa:\n${contexto}\n\nMensagem atual do cliente:\n${mensagem}`
      : mensagem;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          tools,
          tool_choice: { type: "function", function: { name: "extract_intent" } },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return jsonResponse(
          { success: false, error: "Limite de requisições da IA excedido" },
          429
        );
      }
      if (response.status === 402) {
        return jsonResponse(
          {
            success: false,
            error: "Créditos da IA esgotados. Adicione créditos em Settings > Workspace > Usage.",
          },
          402
        );
      }
      const txt = await response.text();
      console.error("AI gateway error:", response.status, txt);
      return jsonResponse(
        { success: false, error: `AI gateway error: ${response.status}` },
        500
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return jsonResponse({
        success: true,
        intencao: "outro",
        resposta_sugerida: "Desculpe, não entendi. Pode reformular?",
        confianca: 0,
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return jsonResponse({ success: true, ...parsed });
  } catch (err) {
    console.error("bot-ia-fallback error:", err);
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});
