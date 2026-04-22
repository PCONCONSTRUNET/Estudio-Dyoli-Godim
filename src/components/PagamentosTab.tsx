import { useState, useMemo } from "react";
import { Search, CreditCard, QrCode, Barcode, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Filter, AlertCircle } from "lucide-react";

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
  duracao_minutos: number;
  forma_pagamento: string | null;
  cliente_nome: string | null;
}

interface Props {
  agendamentos: Agendamento[];
  getClientName: (userId: string, clienteNome?: string | null) => string;
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const formatDateTime = (d: string) => {
  const date = new Date(d);
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

type StatusFilter = "todos" | "confirmado" | "pendente" | "cancelado" | "concluido" | "falta";
type SortField = "data" | "valor" | "cliente" | "status";
type SortDir = "asc" | "desc";

const PagamentosTab = ({ agendamentos, getClientName }: Props) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("data");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const paymentIcon = (method: string | null) => {
    switch (method) {
      case "cartao": return <CreditCard className="h-4 w-4" />;
      case "boleto": return <Barcode className="h-4 w-4" />;
      case "pix": return <QrCode className="h-4 w-4" />;
      default: return <QrCode className="h-4 w-4" />;
    }
  };

  const paymentLabel = (method: string | null) => {
    switch (method) {
      case "cartao": return "Cartão";
      case "boleto": return "Boleto";
      case "pix": return "PIX";
      default: return method || "PIX";
    }
  };

  const statusConfig: Record<string, { bg: string; text: string; icon: typeof CheckCircle; label: string }> = {
    confirmado: { bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-400", icon: CheckCircle, label: "Confirmado" },
    concluido: { bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-400", icon: CheckCircle, label: "Concluído" },
    pendente: { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400", icon: Clock, label: "Pendente" },
    cancelado: { bg: "bg-red-500/10 border-red-500/30", text: "text-red-400", icon: XCircle, label: "Cancelado" },
    falta: { bg: "bg-orange-500/10 border-orange-500/30", text: "text-orange-400", icon: XCircle, label: "Falta" },
  };

  const filtered = useMemo(() => {
    let list = [...agendamentos];

    if (statusFilter !== "todos") {
      list = list.filter((a) => a.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        getClientName(a.user_id, a.cliente_nome).toLowerCase().includes(q) ||
        a.servico.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        (a.forma_pagamento || "").toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "data": cmp = a.data_agendamento.localeCompare(b.data_agendamento); break;
        case "valor": cmp = a.valor - b.valor; break;
        case "cliente": cmp = getClientName(a.user_id, a.cliente_nome).localeCompare(getClientName(b.user_id)); break;
        case "status": cmp = a.status.localeCompare(b.status); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [agendamentos, statusFilter, search, sortField, sortDir, getClientName]);

  const counts = useMemo(() => ({
    todos: agendamentos.length,
    confirmado: agendamentos.filter((a) => a.status === "confirmado").length,
    pendente: agendamentos.filter((a) => a.status === "pendente").length,
    cancelado: agendamentos.filter((a) => a.status === "cancelado").length,
    concluido: agendamentos.filter((a) => a.status === "concluido").length,
    falta: agendamentos.filter((a) => a.status === "falta").length,
  }), [agendamentos]);

  const totalPago = useMemo(() =>
    agendamentos.filter((a) => ["confirmado", "concluido"].includes(a.status))
      .reduce((s, a) => s + (a.valor_pago ?? a.valor), 0),
    [agendamentos]
  );

  const totalPendente = useMemo(() =>
    agendamentos.filter((a) => a.status === "pendente")
      .reduce((s, a) => s + a.valor, 0),
    [agendamentos]
  );

  const SortIcon = ({ field }: { field: SortField }) => (
    sortField === field
      ? sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3 opacity-30" />
  );

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.12] via-emerald-500/[0.05] to-transparent p-4 shadow-[0_4px_16px_-8px_hsl(142_76%_45%/0.3)]">
          <p className="font-body text-[11px] text-emerald-400/70 uppercase tracking-wider">Total Recebido</p>
          <p className="font-heading text-xl font-bold text-emerald-400 mt-1">{formatCurrency(totalPago)}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.12] via-amber-500/[0.05] to-transparent p-4 shadow-[0_4px_16px_-8px_hsl(38_92%_50%/0.3)]">
          <p className="font-body text-[11px] text-amber-400/70 uppercase tracking-wider">Pendente</p>
          <p className="font-heading text-xl font-bold text-amber-400 mt-1">{formatCurrency(totalPendente)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por cliente, serviço, ID..."
          className="w-full rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] pl-10 pr-4 py-3 text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20"
        />
      </div>

      {/* Status filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        <Filter className="h-3.5 w-3.5 shrink-0 text-primary-foreground/30" />
        {(["todos", "pendente", "confirmado", "concluido", "cancelado", "falta"] as StatusFilter[]).map((s) => {
          const colors: Record<StatusFilter, { active: string; inactive: string }> = {
            todos: { active: "bg-gold/15 text-gold border-gold/40", inactive: "bg-gold/[0.04] text-gold/60 border-gold/20 hover:bg-gold/10 hover:text-gold/80" },
            pendente: { active: "bg-red-500/15 text-red-400 border-red-500/40", inactive: "bg-red-500/[0.05] text-red-400/70 border-red-500/20 hover:bg-red-500/10 hover:text-red-400" },
            confirmado: { active: "bg-blue-500/15 text-blue-400 border-blue-500/40", inactive: "bg-blue-500/[0.05] text-blue-400/70 border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-400" },
            concluido: { active: "bg-green-500/15 text-green-400 border-green-500/40", inactive: "bg-green-500/[0.05] text-green-400/70 border-green-500/20 hover:bg-green-500/10 hover:text-green-400" },
            cancelado: { active: "bg-rose/15 text-rose border-rose/40", inactive: "bg-rose/[0.05] text-rose/70 border-rose/20 hover:bg-rose/10 hover:text-rose" },
            falta: { active: "bg-orange-500/15 text-orange-400 border-orange-500/40", inactive: "bg-orange-500/[0.05] text-orange-400/70 border-orange-500/20 hover:bg-orange-500/10 hover:text-orange-400" },
          };
          const c = colors[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 rounded-lg px-3 py-1.5 font-body text-[11px] font-medium border transition-all ${
                statusFilter === s ? c.active : c.inactive
              }`}
            >
              {s === "todos" ? "Todos" : s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
            </button>
          );
        })}
      </div>

      {/* Sort bar */}
      <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <span className="font-body text-[10px] text-primary-foreground/30 shrink-0">Ordenar:</span>
        {([
          { field: "data" as SortField, label: "Data" },
          { field: "valor" as SortField, label: "Valor" },
          { field: "cliente" as SortField, label: "Cliente" },
          { field: "status" as SortField, label: "Status" },
        ]).map((s) => (
          <button
            key={s.field}
            onClick={() => toggleSort(s.field)}
            className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 font-body text-[11px] transition-all ${
              sortField === s.field ? "text-gold" : "text-primary-foreground/30"
            }`}
          >
            {s.label} <SortIcon field={s.field} />
          </button>
        ))}
      </div>

      {/* Payment list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <CreditCard className="mx-auto h-8 w-8 text-primary-foreground/10 mb-2" />
            <p className="font-body text-[13px] text-primary-foreground/30">Nenhum pagamento encontrado</p>
          </div>
        )}

        {filtered.map((ag) => {
          const cfg = statusConfig[ag.status] || statusConfig.pendente;
          const StatusIcon = cfg.icon;
          const isExpanded = expandedId === ag.id;
          const isUnpaid =
            Number(ag.valor_pago || 0) === 0 &&
            !["cancelado", "falta"].includes(ag.status);

          return (
            <div
              key={ag.id}
              className={`rounded-2xl border overflow-hidden transition-all ${
                isUnpaid
                  ? "border-amber-500/40 bg-gradient-to-br from-amber-500/[0.08] via-primary-foreground/[0.02] to-amber-500/[0.04] hover:border-amber-500/60 hover:shadow-[0_4px_16px_-8px_rgba(245,158,11,0.4)]"
                  : "border-gold/15 bg-gradient-to-br from-gold/[0.05] via-primary-foreground/[0.02] to-nude/[0.03] hover:border-gold/25 hover:shadow-[0_4px_16px_-8px_hsl(var(--gold)/0.25)]"
              }`}
            >
              {/* Main row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : ag.id)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.bg} border shadow-[0_2px_8px_-4px_hsl(var(--gold)/0.2)]`}>
                  <StatusIcon className={`h-4 w-4 ${cfg.text}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-body text-[14px] font-medium text-primary-foreground truncate">
                      {getClientName(ag.user_id, ag.cliente_nome)}
                    </p>
                    {isUnpaid && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300 animate-pulse">
                        <AlertCircle className="h-2.5 w-2.5" />
                        Não pago
                      </span>
                    )}
                  </div>
                  <p className="font-body text-[11px] text-primary-foreground/45 truncate">
                    {ag.servico}{ag.variacao ? ` · ${ag.variacao}` : ""} · {formatDate(ag.data_agendamento)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`font-heading text-[15px] font-bold ${isUnpaid ? "text-amber-300" : "text-gold"}`}>
                    {formatCurrency(ag.valor)}
                  </p>
                  <div className="flex items-center justify-end gap-1">
                    <span className={`font-body text-[10px] font-medium ${cfg.text}`}>{cfg.label}</span>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 shrink-0 text-primary-foreground/30 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-primary-foreground/[0.06] bg-primary-foreground/[0.02] px-4 py-3 space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <Detail label="ID do Pedido" value={ag.id.slice(0, 8) + "..."} />
                    <Detail label="Data do Agendamento" value={`${formatDate(ag.data_agendamento)} às ${ag.horario}`} />
                    <Detail label="Método de Pagamento" value={
                      <span className="flex items-center gap-1.5">
                        {paymentIcon(ag.forma_pagamento)}
                        {paymentLabel(ag.forma_pagamento)}
                      </span>
                    } />
                    <Detail label="Duração" value={`${ag.duracao_minutos} min`} />
                    <Detail label="Valor Cobrado" value={formatCurrency(ag.valor)} />
                    <Detail label="Valor Pago" value={ag.valor_pago != null ? formatCurrency(ag.valor_pago) : "—"} />
                    <Detail label="Status" value={
                      <span className={`inline-flex items-center gap-1 ${cfg.text}`}>
                        <StatusIcon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    } />
                    <Detail label="Criado em" value={formatDateTime(ag.created_at)} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center font-body text-[11px] text-primary-foreground/20 pb-4">
        Exibindo {filtered.length} de {agendamentos.length} pagamentos
      </p>
    </div>
  );
};

const Detail = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="font-body text-[10px] text-primary-foreground/30">{label}</p>
    <div className="font-body text-[12px] text-primary-foreground/80 mt-0.5">{value}</div>
  </div>
);

export default PagamentosTab;
