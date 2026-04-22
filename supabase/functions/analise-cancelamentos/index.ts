import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Agendamento {
  id: string;
  servico: string;
  variacao: string | null;
  data_agendamento: string;
  horario: string;
  valor: number;
  valor_pago: number | null;
  status: string;
  origem: string;
  duracao_minutos: number;
  cliente_nome: string | null;
  user_id: string;
  created_at: string;
}

// Calcula estatísticas determinísticas (não-IA) — base sólida do relatório
function computeStats(items: Agendamento[]) {
  const total = items.length;
  if (total === 0) return null;

  const cancelados = items.filter((a) => a.status === "cancelado");
  const faltas = items.filter((a) => a.status === "falta");
  const concluidos = items.filter((a) => a.status === "concluido");
  const ativos = items.filter((a) => ["pendente", "confirmado"].includes(a.status));

  const baseRelevante = cancelados.length + faltas.length + concluidos.length;

  // Por dia da semana
  const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const porDia: Record<string, { cancel: number; total: number }> = {};
  diasSemana.forEach((d) => (porDia[d] = { cancel: 0, total: 0 }));

  // Por faixa horária
  const faixas = { "manha": "Manhã (até 12h)", "tarde": "Tarde (12h-18h)", "noite": "Noite (após 18h)" };
  const porFaixa: Record<string, { cancel: number; total: number }> = {
    manha: { cancel: 0, total: 0 },
    tarde: { cancel: 0, total: 0 },
    noite: { cancel: 0, total: 0 },
  };

  // Por serviço
  const porServico: Record<string, { cancel: number; total: number }> = {};

  // Por origem (web vs bot)
  const porOrigem: Record<string, { cancel: number; total: number }> = {};

  // Por cliente (top no-shows / cancelamentos)
  const porCliente: Record<string, { nome: string; cancel: number; falta: number; total: number }> = {};

  // Antecedência média de cancelamento (dias entre criação e data agendada)
  const antecedencias: number[] = [];

  [...cancelados, ...faltas, ...concluidos].forEach((a) => {
    const data = new Date(a.data_agendamento + "T12:00:00");
    const dia = diasSemana[data.getDay()];
    const hora = parseInt(a.horario.split(":")[0]);
    const faixa = hora < 12 ? "manha" : hora < 18 ? "tarde" : "noite";
    const isCancel = a.status === "cancelado" || a.status === "falta";

    porDia[dia].total += 1;
    porFaixa[faixa].total += 1;
    if (!porServico[a.servico]) porServico[a.servico] = { cancel: 0, total: 0 };
    porServico[a.servico].total += 1;
    const origem = a.origem || "web";
    if (!porOrigem[origem]) porOrigem[origem] = { cancel: 0, total: 0 };
    porOrigem[origem].total += 1;

    const cKey = a.user_id;
    if (!porCliente[cKey]) porCliente[cKey] = { nome: a.cliente_nome || "Sem nome", cancel: 0, falta: 0, total: 0 };
    porCliente[cKey].total += 1;

    if (isCancel) {
      porDia[dia].cancel += 1;
      porFaixa[faixa].cancel += 1;
      porServico[a.servico].cancel += 1;
      porOrigem[origem].cancel += 1;
      if (a.status === "cancelado") porCliente[cKey].cancel += 1;
      else porCliente[cKey].falta += 1;

      // antecedência
      const created = new Date(a.created_at);
      const diffMs = data.getTime() - created.getTime();
      const dias = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
      antecedencias.push(dias);
    }
  });

  const taxaCancelamento = baseRelevante > 0 ? ((cancelados.length + faltas.length) / baseRelevante) * 100 : 0;
  const taxaFalta = baseRelevante > 0 ? (faltas.length / baseRelevante) * 100 : 0;
  const antecMedia = antecedencias.length > 0 ? antecedencias.reduce((s, n) => s + n, 0) / antecedencias.length : 0;

  // valor perdido com falta+cancelados sem aviso (< 1 dia de antecedência)
  const valorPerdido = [...cancelados, ...faltas].reduce((s, a) => {
    const created = new Date(a.created_at);
    const data = new Date(a.data_agendamento + "T12:00:00");
    const diasAntec = (data.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    if (a.status === "falta" || diasAntec < 1) return s + Number(a.valor);
    return s;
  }, 0);

  const formatPct = (cancel: number, total: number) => (total > 0 ? Math.round((cancel / total) * 100) : 0);

  return {
    totais: {
      ativos: ativos.length,
      concluidos: concluidos.length,
      cancelados: cancelados.length,
      faltas: faltas.length,
      taxa_cancelamento_pct: Math.round(taxaCancelamento * 10) / 10,
      taxa_falta_pct: Math.round(taxaFalta * 10) / 10,
      antecedencia_media_dias: Math.round(antecMedia * 10) / 10,
      valor_perdido_estimado: Math.round(valorPerdido * 100) / 100,
    },
    por_dia_semana: Object.entries(porDia).map(([dia, v]) => ({
      dia,
      cancelamentos: v.cancel,
      total: v.total,
      taxa_pct: formatPct(v.cancel, v.total),
    })).filter((x) => x.total > 0),
    por_faixa_horaria: Object.entries(porFaixa).map(([k, v]) => ({
      faixa: faixas[k as keyof typeof faixas],
      cancelamentos: v.cancel,
      total: v.total,
      taxa_pct: formatPct(v.cancel, v.total),
    })).filter((x) => x.total > 0),
    por_servico: Object.entries(porServico).map(([servico, v]) => ({
      servico,
      cancelamentos: v.cancel,
      total: v.total,
      taxa_pct: formatPct(v.cancel, v.total),
    })).sort((a, b) => b.taxa_pct - a.taxa_pct).slice(0, 10),
    por_origem: Object.entries(porOrigem).map(([origem, v]) => ({
      origem,
      cancelamentos: v.cancel,
      total: v.total,
      taxa_pct: formatPct(v.cancel, v.total),
    })),
    top_clientes_problematicos: Object.values(porCliente)
      .filter((c) => c.cancel + c.falta >= 2)
      .sort((a, b) => (b.cancel + b.falta) - (a.cancel + a.falta))
      .slice(0, 5)
      .map((c) => ({
        nome: c.nome,
        cancelamentos: c.cancel,
        faltas: c.falta,
        total_agendamentos: c.total,
      })),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Período: últimos 90 dias por padrão
    const body = await req.json().catch(() => ({}));
    const dias = Math.min(Math.max(Number(body.dias) || 90, 30), 365);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - dias);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const { data: agendamentos, error } = await supabase
      .from("agendamentos")
      .select("id,servico,variacao,data_agendamento,horario,valor,valor_pago,status,origem,duracao_minutos,cliente_nome,user_id,created_at")
      .gte("data_agendamento", cutoffStr)
      .order("data_agendamento", { ascending: false })
      .limit(1000);

    if (error) throw error;

    const stats = computeStats((agendamentos || []) as Agendamento[]);

    if (!stats || stats.totais.cancelados + stats.totais.faltas === 0) {
      return new Response(
        JSON.stringify({
          periodo_dias: dias,
          stats: stats || { totais: { ativos: 0, concluidos: 0, cancelados: 0, faltas: 0, taxa_cancelamento_pct: 0, taxa_falta_pct: 0, antecedencia_media_dias: 0, valor_perdido_estimado: 0 } },
          analise: {
            resumo_executivo: "Nenhum cancelamento ou falta registrado no período. Excelente performance!",
            padroes: [],
            acoes: [],
            score_saude: 10,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // IA: identifica padrões + sugere ações com tool calling
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um consultor de negócios especializado em estúdios de beleza e estética no Brasil. Analise estatísticas de cancelamentos e faltas, identifique padrões reais nos dados (não invente) e sugira ações práticas e acionáveis. Use tom profissional, direto e em português brasileiro. Sempre referencie números específicos dos dados ao identificar padrões.`,
          },
          {
            role: "user",
            content: `Analise estes dados de cancelamentos e faltas dos últimos ${dias} dias do Estúdio Dyoli e retorne padrões + ações via a ferramenta:\n\n${JSON.stringify(stats, null, 2)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_cancellation_analysis",
              description: "Reporta análise estruturada de padrões de cancelamento e ações recomendadas.",
              parameters: {
                type: "object",
                properties: {
                  resumo_executivo: {
                    type: "string",
                    description: "1-2 frases sobre a saúde geral dos cancelamentos (referencia números).",
                  },
                  score_saude: {
                    type: "number",
                    description: "Nota de 0 a 10 da saúde da operação quanto a cancelamentos. 10 = ótimo, 0 = crítico.",
                  },
                  padroes: {
                    type: "array",
                    description: "3 a 5 padrões identificados nos dados.",
                    items: {
                      type: "object",
                      properties: {
                        titulo: { type: "string", description: "Título curto do padrão (ex: 'Faltas concentradas em horário noturno')." },
                        descricao: { type: "string", description: "Frase explicando o padrão com número específico (ex: '40% dos cancelamentos vêm de horários após 18h')." },
                        severidade: { type: "string", enum: ["baixa", "media", "alta"], description: "Impacto do padrão." },
                      },
                      required: ["titulo", "descricao", "severidade"],
                      additionalProperties: false,
                    },
                  },
                  acoes: {
                    type: "array",
                    description: "3 a 5 ações práticas e específicas que o estúdio pode tomar.",
                    items: {
                      type: "object",
                      properties: {
                        titulo: { type: "string", description: "Ação curta (ex: 'Cobrar sinal de 30% para horários noturnos')." },
                        descricao: { type: "string", description: "Como executar a ação na prática." },
                        impacto_esperado: { type: "string", description: "Resultado esperado (ex: 'Reduz faltas em 30-50%')." },
                        prioridade: { type: "string", enum: ["baixa", "media", "alta"], description: "Urgência da ação." },
                      },
                      required: ["titulo", "descricao", "impacto_esperado", "prioridade"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["resumo_executivo", "score_saude", "padroes", "acoes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_cancellation_analysis" } },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, txt);
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições da IA atingido. Tente novamente em alguns minutos.", stats, periodo_dias: dias }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos em Settings > Workspace > Usage.", stats, periodo_dias: dias }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`IA falhou: ${aiResp.status}`);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("IA não retornou análise estruturada");
    }
    const analise = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ periodo_dias: dias, stats, analise }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analise-cancelamentos error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
