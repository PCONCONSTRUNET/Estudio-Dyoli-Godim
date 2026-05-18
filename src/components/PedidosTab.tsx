import { useState, useMemo } from "react";
import { Search, CheckCircle, X, UserX, ChevronDown, Bell, Clock, AlertTriangle, Eye, Wallet } from "lucide-react";
import BinButton from "@/components/ui/bin-button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyAgendamentoConfirmadoById, notifyLembreteById } from "@/lib/notify-webhook";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

interface Agendamento {
  id: string;
  servico: string;
  variacao: string | null;
  data_agendamento: string;
  horario: string;
  valor: number;
  valor_pago: number | null;
  status: string;
  user_id: string;
  created_at: string;
  cliente_nome: string | null;
  origem?: string | null;
  forma_pagamento?: string | null;
  observacao?: string | null;
  payment_id?: string | null;
  paid_at?: string | null;
  payer_name?: string | null;
  receipt_url?: string | null;

}

interface ClienteProfile {
  id: string;
  nome: string;
  whatsapp: string;
}

interface Props {
  agendamentos: Agendamento[];
  getClientName: (userId: string, clienteNome?: string | null) => string;
  clientes?: ClienteProfile[];
  onUpdate: () => void;
}

const formatDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type PagamentoFilter = "todos" | "pago" | "sinal" | "recepcao" | "pendente";

const isFormaRecepcao = (forma_pagamento?: string | null): boolean => {
  const forma = (forma_pagamento || "").toLowerCase();
  return (
    forma.includes("recep") ||
    forma.includes("salao") ||
    forma.includes("salão") ||
    forma === "presencial" ||
    forma === "local" ||
    forma === "dinheiro"
  );
};

const isPago = (a: { valor: number; valor_pago: number | null }): boolean => {
  const valor = Number(a.valor || 0);
  const pago = Number(a.valor_pago || 0);
  return pago >= valor && valor > 0;
};

const isSinalPago = (a: { valor: number; valor_pago: number | null }): boolean => {
  const valor = Number(a.valor || 0);
  const pago = Number(a.valor_pago || 0);
  return pago > 0 && pago < valor;
};

const isNaoPago = (a: { valor: number; valor_pago: number | null }): boolean => {
  return Number(a.valor_pago || 0) <= 0;
};

const matchesPagamentoFilter = (
  a: { valor: number; valor_pago: number | null; forma_pagamento?: string | null },
  filter: PagamentoFilter
): boolean => {
  if (filter === "todos") return true;
  if (filter === "pago") return isPago(a);
  if (filter === "sinal") return isSinalPago(a);
  if (filter === "pendente") return isNaoPago(a);
  if (filter === "recepcao") return isFormaRecepcao(a.forma_pagamento);
  return true;
};

const PedidosTab = ({ agendamentos, getClientName, clientes = [], onUpdate }: Props) => {
  const [devedoresOpen, setDevedoresOpen] = useState(false);
  const getClienteWhatsapp = (userId: string): string => clientes.find((c) => c.id === userId)?.whatsapp || "";
  const formatWhatsapp = (w: string) => (w ? `(${w.slice(0, 2)}) ${w.slice(2, 7)}-${w.slice(7)}` : "");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [pagamentoFilter, setPagamentoFilter] = useState<PagamentoFilter>("todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("pedidos_dismissed");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const today = new Date().toISOString().split("T")[0];

  // Notifications: today's appointments, pending payments, no-shows
  const notifications = useMemo(() => {
    const notifs: { tipo: "hoje" | "pendente" | "sinal" | "falta" | "proximo"; agendamento: Agendamento; label: string }[] = [];
    const todayDate = new Date(today + "T12:00:00");

    agendamentos.forEach((a) => {
      if (a.status === "cancelado") return;

      const aDate = new Date(a.data_agendamento + "T12:00:00");
      const diffDays = Math.round((aDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

      // Falta (no-show)
      if (a.status === "falta") {
        notifs.push({ tipo: "falta", agendamento: a, label: "Cliente faltou" });
        return;
      }

      // Today's confirmed appointments
      if (diffDays === 0 && a.status === "confirmado") {
        notifs.push({ tipo: "hoje", agendamento: a, label: `Hoje às ${a.horario}` });
      }

      // Tomorrow
      if (diffDays === 1 && a.status === "confirmado") {
        notifs.push({ tipo: "proximo", agendamento: a, label: "Amanhã" });
      }

      // Quitado parcial ou não pago — apenas para atendimentos passados/hoje
      if (a.status !== "falta" && !isPago(a) && diffDays <= 0) {
        const restante = Number(a.valor) - Number(a.valor_pago || 0);
        if (isSinalPago(a)) {
          notifs.push({ tipo: "sinal", agendamento: a, label: `Quitado parcial · a receber ${formatCurrency(restante)}` });
        } else {
          notifs.push({ tipo: "pendente", agendamento: a, label: `Não pago · ${formatCurrency(restante)}` });
        }
      }
    });

    const order = { falta: 0, hoje: 1, pendente: 2, sinal: 3, proximo: 4 };
    notifs.sort((a, b) => order[a.tipo] - order[b.tipo]);
    return notifs;
  }, [agendamentos, today]);

  const activeNotifications = useMemo(
    () => notifications.filter((n) => !dismissedIds.has(n.agendamento.id + n.tipo)),
    [notifications, dismissedIds]
  );

  const dismissNotification = (id: string, tipo: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id + tipo);
      localStorage.setItem("pedidos_dismissed", JSON.stringify([...next]));
      return next;
    });
    toast.success("Marcada como lida");
  };

  const clearAllNotifications = () => {
    const keys = activeNotifications.map((n) => n.agendamento.id + n.tipo);
    setDismissedIds((prev) => {
      const next = new Set([...prev, ...keys]);
      localStorage.setItem("pedidos_dismissed", JSON.stringify([...next]));
      return next;
    });
    toast.success("Todas limpas");
  };

  const filtered = useMemo(() => {
    let list = [...agendamentos];
    if (statusFilter !== "todos") list = list.filter((a) => a.status === statusFilter);
    if (pagamentoFilter !== "todos") {
      list = list.filter((a) => matchesPagamentoFilter(a, pagamentoFilter));
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (a) =>
          getClientName(a.user_id, a.cliente_nome).toLowerCase().includes(term) ||
          a.servico.toLowerCase().includes(term) ||
          a.data_agendamento.includes(term)
      );
    }
    list.sort(
      (a, b) =>
        a.data_agendamento.localeCompare(b.data_agendamento) ||
        a.horario.localeCompare(b.horario)
    );
    return list;
  }, [agendamentos, statusFilter, pagamentoFilter, searchTerm, getClientName]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("agendamentos").update({ status }).eq("id", id);
    onUpdate();
    toast.success(`Status atualizado para ${status}`);
    if (status === "confirmado") {
      notifyAgendamentoConfirmadoById(id);
    } else if (status === "cancelado") {
      notifyLembreteById(id, "cancelamento");
    } else if (status === "concluido") {
      notifyLembreteById(id, "comparecimento");
      // schedule a follow-up message; respects ativo flag in DB
      notifyLembreteById(id, "pos_atendimento");
    }
  };

  const deleteAgendamento = async (id: string) => {
    await supabase.from("agendamentos").delete().eq("id", id);
    onUpdate();
    toast.success("Pedido excluído");
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      confirmado: "bg-gold/10 text-gold border-gold/20",
      cancelado: "bg-rose/10 text-rose border-rose/20",
      concluido: "bg-green-500/10 text-green-500 border-green-500/20",
      falta: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    };
    const labels: Record<string, string> = { confirmado: "Confirmado", cancelado: "Cancelado", concluido: "Concluído", falta: "Não veio" };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-body font-medium border ${map[s] || "bg-secondary text-muted-foreground border-border"}`}>
        {labels[s] || s}
      </span>
    );
  };

  const paidBadge = (a: Agendamento) => {
    if (isPago(a)) {
      return (
        <span title="Pago integralmente" className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-green-500/30 bg-green-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-green-400">
          <CheckCircle className="h-2.5 w-2.5" /> Pago
        </span>
      );
    }
    if (isSinalPago(a)) {
      return (
        <span title="Quitado parcial — falta receber o restante" className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-400">
          <Wallet className="h-2.5 w-2.5" /> Quitado parcial
        </span>
      );
    }
    return (
      <span title="Não pago" className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-red-400">
        <AlertTriangle className="h-2.5 w-2.5" /> Não pago
      </span>
    );
  };

  const paymentBadge = (a: Agendamento) => {
    const recepcao = isFormaRecepcao(a.forma_pagamento);
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        {recepcao && (
          <span title="Pagar na recepção" className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-blue-400">
            <Clock className="h-2.5 w-2.5" /> Recepção
          </span>
        )}
        {paidBadge(a)}
      </span>
    );
  };

  const registrarPagamentoIntegral = async (a: Agendamento) => {
    await supabase.from("agendamentos").update({ valor_pago: Number(a.valor) }).eq("id", a.id);
    onUpdate();
    toast.success("Pagamento registrado como quitado");
  };

  const [pagamentoAg, setPagamentoAg] = useState<Agendamento | null>(null);
  const [pagamentoInput, setPagamentoInput] = useState<string>("");

  const abrirRegistroPagamento = (a: Agendamento, sugestao?: "sinal" | "restante") => {
    const valorTotal = Number(a.valor);
    const pago = Number(a.valor_pago || 0);
    const restante = Math.max(0, valorTotal - pago);
    let sugestaoValor = restante;
    if (sugestao === "sinal") sugestaoValor = Math.round(valorTotal * 0.5 * 100) / 100;
    setPagamentoAg(a);
    setPagamentoInput(sugestaoValor.toFixed(2).replace(".", ","));
  };

  const confirmarRegistroPagamento = async () => {
    if (!pagamentoAg) return;
    const valor = Number(pagamentoInput.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    const totalAgora = Math.min(Number(pagamentoAg.valor), Number(pagamentoAg.valor_pago || 0) + valor);
    await supabase.from("agendamentos").update({ valor_pago: totalAgora }).eq("id", pagamentoAg.id);
    onUpdate();
    setPagamentoAg(null);
    setPagamentoInput("");
    if (totalAgora >= Number(pagamentoAg.valor)) {
      toast.success("Pagamento quitado integralmente ✅");
    } else {
      toast.success(`Pagamento parcial registrado · ainda falta ${formatCurrency(Number(pagamentoAg.valor) - totalAgora)}`);
    }
  };




  const counts = useMemo(() => ({
    todos: agendamentos.length,
    confirmado: agendamentos.filter((a) => a.status === "confirmado").length,
    concluido: agendamentos.filter((a) => a.status === "concluido").length,
    cancelado: agendamentos.filter((a) => a.status === "cancelado").length,
    falta: agendamentos.filter((a) => a.status === "falta").length,
  }), [agendamentos]);

  const pagamentoCounts = useMemo(() => {
    return {
      todos: agendamentos.length,
      pago: agendamentos.filter((a) => isPago(a)).length,
      sinal: agendamentos.filter((a) => isSinalPago(a)).length,
      recepcao: agendamentos.filter((a) => isFormaRecepcao(a.forma_pagamento)).length,
      pendente: agendamentos.filter((a) => isNaoPago(a)).length,
    };
  }, [agendamentos]);

  const devedores = useMemo(() => {
    return agendamentos
      .filter((a) => a.status !== "cancelado" && a.status !== "falta" && !isPago(a))
      .sort((a, b) => b.data_agendamento.localeCompare(a.data_agendamento));
  }, [agendamentos]);

  const totalAReceber = useMemo(() => {
    return devedores.reduce((sum, a) => sum + (Number(a.valor) - Number(a.valor_pago || 0)), 0);
  }, [devedores]);

  const notifConfig = {
    hoje: { bg: "bg-gold/10 border-gold/25", icon: Clock, iconColor: "text-gold", titleColor: "text-gold" },
    proximo: { bg: "bg-blue-500/10 border-blue-500/25", icon: Clock, iconColor: "text-blue-400", titleColor: "text-blue-400" },
    pendente: { bg: "bg-red-500/10 border-red-500/25", icon: AlertTriangle, iconColor: "text-red-400", titleColor: "text-red-400" },
    sinal: { bg: "bg-amber-500/10 border-amber-500/25", icon: Wallet, iconColor: "text-amber-400", titleColor: "text-amber-400" },
    falta: { bg: "bg-orange-500/10 border-orange-500/25", icon: UserX, iconColor: "text-orange-400", titleColor: "text-orange-400" },
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-primary-foreground lg:hidden">
          Todos os Pedidos
        </h2>

        {/* Notification Bell */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] transition-all hover:bg-primary-foreground/[0.1]">
              <Bell className={`h-4 w-4 ${activeNotifications.length > 0 ? "text-gold" : "text-primary-foreground/30"}`} />
              {activeNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white animate-pulse">
                  {activeNotifications.length}
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[340px] sm:w-[400px] bg-charcoal border-primary-foreground/[0.06] p-0">
            <SheetHeader className="px-5 pt-5 pb-4 border-b border-primary-foreground/[0.06]">
              <SheetTitle className="font-heading text-[16px] font-semibold text-primary-foreground flex items-center gap-2">
                <Bell className="w-4 h-4 text-gold" />
                Notificações da Agenda
                {activeNotifications.length > 0 && (
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-body font-medium border border-red-500/20">
                    {activeNotifications.length}
                  </span>
                )}
              </SheetTitle>
            </SheetHeader>

            {activeNotifications.length > 0 && (
              <div className="px-4 pt-3 flex justify-end">
                <button onClick={clearAllNotifications}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-body text-[10px] font-medium text-primary-foreground/30 transition-all hover:bg-primary-foreground/[0.06] hover:text-primary-foreground/50">
                  <X className="h-3 w-3" /> Limpar tudo
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 max-h-[calc(100vh-160px)]">
              {activeNotifications.length === 0 ? (
                <div className="py-16 text-center">
                  <CheckCircle className="h-8 w-8 text-green-400/40 mx-auto mb-3" />
                  <p className="font-body text-[13px] text-primary-foreground/30">Tudo em dia! 🎉</p>
                  <p className="font-body text-[11px] text-primary-foreground/20 mt-1">Nenhuma notificação pendente</p>
                </div>
              ) : (
                activeNotifications.map((n, i) => {
                  const cfg = notifConfig[n.tipo];
                  const Icon = cfg.icon;
                  return (
                    <div key={n.agendamento.id + n.tipo + i} className={`rounded-xl border p-3 transition-all ${cfg.bg}`}>
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-0.5 shrink-0 ${cfg.iconColor}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-body text-[11px] font-semibold ${cfg.titleColor}`}>{n.label}</p>
                          <p className="font-body text-[13px] font-medium text-primary-foreground truncate mt-0.5">
                            {getClientName(n.agendamento.user_id, n.agendamento.cliente_nome)}
                          </p>
                          <p className="font-body text-[11px] text-primary-foreground/40 truncate">
                            {n.agendamento.servico}{n.agendamento.variacao ? ` · ${n.agendamento.variacao}` : ""}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-heading text-[13px] font-bold text-primary-foreground">
                              {formatCurrency(Number(n.agendamento.valor))}
                            </span>
                            <span className="font-body text-[10px] text-primary-foreground/30">
                              {formatDate(n.agendamento.data_agendamento)} · {n.agendamento.horario}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-2">
                            <button
                              onClick={() => dismissNotification(n.agendamento.id, n.tipo)}
                              className="flex items-center gap-1 rounded-lg px-2 py-1 bg-primary-foreground/[0.06] text-primary-foreground/40 text-[10px] font-body font-medium border border-primary-foreground/[0.08] hover:bg-primary-foreground/[0.1] hover:text-primary-foreground/60 transition-all"
                            >
                              <Eye className="h-3 w-3" /> Lida
                            </button>
                            <button
                              onClick={() => deleteAgendamento(n.agendamento.id)}
                              className="flex items-center gap-1 rounded-lg px-2 py-1 bg-rose/10 text-rose/60 text-[10px] font-body font-medium border border-rose/20 hover:bg-rose/20 hover:text-rose transition-all"
                            >
                              <Trash2 className="h-3 w-3" /> Excluir
                            </button>
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
      </div>

      {/* Alert banner */}
      {activeNotifications.filter(n => n.tipo === "hoje" || n.tipo === "falta").length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5">
          <Bell className="h-4 w-4 text-gold shrink-0" />
          <p className="font-body text-[12px] text-gold flex-1">
            Você tem <strong>{activeNotifications.filter(n => n.tipo === "hoje").length}</strong> atendimento(s) hoje
            {activeNotifications.filter(n => n.tipo === "falta").length > 0 && (
              <> e <strong className="text-orange-400">{activeNotifications.filter(n => n.tipo === "falta").length}</strong> falta(s)</>
            )}
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-5 gap-1.5">
        {([
          { key: "todos", label: "Total", color: "text-primary-foreground" },
          { key: "confirmado", label: "Confirmados", color: "text-gold" },
          { key: "concluido", label: "Concluídos", color: "text-green-400" },
          { key: "cancelado", label: "Cancelados", color: "text-rose" },
          { key: "falta", label: "Faltas", color: "text-orange-400" },
        ] as const).map((s) => (
          <div key={s.key} className="rounded-xl border border-gold/15 bg-gradient-to-br from-gold/[0.06] to-nude/[0.03] p-2 text-center shadow-[0_2px_8px_-4px_hsl(var(--gold)/0.15)]">
            <p className={`font-heading text-[16px] font-bold ${s.color}`}>{counts[s.key]}</p>
            <p className="font-body text-[8px] text-primary-foreground/40 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-foreground/25" />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por cliente, serviço ou data..."
          className="w-full rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] py-2.5 pl-10 pr-4 text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20"
        />
      </div>

      {/* Filters row: status select + payment chips */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="shrink-0 rounded-full border border-gold/20 bg-gold/5 px-3 py-1.5 font-body text-[11px] font-medium text-gold focus:outline-none focus:ring-2 focus:ring-gold/20 cursor-pointer"
        >
          <option value="todos">Todos os status</option>
          <option value="confirmado">Confirmados</option>
          <option value="concluido">Concluídos</option>
          <option value="cancelado">Cancelados</option>
          <option value="falta">Faltas</option>
        </select>

        <div className="flex items-center gap-1 ml-auto">
          {([
            { value: "todos" as PagamentoFilter, label: "Tudo", activeClass: "bg-gold/15 text-gold border-gold/40 shadow-[0_0_0_1px_hsl(var(--gold)/0.2)]", inactiveClass: "bg-gold/[0.04] text-gold/60 border-gold/20 hover:bg-gold/10 hover:text-gold/80", count: pagamentoCounts.todos },
            { value: "pago" as PagamentoFilter, label: "Pago", activeClass: "bg-green-500/15 text-green-400 border-green-500/40 shadow-[0_0_0_1px_rgb(34_197_94_/_0.2)]", inactiveClass: "bg-green-500/[0.05] text-green-400/70 border-green-500/20 hover:bg-green-500/10 hover:text-green-400", count: pagamentoCounts.pago },
            { value: "recepcao" as PagamentoFilter, label: "Recepção", activeClass: "bg-blue-500/15 text-blue-400 border-blue-500/40 shadow-[0_0_0_1px_rgb(59_130_246_/_0.2)]", inactiveClass: "bg-blue-500/[0.05] text-blue-400/70 border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-400", count: pagamentoCounts.recepcao },
            { value: "sinal" as PagamentoFilter, label: "Parcial", activeClass: "bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-[0_0_0_1px_rgb(245_158_11_/_0.2)]", inactiveClass: "bg-amber-500/[0.05] text-amber-400/70 border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-400", count: pagamentoCounts.sinal },
            { value: "pendente" as PagamentoFilter, label: "Não pago", activeClass: "bg-red-500/15 text-red-400 border-red-500/40 shadow-[0_0_0_1px_rgb(239_68_68_/_0.2)]", inactiveClass: "bg-red-500/[0.05] text-red-400/70 border-red-500/20 hover:bg-red-500/10 hover:text-red-400", count: pagamentoCounts.pendente },
          ]).map((f) => (
            <button key={f.value} onClick={() => setPagamentoFilter(f.value)}
              className={`shrink-0 rounded-full border px-2.5 py-1 font-body text-[10px] font-medium transition-all ${
                pagamentoFilter === f.value ? f.activeClass : f.inactiveClass
              }`}>
              {f.label} <span className="opacity-70">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-primary-foreground/[0.06] bg-primary-foreground/[0.03] px-3 py-2">
        <Clock className="h-3.5 w-3.5 text-gold" />
        <p className="font-body text-[11px] text-primary-foreground/50">
          Lista em ordem de <span className="text-primary-foreground font-medium">data mais próxima</span> para a <span className="text-primary-foreground font-medium">mais distante</span>
        </p>
      </div>

      {totalAReceber > 0 && (
        <button
          onClick={() => setDevedoresOpen(true)}
          className="w-full flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-500/[0.03] px-3 py-2.5 hover:border-amber-500/50 hover:bg-amber-500/15 transition-all text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Wallet className="h-4 w-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <p className="font-body text-[10px] text-amber-400/70 uppercase tracking-wider">Total a receber</p>
              <p className="font-heading text-[15px] font-bold text-amber-300 leading-tight">{formatCurrency(totalAReceber)}</p>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0">
            {pagamentoCounts.sinal > 0 && (
              <span className="font-body text-[10px] text-amber-300/80">{pagamentoCounts.sinal} parcial</span>
            )}
            {pagamentoCounts.pendente > 0 && (
              <span className="font-body text-[10px] text-red-300/80">{pagamentoCounts.pendente} sem pagar</span>
            )}
          </div>
        </button>
      )}

      <p className="font-body text-[11px] text-primary-foreground/30">
        {filtered.length} pedido{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
      </p>


      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="font-body text-[13px] text-primary-foreground/30">Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const isExpanded = expandedId === a.id;
            return (
              <div key={a.id} className="rounded-xl border border-gold/15 bg-gradient-to-br from-gold/[0.05] via-primary-foreground/[0.02] to-nude/[0.03] overflow-hidden transition-all hover:border-gold/25 hover:shadow-[0_4px_16px_-8px_hsl(var(--gold)/0.25)]">
                <button onClick={() => setExpandedId(isExpanded ? null : a.id)} className="flex w-full items-center gap-3 p-3 text-left">
                  <div className="flex min-w-[52px] flex-col items-center rounded-xl border border-gold/25 bg-gradient-to-br from-gold/20 to-nude/10 px-2 py-1.5 shadow-[0_2px_10px_-4px_hsl(var(--gold)/0.3)]">
                    <span className="font-body text-[10px] text-gold/70">
                      {new Date(a.data_agendamento + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </span>
                    <span className="font-heading text-[14px] font-bold text-gold">{a.horario}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-body text-[14px] font-medium text-primary-foreground truncate">{getClientName(a.user_id, a.cliente_nome)}</p>
                      {a.origem === "whatsapp_bot" && (
                        <span title="Via WhatsApp" className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-green-500/30 bg-green-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-green-400">
                          <WhatsAppIcon className="h-2.5 w-2.5" />
                          WA
                        </span>
                      )}
                      {paymentBadge(a)}
                    </div>
                    <p className="font-body text-[11px] text-primary-foreground/45 truncate">{a.servico}{a.variacao ? ` · ${a.variacao}` : ""}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <p className="font-heading text-[14px] font-bold text-gold">{formatCurrency(Number(a.valor))}</p>
                    {statusBadge(a.status)}
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-primary-foreground/30 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>

                {isExpanded && (
                  <div className="border-t border-primary-foreground/[0.06] p-3 space-y-3 animate-fade-in">
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-body">
                      <div>
                        <p className="text-primary-foreground/30">Data completa</p>
                        <p className="text-primary-foreground font-medium">{formatDate(a.data_agendamento)}</p>
                      </div>
                      <div>
                        <p className="text-primary-foreground/30">Valor total</p>
                        <p className="text-primary-foreground font-medium">{formatCurrency(Number(a.valor))}</p>
                      </div>
                      <div>
                        <p className="text-primary-foreground/30">Criado em</p>
                        <p className="text-primary-foreground font-medium">{new Date(a.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <div>
                        <p className="text-primary-foreground/30">Serviço</p>
                        <p className="text-primary-foreground font-medium">{a.servico}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-primary-foreground/30">Forma de pagamento</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-primary-foreground font-medium capitalize">
                            {a.forma_pagamento || "—"}
                          </p>
                          {paymentBadge(a)}
                        </div>
                      </div>

                      {isSinalPago(a) && a.status !== "cancelado" && (
                        <div className="col-span-2 rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 to-amber-500/[0.04] px-3 py-3 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Wallet className="h-4 w-4 text-amber-400" />
                            <p className="font-body text-[11px] font-semibold uppercase tracking-wider text-amber-400">Quitado parcial</p>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[11px]">
                            <div>
                              <p className="text-primary-foreground/45 text-[10px]">Total</p>
                              <p className="text-primary-foreground/90 font-medium">{formatCurrency(Number(a.valor))}</p>
                            </div>
                            <div>
                              <p className="text-primary-foreground/45 text-[10px]">Pago parcial</p>
                              <p className="text-green-400 font-semibold">{formatCurrency(Number(a.valor_pago || 0))}</p>
                            </div>
                            <div>
                              <p className="text-primary-foreground/45 text-[10px]">A receber</p>
                              <p className="text-amber-300 font-bold">{formatCurrency(Number(a.valor) - Number(a.valor_pago || 0))}</p>
                            </div>
                          </div>
                          <p className="font-body text-[11px] text-amber-200/80 leading-snug">
                            💡 O cliente pagou parte do valor. Registre quanto recebeu agora ou quite tudo de uma vez.
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); abrirRegistroPagamento(a, "restante"); }}
                              className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-2 font-body text-[12px] font-semibold text-amber-200 hover:bg-amber-500/25 transition-all"
                            >
                              <Wallet className="h-4 w-4" /> Registrar pagamento
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); registrarPagamentoIntegral(a); }}
                              className="flex items-center justify-center gap-1.5 rounded-lg border border-green-500/40 bg-green-500/15 px-2 py-2 font-body text-[12px] font-semibold text-green-300 hover:bg-green-500/25 hover:text-green-200 transition-all"
                            >
                              <CheckCircle className="h-4 w-4" /> Quitar tudo
                            </button>
                          </div>
                        </div>
                      )}

                      {isNaoPago(a) && a.status !== "cancelado" && a.status !== "falta" && (
                        <div className="col-span-2 rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-500/[0.03] px-3 py-3 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                            <p className="font-body text-[11px] font-semibold uppercase tracking-wider text-red-400">Nada pago ainda</p>
                          </div>
                          <p className="font-body text-[11px] text-primary-foreground/70">
                            A receber: <span className="font-bold text-red-300">{formatCurrency(Number(a.valor))}</span>
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); abrirRegistroPagamento(a, "sinal"); }}
                              className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-2 font-body text-[12px] font-semibold text-amber-200 hover:bg-amber-500/25 transition-all"
                            >
                              <Wallet className="h-4 w-4" /> Registrar sinal
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); registrarPagamentoIntegral(a); }}
                              className="flex items-center justify-center gap-1.5 rounded-lg border border-green-500/40 bg-green-500/15 px-2 py-2 font-body text-[12px] font-semibold text-green-300 hover:bg-green-500/25 hover:text-green-200 transition-all"
                            >
                              <CheckCircle className="h-4 w-4" /> Quitar tudo
                            </button>
                          </div>
                        </div>
                      )}
                      {a.observacao && (
                        <div className="col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2">
                          <p className="font-body text-[10px] text-amber-400/70 uppercase tracking-wider mb-0.5">Observações do cliente</p>
                          <p className="font-body text-[12px] text-amber-200/95 leading-snug whitespace-pre-wrap break-words">📝 {a.observacao}</p>
                        </div>
                      )}
                      {a.payment_id && (
                        <div className="col-span-2 rounded-lg border border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-500/[0.03] px-3 py-2.5 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                            <p className="font-body text-[11px] font-semibold uppercase tracking-wider text-green-400">Pagamento aprovado</p>
                          </div>
                          {a.paid_at && (
                            <div className="flex justify-between gap-2">
                              <span className="text-primary-foreground/45 text-[11px]">Pago em</span>
                              <span className="text-primary-foreground/90 text-[11px] font-medium">
                                {new Date(a.paid_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          )}
                          {a.payer_name && (
                            <div className="flex justify-between gap-2">
                              <span className="text-primary-foreground/45 text-[11px]">Pagador</span>
                              <span className="text-primary-foreground/90 text-[11px] font-medium truncate max-w-[60%]" title={a.payer_name}>{a.payer_name}</span>
                            </div>
                          )}
                          <div className="flex justify-between gap-2">
                            <span className="text-primary-foreground/45 text-[11px]">ID da transação</span>
                            <span className="text-primary-foreground/70 text-[10px] font-mono truncate max-w-[55%]" title={a.payment_id}>{a.payment_id}</span>
                          </div>
                          {a.receipt_url && (
                            <a
                              href={a.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-green-500/40 bg-green-500/15 px-3 py-1.5 font-body text-[11px] font-semibold text-green-300 hover:bg-green-500/25 hover:text-green-200 transition-all"
                            >
                              🧾 Ver comprovante oficial
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-primary-foreground/[0.06] pt-3 space-y-2">
                      <p className="font-body text-[10px] text-primary-foreground/30 uppercase tracking-wider">Alterar status</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        {a.status !== "confirmado" && (
                          <button onClick={() => updateStatus(a.id, "confirmado")}
                            className="flex items-center gap-1 rounded-lg px-2 py-1.5 font-body text-[10px] font-medium text-gold/60 transition-all hover:bg-gold/10 hover:text-gold">
                            <CheckCircle className="h-3.5 w-3.5" /> Confirmado
                          </button>
                        )}
                        {a.status !== "concluido" && (
                          <button onClick={() => updateStatus(a.id, "concluido")}
                            className="flex items-center gap-1 rounded-lg px-2 py-1.5 font-body text-[10px] font-medium text-green-400/60 transition-all hover:bg-green-500/10 hover:text-green-400">
                            <CheckCircle className="h-3.5 w-3.5" /> Concluído
                          </button>
                        )}
                        {a.status !== "falta" && (
                          <button onClick={() => updateStatus(a.id, "falta")}
                            className="flex items-center gap-1 rounded-lg px-2 py-1.5 font-body text-[10px] font-medium text-orange-400/60 transition-all hover:bg-orange-500/10 hover:text-orange-400">
                            <UserX className="h-3.5 w-3.5" /> Falta
                          </button>
                        )}
                        {a.status !== "cancelado" && (
                          <button onClick={() => updateStatus(a.id, "cancelado")}
                            className="flex items-center gap-1 rounded-lg px-2 py-1.5 font-body text-[10px] font-medium text-rose/60 transition-all hover:bg-rose/10 hover:text-rose">
                            <X className="h-3.5 w-3.5" /> Cancelado
                          </button>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <button onClick={() => deleteAgendamento(a.id)}
                          className="flex items-center gap-1 rounded-lg border border-rose/40 bg-rose/10 px-2.5 py-1.5 font-body text-[10px] font-semibold text-rose transition-all hover:bg-rose/20 hover:text-rose hover:border-rose/60">
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sheet: Devedores (clientes que devem pagar restante) */}
      <Sheet open={devedoresOpen} onOpenChange={setDevedoresOpen}>
        <SheetContent side="right" className="w-full sm:w-[440px] bg-charcoal border-primary-foreground/[0.06] p-0 flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-primary-foreground/[0.06]">
            <SheetTitle className="font-heading text-[16px] font-semibold text-primary-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4 text-amber-400" />
              Clientes a receber
            </SheetTitle>
            <div className="flex items-center gap-3 pt-2">
              <div>
                <p className="font-body text-[10px] text-amber-400/70 uppercase tracking-wider">Total</p>
                <p className="font-heading text-[20px] font-bold text-amber-300 leading-tight">{formatCurrency(totalAReceber)}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="font-body text-[10px] text-primary-foreground/40 uppercase tracking-wider">Pedidos</p>
                <p className="font-heading text-[16px] font-semibold text-primary-foreground">{devedores.length}</p>
              </div>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {devedores.length === 0 ? (
              <div className="py-12 text-center">
                <p className="font-body text-[13px] text-primary-foreground/40">🎉 Ninguém devendo no momento</p>
              </div>
            ) : devedores.map((a) => {
              const nome = getClientName(a.user_id, a.cliente_nome);
              const whats = getClienteWhatsapp(a.user_id);
              const restante = Number(a.valor) - Number(a.valor_pago || 0);
              const sinal = isSinalPago(a);
              const origemLabel = a.origem === "whatsapp_bot" ? "WhatsApp" : a.origem === "presencial" ? "Presencial" : "App";
              return (
                <div key={a.id} className="rounded-xl border border-primary-foreground/[0.08] bg-primary-foreground/[0.03] p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-body text-[14px] font-semibold text-primary-foreground truncate">{nome}</p>
                        <span className={`shrink-0 inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                          a.origem === "whatsapp_bot" ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-blue-500/30 bg-blue-500/10 text-blue-400"
                        }`}>{origemLabel}</span>
                      </div>
                      {whats ? (
                        <a
                          href={`https://wa.me/55${whats.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${nome}! Passando para lembrar do valor restante do seu atendimento (${formatCurrency(restante)}). Obrigada!`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-0.5 font-body text-[11px] text-green-400 hover:text-green-300"
                        >
                          <WhatsAppIcon className="h-3 w-3" /> {formatWhatsapp(whats)}
                        </a>
                      ) : (
                        <p className="font-body text-[11px] text-primary-foreground/40 mt-0.5">Sem WhatsApp cadastrado</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-body text-[9px] text-amber-400/70 uppercase tracking-wider">A receber</p>
                      <p className="font-heading text-[15px] font-bold text-amber-300 leading-tight">{formatCurrency(restante)}</p>
                      {sinal ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-400 mt-0.5">
                          Quitado parcial
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-red-400 mt-0.5">
                          Não pago
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-primary-foreground/[0.06] text-[11px] font-body">
                    <div>
                      <p className="text-primary-foreground/40 text-[9px] uppercase tracking-wider">Serviço</p>
                      <p className="text-primary-foreground/90 font-medium truncate">{a.servico}{a.variacao ? ` · ${a.variacao}` : ""}</p>
                    </div>
                    <div>
                      <p className="text-primary-foreground/40 text-[9px] uppercase tracking-wider">Data atendimento</p>
                      <p className="text-primary-foreground/90 font-medium">{formatDate(a.data_agendamento)} · {a.horario}</p>
                    </div>
                    <div>
                      <p className="text-primary-foreground/40 text-[9px] uppercase tracking-wider">Criado em</p>
                      <p className="text-primary-foreground/70">{new Date(a.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div>
                      <p className="text-primary-foreground/40 text-[9px] uppercase tracking-wider">Total / Pago</p>
                      <p className="text-primary-foreground/70">{formatCurrency(Number(a.valor))} / <span className="text-green-400">{formatCurrency(Number(a.valor_pago || 0))}</span></p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => abrirRegistroPagamento(a, sinal ? "restante" : "sinal")}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-2 font-body text-[12px] font-semibold text-amber-200 hover:bg-amber-500/25 transition-all"
                    >
                      <Wallet className="h-4 w-4" /> {sinal ? "Registrar pagamento" : "Registrar sinal"}
                    </button>
                    <button
                      onClick={() => registrarPagamentoIntegral(a)}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-green-500/40 bg-green-500/15 px-2 py-2 font-body text-[12px] font-semibold text-green-300 hover:bg-green-500/25 hover:text-green-200 transition-all"
                    >
                      <CheckCircle className="h-4 w-4" /> Quitar tudo
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal: Registrar pagamento (sinal ou restante) */}
      <Sheet open={!!pagamentoAg} onOpenChange={(open) => { if (!open) { setPagamentoAg(null); setPagamentoInput(""); } }}>
        <SheetContent side="bottom" className="bg-charcoal border-primary-foreground/[0.06] p-0 max-h-[90vh]">
          {pagamentoAg && (() => {
            const valorTotal = Number(pagamentoAg.valor);
            const jaPago = Number(pagamentoAg.valor_pago || 0);
            const restante = Math.max(0, valorTotal - jaPago);
            const valorAtual = Number((pagamentoInput || "0").replace(/\./g, "").replace(",", ".")) || 0;
            const novoTotal = Math.min(valorTotal, jaPago + valorAtual);
            const novoRestante = Math.max(0, valorTotal - novoTotal);
            const quitaTudo = novoTotal >= valorTotal;
            const presets = [
              { label: "50% (sinal)", valor: Math.round(valorTotal * 0.5 * 100) / 100 },
              { label: "30%", valor: Math.round(valorTotal * 0.3 * 100) / 100 },
              { label: `Restante (${formatCurrency(restante)})`, valor: restante },
            ];
            return (
              <div className="p-5 space-y-4 max-w-md mx-auto">
                <div>
                  <p className="font-heading text-[18px] font-semibold text-primary-foreground">Registrar pagamento</p>
                  <p className="font-body text-[12px] text-primary-foreground/50 mt-0.5">
                    {getClientName(pagamentoAg.user_id, pagamentoAg.cliente_nome)} · {pagamentoAg.servico}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-xl border border-primary-foreground/[0.08] bg-primary-foreground/[0.03] p-3 text-[11px] font-body">
                  <div>
                    <p className="text-primary-foreground/40 text-[9px] uppercase tracking-wider">Total</p>
                    <p className="text-primary-foreground/90 font-medium">{formatCurrency(valorTotal)}</p>
                  </div>
                  <div>
                    <p className="text-primary-foreground/40 text-[9px] uppercase tracking-wider">Já pago</p>
                    <p className="text-green-400 font-semibold">{formatCurrency(jaPago)}</p>
                  </div>
                  <div>
                    <p className="text-primary-foreground/40 text-[9px] uppercase tracking-wider">A receber</p>
                    <p className="text-amber-300 font-bold">{formatCurrency(restante)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-body text-[11px] text-primary-foreground/60 uppercase tracking-wider">Valor recebido agora</label>
                  <div className="flex items-center gap-2 rounded-xl border border-primary-foreground/[0.1] bg-primary-foreground/[0.04] px-3 py-2.5">
                    <span className="font-heading text-[16px] text-primary-foreground/50">R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={pagamentoInput}
                      onChange={(e) => setPagamentoInput(e.target.value.replace(/[^\d,.]/g, ""))}
                      className="flex-1 bg-transparent border-0 font-heading text-[20px] font-bold text-primary-foreground focus:outline-none"
                      placeholder="0,00"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {presets.filter((p) => p.valor > 0).map((p) => (
                      <button
                        key={p.label}
                        onClick={() => setPagamentoInput(p.valor.toFixed(2).replace(".", ","))}
                        className="rounded-full border border-gold/25 bg-gold/5 px-3 py-1 font-body text-[11px] text-gold/80 hover:bg-gold/15 hover:text-gold transition-all"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-primary-foreground/[0.08] bg-primary-foreground/[0.03] p-3 space-y-1 text-[12px] font-body">
                  <div className="flex justify-between">
                    <span className="text-primary-foreground/50">Pago após registro</span>
                    <span className="text-green-400 font-semibold">{formatCurrency(novoTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary-foreground/50">Ainda a receber</span>
                    <span className={`font-bold ${novoRestante === 0 ? "text-green-400" : "text-amber-300"}`}>{formatCurrency(novoRestante)}</span>
                  </div>
                  <div className="pt-1 mt-1 border-t border-primary-foreground/[0.06] flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      quitaTudo ? "bg-green-500/15 text-green-400 border border-green-500/30" :
                      novoTotal > 0 ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" :
                      "bg-red-500/15 text-red-400 border border-red-500/30"
                    }`}>
                      {quitaTudo ? "Pago" : novoTotal > 0 ? "Quitado parcial" : "Não pago"}
                    </span>
                    <span className="text-primary-foreground/40 text-[10px]">novo status</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setPagamentoAg(null); setPagamentoInput(""); }}
                    className="flex-1 rounded-xl border border-primary-foreground/15 bg-primary-foreground/[0.04] px-3 py-2.5 font-body text-[13px] font-medium text-primary-foreground/70 hover:bg-primary-foreground/[0.08] transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarRegistroPagamento}
                    disabled={valorAtual <= 0}
                    className="flex-2 flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-green-500/40 bg-green-500/15 px-3 py-2.5 font-body text-[13px] font-semibold text-green-300 hover:bg-green-500/25 hover:text-green-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="h-4 w-4" /> Confirmar
                  </button>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

    </div>
  );
};

export default PedidosTab;
