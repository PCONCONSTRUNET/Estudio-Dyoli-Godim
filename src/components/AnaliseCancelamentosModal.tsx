import { useState } from "react";
import { Sparkles, X, AlertTriangle, TrendingDown, Lightbulb, Loader2, RefreshCw, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Padrao {
  titulo: string;
  descricao: string;
  severidade: "baixa" | "media" | "alta";
}

interface Acao {
  titulo: string;
  descricao: string;
  impacto_esperado: string;
  prioridade: "baixa" | "media" | "alta";
}

interface Stats {
  totais: {
    ativos: number;
    concluidos: number;
    cancelados: number;
    faltas: number;
    taxa_cancelamento_pct: number;
    taxa_falta_pct: number;
    antecedencia_media_dias: number;
    valor_perdido_estimado: number;
  };
  por_faixa_horaria?: { faixa: string; cancelamentos: number; total: number; taxa_pct: number }[];
  por_dia_semana?: { dia: string; cancelamentos: number; total: number; taxa_pct: number }[];
  por_servico?: { servico: string; cancelamentos: number; total: number; taxa_pct: number }[];
  top_clientes_problematicos?: { nome: string; cancelamentos: number; faltas: number; total_agendamentos: number }[];
}

interface Analise {
  resumo_executivo: string;
  score_saude: number;
  padroes: Padrao[];
  acoes: Acao[];
}

interface Result {
  periodo_dias: number;
  stats: Stats;
  analise: Analise;
}

const sevColors: Record<string, string> = {
  alta: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  media: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  baixa: "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

const prioColors: Record<string, string> = {
  alta: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  media: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  baixa: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  open: boolean;
  onClose: () => void;
}

const AnaliseCancelamentosModal = ({ open, onClose }: Props) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [periodo, setPeriodo] = useState<number>(90);

  const runAnalise = async (dias: number = periodo) => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("analise-cancelamentos", {
        body: { dias },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        if (data.stats) setResult({ periodo_dias: dias, stats: data.stats, analise: { resumo_executivo: "", score_saude: 0, padroes: [], acoes: [] } });
        return;
      }
      setResult(data);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Falha ao gerar análise");
    } finally {
      setLoading(false);
    }
  };

  // Auto-run ao abrir
  if (open && !result && !loading) {
    runAnalise(periodo);
  }

  const handleClose = () => {
    onClose();
    // Reset depois pra próxima abertura recarregar
    setTimeout(() => setResult(null), 300);
  };

  const scoreColor = (s: number) =>
    s >= 8 ? "text-emerald-400" : s >= 5 ? "text-amber-400" : "text-rose-400";

  const scoreBg = (s: number) =>
    s >= 8 ? "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30" : s >= 5 ? "from-amber-500/20 to-amber-500/5 border-amber-500/30" : "from-rose-500/20 to-rose-500/5 border-rose-500/30";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-charcoal border-purple-500/20 p-0 [&>button]:text-primary-foreground/60 [&>button]:hover:text-primary-foreground">
        <DialogHeader className="p-5 pb-3 border-b border-primary-foreground/[0.06]">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/30">
              <Sparkles className="w-5 h-5 text-purple-300" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="font-display text-base tracking-wide text-primary-foreground">
                Análise de Cancelamentos com IA
              </DialogTitle>
              <DialogDescription className="font-body text-[11px] text-primary-foreground/55 mt-1">
                Padrões identificados nos seus dados + ações sugeridas
              </DialogDescription>
            </div>
          </div>

          {/* Seletor de período */}
          <div className="flex gap-1.5 mt-3">
            {[30, 60, 90, 180].map((d) => (
              <button
                key={d}
                onClick={() => {
                  setPeriodo(d);
                  runAnalise(d);
                }}
                disabled={loading}
                className={`px-2.5 py-1 rounded-lg font-body text-[10px] font-semibold uppercase tracking-wider transition-all border ${
                  periodo === d
                    ? "bg-purple-500/20 border-purple-500/40 text-purple-200"
                    : "bg-primary-foreground/[0.04] border-primary-foreground/[0.08] text-primary-foreground/50 hover:text-primary-foreground/80"
                } disabled:opacity-50`}
              >
                {d} dias
              </button>
            ))}
            <button
              onClick={() => runAnalise(periodo)}
              disabled={loading}
              className="ml-auto p-1.5 rounded-lg bg-primary-foreground/[0.04] hover:bg-primary-foreground/[0.08] border border-primary-foreground/[0.08] text-primary-foreground/60 disabled:opacity-50 transition-all"
              title="Atualizar análise"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              <p className="font-body text-[12px] text-primary-foreground/60">
                Analisando padrões com IA...
              </p>
            </div>
          )}

          {!loading && result && (
            <>
              {/* Score + resumo */}
              {result.analise.resumo_executivo && (
                <div className={`p-4 rounded-2xl border bg-gradient-to-br ${scoreBg(result.analise.score_saude)}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="text-center">
                        <div className={`font-display text-3xl font-bold ${scoreColor(result.analise.score_saude)}`}>
                          {result.analise.score_saude.toFixed(1)}
                        </div>
                        <div className="font-body text-[9px] text-primary-foreground/50 uppercase tracking-wider mt-0.5">
                          Score
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-[11px] font-semibold text-primary-foreground/80 uppercase tracking-wider mb-1">
                        Resumo Executivo
                      </p>
                      <p className="font-body text-[12px] text-primary-foreground/75 leading-relaxed">
                        {result.analise.resumo_executivo}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Métricas chave */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-rose-500/[0.06] border border-rose-500/15">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingDown className="w-3 h-3 text-rose-400" />
                    <span className="font-body text-[9px] text-primary-foreground/50 uppercase tracking-wider">Taxa Cancelamento</span>
                  </div>
                  <div className="font-display text-lg font-bold text-rose-300">
                    {result.stats.totais.taxa_cancelamento_pct}%
                  </div>
                  <div className="font-body text-[10px] text-primary-foreground/40">
                    {result.stats.totais.cancelados + result.stats.totais.faltas} de {result.stats.totais.cancelados + result.stats.totais.faltas + result.stats.totais.concluidos}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/15">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                    <span className="font-body text-[9px] text-primary-foreground/50 uppercase tracking-wider">Faltas (No-show)</span>
                  </div>
                  <div className="font-display text-lg font-bold text-amber-300">
                    {result.stats.totais.taxa_falta_pct}%
                  </div>
                  <div className="font-body text-[10px] text-primary-foreground/40">
                    {result.stats.totais.faltas} ocorrências
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.08]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Info className="w-3 h-3 text-blue-400" />
                    <span className="font-body text-[9px] text-primary-foreground/50 uppercase tracking-wider">Antecedência Média</span>
                  </div>
                  <div className="font-display text-lg font-bold text-blue-300">
                    {result.stats.totais.antecedencia_media_dias}d
                  </div>
                  <div className="font-body text-[10px] text-primary-foreground/40">para cancelar</div>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/[0.06] border border-rose-500/15">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span className="font-body text-[9px] text-primary-foreground/50 uppercase tracking-wider">Receita Perdida</span>
                  </div>
                  <div className="font-display text-base font-bold text-rose-300">
                    {formatCurrency(result.stats.totais.valor_perdido_estimado)}
                  </div>
                  <div className="font-body text-[10px] text-primary-foreground/40">faltas + last-min</div>
                </div>
              </div>

              {/* Padrões */}
              {result.analise.padroes.length > 0 && (
                <div>
                  <h3 className="font-body text-[11px] font-semibold text-primary-foreground/70 uppercase tracking-[0.15em] mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Padrões Identificados
                  </h3>
                  <div className="space-y-2">
                    {result.analise.padroes.map((p, i) => (
                      <div key={i} className={`p-3 rounded-xl border ${sevColors[p.severidade]}`}>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-body text-[12px] font-semibold text-primary-foreground/90">
                            {p.titulo}
                          </p>
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider border ${sevColors[p.severidade]}`}>
                            {p.severidade}
                          </span>
                        </div>
                        <p className="font-body text-[11px] text-primary-foreground/70 leading-relaxed">
                          {p.descricao}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ações sugeridas */}
              {result.analise.acoes.length > 0 && (
                <div>
                  <h3 className="font-body text-[11px] font-semibold text-primary-foreground/70 uppercase tracking-[0.15em] mb-2 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Ações Sugeridas
                  </h3>
                  <div className="space-y-2">
                    {result.analise.acoes.map((a, i) => (
                      <div key={i} className="p-3 rounded-xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.08]">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-body text-[12px] font-semibold text-primary-foreground/90">
                            {a.titulo}
                          </p>
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider border ${prioColors[a.prioridade]}`}>
                            {a.prioridade}
                          </span>
                        </div>
                        <p className="font-body text-[11px] text-primary-foreground/65 leading-relaxed mb-1.5">
                          {a.descricao}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-300">
                          <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                          <span className="font-body italic">{a.impacto_esperado}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detalhes — top horários e clientes */}
              {result.stats.por_faixa_horaria && result.stats.por_faixa_horaria.length > 0 && (
                <div>
                  <h3 className="font-body text-[11px] font-semibold text-primary-foreground/70 uppercase tracking-[0.15em] mb-2">
                    Por Faixa Horária
                  </h3>
                  <div className="space-y-1.5">
                    {result.stats.por_faixa_horaria.map((f) => (
                      <div key={f.faixa} className="flex items-center gap-2 p-2 rounded-lg bg-primary-foreground/[0.03] border border-primary-foreground/[0.05]">
                        <span className="font-body text-[11px] text-primary-foreground/75 flex-1">{f.faixa}</span>
                        <span className="font-body text-[10px] text-primary-foreground/45">
                          {f.cancelamentos}/{f.total}
                        </span>
                        <div className="w-20 h-1.5 bg-primary-foreground/[0.06] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${f.taxa_pct >= 30 ? "bg-rose-400" : f.taxa_pct >= 15 ? "bg-amber-400" : "bg-emerald-400"}`}
                            style={{ width: `${Math.min(100, f.taxa_pct)}%` }}
                          />
                        </div>
                        <span className="font-display text-[11px] font-bold text-primary-foreground/80 w-10 text-right">
                          {f.taxa_pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.stats.top_clientes_problematicos && result.stats.top_clientes_problematicos.length > 0 && (
                <div>
                  <h3 className="font-body text-[11px] font-semibold text-primary-foreground/70 uppercase tracking-[0.15em] mb-2">
                    Clientes com Mais Faltas/Cancelamentos
                  </h3>
                  <div className="space-y-1.5">
                    {result.stats.top_clientes_problematicos.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/[0.04] border border-rose-500/[0.1]">
                        <span className="font-body text-[11px] text-primary-foreground/85 flex-1 truncate">{c.nome}</span>
                        <span className="font-body text-[10px] text-rose-300">
                          {c.cancelamentos} cancel · {c.faltas} faltas
                        </span>
                        <span className="font-body text-[10px] text-primary-foreground/40">
                          de {c.total_agendamentos}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-3 border-t border-primary-foreground/[0.06] bg-primary-foreground/[0.02]">
          <p className="font-body text-[10px] text-primary-foreground/40 text-center leading-relaxed">
            Análise gerada por IA com base em {result?.periodo_dias || periodo} dias de dados reais. Use como apoio à decisão.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnaliseCancelamentosModal;
