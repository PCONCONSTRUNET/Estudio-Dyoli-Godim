import { useState, useMemo, useEffect } from "react";
import {
 Calendar,
 Wallet,
 Settings,
 ChevronLeft,
 ChevronRight,
 Sparkles,
 CheckCircle2,
 Clock,
 Info,
 Calculator,
 TrendingUp,
 Pencil,
 Check,
 X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ptBR } from "date-fns/locale";

interface Agendamento {
 id: string;
 servico: string;
 variacao: string | null;
 data_agendamento: string;
 horario: string;
 valor: number;
 valor_pago: number | null;
 status: string;
 created_at: string;
 user_id: string;
 cliente_nome: string | null;
}

interface Props {
 agendamentos: Agendamento[];
 getClientName: (userId: string, clienteNome?: string | null) => string;
}

type FilterPeriod = "hoje" | "semana" | "mes" | "personalizado";

const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
const formatDateShort = (d: string) =>
 new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

const CaixaTab = ({ agendamentos, getClientName }: Props) => {
 const [caixaDate, setCaixaDate] = useState(new Date().toISOString().split("T")[0]);
 const [period, setPeriod] = useState<FilterPeriod>("mes");
 const [customStart, setCustomStart] = useState("");
 const [customEnd, setCustomEnd] = useState("");

 const [comissaoPct, setComissaoPct] = useState(() => {
 const saved = localStorage.getItem("dyoli_comissao_pct");
 return saved ? Number(saved) : 40;
 });
 const [editingComissao, setEditingComissao] = useState(false);
 const [tempComissao, setTempComissao] = useState(comissaoPct.toString());

 const saveComissao = () => {
 const v = Math.min(100, Math.max(0, Number(tempComissao) || 0));
 setComissaoPct(v);
 localStorage.setItem("dyoli_comissao_pct", String(v));
 setEditingComissao(false);
 };

 // Dia de corte do ciclo mensal (1-28)
 const [diaCorte, setDiaCorte] = useState<number>(() => {
 const saved = localStorage.getItem("dyoli_dia_corte");
 return saved ? Math.min(28, Math.max(1, Number(saved))) : 1;
 });
 const [showCorteConfig, setShowCorteConfig] = useState(false);
 const [tempCorte, setTempCorte] = useState(diaCorte.toString());
 const [cicloOffset, setCicloOffset] = useState(0);
 const [showComissaoDetail, setShowComissaoDetail] = useState(false);

 const ciclo = useMemo(() => {
 const today = new Date();
 today.setHours(12, 0, 0, 0);
 const startCurrent = new Date(today);
 if (today.getDate() >= diaCorte) {
 startCurrent.setDate(diaCorte);
 } else {
 startCurrent.setMonth(startCurrent.getMonth() - 1);
 startCurrent.setDate(diaCorte);
 }
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

 // Despesas (para lucro do ciclo)
 const [despesas, setDespesas] = useState<{ valor: number; pago: boolean; data_vencimento: string; tipo?: string }[]>([]);
 useEffect(() => {
 (supabase.from as any)("despesas").select("valor,pago,data_vencimento,tipo").then(({ data }: any) => {
 if (data) setDespesas(data);
 });
 }, []);


 // Fechamento do dia
 const caixaData = useMemo(() => {
 const dayAgs = agendamentos.filter((a) => a.data_agendamento === caixaDate && a.status !== "cancelado");
 const total = dayAgs.reduce((s, a) => s + Number(a.valor), 0);
 const recebido = dayAgs.reduce((s, a) => s + Number(a.valor_pago || 0), 0);
 const faltas = agendamentos.filter((a) => a.data_agendamento === caixaDate && a.status === "falta").length;
 return { items: dayAgs, total, recebido, pendente: total - recebido, qtd: dayAgs.length, faltas };
 }, [agendamentos, caixaDate]);

 // Lista de pagamentos por período
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

 const filtered = useMemo(() => {
 return agendamentos.filter((a) => {
 if (a.status === "cancelado" || a.status === "falta") return false;
 const d = a.data_agendamento;
 return d >= periodRange.start && d <= periodRange.end;
 });
 }, [agendamentos, periodRange]);

 // Cálculos do ciclo (compartilhados)
 const cicloStats = useMemo(() => {
 const cicloAgs = agendamentos.filter(
 (a) => a.status !== "cancelado" && a.status !== "falta" &&
 a.data_agendamento >= ciclo.startISO && a.data_agendamento <= ciclo.endISO,
 );
 const recebido = cicloAgs.reduce((s, a) => s + Number(a.valor_pago || 0), 0);
 const total = cicloAgs.reduce((s, a) => s + Number(a.valor), 0);
 const desp = despesas
 .filter((d) => (d.tipo || "estudio") === "estudio" && d.data_vencimento >= ciclo.startISO && d.data_vencimento <= ciclo.endISO)
 .reduce((s, d) => s + Number(d.valor), 0);
 const despPessoal = despesas
 .filter((d) => d.tipo === "pessoal" && d.data_vencimento >= ciclo.startISO && d.data_vencimento <= ciclo.endISO)
 .reduce((s, d) => s + Number(d.valor), 0);

 const lucro = recebido - desp;
 const comissao = recebido * (comissaoPct / 100);
 const today = new Date(); today.setHours(12, 0, 0, 0);
 const totalDays = Math.round((ciclo.endDate.getTime() - ciclo.startDate.getTime()) / 86400000) + 1;
 const elapsedDays = Math.max(0, Math.min(totalDays, Math.round((today.getTime() - ciclo.startDate.getTime()) / 86400000) + 1));
 const progress = cicloOffset === 0 ? Math.round((elapsedDays / totalDays) * 100) : (cicloOffset < 0 ? 100 : 0);
 return { recebido, total, desp, despPessoal, lucro, comissao, totalDays, elapsedDays, progress, qtd: cicloAgs.length, items: cicloAgs };
 }, [agendamentos, ciclo, despesas, comissaoPct, cicloOffset]);

 // Detalhamento da comissão por dia (apenas dias com valor recebido)
 const comissaoBreakdown = useMemo(() => {
 const byDay: Record<string, { date: string; recebido: number; qtd: number }> = {};
 cicloStats.items.forEach((a) => {
 const pago = Number(a.valor_pago || 0);
 if (pago <= 0) return;
 if (!byDay[a.data_agendamento]) {
 byDay[a.data_agendamento] = { date: a.data_agendamento, recebido: 0, qtd: 0 };
 }
 byDay[a.data_agendamento].recebido += pago;
 byDay[a.data_agendamento].qtd += 1;
 });
 return Object.values(byDay).sort((a, b) => b.date.localeCompare(a.date));
 }, [cicloStats.items]);

 const fmtShort = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

 return (
 <div className="space-y-5">
 {/* ═══════════ HERO: CICLO ATUAL ═══════════ */}
 <div className="relative overflow-hidden rounded-3xl border border-gold/25 bg-gradient-to-br from-gold/[0.10] via-purple-500/[0.05] to-transparent">
 {/* Glows ambientes */}
 <div className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-gold/15 blur-3xl animate-[hero-glow_6s_ease-in-out_infinite]" />
 <div className="pointer-events-none absolute -bottom-28 -left-20 w-64 h-64 rounded-full bg-purple-500/15 blur-3xl animate-[hero-glow-alt_7s_ease-in-out_infinite]" />
 <div className="pointer-events-none absolute top-8 right-16 w-1 h-1 rounded-full bg-gold/60 animate-[float-particle_4s_ease-in-out_infinite]" />
 <div className="pointer-events-none absolute top-20 right-32 w-0.5 h-0.5 rounded-full bg-purple-300/60 animate-[float-particle-delayed_5s_ease-in-out_infinite]" />

 <div className="relative p-5 space-y-4">
 {/* Header com navegação */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="w-9 h-9 rounded-2xl bg-gold/15 border border-gold/25 flex items-center justify-center shadow-[0_0_16px_-4px_hsl(40_60%_60%/0.4)]">
 <Wallet className="w-4 h-4 text-gold" />
 </span>
 <div>
 <p className="font-body text-[9px] text-gold/70 uppercase tracking-[0.25em] font-semibold flex items-center gap-1">
 <Sparkles className="w-2.5 h-2.5 animate-pulse" />
 {cicloOffset === 0 ? "Ciclo atual" : cicloOffset < 0 ? `${Math.abs(cicloOffset)} ciclo(s) atrás` : `+${cicloOffset} ciclo(s)`}
 </p>
 <p className="font-heading text-[15px] font-bold text-primary-foreground tabular-nums tracking-tight">
 {fmtShort(ciclo.startDate)} → {fmtShort(ciclo.endDate)}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-1">
 <button onClick={() => setCicloOffset((o) => o - 1)} className="w-8 h-8 rounded-xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.06] hover:bg-gold/10 hover:border-gold/20 hover:text-gold flex items-center justify-center text-primary-foreground/85 transition-all" aria-label="Ciclo anterior">
 <ChevronLeft className="w-4 h-4" />
 </button>
 <button onClick={() => setCicloOffset((o) => o + 1)} className="w-8 h-8 rounded-xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.06] hover:bg-gold/10 hover:border-gold/20 hover:text-gold flex items-center justify-center text-primary-foreground/85 transition-all" aria-label="Próximo ciclo">
 <ChevronRight className="w-4 h-4" />
 </button>
 {cicloOffset !== 0 && (
 <button onClick={() => setCicloOffset(0)} className="px-2.5 py-1.5 rounded-xl bg-gold/15 text-gold font-body text-[10px] font-bold uppercase tracking-wider hover:bg-gold/25 transition-all border border-gold/20">
 Hoje
 </button>
 )}
 <button onClick={() => { setShowCorteConfig(!showCorteConfig); setTempCorte(diaCorte.toString()); }} className="w-8 h-8 rounded-xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.06] hover:bg-gold/10 hover:border-gold/20 hover:text-gold flex items-center justify-center text-primary-foreground/75 transition-all" aria-label="Configurar dia de corte">
 <Settings className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>

 {/* Número-herói: LUCRO */}
 <div className="text-center py-2">
 <p className="font-body text-[10px] text-primary-foreground/75 uppercase tracking-[0.3em] mb-1 flex items-center justify-center gap-1.5">
 <span className={`w-1.5 h-1.5 rounded-full ${cicloStats.lucro >= 0 ? "bg-green-400 animate-pulse" : "bg-red-400 animate-pulse"}`} />
 Lucro do ciclo
 </p>
 <p className={`font-heading text-4xl sm:text-5xl font-bold tabular-nums tracking-tight ${cicloStats.lucro >= 0 ? "text-green-400 drop-shadow-[0_0_18px_hsl(142_70%_55%/0.45)]" : "text-red-400 drop-shadow-[0_0_18px_hsl(0_70%_55%/0.4)]"}`}>
 {formatCurrency(cicloStats.lucro)}
 </p>
 <button
 type="button"
 onClick={() => setShowComissaoDetail(true)}
 className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-400/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
 aria-label="Ver detalhes do cálculo da comissão"
 >
 <Sparkles className="w-3 h-3 text-purple-300 group-hover:animate-pulse" />
 <span className="font-body text-[10px] text-purple-300/80 uppercase tracking-wider font-medium">
 Comissão {comissaoPct}%
 </span>
 <span className="font-heading text-[12px] font-bold text-purple-200 tabular-nums">
 {formatCurrency(cicloStats.comissao)}
 </span>
 <Info className="w-3 h-3 text-purple-300/60 group-hover:text-purple-200 transition-colors" />
 </button>
 </div>

 {/* Barra de progresso */}
 <div>
 <div className="flex items-center justify-between mb-1.5 px-0.5">
 <span className="font-body text-[10px] text-primary-foreground/75 uppercase tracking-[0.2em] flex items-center gap-1 font-medium">
 <Clock className="w-3 h-3 text-gold/60" />
 {cicloOffset === 0 ? `Dia ${cicloStats.elapsedDays}` : "Fechado"}
 <span className="text-primary-foreground/85">/ {cicloStats.totalDays}</span>
 </span>
 <span className="font-heading text-[11px] font-bold text-gold tabular-nums tracking-tight">
 {cicloStats.progress}%
 </span>
 </div>
 <div className="relative h-2.5 rounded-full bg-primary-foreground/[0.06] overflow-hidden border border-primary-foreground/[0.04]">
 <div
 className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold via-gold/90 to-purple-400 transition-all duration-1000 ease-out shadow-[0_0_14px_hsl(40_60%_60%/0.6)]"
 style={{ width: `${cicloStats.progress}%` }}
 >
 <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent" style={{ animation: "shimmer 2.5s ease-in-out infinite" }} />
 </div>
 {cicloOffset === 0 && cicloStats.progress > 2 && cicloStats.progress < 98 && (
 <div
 className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-gold border-2 border-background shadow-[0_0_12px_hsl(40_70%_60%/0.9)] animate-pulse"
 style={{ left: `calc(${cicloStats.progress}% - 7px)` }}
 />
 )}
 </div>
 <div className="flex items-center justify-between mt-1.5 px-0.5">
 <span className="font-body text-[9px] text-primary-foreground/75 tabular-nums">
 {fmtShort(ciclo.startDate)}
 </span>
 {cicloOffset === 0 ? (
 <span className="font-body text-[9px] text-purple-300/80 tabular-nums flex items-center gap-1 font-medium">
 <span className="w-1 h-1 rounded-full bg-purple-400 animate-pulse" />
 {Math.max(0, cicloStats.totalDays - cicloStats.elapsedDays)} {cicloStats.totalDays - cicloStats.elapsedDays === 1 ? "dia restante" : "dias restantes"}
 </span>
 ) : (
 <span className="font-body text-[9px] text-primary-foreground/75">
 corte dia {diaCorte}
 </span>
 )}
 <span className="font-body text-[9px] text-primary-foreground/75 tabular-nums">
 {fmtShort(ciclo.endDate)}
 </span>
 </div>
 </div>

 {/* Cards de métricas */}
 <div className="grid grid-cols-3 gap-2">
 <div className="p-3 rounded-2xl bg-green-500/[0.06] border border-green-500/15 hover:border-green-500/25 transition-all">
 <p className="font-body text-[9px] text-primary-foreground/75 uppercase tracking-widest font-medium">Recebido</p>
 <p className="font-heading text-[15px] font-bold text-green-400 tabular-nums mt-1 leading-tight">{formatCurrency(cicloStats.recebido)}</p>
 <p className="font-body text-[9px] text-primary-foreground/95 mt-0.5">{cicloStats.qtd} atend.</p>
 </div>
 <div className="p-3 rounded-2xl bg-gold/[0.06] border border-gold/15 hover:border-gold/25 transition-all">
 <p className="font-body text-[9px] text-primary-foreground/75 uppercase tracking-widest font-medium">Previsto</p>
 <p className="font-heading text-[15px] font-bold text-gold tabular-nums mt-1 leading-tight">{formatCurrency(cicloStats.total)}</p>
 <p className="font-body text-[9px] text-primary-foreground/95 mt-0.5">total bruto</p>
 </div>
 <div className="p-3 rounded-2xl bg-red-500/[0.05] border border-red-500/15 hover:border-red-500/25 transition-all">
 <p className="font-body text-[9px] text-primary-foreground/75 uppercase tracking-widest font-medium">Despesas Estúdio</p>
 <p className="font-heading text-[15px] font-bold text-red-400 tabular-nums mt-1 leading-tight">- {formatCurrency(cicloStats.desp)}</p>
 <p className="font-body text-[9px] text-primary-foreground/95 mt-0.5">no período</p>
 {cicloStats.despPessoal > 0 && (
 <p className="font-body text-[8px] text-purple-400/70 mt-0.5">Pessoal: {formatCurrency(cicloStats.despPessoal)}</p>
 )}
 </div>
 </div>

 {/* Config dia de corte */}
 {showCorteConfig && (
 <div className="pt-3 border-t border-primary-foreground/[0.08] space-y-2 animate-fade-in">
 <label className="font-body text-[10px] text-primary-foreground/85 uppercase tracking-wider">Dia que fecha o mês (1 a 28)</label>
 <div className="flex gap-2">
 <input type="number" min="1" max="28" value={tempCorte} onChange={(e) => setTempCorte(e.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-gold/20 text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/30 tabular-nums" />
 <button onClick={() => {
 const val = Math.min(28, Math.max(1, Number(tempCorte) || 1));
 setDiaCorte(val);
 localStorage.setItem("dyoli_dia_corte", val.toString());
 setCicloOffset(0);
 setShowCorteConfig(false);
 }} className="px-4 py-2 rounded-xl bg-gold/10 text-gold font-body text-[12px] font-medium hover:bg-gold/20 transition-all">
 Salvar
 </button>
 </div>
 <div className="flex gap-1.5 flex-wrap">
 {[1, 5, 10, 15, 20, 25].map((d) => (
 <button key={d} onClick={() => setTempCorte(d.toString())} className={`px-2.5 py-1 rounded-full font-body text-[10px] border transition-all tabular-nums ${Number(tempCorte) === d ? "bg-gold/15 text-gold border-gold/30" : "bg-primary-foreground/[0.03] text-primary-foreground/75 border-primary-foreground/[0.06] hover:border-gold/20"}`}>
 dia {d}
 </button>
 ))}
 </div>
 <p className="font-body text-[10px] text-primary-foreground/95 leading-relaxed">
 O ciclo do "Mês" começa neste dia e termina um dia antes do próximo corte. Ao virar, as finanças do período zeram automaticamente e um novo ciclo começa.
 </p>
 </div>
 )}
 </div>
 </div>

 {/* ═══════════ FECHAMENTO DE CAIXA (DIA) ═══════════ */}
 <div className="relative overflow-hidden rounded-3xl border border-primary-foreground/[0.08] bg-gradient-to-br from-primary-foreground/[0.03] to-transparent">
 <div className="relative p-5 flex items-center gap-3">
 <span className="w-9 h-9 rounded-2xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.08] flex items-center justify-center">
 <Wallet className="w-4 h-4 text-primary-foreground/95" />
 </span>
 <div>
 <span className="block font-heading text-[15px] font-semibold text-primary-foreground tracking-tight">Fechamento de Caixa</span>
 <span className="block font-body text-[10px] text-primary-foreground/75 uppercase tracking-[0.2em] mt-0.5">Resumo do dia</span>
 </div>
 </div>

 <div className="relative px-5 pb-5 space-y-5 animate-fade-in">
 {/* Navegador de dia */}
 <div className="space-y-2">
 <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
 <button onClick={() => { const d = new Date(caixaDate + "T12:00:00"); d.setDate(d.getDate() - 1); setCaixaDate(d.toISOString().split("T")[0]); }} className="w-9 h-9 rounded-xl hover:bg-primary-foreground/[0.05] flex items-center justify-center text-primary-foreground/85 hover:text-primary-foreground transition-all" aria-label="Dia anterior">
 <ChevronLeft className="w-4 h-4" />
 </button>
 <Popover>
 <PopoverTrigger asChild>
 <button
 type="button"
 aria-label="Abrir calendário para selecionar dia"
 className="flex-1 text-center cursor-pointer group rounded-xl py-1.5 hover:bg-primary-foreground/[0.04] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
 >
 <span className="inline-flex items-center gap-2">
 <Calendar className="w-3.5 h-3.5 text-gold/70 group-hover:text-gold transition-colors" />
 <span className="font-heading text-[15px] font-semibold text-primary-foreground capitalize group-hover:text-gold transition-colors">
 {new Date(caixaDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
 </span>
 </span>
 </button>
 </PopoverTrigger>
 <PopoverContent
 align="center"
 className="w-auto p-0 bg-background border border-gold/20 shadow-[0_20px_60px_-15px_hsl(40_40%_55%/0.35)] rounded-2xl overflow-hidden"
 >
 <CalendarPicker
 mode="single"
 locale={ptBR}
 selected={new Date(caixaDate + "T12:00:00")}
 onSelect={(d) => {
 if (!d) return;
 const y = d.getFullYear();
 const m = String(d.getMonth() + 1).padStart(2, "0");
 const day = String(d.getDate()).padStart(2, "0");
 setCaixaDate(`${y}-${m}-${day}`);
 }}
 initialFocus
 className="bg-background"
 />
 </PopoverContent>
 </Popover>
 <button onClick={() => { const d = new Date(caixaDate + "T12:00:00"); d.setDate(d.getDate() + 1); setCaixaDate(d.toISOString().split("T")[0]); }} className="w-9 h-9 rounded-xl hover:bg-primary-foreground/[0.05] flex items-center justify-center text-primary-foreground/85 hover:text-primary-foreground transition-all" aria-label="Próximo dia">
 <ChevronRight className="w-4 h-4" />
 </button>
 </div>

 <div className="flex gap-1.5 justify-center">
 {([{ label: "Ontem", offset: -1 }, { label: "Hoje", offset: 0 }, { label: "Amanhã", offset: 1 }]).map(({ label, offset }) => {
 const d = new Date(); d.setDate(d.getDate() + offset);
 const dateStr = d.toISOString().split("T")[0];
 const active = caixaDate === dateStr;
 return (
 <button key={label} onClick={() => setCaixaDate(dateStr)} className={`px-3 py-1 rounded-full font-body text-[10px] font-medium border transition-all ${active ? "bg-gold/10 text-gold border-gold/30" : "bg-primary-foreground/[0.02] text-primary-foreground/75 border-primary-foreground/[0.06] hover:border-gold/20 hover:text-primary-foreground/100"}`}>
 {label}
 </button>
 );
 })}
 </div>
 </div>

 {/* Hero number — recebido do dia */}
 <div className="text-center py-4">
 <p className="font-body text-[10px] text-primary-foreground/75 uppercase tracking-[0.3em] mb-2">Recebido hoje</p>
 <p className="font-heading text-5xl font-bold bg-gradient-to-br from-gold via-gold to-gold/60 bg-clip-text text-transparent leading-none">
 {formatCurrency(caixaData.recebido)}
 </p>
 <p className="font-body text-[11px] text-primary-foreground/95 mt-2">
 de <span className="text-primary-foreground/95 font-medium">{formatCurrency(caixaData.total)}</span> previstos
 </p>
 <div className="mt-4 max-w-[240px] mx-auto">
 <div className="h-1 rounded-full bg-primary-foreground/[0.06] overflow-hidden">
 <div className="h-full rounded-full bg-gradient-to-r from-gold/80 to-green-500/80 transition-all duration-700" style={{ width: `${caixaData.total > 0 ? Math.min(100, (caixaData.recebido / caixaData.total) * 100) : 0}%` }} />
 </div>
 <p className="font-body text-[9px] text-primary-foreground/95 uppercase tracking-[0.2em] mt-2">
 {caixaData.total > 0 ? Math.round((caixaData.recebido / caixaData.total) * 100) : 0}% do dia recebido
 </p>
 </div>
 </div>

 {/* Ticker */}
 <div className="grid grid-cols-3 rounded-2xl bg-primary-foreground/[0.02] border border-primary-foreground/[0.06] divide-x divide-primary-foreground/[0.06]">
 <div className="text-center py-3 px-2">
 <p className="font-heading text-xl font-bold text-primary-foreground">{caixaData.qtd}</p>
 <p className="font-body text-[9px] text-primary-foreground/95 uppercase tracking-widest mt-0.5">Atend.</p>
 </div>
 <div className="text-center py-3 px-2">
 <p className="font-heading text-xl font-bold text-rose">{formatCurrency(caixaData.pendente)}</p>
 <p className="font-body text-[9px] text-primary-foreground/95 uppercase tracking-widest mt-0.5">Pendente</p>
 </div>
 <div className="text-center py-3 px-2">
 <p className="font-heading text-xl font-bold text-orange-500">{caixaData.faltas}</p>
 <p className="font-body text-[9px] text-primary-foreground/95 uppercase tracking-widest mt-0.5">Faltas</p>
 </div>
 </div>

 {/* Comissão do dia */}
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

 {/* Atendimentos do dia */}
 {caixaData.items.length > 0 ? (
 <div>
 <p className="font-body text-[9px] text-primary-foreground/95 uppercase tracking-[0.25em] mb-3 px-1">Atendimentos do dia</p>
 <div className="space-y-1.5">
 {[...caixaData.items].sort((a, b) => a.horario.localeCompare(b.horario)).map((a) => {
 const pago = Number(a.valor_pago || 0) >= Number(a.valor);
 const parcial = Number(a.valor_pago || 0) > 0 && !pago;
 return (
 <div key={a.id} className="group relative flex items-center gap-3 p-3 rounded-2xl bg-primary-foreground/[0.02] border border-primary-foreground/[0.04] hover:border-gold/20 transition-all">
 <div className="flex flex-col items-center w-12 shrink-0">
 <span className="font-heading text-[13px] font-bold text-primary-foreground tabular-nums leading-none">{a.horario.slice(0, 5)}</span>
 <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${pago ? "bg-green-500" : parcial ? "bg-gold" : "bg-primary-foreground/20"}`} />
 </div>
 <div className="w-px h-10 bg-primary-foreground/[0.06]" />
 <div className="min-w-0 flex-1">
 <p className="font-body text-[12.5px] font-medium text-primary-foreground truncate">{getClientName(a.user_id, a.cliente_nome)}</p>
 <p className="font-body text-[10.5px] text-primary-foreground/75 truncate">{a.servico}</p>
 </div>
 <div className="text-right shrink-0">
 <p className="font-heading text-[13px] font-bold text-gold tabular-nums">{formatCurrency(Number(a.valor))}</p>
 {pago ? (
 <p className="font-body text-[9px] text-green-500 flex items-center justify-end gap-0.5 mt-0.5">
 <CheckCircle2 className="w-2.5 h-2.5" /> Pago
 </p>
 ) : parcial ? (
 <p className="font-body text-[9px] text-gold/80 mt-0.5">Sinal {formatCurrency(Number(a.valor_pago))}</p>
 ) : (
 <p className="font-body text-[9px] text-primary-foreground/95 flex items-center justify-end gap-0.5 mt-0.5">
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
 <p className="font-body text-[12px] text-primary-foreground/95">Nenhum atendimento neste dia</p>
 </div>
 )}
 </div>
 </div>

 {/* Filtro de período para a lista de pagamentos */}
 <div role="tablist" aria-label="Filtrar período dos pagamentos" className="flex gap-2 overflow-x-auto pb-1">
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
 }
 }}
 className={`relative px-4 py-2 rounded-full font-body text-[12px] font-semibold whitespace-nowrap border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
 active
 ? "bg-gradient-to-br from-gold/30 to-gold/10 text-gold border-gold/50 shadow-[0_0_18px_-4px_hsl(40_40%_55%/0.5)]"
 : "bg-primary-foreground/[0.04] text-primary-foreground/55 border-primary-foreground/[0.1] hover:border-gold/25 hover:text-primary-foreground hover:bg-primary-foreground/[0.06]"
 }`}
 >
 {f.label}
 </button>
 );
 });
 })()}
 </div>

 {period === "personalizado" && (
 <div className="flex gap-2 animate-fade-in">
 <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
 className="flex-1 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[12px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
 <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
 className="flex-1 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[12px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
 </div>
 )}

 {/* Lista de pagamentos */}
 <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-primary-foreground/[0.05] via-primary-foreground/[0.02] to-transparent border border-primary-foreground/[0.1]">
 <div className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full bg-gold/5 blur-3xl" />
 <div className="relative flex items-center justify-between mb-3">
 <p className="font-body text-[12px] font-medium text-primary-foreground/65 uppercase tracking-[0.2em]">Todos os pagamentos</p>
 {filtered.length > 0 && (
 <span className="font-body text-[10px] font-medium text-primary-foreground/75 tabular-nums px-2 py-0.5 rounded-full bg-primary-foreground/[0.05] border border-primary-foreground/[0.08]">
 {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
 </span>
 )}
 </div>
 <div
 className="relative space-y-1.5 max-h-[420px] overflow-y-auto pr-1.5 -mr-1.5 scrollbar-thin"
 style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--primary-foreground) / 0.15) transparent" }}
 >
 {filtered.map((a) => (
 <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06] hover:border-gold/20 transition-all">
 <div className="min-w-0 flex-1">
 <p className="font-body text-[14px] font-semibold text-primary-foreground truncate">{getClientName(a.user_id, a.cliente_nome)}</p>
 <p className="font-body text-[11px] text-primary-foreground/75">{formatDateShort(a.data_agendamento)} · {a.servico}</p>
 </div>
 <div className="text-right ml-2">
 <p className="font-heading text-[14px] text-gold font-bold tabular-nums">{formatCurrency(Number(a.valor))}</p>
 <p className={`font-body text-[11px] font-medium ${Number(a.valor_pago || 0) >= Number(a.valor) ? "text-green-400" : Number(a.valor_pago || 0) > 0 ? "text-gold" : "text-primary-foreground/75"}`}>
 {Number(a.valor_pago || 0) >= Number(a.valor) ? "Pago" : Number(a.valor_pago || 0) > 0 ? `Sinal: ${formatCurrency(Number(a.valor_pago))}` : "Pendente"}
 </p>
 </div>
 </div>
 ))}
 {filtered.length === 0 && <p className="font-body text-[13px] text-primary-foreground/95 text-center py-6">Nenhum registro no período</p>}
 </div>
 </div>

 {/* ═══════════ MODAL: DETALHE DA COMISSÃO ═══════════ */}
 <Dialog open={showComissaoDetail} onOpenChange={setShowComissaoDetail}>
 <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col border-purple-500/20 p-0 [&>button]:text-primary-foreground/95 [&>button]:hover:text-primary-foreground">
 <div className="relative overflow-hidden">
 <div className="pointer-events-none absolute -top-16 -right-12 w-48 h-48 rounded-full bg-purple-500/15 blur-3xl" />
 <div className="pointer-events-none absolute -bottom-16 -left-12 w-40 h-40 rounded-full bg-gold/10 blur-3xl" />
 <DialogHeader className="relative px-5 pt-5 pb-3 border-b border-primary-foreground/[0.06]">
 <div className="flex items-center gap-3">
 <span className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center shadow-[0_0_18px_-4px_hsl(280_70%_60%/0.5)]">
 <Calculator className="w-4 h-4 text-purple-300" />
 </span>
 <div>
 <DialogTitle className="font-heading text-[16px] font-bold text-primary-foreground tracking-tight">
 Cálculo da Comissão
 </DialogTitle>
 <p className="font-body text-[10px] text-purple-300/70 uppercase tracking-[0.2em] mt-0.5">
 {fmtShort(ciclo.startDate)} → {fmtShort(ciclo.endDate)}
 </p>
 </div>
 </div>
 </DialogHeader>
 </div>

 <div className="overflow-y-auto px-5 py-4 space-y-4">
 {/* Resumo principal */}
 <div className="rounded-2xl bg-gradient-to-br from-purple-500/[0.10] to-purple-500/[0.02] border border-purple-500/20 p-4 text-center">
 <p className="font-body text-[10px] text-purple-300/70 uppercase tracking-[0.25em] mb-1">Comissão do ciclo</p>
 <p className="font-heading text-3xl font-bold text-purple-200 tabular-nums tracking-tight drop-shadow-[0_0_18px_hsl(280_70%_60%/0.4)]">
 {formatCurrency(cicloStats.comissao)}
 </p>
 <p className="font-body text-[11px] text-primary-foreground/75 mt-2 tabular-nums">
 {formatCurrency(cicloStats.recebido)} × <span className="text-purple-300 font-bold">{comissaoPct}%</span>
 </p>
 </div>

 {/* Regras */}
 <div>
 <p className="font-body text-[10px] text-primary-foreground/75 uppercase tracking-[0.2em] font-medium mb-2 flex items-center gap-1.5">
 <Info className="w-3 h-3 text-gold/70" /> Como é calculado
 </p>
 <div className="space-y-2">
 <div className="flex items-start gap-2 p-3 rounded-xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
 <span className="font-heading text-[11px] font-bold text-gold w-5 h-5 rounded-full bg-gold/15 flex items-center justify-center shrink-0 mt-0.5">1</span>
 <p className="font-body text-[12px] text-primary-foreground/100 leading-relaxed">
 A comissão é <span className="text-purple-300 font-semibold">{comissaoPct}%</span> sobre o <span className="text-green-400 font-semibold">valor recebido</span> (apenas pagamentos confirmados, não o previsto).
 </p>
 </div>
 <div className="flex items-start gap-2 p-3 rounded-xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
 <span className="font-heading text-[11px] font-bold text-gold w-5 h-5 rounded-full bg-gold/15 flex items-center justify-center shrink-0 mt-0.5">2</span>
 <p className="font-body text-[12px] text-primary-foreground/100 leading-relaxed">
 O ciclo vai do <span className="text-gold font-semibold">dia {diaCorte}</span> até um dia antes do próximo corte. Cancelamentos e faltas <span className="text-red-400 font-semibold">não entram</span>.
 </p>
 </div>
 <div className="flex items-start gap-2 p-3 rounded-xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
 <span className="font-heading text-[11px] font-bold text-gold w-5 h-5 rounded-full bg-gold/15 flex items-center justify-center shrink-0 mt-0.5">3</span>
 <p className="font-body text-[12px] text-primary-foreground/100 leading-relaxed">
 Sinais e pagamentos parciais contam pelo valor efetivamente pago. Despesas <span className="text-primary-foreground/80 font-semibold">não afetam</span> a comissão (apenas o lucro).
 </p>
 </div>
 </div>
 </div>

 {/* Métricas do cálculo */}
 <div className="grid grid-cols-3 gap-2">
 <div className="p-2.5 rounded-xl bg-green-500/[0.06] border border-green-500/15">
 <p className="font-body text-[8.5px] text-primary-foreground/75 uppercase tracking-wider">Base</p>
 <p className="font-heading text-[13px] font-bold text-green-400 tabular-nums leading-tight mt-0.5">{formatCurrency(cicloStats.recebido)}</p>
 </div>
 <div className="p-2.5 rounded-xl bg-purple-500/[0.06] border border-purple-500/15 relative">
 <p className="font-body text-[8.5px] text-primary-foreground/75 uppercase tracking-wider">Taxa</p>
 {editingComissao ? (
 <div className="flex items-center gap-1 mt-0.5">
 <input
 type="number"
 min={0}
 max={100}
 step={1}
 value={tempComissao}
 onChange={(e) => setTempComissao(e.target.value)}
 onKeyDown={(e) => { if (e.key === "Enter") saveComissao(); if (e.key === "Escape") setEditingComissao(false); }}
 autoFocus
 className="w-12 bg-purple-500/10 border border-purple-400/30 rounded px-1 py-0.5 font-heading text-[13px] font-bold text-purple-200 tabular-nums focus:outline-none focus:border-purple-400"
 />
 <button type="button" onClick={saveComissao} className="w-5 h-5 rounded bg-green-500/20 hover:bg-green-500/40 flex items-center justify-center" aria-label="Salvar">
 <Check className="w-3 h-3 text-green-300" />
 </button>
 <button type="button" onClick={() => { setEditingComissao(false); setTempComissao(comissaoPct.toString()); }} className="w-5 h-5 rounded bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center" aria-label="Cancelar">
 <X className="w-3 h-3 text-red-300" />
 </button>
 </div>
 ) : (
 <button
 type="button"
 onClick={() => { setTempComissao(comissaoPct.toString()); setEditingComissao(true); }}
 className="mt-0.5 flex items-center gap-1.5 group"
 aria-label="Alterar % de comissão"
 >
 <span className="font-heading text-[13px] font-bold text-purple-300 tabular-nums leading-tight">{comissaoPct}%</span>
 <Pencil className="w-3 h-3 text-purple-300/50 group-hover:text-purple-200 transition-colors" />
 </button>
 )}
 </div>
 <div className="p-2.5 rounded-xl bg-gold/[0.06] border border-gold/15">
 <p className="font-body text-[8.5px] text-primary-foreground/75 uppercase tracking-wider">Dias</p>
 <p className="font-heading text-[13px] font-bold text-gold tabular-nums leading-tight mt-0.5">{comissaoBreakdown.length}</p>
 </div>
 </div>

 {/* Detalhamento por dia */}
 <div>
 <div className="flex items-center justify-between mb-2">
 <p className="font-body text-[10px] text-primary-foreground/75 uppercase tracking-[0.2em] font-medium flex items-center gap-1.5">
 <TrendingUp className="w-3 h-3 text-gold/70" /> Dias que entraram
 </p>
 <span className="font-body text-[10px] text-primary-foreground/95 tabular-nums">{cicloStats.qtd} atend.</span>
 </div>
 {comissaoBreakdown.length === 0 ? (
 <div className="p-6 rounded-xl bg-primary-foreground/[0.02] border border-primary-foreground/[0.06] text-center">
 <p className="font-body text-[12px] text-primary-foreground/95">Nenhum pagamento recebido neste ciclo ainda.</p>
 </div>
 ) : (
 <div className="space-y-1.5">
 {comissaoBreakdown.map((d) => {
 const dayComm = d.recebido * (comissaoPct / 100);
 return (
 <div key={d.date} className="flex items-center justify-between p-2.5 rounded-xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.05] hover:border-purple-500/20 transition-all">
 <div className="flex items-center gap-2 min-w-0">
 <span className="w-7 h-7 rounded-lg bg-gold/10 border border-gold/15 flex items-center justify-center shrink-0">
 <Calendar className="w-3 h-3 text-gold/70" />
 </span>
 <div className="min-w-0">
 <p className="font-heading text-[12px] font-semibold text-primary-foreground capitalize tabular-nums leading-tight">
 {new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
 </p>
 <p className="font-body text-[10px] text-primary-foreground/75 mt-0.5">
 {d.qtd} {d.qtd === 1 ? "atend." : "atend."} · <span className="text-green-400/80 tabular-nums">{formatCurrency(d.recebido)}</span>
 </p>
 </div>
 </div>
 <div className="text-right shrink-0">
 <p className="font-body text-[8.5px] text-purple-300/60 uppercase tracking-wider">Comissão</p>
 <p className="font-heading text-[13px] font-bold text-purple-300 tabular-nums leading-tight">
 {formatCurrency(dayComm)}
 </p>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>

 {/* Total final */}
 <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-purple-500/15 to-purple-500/5 border border-purple-500/30">
 <span className="font-body text-[11px] text-purple-200/80 uppercase tracking-widest font-bold flex items-center gap-1.5">
 <Sparkles className="w-3.5 h-3.5 text-purple-300" /> Total
 </span>
 <span className="font-heading text-[18px] font-bold text-purple-200 tabular-nums">
 {formatCurrency(cicloStats.comissao)}
 </span>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
};

export default CaixaTab;
