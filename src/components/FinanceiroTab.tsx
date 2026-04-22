import { useState, useMemo, useRef, useEffect } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Calendar, Download, FileText, Table2, TrendingUp, Wallet, X, Percent, Settings, ArrowDown, ChevronLeft, ChevronRight, Sparkles, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Agendamento {
  id: string; servico: string; variacao: string | null; data_agendamento: string;
  horario: string; valor: number; valor_pago: number | null; status: string;
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
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCaixa, setShowCaixa] = useState(false);
  const [caixaDate, setCaixaDate] = useState(new Date().toISOString().split("T")[0]);
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
  const [despesas, setDespesas] = useState<{ valor: number; pago: boolean; data_vencimento: string }[]>([]);
  useEffect(() => {
    (supabase.from as any)("despesas").select("valor,pago,data_vencimento").then(({ data }: any) => {
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
  const comissaoValor = totalRecebido * (comissaoPct / 100);
  const totalDespesas = despesas
    .filter(d => d.data_vencimento >= periodRange.start && d.data_vencimento <= periodRange.end)
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

  // Fechamento de caixa
  const caixaData = useMemo(() => {
    const dayAgs = agendamentos.filter(a => a.data_agendamento === caixaDate && a.status !== "cancelado");
    const total = dayAgs.reduce((s, a) => s + Number(a.valor), 0);
    const recebido = dayAgs.reduce((s, a) => s + Number(a.valor_pago || 0), 0);
    const faltas = agendamentos.filter(a => a.data_agendamento === caixaDate && a.status === "falta").length;
    return { items: dayAgs, total, recebido, pendente: total - recebido, qtd: dayAgs.length, faltas };
  }, [agendamentos, caixaDate]);

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

  const formatDateShort = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-charcoal/95 border border-primary-foreground/[0.1] rounded-xl px-3 py-2 shadow-xl">
        <p className="font-body text-[10px] text-primary-foreground/50 mb-1">{label}</p>
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
          <button onClick={exportCSV} className="p-2 rounded-xl hover:bg-green-500/10 text-primary-foreground/30 hover:text-green-500 transition-all" title="Exportar planilha">
            <Table2 className="w-4 h-4" />
          </button>
          <button onClick={exportPDF} className="p-2 rounded-xl hover:bg-rose/10 text-primary-foreground/30 hover:text-rose transition-all" title="Exportar PDF">
            <FileText className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Period filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          { value: "hoje" as const, label: "Hoje" },
          { value: "semana" as const, label: "Semana" },
          { value: "mes" as const, label: "Mês" },
          { value: "personalizado" as const, label: "Custom" },
        ]).map(f => (
          <button key={f.value} onClick={() => setPeriod(f.value)}
            className={`px-3 py-1.5 rounded-full font-body text-[11px] font-medium whitespace-nowrap border transition-all ${period === f.value ? "bg-gold/10 text-gold border-gold/20" : "bg-primary-foreground/[0.03] text-primary-foreground/40 border-primary-foreground/[0.06]"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {period === "personalizado" && (
        <div className="flex gap-2 animate-fade-in">
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[12px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[12px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
          <p className="font-body text-[10px] text-primary-foreground/35 uppercase tracking-widest">Receita</p>
          <p className="font-heading text-xl font-bold text-gold mt-1">{formatCurrency(totalReceita)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
          <p className="font-body text-[10px] text-primary-foreground/35 uppercase tracking-widest">Recebido</p>
          <p className="font-heading text-xl font-bold text-green-500 mt-1">{formatCurrency(totalRecebido)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
          <p className="font-body text-[10px] text-primary-foreground/35 uppercase tracking-widest">Pendente</p>
          <p className="font-heading text-xl font-bold text-rose mt-1">{formatCurrency(totalPendente)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
          <p className="font-body text-[10px] text-primary-foreground/35 uppercase tracking-widest flex items-center gap-1"><ArrowDown className="w-3 h-3" /> Despesas</p>
          <p className="font-heading text-xl font-bold text-red-400 mt-1">- {formatCurrency(totalDespesas)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
          <p className="font-body text-[10px] text-primary-foreground/35 uppercase tracking-widest">Atendimentos</p>
          <p className="font-heading text-xl font-bold text-primary-foreground mt-1">{qtdAtendimentos}</p>
        </div>
        <div className={`p-4 rounded-2xl border ${lucroLiquido >= 0 ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}`}>
          <p className="font-body text-[10px] text-primary-foreground/35 uppercase tracking-widest">Lucro Líquido</p>
          <p className={`font-heading text-xl font-bold mt-1 ${lucroLiquido >= 0 ? "text-green-400" : "text-red-400"}`}>{formatCurrency(lucroLiquido)}</p>
        </div>
      </div>

      {/* Comissão */}
      <div className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5">
        <div className="flex items-center justify-between mb-2">
          <span className="font-body text-[11px] text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5" /> Minha Comissão ({comissaoPct}%)
          </span>
          <button
            onClick={() => { setShowComissaoConfig(!showComissaoConfig); setTempComissao(comissaoPct.toString()); }}
            className="p-1.5 rounded-lg hover:bg-purple-500/10 text-purple-400/50 hover:text-purple-400 transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="font-heading text-2xl font-bold text-purple-400">{formatCurrency(comissaoValor)}</p>
        <p className="font-body text-[10px] text-purple-400/50 mt-1">
          {comissaoPct}% sobre {formatCurrency(totalRecebido)} recebido no período
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
                      : "bg-primary-foreground/[0.03] text-primary-foreground/30 border-primary-foreground/[0.06] hover:border-purple-500/20"
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
      <div className="p-4 rounded-2xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
        <p className="font-body text-[11px] text-primary-foreground/40 uppercase tracking-widest mb-3">Receita por dia</p>
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
              <span className="flex items-center gap-1.5 font-body text-[10px] text-primary-foreground/40"><span className="w-2.5 h-2.5 rounded-full bg-gold" /> Receita</span>
              <span className="flex items-center gap-1.5 font-body text-[10px] text-primary-foreground/40"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Recebido</span>
            </div>
          </>
        ) : (
          <div className="h-[120px] flex items-center justify-center">
            <p className="font-body text-[12px] text-primary-foreground/20">Sem dados no período</p>
          </div>
        )}
      </div>

      {/* Bar Chart - Receita por serviço */}
      <div className="p-4 rounded-2xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
        <p className="font-body text-[11px] text-primary-foreground/40 uppercase tracking-widest mb-3">Por serviço</p>
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
            <p className="font-body text-[12px] text-primary-foreground/20">Sem dados no período</p>
          </div>
        )}
      </div>

      {/* Pie Chart - Status pagamento */}
      <div className="p-4 rounded-2xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
        <p className="font-body text-[11px] text-primary-foreground/40 uppercase tracking-widest mb-3">Status de pagamento</p>
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
                <span key={d.name} className="flex items-center gap-1.5 font-body text-[10px] text-primary-foreground/40">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} /> {d.name} ({d.value})
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="h-[120px] flex items-center justify-center">
            <p className="font-body text-[12px] text-primary-foreground/20">Sem dados no período</p>
          </div>
        )}
      </div>

      {/* Fechamento de caixa — editorial */}
      <div className="relative overflow-hidden rounded-3xl border border-gold/15 bg-gradient-to-br from-gold/[0.04] via-primary-foreground/[0.02] to-transparent">
        {/* glow decorativo */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-60 h-60 rounded-full bg-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 w-52 h-52 rounded-full bg-purple-500/10 blur-3xl" />

        <button
          onClick={() => setShowCaixa(!showCaixa)}
          className="relative w-full flex items-center justify-between p-5"
        >
          <span className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-gold" />
            </span>
            <span className="text-left">
              <span className="block font-heading text-[15px] font-semibold text-primary-foreground tracking-tight">Fechamento de Caixa</span>
              <span className="block font-body text-[10px] text-primary-foreground/40 uppercase tracking-[0.2em] mt-0.5">Resumo do dia</span>
            </span>
          </span>
          <span className={`w-7 h-7 rounded-full border border-primary-foreground/10 flex items-center justify-center transition-transform ${showCaixa ? "rotate-180" : ""}`}>
            <ChevronRight className="w-3.5 h-3.5 text-primary-foreground/50 rotate-90" />
          </span>
        </button>

        {showCaixa && (
          <div className="relative px-5 pb-5 space-y-5 animate-fade-in">
            {/* Ciclo Mensal — corte configurável */}
            {(() => {
              const cicloAgs = agendamentos.filter(
                a => a.status !== "cancelado" && a.status !== "falta" &&
                     a.data_agendamento >= ciclo.startISO && a.data_agendamento <= ciclo.endISO
              );
              const cicloRecebido = cicloAgs.reduce((s, a) => s + Number(a.valor_pago || 0), 0);
              const cicloTotal = cicloAgs.reduce((s, a) => s + Number(a.valor), 0);
              const cicloDespesas = despesas
                .filter(d => d.data_vencimento >= ciclo.startISO && d.data_vencimento <= ciclo.endISO)
                .reduce((s, d) => s + Number(d.valor), 0);
              const cicloLucro = cicloRecebido - cicloDespesas;
              const cicloComissao = cicloRecebido * (comissaoPct / 100);
              const fmtShort = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
              const today = new Date(); today.setHours(12, 0, 0, 0);
              const totalDays = Math.round((ciclo.endDate.getTime() - ciclo.startDate.getTime()) / 86400000) + 1;
              const elapsedDays = Math.max(0, Math.min(totalDays, Math.round((today.getTime() - ciclo.startDate.getTime()) / 86400000) + 1));
              const cicloProgress = cicloOffset === 0 ? Math.round((elapsedDays / totalDays) * 100) : (cicloOffset < 0 ? 100 : 0);

              return (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-foreground/[0.04] to-primary-foreground/[0.01] border border-primary-foreground/[0.08]">
                  <div className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCicloOffset(o => o - 1)}
                          className="w-7 h-7 rounded-lg hover:bg-primary-foreground/[0.05] flex items-center justify-center text-primary-foreground/50 hover:text-primary-foreground transition-all"
                          aria-label="Ciclo anterior"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <div className="text-center">
                          <p className="font-body text-[9px] text-primary-foreground/40 uppercase tracking-[0.25em]">
                            {cicloOffset === 0 ? "Ciclo atual" : cicloOffset < 0 ? `${Math.abs(cicloOffset)} ciclo(s) atrás` : `+${cicloOffset} ciclo(s)`}
                          </p>
                          <p className="font-heading text-[13px] font-semibold text-primary-foreground tabular-nums">
                            {fmtShort(ciclo.startDate)} → {fmtShort(ciclo.endDate)}
                          </p>
                        </div>
                        <button
                          onClick={() => setCicloOffset(o => o + 1)}
                          className="w-7 h-7 rounded-lg hover:bg-primary-foreground/[0.05] flex items-center justify-center text-primary-foreground/50 hover:text-primary-foreground transition-all"
                          aria-label="Próximo ciclo"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        {cicloOffset !== 0 && (
                          <button
                            onClick={() => setCicloOffset(0)}
                            className="px-2 py-1 rounded-md bg-gold/10 text-gold font-body text-[9px] font-medium uppercase tracking-wider hover:bg-gold/20 transition-all"
                          >
                            Atual
                          </button>
                        )}
                        <button
                          onClick={() => { setShowCorteConfig(!showCorteConfig); setTempCorte(diaCorte.toString()); }}
                          className="p-1.5 rounded-lg hover:bg-primary-foreground/[0.05] text-primary-foreground/40 hover:text-gold transition-all"
                          aria-label="Configurar dia de corte"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="h-1 rounded-full bg-primary-foreground/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-gold/70 to-purple-400/70 transition-all duration-700"
                          style={{ width: `${cicloProgress}%` }}
                        />
                      </div>
                      <p className="font-body text-[9px] text-primary-foreground/35 mt-1.5 text-center">
                        {cicloOffset === 0
                          ? `Dia ${elapsedDays} de ${totalDays} · corte todo dia ${diaCorte}`
                          : `Período fechado · ${totalDays} dias`}
                      </p>
                    </div>

                    {/* Metrics ciclo */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-primary-foreground/[0.02] border border-primary-foreground/[0.04]">
                        <p className="font-body text-[8.5px] text-primary-foreground/35 uppercase tracking-widest">Recebido</p>
                        <p className="font-heading text-base font-bold text-green-400 tabular-nums">{formatCurrency(cicloRecebido)}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-primary-foreground/[0.02] border border-primary-foreground/[0.04]">
                        <p className="font-body text-[8.5px] text-primary-foreground/35 uppercase tracking-widest">Previsto</p>
                        <p className="font-heading text-base font-bold text-gold tabular-nums">{formatCurrency(cicloTotal)}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-primary-foreground/[0.02] border border-primary-foreground/[0.04]">
                        <p className="font-body text-[8.5px] text-primary-foreground/35 uppercase tracking-widest">Despesas</p>
                        <p className="font-heading text-base font-bold text-red-400 tabular-nums">- {formatCurrency(cicloDespesas)}</p>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${cicloLucro >= 0 ? "bg-green-500/5 border-green-500/15" : "bg-red-500/5 border-red-500/15"}`}>
                        <p className="font-body text-[8.5px] text-primary-foreground/35 uppercase tracking-widest">Lucro</p>
                        <p className={`font-heading text-base font-bold tabular-nums ${cicloLucro >= 0 ? "text-green-400" : "text-red-400"}`}>{formatCurrency(cicloLucro)}</p>
                      </div>
                    </div>

                    {/* Comissão do ciclo */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/15">
                      <span className="font-body text-[10px] text-purple-400/70 uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" /> Comissão {comissaoPct}%
                      </span>
                      <span className="font-heading text-[14px] font-bold text-purple-300 tabular-nums">{formatCurrency(cicloComissao)}</span>
                    </div>

                    {/* Config dia de corte */}
                    {showCorteConfig && (
                      <div className="pt-3 border-t border-primary-foreground/[0.06] space-y-2 animate-fade-in">
                        <label className="font-body text-[10px] text-primary-foreground/50 uppercase tracking-wider">
                          Dia que fecha o mês (1 a 28)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            max="28"
                            value={tempCorte}
                            onChange={e => setTempCorte(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-gold/20 text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/30 tabular-nums"
                          />
                          <button
                            onClick={() => {
                              const val = Math.min(28, Math.max(1, Number(tempCorte) || 1));
                              setDiaCorte(val);
                              localStorage.setItem("dyoli_dia_corte", val.toString());
                              setCicloOffset(0);
                              setShowCorteConfig(false);
                            }}
                            className="px-4 py-2 rounded-xl bg-gold/10 text-gold font-body text-[12px] font-medium hover:bg-gold/20 transition-all"
                          >
                            Salvar
                          </button>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {[1, 5, 10, 15, 20, 25].map(d => (
                            <button
                              key={d}
                              onClick={() => setTempCorte(d.toString())}
                              className={`px-2.5 py-1 rounded-full font-body text-[10px] border transition-all tabular-nums ${
                                Number(tempCorte) === d
                                  ? "bg-gold/15 text-gold border-gold/30"
                                  : "bg-primary-foreground/[0.03] text-primary-foreground/40 border-primary-foreground/[0.06] hover:border-gold/20"
                              }`}
                            >
                              dia {d}
                            </button>
                          ))}
                        </div>
                        <p className="font-body text-[10px] text-primary-foreground/35 leading-relaxed">
                          O ciclo do "Mês" começa neste dia e termina um dia antes do próximo corte. Ao virar, as finanças do período zeram automaticamente e um novo ciclo começa.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}


            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
                <button
                  onClick={() => {
                    const d = new Date(caixaDate + "T12:00:00");
                    d.setDate(d.getDate() - 1);
                    setCaixaDate(d.toISOString().split("T")[0]);
                  }}
                  className="w-9 h-9 rounded-xl hover:bg-primary-foreground/[0.05] flex items-center justify-center text-primary-foreground/50 hover:text-primary-foreground transition-all"
                  aria-label="Dia anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <label className="flex-1 text-center relative cursor-pointer group">
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-gold/70 group-hover:text-gold transition-colors" />
                    <span className="font-heading text-[15px] font-semibold text-primary-foreground capitalize group-hover:text-gold transition-colors">
                      {new Date(caixaDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                    </span>
                  </span>
                  <input
                    type="date"
                    value={caixaDate}
                    onChange={e => setCaixaDate(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                  />
                </label>
                <button
                  onClick={() => {
                    const d = new Date(caixaDate + "T12:00:00");
                    d.setDate(d.getDate() + 1);
                    setCaixaDate(d.toISOString().split("T")[0]);
                  }}
                  className="w-9 h-9 rounded-xl hover:bg-primary-foreground/[0.05] flex items-center justify-center text-primary-foreground/50 hover:text-primary-foreground transition-all"
                  aria-label="Próximo dia"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Quick shortcuts */}
              <div className="flex gap-1.5 justify-center">
                {([
                  { label: "Ontem", offset: -1 },
                  { label: "Hoje", offset: 0 },
                  { label: "Amanhã", offset: 1 },
                ]).map(({ label, offset }) => {
                  const d = new Date();
                  d.setDate(d.getDate() + offset);
                  const dateStr = d.toISOString().split("T")[0];
                  const active = caixaDate === dateStr;
                  return (
                    <button
                      key={label}
                      onClick={() => setCaixaDate(dateStr)}
                      className={`px-3 py-1 rounded-full font-body text-[10px] font-medium border transition-all ${
                        active
                          ? "bg-gold/10 text-gold border-gold/30"
                          : "bg-primary-foreground/[0.02] text-primary-foreground/40 border-primary-foreground/[0.06] hover:border-gold/20 hover:text-primary-foreground/70"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>


            {/* Hero number — receita do dia */}
            <div className="text-center py-4">
              <p className="font-body text-[10px] text-primary-foreground/40 uppercase tracking-[0.3em] mb-2">Recebido hoje</p>
              <p className="font-heading text-5xl font-bold bg-gradient-to-br from-gold via-gold to-gold/60 bg-clip-text text-transparent leading-none">
                {formatCurrency(caixaData.recebido)}
              </p>
              <p className="font-body text-[11px] text-primary-foreground/35 mt-2">
                de <span className="text-primary-foreground/60 font-medium">{formatCurrency(caixaData.total)}</span> previstos
              </p>

              {/* Progress bar */}
              <div className="mt-4 max-w-[240px] mx-auto">
                <div className="h-1 rounded-full bg-primary-foreground/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold/80 to-green-500/80 transition-all duration-700"
                    style={{ width: `${caixaData.total > 0 ? Math.min(100, (caixaData.recebido / caixaData.total) * 100) : 0}%` }}
                  />
                </div>
                <p className="font-body text-[9px] text-primary-foreground/35 uppercase tracking-[0.2em] mt-2">
                  {caixaData.total > 0 ? Math.round((caixaData.recebido / caixaData.total) * 100) : 0}% do dia recebido
                </p>
              </div>
            </div>

            {/* Ticker line — métricas separadas por linha */}
            <div className="grid grid-cols-3 rounded-2xl bg-primary-foreground/[0.02] border border-primary-foreground/[0.06] divide-x divide-primary-foreground/[0.06]">
              <div className="text-center py-3 px-2">
                <p className="font-heading text-xl font-bold text-primary-foreground">{caixaData.qtd}</p>
                <p className="font-body text-[9px] text-primary-foreground/35 uppercase tracking-widest mt-0.5">Atend.</p>
              </div>
              <div className="text-center py-3 px-2">
                <p className="font-heading text-xl font-bold text-rose">{formatCurrency(caixaData.pendente)}</p>
                <p className="font-body text-[9px] text-primary-foreground/35 uppercase tracking-widest mt-0.5">Pendente</p>
              </div>
              <div className="text-center py-3 px-2">
                <p className="font-heading text-xl font-bold text-orange-500">{caixaData.faltas}</p>
                <p className="font-body text-[9px] text-primary-foreground/35 uppercase tracking-widest mt-0.5">Faltas</p>
              </div>
            </div>

            {/* Comissão — destaque */}
            <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-500/[0.03] to-transparent border border-purple-500/20">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="font-body text-[9px] text-purple-400/70 uppercase tracking-[0.25em] flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" /> Sua comissão · {comissaoPct}%
                  </p>
                  <p className="font-heading text-2xl font-bold text-purple-300 mt-1">
                    {formatCurrency(caixaData.recebido * (comissaoPct / 100))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-body text-[9px] text-purple-400/50 uppercase tracking-widest">A retirar</p>
                </div>
              </div>
            </div>

            {/* Lista de atendimentos — timeline */}
            {caixaData.items.length > 0 ? (
              <div>
                <p className="font-body text-[9px] text-primary-foreground/35 uppercase tracking-[0.25em] mb-3 px-1">Atendimentos do dia</p>
                <div className="space-y-1.5">
                  {[...caixaData.items].sort((a, b) => a.horario.localeCompare(b.horario)).map((a) => {
                    const pago = Number(a.valor_pago || 0) >= Number(a.valor);
                    const parcial = Number(a.valor_pago || 0) > 0 && !pago;
                    return (
                      <div key={a.id} className="group relative flex items-center gap-3 p-3 rounded-2xl bg-primary-foreground/[0.02] border border-primary-foreground/[0.04] hover:border-gold/20 transition-all">
                        {/* Time column */}
                        <div className="flex flex-col items-center w-12 shrink-0">
                          <span className="font-heading text-[13px] font-bold text-primary-foreground tabular-nums leading-none">{a.horario.slice(0, 5)}</span>
                          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${pago ? "bg-green-500" : parcial ? "bg-gold" : "bg-primary-foreground/20"}`} />
                        </div>
                        {/* Divider */}
                        <div className="w-px h-10 bg-primary-foreground/[0.06]" />
                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <p className="font-body text-[12.5px] font-medium text-primary-foreground truncate">{getClientName(a.user_id, a.cliente_nome)}</p>
                          <p className="font-body text-[10.5px] text-primary-foreground/40 truncate">{a.servico}</p>
                        </div>
                        {/* Value */}
                        <div className="text-right shrink-0">
                          <p className="font-heading text-[13px] font-bold text-gold tabular-nums">{formatCurrency(Number(a.valor))}</p>
                          {pago ? (
                            <p className="font-body text-[9px] text-green-500 flex items-center justify-end gap-0.5 mt-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Pago
                            </p>
                          ) : parcial ? (
                            <p className="font-body text-[9px] text-gold/80 mt-0.5">Sinal {formatCurrency(Number(a.valor_pago))}</p>
                          ) : (
                            <p className="font-body text-[9px] text-primary-foreground/30 flex items-center justify-end gap-0.5 mt-0.5">
                              <Clock className="w-2.5 h-2.5" /> Pendente
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 rounded-2xl bg-primary-foreground/[0.02] border border-dashed border-primary-foreground/[0.08]">
                <p className="font-body text-[12px] text-primary-foreground/30">Nenhum atendimento neste dia</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lista de pagamentos */}
      <div>
        <p className="font-body text-[11px] text-primary-foreground/40 uppercase tracking-widest mb-3">Todos os pagamentos</p>
        <div className="space-y-1.5">
          {filtered.map(a => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-2xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
              <div className="min-w-0 flex-1">
                <p className="font-body text-[13px] font-medium text-primary-foreground truncate">{getClientName(a.user_id, a.cliente_nome)}</p>
                <p className="font-body text-[10px] text-primary-foreground/30">{formatDateShort(a.data_agendamento)} · {a.servico}</p>
              </div>
              <div className="text-right ml-2">
                <p className="font-body text-[13px] text-gold font-semibold">{formatCurrency(Number(a.valor))}</p>
                <p className={`font-body text-[10px] font-medium ${Number(a.valor_pago || 0) >= Number(a.valor) ? "text-green-500" : Number(a.valor_pago || 0) > 0 ? "text-gold" : "text-primary-foreground/25"}`}>
                  {Number(a.valor_pago || 0) >= Number(a.valor) ? "Pago" : Number(a.valor_pago || 0) > 0 ? `Sinal: ${formatCurrency(Number(a.valor_pago))}` : "Pendente"}
                </p>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="font-body text-[13px] text-primary-foreground/30 text-center py-6">Nenhum registro no período</p>}
        </div>
      </div>
    </div>
  );
};

export default FinanceiroTab;
