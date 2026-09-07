import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search, CreditCard, Barcode, Clock, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Filter, AlertCircle, Trash2, Wallet,
  Edit3, DollarSign, Zap, ListChecks, X, Users,
} from "lucide-react";
import pixIcon from "@/assets/pix-icon.png";
import { useConfirm } from "@/contexts/ConfirmContext";
import { Button } from "@/components/ui/button";

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
  valor_gorjeta?: number | null;
  valor_troco?: number | null;
  valor_credito?: number | null;
  valor_desconto_credito?: number | null;
}

interface Props {
  agendamentos: Agendamento[];
  getClientName: (userId: string, clienteNome?: string | null) => string;
  onUpdate?: () => void;
  onEdit?: (ag: any) => void;
}

const formatCurrency = (v: number | string | null | undefined) => {
  const num = Number(v) || 0;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const formatDate = (d: string) => {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const parseCurrencyInput = (s: string): number => {
  const clean = s.replace(/\./g, "").replace(",", ".");
  return parseFloat(clean) || 0;
};

type StatusFilter = "todos" | "confirmado" | "pendente" | "cancelado" | "concluido" | "falta" | "saidas";
type SortField = "data" | "valor" | "cliente" | "status";
type SortDir = "asc" | "desc";

interface FaturaPendente {
  id: string;
  servico: string;
  variacao: string;
  valor: number;
  valorPago: number;
  restante: number;
  data: string;
}

interface SmartPayModalState {
  clienteNome: string;
  pendentes: FaturaPendente[];
}

interface ClienteGroup {
  key: string;
  clienteNome: string;
  userId: string;
  totalPendente: number;
  totalPago: number;
  countPendente: number;
  faturas: any[];
}

interface GroupedFaturasResult {
  groups: ClienteGroup[];
  saidas: any[];
}

const PagamentosTab = ({ agendamentos, getClientName, onUpdate, onEdit }: Props) => {
  const { confirm } = useConfirm();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("data");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Smart payment modal state
  const [smartPayModal, setSmartPayModal] = useState<SmartPayModalState | null>(null);
  const [payMode, setPayMode] = useState<"livre" | "especifica">("livre");
  const [payValor, setPayValor] = useState("");
  const [payForma, setPayForma] = useState("pix");
  const [payObs, setPayObs] = useState("");
  const [paySelectedIds, setPaySelectedIds] = useState<string[]>([]);
  const [payLoading, setPayLoading] = useState(false);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDeleteHistorico = (ag: any) => {
    // ag._faturaId = "uuid-hist-histUUID"
    const histId = ag._faturaId.split("-hist-")[1];
    if (!histId) { toast.error("ID do histórico não encontrado"); return; }

    confirm({
      title: "Reverter Pagamento",
      description: `Deseja reverter o pagamento de ${formatCurrency(ag.valor_fatura)}? O valor pendente da fatura será restaurado.`,
      variant: "destructive",
      onConfirm: async () => {
        try {
          // Deleta o registro do histórico
          const { error: e1 } = await supabase.from("pagamento_historico").delete().eq("id", histId);
          if (e1) throw e1;

          // Reverte o valor_pago no agendamento
          const novoValorPago = Math.max(0, Number(ag.valor_pago || 0) - Number(ag.valor_fatura));
          const { error: e2 } = await supabase.from("agendamentos").update({ valor_pago: novoValorPago } as any).eq("id", ag.id);
          if (e2) throw e2;

          toast.success("Pagamento revertido com sucesso.");
          setHistorico([]);
          setRefetchKey(k => k + 1);
          if (onUpdate) onUpdate();
        } catch (error: any) {
          console.error(error);
          toast.error(error.message || "Erro ao reverter pagamento.");
        }
      },
    });
  };

  const handleDelete = (id: string, tableType: "despesas" | "vendas" | "agendamentos") => {
    confirm({
      title: "Excluir Transação",
      description: "Tem certeza que deseja excluir esta transação? Essa ação não pode ser desfeita.",
      variant: "destructive",
      onConfirm: async () => {
        try {
          if (tableType === "vendas") {
            const { data: vendaData } = await supabase.from("vendas").select("itens").eq("id", id).single();
            if (vendaData && Array.isArray(vendaData.itens)) {
              for (const item of vendaData.itens) {
                if (item.id && item.quantidade) {
                  const { data: prod } = await supabase.from("produtos").select("estoque").eq("id", item.id).single();
                  if (prod) await supabase.from("produtos").update({ estoque: Number(prod.estoque) + Number(item.quantidade) }).eq("id", item.id);
                }
              }
            }
          }
          const { error } = await supabase.from(tableType as any).delete().eq("id", id);
          if (error) throw error;
          toast.success("Transação excluída com sucesso.");
          if (onUpdate) onUpdate();
          else window.location.reload();
        } catch (error: any) {
          console.error(error);
          toast.error(error.message || "Erro ao excluir transação.");
        }
      }
    });
  };

  const paymentIcon = (method: string | null) => {
    switch (method) {
      case "cartao": return <CreditCard className="h-4 w-4" />;
      case "boleto": return <Barcode className="h-4 w-4" />;
      default: return <img src={pixIcon} alt="PIX" className="h-4 w-4" />;
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
    confirmado: { bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-400", icon: CheckCircle, label: "Confirmado" },
    concluido: { bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-400", icon: CheckCircle, label: "Concluído" },
    pendente: { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400", icon: Clock, label: "Pendente" },
    cancelado: { bg: "bg-red-500/10 border-red-500/30", text: "text-red-400", icon: XCircle, label: "Cancelado" },
    falta: { bg: "bg-orange-500/10 border-orange-500/30", text: "text-orange-400", icon: XCircle, label: "Falta" },
    pago: { bg: "bg-rose/10 border-rose/30", text: "text-rose", icon: CheckCircle, label: "Saída" },
    pendente_saida: { bg: "bg-orange-500/10 border-orange-500/30", text: "text-orange-400", icon: Clock, label: "Saída Pendente" },
  };

  const [historico, setHistorico] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<any[]>([]);
  const [vendas, setVendas] = useState<any[]>([]);
  const [despesasLimit, setDespesasLimit] = useState(1000);
  const [vendasLimit, setVendasLimit] = useState(1000);
  const [hasMoreDespesas, setHasMoreDespesas] = useState(false);
  const [hasMoreVendas, setHasMoreVendas] = useState(false);

  const [localAgendamentos, setLocalAgendamentos] = useState<any[]>(() => {
    const seen = new Set<string>();
    return agendamentos.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Contador para forçar refetch local após pagamento
  const [refetchKey, setRefetchKey] = useState(0);


  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    let isCancelled = false;

    const fetchHistoricoEDespesas = async () => {
      let queryDespesas = (supabase.from("despesas") as any)
        .select("*")
        .eq("pago", true)
        .neq("tipo", "pessoal")
        .order("data_vencimento", { ascending: false });

      let queryVendas = (supabase.from("vendas") as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (debouncedSearch.trim()) {
        const term = `%${debouncedSearch.trim()}%`;
        queryDespesas = queryDespesas.or(`descricao.ilike.${term},categoria.ilike.${term}`);
        queryVendas = queryVendas.ilike("cliente_nome", term);
      }

      const [despesasRes, vendasRes] = await Promise.all([
        queryDespesas.limit(despesasLimit + 1),
        queryVendas.limit(vendasLimit + 1)
      ]);

      if (isCancelled) return;

      const pagas = despesasRes.data;
      if (pagas) {
        if (pagas.length > despesasLimit) { setHasMoreDespesas(true); setDespesas(pagas.slice(0, despesasLimit)); }
        else { setHasMoreDespesas(false); setDespesas(pagas); }
      } else { setDespesas([]); }

      const vd = vendasRes.data;
      if (vd) {
        if (vd.length > vendasLimit) { setHasMoreVendas(true); setVendas(vd.slice(0, vendasLimit)); }
        else { setHasMoreVendas(false); setVendas(vd); }
      } else { setVendas([]); }

      let currentAgendamentos = agendamentos;
      if (debouncedSearch.trim()) {
        const term = `%${debouncedSearch.trim()}%`;
        const { data: matchedAgs } = await supabase
          .from("agendamentos")
          .select("*")
          .neq("status", "aguardando_pagamento")
          .or(`cliente_nome.ilike.${term},servico.ilike.${term},id.ilike.${term},forma_pagamento.ilike.${term}`)
          .order("data_agendamento", { ascending: false })
          .limit(200);
        if (matchedAgs) currentAgendamentos = matchedAgs as any[];
      } else if (!currentAgendamentos || currentAgendamentos.length === 0) {
        // Fallback rápido apenas se o componente pai ainda não carregou os agendamentos
        const { data: freshAgs } = await supabase
          .from("agendamentos")
          .select("*")
          .neq("status", "aguardando_pagamento")
          .order("data_agendamento", { ascending: false })
          .limit(500);
        if (freshAgs) currentAgendamentos = freshAgs as any[];
      }

      if (isCancelled) return;

      const seenIds = new Set<string>();
      currentAgendamentos = currentAgendamentos.filter(a => {
        if (seenIds.has(a.id)) return false;
        seenIds.add(a.id);
        return true;
      });

      // Busca o histórico diretamente com limite ordenado por created_at (usa índice idx_pagamento_historico_created_at_desc)
      // Substitui as rajadas de N requisições paralelas concorrentes por uma única consulta leve
      const { data: histData } = await supabase
        .from("pagamento_historico")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (isCancelled) return;

      setHistorico(histData || []);
      setLocalAgendamentos(currentAgendamentos);
    };

    fetchHistoricoEDespesas();
    return () => { isCancelled = true; };
  }, [debouncedSearch, despesasLimit, vendasLimit, refetchKey]);

  // Sincroniza localAgendamentos instantaneamente quando o Admin atualizar agendamentos via Realtime
  useEffect(() => {
    if (!debouncedSearch.trim() && agendamentos && agendamentos.length > 0) {
      setLocalAgendamentos(agendamentos);
    }
  }, [agendamentos, debouncedSearch]);

  const faturas = useMemo(() => {
    const list: any[] = [];

    localAgendamentos.forEach((a) => {
      if (["cancelado", "falta"].includes(a.status)) {
        list.push({ ...a, _faturaId: a.id, fatura_tipo: "cancelado_fatura", valor_fatura: a.valor, data_fatura: a.data_agendamento });
        return;
      }

      const hists = historico.filter((h) => h.agendamento_id === a.id && h.valor_delta > 0 && h.acao !== "acrescimo");

      if (hists.length > 0) {
        let totalPaidInHistory = 0;
        hists.forEach((h) => {
          list.push({ ...a, _faturaId: `${a.id}-hist-${h.id}`, fatura_tipo: "pagamento", valor_fatura: h.valor_delta, data_fatura: h.created_at.split("T")[0], _is_partial: true, _desc_pagamento: "Fatura Paga", _historico_obs: h.observacao || "", _historico_date: h.created_at.split("T")[0] });
          totalPaidInHistory += h.valor_delta;
        });
        const valorPagoAtual = Number(a.valor_pago || 0) + Number(a.valor_desconto_credito || 0);
        const initialPayment = valorPagoAtual - totalPaidInHistory;
        if (initialPayment > 0) {
          list.push({ ...a, _faturaId: `${a.id}-initial`, fatura_tipo: "pagamento", valor_fatura: initialPayment, data_fatura: a.data_agendamento, _is_partial: true, _desc_pagamento: "Pagamento Inicial" });
        }
        const efetivamentePago = Math.max(valorPagoAtual, totalPaidInHistory);
        const restante = Number(a.valor) - efetivamentePago;
        if (restante > 0.01) {
          list.push({ ...a, _faturaId: `${a.id}-restante`, fatura_tipo: "pendente", valor_fatura: restante, data_fatura: a.data_agendamento, _is_partial: true, _desc_pagamento: "Restante Pendente" });
        }
      } else {
        const valorPago = Number(a.valor_pago || 0) + Number(a.valor_desconto_credito || 0);
        if (valorPago === 0) {
          if (Number(a.valor) > 0) list.push({ ...a, _faturaId: a.id, fatura_tipo: "pendente", valor_fatura: a.valor, data_fatura: a.data_agendamento });
        } else if (valorPago < a.valor) {
          list.push({ ...a, _faturaId: `${a.id}-pago`, fatura_tipo: "pagamento", valor_fatura: valorPago, data_fatura: a.data_agendamento, _is_partial: true, _desc_pagamento: "Fatura Paga" });
          list.push({ ...a, _faturaId: `${a.id}-restante`, fatura_tipo: "pendente", valor_fatura: a.valor - valorPago, data_fatura: a.data_agendamento, _is_partial: true, _desc_pagamento: "Restante Pendente" });
        } else {
          list.push({ ...a, _faturaId: a.id, fatura_tipo: "pagamento", valor_fatura: a.valor, data_fatura: a.data_agendamento });
        }
      }

      if (Number(a.valor_gorjeta) > 0) list.push({ ...a, _faturaId: `${a.id}-gorjeta`, fatura_tipo: "pagamento", valor_fatura: Number(a.valor_gorjeta), data_fatura: a.data_agendamento, _is_partial: true, _desc_pagamento: "Gorjeta (extra)", is_extra: true });
      if (Number(a.valor_troco) > 0) list.push({ ...a, _faturaId: `${a.id}-troco`, fatura_tipo: "pagamento", valor_fatura: Number(a.valor_troco), data_fatura: a.data_agendamento, _is_partial: true, _desc_pagamento: "Troco pago", is_extra: true });
      if (Number(a.valor_credito) > 0) list.push({ ...a, _faturaId: `${a.id}-credito`, fatura_tipo: "pagamento", valor_fatura: Number(a.valor_credito), data_fatura: a.data_agendamento, _is_partial: true, _desc_pagamento: "Crédito concedido", is_extra: true });
    });

    despesas.forEach((d) => {
      list.push({
        id: d.id, _faturaId: `despesa-${d.id}`, fatura_tipo: "saida",
        valor_fatura: d.valor,
        data_fatura: d.data_pagamento || d.data_vencimento || d.created_at?.split("T")[0],
        status: d.pago ? "pago" : "pendente_saida",
        cliente_nome: d.descricao || "Saída Registrada",
        servico: d.categoria || "Geral", variacao: d.observacao || null,
        horario: d.created_at ? `${String(new Date(d.created_at).getHours()).padStart(2, "0")}:${String(new Date(d.created_at).getMinutes()).padStart(2, "0")}` : "23:59",
        forma_pagamento: "dinheiro",
        _is_saida: true, _is_despesa: true, _despesa_tipo: d.tipo,
        _desc_pagamento: d.tipo === "comissao" ? "Retirada Pessoal" : "Despesa Estúdio",
        user_id: "admin",
      });
    });

    vendas.forEach((v) => {
      list.push({
        id: v.id, _faturaId: `venda-${v.id}`,
        fatura_tipo: v.pago ? "pagamento" : "pendente",
        valor_fatura: v.valor_total,
        data_fatura: v.data_venda || v.created_at?.split("T")[0],
        status: v.pago ? "concluido" : "pendente",
        cliente_nome: v.cliente_nome, servico: "Venda de Produtos", variacao: "Loja",
        horario: v.created_at ? `${String(new Date(v.created_at).getHours()).padStart(2, "0")}:${String(new Date(v.created_at).getMinutes()).padStart(2, "0")}` : "00:00",
        forma_pagamento: v.forma_pagamento,
        _is_saida: false, _is_venda: true, _desc_pagamento: "Venda de Produtos",
        user_id: v.cliente_id || "admin",
      });
    });

    return list;
  }, [localAgendamentos, historico, despesas, vendas]);

  const dateFilteredFaturas = useMemo(() => {
    if (!dateFilter) return faturas;
    return faturas.filter(a => a.data_fatura === dateFilter);
  }, [faturas, dateFilter]);

  const filtered = useMemo(() => {
    let list = [...dateFilteredFaturas];

    if (statusFilter !== "todos") {
      if (statusFilter === "pendente") list = list.filter((a) => a.fatura_tipo === "pendente" && !["cancelado", "falta"].includes(a.status));
      else if (statusFilter === "saidas") list = list.filter((a) => a._is_saida);
      else list = list.filter((a) => a.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        (a._is_saida ? String(a.cliente_nome) : getClientName(a.user_id, a.cliente_nome)).toLowerCase().includes(q) ||
        a.servico.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        (a.forma_pagamento || "").toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "data": cmp = a.data_fatura.localeCompare(b.data_fatura) || a.horario.localeCompare(b.horario) || (a.created_at || "").localeCompare(b.created_at || ""); break;
        case "valor": cmp = a.valor_fatura - b.valor_fatura; break;
        case "cliente": cmp = (a._is_saida ? String(a.cliente_nome) : getClientName(a.user_id, a.cliente_nome)).localeCompare(b._is_saida ? String(b.cliente_nome) : getClientName(b.user_id)); break;
        case "status": cmp = a.status.localeCompare(b.status); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [dateFilteredFaturas, statusFilter, search, sortField, sortDir, getClientName]);

  const counts = useMemo(() => ({
    todos: dateFilteredFaturas.length,
    confirmado: dateFilteredFaturas.filter((a) => a.status === "confirmado").length,
    pendente: dateFilteredFaturas.filter((a) => a.fatura_tipo === "pendente" && !["cancelado", "falta"].includes(a.status)).length,
    cancelado: dateFilteredFaturas.filter((a) => a.status === "cancelado").length,
    concluido: dateFilteredFaturas.filter((a) => a.status === "concluido").length,
    falta: dateFilteredFaturas.filter((a) => a.status === "falta").length,
    saidas: dateFilteredFaturas.filter((a) => a._is_saida).length,
  }), [dateFilteredFaturas]);

  const { totalPago, totalPendente, totalDespesas, saldoLiquido } = useMemo(() => {
    let pago = 0, pendente = 0, desp = 0;
    dateFilteredFaturas.forEach(a => {
      if (a._is_saida) { if (a._despesa_tipo !== "pessoal") desp += Number(a.valor_fatura); }
      else {
        if (a.fatura_tipo === "pagamento") pago += Number(a.valor_fatura);
        else if (a.fatura_tipo === "pendente" && !["cancelado", "falta"].includes(a.status)) pendente += Number(a.valor_fatura);
      }
    });
    return { totalPago: pago, totalPendente: pendente, totalDespesas: desp, saldoLiquido: pago - desp };
  }, [dateFilteredFaturas]);

  // ── Client summary card (only when searching) ─────────────────────────
  const clienteSummary = useMemo(() => {
    if (!debouncedSearch.trim()) return null;
    let totalPendSum = 0, totalPagoSum = 0;
    let clienteNome = "";
    const pendentesMap = new Map<string, FaturaPendente>();

    filtered.forEach(f => {
      if (f._is_saida || f._is_venda) return;
      if (!clienteNome) clienteNome = getClientName(f.user_id, f.cliente_nome);
      if (f.fatura_tipo === "pendente" && !["cancelado", "falta"].includes(f.status)) {
        totalPendSum += Number(f.valor_fatura);
        if (!pendentesMap.has(f.id)) {
          pendentesMap.set(f.id, {
            id: f.id, servico: f.servico, variacao: f.variacao || "",
            valor: Number(f.valor),
            valorPago: Number(f.valor_pago || 0) + Number(f.valor_desconto_credito || 0),
            restante: Number(f.valor_fatura), data: f.data_fatura,
          });
        } else {
          pendentesMap.get(f.id)!.restante += Number(f.valor_fatura);
        }
      } else if (f.fatura_tipo === "pagamento" && !f.is_extra) {
        totalPagoSum += Number(f.valor_fatura);
      }
    });

    if (!clienteNome) return null;
    return {
      clienteNome, totalPendente: totalPendSum, totalPago: totalPagoSum,
      pendentes: Array.from(pendentesMap.values()).sort((a, b) => a.restante - b.restante),
    };
  }, [filtered, debouncedSearch, getClientName]);

  // ── Grouped view (no search, not saidas-only) ─────────────────────────
  const groupedFaturas = useMemo((): GroupedFaturasResult | null => {
    if (debouncedSearch.trim() || statusFilter === "saidas") return null;

    const groupsMap = new Map<string, ClienteGroup>();

    filtered.forEach(f => {
      if (f._is_saida) return;
      const clienteNome = getClientName(f.user_id, f.cliente_nome);
      const key = `${f.user_id}|${f.cliente_nome || ""}`;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, { key, clienteNome, userId: f.user_id, totalPendente: 0, totalPago: 0, countPendente: 0, faturas: [] });
      }
      const group = groupsMap.get(key)!;
      group.faturas.push(f);
      if (f.fatura_tipo === "pendente" && !["cancelado", "falta"].includes(f.status)) {
        group.totalPendente += Number(f.valor_fatura);
        group.countPendente++;
      } else if (f.fatura_tipo === "pagamento" && !f.is_extra) {
        group.totalPago += Number(f.valor_fatura);
      }
    });

    // Within each group: pending first, then paid, then cancelled
    groupsMap.forEach(group => {
      group.faturas.sort((a, b) => {
        const rank = (f: any) => {
          if (f.fatura_tipo === "pendente" && !["cancelado", "falta"].includes(f.status)) return 0;
          if (f.fatura_tipo === "pagamento") return 1;
          return 2;
        };
        return rank(a) - rank(b);
      });
    });

    // Sort groups: groups with pending first
    const groups = Array.from(groupsMap.values()).sort((a, b) => {
      if (a.countPendente > 0 && b.countPendente === 0) return -1;
      if (a.countPendente === 0 && b.countPendente > 0) return 1;
      return b.totalPendente - a.totalPendente;
    });

    const saidas = filtered.filter(f => f._is_saida);
    return { groups, saidas };
  }, [filtered, debouncedSearch, statusFilter, getClientName]);

  // ── Search flat view: pending first ───────────────────────────────────
  const searchSortedFaturas = useMemo(() => {
    if (!debouncedSearch.trim()) return filtered;
    return [...filtered].sort((a, b) => {
      const aPend = (a.fatura_tipo === "pendente" && !["cancelado", "falta"].includes(a.status)) ? 0 : 1;
      const bPend = (b.fatura_tipo === "pendente" && !["cancelado", "falta"].includes(b.status)) ? 0 : 1;
      if (aPend !== bPend) return aPend - bPend;
      return b.data_fatura.localeCompare(a.data_fatura);
    });
  }, [filtered, debouncedSearch]);

  // ── Distribution preview for "livre" mode ─────────────────────────────
  const payDistribuicaoPreview = useMemo(() => {
    if (payMode !== "livre" || !smartPayModal || !payValor.trim()) return [];
    const valor = parseCurrencyInput(payValor);
    if (valor <= 0) return [];
    const pendentes = [...smartPayModal.pendentes].sort((a, b) => a.restante - b.restante);
    let saldo = valor;
    const result: Array<{ servico: string; variacao: string; aPagar: number; quitada: boolean }> = [];
    for (const f of pendentes) {
      if (saldo <= 0.01) break;
      const aPagar = Math.min(saldo, f.restante);
      result.push({ servico: f.servico, variacao: f.variacao, aPagar, quitada: aPagar >= f.restante - 0.01 });
      saldo -= aPagar;
    }
    return result;
  }, [payMode, payValor, smartPayModal]);

  // ── Smart payment handler ──────────────────────────────────────────────
  const handleSmartPayment = async () => {
    if (!smartPayModal) return;
    if (!payForma) { toast.error("Selecione a forma de pagamento"); return; }
    const valor = parseCurrencyInput(payValor);
    if (!valor || valor <= 0) { toast.error("Informe um valor válido"); return; }
    if (payMode === "especifica" && paySelectedIds.length === 0) { toast.error("Selecione ao menos uma fatura para pagar"); return; }

    setPayLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const autorId = userRes?.user?.id || null;
      const autorNome = (userRes?.user?.user_metadata as any)?.nome || userRes?.user?.email || "Admin";
      const statusFromValor = (pago: number, total: number) =>
        pago <= 0 ? "nao_pago" : pago >= total ? "quitado" : "quitado_parcial";

      if (payMode === "especifica") {
        const faturasSelecionadas = smartPayModal.pendentes.filter(p => paySelectedIds.includes(p.id));
        if (faturasSelecionadas.length === 0) { toast.error("Faturas não encontradas"); setPayLoading(false); return; }
        let totalPago = 0;
        for (const fatura of faturasSelecionadas) {
          const valorPagar = Math.min(valor / faturasSelecionadas.length, fatura.restante);
          const novoValorPago = fatura.valorPago + valorPagar;
          const novoStatus = novoValorPago >= fatura.valor ? "concluido" : undefined;
          
          const updateData: any = {
            valor_pago: novoValorPago,
            forma_pagamento: payForma,
            paid_at: new Date().toISOString(),
          };
          if (novoStatus) updateData.status = novoStatus;

          const { error: err1 } = await supabase.from("agendamentos").update(updateData).eq("id", fatura.id);
          if (err1) throw err1;

          // Atualiza local imediatamente para UI refletir
          setLocalAgendamentos(prev => prev.map(a =>
            a.id === fatura.id ? { ...a, valor_pago: novoValorPago, forma_pagamento: payForma, ...(novoStatus ? { status: novoStatus } : {}) } : a
          ));

          // Histórico: tenta inserir mas não bloqueia se falhar
          const { error: err2 } = await supabase.from("pagamento_historico").insert({
            agendamento_id: fatura.id,
            status_anterior: statusFromValor(fatura.valorPago, fatura.valor),
            status_novo: statusFromValor(novoValorPago, fatura.valor),
            valor_anterior: fatura.valorPago, valor_novo: novoValorPago,
            valor_delta: valorPagar, total: fatura.valor, acao: "registro",
            autor_id: autorId, autor_nome: autorNome, observacao: payObs || "",
          });
          if (err2) console.warn("[pagamento_historico] insert failed:", err2.message);

          totalPago += valorPagar;
        }
        toast.success(`✅ ${formatCurrency(totalPago)} registrado em ${faturasSelecionadas.length} fatura(s)`);
      } else {
        // Distribute smallest → largest
        const pendentes = [...smartPayModal.pendentes].sort((a, b) => a.restante - b.restante);
        let saldo = valor;
        let count = 0;
        for (const fatura of pendentes) {
          if (saldo <= 0.01) break;
          const aPagar = Math.min(saldo, fatura.restante);
          const novoValorPago = fatura.valorPago + aPagar;
          const novoStatus = novoValorPago >= fatura.valor ? "concluido" : undefined;
          
          const updateData: any = {
            valor_pago: novoValorPago,
            forma_pagamento: payForma,
            paid_at: new Date().toISOString(),
          };
          if (novoStatus) updateData.status = novoStatus;

          const { error: err1 } = await supabase.from("agendamentos").update(updateData).eq("id", fatura.id);
          if (err1) throw err1;

          // Atualiza local imediatamente para UI refletir
          setLocalAgendamentos(prev => prev.map(a =>
            a.id === fatura.id ? { ...a, valor_pago: novoValorPago, forma_pagamento: payForma, ...(novoStatus ? { status: novoStatus } : {}) } : a
          ));

          // Histórico: tenta inserir mas não bloqueia se falhar
          const { error: err2 } = await supabase.from("pagamento_historico").insert({
            agendamento_id: fatura.id,
            status_anterior: statusFromValor(fatura.valorPago, fatura.valor),
            status_novo: statusFromValor(novoValorPago, fatura.valor),
            valor_anterior: fatura.valorPago, valor_novo: novoValorPago,
            valor_delta: aPagar, total: fatura.valor, acao: "registro",
            autor_id: autorId, autor_nome: autorNome, observacao: payObs || "",
          });
          if (err2) console.warn("[pagamento_historico] insert failed:", err2.message);

          saldo -= aPagar;
          count++;
        }
        toast.success(`✅ ${formatCurrency(valor)} distribuído em ${count} fatura(s) de ${smartPayModal.clienteNome}`);
      }

      setSmartPayModal(null);
      setPayValor(""); setPayForma("pix"); setPayObs(""); setPaySelectedIds([]);
      // Força refetch local fresco do banco (sem depender do ciclo do pai)
      setHistorico([]);
      setRefetchKey(k => k + 1);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao registrar pagamento");
    } finally {
      setPayLoading(false);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    sortField === field
      ? sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3 opacity-30" />
  );

  // ── Fatura card renderer ───────────────────────────────────────────────
  const renderFaturaCard = (ag: any) => {
    const isPendingAmount = ag.fatura_tipo === "pendente" && !["cancelado", "falta"].includes(ag.status);
    const cfg = isPendingAmount ? statusConfig.pendente : (statusConfig[ag.status] || statusConfig.pendente);
    const StatusIcon = cfg.icon;
    const isExpanded = expandedId === ag._faturaId;
    const isPartial = !!ag._is_partial;

    return (
      <div
        className={`rounded-2xl border overflow-hidden transition-all ${
          ag._is_saida
            ? "border-red-500/20 bg-gradient-to-br from-red-500/[0.08] via-primary-foreground/[0.02] to-red-500/[0.02] hover:border-red-500/40 hover:shadow-[0_4px_16px_-8px_rgba(239,68,68,0.3)]"
            : isPendingAmount
            ? "border-amber-500/40 bg-gradient-to-br from-amber-500/[0.08] via-primary-foreground/[0.02] to-amber-500/[0.04] hover:border-amber-500/60 hover:shadow-[0_4px_16px_-8px_rgba(245,158,11,0.4)]"
            : "border-gold/15 bg-gradient-to-br from-gold/[0.05] via-primary-foreground/[0.02] to-nude/[0.03] hover:border-gold/25 hover:shadow-[0_4px_16px_-8px_hsl(var(--gold)/0.25)]"
        }`}
      >
        <button
          onClick={() => setExpandedId(isExpanded ? null : ag._faturaId)}
          className="flex w-full items-center gap-3 p-4 text-left"
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.bg} border shadow-[0_2px_8px_-4px_hsl(var(--gold)/0.2)]`}>
            <StatusIcon className={`h-4 w-4 ${cfg.text}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-body text-[14px] font-medium text-primary-foreground truncate">
                {ag._is_saida ? ag.cliente_nome : getClientName(ag.user_id, ag.cliente_nome)}
              </p>
              {ag._is_despesa && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  ag._despesa_tipo === "comissao" ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                  : ag._despesa_tipo === "estudio" ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "bg-rose/20 border-rose/40 text-rose"
                }`}>
                  {ag._despesa_tipo === "comissao" ? "👤 Retirada (Comissão)" : ag._despesa_tipo === "estudio" ? "📦 Registro de Gasto" : "🏛 Pagamento de Despesa"}
                </span>
              )}
              {ag._is_venda && (
                <span className="inline-flex items-center gap-1 rounded-full border bg-sky-500/20 border-sky-500/40 text-sky-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">🛒 Venda</span>
              )}
              {isPendingAmount && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300 animate-pulse">
                  <AlertCircle className="h-2.5 w-2.5" /> A receber
                </span>
              )}
              {isPartial && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  ag.is_extra ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                  : isPendingAmount ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                }`}>
                  <Wallet className="h-2.5 w-2.5" />
                  {ag._desc_pagamento || (isPendingAmount ? "Restante Parcial" : "Fatura Paga")}
                </span>
              )}
            </div>
            <p className="font-body text-[11px] text-primary-foreground/75 truncate">
              {ag.servico}{ag.variacao ? ` · ${ag.variacao}` : ""} · {formatDate(ag.data_fatura)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            {Number(ag.valor_desconto_credito) > 0 && !ag._is_saida && !ag.is_extra && ag.valor_fatura === Number(ag.valor) ? (
              <div className="flex flex-col items-end">
                <p className="font-heading text-[15px] font-bold text-green-400">{formatCurrency(Math.max(0, ag.valor_fatura - Number(ag.valor_desconto_credito)))}</p>
                <p className="font-heading text-[10px] font-medium text-primary-foreground/75 line-through">{formatCurrency(ag.valor_fatura)}</p>
              </div>
            ) : (
              <p className={`font-heading text-[15px] font-bold ${ag._is_saida ? "text-red-400" : isPendingAmount ? "text-amber-300" : "text-gold"}`}>
                {ag._is_saida && "-"} {formatCurrency(ag.valor_fatura)}
              </p>
            )}
            <div className="flex items-center justify-end gap-1">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-body text-[9px] font-bold uppercase tracking-wider border relative ${
                isPendingAmount ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                : ag._is_saida ? "bg-red-500/10 text-red-400 border-red-500/30"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              }`}>
                <span className={`absolute inset-0 rounded-full animate-pulse border ${isPendingAmount ? "border-amber-500/50" : ag._is_saida ? "border-red-500/50" : "border-emerald-500/50"}`} />
                <StatusIcon className="h-3 w-3 relative z-10" />
                <span className="relative z-10">{isPendingAmount ? "Pendente" : (ag._is_saida && ag._despesa_tipo === "comissao" ? "Retirado" : "Pago")}</span>
              </span>
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 text-primary-foreground/95 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </button>

        {isExpanded && (
          <div className="border-t border-primary-foreground/[0.06] bg-primary-foreground/[0.02] px-4 py-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Detail label={ag._is_saida ? "ID da Despesa" : "ID do Pedido (Original)"} value={ag.id.slice(0, 8) + "..."} />
              <Detail label={ag._is_saida ? "Data do Gasto" : "Data Base do Agend."} value={`${formatDate(ag.data_agendamento || ag.data_fatura)}${ag.horario !== "00:00" ? ` às ${ag.horario}` : ""}`} />
              {(ag.variacao || ag.observacao) && <Detail label="Detalhes / Origem" value={ag.variacao || ag.observacao} />}
              <Detail label="Método de Pagamento" value={
                <span className="flex items-center gap-1.5">
                  {(() => {
                    const getMethod = () => {
                      if (ag.forma_pagamento && ag.forma_pagamento.includes("|")) {
                        const parts = ag.forma_pagamento.split("|");
                        for (const p of parts) { const [m, v] = p.split(":"); if (Number(v) === ag.valor_fatura) return m; }
                      }
                      return ag.forma_pagamento;
                    };
                    const method = getMethod();
                    return <>{paymentIcon(method)}{paymentLabel(method)}</>;
                  })()}
                </span>
              } />
              {!ag._is_saida && !ag._is_venda && <Detail label="Duração" value={`${ag.duracao_minutos} min`} />}
              <Detail label={ag._is_saida ? "Valor da Saída" : "Valor Desta Fatura"} value={formatCurrency(ag.valor_fatura)} />
              {!ag._is_saida && <Detail label="Valor Total Original" value={
                Number(ag.valor_desconto_credito) > 0 ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-primary-foreground/75 text-[12px] line-through">{formatCurrency(ag.valor || ag.valor_fatura)}</span>
                    <span className="text-green-400 font-bold">{formatCurrency(Math.max(0, Number(ag.valor || ag.valor_fatura) - Number(ag.valor_desconto_credito)))}</span>
                  </div>
                ) : formatCurrency(ag.valor || ag.valor_fatura)
              } />}
              <Detail label={ag._is_saida ? "Status" : "Status da Fatura"} value={
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-body text-[9px] font-bold uppercase tracking-wider border relative ${
                  isPendingAmount ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  : ag._is_saida ? "bg-red-500/10 text-red-400 border-red-500/30"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                }`}>
                  <span className={`absolute inset-0 rounded-full animate-pulse border ${isPendingAmount ? "border-amber-500/50" : ag._is_saida ? "border-red-500/50" : "border-emerald-500/50"}`} />
                  <StatusIcon className="h-3 w-3 relative z-10" />
                  <span className="relative z-10">{isPendingAmount ? "Pendente" : (ag._is_saida && ag._despesa_tipo === "comissao" ? "Retirado" : "Pago")}</span>
                </span>
              } />
              {!ag._is_saida && !ag._is_venda && ag.status && <Detail label="Status do Serviço" value={ag.status.charAt(0).toUpperCase() + ag.status.slice(1)} />}
              {Number(ag.valor_desconto_credito) > 0 && <Detail label="Desc. de Crédito Utilizado" value={<span className="text-amber-400">- {formatCurrency(Number(ag.valor_desconto_credito))}</span>} />}
              {Number(ag.valor_gorjeta) > 0 && <Detail label="Gorjeta" value={<span className="text-purple-400">{formatCurrency(Number(ag.valor_gorjeta))}</span>} />}
              {Number(ag.valor_troco) > 0 && <Detail label="Troco Pago" value={<span className="text-blue-400">{formatCurrency(Number(ag.valor_troco))}</span>} />}
              {Number(ag.valor_credito) > 0 && <Detail label="Crédito Concedido" value={<span className="text-green-400">{formatCurrency(Number(ag.valor_credito))}</span>} />}
            </div>
            {ag._historico_obs && ag._historico_obs.trim() && (
              <div className="flex items-start gap-2 rounded-xl border border-gold/25 bg-gold/[0.06] px-3 py-2.5">
                <span className="text-[13px] shrink-0">📝</span>
                <div>
                  <p className="font-body text-[9px] text-gold/70 uppercase tracking-wider mb-0.5">Observação do Pagamento</p>
                  <p className="font-body text-[12px] text-primary-foreground/85 leading-snug">{ag._historico_obs}</p>
                </div>
              </div>
            )}
            <div className="pt-2 border-t border-primary-foreground/[0.05] flex justify-end gap-2">
              {onEdit && !ag._is_saida && !ag._is_venda && !ag._faturaId?.includes("-hist-") && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(ag); }}
                  className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 font-body text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (ag._faturaId?.includes("-hist-")) {
                    handleDeleteHistorico(ag);
                  } else {
                    handleDelete(ag.id, ag._is_saida ? "despesas" : ag._is_venda ? "vendas" : "agendamentos");
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 font-body text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> {ag._faturaId?.includes("-hist-") ? "Reverter" : "Excluir"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const EmptyState = () => (
    <div className="py-12 text-center">
      <CreditCard className="mx-auto h-8 w-8 text-primary-foreground/10 mb-2" />
      <p className="font-body text-[13px] text-primary-foreground/95">Nenhum pagamento encontrado</p>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.12] via-emerald-500/[0.05] to-transparent p-4 shadow-[0_4px_16px_-8px_hsl(142_76%_45%/0.3)]">
          <p className="font-body text-[10px] text-emerald-400/70 uppercase tracking-wider">Total Recebido</p>
          <p className="font-heading text-lg font-bold text-emerald-400 mt-1">{formatCurrency(totalPago)}</p>
        </div>
        <div className="rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/[0.12] via-sky-500/[0.05] to-transparent p-4 shadow-[0_4px_16px_-8px_hsl(199_89%_48%/0.3)]">
          <p className="font-body text-[10px] text-sky-400/70 uppercase tracking-wider">Saldo Líquido</p>
          <p className="font-heading text-lg font-bold text-sky-400 mt-1">{formatCurrency(saldoLiquido)}</p>
          {totalDespesas > 0 && <p className="font-body text-[9px] text-rose/70 mt-0.5">-{formatCurrency(totalDespesas)} em despesas</p>}
        </div>
        <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.12] via-amber-500/[0.05] to-transparent p-4 shadow-[0_4px_16px_-8px_hsl(38_92%_50%/0.3)]">
          <p className="font-body text-[10px] text-amber-400/70 uppercase tracking-wider">Pendente</p>
          <p className="font-heading text-lg font-bold text-amber-400 mt-1">{formatCurrency(totalPendente)}</p>
        </div>
      </div>

      {/* Search & Date Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/95" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, serviço, ID..."
            className="w-full rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] pl-10 pr-4 py-3 text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/85 focus:outline-none focus:ring-2 focus:ring-gold/20"
          />
        </div>
        <div className="w-full sm:w-auto flex items-center gap-2">
          <div className="relative flex-1 sm:w-40">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] px-4 py-3 text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20 [color-scheme:dark]"
            />
          </div>
          {dateFilter && (
            <button onClick={() => setDateFilter("")} className="p-3 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] hover:bg-primary-foreground/[0.1] transition-colors shrink-0" title="Limpar data">
              <XCircle className="h-4 w-4 text-primary-foreground/80" />
            </button>
          )}
        </div>
      </div>

      {/* Status filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        <Filter className="h-3.5 w-3.5 shrink-0 text-primary-foreground/95" />
        {(["todos", "pendente", "confirmado", "concluido", "cancelado", "falta", "saidas"] as StatusFilter[]).map((s) => {
          const colors: Record<StatusFilter, { active: string; inactive: string }> = {
            todos: { active: "bg-gold/15 text-gold border-gold/40", inactive: "bg-gold/[0.04] text-gold/60 border-gold/20 hover:bg-gold/10 hover:text-gold/80" },
            pendente: { active: "bg-amber-500/15 text-amber-400 border-amber-500/40", inactive: "bg-amber-500/[0.05] text-amber-400/70 border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-400" },
            confirmado: { active: "bg-blue-500/15 text-blue-400 border-blue-500/40", inactive: "bg-blue-500/[0.05] text-blue-400/70 border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-400" },
            concluido: { active: "bg-green-500/15 text-green-400 border-green-500/40", inactive: "bg-green-500/[0.05] text-green-400/70 border-green-500/20 hover:bg-green-500/10 hover:text-green-400" },
            cancelado: { active: "bg-red-500/15 text-red-400 border-red-500/40", inactive: "bg-red-500/[0.05] text-red-400/70 border-red-500/20 hover:bg-red-500/10 hover:text-red-400" },
            falta: { active: "bg-orange-500/15 text-orange-400 border-orange-500/40", inactive: "bg-orange-500/[0.05] text-orange-400/70 border-orange-500/20 hover:bg-orange-500/10 hover:text-orange-400" },
            saidas: { active: "bg-rose/15 text-rose border-rose/40", inactive: "bg-rose/[0.05] text-rose/70 border-rose/20 hover:bg-rose/10 hover:text-rose" },
          };
          const c = colors[s];
          return (
            <button key={s} onClick={() => setStatusFilter(s)} className={`shrink-0 rounded-lg px-3 py-1.5 font-body text-[11px] font-medium border transition-all ${statusFilter === s ? c.active : c.inactive}`}>
              {s === "todos" ? "Todos" : s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
            </button>
          );
        })}
      </div>

      {/* Sort bar */}
      <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <span className="font-body text-[10px] text-primary-foreground/95 shrink-0">Ordenar:</span>
        {([{ field: "data" as SortField, label: "Data" }, { field: "valor" as SortField, label: "Valor" }, { field: "cliente" as SortField, label: "Cliente" }, { field: "status" as SortField, label: "Status" }]).map((s) => (
          <button key={s.field} onClick={() => toggleSort(s.field)} className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 font-body text-[11px] transition-all ${sortField === s.field ? "text-gold" : "text-primary-foreground/95"}`}>
            {s.label} <SortIcon field={s.field} />
          </button>
        ))}
      </div>

      {/* ── CLIENT SUMMARY CARD (when searching) ────────────────────────── */}
      {clienteSummary && (
        <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/[0.10] via-amber-500/[0.05] to-transparent p-4 shadow-[0_8px_32px_-8px_hsl(var(--gold)/0.35)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center shrink-0 shadow-[0_0_12px_hsl(var(--gold)/0.3)]">
                  <Users className="h-4 w-4 text-gold" />
                </div>
                <div>
                  <p className="font-body text-[9px] text-gold/60 uppercase tracking-wider">Cliente</p>
                  <p className="font-heading text-[16px] font-bold text-primary-foreground leading-tight">{clienteSummary.clienteNome}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-amber-500/[0.10] border border-amber-500/25 p-2.5">
                  <p className="font-body text-[9px] text-amber-400/70 uppercase tracking-wider">Deve ao estúdio</p>
                  <p className="font-heading text-[16px] font-bold text-amber-300 mt-0.5">{formatCurrency(clienteSummary.totalPendente)}</p>
                  {clienteSummary.pendentes.length > 0 && (
                    <p className="font-body text-[9px] text-amber-400/60 mt-0.5">{clienteSummary.pendentes.length} fatura{clienteSummary.pendentes.length > 1 ? "s" : ""}</p>
                  )}
                </div>
                <div className="rounded-xl bg-emerald-500/[0.10] border border-emerald-500/25 p-2.5">
                  <p className="font-body text-[9px] text-emerald-400/70 uppercase tracking-wider">Já pagou</p>
                  <p className="font-heading text-[16px] font-bold text-emerald-400 mt-0.5">{formatCurrency(clienteSummary.totalPago)}</p>
                </div>
              </div>
            </div>

            {clienteSummary.pendentes.length > 0 && (
              <button
                onClick={() => {
                  setSmartPayModal({ clienteNome: clienteSummary.clienteNome, pendentes: clienteSummary.pendentes });
                  setPayMode("livre"); setPayValor(""); setPayForma("pix"); setPayObs(""); setPaySelectedIds([]);
                }}
                className="shrink-0 flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/35 hover:bg-amber-500/18 hover:border-amber-400/55 px-3.5 py-2.5 transition-all hover:shadow-[0_0_18px_-6px_rgba(245,158,11,0.5)] active:scale-95 group"
              >
                <Wallet className="h-4 w-4 text-amber-300 group-hover:text-amber-200 transition-colors shrink-0" />
                <div className="text-left">
                  <p className="font-body text-[10px] font-bold text-amber-200 uppercase tracking-wider leading-none">Registrar</p>
                  <p className="font-body text-[9px] text-amber-400/70 leading-none mt-0.5">pagamento</p>
                </div>
              </button>
            )}
          </div>

          {/* Pending invoices list */}
          {clienteSummary.pendentes.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gold/[0.12] space-y-1.5">
              <p className="font-body text-[9px] text-gold/50 uppercase tracking-wider mb-2">⚠ Faturas pendentes</p>
              {clienteSummary.pendentes.map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-xl bg-amber-500/[0.07] border border-amber-500/20 px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-body text-[12px] text-primary-foreground/90 truncate font-medium">{p.servico}{p.variacao ? ` · ${p.variacao}` : ""}</p>
                    <p className="font-body text-[10px] text-primary-foreground/45">{formatDate(p.data)}</p>
                  </div>
                  <span className="font-heading text-[13px] font-bold text-amber-300 shrink-0 ml-3">{formatCurrency(p.restante)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PAYMENT LIST ──────────────────────────────────────────────────── */}
      <div className="space-y-2">

        {/* GROUPED VIEW (no search, no saidas-only) */}
        {groupedFaturas && (
          <>
            {groupedFaturas.groups.length === 0 && groupedFaturas.saidas.length === 0 && <EmptyState />}

            {groupedFaturas.groups.map(group => {
              const isExpandedGroup = expandedGroups.has(group.key);
              return (
                <div key={group.key} className="space-y-1.5">
                  {/* Group header */}
                  <div className="flex items-center gap-2 rounded-xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.07] hover:border-primary-foreground/[0.12] transition-all overflow-hidden">
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className="flex items-center gap-2.5 px-3 py-2.5 flex-1 min-w-0 text-left"
                    >
                      <div className="w-7 h-7 rounded-full bg-gold/12 border border-gold/25 flex items-center justify-center shrink-0">
                        <Users className="h-3.5 w-3.5 text-gold/80" />
                      </div>
                      <span className="font-body text-[13px] font-semibold text-primary-foreground flex-1 text-left truncate">{group.clienteNome}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {group.totalPendente > 0 && (
                          <span className="font-heading text-[12px] font-bold text-amber-300">{formatCurrency(group.totalPendente)}</span>
                        )}
                        {group.countPendente > 0 ? (
                          <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 font-body text-[9px] font-bold text-amber-300">
                            {group.countPendente} pendente{group.countPendente > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 font-body text-[9px] font-bold text-emerald-400">Em dia ✓</span>
                        )}
                        <ChevronDown className={`h-4 w-4 text-primary-foreground/50 transition-transform duration-200 ${!isExpandedGroup ? "" : "rotate-180"}`} />
                      </div>
                    </button>

                    {group.countPendente > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const pendentes: FaturaPendente[] = group.faturas
                            .filter(f => f.fatura_tipo === "pendente" && !["cancelado", "falta"].includes(f.status))
                            .map(f => ({
                              id: f.id,
                              servico: f.servico,
                              variacao: f.variacao || "",
                              valor: Number(f.valor),
                              valorPago: Number(f.valor_pago || 0) + Number(f.valor_desconto_credito || 0),
                              restante: Number(f.valor_fatura),
                              data: f.data_fatura,
                            }));
                          setSmartPayModal({ clienteNome: group.clienteNome, pendentes });
                          setPayMode("livre"); setPayValor(""); setPayForma("pix"); setPayObs(""); setPaySelectedIds([]);
                        }}
                        className="shrink-0 flex items-center gap-1.5 border-l border-primary-foreground/[0.07] px-3 py-2.5 hover:bg-amber-500/10 transition-all group"
                        title="Registrar pagamento"
                      >
                        <Wallet className="h-4 w-4 text-amber-400/70 group-hover:text-amber-300 transition-colors" />
                        <span className="font-body text-[9px] font-bold text-amber-400/70 group-hover:text-amber-300 uppercase tracking-wider transition-colors hidden sm:block">Pagar</span>
                      </button>
                    )}
                  </div>

                  {/* Group faturas */}
                  {isExpandedGroup && (
                    <div className="space-y-1.5 pl-2 border-l border-primary-foreground/[0.06] ml-3">
                      {group.faturas.map(ag => (
                        <div key={ag._faturaId}>{renderFaturaCard(ag)}</div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Saidas section in grouped view */}
            {groupedFaturas.saidas.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-red-500/20" />
                  <span className="font-body text-[9px] text-red-400/60 uppercase tracking-wider shrink-0">📤 Saídas ({groupedFaturas.saidas.length})</span>
                  <div className="flex-1 h-px bg-red-500/20" />
                </div>
                {groupedFaturas.saidas.map(ag => (
                  <div key={ag._faturaId}>{renderFaturaCard(ag)}</div>
                ))}
              </div>
            )}
          </>
        )}

        {/* FLAT VIEW (searching OR saidas filter) */}
        {!groupedFaturas && (
          <>
            {searchSortedFaturas.length === 0 && <EmptyState />}

            {/* Pending divider when searching */}
            {debouncedSearch.trim() && searchSortedFaturas.some(f => f.fatura_tipo === "pendente" && !["cancelado", "falta"].includes(f.status)) && (
              <div className="flex items-center gap-2 pb-0.5">
                <div className="flex-1 h-px bg-amber-500/25" />
                <span className="font-body text-[9px] text-amber-400/60 uppercase tracking-wider shrink-0">⚠ Pendências</span>
                <div className="flex-1 h-px bg-amber-500/25" />
              </div>
            )}

            {searchSortedFaturas.map((ag, idx) => {
              const isPend = ag.fatura_tipo === "pendente" && !["cancelado", "falta"].includes(ag.status);
              const prevIsPend = idx > 0 && searchSortedFaturas[idx - 1].fatura_tipo === "pendente" && !["cancelado", "falta"].includes(searchSortedFaturas[idx - 1].status);
              const showPaidDivider = !!debouncedSearch.trim() && !isPend && prevIsPend;

              return (
                <div key={ag._faturaId}>
                  {showPaidDivider && (
                    <div className="flex items-center gap-2 py-1.5">
                      <div className="flex-1 h-px bg-emerald-500/20" />
                      <span className="font-body text-[9px] text-emerald-400/60 uppercase tracking-wider shrink-0">✓ Pagamentos</span>
                      <div className="flex-1 h-px bg-emerald-500/20" />
                    </div>
                  )}
                  {renderFaturaCard(ag)}
                </div>
              );
            })}
          </>
        )}
      </div>

      {(hasMoreVendas || hasMoreDespesas) && (
        <div className="pt-2 pb-4 flex justify-center">
          <Button
            onClick={() => {
              if (hasMoreVendas) setVendasLimit((prev) => prev + 1000);
              if (hasMoreDespesas) setDespesasLimit((prev) => prev + 1000);
            }}
            variant="outline"
            className="rounded-2xl border-gold/20 text-gold hover:bg-gold/10 hover:text-gold/90 px-6 font-body text-[13px] font-medium"
          >
            Carregar histórico anterior
          </Button>
        </div>
      )}

      <p className="text-center font-body text-[11px] text-primary-foreground/85 pb-4">
        Exibindo {filtered.length} faturas de {localAgendamentos.length} pedidos
      </p>

      {/* ── SMART PAYMENT MODAL ───────────────────────────────────────────── */}
      {smartPayModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => !payLoading && setSmartPayModal(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-gold/25 bg-[hsl(var(--primary))] shadow-[0_24px_64px_-12px_hsl(var(--gold)/0.45)] overflow-hidden max-h-[92vh] flex flex-col">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-primary-foreground/[0.07] bg-gradient-to-r from-gold/[0.08] to-transparent">
              <div>
                <p className="font-body text-[9px] text-gold/60 uppercase tracking-wider">Registrar Pagamento</p>
                <p className="font-heading text-[15px] font-bold text-primary-foreground">{smartPayModal.clienteNome}</p>
                <p className="font-body text-[11px] text-amber-300/80 mt-0.5">
                  Total devendo: {formatCurrency(smartPayModal.pendentes.reduce((s, p) => s + p.restante, 0))}
                </p>
              </div>
              <button onClick={() => !payLoading && setSmartPayModal(null)} className="p-2 rounded-xl hover:bg-primary-foreground/[0.08] transition-colors">
                <X className="h-4 w-4 text-primary-foreground/50" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Mode selector */}
              <div>
                <p className="font-body text-[10px] text-primary-foreground/80 uppercase tracking-wider mb-2">Como deseja pagar?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPayMode("livre")}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 transition-all ${
                      payMode === "livre"
                        ? "bg-gold/15 border-gold/50 text-white shadow-[0_4px_12px_-4px_hsl(var(--gold)/0.3)]"
                        : "bg-primary-foreground/[0.04] border-primary-foreground/[0.08] text-white hover:border-primary-foreground/30"
                    }`}
                  >
                    <Zap className="h-4 w-4" />
                    <span className="font-body text-[10px] font-bold uppercase tracking-wider">Valor Total</span>
                    <span className="font-body text-[9px] opacity-85 text-center leading-tight">Distribui do menor<br/>ao maior débito</span>
                  </button>
                  <button
                    onClick={() => setPayMode("especifica")}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 transition-all ${
                      payMode === "especifica"
                        ? "bg-gold/15 border-gold/50 text-white shadow-[0_4px_12px_-4px_hsl(var(--gold)/0.3)]"
                        : "bg-primary-foreground/[0.04] border-primary-foreground/[0.08] text-white hover:border-primary-foreground/30"
                    }`}
                  >
                    <ListChecks className="h-4 w-4" />
                    <span className="font-body text-[10px] font-bold uppercase tracking-wider">Por Fatura</span>
                    <span className="font-body text-[9px] opacity-85 text-center leading-tight">Escolha qual<br/>fatura pagar</span>
                  </button>
                </div>
              </div>

              {/* Specific invoice selector */}
              {payMode === "especifica" && (
                <div className="space-y-2">
                  <p className="font-body text-[10px] text-primary-foreground/80 uppercase tracking-wider">Selecione a fatura</p>
                  {smartPayModal.pendentes.map(p => {
                    const isSelected = paySelectedIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          const nextIds = paySelectedIds.includes(p.id)
                            ? paySelectedIds.filter(id => id !== p.id)
                            : [...paySelectedIds, p.id];
                          setPaySelectedIds(nextIds);
                          
                          const total = smartPayModal.pendentes
                            .filter(f => nextIds.includes(f.id))
                            .reduce((s, f) => s + f.restante, 0);
                          setPayValor(total > 0 ? total.toFixed(2).replace(".", ",") : "");
                        }}
                        className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 transition-all text-left ${
                          isSelected
                            ? "bg-amber-500/20 border-amber-400/70 shadow-[0_0_16px_-4px_rgba(245,158,11,0.4)] ring-1 ring-amber-400/30"
                            : "bg-primary-foreground/[0.03] border-primary-foreground/[0.08] hover:border-primary-foreground/20"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className={`font-body text-[12px] font-medium truncate ${
                            isSelected ? "text-amber-200" : "text-primary-foreground"
                          }`}>{p.servico}{p.variacao ? ` · ${p.variacao}` : ""}</p>
                          <p className={`font-body text-[10px] ${
                            isSelected ? "text-amber-300/70" : "text-primary-foreground/65"
                          }`}>{formatDate(p.data)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span className="font-heading text-[14px] font-bold text-amber-300">{formatCurrency(p.restante)}</span>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? "bg-emerald-500 border-emerald-400"
                              : "border-primary-foreground/25 bg-transparent"
                          }`}>
                            {isSelected && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {paySelectedIds.length > 0 && (
                    <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-3 py-2 mt-1">
                      <span className="font-body text-[11px] text-emerald-300">{paySelectedIds.length} fatura(s) selecionada(s)</span>
                      <button
                        onClick={() => {
                          const total = smartPayModal.pendentes
                            .filter(p => paySelectedIds.includes(p.id))
                            .reduce((s, p) => s + p.restante, 0);
                          setPayValor(total.toFixed(2).replace(".", ","));
                        }}
                        className="font-body text-[11px] font-bold text-emerald-300 underline underline-offset-2"
                      >
                        Sugerir total: {formatCurrency(smartPayModal.pendentes.filter(p => paySelectedIds.includes(p.id)).reduce((s, p) => s + p.restante, 0))}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Amount input */}
              <div>
                <label className="font-body text-[10px] text-primary-foreground/80 uppercase tracking-wider mb-1.5 block">
                  {payMode === "livre" ? "Valor Recebido" : "Valor a Pagar"}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-body text-[13px] text-primary-foreground/75 font-medium">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={payValor}
                    onChange={(e) => setPayValor(e.target.value)}
                    placeholder="0,00"
                    className="w-full rounded-xl bg-primary-foreground/[0.06] border border-primary-foreground/[0.12] pl-10 pr-4 py-3.5 text-primary-foreground font-heading text-[20px] font-bold placeholder:text-primary-foreground/45 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/40"
                  />
                </div>
              </div>

              {/* Distribution preview */}
              {payMode === "livre" && payDistribuicaoPreview.length > 0 && (
                <div className="rounded-xl border border-gold/20 bg-gold/[0.05] p-3 space-y-2">
                  <p className="font-body text-[9px] text-gold/60 uppercase tracking-wider">⚡ Distribuição automática</p>
                  {payDistribuicaoPreview.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${item.quitada ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                          {item.quitada ? "✓" : "~"}
                        </span>
                        <p className="font-body text-[11px] text-primary-foreground/80 truncate">{item.servico}{item.variacao ? ` · ${item.variacao}` : ""}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-heading text-[12px] font-bold ${item.quitada ? "text-emerald-400" : "text-amber-300"}`}>{formatCurrency(item.aPagar)}</span>
                        {item.quitada && <span className="font-body text-[9px] text-emerald-400/60 ml-1">QUITADA</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Payment method */}
              <div>
                <label className="font-body text-[10px] text-primary-foreground/80 uppercase tracking-wider mb-1.5 block">Forma de Pagamento</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "pix", label: "PIX", icon: <img src={pixIcon} alt="PIX" className="h-4 w-4" /> },
                    { value: "cartao", label: "Cartão", icon: <CreditCard className="h-4 w-4" /> },
                    { value: "dinheiro", label: "Dinheiro", icon: <DollarSign className="h-4 w-4" /> },
                    // boleto removido
                  ].map(m => (
                    <button
                      key={m.value}
                      onClick={() => setPayForma(m.value)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border py-2.5 transition-all ${
                        payForma === m.value
                          ? "bg-gold/15 border-gold/50 text-gold"
                          : "bg-primary-foreground/[0.04] border-primary-foreground/[0.08] text-primary-foreground/85 hover:border-primary-foreground/30"
                      }`}
                    >
                      {m.icon}
                      <span className="font-body text-[9px] font-bold">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Observation */}
              <div>
                <label className="font-body text-[10px] text-primary-foreground/80 uppercase tracking-wider mb-1.5 block">Observação (opcional)</label>
                <input
                  type="text"
                  value={payObs}
                  onChange={(e) => setPayObs(e.target.value)}
                  placeholder="Ex: Sinal da tatuagem, parcela 1..."
                  className="w-full rounded-xl bg-primary-foreground/[0.06] border border-primary-foreground/[0.12] px-4 py-2.5 text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/45 focus:outline-none focus:ring-2 focus:ring-gold/30"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-primary-foreground/[0.07]">
              <button
                onClick={() => !payLoading && setSmartPayModal(null)}
                className="flex-1 rounded-xl border border-primary-foreground/[0.15] bg-primary-foreground/[0.06] py-3 font-body text-[13px] font-bold text-primary-foreground/90 hover:bg-primary-foreground/[0.10] transition-colors disabled:opacity-50"
                disabled={payLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleSmartPayment}
                disabled={payLoading || !payValor.trim() || !payForma}
                className="flex-1 rounded-xl bg-gold/20 border border-gold/50 py-3 font-body text-[13px] font-bold text-gold hover:bg-gold/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_16px_-4px_hsl(var(--gold)/0.3)]"
              >
                {payLoading ? "Registrando..." : "✅ Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Detail = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="font-body text-[10px] text-primary-foreground/95">{label}</p>
    <div className="font-body text-[12px] text-primary-foreground/80 mt-0.5">{value}</div>
  </div>
);

export default PagamentosTab;
