import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ShoppingCart, TrendingDown, Calendar, Save, Pencil,
  Sparkles, PackageOpen, Tag, AlertCircle,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BinButton from "@/components/ui/bin-button";
import PlusButton from "@/components/ui/plus-button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Gasto {
  id: string;
  descricao: string;
  valor: number;
  categoria: string;
  responsavel: "Dona" | "Zelia";
  data_gasto: string;
  observacao: string | null;
  created_at: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const CATEGORIAS = [
  "Mercado",
  "Gasolina",
  "Padaria",
  "Lanches",
  "Cigarro",
  "Farmácia",
  "Crianças",
  "Lojas",
  "Outros",
];

const CATEGORIA_COLORS: Record<string, string> = {
  "Mercado":  "#f59e0b",
  "Gasolina": "#3b82f6",
  "Padaria":  "#ec4899",
  "Lanches":  "#10b981",
  "Cigarro":  "#a855f7",
  "Farmácia": "#f97316",
  "Crianças": "#06b6d4",
  "Lojas":    "#6366f1",
  "Outros":   "#94a3b8",
};

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });

const formatTime = (d: string) => {
  try {
    return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

const MONTHS_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];



// ─── Componente principal ─────────────────────────────────────────────────────
const GastosTab = () => {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filtros
  const [catFilter, setCatFilter] = useState("Todas");
  const [monthOffset, setMonthOffset] = useState(0);
  const [responsavelFilter, setResponsavelFilter] = useState<"Dona" | "Zelia">("Dona");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);

  // Form
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("Outros");
  const [categoriaPersonalizada, setCategoriaPersonalizada] = useState("");
  const [responsavelForm, setResponsavelForm] = useState<"Dona" | "Zelia">("Dona");
  const [dataGasto, setDataGasto] = useState(() => new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0]);
  const [observacao, setObservacao] = useState("");

  // Categoria efetiva (personalizada ou selecionada)
  const categoriaFinal = categoria === "__personalizada__"
    ? (categoriaPersonalizada.trim() || "Outros")
    : categoria;



  // ─── Carregar ─────────────────────────────────────────────────────────────
  useEffect(() => { loadGastos(); }, []);

  const loadGastos = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from as any)("gastos")
      .select("*")
      .order("data_gasto", { ascending: false });
    if (error) {
      console.error("Erro gastos:", error);
      toast.error("Erro ao carregar gastos");
    }
    if (data) setGastos(data as Gasto[]);
    setLoading(false);
  };

  // ─── Computed ─────────────────────────────────────────────────────────────
  const targetMonth = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const gastosFiltrados = useMemo(() => {
    return gastos.filter(g => {
      if (g.responsavel !== responsavelFilter) return false;
      if (catFilter !== "Todas" && g.categoria !== catFilter) return false;
      
      if (selectedDay) {
        if (g.data_gasto !== selectedDay) return false;
      } else {
        const gastoDate = new Date(g.data_gasto + "T12:00:00");
        if (gastoDate.getMonth() !== targetMonth.getMonth() || gastoDate.getFullYear() !== targetMonth.getFullYear()) return false;
      }
      
      return true;
    });
  }, [gastos, catFilter, responsavelFilter, targetMonth, selectedDay]);

  useEffect(() => {
    setVisibleCount(10);
    setSelectedDay(null);
  }, [monthOffset, catFilter, responsavelFilter]);

  const totalGeral = useMemo(() => gastos.filter(g => g.responsavel === responsavelFilter).reduce((s, g) => s + Number(g.valor), 0), [gastos, responsavelFilter]);
  const totalFiltrado = useMemo(() => gastosFiltrados.reduce((s, g) => s + Number(g.valor), 0), [gastosFiltrados]);

  // Categorias disponíveis para filtro (inclui personalizadas)
  const categoriasDisponiveis = useMemo(() => {
    const unicas = new Set(CATEGORIAS);
    gastos.forEach(g => unicas.add(g.categoria));
    return Array.from(unicas);
  }, [gastos]);

  // Dados de categorias para exibir no mês selecionado
  const dadosCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    gastosFiltrados.forEach(g => {
      map[g.categoria] = (map[g.categoria] ?? 0) + Number(g.valor);
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({
        name,
        value,
        fill: CATEGORIA_COLORS[name] ?? "#94a3b8",
        pct: totalFiltrado > 0 ? Math.round((value / totalFiltrado) * 100) : 0,
      }));
  }, [gastosFiltrados, totalFiltrado]);

  // ─── Ações ────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!descricao.trim() || !valor || !dataGasto) {
      toast.error("Preencha descrição, valor e data");
      return;
    }
    const valorNum = typeof valor === "string" ? parseFloat(valor.replace(",", ".")) : Number(valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      toast.error("Valor inválido");
      return;
    }
    setSaving(true);
    
    const payload = {
      descricao: descricao.trim(),
      valor: valorNum,
      categoria: categoriaFinal,
      responsavel: responsavelForm,
      data_gasto: dataGasto,
      observacao: observacao.trim() || null,
    };

    const request = editingId 
      ? (supabase.from as any)("gastos").update(payload).eq("id", editingId)
      : (supabase.from as any)("gastos").insert([payload]);

    const { error } = await request;

    if (error) {
      console.error("Erro ao salvar gasto:", error);
      toast.error(editingId ? "Erro ao atualizar gasto" : "Erro ao registrar gasto");
    } else {
      toast.success(editingId ? "Gasto atualizado! ✨" : "Gasto registrado! 💸");
      resetForm();
      setShowForm(false);
      loadGastos();
    }
    setSaving(false);
  };

  const handleEdit = (g: Gasto) => {
    setEditingId(g.id);
    setDescricao(g.descricao);
    setValor(g.valor.toString());
    setResponsavelForm(g.responsavel);
    setDataGasto(g.data_gasto);
    setObservacao(g.observacao || "");
    
    if (CATEGORIAS.includes(g.categoria)) {
      setCategoria(g.categoria);
      setCategoriaPersonalizada("");
    } else {
      setCategoria("__personalizada__");
      setCategoriaPersonalizada(g.categoria);
    }
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase.from as any)("gastos").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    setGastos(prev => prev.filter(g => g.id !== id));
    toast.success("Gasto removido");
  };

  const resetForm = () => {
    setEditingId(null);
    setDescricao("");
    setValor("");
    setCategoria("Outros");
    setCategoriaPersonalizada("");
    setResponsavelForm(responsavelFilter);
    setDataGasto(new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0]);
    setObservacao("");
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in pb-10">

      {/* ── Hero ── */}
      <div className="rounded-[24px] border border-white/10 bg-[#1c1c1e] p-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <h2 className="font-heading text-xl font-semibold text-white tracking-tight flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-orange-400" />
              Gastos do Estúdio
            </h2>
            <p className="font-body text-[12px] text-white/50 mt-1">
              Controle independente · Não afeta caixa ou comissão
            </p>
          </div>
          <PlusButton size={32} title="Novo gasto" onClick={() => setShowForm(true)} />
        </div>

        {/* Cards de totais */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="p-3.5 rounded-[16px] bg-[#2c2c2e] border border-white/5">
            <TrendingDown className="w-4 h-4 text-orange-400 mb-1.5" />
            <p className="font-heading text-[17px] font-bold text-orange-400 tabular-nums leading-tight">
              {formatCurrency(totalGeral)}
            </p>
            <p className="font-body text-[10px] font-medium text-white/50 uppercase tracking-wider mt-1">
              Total Geral
            </p>
          </div>
          <div className="p-3.5 rounded-[16px] bg-[#2c2c2e] border border-white/5">
            <Calendar className="w-4 h-4 text-gold mb-1.5" />
            <p className="font-heading text-[17px] font-bold text-gold tabular-nums leading-tight">
              {formatCurrency(totalFiltrado)}
            </p>
            <p className="font-body text-[10px] font-medium text-white/50 uppercase tracking-wider mt-1">
              Período Selecionado
            </p>
          </div>
        </div>
      </div>

      {/* ── Filtro de Responsável (Dona / Zélia) ── */}
      <div className="flex gap-2 p-1 rounded-[16px] bg-[#1c1c1e] border border-white/10">
        {(["Dona", "Zelia"] as const).map(resp => (
          <button
            key={resp}
            onClick={() => setResponsavelFilter(resp)}
            className={`flex-1 rounded-xl py-2 font-body text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
              responsavelFilter === resp
                ? "bg-[#2c2c2e] text-white shadow-sm border border-white/5"
                : "text-white/40 hover:text-white/80"
            }`}
          >
            {resp === "Dona" ? "Gastos da Dyoli" : "Gastos da Zélia"}
          </button>
        ))}
      </div>

      {/* ── Navegação por Mês ── */}
      <div className="mb-4 flex items-center justify-between p-2 rounded-[16px] bg-[#1c1c1e] border border-white/10">
        <button
          onClick={() => setMonthOffset(o => o - 1)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.03] hover:bg-white/[0.08] transition-colors border border-white/5"
        >
          <ChevronLeft className="w-5 h-5 text-white/70" />
        </button>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <p className="font-heading text-[15px] font-semibold text-white capitalize">
              {selectedDay ? formatDate(selectedDay) : `${MONTHS_PT[targetMonth.getMonth()]} ${targetMonth.getFullYear()}`}
            </p>
            <div className="relative flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.05] hover:bg-white/[0.1] border border-white/5 transition-colors cursor-pointer" title="Filtrar por dia específico">
              <Calendar className="w-3.5 h-3.5 text-white/60 pointer-events-none" />
              <input 
                type="date" 
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => setSelectedDay(e.target.value || null)}
                value={selectedDay || ""}
              />
            </div>
          </div>
          <p className="font-body text-[10px] text-white/50 uppercase tracking-widest mt-1">
            {selectedDay ? (
               <button onClick={() => setSelectedDay(null)} className="text-orange-400 font-bold hover:underline">Limpar Filtro de Dia</button>
            ) : (
               <span>{monthOffset === 0 ? "Mês Atual" : monthOffset < 0 ? `${Math.abs(monthOffset)} mês(es) atrás` : `Mês Futuro`}</span>
            )}
          </p>
        </div>

        <div className="flex gap-1.5 items-center">
          {monthOffset !== 0 && (
            <button
              onClick={() => setMonthOffset(0)}
              className="px-3 py-1.5 rounded-xl bg-orange-500/15 text-orange-400 font-body text-[10px] font-bold uppercase tracking-wider hover:bg-orange-500/25 transition-all border border-orange-500/20"
            >
              Hoje
            </button>
          )}
          <button
            onClick={() => setMonthOffset(o => o + 1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.03] hover:bg-white/[0.08] transition-colors border border-white/5"
          >
            <ChevronRight className="w-5 h-5 text-white/70" />
          </button>
        </div>
      </div>

      {/* ── Filtro de Categoria ── */}
      <div className="mb-2">
        <p className="font-body text-[10px] uppercase tracking-widest text-white/50 mb-2 px-0.5">
          Filtrar por Categoria
        </p>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger 
            className="w-full rounded-[16px] border border-white/10 bg-[#1c1c1e] py-5 text-[13px] font-body text-white"
            style={catFilter !== "Todas" ? {
              color: CATEGORIA_COLORS[catFilter],
            } : { color: "rgba(255,255,255,0.85)" }}
          >
            <SelectValue placeholder="Todas as Categorias" />
          </SelectTrigger>
          <SelectContent 
            className="font-body border border-white/10 shadow-2xl rounded-[16px] bg-[#1c1c1e] text-white"
          >
            <SelectItem 
              value="Todas" 
              className="font-body text-[13px] cursor-pointer"
            >
              Todas as Categorias
            </SelectItem>
            {categoriasDisponiveis.map(cat => (
              <SelectItem 
                key={cat} 
                value={cat}
                className="font-body text-[13px] cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORIA_COLORS[cat] ?? "#94a3b8" }} />
                  <span>{cat}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Resumo de Gastos Simples ── */}
      {gastosFiltrados.length > 0 && (
        <div className="mb-6 rounded-[24px] border border-white/10 bg-[#1c1c1e] p-5">
          <p className="font-body text-[11px] text-white/50 uppercase tracking-wider mb-1">
            Total gasto em {MONTHS_PT[targetMonth.getMonth()]}
          </p>
          <p className="font-heading text-4xl font-bold text-orange-400 mb-6">
            {formatCurrency(totalFiltrado)}
          </p>
          
          <div className="space-y-4">
            {dadosCategoria.map(cat => (
              <div key={cat.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.fill }} />
                    <span className="font-body text-[13px] font-medium text-white/80">{cat.name}</span>
                  </div>
                  <span className="font-heading text-[13px] font-bold text-white">
                    {formatCurrency(cat.value)} <span className="text-white/40 text-[11px] ml-1">({cat.pct}%)</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden border border-white/5">
                  <div 
                    className="h-full rounded-full transition-all duration-700" 
                    style={{ backgroundColor: cat.fill, width: `${cat.pct}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Lista de Gastos ── */}
      <div>
        <p className="font-body text-[10px] uppercase tracking-widest text-white/50 mb-3 px-0.5">
          Registros ({gastosFiltrados.length})
        </p>

        {gastosFiltrados.length === 0 ? (
          <div className="py-10 text-center rounded-[20px] border border-white/5 bg-[#1c1c1e]">
            <p className="font-body text-[13px] text-white/50">Nenhum gasto encontrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {gastosFiltrados.slice(0, visibleCount).map(g => (
              <div
                key={g.id}
                className="group flex items-center gap-3.5 px-4 py-3 rounded-[20px] border border-white/5 bg-[#1c1c1e] hover:bg-[#2c2c2e] hover:border-white/10 transition-all"
              >
                {/* Ícone redondo estilo app bancário */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: `${CATEGORIA_COLORS[g.categoria] ?? "#94a3b8"}20`,
                  }}
                >
                  <Tag
                    className="w-4.5 h-4.5"
                    style={{ color: CATEGORIA_COLORS[g.categoria] ?? "#94a3b8" }}
                  />
                </div>

                {/* Conteúdo central */}
                <div className="flex-1 min-w-0">
                  <p className="font-body text-[14px] font-semibold text-white leading-snug truncate">
                    {g.descricao}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="text-[10px] font-medium font-body"
                      style={{ color: CATEGORIA_COLORS[g.categoria] ?? "#94a3b8" }}
                    >
                      {g.categoria}
                    </span>
                    <span className="text-white/20 text-[10px]">·</span>
                    <span className="text-[11px] font-body font-medium text-white/70">
                      {formatDate(g.data_gasto)} às {formatTime(g.created_at)}
                    </span>
                  </div>
                  {g.observacao && (
                    <p className="text-[11px] font-body text-white/40 mt-0.5 truncate">{g.observacao}</p>
                  )}
                </div>

                {/* Valor + ações */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <p className="font-heading text-[15px] font-bold text-orange-400 tabular-nums">
                    − {formatCurrency(Number(g.valor))}
                  </p>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(g)}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-white/40 hover:text-white/80 transition-colors"
                      title="Editar"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <BinButton size="sm" onClick={() => handleDelete(g.id)} />
                  </div>
                </div>
              </div>
            ))}
            {visibleCount < gastosFiltrados.length && (
              <button
                onClick={() => setVisibleCount(prev => prev + 10)}
                className="w-full mt-2 py-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] text-white/50 hover:text-white/80 font-body text-[11px] uppercase tracking-widest font-semibold transition-all"
              >
                Carregar mais ({gastosFiltrados.length - visibleCount} restantes)
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Resumo total filtrado ── */}
      {gastosFiltrados.length > 0 && (
        <div className="rounded-[20px] border border-white/5 bg-[#1c1c1e] p-4 mt-4 flex items-center justify-between">
          <div>
            <p className="font-body text-[11px] text-white/50 uppercase tracking-wider">
              Total listado
            </p>
            <p className="font-heading text-[20px] font-bold text-white mt-0.5">
              {formatCurrency(totalFiltrado)}
            </p>
          </div>
        </div>
      )}

      {/* ── Dialog: Novo/Editar Gasto ── */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-sm border-white/5 bg-[#1c1c1e] rounded-[24px] max-h-[85vh] overflow-y-auto p-0 gap-0 custom-scrollbar shadow-2xl">
          
          {/* Header compacto */}
          <div className="flex items-center gap-2.5 px-4 pt-5 pb-3">
            <div className="w-8 h-8 rounded-[10px] bg-[#2c2c2e] flex items-center justify-center shrink-0 border border-white/5">
              <ShoppingCart className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <p className="font-heading text-[16px] font-semibold text-white leading-tight">
                {editingId ? "Editar Gasto" : "Registrar Gasto"}
              </p>
              <p className="font-body text-[10px] text-white/40 leading-none mt-0.5">Não afeta caixa ou comissão</p>
            </div>
          </div>

          <div className="space-y-3 px-4 pb-5 min-w-0 w-full overflow-hidden">

            {/* Responsável — toggle compacto */}
            <div className="flex gap-1.5 p-1 bg-[#2c2c2e] rounded-[16px] border border-white/5">
              {(["Dona", "Zelia"] as const).map(resp => (
                <button
                  key={resp}
                  type="button"
                  onClick={() => setResponsavelForm(resp)}
                  className={`flex-1 rounded-[12px] py-2 font-body text-[12px] font-semibold transition-all ${
                    responsavelForm === resp
                      ? "bg-[#3c3c3e] text-white shadow-sm border border-white/10"
                      : "text-white/40 hover:text-white/80"
                  }`}
                >
                  {resp === "Dona" ? "Dyoli" : "Zélia"}
                </button>
              ))}
            </div>

            {/* Descrição */}
            <input
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Descrição do gasto *"
              className="w-full rounded-[16px] bg-[#2c2c2e] border border-white/5 py-3 px-4 text-white font-body text-[13px] placeholder:text-white/30 focus:outline-none focus:border-white/20"
            />

            {/* Valor */}
            <input
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder="Valor (R$) *"
              className="w-full rounded-[16px] bg-[#2c2c2e] border border-white/5 py-3 px-4 text-white font-body text-[13px] placeholder:text-white/30 focus:outline-none focus:border-white/20"
            />

            {/* Data */}
            <input
              type="date"
              value={dataGasto}
              onChange={e => setDataGasto(e.target.value)}
              className="w-full max-w-full appearance-none block rounded-[16px] bg-[#2c2c2e] border border-white/5 py-3 px-4 text-white font-body text-[13px] focus:outline-none focus:border-white/20 [&::-webkit-calendar-picker-indicator]:invert-[0.8]"
            />

            {/* Categorias — scroll horizontal compacto */}
            <div>
              <p className="font-body text-[10px] text-white/40 uppercase tracking-widest mb-1.5">Categoria</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 w-full" style={{ scrollbarWidth: "none" }}>
                {CATEGORIAS.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setCategoria(cat); setCategoriaPersonalizada(""); }}
                    className="shrink-0 rounded-full px-3 py-1.5 font-body text-[10px] font-semibold transition-all whitespace-nowrap border"
                    style={{
                      borderColor: categoria === cat ? CATEGORIA_COLORS[cat] : `${CATEGORIA_COLORS[cat]}35`,
                      backgroundColor: categoria === cat ? `${CATEGORIA_COLORS[cat]}25` : `${CATEGORIA_COLORS[cat]}08`,
                      color: categoria === cat ? CATEGORIA_COLORS[cat] : `${CATEGORIA_COLORS[cat]}bb`,
                    }}
                  >
                    {cat}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCategoria("__personalizada__")}
                  className="shrink-0 rounded-full px-3 py-1.5 font-body text-[10px] font-semibold transition-all whitespace-nowrap border flex items-center gap-1"
                  style={{
                    borderColor: categoria === "__personalizada__" ? "#facc15" : "#facc1535",
                    backgroundColor: categoria === "__personalizada__" ? "#facc1525" : "#facc1508",
                    color: categoria === "__personalizada__" ? "#facc15" : "#facc15bb",
                  }}
                >
                  <Pencil className="w-2.5 h-2.5" />
                  Custom
                </button>
              </div>

              {categoria === "__personalizada__" && (
                <input
                  autoFocus
                  value={categoriaPersonalizada}
                  onChange={e => setCategoriaPersonalizada(e.target.value)}
                  placeholder="Nome da categoria..."
                  maxLength={50}
                  className="mt-1.5 w-full rounded-[16px] bg-[#2c2c2e] border border-white/5 py-3 px-4 text-white font-body text-[13px] placeholder:text-white/30 focus:outline-none focus:border-white/20"
                />
              )}
            </div>

            {/* Observação — 1 linha */}
            <input
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Observação (opcional)"
              className="w-full rounded-xl bg-white/[0.05] border border-white/[0.07] py-2.5 px-3 text-white font-body text-[16px] sm:text-[13px] placeholder:text-white/25 focus:outline-none focus:border-orange-500/40"
            />

            {/* Botões */}
            <div className="flex gap-2 pt-1 pb-1">
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 font-body text-[13px] font-medium text-white/60 hover:text-white/80 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={saving}
                className="flex-1 rounded-xl bg-orange-500 py-2.5 font-body text-[13px] font-semibold text-white hover:bg-orange-400 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? "Salvando..." : (editingId ? "Salvar" : "Registrar")}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GastosTab;
// Force rebuild  
