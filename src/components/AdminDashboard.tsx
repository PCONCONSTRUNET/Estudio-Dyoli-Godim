import { useMemo, useState, useEffect } from "react";
import { Calendar, Clock, User, TrendingUp, Bell, ArrowRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

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
}

interface Props {
  agendamentos: Agendamento[];
  getClientName: (userId: string) => string;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  toggleNotifications: (val: boolean) => void;
  toggleSound: (val: boolean) => void;
  playSound: () => void;
  statusBadge: (s: string) => JSX.Element;
  onGoToAgenda: () => void;
}

const getDateKey = (d: Date) => d.toISOString().split("T")[0];

const AdminDashboard = ({
  agendamentos,
  getClientName,
  notificationsEnabled,
  soundEnabled,
  toggleNotifications,
  toggleSound,
  playSound,
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
        <p className="font-body text-[11px] text-primary-foreground/50 mb-1">{label}</p>
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
      {/* ── Greeting + Today Summary ── */}
      <div className="rounded-2xl border border-gold/10 bg-gradient-to-br from-gold/[0.06] to-transparent p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading text-lg font-semibold text-primary-foreground">
              Bom {now.getHours() < 12 ? "dia" : now.getHours() < 18 ? "tarde" : "noite"} ☀️
            </h2>
            <p className="font-body text-[12px] text-primary-foreground/40 mt-0.5">
              {now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div className="text-right">
            <p className="font-heading text-2xl font-bold text-gold tabular-nums tracking-tight">
              {brasiliaTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
            <p className="font-body text-[9px] text-primary-foreground/25 uppercase tracking-wider">Brasília</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <p className="font-heading text-lg font-bold text-gold">{totalHoje}</p>
            <p className="font-body text-[10px] text-primary-foreground/35">Hoje</p>
          </div>
          <div className="text-center">
            <p className="font-heading text-lg font-bold text-primary-foreground">{confirmadosHoje}</p>
            <p className="font-body text-[10px] text-primary-foreground/35">Pendentes</p>
          </div>
          <div className="text-center">
            <p className="font-heading text-lg font-bold text-green-500">{concluidosHoje}</p>
            <p className="font-body text-[10px] text-primary-foreground/35">Concluídos</p>
          </div>
          <div className="text-center">
            <p className="font-heading text-lg font-bold text-gold">{formatCurrency(recebidoHoje)}</p>
            <p className="font-body text-[10px] text-primary-foreground/35">Recebido</p>
          </div>
        </div>
      </div>

      {/* ── Próximos Clientes (Cards) ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-body text-[11px] text-primary-foreground/40 uppercase tracking-widest font-medium">
            Próximos atendimentos
          </h3>
          <button
            onClick={onGoToAgenda}
            className="font-body text-[11px] text-gold flex items-center gap-1 hover:text-gold/80 transition-colors"
          >
            Ver agenda <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {upcomingItems.length === 0 ? (
          <div className="rounded-2xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.03] p-6 text-center">
            <Calendar className="w-8 h-8 text-primary-foreground/15 mx-auto mb-2" />
            <p className="font-body text-[13px] text-primary-foreground/30">Nenhum atendimento pendente hoje</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingItems.slice(0, 4).map((a, idx) => {
              const [h, m] = a.horario.split(":").map(Number);
              const endMin = h * 60 + m + (a.duracao_minutos || 60);
              const endH = Math.floor(endMin / 60);
              const endM = endMin % 60;
              const isNext = idx === 0;
              return (
                <div
                  key={a.id}
                  className={`rounded-2xl border p-4 transition-all ${
                    isNext
                      ? "border-gold/20 bg-gold/[0.06] shadow-[0_0_20px_-8px_hsl(40_40%_55%/0.15)]"
                      : "border-primary-foreground/[0.06] bg-primary-foreground/[0.03]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isNext ? "bg-gold/15 text-gold" : "bg-primary-foreground/[0.06] text-primary-foreground/30"
                    }`}>
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-body text-[14px] font-medium text-primary-foreground truncate">
                          {getClientName(a.user_id)}
                        </p>
                        {isNext && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-body font-bold bg-gold/15 text-gold border border-gold/20 uppercase tracking-wider">
                            Próximo
                          </span>
                        )}
                      </div>
                      <p className="font-body text-[12px] text-primary-foreground/40 truncate mt-0.5">
                        {a.servico}{a.variacao ? ` — ${a.variacao}` : ""}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1.5 text-primary-foreground/50">
                          <Clock className="w-3 h-3" />
                          <span className="font-body text-[11px]">
                            {a.horario} — {String(endH).padStart(2, "0")}:{String(endM).padStart(2, "0")}
                          </span>
                        </div>
                        <span className="font-body text-[11px] text-gold font-medium">
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
      <div>
        <h3 className="mb-3 font-body text-[11px] text-primary-foreground/40 uppercase tracking-widest font-medium">
          Timeline de Hoje
        </h3>
        {todayItems.length === 0 ? (
          <div className="rounded-2xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.03] p-6 text-center">
            <p className="font-body text-[13px] text-primary-foreground/30">Sem atendimentos hoje</p>
          </div>
        ) : (
          <div className="relative pl-6">
            {/* Timeline line */}
            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-primary-foreground/[0.08]" />
            <div className="space-y-0">
              {todayItems.map((a) => {
                const [h, m] = a.horario.split(":").map(Number);
                const appointmentMin = h * 60 + m;
                const isPast = currentMinutes > appointmentMin + (a.duracao_minutos || 60);
                const isCurrent = currentMinutes >= appointmentMin && currentMinutes < appointmentMin + (a.duracao_minutos || 60);
                return (
                  <div key={a.id} className="relative pb-4">
                    {/* Dot */}
                    <div className={`absolute -left-6 top-1.5 w-[10px] h-[10px] rounded-full border-2 ${
                      isCurrent
                        ? "bg-gold border-gold shadow-[0_0_8px_2px_hsl(40_40%_55%/0.3)] animate-pulse"
                        : isPast
                        ? "bg-green-500/60 border-green-500/40"
                        : "bg-primary-foreground/10 border-primary-foreground/20"
                    }`} />
                    <div className={`rounded-xl p-3 transition-all ${
                      isCurrent ? "bg-gold/[0.06] border border-gold/15" : "bg-primary-foreground/[0.02] border border-transparent"
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`font-body text-[12px] font-semibold shrink-0 ${
                            isCurrent ? "text-gold" : isPast ? "text-primary-foreground/30" : "text-primary-foreground/60"
                          }`}>
                            {a.horario}
                          </span>
                          <span className={`font-body text-[12px] truncate ${
                            isPast ? "text-primary-foreground/25" : "text-primary-foreground/70"
                          }`}>
                            {getClientName(a.user_id)}
                          </span>
                        </div>
                        {statusBadge(a.status)}
                      </div>
                      <p className={`font-body text-[11px] mt-0.5 ${
                        isPast ? "text-primary-foreground/15" : "text-primary-foreground/30"
                      }`}>
                        {a.servico}{a.variacao ? ` · ${a.variacao}` : ""} · {a.duracao_minutos || 60}min
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
        <div className="rounded-2xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.03] p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-gold" />
            <h3 className="font-body text-[11px] text-primary-foreground/40 uppercase tracking-widest font-medium">
              Receita — 7 dias
            </h3>
          </div>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="dashGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(40 40% 55%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(40 40% 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "hsl(0 0% 100% / 0.25)" }}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} wrapperStyle={{ outline: "none" }} />
                <Area
                  type="monotone"
                  dataKey="receita"
                  stroke="hsl(40 40% 55%)"
                  strokeWidth={2}
                  fill="url(#dashGold)"
                  name="receita"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Services */}
        <div className="rounded-2xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.03] p-4">
          <h3 className="font-body text-[11px] text-primary-foreground/40 uppercase tracking-widest font-medium mb-4">
            Top Serviços — Mês
          </h3>
          {topServices.length === 0 ? (
            <p className="font-body text-[13px] text-primary-foreground/30 text-center py-8">Sem dados</p>
          ) : (
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topServices} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "hsl(0 0% 100% / 0.35)" }}
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} wrapperStyle={{ outline: "none" }} />
                  <Bar
                    dataKey="count"
                    fill="hsl(40 40% 55%)"
                    radius={[0, 6, 6, 0]}
                    name="agendamentos"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Notification Settings (compact) ── */}
      <div className="rounded-2xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.03] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-gold" />
          <h3 className="font-body text-[11px] text-primary-foreground/40 uppercase tracking-widest font-medium">
            Notificações
          </h3>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="flex items-center justify-between lg:flex-col lg:items-start lg:gap-2">
            <div>
              <p className="font-body text-[13px] text-primary-foreground">Pop-up de pedidos</p>
              <p className="font-body text-[10px] text-primary-foreground/30">Alerta ao chegar agendamento</p>
            </div>
            <Switch checked={notificationsEnabled} onCheckedChange={toggleNotifications} />
          </div>
          <div className="flex items-center justify-between lg:flex-col lg:items-start lg:gap-2">
            <div>
              <p className="font-body text-[13px] text-primary-foreground">Som</p>
              <p className="font-body text-[10px] text-primary-foreground/30">Toque sonoro ao receber</p>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={toggleSound} />
          </div>
          <button
            onClick={() => playSound()}
            className="py-2.5 rounded-xl bg-gold/10 border border-gold/20 text-gold font-body text-[12px] font-medium hover:bg-gold/15 transition-all"
          >
            🔔 Testar som
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
