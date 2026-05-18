import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Save, X, Check, AlertTriangle, Clock, Bell, ChevronRight, Eye, Receipt, TrendingDown, TrendingUp, Sparkles, CalendarDays, Wallet } from "lucide-react";
import BinButton from "@/components/ui/bin-button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  pago: boolean;
  data_pagamento: string | null;
  categoria: string;
  observacao: string | null;
  created_at: string;
}

const CATEGORIAS = ["Aluguel", "Fornecedor", "Material", "Conta de Luz", "Conta de Água", "Internet", "Outros"];

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

const DespesasTab = () => {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"todas" | "pendentes" | "pagas" | "atrasadas">("todas");
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("despesas_dismissed");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Form state
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [categoria, setCategoria] = useState("Outros");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDespesas();
  }, []);

  const loadDespesas = async () => {
    setLoading(true);
    const { data } = await (supabase.from as any)("despesas")
      .select("*")
      .order("data_vencimento", { ascending: true });
    if (data) setDespesas(data as Despesa[]);
    setLoading(false);
  };

  const today = new Date().toISOString().split("T")[0];

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
      const s = getStatus(d);
      if (filter === "pendentes") return s === "pendente" || s === "hoje";
      if (filter === "pagas") return s === "pago";
      if (filter === "atrasadas") return s === "atrasado";
      return true;
    });
  }, [despesas, filter, today]);

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
    () => despesas.filter((d) => !d.pago).reduce((s, d) => s + Number(d.valor), 0),
    [despesas]
  );
  const totalPago = useMemo(
    () => despesas.filter((d) => d.pago).reduce((s, d) => s + Number(d.valor), 0),
    [despesas]
  );

  const handleAdd = async () => {
    if (!descricao || !valor || !dataVencimento) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setSaving(true);
    const { error } = await (supabase.from as any)("despesas").insert([{
      descricao,
      valor: parseFloat(valor),
      data_vencimento: dataVencimento,
      categoria,
      observacao: observacao || null,
    }]);
    if (error) {
      console.error("Erro despesas insert:", error);
      toast.error("Erro ao salvar despesa");
    } else {
      toast.success("Despesa adicionada!");
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
        data_pagamento: newPago ? new Date().toISOString().split("T")[0] : null,
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

  const resetForm = () => {
    setDescricao("");
    setValor("");
    setDataVencimento("");
    setCategoria("Outros");
    setObservacao("");
  };

  const totalAtrasado = useMemo(
    () => despesas.filter((d) => !d.pago && d.data_vencimento < today).reduce((s, d) => s + Number(d.valor), 0),
    [despesas, today]
  );
  const countAtrasadas = despesas.filter((d) => !d.pago && d.data_vencimento < today).length;
  const countPendentes = despesas.filter((d) => !d.pago).length;
  const countPagas = despesas.filter((d) => d.pago).length;

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
              <p className="font-body text-[12px] text-primary-foreground/45 mt-0.5">
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
                    <Bell className={`h-4 w-4 ${activeNotifications.length > 0 ? "text-yellow-400 animate-[wiggle_2s_ease-in-out_infinite]" : "text-primary-foreground/40"}`} />
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
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-body text-[10px] font-medium text-primary-foreground/30 transition-all hover:bg-primary-foreground/[0.06] hover:text-primary-foreground/50"
                      >
                        <X className="h-3 w-3" /> Limpar tudo
                      </button>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 max-h-[calc(100vh-160px)]">
                    {activeNotifications.length === 0 ? (
                      <div className="py-16 text-center">
                        <Check className="h-8 w-8 text-green-400/40 mx-auto mb-3" />
                        <p className="font-body text-[13px] text-primary-foreground/30">Tudo em dia! 🎉</p>
                        <p className="font-body text-[11px] text-primary-foreground/20 mt-1">Nenhuma notificação pendente</p>
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
                                  <span className="font-body text-[10px] text-primary-foreground/30">
                                    {n.despesa.categoria}
                                  </span>
                                </div>
                                <p className="font-body text-[10px] text-primary-foreground/25 mt-1">
                                  Vencimento: {formatDate(n.despesa.data_vencimento)}
                                </p>
                                <div className="flex items-center gap-1.5 mt-2">
                                  <button
                                    onClick={() => dismissNotification(n.despesa.id)}
                                    className="flex items-center gap-1 rounded-lg px-2 py-1 bg-primary-foreground/[0.06] text-primary-foreground/40 text-[10px] font-body font-medium border border-primary-foreground/[0.08] hover:bg-primary-foreground/[0.1] hover:text-primary-foreground/60 transition-all"
                                  >
                                    <Eye className="h-3 w-3" /> Lida
                                  </button>
                                  <BinButton size="sm" onClick={() => deleteDespesa(n.despesa.id)} />

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

              <button
                onClick={() => setShowForm(true)}
                className="ios-press flex items-center gap-1.5 rounded-2xl bg-gradient-to-br from-gold to-gold/80 px-4 h-10 font-body text-[12px] font-semibold text-charcoal shadow-[0_8px_24px_-6px_hsl(40_60%_55%/0.45)] transition-all hover:shadow-[0_12px_28px_-6px_hsl(40_60%_55%/0.6)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" /> Nova
              </button>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="group relative p-3 rounded-2xl bg-red-500/[0.06] border border-red-500/[0.15] hover:border-red-500/25 transition-all overflow-hidden">
              <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-red-500/10 blur-xl group-hover:bg-red-500/20 transition-all" />
              <TrendingDown className="relative w-3.5 h-3.5 text-red-400/80 mb-1.5 group-hover:scale-110 transition-transform" />
              <p className="relative font-heading text-base font-bold text-red-400 tabular-nums leading-none truncate">
                {formatCurrency(totalAtrasado)}
              </p>
              <p className="relative font-body text-[9px] text-primary-foreground/40 uppercase tracking-wider mt-1">
                {countAtrasadas} atrasada{countAtrasadas !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="group relative p-3 rounded-2xl bg-orange-500/[0.05] border border-orange-500/[0.12] hover:border-orange-500/25 transition-all overflow-hidden">
              <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-orange-500/10 blur-xl group-hover:bg-orange-500/20 transition-all" />
              <Wallet className="relative w-3.5 h-3.5 text-orange-400/80 mb-1.5 group-hover:scale-110 transition-transform" />
              <p className="relative font-heading text-base font-bold text-orange-400 tabular-nums leading-none truncate">
                {formatCurrency(totalPendente)}
              </p>
              <p className="relative font-body text-[9px] text-primary-foreground/40 uppercase tracking-wider mt-1">
                Pendente
              </p>
            </div>
            <div className="group relative p-3 rounded-2xl bg-green-500/[0.05] border border-green-500/[0.12] hover:border-green-500/25 transition-all overflow-hidden">
              <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-green-500/10 blur-xl group-hover:bg-green-500/20 transition-all" />
              <TrendingUp className="relative w-3.5 h-3.5 text-green-400/80 mb-1.5 group-hover:scale-110 transition-transform" />
              <p className="relative font-heading text-base font-bold text-green-400 tabular-nums leading-none truncate">
                {formatCurrency(totalPago)}
              </p>
              <p className="relative font-body text-[9px] text-primary-foreground/40 uppercase tracking-wider mt-1">
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

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {([
          { value: "todas", label: "Todas", active: "bg-gold/15 text-gold border-gold/40 shadow-[0_0_0_1px_hsl(var(--gold)/0.2)]", inactive: "bg-gold/[0.04] text-gold/60 border-gold/20 hover:bg-gold/10 hover:text-gold/80" },
          { value: "atrasadas", label: "Atrasadas", active: "bg-red-500/15 text-red-400 border-red-500/40 shadow-[0_0_0_1px_rgb(239_68_68_/_0.2)]", inactive: "bg-red-500/[0.05] text-red-400/70 border-red-500/20 hover:bg-red-500/10 hover:text-red-400" },
          { value: "pendentes", label: "A vencer", active: "bg-orange-500/15 text-orange-400 border-orange-500/40 shadow-[0_0_0_1px_rgb(249_115_22_/_0.2)]", inactive: "bg-orange-500/[0.05] text-orange-400/70 border-orange-500/20 hover:bg-orange-500/10 hover:text-orange-400" },
          { value: "pagas", label: "Pagas", active: "bg-green-500/15 text-green-400 border-green-500/40 shadow-[0_0_0_1px_rgb(34_197_94_/_0.2)]", inactive: "bg-green-500/[0.05] text-green-400/70 border-green-500/20 hover:bg-green-500/10 hover:text-green-400" },
        ] as const).map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-full border px-3 py-1.5 font-body text-[11px] font-medium transition-all ${
              filter === f.value ? f.active : f.inactive
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Despesas list */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="font-body text-[13px] text-primary-foreground/30">Nenhuma despesa encontrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => {
            const status = getStatus(d);
            const cfg = statusConfig[status];
            const Icon = cfg.icon;
            return (
              <div
                key={d.id}
                className={`rounded-xl border p-3 transition-all ${cfg.bg}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-body font-medium border flex items-center gap-1 ${cfg.badge}`}>
                        <Icon className="h-2.5 w-2.5" />
                        {cfg.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-body font-medium border bg-primary-foreground/[0.05] text-primary-foreground/40 border-primary-foreground/[0.06]">
                        {d.categoria}
                      </span>
                    </div>
                    <p className="font-body text-[13px] font-medium text-primary-foreground truncate">
                      {d.descricao}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className={`font-heading text-[15px] font-bold ${cfg.text}`}>
                        {formatCurrency(Number(d.valor))}
                      </p>
                      <p className="font-body text-[11px] text-primary-foreground/30">
                        Vence {formatDate(d.data_vencimento)}
                      </p>
                    </div>
                    {d.observacao && (
                      <p className="font-body text-[11px] text-primary-foreground/25 mt-1 truncate">
                        {d.observacao}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => togglePago(d)}
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl border-2 transition-all shadow-sm ${
                        d.pago
                          ? "bg-green-500/25 text-green-400 border-green-500/40 shadow-green-500/10"
                          : "bg-primary-foreground/[0.06] text-primary-foreground/40 border-primary-foreground/[0.1] hover:bg-gold/15 hover:text-gold hover:border-gold/30 hover:shadow-gold/10"
                      }`}
                      title={d.pago ? "Desmarcar" : "Marcar como pago"}
                    >
                      <Check className="h-5 w-5" />
                    </button>
                    <BinButton size="md" onClick={() => deleteDespesa(d.id)} />

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md bg-charcoal border-primary-foreground/[0.06] overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="font-heading text-primary-foreground">Nova Despesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="font-body text-[11px] text-primary-foreground/40 mb-1 block">Descrição *</label>
              <input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Aluguel do estúdio"
                className="w-full rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] py-2.5 px-3 text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-body text-[11px] text-primary-foreground/40 mb-1 block">Valor (R$) *</label>
                <input
                  type="number"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] py-2.5 px-3 text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20"
                />
              </div>
              <div>
                <label className="font-body text-[11px] text-primary-foreground/40 mb-1 block">Vencimento *</label>
                <input
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="w-full rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] py-2.5 px-3 text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20"
                />
              </div>
            </div>
            <div>
              <label className="font-body text-[11px] text-primary-foreground/40 mb-1 block">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full rounded-xl bg-charcoal border border-primary-foreground/[0.06] py-2.5 px-3 text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20 [&>option]:bg-charcoal [&>option]:text-primary-foreground"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-body text-[11px] text-primary-foreground/40 mb-1 block">Observação</label>
              <input
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Opcional..."
                className="w-full rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] py-2.5 px-3 text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20"
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
    </div>
  );
};

export default DespesasTab;
