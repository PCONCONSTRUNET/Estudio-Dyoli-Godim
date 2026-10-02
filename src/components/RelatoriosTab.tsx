import React, { useState, useMemo } from "react";
import { Sparkles } from "lucide-react";

const COLORS = [
  "hsl(346, 65%, 45%)", "hsl(38, 92%, 50%)", "hsl(142, 71%, 45%)", "hsl(217, 91%, 60%)",
  "hsl(270, 70%, 50%)", "hsl(12, 76%, 61%)", "hsl(316, 70%, 50%)", "hsl(180, 70%, 40%)",
];

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

interface RelatoriosTabProps {
  agendamentos: any[];
}

export default function RelatoriosTab({ agendamentos }: RelatoriosTabProps) {
  const [period, setPeriod] = useState<"hoje" | "semana" | "mes" | "mes_custom" | "dia_custom">("mes");
  const [customMonth, setCustomMonth] = useState("");
  const [customDate, setCustomDate] = useState("");

  const { filteredAgendamentos, periodLabel } = useMemo(() => {
    const now = new Date();
    const todayISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
    
    let filtered = agendamentos.filter(a => 
      a.status !== "cancelado" && 
      a.status !== "falta" && 
      a.servico &&
      a.servico !== "Adição de Crédito" && 
      a.servico !== "Entrada Manual" &&
      !a.servico.startsWith("Pagamento")
    );
    let label = "";

    if (period === "hoje") {
      filtered = filtered.filter(a => a.data_agendamento === todayISO);
      label = "Hoje";
    } else if (period === "semana") {
      const wa = new Date(now); wa.setDate(wa.getDate() - 7);
      const startISO = new Date(wa.getTime() - wa.getTimezoneOffset() * 60000).toISOString().split("T")[0];
      filtered = filtered.filter(a => a.data_agendamento >= startISO && a.data_agendamento <= todayISO);
      label = "Últimos 7 dias";
    } else if (period === "mes") {
      const thisMonth = todayISO.slice(0, 7);
      filtered = filtered.filter(a => a.data_agendamento.startsWith(thisMonth));
      label = "Este Mês";
    } else if (period === "mes_custom" && customMonth) {
      filtered = filtered.filter(a => a.data_agendamento.startsWith(customMonth));
      const [y, m] = customMonth.split("-");
      label = `Mês ${m}/${y}`;
    } else if (period === "dia_custom" && customDate) {
      filtered = filtered.filter(a => a.data_agendamento === customDate);
      const [y, m, d] = customDate.split("-");
      label = `Dia ${d}/${m}/${y}`;
    }

    return { filteredAgendamentos: filtered, periodLabel: label };
  }, [agendamentos, period, customMonth, customDate]);

  const serviceData = useMemo(() => {
    const map: Record<string, { count: number, total: number }> = {};
    filteredAgendamentos.forEach(a => {
      const key = a.servico;
      if (!map[key]) map[key] = { count: 0, total: 0 };
      map[key].count += 1;
      map[key].total += Number(a.valor);
    });

    return Object.entries(map)
      .map(([name, data]) => ({ name, count: data.count, total: data.total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredAgendamentos]);

  const maxTotal = Math.max(1, ...serviceData.map(s => s.total));
  const maxCount = Math.max(1, ...serviceData.map(s => s.count));
  const totalRendeu = serviceData.reduce((s, x) => s + x.total, 0);
  const totalCount = serviceData.reduce((s, x) => s + x.count, 0);

  return (
    <div className="space-y-6 animate-fade-in pb-[120px]">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold text-primary-foreground tracking-tight">Relatório de Serviços</h2>
      </div>

      {/* Filtro de Período */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-2 p-1 bg-primary-foreground/[0.04] rounded-2xl w-max border border-primary-foreground/[0.08]">
          {(["hoje", "semana", "mes"] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-xl font-body text-[12px] font-medium transition-all capitalize ${
                period === p ? "bg-gold text-charcoal shadow-lg" : "text-primary-foreground/65 hover:text-primary-foreground"
              }`}
            >
              {p === "mes" ? "Este Mês" : p}
            </button>
          ))}
        </div>

        <input 
          type="month" 
          value={customMonth}
          onChange={(e) => {
            setCustomMonth(e.target.value);
            setPeriod("mes_custom");
          }}
          className={`px-3 py-1 rounded-xl font-body text-[12px] font-medium bg-transparent border outline-none transition-all ${
            period === "mes_custom" ? "border-gold text-gold" : "border-primary-foreground/[0.1] text-primary-foreground/65 hover:border-primary-foreground/[0.2]"
          }`}
          title="Selecionar Mês Específico"
        />

        <input 
          type="date" 
          value={customDate}
          onChange={(e) => {
            setCustomDate(e.target.value);
            setPeriod("dia_custom");
          }}
          className={`px-3 py-1 rounded-xl font-body text-[12px] font-medium bg-transparent border outline-none transition-all ${
            period === "dia_custom" ? "border-gold text-gold" : "border-primary-foreground/[0.1] text-primary-foreground/65 hover:border-primary-foreground/[0.2]"
          }`}
          title="Selecionar Dia Específico"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-primary-foreground/[0.08] bg-charcoal/50 p-4">
           <p className="font-body text-[11px] text-primary-foreground/65 uppercase tracking-wider mb-1">Total de Serviços</p>
           <p className="font-heading text-2xl font-bold text-primary-foreground">{totalCount}</p>
        </div>
        <div className="rounded-2xl border border-gold/20 bg-gold/[0.05] p-4">
           <p className="font-body text-[11px] text-gold/80 uppercase tracking-wider mb-1">Total Gerado</p>
           <p className="font-heading text-2xl font-bold text-gold">{formatCurrency(totalRendeu)}</p>
        </div>
      </div>

      {/* Lista / Gráfico */}
      <div className="rounded-2xl border border-primary-foreground/[0.08] bg-charcoal/50 p-5">
        <h3 className="font-body text-[12px] font-medium text-primary-foreground/65 uppercase tracking-[0.2em] mb-4">
          Detalhamento por Serviço ({periodLabel})
        </h3>
        
        {serviceData.length > 0 ? (
          <div className="space-y-5">
            {serviceData.map((s, i) => {
              const pctTotal = (s.total / maxTotal) * 100;
              const pctCount = (s.count / totalCount) * 100;
              return (
                <div key={s.name} className="group/row">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-body text-[11px] font-bold tabular-nums w-5 text-center text-primary-foreground/60">
                        {i + 1}
                      </span>
                      <span className="font-body text-[13px] font-medium text-primary-foreground/95 truncate">
                        {s.name}
                      </span>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="font-heading text-[14px] font-bold text-primary-foreground tabular-nums leading-none">
                        {formatCurrency(s.total)}
                      </span>
                      <span className="font-body text-[10px] text-primary-foreground/65 tabular-nums mt-1.5">
                        {s.count} vez{s.count !== 1 ? "es" : ""} ({pctCount.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-primary-foreground/[0.04] overflow-hidden ml-7 w-[calc(100%-1.75rem)]">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ 
                        width: `${pctTotal}%`, 
                        backgroundColor: COLORS[i % COLORS.length] 
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.06]">
              <Sparkles className="w-4 h-4 text-primary-foreground/85" />
            </div>
            <p className="font-body text-[12px] text-primary-foreground/85">Nenhum serviço no período selecionado</p>
          </div>
        )}
      </div>

    </div>
  );
}
