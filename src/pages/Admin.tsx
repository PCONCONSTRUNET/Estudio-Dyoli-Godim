import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3, Calendar, Users, Clock, Settings, LogOut, Search,
  X, Edit2, Trash2, Plus, Save, CheckCircle, Bell, MessageSquare,
  UserX, DollarSign, CreditCard, ShoppingBag, Download, ChevronLeft, ChevronRight, Receipt, ClipboardList, Wallet
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import FinanceiroTab from "@/components/FinanceiroTab";
import DespesasTab from "@/components/DespesasTab";
import PedidosTab from "@/components/PedidosTab";
import GatewayTab from "@/components/GatewayTab";
import ProdutosTab from "@/components/ProdutosTab";
import AdminDashboard from "@/components/AdminDashboard";
import { useAdminNotifications } from "@/hooks/use-admin-notifications";
import { Switch } from "@/components/ui/switch";

// ─── Types ───
interface Agendamento {
  id: string; servico: string; variacao: string | null; data_agendamento: string;
  horario: string; valor: number; valor_pago: number | null; status: string;
  created_at: string; user_id: string; duracao_minutos: number;
}
interface Profile { id: string; nome: string; whatsapp: string; created_at: string; }
interface LembreteConfig { id: string; tipo: string; ativo: boolean; mensagem: string; horas_antes: number; }

type Tab = "dashboard" | "agendamentos" | "pedidos" | "clientes" | "horarios" | "servicos" | "financeiro" | "produtos" | "despesas" | "gateway";

const ADMIN_PASSWORD = "dyoliadmin";

const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
};

const shiftDate = (dateKey: string, days: number) => {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + days);
  return getDateKey(d);
};

// ─── Lembretes Hub (Sheet lateral) ───
const LembretesHub = () => {
  const [configs, setConfigs] = useState<LembreteConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMsg, setEditMsg] = useState("");
  const [editHoras, setEditHoras] = useState("");

  const tipoLabels: Record<string, { label: string; icon: string; desc: string }> = {
    confirmacao: { label: "Confirmação", icon: "✅", desc: "Enviado ao confirmar agendamento" },
    lembrete: { label: "Lembrete", icon: "⏰", desc: "Enviado antes do atendimento" },
    cancelamento: { label: "Cancelamento", icon: "❌", desc: "Enviado ao cancelar agendamento" },
    comparecimento: { label: "Comparecimento", icon: "💖", desc: "Enviado após o atendimento" },
    pos_atendimento: { label: "Pós-Atendimento", icon: "⭐", desc: "Feedback após atendimento" },
  };

  useEffect(() => {
    supabase.from("configuracoes_lembretes").select("*").order("created_at").then(({ data }) => {
      if (data) setConfigs(data.map(d => ({ id: d.id, tipo: d.tipo, ativo: d.ativo, mensagem: d.mensagem, horas_antes: d.horas_antes })));
      setLoading(false);
    });
  }, []);

  const toggleAtivo = async (id: string) => {
    const c = configs.find(c => c.id === id);
    if (!c) return;
    await supabase.from("configuracoes_lembretes").update({ ativo: !c.ativo, updated_at: new Date().toISOString() }).eq("id", id);
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, ativo: !c.ativo } : c));
  };

  const startEdit = (c: LembreteConfig) => {
    setEditingId(c.id);
    setEditMsg(c.mensagem);
    setEditHoras(c.horas_antes.toString());
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    await supabase.from("configuracoes_lembretes").update({
      mensagem: editMsg, horas_antes: Number(editHoras), updated_at: new Date().toISOString(),
    }).eq("id", editingId);
    setConfigs(prev => prev.map(c => c.id === editingId ? { ...c, mensagem: editMsg, horas_antes: Number(editHoras) } : c));
    setEditingId(null);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <p className="font-body text-[13px] text-primary-foreground/30 text-center py-12">Carregando...</p>;

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="px-5 pt-5 pb-4 border-b border-primary-foreground/[0.06]">
        <SheetTitle className="font-heading text-[16px] font-semibold text-primary-foreground flex items-center gap-2">
          <Bell className="w-4 h-4 text-gold" />
          Configurações de Lembretes
        </SheetTitle>
        <SheetDescription className="font-body text-[11px] text-primary-foreground/35">
          Configure mensagens automáticas para cada etapa do agendamento
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {configs.map(c => {
          const info = tipoLabels[c.tipo] || { label: c.tipo, icon: "📌", desc: "" };
          return (
            <div key={c.id} className={`rounded-2xl border transition-all ${c.ativo ? "bg-primary-foreground/[0.03] border-primary-foreground/[0.08]" : "bg-primary-foreground/[0.01] border-primary-foreground/[0.04] opacity-60"}`}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px]">{info.icon}</span>
                    <span className="font-body text-[13px] font-medium text-primary-foreground">{info.label}</span>
                  </div>
                  <button
                    onClick={() => toggleAtivo(c.id)}
                    className={`w-10 h-6 rounded-full relative transition-all duration-200 ${c.ativo ? "bg-gold" : "bg-primary-foreground/10"}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${c.ativo ? "left-4" : "left-0.5"}`} />
                  </button>
                </div>
                <p className="font-body text-[10px] text-primary-foreground/30 mb-2">{info.desc}</p>

                {editingId === c.id ? (
                  <div className="space-y-2 mt-2">
                    <textarea
                      value={editMsg}
                      onChange={e => setEditMsg(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.08] text-primary-foreground font-body text-[12px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20 resize-none"
                    />
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="font-body text-[10px] text-primary-foreground/30 mb-1 block">Horas antes</label>
                        <input
                          type="number"
                          value={editHoras}
                          onChange={e => setEditHoras(e.target.value)}
                          min="0"
                          className="w-full px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.08] text-primary-foreground font-body text-[12px] focus:outline-none focus:ring-2 focus:ring-gold/20"
                        />
                      </div>
                      <div className="flex gap-1 pt-4">
                        <button onClick={saveEdit} disabled={saving} className="p-2 rounded-xl bg-gold/10 text-gold hover:bg-gold/20 transition-all">
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-2 rounded-xl bg-primary-foreground/[0.05] text-primary-foreground/30 hover:text-primary-foreground/50 transition-all">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-primary-foreground/[0.02] border border-primary-foreground/[0.04]">
                      <MessageSquare className="w-3 h-3 text-primary-foreground/20 mt-0.5 shrink-0" />
                      <p className="font-body text-[11px] text-primary-foreground/50 leading-relaxed">{c.mensagem}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      {c.horas_antes > 0 ? (
                        <span className="font-body text-[10px] text-gold/60">{c.horas_antes}h antes</span>
                      ) : (
                        <span className="font-body text-[10px] text-primary-foreground/25">Imediato</span>
                      )}
                      <button onClick={() => startEdit(c)} className="p-1.5 rounded-lg hover:bg-primary-foreground/[0.06] text-primary-foreground/25 hover:text-primary-foreground/50 transition-all">
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {saved && (
        <div className="px-4 py-3 border-t border-primary-foreground/[0.06]">
          <p className="font-body text-[11px] text-green-500 text-center">✓ Configuração salva com sucesso</p>
        </div>
      )}

      <div className="px-4 py-3 border-t border-primary-foreground/[0.06]">
        <p className="font-body text-[10px] text-primary-foreground/25 leading-relaxed text-center">
          💡 Os lembretes serão enviados via WhatsApp automaticamente conforme a configuração.
        </p>
      </div>
    </div>
  );
};

// ─── Password Gate ───
const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.classList.add("admin-mobile-page");
    document.body.classList.add("admin-mobile-page");

    return () => {
      document.documentElement.classList.remove("admin-mobile-page");
      document.body.classList.remove("admin-mobile-page");
    };
  }, []);

  if (!authenticated) {
    return (
      <div className="admin-mobile-shell min-h-dvh w-screen max-w-full overflow-x-hidden bg-charcoal px-4">
        <div className="mx-auto flex min-h-dvh w-full max-w-sm items-center justify-center py-6">
          <div className="w-full rounded-3xl border border-primary-foreground/[0.08] bg-charcoal/70 p-8 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.6)] backdrop-blur-2xl space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
                <Settings className="h-7 w-7 text-gold" />
              </div>
              <h1 className="font-heading text-2xl font-semibold text-primary-foreground">Painel Admin</h1>
              <p className="mt-1 font-body text-[13px] text-primary-foreground/40">Acesso restrito</p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (password === ADMIN_PASSWORD) {
                  setAuthenticated(true);
                  setError("");
                } else {
                  setError("Senha incorreta");
                }
              }}
              className="space-y-4"
            >
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha de acesso"
                className="w-full rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] px-4 py-3 text-primary-foreground font-body text-[15px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20"
              />
              {error && <p className="font-body text-[12px] text-rose text-center">{error}</p>}
              <button type="submit" className="w-full rounded-2xl bg-rose py-3.5 text-primary-foreground font-body text-[15px] font-semibold shadow-[0_4px_20px_-4px_hsl(340_30%_50%/0.4)]">
                Entrar
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return <AdminPanel onLogout={() => setAuthenticated(false)} />;
};

// ─── Admin Panel (Mobile First) ───
const AdminPanel = ({ onLogout }: { onLogout: () => void }) => {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [clientes, setClientes] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedAgendaDate, setSelectedAgendaDate] = useState(() => getDateKey(new Date()));

  const handleNewAgendamento = useCallback((newAg: any) => {
    setAgendamentos((prev) => [newAg, ...prev]);
    loadData();
  }, []);

  const {
    notificationsEnabled,
    soundEnabled,
    toggleNotifications,
    toggleSound,
    playSound,
  } = useAdminNotifications(true, handleNewAgendamento);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [agRes, clRes] = await Promise.all([
      supabase.from("agendamentos").select("*").order("data_agendamento", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    ]);
    if (agRes.data) setAgendamentos(agRes.data as Agendamento[]);
    if (clRes.data) setClientes(clRes.data as Profile[]);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("agendamentos").update({ status }).eq("id", id);
    setAgendamentos((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  const deleteAgendamento = async (id: string) => {
    await supabase.from("agendamentos").delete().eq("id", id);
    setAgendamentos((prev) => prev.filter((a) => a.id !== id));
  };

  const tabs: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
    { id: "dashboard", label: "Início", icon: BarChart3 },
    { id: "agendamentos", label: "Agenda", icon: Calendar },
    { id: "pedidos", label: "Pedidos", icon: ClipboardList },
    { id: "financeiro", label: "Financeiro", icon: DollarSign },
    { id: "despesas", label: "Despesas", icon: Receipt },
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "produtos", label: "Produtos", icon: ShoppingBag },
    { id: "gateway", label: "Gateway", icon: Wallet },
    { id: "horarios", label: "Horários", icon: Clock },
    { id: "servicos", label: "Serviços", icon: Settings },
  ];

  const total = agendamentos.length;
  const confirmados = agendamentos.filter((a) => a.status === "confirmado").length;
  const cancelados = agendamentos.filter((a) => a.status === "cancelado").length;
  const concluidos = agendamentos.filter((a) => a.status === "concluido").length;
  const faltas = agendamentos.filter((a) => a.status === "falta").length;
  const faturamento = agendamentos
    .filter((a) => a.status !== "cancelado" && a.status !== "falta")
    .reduce((sum, a) => sum + (a.valor_pago || 0), 0);

  const getClientName = (userId: string) => clientes.find((c) => c.id === userId)?.nome || "—";
  const formatDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const formatWhatsapp = (w: string) => (w ? `(${w.slice(0, 2)}) ${w.slice(2, 7)}-${w.slice(7)}` : "—");

  const filteredAgendamentos = agendamentos.filter((a) => {
    if (statusFilter !== "todos" && a.status !== statusFilter) return false;
    if (searchTerm) {
      const name = getClientName(a.user_id).toLowerCase();
      return name.includes(searchTerm.toLowerCase()) || a.servico.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      confirmado: "bg-gold/10 text-gold border-gold/20",
      cancelado: "bg-rose/10 text-rose border-rose/20",
      concluido: "bg-green-500/10 text-green-500 border-green-500/20",
      falta: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    };
    const labels: Record<string, string> = { confirmado: "Confirmado", cancelado: "Cancelado", concluido: "Concluído", falta: "Falta" };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-body font-medium border ${map[s] || "bg-secondary text-muted-foreground border-border"}`}>{labels[s] || s}</span>;
  };

  const pagamentoBadge = (a: Agendamento) => {
    const pago = Number(a.valor_pago || 0);
    const totalValor = Number(a.valor);
    if (pago >= totalValor) return <span className="px-2 py-0.5 rounded-full text-[10px] font-body font-medium border bg-green-500/10 text-green-500 border-green-500/20">Pago</span>;
    if (pago > 0) return <span className="px-2 py-0.5 rounded-full text-[10px] font-body font-medium border bg-gold/10 text-gold border-gold/20">Sinal</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-body font-medium border bg-primary-foreground/5 text-primary-foreground/30 border-primary-foreground/[0.06]">Pendente</span>;
  };

  const updatePayment = async (id: string, type: "sinal" | "completo") => {
    const a = agendamentos.find((item) => item.id === id);
    if (!a) return;
    const valor = Number(a.valor);
    const newPago = type === "completo" ? valor : valor * 0.5;
    await supabase.from("agendamentos").update({ valor_pago: newPago }).eq("id", id);
    setAgendamentos((prev) => prev.map((item) => (item.id === id ? { ...item, valor_pago: newPago } : item)));
  };

  const todayAgendaKey = getDateKey(new Date());
  const selectedAgendaDateObj = parseDateKey(selectedAgendaDate);
  const agendaDatesWithAppointments = Array.from(new Set(filteredAgendamentos.map((item) => item.data_agendamento))).sort((a, b) => a.localeCompare(b));
  const selectedAgendaItems = filteredAgendamentos
    .filter((item) => item.data_agendamento === selectedAgendaDate)
    .sort((a, b) => a.horario.localeCompare(b.horario));
  const selectedAgendaTotal = selectedAgendaItems.reduce((sum, item) => sum + Number(item.valor), 0);
  const selectedAgendaPago = selectedAgendaItems.reduce((sum, item) => sum + Number(item.valor_pago || 0), 0);
  const selectedAgendaLabel = selectedAgendaDate === todayAgendaKey
    ? "Hoje"
    : selectedAgendaDateObj.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="admin-mobile-shell min-h-dvh w-screen max-w-full overflow-x-hidden bg-charcoal lg:flex">
      {/* ── Desktop Sidebar (hidden on mobile) ── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:shrink-0 lg:border-r lg:border-primary-foreground/[0.06] lg:bg-charcoal lg:fixed lg:inset-y-0 lg:left-0 lg:z-30">
        <div className="px-5 pt-6 pb-4 border-b border-primary-foreground/[0.06]">
          <h1 className="font-heading text-lg font-semibold text-primary-foreground">Admin</h1>
          <p className="font-body text-[11px] text-primary-foreground/30">Estúdio Dyoli Godim</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-body text-[13px] font-medium transition-all ${
                tab === t.id
                  ? "bg-gold/10 text-gold"
                  : "text-primary-foreground/40 hover:bg-primary-foreground/[0.04] hover:text-primary-foreground/60"
              }`}
            >
              <t.icon className="h-4 w-4 shrink-0" />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="px-3 py-3 border-t border-primary-foreground/[0.06] space-y-1">
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-body text-[13px] text-primary-foreground/40 hover:bg-gold/10 hover:text-gold transition-all">
                <Bell className="h-4 w-4 shrink-0" />
                Lembretes
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[calc(100vw-0.75rem)] max-w-[22rem] overflow-x-hidden overflow-y-auto border-primary-foreground/[0.06] bg-charcoal p-0">
              <LembretesHub />
            </SheetContent>
          </Sheet>
          <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-body text-[13px] text-rose/60 hover:bg-rose/10 hover:text-rose transition-all">
            <LogOut className="h-4 w-4 shrink-0" />
            Sair
          </button>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0 lg:ml-56">
        {/* Mobile top bar (hidden on desktop) */}
        <div className="sticky top-0 z-20 border-b border-primary-foreground/[0.06] bg-charcoal/90 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex w-full max-w-md items-center justify-between px-3 py-3 sm:px-4">
            <div>
              <h1 className="font-heading text-[16px] font-semibold text-primary-foreground">Admin</h1>
              <p className="font-body text-[10px] text-primary-foreground/30">Estúdio Dyoli Godim</p>
            </div>
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <button className="flex h-11 w-11 items-center justify-center rounded-2xl text-primary-foreground/40 transition-all hover:bg-gold/10 hover:text-gold">
                    <Bell className="h-4 w-4" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[calc(100vw-0.75rem)] max-w-[22rem] overflow-x-hidden overflow-y-auto border-primary-foreground/[0.06] bg-charcoal p-0">
                  <LembretesHub />
                </SheetContent>
              </Sheet>
              <button onClick={onLogout} className="flex h-11 w-11 items-center justify-center rounded-2xl text-rose/60 transition-all hover:bg-rose/10 hover:text-rose">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop top bar */}
        <div className="hidden lg:flex sticky top-0 z-20 border-b border-primary-foreground/[0.06] bg-charcoal/90 backdrop-blur-xl items-center justify-between px-8 py-4">
          <h2 className="font-heading text-xl font-semibold text-primary-foreground">{tabs.find(t => t.id === tab)?.label}</h2>
          <p className="font-body text-[12px] text-primary-foreground/30">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>

        {/* Content */}
        <div className="mx-auto w-full max-w-md overflow-x-hidden px-3 py-4 sm:px-4 lg:max-w-4xl lg:px-8 lg:py-6">
          {tab === "dashboard" && (
            <AdminDashboard
              agendamentos={agendamentos}
              getClientName={getClientName}
              notificationsEnabled={notificationsEnabled}
              soundEnabled={soundEnabled}
              toggleNotifications={toggleNotifications}
              toggleSound={toggleSound}
              playSound={playSound}
              statusBadge={statusBadge}
              onGoToAgenda={() => setTab("agendamentos")}
            />
          )}

          {tab === "agendamentos" && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="font-heading text-lg font-semibold text-primary-foreground lg:hidden">Agendamentos</h2>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-foreground/25" />
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar cliente ou serviço..."
                      className="w-full rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] py-2.5 pl-10 pr-4 text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20"
                    />
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
                    {[
                      { value: "todos", label: "Todos" },
                      { value: "confirmado", label: "Confirmados" },
                      { value: "concluido", label: "Concluídos" },
                      { value: "cancelado", label: "Cancelados" },
                      { value: "falta", label: "Faltas" },
                    ].map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setStatusFilter(f.value)}
                        className={`px-3 py-1.5 rounded-full font-body text-[11px] font-medium whitespace-nowrap border transition-all ${statusFilter === f.value ? "bg-gold/10 text-gold border-gold/20" : "bg-primary-foreground/[0.03] text-primary-foreground/40 border-primary-foreground/[0.06]"}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 lg:flex-col lg:items-stretch">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setSelectedAgendaDate(todayAgendaKey)}
                    className="h-11 flex-1 rounded-2xl bg-primary-foreground/[0.06] px-4 text-primary-foreground hover:bg-primary-foreground/[0.1] lg:flex-none"
                  >
                    Hoje
                  </Button>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-11 flex-1 rounded-2xl bg-gold/10 px-4 text-gold hover:bg-gold/20 lg:min-w-[220px]"
                      >
                        <Calendar className="h-4 w-4" />
                        {selectedAgendaDateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-auto rounded-3xl border border-primary-foreground/[0.06] bg-background p-0">
                      <div className="border-b border-primary-foreground/[0.06] px-4 py-3">
                        <p className="font-heading text-[15px] font-semibold text-primary-foreground">Selecionar data</p>
                        <p className="font-body text-[11px] text-primary-foreground/35">Os dias marcados têm pedido</p>
                      </div>
                      <DatePickerCalendar
                        mode="single"
                        selected={selectedAgendaDateObj}
                        onSelect={(date) => date && setSelectedAgendaDate(getDateKey(date))}
                        modifiers={{
                          hasAppointments: agendaDatesWithAppointments.map((dateKey) => parseDateKey(dateKey)),
                        }}
                        modifiersClassNames={{
                          hasAppointments: "relative after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-gold",
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <section className="overflow-hidden rounded-[28px] border border-primary-foreground/[0.06] bg-primary-foreground/[0.03]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary-foreground/[0.06] px-4 py-4 lg:px-5">
                  <div className="min-w-0">
                    <p className="font-body text-[11px] uppercase tracking-[0.22em] text-primary-foreground/25">Agenda do dia</p>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        onClick={() => setSelectedAgendaDate(shiftDate(selectedAgendaDate, -1))}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-foreground/[0.06] text-primary-foreground/50 transition-all hover:bg-primary-foreground/[0.12] hover:text-primary-foreground"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <h3 className="font-heading text-[22px] font-semibold capitalize text-primary-foreground">{selectedAgendaLabel}</h3>
                      <button
                        onClick={() => setSelectedAgendaDate(shiftDate(selectedAgendaDate, 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-foreground/[0.06] text-primary-foreground/50 transition-all hover:bg-primary-foreground/[0.12] hover:text-primary-foreground"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-1 font-body text-[11px] text-primary-foreground/35">
                      {selectedAgendaDateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </p>
                  </div>

                  <div className="grid w-full grid-cols-3 gap-2 lg:w-auto lg:min-w-[360px]">
                    <div className="rounded-2xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.04] px-3 py-2">
                      <p className="font-body text-[10px] text-primary-foreground/30">Pedidos</p>
                      <p className="font-body text-[15px] font-semibold text-primary-foreground">{selectedAgendaItems.length}</p>
                    </div>
                    <div className="rounded-2xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.04] px-3 py-2">
                      <p className="font-body text-[10px] text-primary-foreground/30">Previsto</p>
                      <p className="font-body text-[13px] font-semibold text-primary-foreground">R$ {selectedAgendaTotal.toFixed(0)}</p>
                    </div>
                    <div className="rounded-2xl border border-gold/20 bg-gold/10 px-3 py-2">
                      <p className="font-body text-[10px] text-gold/70">Recebido</p>
                      <p className="font-body text-[13px] font-semibold text-gold">R$ {selectedAgendaPago.toFixed(0)}</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 lg:p-4">
                  {selectedAgendaItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-primary-foreground/[0.08] bg-primary-foreground/[0.02] px-4 py-10 text-center">
                      <p className="font-heading text-[20px] font-semibold text-primary-foreground">Nenhum pedido nessa data</p>
                      <p className="mt-2 font-body text-[12px] text-primary-foreground/35">Escolha outro dia no calendário ou toque em Hoje para voltar para a agenda atual.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                      {selectedAgendaItems.map((a) => (
                        <article key={a.id} className="rounded-2xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.04] p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <div className="flex min-w-[54px] flex-col items-center rounded-2xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.03] px-2 py-2">
                                <span className="font-heading text-[16px] font-semibold text-primary-foreground">{a.horario}</span>
                                <span className="font-body text-[9px] uppercase tracking-[0.18em] text-primary-foreground/25">horário</span>
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate font-body text-[14px] font-semibold text-primary-foreground">{getClientName(a.user_id)}</p>
                                <p className="mt-0.5 truncate font-body text-[11px] text-primary-foreground/40">{a.servico}{a.variacao ? ` · ${a.variacao}` : ""}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  {statusBadge(a.status)}
                                  {pagamentoBadge(a)}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 rounded-xl border border-primary-foreground/[0.05] bg-primary-foreground/[0.02] px-3 py-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-body text-[11px] text-primary-foreground/35">Valor do atendimento</p>
                              <p className="font-body text-[13px] font-semibold text-gold">R$ {Number(a.valor).toFixed(2).replace(".", ",")}</p>
                            </div>
                            {Number(a.valor_pago || 0) > 0 && (
                              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                                <p className="font-body text-[11px] text-primary-foreground/35">Já recebido</p>
                                <p className="font-body text-[12px] font-medium text-primary-foreground">R$ {Number(a.valor_pago || 0).toFixed(2).replace(".", ",")}</p>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-primary-foreground/[0.06] pt-3">
                            <div className="flex flex-wrap items-center gap-1">
                              {a.status !== "cancelado" && a.status !== "falta" && (
                                <>
                                  <button
                                    onClick={() => updatePayment(a.id, "sinal")}
                                    title="Marcar sinal (50%)"
                                    className={`rounded-lg px-2 py-1 font-body text-[10px] font-medium transition-all ${Number(a.valor_pago || 0) > 0 && Number(a.valor_pago || 0) < Number(a.valor) ? "bg-gold/10 text-gold" : "bg-primary-foreground/[0.03] text-primary-foreground/30 hover:bg-gold/10 hover:text-gold"}`}
                                  >
                                    Sinal
                                  </button>
                                  <button
                                    onClick={() => updatePayment(a.id, "completo")}
                                    title="Marcar pago completo"
                                    className={`rounded-lg px-2 py-1 font-body text-[10px] font-medium transition-all ${Number(a.valor_pago || 0) >= Number(a.valor) ? "bg-green-500/10 text-green-500" : "bg-primary-foreground/[0.03] text-primary-foreground/30 hover:bg-green-500/10 hover:text-green-500"}`}
                                  >
                                    Pago
                                  </button>
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-1 self-end">
                              {a.status === "confirmado" && (
                                <>
                                  <button onClick={() => updateStatus(a.id, "concluido")} className="rounded-lg p-1.5 text-green-500/50 transition-all hover:bg-green-500/10 hover:text-green-500" title="Concluir">
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => updateStatus(a.id, "falta")} className="rounded-lg p-1.5 text-orange-500/50 transition-all hover:bg-orange-500/10 hover:text-orange-500" title="Marcar falta">
                                    <UserX className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => updateStatus(a.id, "cancelado")} className="rounded-lg p-1.5 text-rose/50 transition-all hover:bg-rose/10 hover:text-rose" title="Cancelar">
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              <button onClick={() => deleteAgendamento(a.id)} className="rounded-lg p-1.5 text-primary-foreground/20 transition-all hover:bg-rose/10 hover:text-rose" title="Excluir">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {tab === "clientes" &&
            (() => {
              const selProfile = clientes.find((c) => c.id === selectedClient);
              const selAgendamentos = agendamentos.filter((a) => a.user_id === selectedClient);
              const totalGasto = selAgendamentos.reduce((s, a) => s + (a.valor_pago || 0), 0);
              const totalValor = selAgendamentos.reduce((s, a) => s + a.valor, 0);
              const confirmedCount = selAgendamentos.filter((a) => a.status === "confirmado" || a.status === "concluido").length;
              const faltaCount = selAgendamentos.filter((a) => a.status === "falta").length;
              const cancelCount = selAgendamentos.filter((a) => a.status === "cancelado").length;

              const clientSearch = searchTerm.toLowerCase();
              const filteredClientes = clientes.filter((c) => {
                if (!clientSearch) return true;
                return c.nome.toLowerCase().includes(clientSearch) || c.whatsapp.includes(clientSearch);
              });

              const totalClientes = clientes.length;
              const clientesAtivos = clientes.filter((c) => agendamentos.some((a) => a.user_id === c.id && (a.status === "confirmado" || a.status === "concluido"))).length;
              const receitaTotal = clientes.reduce((sum, c) => sum + agendamentos.filter((a) => a.user_id === c.id).reduce((s, a) => s + (a.valor_pago || 0), 0), 0);

              return (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-heading text-lg font-semibold text-primary-foreground lg:hidden">Clientes</h2>
                    <p className="hidden lg:block font-body text-[12px] text-primary-foreground/30">{totalClientes} clientes</p>
                    <button
                      onClick={() => {
                        const header = "Nome,WhatsApp,Agendamentos,Total Pago (R$),Cliente Desde\n";
                        const rows = clientes.map((c) => {
                          const count = agendamentos.filter((a) => a.user_id === c.id).length;
                          const gasto = agendamentos.filter((a) => a.user_id === c.id).reduce((s, a) => s + (a.valor_pago || 0), 0);
                          return `"${c.nome}","${c.whatsapp}",${count},${gasto.toFixed(2)},"${new Date(c.created_at).toLocaleDateString("pt-BR")}"`;
                        }).join("\n");
                        const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `clientes_${new Date().toISOString().split("T")[0]}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="flex shrink-0 items-center gap-1.5 px-3 py-2 rounded-xl bg-gold/10 text-gold font-body text-[12px] font-medium hover:bg-gold/20 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Exportar CSV
                    </button>
                  </div>

                  {/* KPIs */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.03] p-3 text-center">
                      <p className="font-heading text-[20px] font-bold text-primary-foreground">{totalClientes}</p>
                      <p className="font-body text-[9px] text-primary-foreground/30">Total</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                      <p className="font-heading text-[20px] font-bold text-emerald-400">{clientesAtivos}</p>
                      <p className="font-body text-[9px] text-emerald-400/60">Ativos</p>
                    </div>
                    <div className="rounded-2xl border border-gold/20 bg-gold/5 p-3 text-center">
                      <p className="font-heading text-[16px] font-bold text-gold">R$ {receitaTotal.toFixed(0)}</p>
                      <p className="font-body text-[9px] text-gold/60">Receita</p>
                    </div>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/20" />
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por nome ou WhatsApp..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20"
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-foreground/30 hover:text-primary-foreground/60">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Client list */}
                  <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                    {filteredClientes.map((c) => {
                      const count = agendamentos.filter((a) => a.user_id === c.id).length;
                      const gasto = agendamentos.filter((a) => a.user_id === c.id).reduce((s, a) => s + (a.valor_pago || 0), 0);
                      const lastVisit = agendamentos.filter((a) => a.user_id === c.id && (a.status === "confirmado" || a.status === "concluido")).sort((a, b) => b.data_agendamento.localeCompare(a.data_agendamento))[0];
                      return (
                        <div key={c.id} onClick={() => setSelectedClient(c.id)} className="cursor-pointer rounded-2xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.03] p-4 transition-all active:scale-[0.98] hover:border-gold/30">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-10 h-10 shrink-0 rounded-full bg-gold/10 flex items-center justify-center">
                                <span className="font-heading text-[14px] font-bold text-gold">{c.nome.charAt(0).toUpperCase()}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-body text-[14px] font-medium text-primary-foreground truncate">{c.nome}</p>
                                <p className="font-body text-[11px] text-primary-foreground/40">{formatWhatsapp(c.whatsapp)}</p>
                                {lastVisit && <p className="font-body text-[10px] text-primary-foreground/20">Última visita: {formatDate(lastVisit.data_agendamento)}</p>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-body text-[14px] font-semibold text-gold">R$ {gasto.toFixed(2).replace(".", ",")}</p>
                              <p className="font-body text-[10px] text-primary-foreground/30">{count} agendamento{count !== 1 ? "s" : ""}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {filteredClientes.length === 0 && <p className="py-6 text-center font-body text-[13px] text-primary-foreground/30 lg:col-span-2">{searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}</p>}
                  </div>

                  <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
                    <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto overflow-x-hidden rounded-2xl border border-gold/20 bg-charcoal p-4 sm:p-5">
                      <DialogHeader>
                        <DialogTitle className="font-heading text-lg text-primary-foreground">{selProfile?.nome || "Cliente"}</DialogTitle>
                      </DialogHeader>
                      {selProfile && (
                        <div className="space-y-4">
                          <div className="space-y-1 rounded-xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.03] p-3">
                            <p className="font-body text-[12px] text-primary-foreground/50">📱 {formatWhatsapp(selProfile.whatsapp)}</p>
                            <p className="font-body text-[12px] text-primary-foreground/50">📅 Cliente desde {new Date(selProfile.created_at).toLocaleDateString("pt-BR")}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl border border-gold/10 bg-gold/5 p-3 text-center">
                              <p className="font-body text-[18px] font-bold text-gold">R$ {totalGasto.toFixed(2).replace(".", ",")}</p>
                              <p className="font-body text-[10px] text-gold/60">Total pago</p>
                            </div>
                            <div className="rounded-xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.03] p-3 text-center">
                              <p className="font-body text-[18px] font-bold text-primary-foreground">R$ {totalValor.toFixed(2).replace(".", ",")}</p>
                              <p className="font-body text-[10px] text-primary-foreground/30">Valor total</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-center">
                              <p className="font-body text-[16px] font-bold text-emerald-400">{confirmedCount}</p>
                              <p className="font-body text-[9px] text-emerald-400/60">Realizados</p>
                            </div>
                            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-center">
                              <p className="font-body text-[16px] font-bold text-red-400">{faltaCount}</p>
                              <p className="font-body text-[9px] text-red-400/60">Faltas</p>
                            </div>
                            <div className="rounded-xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.03] p-2 text-center">
                              <p className="font-body text-[16px] font-bold text-primary-foreground/50">{cancelCount}</p>
                              <p className="font-body text-[9px] text-primary-foreground/30">Cancelados</p>
                            </div>
                          </div>
                          <div>
                            <p className="mb-2 font-body text-[12px] font-medium text-primary-foreground/50">Histórico de agendamentos</p>
                            <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                              {selAgendamentos.length === 0 && <p className="py-4 text-center font-body text-[12px] text-primary-foreground/30">Nenhum agendamento</p>}
                              {selAgendamentos
                                .sort((a, b) => b.data_agendamento.localeCompare(a.data_agendamento))
                                .map((a) => (
                                  <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-primary-foreground/[0.04] bg-primary-foreground/[0.02] p-2.5">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-body text-[12px] text-primary-foreground truncate">{a.servico}{a.variacao ? ` - ${a.variacao}` : ""}</p>
                                      <p className="font-body text-[10px] text-primary-foreground/30">{formatDate(a.data_agendamento)} às {a.horario}</p>
                                    </div>
                                    <div className="ml-2 text-right shrink-0">
                                      <p className="font-body text-[12px] font-medium text-gold">R$ {(a.valor_pago || 0).toFixed(2).replace(".", ",")}</p>
                                      <span
                                        className={`px-1.5 py-0.5 rounded-full font-body text-[9px] ${
                                          a.status === "confirmado" || a.status === "concluido"
                                            ? "bg-emerald-500/10 text-emerald-400"
                                            : a.status === "falta"
                                              ? "bg-red-500/10 text-red-400"
                                              : a.status === "cancelado"
                                                ? "bg-primary-foreground/[0.05] text-primary-foreground/30"
                                                : "bg-gold/10 text-gold"
                                        }`}
                                      >
                                        {a.status}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              );
            })()}

          {tab === "financeiro" && <FinanceiroTab agendamentos={agendamentos} getClientName={getClientName} />}
          {tab === "pedidos" && <PedidosTab agendamentos={agendamentos} getClientName={getClientName} onUpdate={loadData} />}
          {tab === "despesas" && <DespesasTab />}
          {tab === "produtos" && <ProdutosTab />}
          {tab === "gateway" && <GatewayTab />}
          {tab === "horarios" && <HorariosTab />}
          {tab === "servicos" && <ServicosTab />}
        </div>
      </div>

      {/* Mobile bottom nav (hidden on desktop) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-primary-foreground/[0.06] bg-charcoal/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto flex w-full max-w-md justify-around px-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex min-w-0 flex-col items-center gap-0.5 px-1 py-2.5 transition-all ${tab === t.id ? "text-gold" : "text-primary-foreground/30"}`}>
              <t.icon className="h-4 w-4 shrink-0" />
              <span className="w-full truncate text-center font-body text-[8px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

// ─── Horários Tab ───
const HorariosTab = () => {
  const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const [hours, setHours] = useState<{ id: string; day: number; open: boolean; start: string; end: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Bloqueio manual
  const [blockDate, setBlockDate] = useState(new Date().toISOString().split("T")[0]);
  const [blockedSlots, setBlockedSlots] = useState<{ id: string; data: string; horario: string; motivo: string }[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);

  useEffect(() => {
    supabase.from("horarios_funcionamento").select("*").order("dia_semana").then(({ data }) => {
      if (data) setHours(data.map(d => ({ id: d.id, day: d.dia_semana, open: d.aberto, start: d.hora_inicio, end: d.hora_fim })));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadBlocks();
  }, [blockDate]);

  const loadBlocks = async () => {
    setLoadingBlocks(true);
    const { data } = await supabase.from("horarios_bloqueados").select("*").eq("data", blockDate);
    setBlockedSlots(data?.map(d => ({ id: d.id, data: d.data, horario: d.horario, motivo: d.motivo || "" })) || []);
    setLoadingBlocks(false);
  };

  const toggle = (day: number) => setHours(prev => prev.map(h => h.day === day ? { ...h, open: !h.open } : h));
  const updateTime = (day: number, field: "start" | "end", val: string) => setHours(prev => prev.map(h => h.day === day ? { ...h, [field]: val } : h));

  const handleSave = async () => {
    setSaving(true);
    for (const h of hours) {
      await supabase.from("horarios_funcionamento").update({ aberto: h.open, hora_inicio: h.start, hora_fim: h.end, updated_at: new Date().toISOString() }).eq("id", h.id);
    }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  // Get time slots for the selected block date
  const getBlockDateSlots = () => {
    const d = new Date(blockDate + "T12:00:00");
    const dayHours = hours.find(h => h.day === d.getDay());
    if (!dayHours || !dayHours.open) return [];
    const result: string[] = [];
    const [oh] = dayHours.start.split(":").map(Number);
    const [ch] = dayHours.end.split(":").map(Number);
    for (let h = oh; h < ch; h++) {
      result.push(`${String(h).padStart(2, "0")}:00`);
    }
    return result;
  };

  const toggleBlock = async (horario: string) => {
    const existing = blockedSlots.find(b => b.horario === horario);
    if (existing) {
      await supabase.from("horarios_bloqueados").delete().eq("id", existing.id);
      setBlockedSlots(prev => prev.filter(b => b.id !== existing.id));
    } else {
      const { data } = await supabase.from("horarios_bloqueados").insert({ data: blockDate, horario, motivo: "" }).select().single();
      if (data) setBlockedSlots(prev => [...prev, { id: data.id, data: data.data, horario: data.horario, motivo: data.motivo || "" }]);
    }
  };

  const blockAllDay = async () => {
    const slots = getBlockDateSlots();
    const unblockedSlots = slots.filter(s => !blockedSlots.find(b => b.horario === s));
    if (unblockedSlots.length === 0) {
      // Unblock all
      for (const b of blockedSlots) {
        await supabase.from("horarios_bloqueados").delete().eq("id", b.id);
      }
      setBlockedSlots([]);
    } else {
      // Block all remaining
      for (const s of unblockedSlots) {
        const { data } = await supabase.from("horarios_bloqueados").insert({ data: blockDate, horario: s, motivo: "" }).select().single();
        if (data) setBlockedSlots(prev => [...prev, { id: data.id, data: data.data, horario: data.horario, motivo: data.motivo || "" }]);
      }
    }
  };

  const slots = getBlockDateSlots();
  const allBlocked = slots.length > 0 && slots.every(s => blockedSlots.find(b => b.horario === s));

  if (loading) return <p className="font-body text-[13px] text-primary-foreground/30 text-center py-8">Carregando...</p>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-primary-foreground">Horários</h2>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gold/10 text-gold font-body text-[12px] font-medium hover:bg-gold/20 transition-all disabled:opacity-40">
          <Save className="w-3.5 h-3.5" />
          {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar"}
        </button>
      </div>

      {/* Funcionamento semanal */}
      <div className="space-y-2">
        {hours.map(h => (
          <div key={h.day} className="p-3 rounded-2xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06] overflow-x-hidden">
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="font-body text-[13px] text-primary-foreground">{dayNames[h.day]}</span>
              <button onClick={() => toggle(h.day)} className={`shrink-0 w-10 h-6 rounded-full relative transition-all duration-200 ${h.open ? "bg-gold" : "bg-primary-foreground/10"}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${h.open ? "left-4" : "left-0.5"}`} />
              </button>
            </div>
            {h.open ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] items-center min-w-0">
                <input type="time" value={h.start} onChange={e => updateTime(h.day, "start", e.target.value)} className="w-full min-w-0 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
                <span className="text-primary-foreground/30 text-[12px] text-center">até</span>
                <input type="time" value={h.end} onChange={e => updateTime(h.day, "end", e.target.value)} className="w-full min-w-0 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
              </div>
            ) : <p className="font-body text-[12px] text-primary-foreground/25">Fechado</p>}
          </div>
        ))}
      </div>

      {/* Bloqueio manual de horários */}
      <div className="p-4 rounded-2xl bg-primary-foreground/[0.03] border border-rose/10 overflow-x-hidden">
        <h3 className="font-body text-[13px] font-medium text-primary-foreground flex items-center gap-2 mb-3">
          🔒 Bloqueio manual de horários
        </h3>
        <p className="font-body text-[10px] text-primary-foreground/30 mb-3">Selecione uma data e bloqueie/desbloqueie horários individualmente</p>

        <div className="grid grid-cols-1 gap-2 mb-3 sm:grid-cols-[1fr_auto] min-w-0">
          <input type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)}
            className="w-full min-w-0 px-3 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
          <button onClick={blockAllDay}
            className={`w-full sm:w-auto px-3 py-2.5 rounded-xl font-body text-[11px] font-medium transition-all whitespace-nowrap ${allBlocked ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "bg-rose/10 text-rose hover:bg-rose/20"}`}>
            {allBlocked ? "Liberar dia" : "Bloquear dia"}
          </button>
        </div>

        {loadingBlocks ? (
          <p className="font-body text-[12px] text-primary-foreground/20 text-center py-4">Carregando...</p>
        ) : slots.length === 0 ? (
          <p className="font-body text-[12px] text-primary-foreground/20 text-center py-4">Dia fechado — sem horários disponíveis</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {slots.map(slot => {
              const isBlocked = !!blockedSlots.find(b => b.horario === slot);
              return (
                <button
                  key={slot}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleBlock(slot);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleBlock(slot);
                    }
                  }}
                  className={`w-full min-h-[46px] touch-manipulation select-none px-2 py-3 rounded-xl font-body text-[13px] font-medium transition-all border overflow-hidden ${
                    isBlocked
                      ? "bg-rose/10 text-rose border-rose/20 line-through"
                      : "bg-primary-foreground/[0.03] text-primary-foreground/60 border-primary-foreground/[0.06] hover:bg-gold/10 hover:text-gold hover:border-gold/20"
                  }`}
                >
                  <span className="block truncate">{slot}</span>
                  {isBlocked && <span className="block text-[8px] mt-0.5 no-underline truncate">🔒 Bloqueado</span>}
                </button>
              );
            })}
          </div>
        )}

        {blockedSlots.length > 0 && (
          <p className="font-body text-[10px] text-rose/60 mt-3 text-center">
            {blockedSlots.length} horário{blockedSlots.length > 1 ? "s" : ""} bloqueado{blockedSlots.length > 1 ? "s" : ""} neste dia
          </p>
        )}
      </div>

      <div className="p-3 rounded-2xl bg-gold/5 border border-gold/10">
        <p className="font-body text-[11px] text-gold/70 leading-relaxed">⚠ Alterações nos horários afetam apenas novos agendamentos. Bloqueios manuais impedem clientes de agendar nesses horários.</p>
      </div>
    </div>
  );
};

// ─── Serviços Tab ───
const ServicosTab = () => {
  const [services, setServices] = useState<{ id: string; name: string; price: number; category: string; active: boolean; duration: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newDuration, setNewDuration] = useState("60");

  useEffect(() => {
    supabase.from("servicos").select("*").order("ordem").then(({ data }) => {
      if (data) setServices(data.map(s => ({ id: s.id, name: s.nome, price: Number(s.preco), category: s.categoria, active: s.ativo, duration: s.duracao_minutos || 60 })));
      setLoading(false);
    });
  }, []);

  const startEdit = (s: typeof services[0]) => { setEditing(s.id); setEditName(s.name); setEditPrice(s.price.toString()); setEditDuration(s.duration.toString()); };
  const saveEdit = async (id: string) => {
    await supabase.from("servicos").update({ nome: editName, preco: Number(editPrice), duracao_minutos: Number(editDuration), updated_at: new Date().toISOString() }).eq("id", id);
    setServices(prev => prev.map(s => s.id === id ? { ...s, name: editName, price: Number(editPrice), duration: Number(editDuration) } : s));
    setEditing(null);
  };
  const addService = async () => {
    if (!newName || !newPrice) return;
    const { data } = await supabase.from("servicos").insert({ nome: newName, preco: Number(newPrice), categoria: newCategory || "Outros", ativo: true, ordem: services.length + 1, duracao_minutos: Number(newDuration) || 60 }).select().single();
    if (data) setServices(prev => [...prev, { id: data.id, name: data.nome, price: Number(data.preco), category: data.categoria, active: data.ativo, duration: data.duracao_minutos || 60 }]);
    setNewName(""); setNewPrice(""); setNewCategory(""); setNewDuration("60"); setShowAdd(false);
  };
  const toggleActive = async (id: string) => {
    const s = services.find(s => s.id === id);
    if (!s) return;
    await supabase.from("servicos").update({ ativo: !s.active, updated_at: new Date().toISOString() }).eq("id", id);
    setServices(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };
  const removeService = async (id: string) => {
    await supabase.from("servicos").delete().eq("id", id);
    setServices(prev => prev.filter(s => s.id !== id));
  };

  if (loading) return <p className="font-body text-[13px] text-primary-foreground/30 text-center py-8">Carregando...</p>;

  return (
    <div className="space-y-4 animate-fade-in overflow-x-hidden">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold text-primary-foreground">Serviços</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="flex shrink-0 items-center gap-1.5 px-3 py-2 rounded-xl bg-gold/10 text-gold font-body text-[12px] font-medium hover:bg-gold/20 transition-all">
          <Plus className="w-3.5 h-3.5" />Adicionar
        </button>
      </div>
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:max-w-md max-h-[85dvh] overflow-y-auto overflow-x-hidden bg-charcoal border border-gold/20 rounded-2xl p-4 sm:p-5">
          <DialogHeader>
            <DialogTitle className="font-body text-[14px] font-medium text-primary-foreground">Novo Serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 w-full min-w-0 overflow-x-hidden">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do serviço" className="w-full min-w-0 px-3 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20" />
            <div className="grid grid-cols-1 gap-2 min-w-0 sm:grid-cols-2">
              <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Preço" type="number" className="w-full min-w-0 px-3 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20" />
              <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Categoria" className="w-full min-w-0 px-3 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20" />
            </div>
            <div className="min-w-0">
              <label className="font-body text-[10px] text-primary-foreground/30 mb-1 block">Duração (minutos)</label>
              <input value={newDuration} onChange={e => setNewDuration(e.target.value)} placeholder="60" type="number" className="w-full min-w-0 px-3 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20" />
            </div>
            <div className="grid grid-cols-2 gap-2 min-w-0">
              <button onClick={addService} className="w-full min-w-0 py-2.5 rounded-xl bg-gold/10 text-gold font-body text-[12px] font-medium hover:bg-gold/20 transition-all">Salvar</button>
              <button onClick={() => setShowAdd(false)} className="w-full min-w-0 py-2.5 rounded-xl bg-primary-foreground/[0.05] text-primary-foreground/40 font-body text-[12px] hover:text-primary-foreground/60 transition-all">Cancelar</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="space-y-2">
        {services.map(s => (
          <div key={s.id} className={`p-4 rounded-2xl border transition-all overflow-x-hidden ${s.active ? "bg-primary-foreground/[0.03] border-primary-foreground/[0.06]" : "bg-primary-foreground/[0.01] border-primary-foreground/[0.03] opacity-50"}`}>
            {editing === s.id ? (
              <div className="space-y-2 min-w-0">
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full min-w-0 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
                <div className="grid grid-cols-[1fr_96px] gap-2 min-w-0">
                  <input value={editPrice} onChange={e => setEditPrice(e.target.value)} type="number" placeholder="Preço" className="w-full min-w-0 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
                  <input value={editDuration} onChange={e => setEditDuration(e.target.value)} type="number" placeholder="Min" className="w-full min-w-0 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <button onClick={() => saveEdit(s.id)} className="min-w-0 px-3 py-2 rounded-xl bg-gold/10 text-gold hover:bg-gold/20 transition-all font-body text-[12px]"><Save className="w-4 h-4 inline mr-1" />Salvar</button>
                  <button onClick={() => setEditing(null)} className="px-3 py-2 rounded-xl bg-primary-foreground/[0.05] text-primary-foreground/30 hover:text-primary-foreground/50 transition-all"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-[14px] font-medium text-primary-foreground truncate">{s.name}</p>
                    <p className="font-body text-[10px] text-primary-foreground/30 truncate">{s.category} · {s.duration}min</p>
                  </div>
                  <p className="font-body text-[14px] font-semibold text-gold ml-2 shrink-0">R$ {s.price.toFixed(2).replace(".", ",")}</p>
                </div>
                <div className="flex items-center justify-end gap-2 mt-2">
                  <button onClick={() => toggleActive(s.id)} className={`w-10 h-6 rounded-full relative transition-all duration-200 ${s.active ? "bg-gold" : "bg-primary-foreground/10"}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${s.active ? "left-4" : "left-0.5"}`} />
                  </button>
                  <button onClick={() => startEdit(s)} className="p-1.5 rounded-lg hover:bg-primary-foreground/[0.06] text-primary-foreground/30 hover:text-primary-foreground/60 transition-all"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => removeService(s.id)} className="p-1.5 rounded-lg hover:bg-rose/10 text-primary-foreground/20 hover:text-rose transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Admin;
