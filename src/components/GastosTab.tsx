import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  ShoppingCart, TrendingDown, Calendar, Save, Pencil,
  Sparkles, PackageOpen, Tag, AlertCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BinButton from "@/components/ui/bin-button";
import PlusButton from "@/components/ui/plus-button";

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
  "Material de Trabalho",
  "Equipamento",
  "Marketing",
  "Higiene & Limpeza",
  "Capacitação",
  "Alimentação",
  "Transporte",
  "Tecnologia",
  "Outros",
];

const CATEGORIA_COLORS: Record<string, string> = {
  "Material de Trabalho": "#f59e0b",
  "Equipamento":          "#3b82f6",
  "Marketing":            "#ec4899",
  "Higiene & Limpeza":    "#10b981",
  "Capacitação":          "#a855f7",
  "Alimentação":          "#f97316",
  "Transporte":           "#06b6d4",
  "Tecnologia":           "#6366f1",
  "Outros":               "#94a3b8",
};

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });

const MONTHS_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

// ─── Tooltip personalizado para o BarChart ────────────────────────────────────
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

// ─── Tooltip personalizado para o PieChart ────────────────────────────────────
const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-xl border border-primary-foreground/10 bg-charcoal/95 backdrop-blur px-3 py-2 shadow-xl">
      <p className="font-body text-[11px] text-primary-foreground/60 mb-0.5">{d.name}</p>
      <p className="font-heading text-[14px] font-bold" style={{ color: d.payload.fill }}>
        {formatCurrency(d.value)}
      </p>
      <p className="font-body text-[10px] text-primary-foreground/40">{d.payload.pct}%</p>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const GastosTab = () => {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filtros
  const [catFilter, setCatFilter] = useState("Todas");
  const [mesFilter, setMesFilter] = useState<string>("todos");
  const [responsavelFilter, setResponsavelFilter] = useState<"Dona" | "Zelia">("Dona");

  // Form
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("Outros");
  const [categoriaPersonalizada, setCategoriaPersonalizada] = useState("");
  const [responsavelForm, setResponsavelForm] = useState<"Dona" | "Zelia">("Dona");
  const [dataGasto, setDataGasto] = useState(() => new Date().toISOString().split("T")[0]);
  const [observacao, setObservacao] = useState("");

  // Categoria efetiva (personalizada ou selecionada)
  const categoriaFinal = categoria === "__personalizada__"
    ? (categoriaPersonalizada.trim() || "Outros")
    : categoria;

  // Gráfico ativo
  const [chartView, setChartView] = useState<"mensal" | "categoria">("mensal");

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
  const mesesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    gastos.forEach(g => {
      const [y, m] = g.data_gasto.split("-");
      set.add(`${y}-${m}`);
    });
    return Array.from(set).sort().reverse();
  }, [gastos]);

  const gastosFiltrados = useMemo(() => {
    return gastos.filter(g => {
      if (g.responsavel !== responsavelFilter) return false;
      if (catFilter !== "Todas" && g.categoria !== catFilter) return false;
      if (mesFilter !== "todos") {
        const [y, m] = g.data_gasto.split("-");
        if (`${y}-${m}` !== mesFilter) return false;
      }
      return true;
    });
  }, [gastos, catFilter, mesFilter, responsavelFilter]);

  const totalGeral = useMemo(() => gastos.filter(g => g.responsavel === responsavelFilter).reduce((s, g) => s + Number(g.valor), 0), [gastos, responsavelFilter]);
  const totalFiltrado = useMemo(() => gastosFiltrados.reduce((s, g) => s + Number(g.valor), 0), [gastosFiltrados]);

  // Dados para BarChart mensal (últimos 6 meses)
  const dadosMensais = useMemo(() => {
    const map: Record<string, number> = {};
    gastos.filter(g => g.responsavel === responsavelFilter).forEach(g => {
      const [y, m] = g.data_gasto.split("-");
      const key = `${y}-${m}`;
      map[key] = (map[key] ?? 0) + Number(g.valor);
    });
    const sorted = Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
    return sorted.map(([key, total]) => {
      const [, m] = key.split("-");
      return { mes: MONTHS_PT[Number(m) - 1], total };
    });
  }, [gastos]);

  // Dados para PieChart por categoria
  const dadosCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    gastosFiltrados.forEach(g => {
      map[g.categoria] = (map[g.categoria] ?? 0) + Number(g.valor);
    });
    const sorted = Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({
        name,
        value,
        fill: CATEGORIA_COLORS[name] ?? "#94a3b8",
        pct: totalFiltrado > 0 ? ((value / totalFiltrado) * 100).toFixed(1) : "0",
      }));
    return sorted;
  }, [gastosFiltrados, totalFiltrado]);

  // ─── Ações ────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!descricao.trim() || !valor || !dataGasto) {
      toast.error("Preencha descrição, valor e data");
      return;
    }
    const valorNum = parseFloat(valor.replace(",", "."));
    if (isNaN(valorNum) || valorNum <= 0) {
      toast.error("Valor inválido");
      return;
    }
    setSaving(true);
    const { error } = await (supabase.from as any)("gastos").insert([{
      descricao: descricao.trim(),
      valor: valorNum,
      categoria: categoriaFinal,
      responsavel: responsavelForm,
      data_gasto: dataGasto,
      observacao: observacao.trim() || null,
    }]);
    if (error) {
      console.error("Erro ao salvar gasto:", error);
      toast.error("Erro ao registrar gasto");
    } else {
      toast.success("Gasto registrado! 💸");
      resetForm();
      setShowForm(false);
      loadGastos();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase.from as any)("gastos").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    setGastos(prev => prev.filter(g => g.id !== id));
    toast.success("Gasto removido");
  };

  const resetForm = () => {
    setDescricao("");
    setValor("");
    setCategoria("Outros");
    setCategoriaPersonalizada("");
    setResponsavelForm(responsavelFilter);
    setDataGasto(new Date().toISOString().split("T")[0]);
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
      <div className="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.08] via-gold/[0.04] to-transparent p-5">
        <div className="pointer-events-none absolute -top-24 -right-20 w-64 h-64 rounded-full bg-orange-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 w-56 h-56 rounded-full bg-gold/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 mb-2">
                <Sparkles className="w-2.5 h-2.5 text-orange-400 animate-pulse" />
                <span className="font-body text-[9px] text-orange-400/80 uppercase tracking-[0.2em] font-medium">
                  Controle de gastos
                </span>
              </div>
              <h2 className="font-heading text-xl font-semibold text-primary-foreground tracking-tight flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-orange-400" />
                Gastos do Estúdio
              </h2>
              <p className="font-body text-[12px] text-primary-foreground/60 mt-0.5">
                Controle independente · Não afeta caixa ou comissão
              </p>
            </div>
            <PlusButton size={32} title="Novo gasto" onClick={() => setShowForm(true)} />
          </div>

          {/* Cards de totais */}
          <div className="grid grid-cols-2 gap-3">
            <div className="group relative p-3.5 rounded-2xl bg-orange-500/[0.07] border border-orange-500/[0.18] overflow-hidden">
              <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-orange-500/10 blur-xl" />
              <TrendingDown className="relative w-4 h-4 text-orange-400/80 mb-1.5" />
              <p className="relative font-heading text-[17px] font-bold text-orange-400 tabular-nums leading-tight">
                {formatCurrency(totalGeral)}
              </p>
              <p className="relative font-body text-[10px] font-medium text-primary-foreground/50 uppercase tracking-wider mt-1">
                Total Geral
              </p>
            </div>
            <div className="group relative p-3.5 rounded-2xl bg-gold/[0.07] border border-gold/[0.18] overflow-hidden">
              <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-gold/10 blur-xl" />
              <Calendar className="relative w-4 h-4 text-gold/80 mb-1.5" />
              <p className="relative font-heading text-[17px] font-bold text-gold tabular-nums leading-tight">
                {formatCurrency(totalFiltrado)}
              </p>
              <p className="relative font-body text-[10px] font-medium text-primary-foreground/50 uppercase tracking-wider mt-1">
                Período Selecionado
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filtro de Responsável (Dona / Zélia) ── */}
      <div className="flex gap-2 p-1.5 rounded-2xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.06]">
        {(["Dona", "Zelia"] as const).map(resp => (
          <button
            key={resp}
            onClick={() => setResponsavelFilter(resp)}
            className={`flex-1 rounded-xl px-3 py-2.5 font-body text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
              responsavelFilter === resp
                ? (resp === "Dona" ? "bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]" : "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]")
                : "text-primary-foreground/50 hover:text-primary-foreground/80 hover:bg-primary-foreground/[0.04]"
            }`}
          >
            {resp === "Dona" ? "👑 Gastos da Dona" : "👩 Gastos da Zélia"}
          </button>
        ))}
      </div>

      {/* ── Filtro de Mês ── */}
      <div>
        <p className="font-body text-[10px] uppercase tracking-widest text-primary-foreground/30 mb-2 px-0.5">
          Filtrar por período
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setMesFilter("todos")}
            className={`shrink-0 rounded-full border px-3 py-1.5 font-body text-[11px] font-medium transition-all ${
              mesFilter === "todos"
                ? "bg-gold/15 text-gold border-gold/40"
                : "bg-primary-foreground/[0.04] text-primary-foreground/50 border-primary-foreground/[0.08] hover:text-primary-foreground/70"
            }`}
          >
            Todos
          </button>
          {mesesDisponiveis.map(m => {
            const [y, mo] = m.split("-");
            const label = `${MONTHS_PT[Number(mo) - 1]} ${y}`;
            return (
              <button
                key={m}
                onClick={() => setMesFilter(m)}
                className={`shrink-0 rounded-full border px-3 py-1.5 font-body text-[11px] font-medium transition-all ${
                  mesFilter === m
                    ? "bg-orange-500/15 text-orange-400 border-orange-500/40"
                    : "bg-primary-foreground/[0.04] text-primary-foreground/50 border-primary-foreground/[0.08] hover:text-primary-foreground/70"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Filtro de Categoria ── */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {["Todas", ...CATEGORIAS].map(cat => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            className={`shrink-0 rounded-full border px-3 py-1.5 font-body text-[11px] font-medium transition-all whitespace-nowrap ${
              catFilter === cat
                ? "bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20"
                : "bg-primary-foreground/[0.03] text-primary-foreground/40 border-primary-foreground/[0.06] hover:text-primary-foreground/60"
            }`}
            style={catFilter === cat && cat !== "Todas" ? {
              backgroundColor: `${CATEGORIA_COLORS[cat]}22`,
              color: CATEGORIA_COLORS[cat],
              borderColor: `${CATEGORIA_COLORS[cat]}44`,
            } : {}}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Gráficos ── */}
      {gastos.length > 0 && (
        <div className="rounded-3xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.02] overflow-hidden">
          {/* Toggle gráfico */}
          <div className="flex border-b border-primary-foreground/[0.06]">
            {(["mensal", "categoria"] as const).map(v => (
              <button
                key={v}
                onClick={() => setChartView(v)}
                className={`flex-1 py-3 font-body text-[12px] font-medium transition-all ${
                  chartView === v
                    ? "text-gold border-b-2 border-gold bg-gold/[0.04]"
                    : "text-primary-foreground/40 hover:text-primary-foreground/60"
                }`}
              >
                {v === "mensal" ? "📅 Gastos por Mês" : "🏷️ Por Categoria"}
              </button>
            ))}
          </div>

          <div className="p-4">
            {chartView === "mensal" ? (
              dadosMensais.length > 0 ? (
                <>
                  <p className="font-body text-[11px] text-primary-foreground/40 mb-3">
                    Últimos {dadosMensais.length} meses
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dadosMensais} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis
                        dataKey="mes"
                        tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11, fontFamily: "var(--font-body)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10, fontFamily: "var(--font-body)" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={v => `R$${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`}
                      />
                      <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                      <Bar dataKey="total" fill="#f97316" radius={[6, 6, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="py-10 text-center">
                  <p className="font-body text-[13px] text-primary-foreground/30">Nenhum dado para exibir</p>
                </div>
              )
            ) : (
              dadosCategoria.length > 0 ? (
                <>
                  <p className="font-body text-[11px] text-primary-foreground/40 mb-3">
                    Total: {formatCurrency(totalFiltrado)}
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={dadosCategoria}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {dadosCategoria.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{
                          fontFamily: "var(--font-body)",
                          fontSize: "10px",
                          color: "rgba(255,255,255,0.5)",
                          paddingTop: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Lista de categorias com barras */}
                  <div className="mt-2 space-y-2">
                    {dadosCategoria.map(cat => (
                      <div key={cat.name} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.fill }} />
                        <p className="font-body text-[11px] text-primary-foreground/60 flex-1 truncate">{cat.name}</p>
                        <p className="font-body text-[11px] font-semibold text-primary-foreground/80">
                          {formatCurrency(cat.value)}
                        </p>
                        <p className="font-body text-[10px] text-primary-foreground/35 w-8 text-right">
                          {cat.pct}%
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-10 text-center">
                  <p className="font-body text-[13px] text-primary-foreground/30">Nenhum dado para exibir</p>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ── Lista de Gastos ── */}
      <div>
        <p className="font-body text-[10px] uppercase tracking-widest text-primary-foreground/30 mb-3 px-0.5">
          Registros ({gastosFiltrados.length})
        </p>

        {gastosFiltrados.length === 0 ? (
          <div className="py-16 text-center rounded-3xl border border-dashed border-primary-foreground/[0.08]">
            <PackageOpen className="w-10 h-10 text-primary-foreground/15 mx-auto mb-3" />
            <p className="font-body text-[13px] text-primary-foreground/30">Nenhum gasto encontrado</p>
            <p className="font-body text-[11px] text-primary-foreground/20 mt-1">
              Toque no + para registrar um gasto
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {gastosFiltrados.map(g => (
              <div
                key={g.id}
                className="group rounded-2xl border border-primary-foreground/[0.07] bg-primary-foreground/[0.02] p-3.5 transition-all hover:border-primary-foreground/[0.12] hover:bg-primary-foreground/[0.04]"
              >
                <div className="flex items-start gap-3">
                  {/* Ícone categoria */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: `${CATEGORIA_COLORS[g.categoria] ?? "#94a3b8"}18` }}
                  >
                    <Tag
                      className="w-4 h-4"
                      style={{ color: CATEGORIA_COLORS[g.categoria] ?? "#94a3b8" }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span
                        className="px-2 py-0.5 rounded-full text-[9px] font-body font-medium border"
                        style={{
                          backgroundColor: `${CATEGORIA_COLORS[g.categoria] ?? "#94a3b8"}15`,
                          color: CATEGORIA_COLORS[g.categoria] ?? "#94a3b8",
                          borderColor: `${CATEGORIA_COLORS[g.categoria] ?? "#94a3b8"}30`,
                        }}
                      >
                        {g.categoria}
                      </span>
                      <span className="font-body text-[10px] text-primary-foreground/30">
                        {formatDate(g.data_gasto)}
                      </span>
                    </div>
                    <p className="font-body text-[13px] font-medium text-primary-foreground truncate">
                      {g.descricao}
                    </p>
                    {g.observacao && (
                      <p className="font-body text-[11px] text-primary-foreground/40 mt-0.5 truncate">
                        {g.observacao}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="font-heading text-[15px] font-bold text-orange-400">
                      {formatCurrency(Number(g.valor))}
                    </p>
                    <BinButton size="sm" onClick={() => handleDelete(g.id)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Resumo total filtrado ── */}
      {gastosFiltrados.length > 0 && (
        <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-r from-orange-500/[0.06] to-transparent p-4 flex items-center justify-between">
          <div>
            <p className="font-body text-[11px] text-primary-foreground/40 uppercase tracking-wider">
              Total no período selecionado
            </p>
            <p className="font-heading text-[20px] font-bold text-orange-400 mt-0.5">
              {formatCurrency(totalFiltrado)}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 border border-orange-500/25">
            <ShoppingCart className="w-5 h-5 text-orange-400" />
          </div>
        </div>
      )}

      {/* ── Dialog: Novo Gasto ── */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md border-primary-foreground/[0.06] overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-heading text-primary-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-orange-400" />
              Registrar Gasto
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Aviso informativo */}
            <div className="flex items-start gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/[0.06] px-3 py-2.5">
              <AlertCircle className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
              <p className="font-body text-[11px] text-blue-300/80 leading-relaxed">
                Gastos são registrados <strong className="text-blue-300">apenas para controle interno</strong>. Não afetam caixa, comissão ou despesas.
              </p>
            </div>

            {/* Responsável */}
            <div>
              <label className="font-body text-[11px] text-primary-foreground/50 mb-1 block">
                De quem é esse gasto? *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["Dona", "Zelia"] as const).map(resp => (
                  <button
                    key={resp}
                    type="button"
                    onClick={() => setResponsavelForm(resp)}
                    className={`rounded-xl border px-3 py-2.5 font-body text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      responsavelForm === resp
                        ? (resp === "Dona" ? "bg-orange-500/15 text-orange-400 border-orange-500/40" : "bg-blue-500/15 text-blue-400 border-blue-500/40")
                        : "bg-primary-foreground/[0.03] text-primary-foreground/50 border-primary-foreground/[0.08] hover:text-primary-foreground/70"
                    }`}
                  >
                    {resp === "Dona" ? "👑 Dona" : "👩 Zélia"}
                  </button>
                ))}
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="font-body text-[11px] text-primary-foreground/50 mb-1 block">
                Descrição *
              </label>
              <input
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Ex: Compra de tinta, notebook, curso..."
                className="w-full rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.07] py-2.5 px-3 text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/25 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/30"
              />
            </div>

            {/* Valor + Data */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-body text-[11px] text-primary-foreground/50 mb-1 block">
                  Valor (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.07] py-2.5 px-3 text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/25 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/30"
                />
              </div>
              <div>
                <label className="font-body text-[11px] text-primary-foreground/50 mb-1 block">
                  Data *
                </label>
                <input
                  type="date"
                  value={dataGasto}
                  onChange={e => setDataGasto(e.target.value)}
                  className="w-full rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.07] py-2.5 px-3 text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/30"
                />
              </div>
            </div>

            {/* Categoria */}
            <div>
              <label className="font-body text-[11px] text-primary-foreground/50 mb-1 block">
                Categoria
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {CATEGORIAS.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setCategoria(cat); setCategoriaPersonalizada(""); }}
                    className={`rounded-xl border px-2 py-2 font-body text-[10px] font-medium transition-all text-center leading-tight ${
                      categoria === cat
                        ? "text-white"
                        : "bg-primary-foreground/[0.03] text-primary-foreground/40 border-primary-foreground/[0.06] hover:text-primary-foreground/60"
                    }`}
                    style={categoria === cat ? {
                      backgroundColor: `${CATEGORIA_COLORS[cat]}22`,
                      color: CATEGORIA_COLORS[cat],
                      borderColor: `${CATEGORIA_COLORS[cat]}50`,
                    } : {}}
                  >
                    {cat}
                  </button>
                ))}

                {/* Botão: Personalizada */}
                <button
                  type="button"
                  onClick={() => setCategoria("__personalizada__")}
                  className={`rounded-xl border px-2 py-2 font-body text-[10px] font-medium transition-all text-center leading-tight flex flex-col items-center gap-0.5 ${
                    categoria === "__personalizada__"
                      ? "bg-gold/15 text-gold border-gold/40"
                      : "bg-primary-foreground/[0.03] text-primary-foreground/40 border-primary-foreground/[0.06] hover:text-primary-foreground/60"
                  }`}
                >
                  <Pencil className="w-3 h-3" />
                  Personalizada
                </button>
              </div>

              {/* Campo de texto para categoria personalizada */}
              {categoria === "__personalizada__" && (
                <div className="mt-2">
                  <input
                    autoFocus
                    value={categoriaPersonalizada}
                    onChange={e => setCategoriaPersonalizada(e.target.value)}
                    placeholder="Digite o nome da categoria..."
                    maxLength={50}
                    className="w-full rounded-xl bg-gold/[0.06] border border-gold/25 py-2.5 px-3 text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/25 focus:outline-none focus:ring-2 focus:ring-gold/25 focus:border-gold/40 transition-all"
                  />
                  {categoriaPersonalizada.trim() && (
                    <p className="font-body text-[10px] text-gold/70 mt-1 px-1">
                      ✓ Será salvo como: <strong className="text-gold">{categoriaPersonalizada.trim()}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Observação */}
            <div>
              <label className="font-body text-[11px] text-primary-foreground/50 mb-1 block">
                Observação (opcional)
              </label>
              <textarea
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                placeholder="Detalhes adicionais..."
                rows={2}
                className="w-full rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.07] py-2.5 px-3 text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/25 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/30 resize-none"
              />
            </div>

            {/* Botões */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="flex-1 rounded-xl border border-primary-foreground/[0.08] bg-primary-foreground/[0.04] py-2.5 font-body text-[13px] font-medium text-primary-foreground/50 hover:text-primary-foreground/70 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={saving}
                className="flex-1 rounded-xl bg-orange-500 py-2.5 font-body text-[13px] font-semibold text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:bg-orange-400 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? "Salvando..." : "Registrar Gasto"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GastosTab;
