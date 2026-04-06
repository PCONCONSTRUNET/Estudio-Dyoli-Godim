import { useState, useMemo } from "react";
import { Search, Trash2, CheckCircle, X, UserX, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

interface Props {
  agendamentos: Agendamento[];
  getClientName: (userId: string) => string;
  onUpdate: () => void;
}

const formatDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type SortField = "data" | "cliente" | "valor" | "status";
type SortDir = "asc" | "desc";

const PedidosTab = ({ agendamentos, getClientName, onUpdate }: Props) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [sortField, setSortField] = useState<SortField>("data");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...agendamentos];

    // Filter by status
    if (statusFilter !== "todos") {
      list = list.filter((a) => a.status === statusFilter);
    }

    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (a) =>
          getClientName(a.user_id).toLowerCase().includes(term) ||
          a.servico.toLowerCase().includes(term) ||
          a.data_agendamento.includes(term)
      );
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "data":
          cmp = a.data_agendamento.localeCompare(b.data_agendamento) || a.horario.localeCompare(b.horario);
          break;
        case "cliente":
          cmp = getClientName(a.user_id).localeCompare(getClientName(b.user_id));
          break;
        case "valor":
          cmp = Number(a.valor) - Number(b.valor);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return list;
  }, [agendamentos, statusFilter, searchTerm, sortField, sortDir, getClientName]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("agendamentos").update({ status }).eq("id", id);
    onUpdate();
    toast.success(`Status atualizado para ${status}`);
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
    const labels: Record<string, string> = {
      confirmado: "Confirmado",
      cancelado: "Cancelado",
      concluido: "Concluído",
      falta: "Falta",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-body font-medium border ${map[s] || "bg-secondary text-muted-foreground border-border"}`}>
        {labels[s] || s}
      </span>
    );
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />;
  };

  const counts = useMemo(() => ({
    todos: agendamentos.length,
    confirmado: agendamentos.filter((a) => a.status === "confirmado").length,
    concluido: agendamentos.filter((a) => a.status === "concluido").length,
    cancelado: agendamentos.filter((a) => a.status === "cancelado").length,
    falta: agendamentos.filter((a) => a.status === "falta").length,
  }), [agendamentos]);

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="font-heading text-lg font-semibold text-primary-foreground lg:hidden">
        Todos os Pedidos
      </h2>

      {/* Summary */}
      <div className="grid grid-cols-5 gap-1.5">
        {([
          { key: "todos", label: "Total", color: "text-primary-foreground" },
          { key: "confirmado", label: "Confirmados", color: "text-gold" },
          { key: "concluido", label: "Concluídos", color: "text-green-400" },
          { key: "cancelado", label: "Cancelados", color: "text-rose" },
          { key: "falta", label: "Faltas", color: "text-orange-400" },
        ] as const).map((s) => (
          <div key={s.key} className="rounded-xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.03] p-2 text-center">
            <p className={`font-heading text-[16px] font-bold ${s.color}`}>{counts[s.key]}</p>
            <p className="font-body text-[8px] text-primary-foreground/30 uppercase tracking-wider">{s.label}</p>
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

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {([
          { value: "todos", label: "Todos" },
          { value: "confirmado", label: "Confirmados" },
          { value: "concluido", label: "Concluídos" },
          { value: "cancelado", label: "Cancelados" },
          { value: "falta", label: "Faltas" },
        ] as const).map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`shrink-0 rounded-full border px-3 py-1.5 font-body text-[11px] font-medium transition-all ${
              statusFilter === f.value
                ? "bg-gold/10 text-gold border-gold/20"
                : "bg-primary-foreground/[0.03] text-primary-foreground/40 border-primary-foreground/[0.06] hover:text-primary-foreground/60"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Sort buttons */}
      <div className="flex gap-1.5">
        {([
          { field: "data" as SortField, label: "Data" },
          { field: "cliente" as SortField, label: "Cliente" },
          { field: "valor" as SortField, label: "Valor" },
          { field: "status" as SortField, label: "Status" },
        ]).map((s) => (
          <button
            key={s.field}
            onClick={() => toggleSort(s.field)}
            className={`flex items-center gap-0.5 rounded-lg px-2 py-1 font-body text-[10px] font-medium transition-all ${
              sortField === s.field
                ? "bg-gold/10 text-gold"
                : "text-primary-foreground/30 hover:text-primary-foreground/50"
            }`}
          >
            {s.label}
            <SortIcon field={s.field} />
          </button>
        ))}
      </div>

      {/* Results count */}
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
              <div
                key={a.id}
                className="rounded-xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.03] overflow-hidden transition-all"
              >
                {/* Main row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : a.id)}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <div className="flex min-w-[52px] flex-col items-center rounded-xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.03] px-2 py-1.5">
                    <span className="font-body text-[10px] text-primary-foreground/40">
                      {new Date(a.data_agendamento + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </span>
                    <span className="font-heading text-[13px] font-semibold text-primary-foreground">{a.horario}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-body text-[13px] font-medium text-primary-foreground truncate">
                      {getClientName(a.user_id)}
                    </p>
                    <p className="font-body text-[11px] text-primary-foreground/35 truncate">
                      {a.servico}{a.variacao ? ` · ${a.variacao}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <p className="font-heading text-[13px] font-semibold text-gold">
                      {formatCurrency(Number(a.valor))}
                    </p>
                    {statusBadge(a.status)}
                  </div>

                  <ChevronDown className={`h-3.5 w-3.5 text-primary-foreground/20 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>

                {/* Expanded details */}
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
                            <span className="text-red-400 ml-1">
                              (falta {formatCurrency(Number(a.valor) - Number(a.valor_pago || 0))})
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-primary-foreground/30">Criado em</p>
                        <p className="text-primary-foreground font-medium">
                          {new Date(a.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div>
                        <p className="text-primary-foreground/30">Serviço</p>
                        <p className="text-primary-foreground font-medium">{a.servico}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-primary-foreground/[0.06] pt-3">
                      <div className="flex items-center gap-1">
                        {a.status === "confirmado" && (
                          <>
                            <button
                              onClick={() => updateStatus(a.id, "concluido")}
                              className="flex items-center gap-1 rounded-lg px-2 py-1.5 font-body text-[10px] font-medium text-green-400/60 transition-all hover:bg-green-500/10 hover:text-green-400"
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Concluir
                            </button>
                            <button
                              onClick={() => updateStatus(a.id, "falta")}
                              className="flex items-center gap-1 rounded-lg px-2 py-1.5 font-body text-[10px] font-medium text-orange-400/60 transition-all hover:bg-orange-500/10 hover:text-orange-400"
                            >
                              <UserX className="h-3.5 w-3.5" /> Falta
                            </button>
                            <button
                              onClick={() => updateStatus(a.id, "cancelado")}
                              className="flex items-center gap-1 rounded-lg px-2 py-1.5 font-body text-[10px] font-medium text-rose/60 transition-all hover:bg-rose/10 hover:text-rose"
                            >
                              <X className="h-3.5 w-3.5" /> Cancelar
                            </button>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => deleteAgendamento(a.id)}
                        className="flex items-center gap-1 rounded-lg px-2 py-1.5 font-body text-[10px] font-medium text-primary-foreground/20 transition-all hover:bg-rose/10 hover:text-rose"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </button>
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
