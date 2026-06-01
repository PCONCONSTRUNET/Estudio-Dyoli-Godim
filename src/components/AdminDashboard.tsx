import { useMemo, useState, useEffect } from "react";
import { Calendar, Clock, User, TrendingUp, Bell, ArrowRight, Timer, CheckCircle2, Sparkles, DollarSign, CalendarCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import PushToggle from "@/components/PushToggle";

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
  foi_estendido?: boolean;
  cliente_nome?: string | null;
}

interface Props {
  agendamentos: Agendamento[];
  getClientName: (userId: string) => string;
  notificationsEnabled: boolean;
  toggleNotifications: (val: boolean) => void;
  statusBadge: (s: string) => JSX.Element;
  onGoToAgenda: () => void;
}

const getDateKey = (d: Date) => d.toISOString().split("T")[0];

const AdminDashboard = ({
  agendamentos,
  getClientName,
  notificationsEnabled,
  toggleNotifications,
  statusBadge,
  onGoToAgenda,
}: Props) => {
  const getBrasiliaTime = () => {
    const utc = new Date();
    return new Date(utc.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  };

  const [brasiliaTime, setBrasiliaTime] = useState(getBrasiliaTime);

  useEffect(() => {
    const interval = setInterval(() => setBrasiliaTime(getBrasiliaTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  const today = getDateKey(brasiliaTime);
  const now = brasiliaTime;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Today's appointments
  const todayItems = useMemo(
    () =>
      agendamentos
        .filter((a) => a.data_agendamento === today && a.status !== "cancelado")
        .sort((a, b) => a.horario.localeCompare(b.horario)),
    [agendamentos, today]
  );

  // Next upcoming appointments (from now forward)
  const upcomingItems = useMemo(
    () =>
      todayItems.filter((a) => {
        const [h, m] = a.horario.split(":").map(Number);
        return h * 60 + m >= currentMinutes;
      }),
    [todayItems, currentMinutes]
  );

  // Stats
  const totalHoje = todayItems.length;
  const confirmadosHoje = todayItems.filter((a) => a.status === "confirmado").length;
  const concluidosHoje = todayItems.filter((a) => a.status === "concluido").length;
  const faturamentoHoje = todayItems.reduce((sum, a) => sum + Number(a.valor), 0);
  const recebidoHoje = todayItems.reduce((sum, a) => sum + Number(a.valor_pago || 0), 0);

  // Weekly revenue chart (last 7 days)
  const weeklyData = useMemo(() => {
    const days: { date: string; label: string; receita: number; agendamentos: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = getDateKey(d);
      const dayItems = agendamentos.filter(
        (a) => a.data_agendamento === key && a.status !== "cancelado" && a.status !== "falta"
      );
      days.push({
        date: key,
        label: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        receita: dayItems.reduce((s, a) => s + Number(a.valor_pago || 0), 0),
        agendamentos: dayItems.length,
      });
    }
    return days;
  }, [agendamentos]);

  // Top services (this month)
  const topServices = useMemo(() => {
    const thisMonth = today.slice(0, 7);
    const monthItems = agendamentos.filter(
      (a) => a.data_agendamento.startsWith(thisMonth) && a.status !== "cancelado"
    );
    const counts: Record<string, number> = {};
    monthItems.forEach((a) => {
      counts[a.servico] = (counts[a.servico] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name: name.length > 18 ? name.slice(0, 16) + "…" : name, count }));
  }, [agendamentos, today]);

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-primary-foreground/[0.08] bg-charcoal/95 backdrop-blur-xl px-3 py-2 shadow-lg">
        <p className="font-body text-[11px] text-primary-foreground/85 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="font-body text-[12px] font-medium" style={{ color: p.color }}>
            {p.name === "receita" ? formatCurrency(p.value) : p.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Greeting + Today Summary — Editorial Hero ── */}
      <div className="relative overflow-hidden rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/[0.08] via-purple-500/[0.04] to-transparent p-5">
        {/* Animated ambient glows */}
        <div className="pointer-events-none absolute -top-24 -right-20 w-64 h-64 rounded-full bg-gold/15 blur-3xl animate-[hero-glow_6s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 w-56 h-56 rounded-full bg-purple-500/15 blur-3xl animate-[hero-glow-alt_7s_ease-in-out_infinite]" />
        {/* Floating particles */}
        <div className="pointer-events-none absolute top-6 right-12 w-1 h-1 rounded-full bg-gold/60 animate-[float-particle_4s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute top-16 right-24 w-0.5 h-0.5 rounded-full bg-purple-300/60 animate-[float-particle-delayed_5s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute bottom-10 right-8 w-1 h-1 rounded-full bg-gold/40 animate-[float-particle-slow_6s_ease-in-out_infinite]" />

        <div className="relative">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20 mb-2">
                <Sparkles className="w-2.5 h-2.5 text-gold animate-pulse" />
                <span className="font-body text-[9px] text-gold/80 uppercase tracking-[0.2em] font-medium">
                  {now.getHours() < 12 ? "Manhã" : now.getHours() < 18 ? "Tarde" : "Noite"}
                </span>
              </div>
              <h2 className="font-heading text-xl font-semibold text-primary-foreground tracking-tight">
                {now.getHours() < 12 ? "Bom dia ☀️" : now.getHours() < 18 ? "Boa tarde 🌤️" : "Boa noite 🌙"}
              </h2>
              <p className="font-body text-[12px] text-primary-foreground/75 mt-0.5 capitalize">
                {now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
            <div className="text-right">
              <p className="font-heading text-2xl font-bold text-gold tabular-nums tracking-tight drop-shadow-[0_0_12px_hsl(40_60%_60%/0.4)]">
                {brasiliaTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                <span className="text-base text-gold/60 ml-0.5 animate-pulse">
                  :{brasiliaTime.toLocaleTimeString("pt-BR", { second: "2-digit" }).slice(-2)}
                </span>
              </p>
              <p className="font-body text-[9px] text-primary-foreground/95 uppercase tracking-[0.2em] mt-0.5 flex items-center justify-end gap-1">
                <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" /> Brasília
              </p>
            </div>
          </div>

          {/* Day progress bar */}
          {(() => {
            const dayPct = Math.round(((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100);
            return (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-body text-[9px] text-primary-foreground/95 uppercase tracking-[0.2em]">Progresso do dia</span>
                  <span className="font-heading text-[10px] font-bold text-gold tabular-nums">{dayPct}%</span>
                </div>
                <div className="relative h-1.5 rounded-full bg-primary-foreground/[0.06] overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold via-gold/90 to-purple-400 transition-all duration-1000 shadow-[0_0_8px_hsl(40_60%_60%/0.5)]"
                    style={{ width: `${dayPct}%` }}
                  >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent" style={{ animation: "shimmer 2.5s ease-in-out infinite" }} />
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-4 gap-2">
            <div className="group relative p-2.5 rounded-2xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.06] hover:border-gold/20 hover:bg-gold/[0.04] transition-all">
              <CalendarCheck className="w-3 h-3 text-gold/60 mb-1 group-hover:scale-110 transition-transform" />
              <p className="font-heading text-lg font-bold text-gold tabular-nums leading-none">{totalHoje}</p>
              <p className="font-body text-[9px] text-primary-foreground/75 uppercase tracking-wider mt-1">Hoje</p>
            </div>
            <div className="group relative p-2.5 rounded-2xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.06] hover:border-primary-foreground/15 transition-all">
              <Clock className="w-3 h-3 text-primary-foreground/75 mb-1 group-hover:scale-110 transition-transform" />
              <p className="font-heading text-lg font-bold text-primary-foreground tabular-nums leading-none">{confirmadosHoje}</p>
              <p className="font-body text-[9px] text-primary-foreground/75 uppercase tracking-wider mt-1">Pendentes</p>
            </div>
            <div className="group relative p-2.5 rounded-2xl bg-green-500/[0.04] border border-green-500/[0.08] hover:border-green-500/20 transition-all">
              <CheckCircle2 className="w-3 h-3 text-green-400/70 mb-1 group-hover:scale-110 transition-transform" />
              <p className="font-heading text-lg font-bold text-green-400 tabular-nums leading-none">{concluidosHoje}</p>
              <p className="font-body text-[9px] text-primary-foreground/75 uppercase tracking-wider mt-1">Feitos</p>
            </div>
            <div className="group relative p-2.5 rounded-2xl bg-gold/[0.05] border border-gold/[0.12] hover:border-gold/25 transition-all overflow-hidden">
              <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-gold/10 blur-xl group-hover:bg-gold/20 transition-all" />
              <DollarSign className="relative w-3 h-3 text-gold/70 mb-1 group-hover:scale-110 transition-transform" />
              <p className="relative font-heading text-sm font-bold text-gold tabular-nums leading-none truncate">{formatCurrency(recebidoHoje)}</p>
              <p className="relative font-body text-[9px] text-primary-foreground/75 uppercase tracking-wider mt-1">Recebido</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Próximos Clientes (Cards) ── */}
      <div className="relative overflow-hidden rounded-3xl border border-gold/15 bg-gradient-to-br from-gold/[0.05] via-primary-foreground/[0.02] to-transparent p-5 backdrop-blur-md">
        <div className="pointer-events-none absolute -top-24 -right-20 w-56 h-56 rounded-full bg-gold/10 blur-[60px]" />
        
        <div className="relative flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/15 border border-gold/25 shadow-[0_0_12px_-3px_hsl(40_60%_60%/0.3)]">
              <User className="w-4 h-4 text-gold" />
            </div>
            <h3 className="font-body text-[11px] text-primary-foreground/90 uppercase tracking-widest font-bold">
              Próximos atendimentos
            </h3>
          </div>
          <button
            onClick={onGoToAgenda}
            className="group font-body text-[10px] font-bold text-gold flex items-center gap-1.5 hover:text-gold/80 hover:bg-gold/15 transition-all px-3 py-1.5 rounded-full bg-gold/10 border border-gold/20 uppercase tracking-wider"
          >
            Ver agenda <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
        
        {upcomingItems.length === 0 ? (
          <div className="relative rounded-2xl border border-dashed border-primary-foreground/15 bg-primary-foreground/[0.02] p-8 text-center">
            <Calendar className="w-8 h-8 text-primary-foreground/50 mx-auto mb-3" />
            <p className="font-body text-[13px] text-primary-foreground/80 font-medium">Nenhum atendimento pendente hoje</p>
          </div>
        ) : (
          <div className="relative space-y-3">
            {upcomingItems.slice(0, 4).map((a, idx) => {
              const [h, m] = a.horario.split(":").map(Number);
              const endMin = h * 60 + m + (a.duracao_minutos || 60);
              const endH = Math.floor(endMin / 60);
              const endM = endMin % 60;
              const isNext = idx === 0;
              return (
                <div
                  key={a.id}
                  className={`group relative rounded-2xl border p-4 transition-all duration-300 hover:scale-[1.01] ${
                    isNext
                      ? "border-gold/30 bg-gradient-to-br from-gold/10 to-gold/[0.02] shadow-[0_8px_30px_-8px_hsl(40_60%_60%/0.25)] backdrop-blur-md"
                      : "border-primary-foreground/[0.08] bg-primary-foreground/[0.02] hover:bg-primary-foreground/[0.04] hover:border-primary-foreground/20 backdrop-blur-sm"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`mt-0.5 w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                      isNext ? "bg-gold/15 text-gold border-gold/25" : "bg-primary-foreground/[0.05] text-primary-foreground/80 border-primary-foreground/10"
                    }`}>
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`font-body text-[15px] font-bold truncate ${isNext ? "text-gold" : "text-primary-foreground"}`}>
                          {getClientName(a.user_id)}
                        </p>
                        {isNext && (
                          <span className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-body font-bold bg-gold text-charcoal uppercase tracking-widest shadow-[0_0_12px_hsl(40_60%_60%/0.4)] animate-pulse">
                            <Sparkles className="w-2.5 h-2.5" /> Próximo
                          </span>
                        )}
                      </div>
                      <p className="font-body text-[12px] text-primary-foreground/80 truncate mt-1">
                        {a.servico}{a.variacao ? ` — ${a.variacao}` : ""}
                      </p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-foreground/[0.04] border border-primary-foreground/[0.06]">
                          <Clock className={`w-3.5 h-3.5 ${isNext ? "text-gold/80" : "text-primary-foreground/60"}`} />
                          <span className={`font-heading text-[12px] font-bold ${isNext ? "text-gold/90" : "text-primary-foreground/85"} tabular-nums`}>
                            {a.horario} — {String(endH).padStart(2, "0")}:{String(endM).padStart(2, "0")}
                          </span>
                        </div>
                        <span className={`font-heading text-[14px] font-bold tabular-nums ${isNext ? "text-gold" : "text-primary-foreground/90"}`}>
                          {formatCurrency(Number(a.valor))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Timeline do Dia ── */}
      <div className="relative overflow-hidden rounded-3xl border border-purple-500/15 bg-gradient-to-br from-purple-500/[0.03] via-primary-foreground/[0.01] to-transparent p-5 backdrop-blur-md mt-5">
        <div className="pointer-events-none absolute -bottom-24 -left-20 w-64 h-64 rounded-full bg-purple-500/10 blur-[60px]" />
        
        <div className="relative flex items-center gap-2.5 mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/25 shadow-[0_0_12px_-3px_hsl(280_70%_60%/0.3)]">
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <h3 className="font-body text-[11px] text-primary-foreground/90 uppercase tracking-widest font-bold">
            Timeline de Hoje
          </h3>
        </div>
        
        {todayItems.length === 0 ? (
          <div className="relative rounded-2xl border border-dashed border-primary-foreground/15 bg-primary-foreground/[0.02] p-8 text-center">
            <Timer className="w-8 h-8 text-primary-foreground/50 mx-auto mb-3" />
            <p className="font-body text-[13px] text-primary-foreground/80 font-medium">Sem atendimentos hoje</p>
          </div>
        ) : (
          <div className="relative pl-6">
            {/* Timeline line */}
            <div className="absolute left-[11px] top-4 bottom-4 w-[2px] rounded-full bg-gradient-to-b from-primary-foreground/[0.15] via-primary-foreground/[0.05] to-transparent" />
            <div className="space-y-1">
              {todayItems.map((a) => {
                const [h, m] = a.horario.split(":").map(Number);
                const appointmentMin = h * 60 + m;
                const isPast = currentMinutes > appointmentMin + (a.duracao_minutos || 60);
                const isCurrent = currentMinutes >= appointmentMin && currentMinutes < appointmentMin + (a.duracao_minutos || 60);
                return (
                  <div key={a.id} className="relative pb-5 group">
                    {/* Dot */}
                    <div className={`absolute -left-[29px] top-3 w-3 h-3 rounded-full border-2 transition-all duration-300 group-hover:scale-125 ${
                      isCurrent
                        ? "bg-gold border-gold shadow-[0_0_12px_3px_hsl(40_40%_55%/0.4)] animate-pulse"
                        : isPast
                        ? "bg-green-500 border-green-400/50 shadow-[0_0_8px_hsl(142_70%_50%/0.2)]"
                        : "bg-background border-primary-foreground/30"
                    }`} />
                    <div className={`rounded-2xl p-4 transition-all duration-300 backdrop-blur-md ${
                      isCurrent 
                        ? "bg-gradient-to-r from-gold/[0.08] to-gold/[0.02] border border-gold/25 shadow-[0_4px_24px_-6px_hsl(40_60%_60%/0.15)]" 
                        : "bg-primary-foreground/[0.02] border border-primary-foreground/[0.06] hover:bg-primary-foreground/[0.04] hover:border-primary-foreground/15 hover:shadow-lg"
                    }`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`font-heading text-[15px] font-bold shrink-0 tabular-nums ${
                            isCurrent ? "text-gold" : isPast ? "text-primary-foreground/70" : "text-primary-foreground/90"
                          }`}>
                            {a.horario}
                          </span>
                          <span className={`font-body text-[14px] font-medium truncate ${
                            isPast ? "text-primary-foreground/70" : "text-primary-foreground"
                          }`}>
                            {getClientName(a.user_id)}
                          </span>
                          {(a as any).foi_estendido && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 shrink-0">
                              <Timer className="w-2.5 h-2.5 text-amber-400" />
                              <span className="font-body text-[9px] font-bold text-amber-400 uppercase tracking-wider">Estendido</span>
                            </span>
                          )}
                        </div>
                        <div className="shrink-0 scale-90 sm:scale-100 origin-right">
                          {statusBadge(a.status)}
                        </div>
                      </div>
                      <p className={`font-body text-[12px] mt-1.5 ${
                        isPast ? "text-primary-foreground/60" : "text-primary-foreground/80"
                      }`}>
                        {a.servico}{a.variacao ? ` · ${a.variacao}` : ""} <span className="mx-1.5 opacity-40">•</span> {a.duracao_minutos || 60} min
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Charts Section ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue Chart */}
        {(() => {
          const totalSemana = weeklyData.reduce((s, d) => s + d.receita, 0);
          const mediaSemana = totalSemana / 7;
          const melhorDia = weeklyData.reduce((acc, d) => (d.receita > acc.receita ? d : acc), weeklyData[0] || { receita: 0, label: "-" } as any);
          const ult3 = weeklyData.slice(-3).reduce((s, d) => s + d.receita, 0);
          const prim3 = weeklyData.slice(0, 3).reduce((s, d) => s + d.receita, 0);
          const variacao = prim3 > 0 ? ((ult3 - prim3) / prim3) * 100 : ult3 > 0 ? 100 : 0;
          const trendUp = variacao >= 0;
          const isEmpty = totalSemana === 0;

          return (
            <div className="group relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/[0.06] via-primary-foreground/[0.02] to-transparent p-5 transition-all hover:border-gold/30">
              <div className="pointer-events-none absolute -top-20 -right-16 w-48 h-48 rounded-full bg-gold/10 blur-3xl group-hover:bg-gold/15 transition-all" />
              <div className="pointer-events-none absolute -bottom-16 -left-12 w-40 h-40 rounded-full bg-purple-500/[0.06] blur-3xl" />

              <div className="relative flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gold/15 border border-gold/25">
                      <TrendingUp className="w-3 h-3 text-gold" />
                    </div>
                    <h3 className="font-body text-[10px] text-primary-foreground/75 uppercase tracking-[0.18em] font-medium">
                      Receita — 7 dias
                    </h3>
                  </div>
                  <p className="font-heading text-[22px] font-bold text-primary-foreground tabular-nums leading-none mt-1">
                    {formatCurrency(totalSemana)}
                  </p>
                  <p className="font-body text-[10px] text-primary-foreground/95 mt-1">
                    Média {formatCurrency(mediaSemana)} / dia
                  </p>
                </div>
                <div className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-body font-semibold tabular-nums ${
                  trendUp
                    ? "bg-green-500/10 text-green-400 border-green-500/25"
                    : "bg-red-500/10 text-red-400 border-red-500/25"
                }`}>
                  <span>{trendUp ? "↗" : "↘"}</span>
                  {Math.abs(variacao).toFixed(0)}%
                </div>
              </div>

              {isEmpty ? (
                <div className="h-[160px] flex flex-col items-center justify-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.06]">
                    <DollarSign className="w-4 h-4 text-primary-foreground/85" />
                  </div>
                  <p className="font-body text-[11px] text-primary-foreground/85">Sem receita nos últimos 7 dias</p>
                </div>
              ) : (
                <>
                  <div className="relative h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                        <defs>
                          <linearGradient id="dashGold" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(40 65% 60%)" stopOpacity={0.45} />
                            <stop offset="100%" stopColor="hsl(40 65% 60%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="label"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: "hsl(0 0% 100% / 0.3)" }}
                        />
                        <YAxis hide />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "hsl(40 65% 60% / 0.3)", strokeWidth: 1, strokeDasharray: "3 3" }} wrapperStyle={{ outline: "none" }} />
                        <Area
                          type="monotone"
                          dataKey="receita"
                          stroke="hsl(40 65% 60%)"
                          strokeWidth={2.5}
                          fill="url(#dashGold)"
                          name="receita"
                          dot={{ r: 3, fill: "hsl(40 65% 60%)", strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: "hsl(40 65% 60%)", stroke: "hsl(var(--charcoal))", strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="relative flex items-center justify-between gap-2 mt-3 pt-3 border-t border-primary-foreground/[0.05]">
                    <div className="min-w-0">
                      <p className="font-body text-[9px] text-primary-foreground/95 uppercase tracking-wider">Melhor dia</p>
                      <p className="font-body text-[12px] font-semibold text-gold capitalize mt-0.5 truncate">
                        {melhorDia?.label} · {formatCurrency(melhorDia?.receita || 0)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-body text-[9px] text-primary-foreground/95 uppercase tracking-wider">Últimos 3d</p>
                      <p className="font-body text-[12px] font-semibold text-primary-foreground/80 tabular-nums mt-0.5">
                        {formatCurrency(ult3)}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* Top Services */}
        {(() => {
          const totalAtend = topServices.reduce((s, x) => s + x.count, 0);
          const maxCount = Math.max(1, ...topServices.map((s) => s.count));
          const isEmpty = topServices.length === 0;
          const destaque = topServices[0];

          return (
            <div className="group relative overflow-hidden rounded-2xl border border-rose/20 bg-gradient-to-br from-rose/[0.06] via-primary-foreground/[0.02] to-transparent p-5 transition-all hover:border-rose/30">
              <div className="pointer-events-none absolute -top-20 -right-16 w-48 h-48 rounded-full bg-rose/10 blur-3xl group-hover:bg-rose/15 transition-all" />
              <div className="pointer-events-none absolute -bottom-16 -left-12 w-40 h-40 rounded-full bg-gold/[0.05] blur-3xl" />

              <div className="relative flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose/15 border border-rose/25">
                      <Sparkles className="w-3 h-3 text-rose" />
                    </div>
                    <h3 className="font-body text-[10px] text-primary-foreground/75 uppercase tracking-[0.18em] font-medium">
                      Top Serviços — Mês
                    </h3>
                  </div>
                  <p className="font-heading text-[22px] font-bold text-primary-foreground tabular-nums leading-none mt-1">
                    {totalAtend}
                  </p>
                  <p className="font-body text-[10px] text-primary-foreground/95 mt-1">
                    {topServices.length} serviço{topServices.length !== 1 ? "s" : ""} · {totalAtend} atendimento{totalAtend !== 1 ? "s" : ""}
                  </p>
                </div>
                {destaque && (
                  <div className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-full border bg-rose/10 text-rose border-rose/25 text-[10px] font-body font-semibold">
                    ★ {destaque.count}x
                  </div>
                )}
              </div>

              {isEmpty ? (
                <div className="h-[160px] flex flex-col items-center justify-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.06]">
                    <Sparkles className="w-4 h-4 text-primary-foreground/85" />
                  </div>
                  <p className="font-body text-[11px] text-primary-foreground/85">Sem atendimentos no mês</p>
                </div>
              ) : (
                <div className="relative space-y-2.5">
                  {topServices.map((s, i) => {
                    const pct = (s.count / maxCount) * 100;
                    const pctTotal = totalAtend > 0 ? (s.count / totalAtend) * 100 : 0;
                    const isTop = i === 0;
                    return (
                      <div key={s.name} className="group/row">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`font-body text-[10px] font-bold tabular-nums w-4 text-center ${
                              isTop ? "text-rose" : "text-primary-foreground/95"
                            }`}>
                              {i + 1}
                            </span>
                            <span className="font-body text-[12px] font-medium text-primary-foreground/85 truncate">
                              {s.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-body text-[10px] text-primary-foreground/95 tabular-nums">
                              {pctTotal.toFixed(0)}%
                            </span>
                            <span className={`font-heading text-[13px] font-bold tabular-nums ${
                              isTop ? "text-rose" : "text-primary-foreground/100"
                            }`}>
                              {s.count}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-primary-foreground/[0.04] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${
                              isTop
                                ? "bg-gradient-to-r from-rose via-rose/80 to-gold/60 shadow-[0_0_8px_hsl(var(--rose)/0.4)]"
                                : "bg-gradient-to-r from-rose/40 to-rose/20"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>


      {/* ── Notification Settings (compact) ── */}
      <div className="rounded-2xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.03] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-gold" />
          <h3 className="font-body text-[11px] text-primary-foreground/75 uppercase tracking-widest font-medium">
            Notificações
          </h3>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="flex items-center justify-between lg:flex-col lg:items-start lg:gap-2">
            <div>
              <p className="font-body text-[13px] text-primary-foreground">Pop-up de pedidos</p>
              <p className="font-body text-[10px] text-primary-foreground/95">Alerta ao chegar agendamento</p>
            </div>
            <Switch checked={notificationsEnabled} onCheckedChange={toggleNotifications} />
          </div>
        </div>

        {/* Push nativo (PWA + desktop) */}
        <div className="mt-3 pt-3 border-t border-primary-foreground/[0.06]">
          <PushToggle role="admin" variant="default" showTestButton />
          <p className="font-body text-[10px] text-primary-foreground/95 mt-2">
            Funciona no Chrome desktop e no celular (Android sempre, iPhone só com o app instalado na tela inicial).
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
