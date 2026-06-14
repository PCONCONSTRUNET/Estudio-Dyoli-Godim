import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Save, X, Check, AlertTriangle, Clock, Bell, ChevronRight, ChevronDown, Eye, Receipt, TrendingDown, TrendingUp, Sparkles, CalendarDays, Wallet, Repeat, Search, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import PlusButton from "@/components/ui/plus-button";
import BinButton from "@/components/ui/bin-button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useConfirm } from "@/contexts/ConfirmContext";

interface Despesa {
 id: string;
 descricao: string;
 valor: number;
 data_vencimento: string;
 pago: boolean;
 data_pagamento: string | null;
 categoria: string;
 tipo: "estudio" | "pessoal";
 observacao: string | null;
 created_at: string;
 fixa?: boolean;
 recorrencia_id?: string | null;
}


const CATEGORIAS = ["Aluguel", "Fornecedor", "Material", "Conta de Luz", "Conta de Água", "Internet", "Outros"];

const formatCurrency = (v: number) =>
 v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (d: string) =>
 new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const CATEGORIA_COLORS: Record<string, string> = {
  "Aluguel": "#f59e0b",
  "Fornecedor": "#3b82f6",
  "Material": "#ec4899",
  "Conta de Luz": "#eab308",
  "Conta de Água": "#06b6d4",
  "Internet": "#8b5cf6",
  "Outros": "#94a3b8",
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gold/20 bg-charcoal/95 backdrop-blur px-3 py-2 shadow-xl">
      <p className="font-body text-[11px] text-primary-foreground/60 mb-0.5">{label}</p>
      <p className="font-heading text-[14px] font-bold text-gold">
        {formatCurrency(payload[0]?.value ?? 0)}
      </p>
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-xl border border-primary-foreground/10 bg-charcoal/95 backdrop-blur px-3 py-2 shadow-xl">
      <p className="font-body text-[11px] text-primary-foreground/60 mb-0.5">{d.name}</p>
      <p className="font-heading text-[14px] font-bold" style={{ color: d.payload.fill }}>
        {formatCurrency(d.value)}
      </p>
      <p className="font-body text-[10px] text-primary-foreground/70">{d.payload.pct}%</p>
    </div>
  );
};

const DespesasTab = () => {
 const { confirm } = useConfirm();
 const [despesas, setDespesas] = useState<Despesa[]>([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [filter, setFilter] = useState<"todas" | "pendentes" | "pagas" | "atrasadas">("pendentes");
 const [tipoFilter, setTipoFilter] = useState<"todos" | "estudio" | "pessoal">("todos");
 const [searchTerm, setSearchTerm] = useState("");
 const [showValores, setShowValores] = useState(false);
 const [showCharts, setShowCharts] = useState(false);
 const [chartView, setChartView] = useState<"mensal" | "categoria">("mensal");

 const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
 const saved = localStorage.getItem("despesas_dismissed");
 return saved ? new Set(JSON.parse(saved)) : new Set();
 });

 // Form state
 const [descricao, setDescricao] = useState("");
 const [valor, setValor] = useState("");
 const [dataVencimento, setDataVencimento] = useState("");
 const [categoria, setCategoria] = useState("Outros");
 const [tipo, setTipo] = useState<"estudio" | "pessoal">("estudio");
 const [observacao, setObservacao] = useState("");

 const [fixa, setFixa] = useState(false);
 const [meses, setMeses] = useState("12");
 const [saving, setSaving] = useState(false);
 const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

 const toggleGroup = (id: string) =>
 setExpandedGroups((prev) => {
 const next = new Set(prev);
 next.has(id) ? next.delete(id) : next.add(id);
 return next;
 });

 useEffect(() => {
 loadDespesas();
 }, []);

 const loadDespesas = async () => {
 setLoading(true);
 const { data } = await (supabase.from as any)("despesas")
 .select("*")
 .neq("tipo", "comissao")
 .order("data_vencimento", { ascending: true });
 if (data) setDespesas(data as Despesa[]);
 setLoading(false);
 };

 const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];

 const getStatus = (d: Despesa): "pago" | "atrasado" | "hoje" | "pendente" => {
 if (d.pago) return "pago";
 if (d.data_vencimento < today) return "atrasado";
 if (d.data_vencimento === today) return "hoje";
 return "pendente";
 };

 const statusConfig = {
 atrasado: {
 bg: "bg-red-500/10 border-red-500/30",
 text: "text-red-400",
 badge: "bg-red-500/15 text-red-400 border-red-500/20",
 label: "Atrasado",
 icon: AlertTriangle,
 },
 hoje: {
 bg: "bg-yellow-500/10 border-yellow-500/30",
 text: "text-yellow-400",
 badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
 label: "Vence hoje",
 icon: Clock,
 },
 pendente: {
 bg: "bg-pink-400/10 border-pink-400/30",
 text: "text-pink-400",
 badge: "bg-pink-400/15 text-pink-400 border-pink-400/20",
 label: "A vencer",
 icon: Clock,
 },
 pago: {
 bg: "bg-green-500/10 border-green-500/30",
 text: "text-green-400",
 badge: "bg-green-500/15 text-green-400 border-green-500/20",
 label: "Pago",
 icon: Check,
 },
 };

 const filtered = useMemo(() => {
  return despesas.filter((d) => {
  if (searchTerm && !d.descricao.toLowerCase().includes(searchTerm.toLowerCase())) return false;
  if (tipoFilter !== "todos" && (d.tipo || "estudio") !== tipoFilter) return false;
  const s = getStatus(d);
  if (filter === "pendentes") return s === "pendente" || s === "hoje" || s === "atrasado";
  if (filter === "pagas") return s === "pago";
  if (filter === "atrasadas") return s === "atrasado";
  return true;
  });
 }, [despesas, filter, tipoFilter, today, searchTerm]);


 const alertCount = useMemo(() => {
 return despesas.filter((d) => {
 const s = getStatus(d);
 return s === "atrasado" || s === "hoje";
 }).length;
 }, [despesas, today]);

 // Notificações: atrasadas, hoje, e próximos 3 dias
 const notifications = useMemo(() => {
 const notifs: { tipo: "atrasado" | "hoje" | "proximo"; despesa: Despesa; dias: number }[] = [];
 const todayDate = new Date(today + "T12:00:00");

 despesas.forEach((d) => {
 if (d.pago) return;
 const venc = new Date(d.data_vencimento + "T12:00:00");
 const diffDays = Math.round((venc.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

 if (diffDays < 0) {
 notifs.push({ tipo: "atrasado", despesa: d, dias: Math.abs(diffDays) });
 } else if (diffDays === 0) {
 notifs.push({ tipo: "hoje", despesa: d, dias: 0 });
 } else if (diffDays <= 3) {
 notifs.push({ tipo: "proximo", despesa: d, dias: diffDays });
 }
 });

 notifs.sort((a, b) => {
 const order = { atrasado: 0, hoje: 1, proximo: 2 };
 return order[a.tipo] - order[b.tipo] || a.dias - b.dias;
 });

 return notifs;
 }, [despesas, today]);

 const activeNotifications = useMemo(
 () => notifications.filter((n) => !dismissedIds.has(n.despesa.id)),
 [notifications, dismissedIds]
 );

 const dismissNotification = (id: string) => {
 setDismissedIds((prev) => {
 const next = new Set(prev);
 next.add(id);
 localStorage.setItem("despesas_dismissed", JSON.stringify([...next]));
 return next;
 });
 toast.success("Marcada como lida");
 };

 const clearAllNotifications = () => {
 const ids = activeNotifications.map((n) => n.despesa.id);
 setDismissedIds((prev) => {
 const next = new Set([...prev, ...ids]);
 localStorage.setItem("despesas_dismissed", JSON.stringify([...next]));
 return next;
 });
 toast.success("Todas limpas");
 };

 const totalPendente = useMemo(
 () => despesas.filter((d) => !d.pago && (tipoFilter === "todos" || (d.tipo || "estudio") === tipoFilter)).reduce((s, d) => s + Number(d.valor), 0),
 [despesas, tipoFilter]
 );
 const totalPago = useMemo(
 () => despesas.filter((d) => d.pago && (tipoFilter === "todos" || (d.tipo || "estudio") === tipoFilter)).reduce((s, d) => s + Number(d.valor), 0),
 [despesas, tipoFilter]
 );

 const handleAdd = async () => {
 if (!descricao || !valor || !dataVencimento) {
 toast.error("Preencha todos os campos obrigatórios");
 return;
 }
 setSaving(true);

 // Monta lista de parcelas: 1 se não é fixa, N meses se é fixa
 const totalParcelas = fixa ? Math.max(1, Math.min(60, parseInt(meses) || 1)) : 1;
 const recorrenciaId = fixa ? (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`) : null;
 const [yy, mm, dd] = dataVencimento.split("-").map(Number);
 const rows = Array.from({ length: totalParcelas }, (_, i) => {
 // Avança i meses preservando o dia (clampa pro último dia do mês quando necessário)
 const base = new Date(yy, mm - 1 + i, 1);
 const ultimoDiaMes = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
 const dia = Math.min(dd, ultimoDiaMes);
 const venc = new Date(base.getFullYear(), base.getMonth(), dia);
 const vencStr = `${venc.getFullYear()}-${String(venc.getMonth() + 1).padStart(2, "0")}-${String(venc.getDate()).padStart(2, "0")}`;
 const descricaoFinal = fixa && totalParcelas > 1 ? `${descricao} (${i + 1}/${totalParcelas})` : descricao;
 return {
 descricao: descricaoFinal,
 valor: parseFloat(valor),
 data_vencimento: vencStr,
 categoria,
 tipo,
 observacao: observacao || null,
 fixa,
 recorrencia_id: recorrenciaId,
 };
 });


 const { error } = await (supabase.from as any)("despesas").insert(rows);
 if (error) {
 console.error("Erro despesas insert:", error);
 toast.error("Erro ao salvar despesa");
 } else {
 toast.success(fixa ? `${totalParcelas} despesas mensais criadas ✅` : "Despesa adicionada!");
 setShowForm(false);
 resetForm();
 loadDespesas();
 }
 setSaving(false);
 };

 const togglePago = async (d: Despesa) => {
 const newPago = !d.pago;
 await (supabase.from as any)("despesas")
 .update({
 pago: newPago,
 data_pagamento: newPago ? new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0] : null,
 })
 .eq("id", d.id);
 setDespesas((prev) =>
 prev.map((item) =>
 item.id === d.id
 ? { ...item, pago: newPago, data_pagamento: newPago ? today : null }
 : item
 )
 );
 toast.success(newPago ? "Marcado como pago ✅" : "Desmarcado");
 };

  const deleteDespesa = async (id: string) => {
    await (supabase.from as any)("despesas").delete().eq("id", id);
    setDespesas((prev) => prev.filter((d) => d.id !== id));
    toast.success("Despesa removida");
  };

  const deleteDespesaGroup = async (recorrenciaId: string) => {
    await (supabase.from as any)("despesas").delete().eq("recorrencia_id", recorrenciaId);
    setDespesas((prev) => prev.filter((d) => d.recorrencia_id !== recorrenciaId));
    toast.success("Grupo de despesas removido");
  };

 const resetForm = () => {
 setDescricao("");
 setValor("");
 setDataVencimento("");
 setCategoria("Outros");
 setTipo("estudio");

 setObservacao("");
 setFixa(false);
 setMeses("12");
 };

 const totalAtrasado = useMemo(
 () => despesas.filter((d) => !d.pago && d.data_vencimento < today && (tipoFilter === "todos" || (d.tipo || "estudio") === tipoFilter)).reduce((s, d) => s + Number(d.valor), 0),
 [despesas, today, tipoFilter]
 );
 const countAtrasadas = despesas.filter((d) => !d.pago && d.data_vencimento < today && (tipoFilter === "todos" || (d.tipo || "estudio") === tipoFilter)).length;
 const countPendentes = despesas.filter((d) => !d.pago && (tipoFilter === "todos" || (d.tipo || "estudio") === tipoFilter)).length;
 const countPagas = despesas.filter((d) => d.pago && (tipoFilter === "todos" || (d.tipo || "estudio") === tipoFilter)).length;

 if (loading) {
 return (
 <div className="flex items-center justify-center py-20">
 <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
 </div>
 );
 }

 return (
 <div className="space-y-5 animate-fade-in">
 {/* ── Editorial Hero ── */}
 <div className="relative overflow-hidden rounded-3xl border border-rose/20 bg-gradient-to-br from-rose/[0.08] via-gold/[0.04] to-transparent p-5">
 <div className="pointer-events-none absolute -top-24 -right-20 w-64 h-64 rounded-full bg-rose/15 blur-3xl animate-[hero-glow_6s_ease-in-out_infinite]" />
 <div className="pointer-events-none absolute -bottom-24 -left-16 w-56 h-56 rounded-full bg-gold/10 blur-3xl animate-[hero-glow-alt_7s_ease-in-out_infinite]" />

 <div className="relative">
 <div className="flex items-start justify-between gap-3 mb-5">
 <div>
 <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose/10 border border-rose/20 mb-2">
 <Sparkles className="w-2.5 h-2.5 text-rose animate-pulse" />
 <span className="font-body text-[9px] text-rose/80 uppercase tracking-[0.2em] font-medium">
 Controle financeiro
 </span>
 </div>
 <h2 className="font-heading text-xl font-semibold text-primary-foreground tracking-tight flex items-center gap-2">
 <Receipt className="w-5 h-5 text-rose" />
 Despesas
 </h2>
 <p className="font-body text-[12px] text-primary-foreground/75 mt-0.5">
 {countPendentes > 0
 ? `${countPendentes} pendente${countPendentes > 1 ? "s" : ""} • ${countPagas} paga${countPagas !== 1 ? "s" : ""}`
 : "Tudo em dia ✨"}
 </p>
 </div>

 <div className="flex items-center gap-2 shrink-0">
 {/* Notification Bell */}
 <Sheet>
 <SheetTrigger asChild>
 <button className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.08] transition-all hover:bg-primary-foreground/[0.1] hover:border-primary-foreground/[0.15]">
 <Bell className={`h-4 w-4 ${activeNotifications.length > 0 ? "text-yellow-400 animate-[wiggle_2s_ease-in-out_infinite]" : "text-primary-foreground/75"}`} />
 {activeNotifications.length > 0 && (
 <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white animate-pulse shadow-[0_0_8px_hsl(0_70%_55%/0.6)]">
 {activeNotifications.length}
 </span>
 )}
 </button>
 </SheetTrigger>
 <SheetContent side="right" className="w-[340px] sm:w-[400px] bg-charcoal border-primary-foreground/[0.06] p-0">
 <SheetHeader className="px-5 pt-5 pb-4 border-b border-primary-foreground/[0.06]">
 <SheetTitle className="font-heading text-[16px] font-semibold text-primary-foreground flex items-center gap-2">
 <Bell className="w-4 h-4 text-gold" />
 Notificações
 {activeNotifications.length > 0 && (
 <span className="ml-auto px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-body font-medium border border-red-500/20">
 {activeNotifications.length}
 </span>
 )}
 </SheetTitle>
 </SheetHeader>

 {activeNotifications.length > 0 && (
 <div className="px-4 pt-3 flex justify-end">
 <button
 onClick={clearAllNotifications}
 className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-body text-[10px] font-medium text-primary-foreground/95 transition-all hover:bg-primary-foreground/[0.06] hover:text-primary-foreground/85"
 >
 <X className="h-3 w-3" /> Limpar tudo
 </button>
 </div>
 )}

 <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 max-h-[calc(100vh-160px)]">
 {activeNotifications.length === 0 ? (
 <div className="py-16 text-center">
 <Check className="h-8 w-8 text-green-400/40 mx-auto mb-3" />
 <p className="font-body text-[13px] text-primary-foreground/95">Tudo em dia! 🎉</p>
 <p className="font-body text-[11px] text-primary-foreground/85 mt-1">Nenhuma notificação pendente</p>
 </div>
 ) : (
 activeNotifications.map((n) => {
 const notifConfig = {
 atrasado: {
 bg: "bg-red-500/10 border-red-500/25",
 icon: AlertTriangle,
 iconColor: "text-red-400",
 title: `Atrasado há ${n.dias} dia${n.dias > 1 ? "s" : ""}`,
 titleColor: "text-red-400",
 },
 hoje: {
 bg: "bg-yellow-500/10 border-yellow-500/25",
 icon: Clock,
 iconColor: "text-yellow-400",
 title: "Vence hoje!",
 titleColor: "text-yellow-400",
 },
 proximo: {
 bg: "bg-blue-500/10 border-blue-500/25",
 icon: Clock,
 iconColor: "text-blue-400",
 title: `Vence em ${n.dias} dia${n.dias > 1 ? "s" : ""}`,
 titleColor: "text-blue-400",
 },
 };
 const cfg = notifConfig[n.tipo];
 const Icon = cfg.icon;

 return (
 <div key={n.despesa.id} className={`rounded-xl border p-3 transition-all ${cfg.bg}`}>
 <div className="flex items-start gap-2.5">
 <div className={`mt-0.5 shrink-0 ${cfg.iconColor}`}>
 <Icon className="h-4 w-4" />
 </div>
 <div className="flex-1 min-w-0">
 <p className={`font-body text-[11px] font-semibold ${cfg.titleColor}`}>{cfg.title}</p>
 <p className="font-body text-[13px] font-medium text-primary-foreground truncate mt-0.5">
 {n.despesa.descricao}
 </p>
 <div className="flex items-center gap-2 mt-1">
 <span className="font-heading text-[13px] font-bold text-primary-foreground">
 {formatCurrency(Number(n.despesa.valor))}
 </span>
 <span className="font-body text-[10px] text-primary-foreground/95">
 {n.despesa.categoria}
 </span>
 </div>
 <p className="font-body text-[10px] text-primary-foreground/85 mt-1">
 Vencimento: {formatDate(n.despesa.data_vencimento)}
 </p>
 <div className="flex items-center gap-1.5 mt-2">
 <button
 onClick={() => dismissNotification(n.despesa.id)}
 className="flex items-center gap-1 rounded-lg px-2 py-1 bg-primary-foreground/[0.06] text-primary-foreground/75 text-[10px] font-body font-medium border border-primary-foreground/[0.08] hover:bg-primary-foreground/[0.1] hover:text-primary-foreground/95 transition-all"
 >
 <Eye className="h-3 w-3" /> Lida
 </button>
 <BinButton size="sm" onClick={() => confirm({ title: "Excluir Despesa", description: "Esta ação apagará permanentemente a despesa.", variant: "destructive", onConfirm: () => deleteDespesa(n.despesa.id) })} />

 </div>
 </div>
 </div>
 </div>
 );
 })
 )}
 </div>
 </SheetContent>
 </Sheet>

 <PlusButton size={32} title="Nova despesa" onClick={() => setShowForm(true)} />
 </div>
 </div>

 {/* Stats grid */}
 <div className="grid grid-cols-3 gap-2">
                            <div onClick={() => setShowValores(true)} className="group relative p-3 rounded-2xl bg-red-500/[0.06] border border-red-500/[0.15] hover:border-red-500/25 transition-all overflow-hidden cursor-pointer">
                                <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-red-500/10 blur-xl group-hover:bg-red-500/20 transition-all" />
                                <TrendingDown className="relative w-3.5 h-3.5 text-red-400/80 mb-1.5 group-hover:scale-110 transition-transform" />
                                <p className="relative font-body text-[15px] sm:text-[17px] font-bold text-red-400 tabular-nums leading-tight truncate tracking-tight">
                                    {formatCurrency(totalAtrasado)}
                                </p>
                                <p className="relative font-body text-[10px] font-medium text-primary-foreground/85 uppercase tracking-wider mt-1">
                                    {countAtrasadas} atrasada{countAtrasadas !== 1 ? "s" : ""}
                                </p>
                            </div>
                            <div onClick={() => setShowValores(true)} className="group relative p-3 rounded-2xl bg-orange-500/[0.05] border border-orange-500/[0.12] hover:border-orange-500/25 transition-all overflow-hidden cursor-pointer">
                                <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-orange-500/10 blur-xl group-hover:bg-orange-500/20 transition-all" />
                                <Wallet className="relative w-3.5 h-3.5 text-orange-400/80 mb-1.5 group-hover:scale-110 transition-transform" />
                                <p className="relative font-body text-[15px] sm:text-[17px] font-bold text-orange-400 tabular-nums leading-tight truncate tracking-tight">
                                    {formatCurrency(totalPendente)}
                                </p>
                                <p className="relative font-body text-[10px] font-medium text-primary-foreground/85 uppercase tracking-wider mt-1">
                                    Pendente
                                </p>
                            </div>
                            <div onClick={() => setShowValores(true)} className="group relative p-3 rounded-2xl bg-green-500/[0.05] border border-green-500/[0.12] hover:border-green-500/25 transition-all overflow-hidden cursor-pointer">
                                <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-green-500/10 blur-xl group-hover:bg-green-500/20 transition-all" />
                                <TrendingUp className="relative w-3.5 h-3.5 text-green-400/80 mb-1.5 group-hover:scale-110 transition-transform" />
                                <p className="relative font-body text-[15px] sm:text-[17px] font-bold text-green-400 tabular-nums leading-tight truncate tracking-tight">
                                    {formatCurrency(totalPago)}
                                </p>
                                <p className="relative font-body text-[10px] font-medium text-primary-foreground/85 uppercase tracking-wider mt-1">
                                    Pago
                                </p>
                            </div>

 </div>
 </div>
 </div>

 {/* Alert banner */}
 {activeNotifications.filter(n => n.tipo === "atrasado" || n.tipo === "hoje").length > 0 && (
 <div className="flex items-center gap-2.5 rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 via-orange-500/5 to-transparent px-4 py-3">
 <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-yellow-500/15 shrink-0">
 <AlertTriangle className="h-4 w-4 text-yellow-400" />
 </div>
 <p className="font-body text-[12px] text-yellow-300 flex-1">
 Você tem <strong className="text-yellow-200">{activeNotifications.filter(n => n.tipo === "atrasado" || n.tipo === "hoje").length}</strong> despesa(s) que precisa(m) de atenção
 </p>
 </div>
 )}

 {/* Search + Filtros Simplificados */}
 <div className="space-y-3">
   <div className="relative">
     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
     <input
       value={searchTerm}
       onChange={(e) => setSearchTerm(e.target.value)}
       placeholder="Buscar despesa..."
       className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white font-body text-[13px] placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-gold/20"
     />
     {searchTerm && (
       <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80">
         <X className="w-3.5 h-3.5" />
       </button>
     )}
   </div>
   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-primary-foreground/[0.02] p-1.5 rounded-2xl border border-primary-foreground/[0.06]">
     <div className="flex bg-primary-foreground/[0.04] rounded-xl p-1 gap-1 flex-1 sm:flex-none">
       <button 
         onClick={() => setFilter("pendentes")} 
         className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${filter === "pendentes" ? "bg-primary-foreground text-charcoal shadow-sm" : "text-primary-foreground/60 hover:text-primary-foreground"}`}
       >
         Pendentes
       </button>
       <button 
         onClick={() => setFilter("pagas")} 
         className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${filter === "pagas" ? "bg-primary-foreground text-charcoal shadow-sm" : "text-primary-foreground/60 hover:text-primary-foreground"}`}
       >
         Pagas
       </button>
     </div>
     
     <div className="flex items-center gap-2">
       <button
         onClick={() => setShowCharts(true)}
         className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gold/30 bg-gold/10 text-gold hover:bg-gold/20 text-[12px] font-semibold transition-all"
       >
         <BarChart3 className="w-3.5 h-3.5" />
         Gráficos
       </button>

       <div className="flex bg-primary-foreground/[0.04] rounded-xl p-1 gap-1 shrink-0">
         {(["todos", "estudio", "pessoal"] as const).map(tipo => (
           <button
             key={tipo}
             onClick={() => setTipoFilter(tipo)}
             className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 ${
               tipoFilter === tipo 
                 ? "bg-primary-foreground text-charcoal shadow-sm" 
                 : "text-primary-foreground/60 hover:text-primary-foreground"
             }`}
           >
             {tipo === "todos" && "Todas"}
             {tipo === "estudio" && "🏛"}
             {tipo === "pessoal" && "👤"}
           </button>
         ))}
       </div>
     </div>
   </div>
 </div>

 {/* Despesas list */}
 <div className="relative">
 {filtered.length === 0 ? (
 <div className="py-12 text-center rounded-xl border border-dashed border-primary-foreground/[0.08]">
 <p className="font-body text-[13px] text-primary-foreground/95">Nenhuma despesa encontrada</p>
 </div>
 ) : (
 <div className="space-y-2 max-h-[55dvh] overflow-y-auto custom-scrollbar pr-1 pb-24 lg:pb-4">
 {(() => {
 // Agrupa despesas fixas por recorrencia_id, mantém ordem da lista filtrada
 const seen = new Set<string>();
 const items: Array<
 | { type: "single"; despesa: Despesa }
 | { type: "group"; recorrenciaId: string; despesas: Despesa[] }
 > = [];

 filtered.forEach((d) => {
 if (d.fixa && d.recorrencia_id) {
 if (seen.has(d.recorrencia_id)) return;
 seen.add(d.recorrencia_id);
 // Pega apenas as parcelas que correspondem ao filtro atual
 const todas = despesas
 .filter((x) => x.recorrencia_id === d.recorrencia_id)
 .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));
 
 // Filtra as parcelas do grupo de acordo com o filtro ativo
 const parcelasDoFiltro = todas.filter((x) => {
 const s = getStatus(x);
 if (filter === "pagas") return s === "pago";
 if (filter === "pendentes") return s === "pendente" || s === "hoje" || s === "atrasado";
 if (filter === "atrasadas") return s === "atrasado";
 return true;
 });
 
 // Exibe o grupo com as parcelas relevantes ao filtro, mas mantém o "todas" para o resumo
 items.push({ type: "group", recorrenciaId: d.recorrencia_id, despesas: parcelasDoFiltro.length > 0 ? parcelasDoFiltro : todas });
 } else {
 items.push({ type: "single", despesa: d });
 }
 });

 const renderRow = (d: Despesa, inGroup = false) => {
 const status = getStatus(d);
 const isAtrasado = status === "atrasado";
 return (
 <div key={d.id} className={`rounded-xl border p-3.5 transition-all bg-charcoal border-primary-foreground/[0.08] ${inGroup ? "ml-3 border-l-2 border-l-gold/50" : ""}`}>
 <div className="flex items-center justify-between gap-3">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <span className="text-lg" title={d.tipo === "pessoal" ? "Despesa Pessoal" : "Despesa do Estúdio"}>
 {d.tipo === "pessoal" ? "👤" : "🏛"}
 </span>
 <p className="font-heading text-[15px] font-bold text-primary-foreground truncate">
 {d.descricao}
 </p>
 </div>

 <div className="flex items-center gap-2 mt-1">
 {d.pago && d.data_pagamento ? (
 <p className="font-body text-[11px] font-medium text-green-400">
 ✓ Pago em {formatDate(d.data_pagamento)}
 </p>
 ) : (
 <p className={`font-body text-[11px] font-medium ${isAtrasado && !d.pago ? "text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-md" : "text-primary-foreground/90"}`}>
 Vence {formatDate(d.data_vencimento)} {isAtrasado && !d.pago ? "(Atrasada)" : ""}
 </p>
 )}
 <span className="font-body text-[10px] text-primary-foreground/70 bg-primary-foreground/[0.08] px-1.5 py-0.5 rounded-md hidden sm:inline-block">
 {d.categoria}
 </span>
 </div>
 </div>

 <div className="flex flex-col items-end gap-2 shrink-0">
 <p className={`font-heading text-[15px] font-bold ${isAtrasado && !d.pago ? "text-red-400" : "text-primary-foreground"}`}>
 {formatCurrency(Number(d.valor))}
 </p>
 <div className="flex items-center gap-2">
 {!inGroup && <BinButton size="sm" onClick={() => confirm({ title: "Excluir Despesa", description: "Esta ação apagará permanentemente a despesa.", variant: "destructive", onConfirm: () => deleteDespesa(d.id) })} />}
 <button
 onClick={() => confirm({ title: d.pago ? "Desmarcar como Pago" : "Marcar como Pago", description: d.pago ? "Deseja marcar esta despesa como não paga?" : "Confirmar o pagamento desta despesa?", onConfirm: () => togglePago(d) })}
 className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 ${
 d.pago
 ? "bg-green-500/15 text-green-400 border border-green-500/30"
 : "bg-gold text-charcoal hover:bg-gold/90"
 }`}
 >
 {d.pago ? (
 <> <Check className="w-3.5 h-3.5" /> PAGO </>
 ) : (
 "PAGAR"
 )}
 </button>
 </div>
 </div>
 </div>
 </div>
 );
 };

 return items.map((item) => {
 if (item.type === "single") return renderRow(item.despesa);

 const grupo = item.despesas;
 const open = expandedGroups.has(item.recorrenciaId);
 const inicio = grupo[0]?.data_vencimento;
 const fim = grupo[grupo.length - 1]?.data_vencimento;
 const total = grupo.reduce((s, x) => s + Number(x.valor), 0);
 const pagas = grupo.filter((x) => x.pago).length;
 const baseNome = (grupo[0]?.descricao || "").replace(/\s*\(\d+\/\d+\)\s*$/, "");
 const proxima = grupo.find((x) => !x.pago);

 return (
 <div key={item.recorrenciaId} className="rounded-xl border border-primary-foreground/[0.08] bg-charcoal overflow-hidden">
 <div className="w-full flex items-center hover:bg-primary-foreground/[0.02] transition-all">
 <button
 onClick={() => toggleGroup(item.recorrenciaId)}
 className="flex-1 p-3.5 flex items-center gap-3 text-left"
 >
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <span className="text-lg" title={(grupo[0]?.tipo || "estudio") === "pessoal" ? "Despesa Pessoal" : "Despesa do Estúdio"}>
 {(grupo[0]?.tipo || "estudio") === "pessoal" ? "👤" : "🏛"}
 </span>
 <p className="font-heading text-[15px] font-bold text-primary-foreground truncate">
 {baseNome}
 </p>
 <span className="font-body text-[10px] bg-gold/15 text-gold px-1.5 py-0.5 rounded-md font-semibold shrink-0">
 Fixa ({grupo.length}x)
 </span>
 </div>

 {proxima ? (
 <p className="font-body text-[12px] text-primary-foreground/85 mt-1">
 Próxima: <span className="font-semibold text-primary-foreground">{formatDate(proxima.data_vencimento)}</span> • <span className="font-bold text-gold">{formatCurrency(Number(proxima.valor))}</span>
 </p>
 ) : (
 <p className="font-body text-[12px] text-green-400 mt-1 font-medium">
 Todas as parcelas pagas ✨
 </p>
 )}
 </div>
 <ChevronDown className={`h-5 w-5 text-primary-foreground/50 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
 </button>
 <div className="pr-3.5 pl-1 shrink-0">
 <BinButton size="sm" onClick={() => confirm({ title: "Excluir Despesa Fixa", description: "Esta ação apagará TODAS as parcelas desta despesa fixa permanentemente.", variant: "destructive", onConfirm: () => deleteDespesaGroup(item.recorrenciaId) })} />
 </div>
 </div>
 {open && (
 <div className="border-t border-primary-foreground/[0.06] p-2 space-y-2 bg-primary-foreground/[0.02] max-h-[350px] overflow-y-auto">
 {grupo.map((p) => renderRow(p, true))}
 </div>
 )}
 </div>
 );
 });
 })()}
 </div>
 )}
   </div>

 {/* Charts Dialog */}
 <Dialog open={showCharts} onOpenChange={setShowCharts}>
   <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md border-primary-foreground/[0.06] bg-charcoal overflow-hidden p-0 gap-0">
     <DialogHeader className="p-5 border-b border-primary-foreground/[0.06] bg-primary-foreground/[0.02]">
       <DialogTitle className="font-heading text-lg font-semibold text-primary-foreground flex items-center gap-2">
         <PieChartIcon className="w-5 h-5 text-gold" />
         Dashboard de Despesas
       </DialogTitle>
     </DialogHeader>
     
     <div className="p-0">
       <style>{`
         .recharts-wrapper, .recharts-surface, .recharts-wrapper > svg {
           background: transparent !important;
         }
       `}</style>
       <div className="flex border-b border-primary-foreground/[0.06]">
         {(["mensal", "categoria"] as const).map(v => (
           <button
             key={v}
             onClick={() => setChartView(v)}
             className={`flex-1 py-3 font-body text-[12px] font-medium transition-all ${
               chartView === v
                 ? "text-gold border-b-2 border-gold bg-gold/[0.04]"
                 : "text-primary-foreground/70 hover:text-primary-foreground/60"
             }`}
           >
             {v === "mensal" ? "📅 Despesas por Mês" : "🏷️ Por Categoria"}
           </button>
         ))}
       </div>

       <div className="p-5">
         {chartView === "mensal" ? (
           dadosMensais.length > 0 ? (
             <>
               <p className="font-body text-[11px] text-primary-foreground/70 mb-3">
                 Últimos {dadosMensais.length} meses {tipoFilter !== "todos" ? `(${tipoFilter === "estudio" ? "Estúdio" : "Pessoal"})` : ""}
               </p>
               <ResponsiveContainer width="100%" height={220}>
                 <BarChart data={dadosMensais} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} style={{ background: "transparent" }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                   <XAxis
                     dataKey="mes"
                     tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "var(--font-body)" }}
                     axisLine={false}
                     tickLine={false}
                   />
                   <YAxis
                     tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10, fontFamily: "var(--font-body)" }}
                     axisLine={false}
                     tickLine={false}
                     tickFormatter={v => `R$${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`}
                   />
                   <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                   <Bar dataKey="total" fill="#facc15" radius={[6, 6, 0, 0]} maxBarSize={48} />
                 </BarChart>
               </ResponsiveContainer>
             </>
           ) : (
             <div className="py-10 text-center">
               <p className="font-body text-[13px] text-primary-foreground/60">Nenhum dado para exibir</p>
             </div>
           )
         ) : (
           dadosCategoria.length > 0 ? (
             <>
               <p className="font-body text-[11px] text-primary-foreground/70 mb-3">
                 Distribuição total {tipoFilter !== "todos" ? `(${tipoFilter === "estudio" ? "Estúdio" : "Pessoal"})` : ""}
               </p>
               <ResponsiveContainer width="100%" height={240}>
                 <PieChart style={{ background: "transparent" }}>
                   <Pie
                     data={dadosCategoria}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={100}
                     paddingAngle={2}
                     dataKey="value"
                   >
                     {dadosCategoria.map((entry, index) => (
                       <Cell key={index} fill={entry.fill} />
                     ))}
                   </Pie>
                   <Tooltip content={<CustomPieTooltip />} />
                 </PieChart>
               </ResponsiveContainer>

               <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                 {dadosCategoria.map(cat => (
                   <div key={cat.name} className="flex items-center gap-2">
                     <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.fill }} />
                     <p className="font-body text-[11px] text-primary-foreground/70 flex-1 truncate">{cat.name}</p>
                     <p className="font-body text-[11px] font-semibold text-primary-foreground/90">
                       {formatCurrency(cat.value)}
                     </p>
                     <p className="font-body text-[10px] text-primary-foreground/60 w-8 text-right">
                       {cat.pct}%
                     </p>
                   </div>
                 ))}
               </div>
             </>
           ) : (
             <div className="py-10 text-center">
               <p className="font-body text-[13px] text-primary-foreground/60">Nenhum dado para exibir</p>
             </div>
           )
         )}
       </div>
     </div>
   </DialogContent>
 </Dialog>

 {/* Add Dialog */}
 <Dialog open={showForm} onOpenChange={setShowForm}>
 <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md border-primary-foreground/[0.06] overflow-y-auto max-h-[85vh]">
 <DialogHeader>
 <DialogTitle className="font-heading text-primary-foreground">Nova Despesa</DialogTitle>
 </DialogHeader>
 <div className="space-y-3 pt-2">
 <div>
 <label className="font-body text-[11px] text-primary-foreground/75 mb-1 block">Descrição *</label>
 <input
 value={descricao}
 onChange={(e) => setDescricao(e.target.value)}
 placeholder="Ex: Aluguel do estúdio"
 className="w-full rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] py-2.5 px-3 text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/85 focus:outline-none focus:ring-2 focus:ring-gold/20"
 />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="font-body text-[11px] text-primary-foreground/75 mb-1 block">Valor (R$) *</label>
 <input
 type="number"
 value={valor}
 onChange={(e) => setValor(e.target.value)}
 placeholder="0,00"
 className="w-full rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] py-2.5 px-3 text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/85 focus:outline-none focus:ring-2 focus:ring-gold/20"
 />
 </div>
 <div>
 <label className="font-body text-[11px] text-primary-foreground/75 mb-1 block">Vencimento *</label>
 <input
 type="date"
 value={dataVencimento}
 onChange={(e) => setDataVencimento(e.target.value)}
 className="w-full rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] py-2.5 px-3 text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20"
 />
 </div>
 </div>
 <div>
 <label className="font-body text-[11px] text-primary-foreground/75 mb-1 block">Categoria</label>
 <input
 type="text"
 list="categorias-list"
 value={categoria}
 onChange={(e) => setCategoria(e.target.value)}
 placeholder="Selecione ou digite"
 className="w-full rounded-xl bg-charcoal border border-primary-foreground/[0.06] py-2.5 px-3 text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20"
 />
 <datalist id="categorias-list">
 {CATEGORIAS.map((c) => (
 <option key={c} value={c}>{c}</option>
 ))}
 </datalist>
 </div>

 <div>
 <label className="font-body text-[11px] text-primary-foreground/75 mb-1 block">Tipo da despesa *</label>
 <div className="grid grid-cols-2 gap-2">
 <button
 type="button"
 onClick={() => setTipo("estudio")}
 className={`rounded-xl border px-3 py-3 font-body text-[12px] font-semibold transition-all flex flex-col items-center gap-1 ${
 tipo === "estudio"
 ? "bg-blue-500/15 text-blue-300 border-blue-500/40 shadow-[0_0_0_1px_rgb(59_130_246_/_0.2)]"
 : "bg-primary-foreground/[0.04] text-primary-foreground/85 border-primary-foreground/[0.06] hover:text-primary-foreground/80"
 }`}
 >
 <span className="text-base">🏛</span>
 Estúdio
 <span className="font-normal text-[9px] opacity-70">Entra no DRE</span>
 </button>
 <button
 type="button"
 onClick={() => setTipo("pessoal")}
 className={`rounded-xl border px-3 py-3 font-body text-[12px] font-semibold transition-all flex flex-col items-center gap-1 ${
 tipo === "pessoal"
 ? "bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-[0_0_0_1px_rgb(168_85_247_/_0.2)]"
 : "bg-primary-foreground/[0.04] text-primary-foreground/85 border-primary-foreground/[0.06] hover:text-primary-foreground/80"
 }`}
 >
 <span className="text-base">👤</span>
 Pessoal
 <span className="font-normal text-[9px] opacity-70">Conta da dona</span>
 </button>
 </div>
 </div>



 {/* Despesa fixa (mensal recorrente) */}
 <div className={`rounded-xl border p-3 transition-all ${fixa ? "border-gold/40 bg-gold/[0.06]" : "border-primary-foreground/[0.06] bg-primary-foreground/[0.03]"}`}>
 <button
 type="button"
 onClick={() => setFixa((v) => !v)}
 className="flex w-full items-center justify-between gap-3"
 >
 <div className="flex items-center gap-2 text-left">
 <Repeat className={`h-4 w-4 ${fixa ? "text-gold" : "text-primary-foreground/75"}`} />
 <div>
 <p className={`font-body text-[12px] font-semibold ${fixa ? "text-primary-foreground" : "text-primary-foreground/100"}`}>Despesa fixa (mensal)</p>
 <p className="font-body text-[10px] text-primary-foreground/75">Cria automaticamente uma cópia por mês</p>
 </div>
 </div>
 <span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${fixa ? "bg-gold" : "bg-primary-foreground/15"}`}>
 <span className={`inline-block h-4 w-4 rounded-full bg-charcoal shadow transition-transform ${fixa ? "translate-x-4" : "translate-x-0.5"}`} />
 </span>
 </button>
 {fixa && (
 <div className="mt-3 flex items-center gap-2">
 <label className="font-body text-[11px] text-primary-foreground/95 shrink-0">Repetir por</label>
 <input
 type="number"
 min={1}
 max={60}
 value={meses}
 onChange={(e) => setMeses(e.target.value)}
 className="w-20 rounded-lg bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] py-1.5 px-2 text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20"
 />
 <span className="font-body text-[11px] text-primary-foreground/95">meses</span>
 </div>
 )}
 </div>
 <div>
 <label className="font-body text-[11px] text-primary-foreground/75 mb-1 block">Observação</label>
 <input
 value={observacao}
 onChange={(e) => setObservacao(e.target.value)}
 placeholder="Opcional..."
 className="w-full rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] py-2.5 px-3 text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/85 focus:outline-none focus:ring-2 focus:ring-gold/20"
 />
 </div>
 <button
 onClick={handleAdd}
 disabled={saving}
 className="w-full rounded-xl bg-gold py-3 font-body text-[13px] font-semibold text-charcoal transition-all hover:bg-gold/90 disabled:opacity-50"
 >
 {saving ? "Salvando..." : "Adicionar Despesa"}
 </button>
 </div>
 </DialogContent>
 </Dialog>

 {/* Modal de Valores Totais */}
 <Dialog open={showValores} onOpenChange={setShowValores}>
 <DialogContent className="max-w-[280px] border-primary-foreground/[0.06] bg-charcoal">
 <DialogHeader>
 <DialogTitle className="font-heading text-[16px] text-primary-foreground">Valores Totais</DialogTitle>
 </DialogHeader>
 <div className="space-y-4 pt-2">
 <div className="flex justify-between items-center pb-3 border-b border-primary-foreground/[0.06]">
 <div>
 <p className="font-body text-[11px] font-semibold text-red-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
 <TrendingDown className="w-3.5 h-3.5" /> Atrasado
 </p>
 <p className="font-body text-[10px] text-primary-foreground/60">{countAtrasadas} conta(s)</p>
 </div>
 <p className="font-heading text-[15px] font-bold text-red-400">{formatCurrency(totalAtrasado)}</p>
 </div>
 <div className="flex justify-between items-center pb-3 border-b border-primary-foreground/[0.06]">
 <div>
 <p className="font-body text-[11px] font-semibold text-orange-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
 <Wallet className="w-3.5 h-3.5" /> Pendente
 </p>
 <p className="font-body text-[10px] text-primary-foreground/60">{countPendentes} conta(s)</p>
 </div>
 <p className="font-heading text-[15px] font-bold text-orange-400">{formatCurrency(totalPendente)}</p>
 </div>
 <div className="flex justify-between items-center">
 <div>
 <p className="font-body text-[11px] font-semibold text-green-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
 <TrendingUp className="w-3.5 h-3.5" /> Pago
 </p>
 <p className="font-body text-[10px] text-primary-foreground/60">{countPagas} conta(s)</p>
 </div>
 <p className="font-heading text-[15px] font-bold text-green-400">{formatCurrency(totalPago)}</p>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
};

export default DespesasTab;
