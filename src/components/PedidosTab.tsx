import { useState, useMemo } from "react";
import { Search, Trash2, CheckCircle, X, UserX, ChevronDown, Bell, Clock, AlertTriangle, Eye } from "lucide-react";
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
}

interface Props {
  agendamentos: Agendamento[];
  getClientName: (userId: string, clienteNome?: string | null) => string;
  onUpdate: () => void;
}

const formatDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type PagamentoFilter = "todos" | "pago" | "recepcao" | "pendente";

const getPagamentoStatus = (a: { valor: number; valor_pago: number | null; forma_pagamento?: string | null }): "pago" | "recepcao" | "pendente" => {
  const valor = Number(a.valor || 0);
  const pago = Number(a.valor_pago || 0);
  if (pago >= valor && valor > 0) return "pago";
  const forma = (a.forma_pagamento || "").toLowerCase();
  if (
    forma.includes("recep") ||
    forma.includes("salao") ||
    forma.includes("salão") ||
    forma === "presencial" ||
    forma === "local" ||
    forma === "dinheiro"
  ) return "recepcao";
  return "pendente";
};

const PedidosTab = ({ agendamentos, getClientName, onUpdate }: Props) => {
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
    const notifs: { tipo: "hoje" | "pendente" | "falta" | "proximo"; agendamento: Agendamento; label: string }[] = [];
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

      // Pending payment (pago < valor)
      if (a.status !== "falta" && Number(a.valor_pago || 0) < Number(a.valor) && diffDays <= 0) {
        notifs.push({ tipo: "pendente", agendamento: a, label: `Falta ${formatCurrency(Number(a.valor) - Number(a.valor_pago || 0))}` });
      }
    });

    const order = { falta: 0, hoje: 1, pendente: 2, proximo: 3 };
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
      list = list.filter((a) => getPagamentoStatus(a) === pagamentoFilter);
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
    const labels: Record<string, string> = { confirmado: "Confirmado", cancelado: "Cancelado", concluido: "Concluído", falta: "Falta" };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-body font-medium border ${map[s] || "bg-secondary text-muted-foreground border-border"}`}>
        {labels[s] || s}
      </span>
    );
  };

  const paymentBadge = (a: Agendamento) => {
    const tipo = getPagamentoStatus(a);
    if (tipo === "pago") {
      return (
        <span title="Pagamento confirmado" className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-green-500/30 bg-green-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-green-400">
          <CheckCircle className="h-2.5 w-2.5" /> Pago
        </span>
      );
    }
    if (tipo === "recepcao") {
      return (
        <span title="Pagar na recepção" className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-blue-400">
          <Clock className="h-2.5 w-2.5" /> Recepção
        </span>
      );
    }
    return (
      <span title="Não pago" className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-red-400">
        <AlertTriangle className="h-2.5 w-2.5" /> Não pago
      </span>
    );
  };


  const counts = useMemo(() => ({
    todos: agendamentos.length,
    confirmado: agendamentos.filter((a) => a.status === "confirmado").length,
    concluido: agendamentos.filter((a) => a.status === "concluido").length,
    cancelado: agendamentos.filter((a) => a.status === "cancelado").length,
    falta: agendamentos.filter((a) => a.status === "falta").length,
  }), [agendamentos]);

  const pagamentoCounts = useMemo(() => {
    const counts = { todos: agendamentos.length, pago: 0, recepcao: 0, pendente: 0 };
    agendamentos.forEach((a) => {
      counts[getPagamentoStatus(a)]++;
    });
    return counts;
  }, [agendamentos]);

  const notifConfig = {
    hoje: { bg: "bg-gold/10 border-gold/25", icon: Clock, iconColor: "text-gold", titleColor: "text-gold" },
    proximo: { bg: "bg-blue-500/10 border-blue-500/25", icon: Clock, iconColor: "text-blue-400", titleColor: "text-blue-400" },
    pendente: { bg: "bg-red-500/10 border-red-500/25", icon: AlertTriangle, iconColor: "text-red-400", titleColor: "text-red-400" },
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
            { value: "todos" as PagamentoFilter, label: "Tudo", activeClass: "bg-gold/10 text-gold border-gold/25", count: pagamentoCounts.todos },
            { value: "pago" as PagamentoFilter, label: "Pago", activeClass: "bg-green-500/10 text-green-400 border-green-500/30", count: pagamentoCounts.pago },
            { value: "recepcao" as PagamentoFilter, label: "Recepção", activeClass: "bg-blue-500/10 text-blue-400 border-blue-500/30", count: pagamentoCounts.recepcao },
            { value: "pendente" as PagamentoFilter, label: "Não pago", activeClass: "bg-red-500/10 text-red-400 border-red-500/30", count: pagamentoCounts.pendente },
          ]).map((f) => (
            <button key={f.value} onClick={() => setPagamentoFilter(f.value)}
              className={`shrink-0 rounded-full border px-2.5 py-1 font-body text-[10px] font-medium transition-all ${
                pagamentoFilter === f.value
                  ? f.activeClass
                  : "bg-primary-foreground/[0.03] text-primary-foreground/40 border-primary-foreground/[0.06] hover:text-primary-foreground/60"
              }`}>
              {f.label} <span className="opacity-60">{f.count}</span>
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
                        <p className="text-primary-foreground/30">Valor pago</p>
                        <p className="text-primary-foreground font-medium">
                          {formatCurrency(Number(a.valor_pago || 0))}
                          {Number(a.valor_pago || 0) < Number(a.valor) && (
                            <span className="text-red-400 ml-1">(falta {formatCurrency(Number(a.valor) - Number(a.valor_pago || 0))})</span>
                          )}
                        </p>
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
                          className="flex items-center gap-1 rounded-lg px-2 py-1.5 font-body text-[10px] font-medium text-primary-foreground/20 transition-all hover:bg-rose/10 hover:text-rose">
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
    </div>
  );
};

export default PedidosTab;
