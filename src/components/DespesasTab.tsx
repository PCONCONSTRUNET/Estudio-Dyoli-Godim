import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Save, X, Trash2, Check, AlertTriangle, Clock, Bell, ChevronRight } from "lucide-react";
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-primary-foreground lg:hidden">Despesas</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-xl bg-gold/10 px-3 py-2 font-body text-[12px] font-medium text-gold transition-all hover:bg-gold/20"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </button>
      </div>

      {/* Alert banner */}
      {alertCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
          <p className="font-body text-[12px] text-yellow-300">
            Você tem <strong>{alertCount}</strong> despesa{alertCount > 1 ? "s" : ""} que precisa{alertCount > 1 ? "m" : ""} de atenção!
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.03] p-3">
          <p className="font-body text-[10px] text-primary-foreground/40 uppercase tracking-wider">Pendente</p>
          <p className="font-heading text-lg font-bold text-red-400 mt-0.5">{formatCurrency(totalPendente)}</p>
        </div>
        <div className="rounded-xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.03] p-3">
          <p className="font-body text-[10px] text-primary-foreground/40 uppercase tracking-wider">Pago</p>
          <p className="font-heading text-lg font-bold text-green-400 mt-0.5">{formatCurrency(totalPago)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {([
          { value: "todas", label: "Todas" },
          { value: "atrasadas", label: "Atrasadas" },
          { value: "pendentes", label: "A vencer" },
          { value: "pagas", label: "Pagas" },
        ] as const).map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-full border px-3 py-1.5 font-body text-[11px] font-medium transition-all ${
              filter === f.value
                ? "bg-gold/10 text-gold border-gold/20"
                : "bg-primary-foreground/[0.03] text-primary-foreground/40 border-primary-foreground/[0.06] hover:text-primary-foreground/60"
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
                    <button
                      onClick={() => deleteDespesa(d.id)}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 bg-primary-foreground/[0.06] text-primary-foreground/30 border-primary-foreground/[0.1] transition-all shadow-sm hover:bg-rose/15 hover:text-rose hover:border-rose/30 hover:shadow-rose/10"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
