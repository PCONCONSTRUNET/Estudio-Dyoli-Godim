import { useState, useMemo, useRef, useEffect } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Calendar, Download, FileText, Table2, TrendingUp, Wallet, X, Percent, Settings, ArrowDown, ChevronLeft, ChevronRight, Sparkles, CheckCircle2, Clock, FileSpreadsheet, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AnaliseCancelamentosModal from "@/components/AnaliseCancelamentosModal";

interface Agendamento {
  id: string; servico: string; variacao: string | null; data_agendamento: string;
  horario: string; valor: number; valor_pago: number | null;
  valor_troco: number | null; valor_gorjeta: number | null; valor_credito: number | null;
  status: string;
  created_at: string; user_id: string; cliente_nome: string | null;
}

interface Props {
  agendamentos: Agendamento[];
  getClientName: (userId: string, clienteNome?: string | null) => string;
}

type FilterPeriod = "hoje" | "semana" | "mes" | "personalizado";

const COLORS = [
  "hsl(340 30% 50%)",   // rose
  "hsl(40 40% 55%)",    // gold
  "hsl(142 71% 45%)",   // green
  "hsl(24 80% 55%)",    // orange
  "hsl(262 52% 47%)",   // purple
  "hsl(199 89% 48%)",   // blue
];

const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const FinanceiroTab = ({ agendamentos, getClientName }: Props) => {
  const [period, setPeriod] = useState<FilterPeriod>("mes");
  const [analiseOpen, setAnaliseOpen] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [comissaoPct, setComissaoPct] = useState(() => {
    const saved = localStorage.getItem("dyoli_comissao_pct");
    return saved ? Number(saved) : 40;
  });
  const [showComissaoConfig, setShowComissaoConfig] = useState(false);
  const [tempComissao, setTempComissao] = useState(comissaoPct.toString());

  // Dia de corte do ciclo mensal (1-28). Ex: 5 = ciclo vai de dia 5 ao dia 4 do mês seguinte.
  const [diaCorte, setDiaCorte] = useState<number>(() => {
    const saved = localStorage.getItem("dyoli_dia_corte");
    return saved ? Math.min(28, Math.max(1, Number(saved))) : 1;
  });
  const [showCorteConfig, setShowCorteConfig] = useState(false);
  const [tempCorte, setTempCorte] = useState(diaCorte.toString());
  // Offset do ciclo exibido (0 = ciclo atual, -1 = anterior, +1 = próximo)
  const [cicloOffset, setCicloOffset] = useState(0);

  // Calcula intervalo do ciclo baseado no dia de corte e offset
  const ciclo = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    // Determina o início do ciclo atual
    const startCurrent = new Date(today);
    if (today.getDate() >= diaCorte) {
      startCurrent.setDate(diaCorte);
    } else {
      startCurrent.setMonth(startCurrent.getMonth() - 1);
      startCurrent.setDate(diaCorte);
    }
    // Aplica offset
    const start = new Date(startCurrent);
    start.setMonth(start.getMonth() + cicloOffset);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setDate(end.getDate() - 1);
    const toISO = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    return { startISO: toISO(start), endISO: toISO(end), startDate: start, endDate: end };
  }, [diaCorte, cicloOffset]);

  // Load despesas
  const [despesas, setDespesas] = useState<{ valor: number; pago: boolean; data_vencimento: string; categoria: string; descricao: string; data_pagamento: string | null; tipo?: string }[]>([]);
  useEffect(() => {
    (supabase.from as any)("despesas").select("valor,pago,data_vencimento,categoria,descricao,data_pagamento,tipo").then(({ data }: any) => {
      if (data) setDespesas(data);
    });
  }, []);


  // Filter agendamentos by period (Mês = ciclo configurado pelo dia de corte)
  const filtered = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    return agendamentos.filter(a => {
      if (a.status === "cancelado" || a.status === "falta") return false;
      const d = a.data_agendamento;
      if (period === "hoje") return d === today;
      if (period === "semana") {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAhead = new Date(now);
        weekAhead.setDate(weekAhead.getDate() + 7);
        return d >= weekAgo.toISOString().split("T")[0] && d <= weekAhead.toISOString().split("T")[0];
      }
      if (period === "mes") {
        return d >= ciclo.startISO && d <= ciclo.endISO;
      }
      if (period === "personalizado" && customStart && customEnd) {
        return d >= customStart && d <= customEnd;
      }
      return true;
    });
  }, [agendamentos, period, customStart, customEnd, ciclo]);


  // Intervalo ativo do filtro (para também filtrar despesas pelo mesmo período)
  const periodRange = useMemo(() => {
    const now = new Date();
    const todayISO = now.toISOString().split("T")[0];
    if (period === "hoje") return { start: todayISO, end: todayISO };
    if (period === "semana") {
      const wa = new Date(now); wa.setDate(wa.getDate() - 7);
      const wh = new Date(now); wh.setDate(wh.getDate() + 7);
      return { start: wa.toISOString().split("T")[0], end: wh.toISOString().split("T")[0] };
    }
    if (period === "mes") return { start: ciclo.startISO, end: ciclo.endISO };
    if (period === "personalizado" && customStart && customEnd) return { start: customStart, end: customEnd };
    return { start: "0000-01-01", end: "9999-12-31" };
  }, [period, ciclo, customStart, customEnd]);

  // Metrics
  const totalReceita = filtered.reduce((s, a) => s + Number(a.valor), 0);
  const totalRecebido = filtered.reduce((s, a) => s + Number(a.valor_pago || 0), 0);
  const totalPendente = totalReceita - totalRecebido;
  const qtdAtendimentos = filtered.length;
  
  const totalGorjetas = filtered.reduce((s, a) => s + Number(a.valor_gorjeta || 0), 0);
  const totalTrocos = filtered.reduce((s, a) => s + Number(a.valor_troco || 0), 0);
  const totalCreditos = filtered.reduce((s, a) => s + Number(a.valor_credito || 0), 0);
  const baseComissao = totalRecebido - totalGorjetas - totalTrocos;
  const comissaoValor = Math.max(0, baseComissao) * (comissaoPct / 100) + totalGorjetas;
  const totalDespesas = despesas
    .filter(d => (d.tipo || "estudio") === "estudio" && d.data_vencimento >= periodRange.start && d.data_vencimento <= periodRange.end)
    .reduce((s, d) => s + Number(d.valor), 0);
  const totalDespesasPessoais = despesas
    .filter(d => d.tipo === "pessoal" && d.data_vencimento >= periodRange.start && d.data_vencimento <= periodRange.end)
    .reduce((s, d) => s + Number(d.valor), 0);
  const lucroLiquido = totalRecebido - totalDespesas;


  // Chart: receita por dia
  const dailyData = useMemo(() => {
    const map: Record<string, { dia: string; receita: number; recebido: number }> = {};
    filtered.forEach(a => {
      const d = a.data_agendamento;
      if (!map[d]) map[d] = { dia: d, receita: 0, recebido: 0 };
      map[d].receita += Number(a.valor);
      map[d].recebido += Number(a.valor_pago || 0);
    });
    return Object.values(map).sort((a, b) => a.dia.localeCompare(b.dia)).map(d => ({
      ...d,
      diaLabel: new Date(d.dia + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    }));
  }, [filtered]);

  // Chart: receita por serviço
  const serviceData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(a => {
      const key = a.servico;
      map[key] = (map[key] || 0) + Number(a.valor_pago || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Chart: status pagamento
  const paymentStatus = useMemo(() => {
    let pago = 0, sinal = 0, pendente = 0;
    filtered.forEach(a => {
      const vPago = Number(a.valor_pago || 0);
      const vTotal = Number(a.valor);
      if (vPago >= vTotal) pago++;
      else if (vPago > 0) sinal++;
      else pendente++;
    });
    return [
      { name: "Pago", value: pago, color: "hsl(142 71% 45%)" },
      { name: "Sinal", value: sinal, color: "hsl(40 40% 55%)" },
      { name: "Pendente", value: pendente, color: "hsl(0 0% 40%)" },
    ].filter(d => d.value > 0);
  }, [filtered]);


  // Despesas no período separadas por tipo
  const despesasPeriodo = useMemo(() => {
    return despesas.filter(d => (d.tipo || "estudio") === "estudio" && d.data_vencimento >= periodRange.start && d.data_vencimento <= periodRange.end);
  }, [despesas, periodRange]);
  const despesasPessoaisPeriodo = useMemo(() => {
    return despesas.filter(d => d.tipo === "pessoal" && d.data_vencimento >= periodRange.start && d.data_vencimento <= periodRange.end);
  }, [despesas, periodRange]);

  // Receita por serviço (DRE - faturamento bruto)
  const receitaPorServico = useMemo(() => {
    const map: Record<string, { faturado: number; recebido: number; qtd: number }> = {};
    filtered.forEach(a => {
      if (!map[a.servico]) map[a.servico] = { faturado: 0, recebido: 0, qtd: 0 };
      map[a.servico].faturado += Number(a.valor);
      map[a.servico].recebido += Number(a.valor_pago || 0);
      map[a.servico].qtd += 1;
    });
    return Object.entries(map).map(([nome, v]) => ({ nome, ...v })).sort((a, b) => b.recebido - a.recebido);
  }, [filtered]);

  // Agrupa por categoria (helper reutilizável)
  const groupByCategoria = (lista: typeof despesas) => {
    const map: Record<string, { total: number; pago: number; pendente: number; qtd: number }> = {};
    lista.forEach(d => {
      const cat = d.categoria || "Geral";
      if (!map[cat]) map[cat] = { total: 0, pago: 0, pendente: 0, qtd: 0 };
      const v = Number(d.valor);
      map[cat].total += v;
      if (d.pago) map[cat].pago += v;
      else map[cat].pendente += v;
      map[cat].qtd += 1;
    });
    return Object.entries(map).map(([categoria, v]) => ({ categoria, ...v })).sort((a, b) => b.total - a.total);
  };
  const despesasPorCategoria = useMemo(() => groupByCategoria(despesasPeriodo), [despesasPeriodo]);
  const despesasPorCategoriaPessoal = useMemo(() => groupByCategoria(despesasPessoaisPeriodo), [despesasPessoaisPeriodo]);


  // Export CSV
  const exportCSV = () => {
    const header = "Data,Horário,Cliente,Serviço,Valor,Pago,Status\n";
    const rows = filtered.map(a =>
      `${a.data_agendamento},${a.horario},"${getClientName(a.user_id, a.cliente_nome)}","${a.servico}",${Number(a.valor).toFixed(2)},${Number(a.valor_pago || 0).toFixed(2)},${a.status}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financeiro_${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export PDF (simple printable page)
  const exportPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const periodLabel = period === "hoje" ? "Hoje" : period === "semana" ? "Última Semana" : period === "mes" ? "Este Mês" : `${customStart} a ${customEnd}`;
    w.document.write(`<!DOCTYPE html><html><head><title>Relatório Financeiro</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 40px; color: #1c1c1c; }
      h1 { font-size: 22px; margin-bottom: 4px; }
      .sub { color: #888; font-size: 13px; margin-bottom: 24px; }
      .metrics { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
      .metric { background: #f5f5f5; padding: 16px; border-radius: 12px; min-width: 140px; }
      .metric-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
      .metric-value { font-size: 22px; font-weight: 700; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { text-align: left; padding: 8px; border-bottom: 2px solid #ddd; font-size: 11px; text-transform: uppercase; color: #888; }
      td { padding: 8px; border-bottom: 1px solid #eee; }
      .gold { color: #B8860B; } .green { color: #22c55e; }
      @media print { body { padding: 20px; } }
    </style></head><body>
    <h1>Relatório Financeiro — Estúdio Dyoli</h1>
    <p class="sub">Período: ${periodLabel} · Gerado em ${new Date().toLocaleDateString("pt-BR")}</p>
    <div class="metrics">
      <div class="metric"><div class="metric-label">Receita Total</div><div class="metric-value gold">${formatCurrency(totalReceita)}</div></div>
      <div class="metric"><div class="metric-label">Recebido</div><div class="metric-value green">${formatCurrency(totalRecebido)}</div></div>
      <div class="metric"><div class="metric-label">Pendente</div><div class="metric-value">${formatCurrency(totalPendente)}</div></div>
      <div class="metric"><div class="metric-label">Atendimentos</div><div class="metric-value">${qtdAtendimentos}</div></div>
      <div class="metric" style="background:#f3e8ff"><div class="metric-label" style="color:#7c3aed">Comissão (${comissaoPct}%)</div><div class="metric-value" style="color:#7c3aed">${formatCurrency(comissaoValor)}</div></div>
    </div>
    <table>
      <thead><tr><th>Data</th><th>Horário</th><th>Cliente</th><th>Serviço</th><th>Valor</th><th>Pago</th></tr></thead>
      <tbody>${filtered.map(a => `<tr><td>${new Date(a.data_agendamento + "T12:00:00").toLocaleDateString("pt-BR")}</td><td>${a.horario}</td><td>${getClientName(a.user_id, a.cliente_nome)}</td><td>${a.servico}</td><td class="gold">${formatCurrency(Number(a.valor))}</td><td class="green">${formatCurrency(Number(a.valor_pago || 0))}</td></tr>`).join("")}</tbody>
    </table></body></html>`);
    w.document.close();
    w.print();
  };

  // Export DRE simplificado (relatório contábil mensal)
  const exportDRE = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const fmtDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("pt-BR");
    const periodLabel = `${fmtDate(periodRange.start)} a ${fmtDate(periodRange.end)}`;
    const margemPct = totalRecebido > 0 ? ((lucroLiquido / totalRecebido) * 100).toFixed(1) : "0,0";
    const ticketMedio = qtdAtendimentos > 0 ? totalRecebido / qtdAtendimentos : 0;

    const linhasReceita = receitaPorServico.map(s =>
      `<tr><td>${s.nome}</td><td style="text-align:center">${s.qtd}</td><td style="text-align:right">${formatCurrency(s.faturado)}</td><td style="text-align:right" class="green">${formatCurrency(s.recebido)}</td></tr>`
    ).join("");

    const linhasDespesa = despesasPorCategoria.map(c =>
      `<tr><td>${c.categoria}</td><td style="text-align:center">${c.qtd}</td><td style="text-align:right" class="green">${formatCurrency(c.pago)}</td><td style="text-align:right" class="rose">${formatCurrency(c.pendente)}</td><td style="text-align:right" class="red">${formatCurrency(c.total)}</td></tr>`
    ).join("");

    const linhasDespesaDetalhe = despesasPeriodo
      .slice()
      .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
      .map(d => `<tr><td>${fmtDate(d.data_vencimento)}</td><td>${d.categoria || "Geral"}</td><td>${d.descricao || "-"}</td><td style="text-align:center">${d.pago ? '<span class="green">Pago</span>' : '<span class="rose">Pendente</span>'}</td><td style="text-align:right" class="red">${formatCurrency(Number(d.valor))}</td></tr>`)
      .join("");

    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>DRE — Estúdio Dyoli</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1a1a1a; max-width: 900px; margin: 0 auto; }
      .header { border-bottom: 3px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 24px; }
      h1 { font-size: 24px; margin: 0 0 4px; letter-spacing: -0.5px; }
      .sub { color: #666; font-size: 13px; }
      h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: #666; margin: 28px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #ddd; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 8px; }
      th { text-align: left; padding: 8px 10px; background: #f5f5f5; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #555; border-bottom: 1px solid #ddd; }
      td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; }
      tr.total td { font-weight: 700; background: #fafafa; border-top: 2px solid #1a1a1a; border-bottom: 2px solid #1a1a1a; font-size: 13px; }
      tr.subtotal td { font-weight: 600; background: #fafafa; }
      .green { color: #16a34a; font-weight: 600; }
      .red { color: #dc2626; font-weight: 600; }
      .rose { color: #e11d48; font-weight: 600; }
      .gold { color: #b8860b; font-weight: 600; }
      .resumo { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
      .card { padding: 14px; border: 1px solid #e5e5e5; border-radius: 8px; }
      .card .lbl { font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; }
      .card .val { font-size: 20px; font-weight: 700; margin-top: 4px; }
      .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 10px; color: #888; text-align: center; }
      @media print { body { padding: 20px; } .resumo { gap: 8px; } }
    </style></head><body>
    <div class="header">
      <h1>DRE — Demonstrativo do Resultado</h1>
      <p class="sub"><strong>Estúdio Dyoli</strong> · Período: ${periodLabel} · Emitido em ${new Date().toLocaleDateString("pt-BR")}</p>
    </div>

    <div class="resumo">
      <div class="card"><div class="lbl">Receita Bruta</div><div class="val gold">${formatCurrency(totalReceita)}</div></div>
      <div class="card"><div class="lbl">Receita Recebida</div><div class="val green">${formatCurrency(totalRecebido)}</div></div>
      <div class="card"><div class="lbl">Resultado Líquido</div><div class="val" style="color:${lucroLiquido >= 0 ? '#16a34a' : '#dc2626'}">${formatCurrency(lucroLiquido)}</div></div>
    </div>

    <h2>1. Receitas por Serviço</h2>
    <table>
      <thead><tr><th>Serviço</th><th style="text-align:center">Qtd</th><th style="text-align:right">Faturado</th><th style="text-align:right">Recebido</th></tr></thead>
      <tbody>
        ${linhasReceita || '<tr><td colspan="4" style="text-align:center;color:#999;padding:16px">Sem receitas no período</td></tr>'}
        <tr class="total"><td>(=) Receita Bruta Total</td><td style="text-align:center">${qtdAtendimentos}</td><td style="text-align:right" class="gold">${formatCurrency(totalReceita)}</td><td style="text-align:right" class="green">${formatCurrency(totalRecebido)}</td></tr>
        <tr><td colspan="3" style="text-align:right;color:#888">(–) Receita Pendente (a receber)</td><td style="text-align:right" class="rose">${formatCurrency(totalPendente)}</td></tr>
      </tbody>
    </table>

    <h2>2. Despesas do Estúdio por Categoria</h2>
    <table>
      <thead><tr><th>Categoria</th><th style="text-align:center">Qtd</th><th style="text-align:right">Pago</th><th style="text-align:right">Pendente</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>
        ${linhasDespesa || '<tr><td colspan="5" style="text-align:center;color:#999;padding:16px">Sem despesas do estúdio no período</td></tr>'}
        <tr class="total"><td>(=) Despesas do Estúdio</td><td style="text-align:center">${despesasPeriodo.length}</td><td style="text-align:right" class="green">${formatCurrency(despesasPeriodo.filter(d=>d.pago).reduce((s,d)=>s+Number(d.valor),0))}</td><td style="text-align:right" class="rose">${formatCurrency(despesasPeriodo.filter(d=>!d.pago).reduce((s,d)=>s+Number(d.valor),0))}</td><td style="text-align:right" class="red">${formatCurrency(totalDespesas)}</td></tr>
      </tbody>
    </table>

    <h2>2.1 Despesas Pessoais <span style="font-size:10px;color:#888;text-transform:none;letter-spacing:0">(não entram no resultado do estúdio)</span></h2>
    <table>
      <thead><tr><th>Categoria</th><th style="text-align:center">Qtd</th><th style="text-align:right">Pago</th><th style="text-align:right">Pendente</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>
        ${despesasPorCategoriaPessoal.map(c => `<tr><td>${c.categoria}</td><td style="text-align:center">${c.qtd}</td><td style="text-align:right" class="green">${formatCurrency(c.pago)}</td><td style="text-align:right" class="rose">${formatCurrency(c.pendente)}</td><td style="text-align:right">${formatCurrency(c.total)}</td></tr>`).join("") || '<tr><td colspan="5" style="text-align:center;color:#999;padding:16px">Sem despesas pessoais no período</td></tr>'}
        <tr class="total"><td>(=) Despesas Pessoais</td><td style="text-align:center">${despesasPessoaisPeriodo.length}</td><td style="text-align:right" class="green">${formatCurrency(despesasPessoaisPeriodo.filter(d=>d.pago).reduce((s,d)=>s+Number(d.valor),0))}</td><td style="text-align:right" class="rose">${formatCurrency(despesasPessoaisPeriodo.filter(d=>!d.pago).reduce((s,d)=>s+Number(d.valor),0))}</td><td style="text-align:right">${formatCurrency(totalDespesasPessoais)}</td></tr>
      </tbody>
    </table>


    <h2>3. Apuração do Resultado</h2>
    <table>
      <tbody>
        <tr><td>(+) Receita Recebida no Período</td><td style="text-align:right" class="green">${formatCurrency(totalRecebido)}</td></tr>
        <tr><td>(–) Despesas do Período</td><td style="text-align:right" class="red">- ${formatCurrency(totalDespesas)}</td></tr>
        <tr><td>(–) Comissão Profissional (${comissaoPct}% sobre recebido)</td><td style="text-align:right" style="color:#7c3aed">- ${formatCurrency(comissaoValor)}</td></tr>
        <tr class="subtotal"><td>(=) Resultado Operacional</td><td style="text-align:right">${formatCurrency(totalRecebido - totalDespesas - comissaoValor)}</td></tr>
        <tr class="total"><td>(=) Resultado Líquido (sem comissão)</td><td style="text-align:right" style="color:${lucroLiquido >= 0 ? '#16a34a' : '#dc2626'}">${formatCurrency(lucroLiquido)}</td></tr>
      </tbody>
    </table>

    <h2>4. Indicadores</h2>
    <table>
      <tbody>
        <tr><td>Ticket Médio (recebido/atendimento)</td><td style="text-align:right">${formatCurrency(ticketMedio)}</td></tr>
        <tr><td>Margem Líquida (Resultado / Receita Recebida)</td><td style="text-align:right">${margemPct}%</td></tr>
        <tr><td>Total de Atendimentos</td><td style="text-align:right">${qtdAtendimentos}</td></tr>
        <tr><td>Taxa de Inadimplência (Pendente / Receita Bruta)</td><td style="text-align:right">${totalReceita > 0 ? ((totalPendente / totalReceita) * 100).toFixed(1) : "0,0"}%</td></tr>
      </tbody>
    </table>

    ${linhasDespesaDetalhe ? `
    <h2>5. Detalhamento das Despesas do Estúdio</h2>
    <table>
      <thead><tr><th>Vencimento</th><th>Categoria</th><th>Descrição</th><th style="text-align:center">Status</th><th style="text-align:right">Valor</th></tr></thead>
      <tbody>${linhasDespesaDetalhe}</tbody>
    </table>` : ""}

    ${despesasPessoaisPeriodo.length ? `
    <h2>6. Detalhamento das Despesas Pessoais</h2>
    <table>
      <thead><tr><th>Vencimento</th><th>Categoria</th><th>Descrição</th><th style="text-align:center">Status</th><th style="text-align:right">Valor</th></tr></thead>
      <tbody>${despesasPessoaisPeriodo.slice().sort((a,b)=>a.data_vencimento.localeCompare(b.data_vencimento)).map(d=>`<tr><td>${fmtDate(d.data_vencimento)}</td><td>${d.categoria||"Geral"}</td><td>${d.descricao||"-"}</td><td style="text-align:center">${d.pago?'<span class="green">Pago</span>':'<span class="rose">Pendente</span>'}</td><td style="text-align:right">${formatCurrency(Number(d.valor))}</td></tr>`).join("")}</tbody>
    </table>` : ""}


    <div class="footer">
      Documento gerado automaticamente pelo sistema do Estúdio Dyoli — Uso contábil interno.
    </div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  // Export DRE em CSV (planilha contábil estruturada)
  const exportDRECsv = () => {
    const fmtDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("pt-BR");
    const fmtNum = (v: number) => v.toFixed(2).replace(".", ",");
    const lines: string[] = [];
    lines.push(`DRE - Estudio Dyoli`);
    lines.push(`Período;${fmtDate(periodRange.start)} a ${fmtDate(periodRange.end)}`);
    lines.push(`Emitido em;${new Date().toLocaleDateString("pt-BR")}`);
    lines.push("");
    lines.push("RECEITAS POR SERVIÇO");
    lines.push("Serviço;Qtd;Faturado;Recebido");
    receitaPorServico.forEach(s => lines.push(`"${s.nome}";${s.qtd};${fmtNum(s.faturado)};${fmtNum(s.recebido)}`));
    lines.push(`TOTAL RECEITA BRUTA;${qtdAtendimentos};${fmtNum(totalReceita)};${fmtNum(totalRecebido)}`);
    lines.push(`RECEITA PENDENTE;;;${fmtNum(totalPendente)}`);
    lines.push("");
    lines.push("DESPESAS DO ESTÚDIO POR CATEGORIA");
    lines.push("Categoria;Qtd;Pago;Pendente;Total");
    despesasPorCategoria.forEach(c => lines.push(`"${c.categoria}";${c.qtd};${fmtNum(c.pago)};${fmtNum(c.pendente)};${fmtNum(c.total)}`));
    lines.push(`TOTAL DESPESAS ESTÚDIO;${despesasPeriodo.length};;;${fmtNum(totalDespesas)}`);
    lines.push("");
    lines.push("DESPESAS PESSOAIS POR CATEGORIA (não entram no resultado)");
    lines.push("Categoria;Qtd;Pago;Pendente;Total");
    despesasPorCategoriaPessoal.forEach(c => lines.push(`"${c.categoria}";${c.qtd};${fmtNum(c.pago)};${fmtNum(c.pendente)};${fmtNum(c.total)}`));
    lines.push(`TOTAL DESPESAS PESSOAIS;${despesasPessoaisPeriodo.length};;;${fmtNum(totalDespesasPessoais)}`);
    lines.push("");
    lines.push("APURAÇÃO");
    lines.push(`(+) Receita Recebida;${fmtNum(totalRecebido)}`);
    lines.push(`(-) Despesas do Estúdio;${fmtNum(totalDespesas)}`);
    lines.push(`(-) Comissão (${comissaoPct}%);${fmtNum(comissaoValor)}`);
    lines.push(`(=) Resultado Operacional;${fmtNum(totalRecebido - totalDespesas - comissaoValor)}`);
    lines.push(`(=) Resultado Líquido;${fmtNum(lucroLiquido)}`);
    lines.push("");
    lines.push("DETALHE DESPESAS DO ESTÚDIO");
    lines.push("Vencimento;Categoria;Descrição;Status;Valor");
    despesasPeriodo.forEach(d => lines.push(`${fmtDate(d.data_vencimento)};"${d.categoria || "Geral"}";"${(d.descricao || "").replace(/"/g, '""')}";${d.pago ? "Pago" : "Pendente"};${fmtNum(Number(d.valor))}`));
    if (despesasPessoaisPeriodo.length) {
      lines.push("");
      lines.push("DETALHE DESPESAS PESSOAIS");
      lines.push("Vencimento;Categoria;Descrição;Status;Valor");
      despesasPessoaisPeriodo.forEach(d => lines.push(`${fmtDate(d.data_vencimento)};"${d.categoria || "Geral"}";"${(d.descricao || "").replace(/"/g, '""')}";${d.pago ? "Pago" : "Pendente"};${fmtNum(Number(d.valor))}`));
    }


    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `DRE_${periodRange.start}_a_${periodRange.end}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDateShort = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-charcoal/95 border border-primary-foreground/[0.1] rounded-xl px-3 py-2 shadow-xl">
        <p className="font-body text-[10px] text-primary-foreground/85 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="font-body text-[11px] font-semibold text-emerald-400">
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-primary-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gold" /> Financeiro
        </h2>
        <div className="flex gap-1.5">
          <button onClick={exportCSV} className="p-2 rounded-xl hover:bg-green-500/10 text-primary-foreground/95 hover:text-green-500 transition-all" title="Exportar planilha de agendamentos">
            <Table2 className="w-4 h-4" />
          </button>
          <button onClick={exportPDF} className="p-2 rounded-xl hover:bg-rose/10 text-primary-foreground/95 hover:text-rose transition-all" title="Exportar PDF resumo">
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={exportDRE}
            className="px-3 py-2 rounded-xl bg-gradient-to-br from-blue-500/15 to-purple-500/10 border border-blue-500/30 text-blue-300 hover:from-blue-500/25 hover:to-purple-500/15 transition-all flex items-center gap-1.5"
            title="DRE — Relatório contábil mensal"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="font-body text-[11px] font-semibold uppercase tracking-wider">DRE</span>
          </button>
        </div>
      </div>

      {/* Banner DRE contábil */}
      <div className="relative overflow-hidden p-4 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/[0.08] via-purple-500/[0.04] to-transparent">
        <div className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/20 flex-shrink-0">
            <FileSpreadsheet className="w-4 h-4 text-blue-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-body text-[12px] font-semibold text-blue-200 uppercase tracking-[0.15em]">Relatório Contábil — DRE</p>
            <p className="font-body text-[11px] text-primary-foreground/55 mt-1 leading-relaxed">
              Demonstrativo pronto para o contador: receitas por serviço, despesas por categoria, comissão, resultado líquido e indicadores do período selecionado.
            </p>
            <div className="flex gap-2 mt-2.5 flex-wrap">
              <button
                onClick={exportDRE}
                className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-200 font-body text-[11px] font-semibold transition-all flex items-center gap-1.5"
              >
                <FileText className="w-3 h-3" /> Gerar PDF
              </button>
              <button
                onClick={exportDRECsv}
                className="px-3 py-1.5 rounded-lg bg-primary-foreground/[0.04] hover:bg-primary-foreground/[0.08] border border-primary-foreground/[0.1] text-primary-foreground/100 font-body text-[11px] font-semibold transition-all flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3 h-3" /> Planilha CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Banner Análise IA de Cancelamentos */}
      <div className="relative overflow-hidden p-4 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.08] via-pink-500/[0.04] to-transparent">
        <div className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/20 flex-shrink-0">
            <Brain className="w-4 h-4 text-purple-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-body text-[12px] font-semibold text-purple-200 uppercase tracking-[0.15em]">Análise de Cancelamentos</p>
              <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 font-body text-[8px] font-bold text-purple-200 uppercase tracking-wider">IA</span>
            </div>
            <p className="font-body text-[11px] text-primary-foreground/55 mt-1 leading-relaxed">
              Identifica padrões nos seus cancelamentos e faltas (horários, dias, clientes recorrentes) e sugere ações práticas para reduzir a perda de receita.
            </p>
            <div className="flex gap-2 mt-2.5 flex-wrap">
              <button
                onClick={() => setAnaliseOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-200 font-body text-[11px] font-semibold transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3" /> Analisar com IA
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Period filters */}
      <div
        role="tablist"
        aria-label="Filtrar período do financeiro"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {(() => {
          const filters = [
            { value: "hoje" as const, label: "Hoje" },
            { value: "semana" as const, label: "Semana" },
            { value: "mes" as const, label: "Mês" },
            { value: "personalizado" as const, label: "Custom" },
          ];
          return filters.map((f, idx) => {
            const active = period === f.value;
            return (
              <button
                key={f.value}
                role="tab"
                type="button"
                aria-pressed={active}
                aria-selected={active}
                aria-label={`Filtrar por ${f.label}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setPeriod(f.value)}
                onKeyDown={(e) => {
                  const tabs = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
                  if (!tabs) return;
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const dir = e.key === "ArrowRight" ? 1 : -1;
                    const nextIdx = (idx + dir + filters.length) % filters.length;
                    setPeriod(filters[nextIdx].value);
                    tabs[nextIdx]?.focus();
                  } else if (e.key === "Home") {
                    e.preventDefault();
                    setPeriod(filters[0].value);
                    tabs[0]?.focus();
                  } else if (e.key === "End") {
                    e.preventDefault();
                    const last = filters.length - 1;
                    setPeriod(filters[last].value);
                    tabs[last]?.focus();
                  }
                }}
                className={`relative px-4 py-2 rounded-full font-body text-[12px] font-semibold whitespace-nowrap border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  active
                    ? "bg-gradient-to-br from-gold/30 to-gold/10 text-gold border-gold/50 shadow-[0_0_18px_-4px_hsl(40_40%_55%/0.5)]"
                    : "bg-primary-foreground/[0.04] text-primary-foreground/55 border-primary-foreground/[0.1] hover:border-gold/25 hover:text-primary-foreground hover:bg-primary-foreground/[0.06]"
                }`}
              >
                {active && <span className="absolute inset-0 rounded-full bg-gold/5 blur-sm -z-10" />}
                {f.label}
              </button>
            );
          });
        })()}
      </div>

      {period === "personalizado" && (
        <div className="flex gap-2 animate-fade-in">
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[12px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[12px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
        </div>
      )}

      {/* Faixa de datas do período ativo */}
      {(period !== "personalizado" || (customStart && customEnd)) && (
        <div className="flex items-center justify-center animate-fade-in" aria-live="polite">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-gold/[0.08] via-gold/[0.04] to-gold/[0.08] border border-gold/20">
            <Calendar className="w-3.5 h-3.5 text-gold/70" />
            <span className="font-body text-[11px] font-medium text-primary-foreground/100 tabular-nums tracking-wide">
              {formatDateShort(periodRange.start)}
              <span className="mx-1.5 text-gold/60">→</span>
              {formatDateShort(periodRange.end)}
            </span>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-gold/[0.06] via-primary-foreground/[0.02] to-transparent border border-gold/15">
          <div className="pointer-events-none absolute -top-10 -right-10 w-24 h-24 rounded-full bg-gold/10 blur-2xl" />
          <p className="relative font-body text-[11px] font-medium text-primary-foreground/95 uppercase tracking-[0.2em]">Receita</p>
          <p className="relative font-heading text-2xl font-bold text-gold mt-1.5 tabular-nums">{formatCurrency(totalReceita)}</p>
        </div>
        <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-green-500/[0.07] via-primary-foreground/[0.02] to-transparent border border-green-500/15">
          <div className="pointer-events-none absolute -top-10 -right-10 w-24 h-24 rounded-full bg-green-500/10 blur-2xl" />
          <p className="relative font-body text-[11px] font-medium text-primary-foreground/95 uppercase tracking-[0.2em]">Recebido</p>
          <p className="relative font-heading text-2xl font-bold text-green-400 mt-1.5 tabular-nums">{formatCurrency(totalRecebido)}</p>
        </div>
        <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-rose/[0.07] via-primary-foreground/[0.02] to-transparent border border-rose/15">
          <div className="pointer-events-none absolute -top-10 -right-10 w-24 h-24 rounded-full bg-rose/10 blur-2xl" />
          <p className="relative font-body text-[11px] font-medium text-primary-foreground/95 uppercase tracking-[0.2em]">Pendente</p>
          <p className="relative font-heading text-2xl font-bold text-rose mt-1.5 tabular-nums">{formatCurrency(totalPendente)}</p>
        </div>
        <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-red-500/[0.07] via-primary-foreground/[0.02] to-transparent border border-red-500/15">
          <div className="pointer-events-none absolute -top-10 -right-10 w-24 h-24 rounded-full bg-red-500/10 blur-2xl" />
          <p className="relative font-body text-[11px] font-medium text-primary-foreground/95 uppercase tracking-[0.2em] flex items-center gap-1"><ArrowDown className="w-3 h-3" /> Despesas</p>
          <p className="relative font-heading text-xl font-bold text-red-400 mt-1.5 tabular-nums leading-tight">- {formatCurrency(totalDespesas)}</p>
          <p className="relative font-body text-[10px] text-primary-foreground/75 mt-1">Estúdio</p>
          {totalDespesasPessoais > 0 && (
            <p className="relative font-body text-[10px] text-purple-400/70 mt-0.5">Pessoal: {formatCurrency(totalDespesasPessoais)}</p>
          )}
        </div>
        <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-primary-foreground/[0.06] via-primary-foreground/[0.02] to-transparent border border-primary-foreground/15">
          <div className="pointer-events-none absolute -top-10 -right-10 w-24 h-24 rounded-full bg-primary-foreground/[0.08] blur-2xl" />
          <p className="relative font-body text-[11px] font-medium text-primary-foreground/95 uppercase tracking-[0.2em]">Atendimentos</p>
          <p className="relative font-heading text-2xl font-bold text-primary-foreground mt-1.5 tabular-nums">{qtdAtendimentos}</p>
        </div>
        <div className={`relative overflow-hidden p-4 rounded-2xl border ${lucroLiquido >= 0 ? "bg-gradient-to-br from-green-500/[0.1] via-green-500/[0.03] to-transparent border-green-500/25" : "bg-gradient-to-br from-red-500/[0.1] via-red-500/[0.03] to-transparent border-red-500/25"}`}>
          <div className={`pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl ${lucroLiquido >= 0 ? "bg-green-500/15" : "bg-red-500/15"}`} />
          <p className="relative font-body text-[11px] font-medium text-primary-foreground/95 uppercase tracking-[0.2em]">Lucro Líquido</p>
          <p className={`relative font-heading text-2xl font-bold mt-1.5 tabular-nums ${lucroLiquido >= 0 ? "text-green-400" : "text-red-400"}`}>{formatCurrency(lucroLiquido)}</p>
        </div>
      </div>

      {/* Comissão */}
      <div className="relative overflow-hidden p-5 rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-500/[0.1] via-purple-500/[0.03] to-transparent">
        <div className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full bg-purple-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 w-40 h-40 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="relative flex items-center justify-between mb-2">
          <span className="font-body text-[12px] font-medium text-purple-300 uppercase tracking-[0.2em] flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5" /> Minha Comissão ({comissaoPct}%)
          </span>
          <button
            onClick={() => { setShowComissaoConfig(!showComissaoConfig); setTempComissao(comissaoPct.toString()); }}
            className="p-1.5 rounded-lg hover:bg-purple-500/15 text-purple-300/60 hover:text-purple-300 transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="relative font-heading text-3xl font-bold text-purple-300 tabular-nums">{formatCurrency(comissaoValor)}</p>
        <p className="relative font-body text-[11px] text-purple-300/60 mt-1.5">
          {comissaoPct}% sobre {formatCurrency(Math.max(0, totalRecebido - totalGorjetas - totalTrocos))} base
          {totalGorjetas > 0 && ` + ${formatCurrency(totalGorjetas)} (Gorjetas)`}
        </p>

        {showComissaoConfig && (
          <div className="mt-3 pt-3 border-t border-purple-500/10 space-y-2 animate-fade-in">
            <label className="font-body text-[11px] text-purple-400/60">Percentual de comissão (%)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={tempComissao}
                onChange={(e) => setTempComissao(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-purple-500/20 text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
              <button
                onClick={() => {
                  const val = Math.min(100, Math.max(0, Number(tempComissao) || 0));
                  setComissaoPct(val);
                  localStorage.setItem("dyoli_comissao_pct", val.toString());
                  setShowComissaoConfig(false);
                }}
                className="px-4 py-2 rounded-xl bg-purple-500/10 text-purple-400 font-body text-[12px] font-medium hover:bg-purple-500/20 transition-all"
              >
                Salvar
              </button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {[30, 35, 40, 45, 50].map((p) => (
                <button
                  key={p}
                  onClick={() => setTempComissao(p.toString())}
                  className={`px-2.5 py-1 rounded-full font-body text-[10px] border transition-all ${
                    Number(tempComissao) === p
                      ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                      : "bg-primary-foreground/[0.03] text-primary-foreground/95 border-primary-foreground/[0.06] hover:border-purple-500/20"
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Area Chart - Receita por dia */}
      <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-gold/[0.04] via-primary-foreground/[0.02] to-transparent border border-gold/15">
        <div className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full bg-gold/8 blur-3xl" />
        <p className="relative font-body text-[12px] font-medium text-primary-foreground/65 uppercase tracking-[0.2em] mb-3">Receita por dia</p>
        {dailyData.length > 0 ? (
          <>
            <div className="h-[200px] [&_.recharts-wrapper]:!bg-transparent [&_.recharts-surface]:!bg-transparent [&_svg]:!bg-transparent">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(40 40% 55%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(40 40% 55%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradRecebido" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsla(0 0% 100% / 0.04)" />
                  <XAxis dataKey="diaLabel" tick={{ fill: "hsla(0 0% 100% / 0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsla(0 0% 100% / 0.3)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} width={40} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsla(0 0% 100% / 0.03)' }} />
                  <Area type="monotone" dataKey="receita" name="Receita" stroke="hsl(40 40% 55%)" fill="url(#gradReceita)" strokeWidth={2} />
                  <Area type="monotone" dataKey="recebido" name="Recebido" stroke="hsl(142 71% 45%)" fill="url(#gradRecebido)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2">
              <span className="flex items-center gap-1.5 font-body text-[10px] text-primary-foreground/75"><span className="w-2.5 h-2.5 rounded-full bg-gold" /> Receita</span>
              <span className="flex items-center gap-1.5 font-body text-[10px] text-primary-foreground/75"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Recebido</span>
            </div>
          </>
        ) : (
          <div className="h-[120px] flex items-center justify-center">
            <p className="font-body text-[12px] text-primary-foreground/85">Sem dados no período</p>
          </div>
        )}
      </div>

      {/* Bar Chart - Receita por serviço */}
      <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-rose/[0.05] via-primary-foreground/[0.02] to-transparent border border-rose/15">
        <div className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full bg-rose/8 blur-3xl" />
        <p className="relative font-body text-[12px] font-medium text-primary-foreground/65 uppercase tracking-[0.2em] mb-3">Por serviço</p>
        {serviceData.length > 0 ? (
          <div className="h-[200px] [&_.recharts-wrapper]:!bg-transparent [&_.recharts-surface]:!bg-transparent [&_svg]:!bg-transparent">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceData} layout="vertical" margin={{ left: 0 }}>
                <defs>
                  {serviceData.map((_, i) => (
                    <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.4} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsla(0 0% 100% / 0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "hsla(0 0% 100% / 0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: "hsla(0 0% 100% / 0.5)", fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsla(0 0% 100% / 0.03)' }} />
                <Bar dataKey="value" name="Recebido" radius={[0, 8, 8, 0]} barSize={20}>
                  {serviceData.map((_, i) => (
                    <Cell key={i} fill={`url(#barGrad${i})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[120px] flex items-center justify-center">
            <p className="font-body text-[12px] text-primary-foreground/85">Sem dados no período</p>
          </div>
        )}
      </div>

      {/* Pie Chart - Status pagamento */}
      <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-purple-500/[0.05] via-primary-foreground/[0.02] to-transparent border border-purple-500/15">
        <div className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full bg-purple-500/10 blur-3xl" />
        <p className="relative font-body text-[12px] font-medium text-primary-foreground/65 uppercase tracking-[0.2em] mb-3">Status de pagamento</p>
        {paymentStatus.length > 0 ? (
          <>
            <div className="h-[180px] [&_.recharts-wrapper]:!bg-transparent [&_.recharts-surface]:!bg-transparent [&_svg]:!bg-transparent">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value" stroke="none">
                    {paymentStatus.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-charcoal/95 border border-primary-foreground/[0.1] rounded-xl px-3 py-2 shadow-xl">
                        <p className="font-body text-[11px] font-semibold" style={{ color: d.color }}>{d.name}: {d.value}</p>
                      </div>
                    );
                  }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4">
              {paymentStatus.map(d => (
                <span key={d.name} className="flex items-center gap-1.5 font-body text-[10px] text-primary-foreground/75">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} /> {d.name} ({d.value})
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="h-[120px] flex items-center justify-center">
            <p className="font-body text-[12px] text-primary-foreground/85">Sem dados no período</p>
          </div>
        )}
      </div>

      <AnaliseCancelamentosModal open={analiseOpen} onClose={() => setAnaliseOpen(false)} />
    </div>
  );
};

export default FinanceiroTab;
