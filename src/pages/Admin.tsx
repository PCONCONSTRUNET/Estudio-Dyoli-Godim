import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { notifyAgendamentoConfirmadoById, notifyLembreteById } from "@/lib/notify-webhook";
import { sendPush } from "@/lib/push-notify";
import {
  BarChart3, Calendar, Users, Clock, Settings, LogOut, Search,
  X, Edit2, Trash2, Plus, Save, CheckCircle, Bell, MessageSquare,
  UserX, DollarSign, CreditCard, ShoppingBag, Download, ChevronLeft, ChevronRight, Receipt, ClipboardList, Wallet, Timer, PlusCircle, Menu,
  Sparkles, Folder, Filter, TrendingUp, Power, Eye, EyeOff, ChevronUp, ChevronDown, FileText
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PlusButton from "@/components/ui/plus-button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import logo from "@/assets/logo.png";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import FinanceiroTab from "@/components/FinanceiroTab";
import CaixaTab from "@/components/CaixaTab";
import DividasTab from "@/components/DividasTab";
import DespesasTab from "@/components/DespesasTab";
import PedidosTab from "@/components/PedidosTab";
import BinButton from "@/components/ui/bin-button";
import GatewayTab from "@/components/GatewayTab";
import AdminBotWpp from "@/pages/AdminBotWpp";
import ProdutosTab from "@/components/ProdutosTab";
import PagamentosTab from "@/components/PagamentosTab";
import AnamneseTab from "@/components/AnamneseTab";
import AvaliacoesTab from "@/components/AvaliacoesTab";
import { Star } from "lucide-react";
import AdminDashboard from "@/components/AdminDashboard";
import { useAdminNotifications } from "@/hooks/use-admin-notifications";
import { unlockNotificationAudio } from "@/lib/notification-sound";
import { Switch } from "@/components/ui/switch";

// ─── Types ───
interface Agendamento {
  id: string; servico: string; variacao: string | null; data_agendamento: string;
  horario: string; valor: number; valor_pago: number | null; status: string;
  valor_troco?: number | null; valor_gorjeta?: number | null; valor_credito?: number | null;
  created_at: string; user_id: string; duracao_minutos: number; forma_pagamento: string | null;
  cliente_nome: string | null;
  origem?: string | null;
  observacao?: string | null;
}
interface Profile { id: string; nome: string; whatsapp: string; cpf?: string | null; created_at: string; credito_saldo?: number | null; }
interface LembreteConfig { id: string; tipo: string; ativo: boolean; mensagem: string; horas_antes: number; }

type Tab = "dashboard" | "agendamentos" | "pedidos" | "clientes" | "horarios" | "servicos" | "servicos_app" | "financeiro" | "caixa" | "dividas" | "pagamentos" | "produtos" | "despesas" | "gateway" | "chatbot" | "anamnese" | "avaliacoes";

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
const ADMIN_AUTH_KEY = "dyoli_admin_authenticated";

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(() => {
    try {
      return localStorage.getItem(ADMIN_AUTH_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    try { localStorage.setItem(ADMIN_AUTH_KEY, "true"); } catch {}
    setAuthenticated(true);
  };

  const handleLogout = () => {
    try { localStorage.removeItem(ADMIN_AUTH_KEY); } catch {}
    setAuthenticated(false);
  };

  useEffect(() => {
    document.documentElement.classList.add("admin-mobile-page");
    document.body.classList.add("admin-mobile-page");
    const previousTitle = document.title;
    document.title = "Dyoli Admin";

    return () => {
      document.documentElement.classList.remove("admin-mobile-page");
      document.body.classList.remove("admin-mobile-page");
      document.title = previousTitle;
    };
  }, []);

  if (!authenticated) {
    return (
      <div className="admin-mobile-shell relative min-h-dvh w-screen max-w-full overflow-hidden bg-charcoal px-4">
        {/* Glow decorativo */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-rose/10 blur-3xl" />

        <div className="relative mx-auto flex min-h-dvh w-full max-w-sm items-center justify-center py-6">
          <div className="w-full rounded-3xl border border-gold/15 bg-charcoal/80 p-8 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl space-y-7">
            {/* Logo + identidade */}
            <div className="text-center space-y-4">
              <div className="relative mx-auto h-20 w-20">
                <img src={logo} alt="Estúdio Dyoli Godim" className="h-full w-full object-contain" />
              </div>

              <div className="space-y-1">
                <p className="font-body text-[10px] tracking-[0.25em] uppercase text-gold/80 font-medium">
                  Estúdio Dyoli Godim
                </p>
                <h1 className="font-heading text-2xl font-semibold text-primary-foreground">
                  Painel Admin
                </h1>
                <p className="font-body text-[12px] text-primary-foreground/40">
                  Acesso restrito · Área administrativa
                </p>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (password === ADMIN_PASSWORD) {
                  handleLogin();
                  setError("");
                } else {
                  setError("Senha incorreta");
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="font-body text-[10px] uppercase tracking-widest text-primary-foreground/40 font-medium block mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
                  placeholder="Digite sua senha"
                  autoFocus
                  className="w-full rounded-2xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.08] px-4 py-3.5 text-primary-foreground font-body text-[15px] placeholder:text-primary-foreground/25 focus:outline-none focus:border-gold/40 focus:ring-2 focus:ring-gold/20 transition-all"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-rose/25 bg-rose/10 px-3 py-2">
                  <p className="font-body text-[12px] text-rose text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="btn-entrar-admin"
              >
                Entrar no painel
              </button>
            </form>

            <p className="text-center font-body text-[10px] text-primary-foreground/25">
              🔒 Conexão segura · v1.0
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <AdminPanel onLogout={handleLogout} />;
};

// ─── Admin Panel (Mobile First) ───
const AdminPanel = ({ onLogout }: { onLogout: () => void }) => {
  const [tab, setTab] = useState<Tab>(() => {
    try {
      const saved = localStorage.getItem("admin_active_tab");
      return (saved as Tab) || "dashboard";
    } catch {
      return "dashboard";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("admin_active_tab", tab);
    } catch {}
  }, [tab]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [clientes, setClientes] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Profile | null>(null);
  const [excluindoCliente, setExcluindoCliente] = useState(false);
  const [editingCredito, setEditingCredito] = useState(false);
  const [tempCredito, setTempCredito] = useState("0");
  const [savingCredito, setSavingCredito] = useState(false);
  const [selectedAgendaDate, setSelectedAgendaDate] = useState(() => getDateKey(new Date()));
  const [agendaDismissed, setAgendaDismissed] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("agenda_dismissed");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Manual registration state
  const [showManualRegister, setShowManualRegister] = useState(false);
  const [detalheAgendamento, setDetalheAgendamento] = useState<Agendamento | null>(null);
  const [manualServicos, setManualServicos] = useState<{ id: string; nome: string; preco: number; duracao_minutos: number; categoria: string }[]>([]);
  type ManualItem = { id: string; nome: string; valor: number; duracao: number };
  const [manualItens, setManualItens] = useState<ManualItem[]>([]);
  const [manualCliente, setManualCliente] = useState("");
  const [manualClienteNome, setManualClienteNome] = useState("");
  const [manualData, setManualData] = useState(() => getDateKey(new Date()));
  const [manualHorario, setManualHorario] = useState("09:00");
  const [manualHorarioFim, setManualHorarioFim] = useState("10:00");
  const [manualFormaPagamento, setManualFormaPagamento] = useState("pix");
  const [manualPago, setManualPago] = useState(false);
  const [manualValorPago, setManualValorPago] = useState<string>("");
  const [manualTroco, setManualTroco] = useState(0);
  const [manualGorjeta, setManualGorjeta] = useState(0);
  const [manualCredito, setManualCredito] = useState(0);
  // Credit discount: auto-calculated from client's wallet, debited on save
  const [manualDescontoCredito, setManualDescontoCredito] = useState(0);

  const [manualConcluido, setManualConcluido] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);

  // Extend appointment state
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [extendMinutes, setExtendMinutes] = useState("30");
  const [extendSaving, setExtendSaving] = useState(false);

  // Search terms for manual register dropdowns
  const [manualServicoSearch, setManualServicoSearch] = useState("");
  const [manualClienteSearch, setManualClienteSearch] = useState("");
  const [manualServicoOpen, setManualServicoOpen] = useState(false);
  const [manualClienteOpen, setManualClienteOpen] = useState(false);

  // Edit client name state
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editClientName, setEditClientName] = useState("");

  // Edit Agendamento state
  const [showEditAgendamento, setShowEditAgendamento] = useState(false);
  const [editingAg, setEditingAg] = useState<Agendamento | null>(null);
  const [editAgData, setEditAgData] = useState("");
  const [editAgHorario, setEditAgHorario] = useState("");
  const [editAgServico, setEditAgServico] = useState("");
  const [editAgValor, setEditAgValor] = useState(0);
  const [editAgDuracao, setEditAgDuracao] = useState(60);
  const [editAgSaving, setEditAgSaving] = useState(false);

  const openEditAgendamento = (ag: Agendamento) => {
    setEditingAg(ag);
    setEditAgData(ag.data_agendamento);
    setEditAgHorario(ag.horario);
    setEditAgServico(ag.servico);
    setEditAgValor(ag.valor);
    setEditAgDuracao(ag.duracao_minutos || 60);
    setShowEditAgendamento(true);
    setDetalheAgendamento(null);
  };

  const handleSaveEditAgendamento = async () => {
    if (!editingAg) return;
    if (!editAgData || !editAgHorario || !editAgServico || editAgValor < 0 || editAgDuracao <= 0) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }
    setEditAgSaving(true);
    try {
      const { error } = await supabase.from("agendamentos").update({
        data_agendamento: editAgData,
        horario: editAgHorario,
        servico: editAgServico,
        valor: editAgValor,
        duracao_minutos: editAgDuracao
      } as any).eq("id", editingAg.id);

      if (error) throw error;

      setAgendamentos(prev => prev.map(a => a.id === editingAg.id ? {
        ...a,
        data_agendamento: editAgData,
        horario: editAgHorario,
        servico: editAgServico,
        valor: editAgValor,
        duracao_minutos: editAgDuracao
      } : a));
      toast.success("Agendamento atualizado!");
      setShowEditAgendamento(false);
    } catch (e: any) {
      toast.error("Erro ao atualizar agendamento");
    } finally {
      setEditAgSaving(false);
    }
  };

  const handleSaveClientName = async (agId: string) => {
    const name = editClientName.trim();
    const { error } = await supabase.from("agendamentos").update({ cliente_nome: name || null } as any).eq("id", agId);
    if (error) { toast.error("Erro ao salvar nome"); return; }
    setAgendamentos(prev => prev.map(a => a.id === agId ? { ...a, cliente_nome: name || null } : a));
    setEditingClientId(null);
    toast.success("Nome do cliente atualizado");
  };

  const handleNewAgendamento = useCallback((newAg: any) => {
    setAgendamentos((prev) => [newAg, ...prev]);
    loadData();
  }, []);

  const handleAgendamentoChange = useCallback(() => {
    loadData();
  }, []);

  const {
    notificationsEnabled,
    toggleNotifications,
  } = useAdminNotifications(true, handleNewAgendamento, handleAgendamentoChange);

  useEffect(() => {
    loadData();
  }, []);

  // Desbloqueia o áudio de notificação no primeiro toque/clique (iOS/Safari)
  useEffect(() => {
    const unlock = () => {
      unlockNotificationAudio();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [agRes, clRes] = await Promise.all([
      supabase.from("agendamentos").select("*").neq("status", "aguardando_pagamento").order("data_agendamento", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    ]);
    if (agRes.data) setAgendamentos(agRes.data as Agendamento[]);
    if (clRes.data) setClientes(clRes.data as Profile[]);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("agendamentos").update({ status }).eq("id", id);
    setAgendamentos((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    const ag = agendamentos.find((a) => a.id === id);
    if (status === "confirmado") {
      notifyAgendamentoConfirmadoById(id);
      if (ag?.user_id) {
        sendPush({
          role: "cliente",
          user_id: ag.user_id,
          title: "✅ Agendamento confirmado!",
          message: `Seu ${ag.servico} de ${ag.data_agendamento} às ${ag.horario} foi confirmado.`,
          url: "/",
        });
      }
    } else if (status === "cancelado") {
      notifyLembreteById(id, "cancelamento");
      // Push cliente
      if (ag?.user_id) {
        sendPush({
          role: "cliente",
          user_id: ag.user_id,
          title: "Agendamento cancelado",
          message: `Seu ${ag.servico} de ${ag.data_agendamento} às ${ag.horario} foi cancelado.`,
        });
      }
    } else if (status === "concluido") {
      notifyLembreteById(id, "comparecimento");
      notifyLembreteById(id, "pos_atendimento");
    }
  };

  const deleteAgendamento = async (id: string) => {
    await supabase.from("agendamentos").delete().eq("id", id);
    setAgendamentos((prev) => prev.filter((a) => a.id !== id));
  };

  const tabs: { id: Tab; label: string; icon: React.ComponentType<any>; anim: string; color: string }[] = [
    { id: "dashboard", label: "Início", icon: BarChart3, anim: "tab-icon-dashboard", color: "#22d3ee" },
    { id: "agendamentos", label: "Agenda", icon: Calendar, anim: "tab-icon-calendar", color: "#f59e0b" },
    { id: "pedidos", label: "Pedidos", icon: ClipboardList, anim: "tab-icon-bounce", color: "#facc15" },
    { id: "financeiro", label: "Financeiro", icon: DollarSign, anim: "tab-icon-spin", color: "#10b981" },
    { id: "caixa", label: "Caixa", icon: Wallet, anim: "tab-icon-spin", color: "#14b8a6" },
    { id: "dividas", label: "Dívidas", icon: CreditCard, anim: "tab-icon-bounce", color: "#f43f5e" },
    { id: "pagamentos", label: "Pagamentos", icon: CreditCard, anim: "tab-icon-swipe", color: "#3b82f6" },
    { id: "despesas", label: "Despesas", icon: Receipt, anim: "tab-icon-shake", color: "#ef4444" },
    { id: "clientes", label: "Clientes", icon: Users, anim: "tab-icon-wave", color: "#a855f7" },
    { id: "anamnese", label: "Anamnese", icon: FileText, anim: "tab-icon-bounce", color: "#ec4899" },
    { id: "avaliacoes", label: "Avaliações", icon: Star, anim: "tab-icon-bounce", color: "#fbbf24" },
    { id: "produtos", label: "Produtos", icon: ShoppingBag, anim: "tab-icon-bob", color: "#fb923c" },
    { id: "gateway", label: "Gateway", icon: Wallet, anim: "tab-icon-spin", color: "#84cc16" },
    { id: "chatbot", label: "Chatbot", icon: WhatsAppIcon, anim: "tab-icon-bounce", color: "#25d366" },
    { id: "horarios", label: "Horários", icon: Clock, anim: "tab-icon-tick", color: "#60a5fa" },
    { id: "servicos", label: "Serviços (WhatsApp)", icon: Settings, anim: "tab-icon-cog", color: "#25d366" },
    { id: "servicos_app", label: "Serviços (App)", icon: Sparkles, anim: "tab-icon-cog", color: "#eab308" },
  ];

  const total = agendamentos.length;
  const confirmados = agendamentos.filter((a) => a.status === "confirmado").length;
  const cancelados = agendamentos.filter((a) => a.status === "cancelado").length;
  const concluidos = agendamentos.filter((a) => a.status === "concluido").length;
  const faltas = agendamentos.filter((a) => a.status === "falta").length;
  const faturamento = agendamentos
    .filter((a) => a.status !== "cancelado" && a.status !== "falta")
    .reduce((sum, a) => sum + (a.valor_pago || 0), 0);

  const getClientName = (userId: string, clienteNome?: string | null) => {
    if (clienteNome) return clienteNome;
    return clientes.find((c) => c.id === userId)?.nome || "Presencial";
  };
  const formatDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const formatWhatsapp = (w: string) => (w ? `(${w.slice(0, 2)}) ${w.slice(2, 7)}-${w.slice(7)}` : "—");

  const handleExcluirCliente = async () => {
    if (!clienteParaExcluir) return;
    setExcluindoCliente(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-cliente", {
        body: { user_id: clienteParaExcluir.id },
      });
      if (error || (data && data.error)) {
        throw new Error(error?.message || data?.error || "Erro desconhecido");
      }
      toast.success("Cliente excluído com sucesso");
      setSelectedClient(null);
      setClienteParaExcluir(null);
      await loadData();
    } catch (e: any) {
      console.error("Erro ao excluir cliente:", e);
      toast.error(`Erro ao excluir: ${e.message || "tente novamente"}`);
    } finally {
      setExcluindoCliente(false);
    }
  };

  const filteredAgendamentos = agendamentos.filter((a) => {
    if (statusFilter !== "todos" && a.status !== statusFilter) return false;
    if (searchTerm) {
      const name = getClientName(a.user_id, (a as any).cliente_nome).toLowerCase();
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
    const labels: Record<string, string> = { confirmado: "Confirmado", cancelado: "Cancelado", concluido: "Concluído", falta: "Não veio" };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-body font-medium border ${map[s] || "bg-secondary text-muted-foreground border-border"}`}>{labels[s] || s}</span>;
  };

  const formatFormaPagamento = (f: string | null | undefined) => {
    if (!f) return "—";
    const map: Record<string, string> = {
      pix: "PIX",
      pix_mp: "PIX (online)",
      pix_woovi: "PIX (online)",
      cartao: "Cartão",
      boleto: "Boleto",
      dinheiro: "Dinheiro",
      pendente: "A combinar",
    };
    return map[f.toLowerCase()] || f.charAt(0).toUpperCase() + f.slice(1);
  };

  const pagamentoBadge = (a: Agendamento) => {

    const pago = Number(a.valor_pago || 0);
    const totalValor = Number(a.valor);
    if (pago >= totalValor) return <span className="px-2 py-0.5 rounded-full text-[10px] font-body font-medium border bg-green-500/10 text-green-500 border-green-500/20">Pago</span>;
    if (pago > 0) return <span className="px-2 py-0.5 rounded-full text-[10px] font-body font-medium border bg-gold/10 text-gold border-gold/20">Sinal pago</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-body font-medium border bg-amber-500/10 text-amber-400 border-amber-500/30">Não pago</span>;
  };


  const updatePayment = async (id: string, type: "sinal" | "completo") => {
    const a = agendamentos.find((item) => item.id === id);
    if (!a) return;
    const valor = Number(a.valor);

    let newPago = type === "completo" ? valor : valor * 0.5;
    let creditoUsado = 0;

    if (type === "completo" && a.user_id) {
      const { data: profile } = await supabase.from("profiles").select("credito_saldo").eq("id", a.user_id).single();
      const saldo = Number(profile?.credito_saldo || 0);
      if (saldo > 0) {
        const valorFaltante = valor - Number(a.valor_pago || 0);
        creditoUsado = Math.min(saldo, valorFaltante);
        if (creditoUsado > 0) {
          await supabase.from("profiles").update({ credito_saldo: saldo - creditoUsado }).eq("id", a.user_id);
          // newPago permanece como 'valor' — o serviço está totalmente pago,
          // o crédito apenas cobriu parte do custo em dinheiro físico.
          toast.success(`Crédito de R$ ${creditoUsado.toFixed(2)} utilizado automaticamente!`);
        }
      }
    }

    await supabase.from("agendamentos").update({ valor_pago: newPago }).eq("id", id);
    setAgendamentos((prev) => prev.map((item) => (item.id === id ? { ...item, valor_pago: newPago } : item)));
  };

  // Load services for manual registration
  const loadManualServicos = async () => {
    const { data } = await supabase.from("servicos").select("*").eq("ativo", true).order("ordem");
    if (data) setManualServicos(data.map(s => ({ id: s.id, nome: s.nome, preco: Number(s.preco), duracao_minutos: s.duracao_minutos, categoria: s.categoria })));
  };

  // Helpers para converter horário <-> minutos
  const timeToMinutes = (t: string): number => {
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const minutesToTime = (mins: number): string => {
    const total = ((mins % 1440) + 1440) % 1440;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  const calcFim = (inicio: string, duracao: string | number): string => {
    return minutesToTime(timeToMinutes(inicio) + (Number(duracao) || 0));
  };
  const calcDuracao = (inicio: string, fim: string): number => {
    let diff = timeToMinutes(fim) - timeToMinutes(inicio);
    if (diff <= 0) diff += 1440; // passa da meia-noite
    return diff;
  };

  const manualDuracaoTotal = manualItens.reduce((s, it) => s + (Number(it.duracao) || 0), 0);
  const manualValorTotal = manualItens.reduce((s, it) => s + (Number(it.valor) || 0), 0);

  const handleManualHorarioChange = (novoInicio: string) => {
    setManualHorario(novoInicio);
    setManualHorarioFim(calcFim(novoInicio, manualDuracaoTotal));
  };
  const handleManualHorarioFimChange = (novoFim: string) => {
    setManualHorarioFim(novoFim);
    // Ajusta proporcionalmente: se houver itens, mantém soma; senão apenas atualiza fim
    if (manualItens.length === 1) {
      const nova = calcDuracao(manualHorario, novoFim);
      setManualItens(prev => prev.map((it, i) => i === 0 ? { ...it, duracao: nova } : it));
    }
  };

  // Recalcula horário fim sempre que a duração total mudar
  useEffect(() => {
    setManualHorarioFim(calcFim(manualHorario, manualDuracaoTotal));
  }, [manualDuracaoTotal, manualHorario]);

  const addManualItem = (servicoNome: string) => {
    const svc = manualServicos.find(s => s.nome === servicoNome);
    const novo: ManualItem = {
      id: (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`),
      nome: servicoNome,
      valor: svc ? Number(svc.preco) : 0,
      duracao: svc ? Number(svc.duracao_minutos) : 60,
    };
    setManualItens(prev => [...prev, novo]);
  };
  const updateManualItem = (id: string, patch: Partial<ManualItem>) => {
    setManualItens(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  };
  const removeManualItem = (id: string) => {
    setManualItens(prev => prev.filter(it => it.id !== id));
  };

  const openManualRegister = () => {
    loadManualServicos();
    setManualItens([]);
    setManualCliente("");
    setManualClienteNome("");
    setManualData(selectedAgendaDate);
    setManualHorario("09:00");
    setManualHorarioFim("10:00");
    setManualFormaPagamento("pix");
    setManualPago(false);
    setManualConcluido(false);
    setManualTroco(0);
    setManualGorjeta(0);
    setManualCredito(0);
    setManualDescontoCredito(0);
    setManualServicoSearch("");
    setManualClienteSearch("");
    setManualServicoOpen(false);
    setManualClienteOpen(false);
    setShowManualRegister(true);
  };



  const saveManualRegistration = async () => {
    if (manualItens.length === 0) {
      toast.error("Adicione pelo menos 1 serviço");
      return;
    }
    if (!manualData || !manualHorario) {
      toast.error("Preencha data e horário");
      return;
    }
    if (manualItens.some(it => Number(it.valor) <= 0 || Number(it.duracao) <= 0)) {
      toast.error("Cada serviço precisa ter valor e duração maiores que zero");
      return;
    }
    setManualSaving(true);
    try {
      let userId = manualCliente || null;
      const duracao = manualDuracaoTotal || 60;
      const valor = manualValorTotal;

      // Agrupa duplicados: "Perfuração (×3), Troca de joia"
      const counts = new Map<string, number>();
      manualItens.forEach(it => counts.set(it.nome, (counts.get(it.nome) || 0) + 1));
      const servicoLabel = Array.from(counts.entries())
        .map(([nome, qtd]) => qtd > 1 ? `${nome} (×${qtd})` : nome)
        .join(", ");

      const clienteNome = manualCliente
        ? (clientes.find(c => c.id === manualCliente)?.nome || "")
        : manualClienteNome.trim();

      // Auto-registrar o cliente caso seja inserido apenas o nome
      if (!userId && clienteNome) {
        try {
          const fakeEmail = `manual_${globalThis.crypto?.randomUUID?.() || Date.now()}@estudiodyoligodim.com.br`;
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://vlepenxinekoljxecomr.supabase.co";
          const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsZXBlbnhpbmVrb2xqeGVjb21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjI0NDksImV4cCI6MjA5MDYzODQ0OX0.5U3grLWxVeHl2JnuTRWh4P3lPmiv04YAOFosjDZmjMA";

          const authResponse = await fetch(`${supabaseUrl}/auth/v1/signup`, {
            method: "POST",
            headers: {
              "apikey": supabaseKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              email: fakeEmail,
              password: `Manual@${Date.now()}!XyZ`,
              data: {
                nome: clienteNome,
                whatsapp: ""
              }
            })
          });

          if (authResponse.ok) {
            const result = await authResponse.json();
            const newId = result.id || result.user?.id;
            if (newId) {
              userId = newId;
              setClientes(prev => [{
                id: newId,
                nome: clienteNome,
                whatsapp: "",
                created_at: new Date().toISOString()
              }, ...prev]);
            }
          } else {
            console.error("Falha ao criar cliente automaticamente:", await authResponse.text());
          }
        } catch (authErr) {
          console.error("Erro na requisição para criar cliente:", authErr);
        }
      }

      // --- Debit client credit if auto-discount was applied ---
      const clienteCredito = manualCliente
        ? Number(clientes.find(c => c.id === manualCliente)?.credito_saldo || 0)
        : 0;
      const descontoAplicado = Math.min(clienteCredito, manualValorTotal);

      if (descontoAplicado > 0 && userId) {
        const saldoAposDesconto = clienteCredito - descontoAplicado;
        const { error: debitErr } = await (supabase as any).rpc("admin_set_credito_saldo", {
          p_user_id: userId,
          p_novo_saldo: saldoAposDesconto,
        });
        if (debitErr) {
          console.error("Erro ao debitar crédito:", debitErr);
          toast.error("Atenção: crédito não foi debitado: " + debitErr.message);
        } else {
          setClientes(prev => prev.map(c => c.id === userId ? { ...c, credito_saldo: saldoAposDesconto } : c));
        }
      }

      if (manualCredito > 0 && userId) {
        // Fetch current balance first
        const { data: profile } = await supabase
          .from("profiles")
          .select("credito_saldo")
          .eq("id", userId)
          .maybeSingle();
        const currentCredit = Number(profile?.credito_saldo || 0);
        const novoSaldo = currentCredit + manualCredito;
        // Use RPC with SECURITY DEFINER to bypass RLS
        const { error: creditErr } = await (supabase as any).rpc("admin_set_credito_saldo", {
          p_user_id: userId,
          p_novo_saldo: novoSaldo,
        });
        if (creditErr) {
          console.error("Erro ao salvar crédito do cliente:", creditErr);
          toast.error("Registro salvo, mas falha ao adicionar crédito: " + creditErr.message);
        } else {
          setClientes(prev =>
            prev.some(c => c.id === userId)
              ? prev.map(c => c.id === userId ? { ...c, credito_saldo: novoSaldo } : c)
              : [{ id: userId!, nome: clienteNome, whatsapp: "", created_at: new Date().toISOString(), credito_saldo: novoSaldo }, ...prev]
          );
        }
      }

      const { data, error } = await supabase.from("agendamentos").insert({
        servico: servicoLabel,
        data_agendamento: manualData,
        horario: manualHorario,
        valor: valor,
        valor_pago: manualPago ? (Number(manualValorPago) || valor) : 0,
        valor_troco: manualTroco,
        valor_gorjeta: manualGorjeta,
        valor_credito: manualCredito,
        valor_desconto_credito: descontoAplicado > 0 ? descontoAplicado : null,
        duracao_minutos: duracao,
        status: manualConcluido ? "concluido" : "confirmado",
        forma_pagamento: manualFormaPagamento,
        user_id: userId,
        cliente_nome: clienteNome || null,
        origem: "admin_manual",
      } as any).select().single();
      
      if (error) throw error;
      if (data) {
        setAgendamentos(prev => [data as Agendamento, ...prev]);
        toast.success("Atendimento registrado com sucesso!");
        setShowManualRegister(false);
        notifyAgendamentoConfirmadoById((data as Agendamento).id);
        sendPush({
          role: "admin",
          title: "🔔 Novo Agendamento!",
          message: `${clienteNome || "Presencial"} — ${servicoLabel} em ${manualData} às ${manualHorario}`,
          url: "/admin/",
        });
      }
    } catch (err: any) {
      toast.error("Erro ao registrar: " + (err.message || "Tente novamente"));
    }
    setManualSaving(false);
  };


  const openExtendDialog = (id: string) => {
    setExtendingId(id);
    setExtendMinutes("30");
    setShowExtendDialog(true);
  };

  const saveExtendAppointment = async () => {
    if (!extendingId) return;
    const ag = agendamentos.find(a => a.id === extendingId);
    if (!ag) return;
    setExtendSaving(true);
    try {
      const extraMin = Number(extendMinutes) || 30;
      const newDuration = (ag.duracao_minutos || 60) + extraMin;
      
      // The trigger manage_blocked_slots handles slot recalculation on duration change
      const { error } = await supabase.from("agendamentos").update({
        duracao_minutos: newDuration,
        foi_estendido: true,
        updated_at: new Date().toISOString(),
      } as any).eq("id", extendingId);
      
      if (error) throw error;
      
      setAgendamentos(prev => prev.map(a => a.id === extendingId ? { ...a, duracao_minutos: newDuration } : a));
      toast.success(`Duração estendida para ${newDuration} minutos (+${extraMin}min)`);
      setShowExtendDialog(false);
    } catch (err: any) {
      toast.error("Erro ao estender: " + (err.message || "Tente novamente"));
    }
    setExtendSaving(false);
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

  // Agenda notifications
  const agendaNotifs = useMemo(() => {
    const today = getDateKey(new Date());
    const todayDate = new Date(today + "T12:00:00");
    const notifs: { tipo: "hoje" | "falta" | "pendente" | "proximo"; ag: Agendamento; label: string }[] = [];
    agendamentos.forEach((a) => {
      if (a.status === "cancelado") return;
      const aDate = new Date(a.data_agendamento + "T12:00:00");
      const diff = Math.round((aDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
      if (a.status === "falta") { notifs.push({ tipo: "falta", ag: a, label: "Cliente faltou" }); return; }
      if (diff === 0 && a.status === "confirmado") notifs.push({ tipo: "hoje", ag: a, label: `Hoje às ${a.horario}` });
      if (diff === 1 && a.status === "confirmado") notifs.push({ tipo: "proximo", ag: a, label: "Amanhã" });
      if (a.status !== "falta" && Number(a.valor_pago || 0) < Number(a.valor) && diff <= 0) notifs.push({ tipo: "pendente", ag: a, label: `Falta R$ ${(Number(a.valor) - Number(a.valor_pago || 0)).toFixed(2).replace(".", ",")}` });
    });
    const order = { falta: 0, hoje: 1, pendente: 2, proximo: 3 };
    notifs.sort((x, y) => order[x.tipo] - order[y.tipo]);
    return notifs;
  }, [agendamentos]);

  const activeAgendaNotifs = useMemo(
    () => agendaNotifs.filter((n) => !agendaDismissed.has(n.ag.id + n.tipo)),
    [agendaNotifs, agendaDismissed]
  );

  const dismissAgendaNotif = (id: string, tipo: string) => {
    setAgendaDismissed((prev) => {
      const next = new Set(prev); next.add(id + tipo);
      localStorage.setItem("agenda_dismissed", JSON.stringify([...next]));
      return next;
    });
  };

  const clearAgendaNotifs = () => {
    const keys = activeAgendaNotifs.map((n) => n.ag.id + n.tipo);
    setAgendaDismissed((prev) => {
      const next = new Set([...prev, ...keys]);
      localStorage.setItem("agenda_dismissed", JSON.stringify([...next]));
      return next;
    });
  };

  const agendaNotifConfig: Record<string, { bg: string; iconColor: string; titleColor: string }> = {
    hoje: { bg: "bg-gold/10 border-gold/25", iconColor: "text-gold", titleColor: "text-gold" },
    proximo: { bg: "bg-blue-500/10 border-blue-500/25", iconColor: "text-blue-400", titleColor: "text-blue-400" },
    pendente: { bg: "bg-red-500/10 border-red-500/25", iconColor: "text-red-400", titleColor: "text-red-400" },
    falta: { bg: "bg-orange-500/10 border-orange-500/25", iconColor: "text-orange-400", titleColor: "text-orange-400" },
  };

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
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-body text-[13px] font-medium transition-all ${
                tab === t.id
                  ? "tab-active bg-gold/10 text-gold"
                  : "text-primary-foreground/40 hover:bg-primary-foreground/[0.04] hover:text-primary-foreground/60"
              }`}
            >
              <t.icon
                className={`h-4 w-4 shrink-0 tab-icon ${t.anim}`}
                style={{ color: tab === t.id ? undefined : t.color }}
              />
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
      <div className="flex-1 lg:ml-56">
        {/* Mobile top bar (hidden on desktop) */}
        <div className="sticky top-0 z-20 border-b border-primary-foreground/[0.06] bg-charcoal/90 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex w-full max-w-md items-center justify-between px-3 py-3 sm:px-4">
            <div className="flex items-center gap-2 min-w-0">
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <button
                    aria-label="Abrir menu"
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-primary-foreground/60 transition-all hover:bg-gold/10 hover:text-gold"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[82vw] max-w-[18rem] overflow-y-auto border-primary-foreground/[0.06] bg-charcoal p-0 flex flex-col"
                >
                  <div className="px-5 pt-5 pb-4 border-b border-primary-foreground/[0.06]">
                    <h2 className="font-heading text-[16px] font-semibold text-primary-foreground">Admin</h2>
                    <p className="font-body text-[11px] text-primary-foreground/30">Estúdio Dyoli Godim</p>
                  </div>
                  <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
                    {tabs.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { setTab(t.id); setMobileNavOpen(false); }}
                        className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 font-body text-[14px] font-medium transition-all ${
                          tab === t.id
                            ? "tab-active bg-gold/10 text-gold"
                            : "text-primary-foreground/50 hover:bg-primary-foreground/[0.04] hover:text-primary-foreground/80"
                        }`}
                      >
                        <t.icon
                          className={`h-[18px] w-[18px] shrink-0 tab-icon ${t.anim}`}
                          style={{ color: tab === t.id ? undefined : t.color }}
                        />
                        {t.label}
                      </button>
                    ))}
                  </nav>
                  <div className="px-3 py-3 border-t border-primary-foreground/[0.06]">
                    <button
                      onClick={() => { setMobileNavOpen(false); onLogout(); }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 font-body text-[14px] text-rose/70 hover:bg-rose/10 hover:text-rose transition-all"
                    >
                      <LogOut className="h-[18px] w-[18px] shrink-0" />
                      Sair
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
              <div className="min-w-0">
                <h1 className="font-heading text-[15px] font-semibold text-primary-foreground truncate">
                  {tabs.find(t => t.id === tab)?.label || "Admin"}
                </h1>
                <p className="font-body text-[10px] text-primary-foreground/30 truncate">Estúdio Dyoli Godim</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
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
        <div className="mx-auto w-full max-w-md overflow-x-hidden px-3 py-4 pb-24 sm:px-4 lg:max-w-4xl lg:px-8 lg:py-6 lg:pb-6">
          {tab === "dashboard" && (
            <AdminDashboard
              agendamentos={agendamentos}
              getClientName={getClientName}
              notificationsEnabled={notificationsEnabled}
              toggleNotifications={toggleNotifications}
              statusBadge={statusBadge}
              onGoToAgenda={() => setTab("agendamentos")}
            />
          )}

          {tab === "agendamentos" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-lg font-semibold text-primary-foreground">Agenda</h2>
                  <PlusButton size={28} title="Registrar manualmente" onClick={openManualRegister} />
                </div>

                {/* Bell */}
                <Sheet>
                  <SheetTrigger asChild>
                    <button className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] transition-all hover:bg-primary-foreground/[0.1]">
                      <Bell className={`h-4 w-4 ${activeAgendaNotifs.length > 0 ? "text-gold" : "text-primary-foreground/30"}`} />
                      {activeAgendaNotifs.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white animate-pulse">
                          {activeAgendaNotifs.length}
                        </span>
                      )}
                    </button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[340px] sm:w-[400px] bg-charcoal border-primary-foreground/[0.06] p-0">
                    <SheetHeader className="px-5 pt-5 pb-4 border-b border-primary-foreground/[0.06]">
                      <SheetTitle className="font-heading text-[16px] font-semibold text-primary-foreground flex items-center gap-2">
                        <Bell className="w-4 h-4 text-gold" />
                        Notificações da Agenda
                        {activeAgendaNotifs.length > 0 && (
                          <span className="ml-auto px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-body font-medium border border-red-500/20">
                            {activeAgendaNotifs.length}
                          </span>
                        )}
                      </SheetTitle>
                    </SheetHeader>

                    {activeAgendaNotifs.length > 0 && (
                      <div className="px-4 pt-3 flex justify-end">
                        <button onClick={clearAgendaNotifs}
                          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-body text-[10px] font-medium text-primary-foreground/30 transition-all hover:bg-primary-foreground/[0.06] hover:text-primary-foreground/50">
                          <X className="h-3 w-3" /> Limpar tudo
                        </button>
                      </div>
                    )}

                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 max-h-[calc(100vh-160px)]">
                      {activeAgendaNotifs.length === 0 ? (
                        <div className="py-16 text-center">
                          <CheckCircle className="h-8 w-8 text-green-400/40 mx-auto mb-3" />
                          <p className="font-body text-[13px] text-primary-foreground/30">Tudo em dia! 🎉</p>
                          <p className="font-body text-[11px] text-primary-foreground/20 mt-1">Nenhuma notificação pendente</p>
                        </div>
                      ) : (
                        activeAgendaNotifs.map((n, i) => {
                          const cfg = agendaNotifConfig[n.tipo];
                          const icons: Record<string, typeof Bell> = { hoje: Clock, proximo: Clock, pendente: DollarSign, falta: UserX };
                          const Icon = icons[n.tipo] || Bell;
                          return (
                            <div key={n.ag.id + n.tipo + i} className={`rounded-xl border p-3 transition-all ${cfg.bg}`}>
                              <div className="flex items-start gap-2.5">
                                <div className={`mt-0.5 shrink-0 ${cfg.iconColor}`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`font-body text-[11px] font-semibold ${cfg.titleColor}`}>{n.label}</p>
                                  <p className="font-body text-[13px] font-medium text-primary-foreground truncate mt-0.5">
                                    {getClientName(n.ag.user_id, (n.ag as any).cliente_nome)}
                                  </p>
                                  <p className="font-body text-[11px] text-primary-foreground/40 truncate">
                                    {n.ag.servico}{n.ag.variacao ? ` · ${n.ag.variacao}` : ""}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="font-heading text-[13px] font-bold text-primary-foreground">
                                      R$ {Number(n.ag.valor).toFixed(2).replace(".", ",")}
                                    </span>
                                    <span className="font-body text-[10px] text-primary-foreground/30">
                                      {new Date(n.ag.data_agendamento + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · {n.ag.horario}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-2">
                                    <button
                                      onClick={() => dismissAgendaNotif(n.ag.id, n.tipo)}
                                      className="flex items-center gap-1 rounded-lg px-2 py-1 bg-primary-foreground/[0.06] text-primary-foreground/40 text-[10px] font-body font-medium border border-primary-foreground/[0.08] hover:bg-primary-foreground/[0.1] hover:text-primary-foreground/60 transition-all"
                                    >
                                      <CheckCircle className="h-3 w-3" /> Lida
                                    </button>
                                    <BinButton size="sm" onClick={() => deleteAgendamento(n.ag.id)} />

                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Alert banner */}
              {activeAgendaNotifs.filter(n => n.tipo === "hoje" || n.tipo === "falta").length > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5">
                  <Bell className="h-4 w-4 text-gold shrink-0" />
                  <p className="font-body text-[12px] text-gold flex-1">
                    <strong>{activeAgendaNotifs.filter(n => n.tipo === "hoje").length}</strong> atendimento(s) hoje
                    {activeAgendaNotifs.filter(n => n.tipo === "falta").length > 0 && (
                      <> · <strong className="text-orange-400">{activeAgendaNotifs.filter(n => n.tipo === "falta").length}</strong> falta(s)</>
                    )}
                  </p>
                </div>
              )}

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
                      { value: "todos", label: "Todos", active: "bg-gold/15 text-gold border-gold/40 shadow-[0_0_0_1px_hsl(var(--gold)/0.2)]", inactive: "bg-gold/[0.04] text-gold/60 border-gold/20 hover:bg-gold/10 hover:text-gold/80" },
                      { value: "confirmado", label: "Confirmados", active: "bg-blue-500/15 text-blue-400 border-blue-500/40 shadow-[0_0_0_1px_rgb(59_130_246_/_0.2)]", inactive: "bg-blue-500/[0.05] text-blue-400/70 border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-400" },
                      { value: "concluido", label: "Concluídos", active: "bg-green-500/15 text-green-400 border-green-500/40 shadow-[0_0_0_1px_rgb(34_197_94_/_0.2)]", inactive: "bg-green-500/[0.05] text-green-400/70 border-green-500/20 hover:bg-green-500/10 hover:text-green-400" },
                      { value: "cancelado", label: "Cancelados", active: "bg-rose/15 text-rose border-rose/40 shadow-[0_0_0_1px_hsl(var(--rose)/0.2)]", inactive: "bg-rose/[0.05] text-rose/70 border-rose/20 hover:bg-rose/10 hover:text-rose" },
                      { value: "falta", label: "Faltas", active: "bg-orange-500/15 text-orange-400 border-orange-500/40 shadow-[0_0_0_1px_rgb(249_115_22_/_0.2)]", inactive: "bg-orange-500/[0.05] text-orange-400/70 border-orange-500/20 hover:bg-orange-500/10 hover:text-orange-400" },
                    ].map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setStatusFilter(f.value)}
                        className={`px-3 py-1.5 rounded-full font-body text-[11px] font-medium whitespace-nowrap border transition-all ${statusFilter === f.value ? f.active : f.inactive}`}
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

              <section className="overflow-hidden rounded-[28px] border border-gold/15 bg-gradient-to-br from-primary-foreground/[0.08] to-primary-foreground/[0.04] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/10 bg-gradient-to-r from-gold/[0.06] to-transparent px-4 py-4 lg:px-5">
                  <div className="min-w-0">
                    <p className="font-body text-[11px] uppercase tracking-[0.22em] text-gold/60">Agenda do dia</p>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        onClick={() => setSelectedAgendaDate(shiftDate(selectedAgendaDate, -1))}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary-foreground/10 bg-primary-foreground/[0.08] text-primary-foreground/70 transition-all hover:border-gold/30 hover:bg-gold/10 hover:text-gold"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <h3 className="font-heading text-[22px] font-semibold capitalize text-primary-foreground">{selectedAgendaLabel}</h3>
                      <button
                        onClick={() => setSelectedAgendaDate(shiftDate(selectedAgendaDate, 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary-foreground/10 bg-primary-foreground/[0.08] text-primary-foreground/70 transition-all hover:border-gold/30 hover:bg-gold/10 hover:text-gold"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-1 font-body text-[11px] text-primary-foreground/55">
                      {selectedAgendaDateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </p>
                  </div>

                  <div className="grid w-full grid-cols-3 gap-2 lg:w-auto lg:min-w-[360px]">
                    <div className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/[0.06] px-3 py-2">
                      <p className="font-body text-[10px] uppercase tracking-wider text-primary-foreground/50">Pedidos</p>
                      <p className="font-body text-[15px] font-semibold text-primary-foreground">{selectedAgendaItems.length}</p>
                    </div>
                    <div className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/[0.06] px-3 py-2">
                      <p className="font-body text-[10px] uppercase tracking-wider text-primary-foreground/50">Previsto</p>
                      <p className="font-body text-[13px] font-semibold text-primary-foreground">R$ {selectedAgendaTotal.toFixed(0)}</p>
                    </div>
                    <div className="rounded-2xl border border-gold/30 bg-gold/15 px-3 py-2 shadow-[0_2px_12px_-2px_hsl(var(--gold)/0.25)]">
                      <p className="font-body text-[10px] uppercase tracking-wider text-gold/80">Recebido</p>
                      <p className="font-body text-[13px] font-semibold text-gold">R$ {selectedAgendaPago.toFixed(0)}</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 lg:p-4">
                  {selectedAgendaItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-primary-foreground/15 bg-primary-foreground/[0.03] px-4 py-10 text-center">
                      <p className="font-heading text-[20px] font-semibold text-primary-foreground">Nenhum pedido nessa data</p>
                      <p className="mt-2 font-body text-[12px] text-primary-foreground/55">Escolha outro dia no calendário ou toque em Hoje para voltar para a agenda atual.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                      {selectedAgendaItems.map((a) => {
                        const valorPago = Number(a.valor_pago || 0);
                        const valorTotal = Number(a.valor);
                        const isCancelado = a.status === "cancelado" || a.status === "falta";
                        const isPagoIntegral = !isCancelado && valorPago >= valorTotal && valorTotal > 0;
                        const isPagoParcial = !isCancelado && valorPago > 0 && valorPago < valorTotal;
                        const isNaoPago = !isCancelado && valorPago === 0;

                        const barColor = isCancelado
                          ? "bg-primary-foreground/15"
                          : isPagoIntegral
                          ? "bg-gradient-to-b from-green-400 to-green-600 shadow-[0_0_12px_-2px_rgba(34,197,94,0.6)]"
                          : isPagoParcial
                          ? "bg-gradient-to-b from-gold to-nude shadow-[0_0_12px_-2px_hsl(var(--gold)/0.6)]"
                          : "bg-gradient-to-b from-red-400 to-red-600 shadow-[0_0_12px_-2px_rgba(239,68,68,0.5)]";

                        const barLabel = isCancelado
                          ? a.status === "falta" ? "Não veio" : "Cancelado"
                          : isPagoIntegral
                          ? "Pago"
                          : isPagoParcial
                          ? "Sinal pago"
                          : "Não pago";


                        return (
                        <article
                          key={a.id}
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (target.closest("button, input, a, select, textarea")) return;
                            setDetalheAgendamento(a);
                          }}
                          className="group/card relative cursor-pointer overflow-hidden rounded-2xl border border-primary-foreground/10 bg-gradient-to-br from-primary-foreground/[0.07] to-primary-foreground/[0.03] p-4 pl-5 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.4)] transition-all hover:border-gold/25 hover:shadow-[0_8px_28px_-10px_hsl(var(--gold)/0.2)] active:scale-[0.99]"
                        >
                          {/* Status bar lateral */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${barColor}`} aria-label={barLabel} title={`Pagamento: ${barLabel}`} />
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <div className="flex min-w-[60px] flex-col items-center rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/15 to-gold/5 px-2 py-2.5 shadow-[0_2px_10px_-4px_hsl(var(--gold)/0.3)]">
                                <span className="font-heading text-[18px] font-semibold leading-tight text-gold">{a.horario}</span>
                                <span className="mt-0.5 font-body text-[9px] uppercase tracking-[0.18em] text-gold/60">horário</span>
                              </div>

                              <div className="min-w-0 flex-1">
                                {editingClientId === a.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      autoFocus
                                      value={editClientName}
                                      onChange={(e) => setEditClientName(e.target.value)}
                                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveClientName(a.id); if (e.key === "Escape") setEditingClientId(null); }}
                                      className="w-full rounded-lg bg-primary-foreground/[0.08] border border-gold/30 px-2 py-1 font-body text-[13px] text-primary-foreground focus:outline-none focus:ring-1 focus:ring-gold/40"
                                      placeholder="Nome do cliente"
                                    />
                                    <button onClick={() => handleSaveClientName(a.id)} className="rounded-lg p-1 text-green-500/80 hover:text-green-400 hover:bg-green-500/10 transition-all" title="Salvar"><CheckCircle className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => setEditingClientId(null)} className="rounded-lg p-1 text-primary-foreground/50 hover:text-rose hover:bg-rose/10 transition-all" title="Cancelar"><X className="h-3.5 w-3.5" /></button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 group">
                                    <p className="truncate font-body text-[15px] font-semibold text-primary-foreground">{getClientName(a.user_id, a.cliente_nome)}</p>
                                    <button
                                      onClick={() => { setEditingClientId(a.id); setEditClientName(a.cliente_nome || getClientName(a.user_id, a.cliente_nome)); }}
                                      className="shrink-0 rounded-lg p-1 text-primary-foreground/40 opacity-0 group-hover:opacity-100 hover:text-gold hover:bg-gold/10 transition-all"
                                      title="Editar nome do cliente"
                                    ><Edit2 className="h-3 w-3" /></button>
                                  </div>
                                )}
                                <p className="mt-0.5 truncate font-body text-[12px] text-primary-foreground/65">{a.servico}{a.variacao ? ` · ${a.variacao}` : ""} · {a.duracao_minutos || 60}min</p>
                                {a.observacao && (
                                  <div className="mt-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5">
                                    <p className="font-body text-[11px] text-amber-300/90 leading-snug">📝 {a.observacao}</p>
                                  </div>
                                )}
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  {statusBadge(a.status)}
                                  {pagamentoBadge(a)}
                                  {a.origem === "whatsapp_bot" && (
                                    <span
                                      className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wide text-green-400"
                                      title="Agendamento feito pelo chatbot do WhatsApp"
                                    >
                                      <WhatsAppIcon className="h-3 w-3" />
                                      WhatsApp
                                    </span>
                                  )}
                                  {a.origem === "admin_manual" && (
                                    <span
                                      className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wide text-gold"
                                      title="Cadastro manual feito no admin"
                                    >
                                      Presencial
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 rounded-xl border border-gold/15 bg-gradient-to-r from-gold/[0.08] to-gold/[0.02] px-3 py-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-body text-[11px] uppercase tracking-wider text-primary-foreground/55">Valor do atendimento</p>
                              <p className="font-heading text-[16px] font-semibold text-gold">R$ {Number(a.valor).toFixed(2).replace(".", ",")}</p>
                            </div>
                            {Number(a.valor_pago || 0) > 0 && (
                              <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-gold/10 pt-1.5">
                                <p className="font-body text-[11px] text-primary-foreground/55">Já recebido</p>
                                <p className="font-body text-[12px] font-medium text-green-400">R$ {Number(a.valor_pago || 0).toFixed(2).replace(".", ",")}</p>
                              </div>
                            )}
                            {!isCancelado && Number(a.valor) - Number(a.valor_pago || 0) > 0 && (
                              <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-gold/10 pt-1.5">
                                <p className="font-body text-[11px] text-primary-foreground/55">A receber</p>
                                <p className="font-body text-[12px] font-medium text-red-400">R$ {(Number(a.valor) - Number(a.valor_pago || 0)).toFixed(2).replace(".", ",")}</p>
                              </div>
                            )}

                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-primary-foreground/10 pt-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {a.status !== "cancelado" && a.status !== "falta" && (
                                <>
                                  <button
                                    onClick={() => updatePayment(a.id, "sinal")}
                                    title="Marcar sinal (50%)"
                                    className={`rounded-lg border px-2.5 py-1.5 font-body text-[11px] font-medium transition-all ${Number(a.valor_pago || 0) > 0 && Number(a.valor_pago || 0) < Number(a.valor) ? "border-gold/50 bg-gold/20 text-gold shadow-[0_0_12px_-2px_hsl(var(--gold)/0.4)]" : "border-gold/20 bg-gold/[0.08] text-gold/80 hover:border-gold/40 hover:bg-gold/15 hover:text-gold shadow-[0_2px_8px_-4px_hsl(var(--gold)/0.2)]"}`}
                                  >
                                    Sinal
                                  </button>
                                  <button
                                    onClick={() => updatePayment(a.id, "completo")}
                                    title="Marcar pago completo"
                                    className={`rounded-lg border px-2.5 py-1.5 font-body text-[11px] font-medium transition-all ${Number(a.valor_pago || 0) >= Number(a.valor) ? "border-green-500/50 bg-green-500/20 text-green-400 shadow-[0_0_12px_-2px_rgba(34,197,94,0.4)]" : "border-green-500/20 bg-green-500/[0.08] text-green-400/80 hover:border-green-500/40 hover:bg-green-500/15 hover:text-green-400 shadow-[0_2px_8px_-4px_rgba(34,197,94,0.2)]"}`}
                                  >
                                    Pago
                                  </button>
                                  <button
                                    onClick={() => openExtendDialog(a.id)}
                                    title="Estender duração"
                                    className="rounded-lg border border-blue-400/20 bg-blue-400/[0.08] px-2.5 py-1.5 font-body text-[11px] font-medium text-blue-400/80 transition-all hover:border-blue-400/40 hover:bg-blue-400/15 hover:text-blue-400 shadow-[0_2px_8px_-4px_rgba(96,165,250,0.2)]"
                                  >
                                    <span className="flex items-center gap-1"><Timer className="w-3 h-3" />Estender</span>
                                  </button>
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-1 self-end">
                              {a.status === "confirmado" && (
                                <>
                                  <button onClick={() => updateStatus(a.id, "concluido")} className="rounded-lg p-1.5 text-green-500/70 transition-all hover:bg-green-500/15 hover:text-green-400" title="Concluir">
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => updateStatus(a.id, "falta")} className="rounded-lg p-1.5 text-orange-500/70 transition-all hover:bg-orange-500/15 hover:text-orange-400" title="Marcar falta">
                                    <UserX className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => updateStatus(a.id, "cancelado")} className="rounded-lg p-1.5 text-rose/70 transition-all hover:bg-rose/15 hover:text-rose" title="Cancelar">
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              <BinButton size="sm" onClick={() => deleteAgendamento(a.id)} />

                            </div>
                          </div>
                        </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              {/* Modal de detalhes do agendamento */}
              <Dialog open={!!detalheAgendamento} onOpenChange={(o) => !o && setDetalheAgendamento(null)}>
                <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto overflow-x-hidden rounded-2xl border border-gold/20 bg-charcoal p-4 sm:p-5">
                  <DialogHeader>
                    <DialogTitle className="font-heading text-[17px] font-semibold text-primary-foreground">
                      Detalhes do agendamento
                    </DialogTitle>
                  </DialogHeader>
                  {detalheAgendamento && (() => {
                    const a = detalheAgendamento;
                    const cliente = clientes.find((c) => c.id === a.user_id);
                    const valorPago = Number(a.valor_pago || 0);
                    const valorTotal = Number(a.valor);
                    const restante = Math.max(0, valorTotal - valorPago);
                    return (
                      <div className="space-y-3">
                        {/* Cliente */}
                        <div className="rounded-2xl border border-gold/20 bg-gold/5 p-3">
                          <p className="font-body text-[10px] uppercase tracking-wider text-gold/70 mb-1">Cliente</p>
                          <p className="font-heading text-[16px] font-semibold text-primary-foreground">{getClientName(a.user_id, a.cliente_nome)}</p>
                          {cliente?.whatsapp && (
                            <a
                              href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex items-center gap-1.5 font-body text-[12px] text-green-400 hover:text-green-300"
                            >
                              <WhatsAppIcon className="h-3.5 w-3.5" />
                              {formatWhatsapp(cliente.whatsapp)}
                            </a>
                          )}
                        </div>

                        {/* Serviço + data/hora */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2 rounded-xl border border-primary-foreground/10 bg-primary-foreground/[0.04] p-3">
                            <p className="font-body text-[10px] uppercase tracking-wider text-primary-foreground/40 mb-1">Serviço</p>
                            <p className="font-body text-[14px] font-medium text-primary-foreground">{a.servico}{a.variacao ? ` · ${a.variacao}` : ""}</p>
                            <p className="font-body text-[11px] text-primary-foreground/50 mt-0.5">Duração: {a.duracao_minutos || 60} min{(a as any).foi_estendido ? " (estendido)" : ""}</p>
                          </div>
                          <div className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/[0.04] p-3">
                            <p className="font-body text-[10px] uppercase tracking-wider text-primary-foreground/40 mb-1">Data</p>
                            <p className="font-body text-[13px] font-medium text-primary-foreground">{formatDate(a.data_agendamento)}</p>
                          </div>
                          <div className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/[0.04] p-3">
                            <p className="font-body text-[10px] uppercase tracking-wider text-primary-foreground/40 mb-1">Horário</p>
                            <p className="font-body text-[13px] font-medium text-primary-foreground">{a.horario}</p>
                          </div>
                        </div>

                        {/* Observações */}
                        {a.observacao && (
                          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                            <p className="font-body text-[10px] uppercase tracking-wider text-amber-400/80 mb-1">📝 Observações do cliente</p>
                            <p className="font-body text-[13px] text-amber-100/95 leading-relaxed whitespace-pre-wrap break-words">{a.observacao}</p>
                          </div>
                        )}

                        {/* Pagamento */}
                        <div className="rounded-xl border border-gold/15 bg-gradient-to-br from-gold/[0.08] to-gold/[0.02] p-3 space-y-1.5">
                          <p className="font-body text-[10px] uppercase tracking-wider text-gold/70">Pagamento</p>
                          <div className="flex items-center justify-between">
                            <p className="font-body text-[12px] text-primary-foreground/60">Valor total</p>
                            <p className="font-heading text-[15px] font-semibold text-gold">R$ {valorTotal.toFixed(2).replace(".", ",")}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="font-body text-[12px] text-primary-foreground/60">Já recebido</p>
                            <p className="font-body text-[13px] font-medium text-green-400">R$ {valorPago.toFixed(2).replace(".", ",")}</p>
                          </div>
                          {restante > 0 && (
                            <div className="flex items-center justify-between border-t border-gold/10 pt-1.5">
                              <p className="font-body text-[12px] text-primary-foreground/60">A receber</p>
                              <p className="font-body text-[13px] font-medium text-red-400">R$ {restante.toFixed(2).replace(".", ",")}</p>
                            </div>
                          )}
                          {(a.valor_gorjeta || a.valor_troco || a.valor_credito || (a as any).valor_desconto_credito) ? (
                            <div className="border-t border-gold/10 pt-1.5 mt-1.5 space-y-1.5">
                              {Number((a as any).valor_desconto_credito) > 0 && (
                                <div className="flex items-center justify-between rounded-lg bg-blue-500/10 border border-blue-400/20 px-2 py-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[12px]">💳</span>
                                    <p className="font-body text-[12px] text-blue-300 font-medium">Desconto crédito a haver</p>
                                  </div>
                                  <p className="font-body text-[12px] font-bold text-blue-300">- R$ {Number((a as any).valor_desconto_credito).toFixed(2).replace(".", ",")}</p>
                                </div>
                              )}
                              {Number(a.valor_gorjeta) > 0 && (
                                <div className="flex items-center justify-between">
                                  <p className="font-body text-[12px] text-primary-foreground/60">Gorjeta (extra)</p>
                                  <p className="font-body text-[12px] font-medium text-purple-300">R$ {Number(a.valor_gorjeta).toFixed(2).replace(".", ",")}</p>
                                </div>
                              )}
                              {Number(a.valor_troco) > 0 && (
                                <div className="flex items-center justify-between">
                                  <p className="font-body text-[12px] text-primary-foreground/60">Troco pago</p>
                                  <p className="font-body text-[12px] font-medium text-blue-400">R$ {Number(a.valor_troco).toFixed(2).replace(".", ",")}</p>
                                </div>
                              )}
                              {Number(a.valor_credito) > 0 && (
                                <div className="flex items-center justify-between">
                                  <p className="font-body text-[12px] text-primary-foreground/60">Crédito concedido</p>
                                  <p className="font-body text-[12px] font-medium text-green-400">R$ {Number(a.valor_credito).toFixed(2).replace(".", ",")}</p>
                                </div>
                              )}
                              {Number((a as any).valor_desconto_credito) > 0 && (
                                <div className="flex items-center justify-between border-t border-blue-400/20 pt-1.5">
                                  <p className="font-body text-[12px] font-semibold text-primary-foreground/70">Total efetivo cobrado</p>
                                  <p className="font-heading text-[14px] font-bold text-green-300">
                                    R$ {Math.max(0, valorTotal - Number((a as any).valor_desconto_credito)).toFixed(2).replace(".", ",")}
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : null}
                          <div className="flex items-center justify-between border-t border-gold/10 pt-1.5 mt-1.5">
                            <p className="font-body text-[12px] text-primary-foreground/60">Forma</p>
                            <p className="font-body text-[12px] font-medium text-primary-foreground">{formatFormaPagamento(a.forma_pagamento)}</p>
                          </div>
                        </div>

                        {/* Status + origem */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {statusBadge(a.status)}
                          {pagamentoBadge(a)}
                          {a.origem === "whatsapp_bot" && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wide text-green-400">
                              <WhatsAppIcon className="h-3 w-3" /> WhatsApp
                            </span>
                          )}
                          {a.origem === "admin_manual" && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wide text-gold">Presencial</span>
                          )}
                          {a.origem === "app" && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/30 bg-blue-400/10 px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wide text-blue-400">App</span>
                          )}
                        </div>

                        {/* Metadados */}
                        <div className="rounded-xl border border-primary-foreground/[0.06] bg-primary-foreground/[0.02] p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="font-body text-[11px] text-primary-foreground/40">Criado em</p>
                            <p className="font-body text-[11px] text-primary-foreground/70">{new Date(a.created_at).toLocaleString("pt-BR")}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="font-body text-[11px] text-primary-foreground/40">ID</p>
                            <p className="font-body text-[10px] text-primary-foreground/40 font-mono">{a.id.slice(0, 8)}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditAgendamento(a)}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 font-body text-[12px] font-medium text-blue-400 hover:bg-blue-500/20 transition-all"
                          >
                            <Edit2 className="h-3.5 w-3.5" /> Editar Agendamento
                          </button>
                        </div>

                        {cliente && (
                          <button
                            onClick={() => { setDetalheAgendamento(null); setTab("clientes"); setSelectedClient(cliente.id); }}
                            className="w-full flex items-center justify-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-4 py-2.5 font-body text-[12px] font-medium text-gold hover:bg-gold/20 transition-all"
                          >
                            <Users className="h-3.5 w-3.5" /> Ver perfil completo do cliente
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </DialogContent>
              </Dialog>

              {/* Edit Agendamento Dialog */}
              <Dialog open={showEditAgendamento} onOpenChange={setShowEditAgendamento}>
                <DialogContent className="w-[calc(100vw-1rem)] max-w-md max-h-[88dvh] overflow-y-auto bg-charcoal/95 backdrop-blur-xl border border-gold/25 rounded-[1.75rem] p-6 shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="font-heading text-[18px] font-semibold text-primary-foreground flex items-center gap-2">
                      <Edit2 className="w-5 h-5 text-gold" />
                      Editar Agendamento
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-1.5">
                      <label className="font-body text-[10px] uppercase tracking-wider text-primary-foreground/50">Serviço(s)</label>
                      <input
                        type="text"
                        value={editAgServico}
                        onChange={(e) => setEditAgServico(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-primary-foreground font-body text-[13px] focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="font-body text-[10px] uppercase tracking-wider text-primary-foreground/50">Data</label>
                        <input
                          type="date"
                          value={editAgData}
                          onChange={(e) => setEditAgData(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-primary-foreground font-body text-[13px] focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-body text-[10px] uppercase tracking-wider text-primary-foreground/50">Horário</label>
                        <input
                          type="time"
                          value={editAgHorario}
                          onChange={(e) => setEditAgHorario(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-primary-foreground font-body text-[13px] focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="font-body text-[10px] uppercase tracking-wider text-primary-foreground/50">Valor Total (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editAgValor}
                          onChange={(e) => setEditAgValor(Number(e.target.value))}
                          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-primary-foreground font-body text-[13px] focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-body text-[10px] uppercase tracking-wider text-primary-foreground/50">Duração (min)</label>
                        <input
                          type="number"
                          step="5"
                          min="5"
                          value={editAgDuracao}
                          onChange={(e) => setEditAgDuracao(Number(e.target.value))}
                          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-primary-foreground font-body text-[13px] focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-6">
                    <button
                      onClick={() => setShowEditAgendamento(false)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-primary-foreground/10 bg-primary-foreground/[0.05] text-primary-foreground/60 font-body text-[13px] hover:bg-primary-foreground/10 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveEditAgendamento}
                      disabled={editAgSaving}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-gold text-charcoal font-body font-semibold text-[13px] hover:bg-gold/90 transition-all disabled:opacity-50"
                    >
                      {editAgSaving ? "Salvando..." : "Salvar Alterações"}
                    </button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Manual Registration Dialog */}
              <Dialog open={showManualRegister} onOpenChange={setShowManualRegister}>
                <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:max-w-md max-h-[88dvh] overflow-y-auto overflow-x-hidden bg-charcoal/95 backdrop-blur-xl border border-gold/25 rounded-[1.75rem] p-0 shadow-2xl">
                  {/* Gold halos */}
                  <div aria-hidden className="pointer-events-none absolute -top-20 -left-20 w-44 h-44 bg-gold/15 blur-[80px] rounded-full" />
                  <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-20 w-52 h-52 bg-gold/[0.06] blur-[100px] rounded-full" />

                  {/* Header */}
                  <div className="relative px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-white/[0.06]">
                    <DialogHeader>
                      <DialogTitle className="font-heading text-[17px] sm:text-[18px] font-semibold text-primary-foreground flex items-center gap-3 tracking-wide">
                        <span className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center shadow-[0_0_20px_-8px_hsl(var(--gold)/0.6)]">
                          <PlusCircle className="w-5 h-5 text-gold" />
                        </span>
                        Registro Manual
                      </DialogTitle>
                    </DialogHeader>
                  </div>

                  {/* Body */}
                  <div className="relative px-5 sm:px-6 py-5 space-y-5 w-full min-w-0">
                    {/* ── Serviços da comanda ── */}
                    <div className="relative space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <label className="font-body text-[10px] uppercase tracking-[0.2em] text-gold/80 font-semibold">Serviços da comanda *</label>
                        {manualItens.length > 0 && (
                          <span className="font-body text-[10px] text-gold/70 tabular-nums">{manualItens.length} {manualItens.length === 1 ? "item" : "itens"}</span>
                        )}
                      </div>

                      {/* Lista de itens adicionados */}
                      {manualItens.length > 0 && (
                        <div className="space-y-2">
                          {manualItens.map((it, idx) => (
                            <div key={it.id} className="rounded-2xl border border-gold/20 bg-gold/[0.05] backdrop-blur-sm p-3">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="font-body text-[13px] font-medium text-primary-foreground flex-1 min-w-0 break-words">
                                  <span className="text-gold/60 mr-1.5 tabular-nums">{idx + 1}.</span>{it.nome}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => removeManualItem(it.id)}
                                  className="flex-shrink-0 w-8 h-8 rounded-xl bg-rose/10 hover:bg-rose/20 text-rose flex items-center justify-center transition-colors"
                                  aria-label="Remover serviço"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="font-body text-[9px] uppercase tracking-wider text-primary-foreground/40 mb-1 block">Valor (R$)</label>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    step="0.01"
                                    value={it.valor || ""}
                                    onChange={(e) => updateManualItem(it.id, { valor: Number(e.target.value) || 0 })}
                                    placeholder="0,00"
                                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-primary-foreground font-body text-[13px] tabular-nums focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40 transition-all"
                                  />
                                </div>
                                <div>
                                  <label className="font-body text-[9px] uppercase tracking-wider text-primary-foreground/40 mb-1 block">Duração (min)</label>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min={5}
                                    step={5}
                                    value={it.duracao || ""}
                                    onChange={(e) => updateManualItem(it.id, { duracao: Number(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-primary-foreground font-body text-[13px] tabular-nums focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40 transition-all"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Resumo Total */}
                          {(() => {
                            const clienteCredito = manualCliente
                              ? Number(clientes.find(c => c.id === manualCliente)?.credito_saldo || 0)
                              : 0;
                            const descontoCredito = Math.min(clienteCredito, manualValorTotal);
                            const totalComDesconto = manualValorTotal - descontoCredito;
                            return (
                              <>
                                <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 shadow-[0_0_24px_-12px_hsl(var(--gold)/0.6)] ${
                                  descontoCredito > 0
                                    ? "border-gold/20 bg-gold/5"
                                    : "border-gold/30 bg-gold/10"
                                }`}>
                                  <span className="font-body text-[10px] uppercase tracking-[0.2em] text-primary-foreground/70 font-semibold">Total dos serviços</span>
                                  <div className="text-right">
                                    <p className={`font-heading text-[16px] font-semibold tabular-nums leading-none ${
                                      descontoCredito > 0 ? "line-through text-primary-foreground/40" : "text-gold"
                                    }`}>R$ {manualValorTotal.toFixed(2).replace(".", ",")}</p>
                                    <p className="font-body text-[10px] text-primary-foreground/50 mt-1 tabular-nums">{manualDuracaoTotal} min</p>
                                  </div>
                                </div>
                                {descontoCredito > 0 && (
                                  <div className="rounded-2xl border border-blue-400/40 bg-gradient-to-br from-blue-500/15 to-blue-500/[0.04] px-4 py-3 space-y-2 shadow-[0_0_20px_-8px_rgba(59,130,246,0.4)]">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[14px]">💳</span>
                                        <span className="font-body text-[11px] font-semibold text-blue-300 uppercase tracking-wider">Desconto — Crédito a Haver</span>
                                      </div>
                                      <span className="font-heading text-[14px] font-bold text-blue-300 tabular-nums">- R$ {descontoCredito.toFixed(2).replace(".", ",")}</span>
                                    </div>
                                    <div className="flex items-center justify-between pt-1 border-t border-blue-400/20">
                                      <span className="font-body text-[11px] font-semibold text-primary-foreground/70 uppercase tracking-wider">Total a cobrar</span>
                                      <span className="font-heading text-[20px] font-bold text-green-300 tabular-nums drop-shadow-[0_0_8px_rgba(134,239,172,0.5)]">R$ {totalComDesconto.toFixed(2).replace(".", ",")}</span>
                                    </div>
                                    {clienteCredito > descontoCredito && (
                                      <p className="font-body text-[10px] text-blue-400/70">
                                        Saldo restante após desconto: R$ {(clienteCredito - descontoCredito).toFixed(2).replace(".", ",")}
                                      </p>
                                    )}
                                    {clienteCredito <= manualValorTotal && clienteCredito > 0 && (
                                      <p className="font-body text-[10px] text-amber-400/80">
                                        ⚠️ Crédito esgotado após este atendimento
                                      </p>
                                    )}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}

                      {/* Buscar / adicionar serviço */}
                      <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/30 group-focus-within:text-gold pointer-events-none transition-colors" />
                        <input
                          type="text"
                          placeholder={manualItens.length === 0 ? "Buscar serviço..." : "+ Adicionar outro serviço..."}
                          value={manualServicoSearch}
                          onFocus={() => setManualServicoOpen(true)}
                          onChange={(e) => { setManualServicoSearch(e.target.value); setManualServicoOpen(true); }}
                          className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-primary-foreground font-body text-[13px] focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40 placeholder:text-primary-foreground/30 backdrop-blur-sm transition-all"
                        />
                      </div>

                      {manualServicoOpen && (
                        <div className="absolute z-50 mt-1 left-0 right-0 rounded-2xl border border-gold/20 bg-charcoal/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                          <div className="max-h-52 overflow-y-auto">
                            {manualServicos
                              .filter(s => s.nome.toLowerCase().includes(manualServicoSearch.toLowerCase()))
                              .length === 0 ? (
                              <p className="px-4 py-3 font-body text-[12px] text-primary-foreground/30 text-center">Nenhum serviço encontrado</p>
                            ) : (
                              manualServicos
                                .filter(s => s.nome.toLowerCase().includes(manualServicoSearch.toLowerCase()))
                                .map(s => (
                                  <button
                                    key={s.id}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      addManualItem(s.nome);
                                      setManualServicoSearch("");
                                      setManualServicoOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-3 font-body text-[13px] transition-all hover:bg-gold/10 text-primary-foreground flex items-center justify-between gap-3"
                                  >
                                    <span className="font-medium truncate">{s.nome}</span>
                                    <span className="text-[11px] text-gold/70 tabular-nums flex-shrink-0">R$ {s.preco.toFixed(2).replace(".", ",")}</span>
                                  </button>
                                ))
                            )}
                          </div>
                        </div>
                      )}
                      {manualServicoOpen && (
                        <div className="fixed inset-0 z-40" onClick={() => setManualServicoOpen(false)} />
                      )}
                    </div>

                    {/* ── Cliente com busca ── */}
                    <div className="relative space-y-2.5">
                      <label className="font-body text-[10px] uppercase tracking-[0.2em] text-primary-foreground/45 font-semibold px-1 block">Cliente</label>
                      <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/30 group-focus-within:text-gold pointer-events-none transition-colors" />
                        <input
                          type="text"
                          placeholder={manualCliente ? clientes.find(c => c.id === manualCliente)?.nome || "Cliente selecionado" : "Buscar cliente..."}
                          value={manualClienteSearch}
                          onFocus={() => setManualClienteOpen(true)}
                          onChange={(e) => { setManualClienteSearch(e.target.value); setManualClienteOpen(true); }}
                          className={`w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white/[0.04] border font-body text-[13px] focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40 placeholder:text-primary-foreground/30 backdrop-blur-sm transition-all ${
                            manualCliente ? "border-gold/40 text-gold" : "border-white/[0.08] text-primary-foreground"
                          }`}
                        />
                        {manualCliente && (
                          <button
                            onClick={() => { setManualCliente(""); setManualClienteSearch(""); setManualClienteNome(""); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-rose/10 hover:bg-rose/20 text-rose flex items-center justify-center transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {/* Credit badge when client is selected */}
                      {manualCliente && (() => {
                        const creditoSaldo = Number(clientes.find(c => c.id === manualCliente)?.credito_saldo || 0);
                        if (creditoSaldo <= 0) return null;
                        return (
                          <div className="flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-2 animate-fade-in">
                            <span className="text-[14px]">💳</span>
                            <p className="font-body text-[12px] text-blue-300 flex-1">
                              Crédito a haver:
                              <span className="font-heading font-bold ml-1.5 tabular-nums">R$ {creditoSaldo.toFixed(2).replace(".", ",")}</span>
                            </p>
                            <span className="font-body text-[10px] text-blue-400/60 italic">será descontado</span>
                          </div>
                        );
                      })()}
                      {manualClienteOpen && (
                        <div className="absolute z-50 mt-1 left-0 right-0 rounded-2xl border border-gold/20 bg-charcoal/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                          <div className="max-h-52 overflow-y-auto">
                            <button
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => { setManualCliente(""); setManualClienteNome(""); setManualClienteSearch(""); setManualClienteOpen(false); }}
                              className={`w-full text-left px-4 py-3 font-body text-[13px] transition-all hover:bg-white/[0.04] ${
                                !manualCliente ? "bg-white/[0.04] text-primary-foreground/70" : "text-primary-foreground/40"
                              }`}
                            >
                              Sem cliente (presencial)
                            </button>
                            {clientes
                              .filter(c =>
                                c.nome.toLowerCase().includes(manualClienteSearch.toLowerCase()) ||
                                c.whatsapp.includes(manualClienteSearch)
                              )
                              .length === 0 && manualClienteSearch ? (
                              <p className="px-4 py-3 font-body text-[12px] text-primary-foreground/30 text-center">Nenhum cliente encontrado</p>
                            ) : (
                              clientes
                                .filter(c =>
                                  c.nome.toLowerCase().includes(manualClienteSearch.toLowerCase()) ||
                                  c.whatsapp.includes(manualClienteSearch)
                                )
                                .map(c => (
                                  <button
                                    key={c.id}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setManualCliente(c.id);
                                      setManualClienteNome(c.nome);
                                      setManualClienteSearch("");
                                      setManualClienteOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 font-body text-[13px] transition-all hover:bg-gold/10 flex items-center justify-between gap-3 ${
                                      manualCliente === c.id ? "bg-gold/10 text-gold" : "text-primary-foreground"
                                    }`}
                                  >
                                    <span className="font-medium truncate">{c.nome}</span>
                                    <span className="flex items-center gap-2 shrink-0">
                                      {Number(c.credito_saldo || 0) > 0 && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/30 bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-bold text-blue-300">
                                          💳 R$ {Number(c.credito_saldo).toFixed(2).replace(".", ",")}
                                        </span>
                                      )}
                                      <span className="text-[11px] text-primary-foreground/40 tabular-nums">{c.whatsapp}</span>
                                    </span>
                                  </button>
                                ))
                            )}
                          </div>
                        </div>
                      )}
                      {manualClienteOpen && (
                        <div className="fixed inset-0 z-40" onClick={() => setManualClienteOpen(false)} />
                      )}
                    </div>

                    {!manualCliente && (
                      <div className="space-y-2.5">
                        <label className="font-body text-[10px] uppercase tracking-[0.2em] text-primary-foreground/45 font-semibold px-1 block">Nome do cliente (presencial)</label>
                        <input
                          type="text"
                          placeholder="Ex: Maria Silva"
                          value={manualClienteNome}
                          onChange={(e) => setManualClienteNome(e.target.value)}
                          className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-primary-foreground font-body text-[13px] focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40 placeholder:text-primary-foreground/25 backdrop-blur-sm transition-all"
                        />
                      </div>
                    )}

                    {/* ── Data ── */}
                    <div className="space-y-2.5">
                      <label className="font-body text-[10px] uppercase tracking-[0.2em] text-primary-foreground/45 font-semibold px-1 block">Data *</label>
                      <input
                        type="date"
                        value={manualData}
                        onChange={(e) => setManualData(e.target.value)}
                        style={{ textAlign: "left", justifyContent: "flex-start" }}
                        className="w-full block px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-primary-foreground font-body text-[13px] text-left tabular-nums focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40 backdrop-blur-sm transition-all appearance-none"
                      />
                    </div>

                    {/* ── Horário ── */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <label className="font-body text-[10px] uppercase tracking-[0.2em] text-primary-foreground/45 font-semibold block">Horário do atendimento *</label>
                        <span className="font-body text-[10px] text-gold bg-gold/10 px-2 py-0.5 rounded-md font-medium tabular-nums">{manualDuracaoTotal} min</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1.5 min-w-0">
                          <span className="font-body text-[9px] uppercase tracking-wider text-primary-foreground/35 px-1 block truncate">Início</span>
                          <input
                            type="time"
                            value={manualHorario}
                            onChange={(e) => handleManualHorarioChange(e.target.value)}
                            className="w-full min-w-0 px-2 sm:px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-primary-foreground font-body text-[13px] tabular-nums text-center focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40 backdrop-blur-sm transition-all appearance-none"
                          />
                        </div>
                        <div className="space-y-1.5 min-w-0">
                          <span className="font-body text-[9px] uppercase tracking-wider text-primary-foreground/35 px-1 block truncate">Fim</span>
                          <input
                            type="time"
                            value={manualHorarioFim}
                            onChange={(e) => handleManualHorarioFimChange(e.target.value)}
                            className="w-full min-w-0 px-2 sm:px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-primary-foreground font-body text-[13px] tabular-nums text-center focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40 backdrop-blur-sm transition-all appearance-none"
                          />
                        </div>
                      </div>
                      <p className="px-1 font-body text-[10px] text-primary-foreground/40 italic">Duração calculada a partir dos serviços adicionados.</p>
                    </div>

                    {/* ── Forma de pagamento ── */}
                    <div className="space-y-2.5">
                      <label className="font-body text-[10px] uppercase tracking-[0.2em] text-primary-foreground/45 font-semibold px-1 block">Forma de pagamento</label>
                      <select
                        value={manualFormaPagamento}
                        onChange={(e) => setManualFormaPagamento(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-primary-foreground font-body text-[13px] focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40 backdrop-blur-sm transition-all appearance-none"
                      >
                        <option value="pix" className="bg-charcoal">PIX</option>
                        <option value="cartao" className="bg-charcoal">Cartão</option>
                        <option value="dinheiro" className="bg-charcoal">Dinheiro</option>
                        <option value="transferencia" className="bg-charcoal">Transferência</option>
                      </select>
                    </div>

                    {/* ── Troco / Gorjeta / Crédito ── */}
                    <div className="space-y-2.5">
                      <label className="font-body text-[10px] uppercase tracking-[0.2em] text-primary-foreground/60 font-semibold px-1 block flex items-center gap-2">
                        Valores Extras (Opcional)
                      </label>
                      
                      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-4 space-y-4 relative overflow-hidden">
                        {/* Decorative background glows */}
                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                          <div className="absolute top-0 left-1/4 w-1/4 h-full bg-blue-500/20 blur-2xl"></div>
                          <div className="absolute top-0 left-2/4 w-1/4 h-full bg-purple-500/20 blur-2xl"></div>
                          <div className="absolute top-0 right-0 w-1/4 h-full bg-green-500/20 blur-2xl"></div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 relative z-10">
                          <div className="space-y-1.5">
                            <span className="font-body text-[9px] uppercase tracking-wider text-blue-400/90 px-1 block truncate font-semibold">Troco</span>
                            <div className="relative group">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-blue-400/50 font-medium group-focus-within:text-blue-400 transition-colors">R$</span>
                              <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step="0.01"
                                value={manualTroco || ""}
                                onChange={(e) => setManualTroco(Number(e.target.value) || 0)}
                                placeholder="0,00"
                                className="w-full pl-8 pr-2 py-2.5 rounded-xl bg-blue-500/[0.06] border border-blue-500/20 text-blue-400 font-body text-[13px] tabular-nums focus:outline-none focus:border-blue-400/60 focus:ring-1 focus:ring-blue-400/40 transition-all placeholder:text-blue-400/30"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <span className="font-body text-[9px] uppercase tracking-wider text-purple-400/90 px-1 block truncate font-semibold">Gorjeta</span>
                            <div className="relative group">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-purple-400/50 font-medium group-focus-within:text-purple-400 transition-colors">R$</span>
                              <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step="0.01"
                                value={manualGorjeta || ""}
                                onChange={(e) => setManualGorjeta(Number(e.target.value) || 0)}
                                placeholder="0,00"
                                className="w-full pl-8 pr-2 py-2.5 rounded-xl bg-purple-500/[0.06] border border-purple-500/20 text-purple-300 font-body text-[13px] tabular-nums focus:outline-none focus:border-purple-400/60 focus:ring-1 focus:ring-purple-400/40 transition-all placeholder:text-purple-400/30"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <span className="font-body text-[9px] uppercase tracking-wider text-green-400/90 px-1 block truncate font-semibold">Crédito</span>
                            <div className="relative group">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-green-400/50 font-medium group-focus-within:text-green-400 transition-colors">R$</span>
                              <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step="0.01"
                                value={manualCredito || ""}
                                onChange={(e) => setManualCredito(Number(e.target.value) || 0)}
                                placeholder="0,00"
                                className="w-full pl-8 pr-2 py-2.5 rounded-xl bg-green-500/[0.06] border border-green-500/20 text-green-400 font-body text-[13px] tabular-nums focus:outline-none focus:border-green-400/60 focus:ring-1 focus:ring-green-400/40 transition-all placeholder:text-green-400/30"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="relative z-10 pt-1 border-t border-white/[0.04]">
                          <p className="px-1 font-body text-[10px] text-primary-foreground/40 italic leading-relaxed">
                            <span className="text-purple-300/80 font-medium">Gorjeta</span> soma à comissão · <span className="text-blue-400/80 font-medium">Troco</span> e <span className="text-green-400/80 font-medium">crédito</span> descontam da base
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ── Toggles ── */}
                    <div className="space-y-2.5">
                      <div className={`flex items-center justify-between p-4 rounded-2xl border backdrop-blur-sm transition-all ${
                        manualPago
                          ? "bg-gold/[0.06] border-gold/25 shadow-[0_0_24px_-12px_hsl(var(--gold)/0.5)]"
                          : "bg-white/[0.03] border-white/[0.08]"
                      }`}>
                        <div className="min-w-0 pr-3">
                          <p className={`font-body text-[13px] font-medium ${manualPago ? "text-gold" : "text-primary-foreground"}`}>Já foi pago?</p>
                          <p className="font-body text-[10px] text-primary-foreground/40 mt-0.5">Marcar como pagamento recebido</p>
                        </div>
                        <Switch checked={manualPago} onCheckedChange={setManualPago} />
                      </div>

                      <div className={`flex items-center justify-between p-4 rounded-2xl border backdrop-blur-sm transition-all ${
                        manualConcluido
                          ? "bg-green-500/[0.08] border-green-500/30 shadow-[0_0_24px_-12px_rgba(34,197,94,0.5)]"
                          : "bg-white/[0.03] border-white/[0.08]"
                      }`}>
                        <div className="min-w-0 pr-3">
                          <p className={`font-body text-[13px] font-medium flex items-center gap-1.5 ${manualConcluido ? "text-green-400" : "text-primary-foreground"}`}>
                            Já foi atendida?
                            {manualConcluido && <span className="text-green-400">✓</span>}
                          </p>
                          <p className="font-body text-[10px] text-primary-foreground/40 mt-0.5">Marcar agendamento como concluído</p>
                        </div>
                        <Switch checked={manualConcluido} onCheckedChange={setManualConcluido} />
                      </div>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="relative px-5 sm:px-6 pt-4 pb-5 sm:pb-6 border-t border-white/[0.06] bg-gradient-to-t from-black/30 to-transparent space-y-2.5">
                    <button
                      onClick={saveManualRegistration}
                      disabled={manualSaving}
                      className="w-full py-3.5 rounded-2xl bg-gold text-charcoal font-body text-[13px] font-bold uppercase tracking-[0.15em] shadow-[0_10px_30px_-10px_hsl(var(--gold)/0.5)] hover:shadow-[0_15px_35px_-5px_hsl(var(--gold)/0.6)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {manualSaving ? "Salvando..." : "Registrar Atendimento"}
                    </button>
                    <button
                      onClick={() => setShowManualRegister(false)}
                      className="w-full py-3 rounded-2xl bg-transparent text-primary-foreground/45 hover:text-primary-foreground/80 font-body text-[12px] uppercase tracking-[0.15em] transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </DialogContent>
              </Dialog>



              {/* Extend Duration Dialog */}
              <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
                <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:max-w-sm max-h-[85dvh] overflow-y-auto overflow-x-hidden bg-charcoal border border-blue-500/20 rounded-2xl p-4 sm:p-5">
                  <DialogHeader>
                    <DialogTitle className="font-heading text-[16px] font-semibold text-primary-foreground flex items-center gap-2">
                      <Timer className="w-4 h-4 text-blue-400" />
                      Estender Atendimento
                    </DialogTitle>
                  </DialogHeader>
                  {(() => {
                    const ag = agendamentos.find(a => a.id === extendingId);
                    if (!ag) return null;
                    const extraMin = Number(extendMinutes) || 30;
                    const newDuration = (ag.duracao_minutos || 60) + extraMin;
                    const [startH, startM] = ag.horario.split(":").map(Number);
                    const endTotalMin = startH * 60 + startM + newDuration;
                    const endH = Math.floor(endTotalMin / 60);
                    const endMn = endTotalMin % 60;
                    const newSlotsBlocked = Math.ceil(newDuration / 30);
                    return (
                      <div className="space-y-3 w-full">
                        <div className="p-3 rounded-xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
                          <p className="font-body text-[13px] font-medium text-primary-foreground">{ag.servico}</p>
                          <p className="font-body text-[11px] text-primary-foreground/40 mt-0.5">
                            {ag.horario} · Duração atual: {ag.duracao_minutos || 60} min
                          </p>
                        </div>

                        <div>
                          <label className="font-body text-[10px] text-primary-foreground/30 mb-1 block">Adicionar minutos</label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {["30", "60", "90", "120"].map(m => (
                              <button
                                key={m}
                                onClick={() => setExtendMinutes(m)}
                                className={`py-2 rounded-xl font-body text-[12px] font-medium transition-all border ${
                                  extendMinutes === m
                                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                    : "bg-primary-foreground/[0.03] text-primary-foreground/40 border-primary-foreground/[0.06] hover:text-primary-foreground/60"
                                }`}
                              >
                                +{m}min
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
                          <div className="flex items-center justify-between">
                            <p className="font-body text-[11px] text-blue-400/70">Nova duração</p>
                            <p className="font-body text-[14px] font-bold text-blue-400">{newDuration} min</p>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="font-body text-[11px] text-blue-400/70">Término</p>
                            <p className="font-body text-[13px] font-medium text-blue-400">
                              {String(endH).padStart(2, "0")}:{String(endMn).padStart(2, "0")}
                            </p>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="font-body text-[11px] text-blue-400/70">Slots bloqueados</p>
                            <p className="font-body text-[13px] font-medium text-blue-400">{newSlotsBlocked}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={saveExtendAppointment}
                            disabled={extendSaving}
                            className="w-full py-2.5 rounded-xl bg-blue-500/10 text-blue-400 font-body text-[13px] font-medium hover:bg-blue-500/20 transition-all disabled:opacity-40"
                          >
                            {extendSaving ? "Salvando..." : "Estender"}
                          </button>
                          <button
                            onClick={() => setShowExtendDialog(false)}
                            className="w-full py-2.5 rounded-xl bg-primary-foreground/[0.05] text-primary-foreground/40 font-body text-[13px] hover:text-primary-foreground/60 transition-all"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </DialogContent>
              </Dialog>
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
              // Saldo devedor: soma das diferenças em pedidos não cancelados/faltas
              const saldoDevedor = selAgendamentos
                .filter((a) => a.status !== "cancelado" && a.status !== "falta")
                .reduce((s, a) => s + Math.max(0, Number(a.valor) - Number(a.valor_pago || 0)), 0);
              const pedidosDevendo = selAgendamentos.filter(
                (a) => a.status !== "cancelado" && a.status !== "falta" && Number(a.valor_pago || 0) < Number(a.valor)
              ).length;

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
                    <DialogContent className="w-[calc(100vw-1rem)] max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto overflow-x-hidden rounded-[24px] border border-white/[0.12] bg-[#141415]/80 backdrop-blur-3xl p-6 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] custom-scrollbar">
                      <DialogHeader className="mb-2">
                        <DialogTitle className="font-heading text-[22px] font-bold text-primary-foreground tracking-wide drop-shadow-md">
                          {selProfile?.nome || "Cliente"}
                        </DialogTitle>
                      </DialogHeader>
                      {selProfile && (
                        <div className="space-y-6 relative z-10">
                          <div className="space-y-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-500/15 border border-blue-500/20">
                                <span className="text-[12px]">📱</span>
                              </div>
                              <p className="font-body text-[13px] text-primary-foreground/80 font-medium">{formatWhatsapp(selProfile.whatsapp)}</p>
                            </div>
                            {selProfile.cpf && (
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-purple-500/15 border border-purple-500/20">
                                  <span className="text-[12px]">🪪</span>
                                </div>
                                <p className="font-body text-[13px] text-primary-foreground/80 font-medium">CPF {selProfile.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</p>
                              </div>
                            )}
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500/15 border border-emerald-500/20">
                                <span className="text-[12px]">📅</span>
                              </div>
                              <p className="font-body text-[13px] text-primary-foreground/80 font-medium">Cliente desde {new Date(selProfile.created_at).toLocaleDateString("pt-BR")}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-500/15 to-emerald-500/5 p-4 text-center shadow-[0_4px_24px_-4px_rgba(16,185,129,0.2)] backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                              <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              <p className="font-heading text-[24px] font-bold text-emerald-400 relative z-10 drop-shadow-sm">R$ {totalGasto.toFixed(2).replace(".", ",")}</p>
                              <p className="font-body text-[11px] text-emerald-400/80 relative z-10 mt-1 uppercase tracking-wider font-bold">Total pago</p>
                            </div>
                            <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-b from-amber-500/15 to-amber-500/5 p-4 text-center shadow-[0_4px_24px_-4px_rgba(245,158,11,0.2)] backdrop-blur-md relative overflow-hidden group hover:border-amber-500/40 transition-all">
                              <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              <p className="font-heading text-[24px] font-bold text-amber-400 relative z-10 drop-shadow-sm">R$ {saldoDevedor.toFixed(2).replace(".", ",")}</p>
                              <p className="font-body text-[11px] text-amber-400/80 relative z-10 mt-1 uppercase tracking-wider font-bold">Valor pendente</p>
                            </div>
                          </div>

                          {/* Crédito a Haver */}
                          {(() => {
                            const creditoSaldo = Number(selProfile.credito_saldo || 0);

                            const saveCredito = async () => {
                              setSavingCredito(true);
                              const novoSaldo = Math.max(0, Number(tempCredito) || 0);
                              // Use RPC with SECURITY DEFINER to bypass RLS
                              const { error } = await (supabase as any).rpc("admin_set_credito_saldo", {
                                p_user_id: selProfile.id,
                                p_novo_saldo: novoSaldo,
                              });
                              if (!error) {
                                setClientes(prev => prev.map(c => c.id === selProfile.id ? { ...c, credito_saldo: novoSaldo } : c));
                                toast.success("Crédito atualizado!");
                                setEditingCredito(false);
                              } else {
                                console.error("Erro ao salvar crédito:", error);
                                toast.error("Erro ao salvar crédito: " + error.message);
                              }
                              setSavingCredito(false);
                            };

                            return (
                              <div className={`rounded-2xl border p-4 ${creditoSaldo > 0 ? "border-blue-400/40 bg-gradient-to-br from-blue-500/15 via-blue-500/[0.06] to-transparent shadow-[0_0_0_1px_rgba(59,130,246,0.1),0_8px_24px_-8px_rgba(59,130,246,0.3)]" : "border-white/[0.06] bg-white/[0.02]"}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <p className={`font-body text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5 ${creditoSaldo > 0 ? "text-blue-400" : "text-primary-foreground/40"}`}>
                                    <span>💳</span> Crédito a Haver
                                  </p>
                                  {!editingCredito ? (
                                    <button onClick={() => { setTempCredito(creditoSaldo.toFixed(2)); setEditingCredito(true); }} className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-primary-foreground/50 hover:text-primary-foreground hover:bg-white/[0.08] font-body text-[10px] transition-all">
                                      Ajustar
                                    </button>
                                  ) : (
                                    <div className="flex gap-1.5">
                                      <button onClick={saveCredito} disabled={savingCredito} className="px-3 py-1 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-300 font-body text-[10px] font-bold hover:bg-blue-500/30 transition-all disabled:opacity-50">
                                        {savingCredito ? "..." : "Salvar"}
                                      </button>
                                      <button onClick={() => setEditingCredito(false)} className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-primary-foreground/50 font-body text-[10px] hover:bg-white/[0.08] transition-all">
                                        Cancelar
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {editingCredito ? (
                                  <div className="flex items-center gap-2">
                                    <span className="font-body text-[13px] text-primary-foreground/60">R$</span>
                                    <input type="number" step="0.01" min="0" value={tempCredito} onChange={e => setTempCredito(e.target.value)} autoFocus className="flex-1 px-3 py-2 rounded-xl bg-white/[0.05] border border-blue-400/30 text-primary-foreground font-heading text-[20px] font-bold focus:outline-none focus:ring-2 focus:ring-blue-400/30 tabular-nums" />
                                  </div>
                                ) : (
                                  <p className={`font-heading text-[28px] font-bold tabular-nums ${creditoSaldo > 0 ? "text-blue-300 drop-shadow-[0_0_12px_rgba(59,130,246,0.4)]" : "text-primary-foreground/20"}`}>
                                    R$ {creditoSaldo.toFixed(2).replace(".", ",")}
                                  </p>
                                )}
                                {creditoSaldo > 0 && !editingCredito && (
                                  <p className="font-body text-[10px] text-blue-400/60 mt-1.5">Este saldo será descontado automaticamente no próximo pagamento</p>
                                )}
                              </div>
                            );
                          })()}

                          {saldoDevedor > 0 && (
                            <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-amber-500/[0.06] to-transparent p-4 shadow-[0_0_0_1px_rgba(245,158,11,0.08),0_8px_24px_-8px_rgba(245,158,11,0.35)]">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-body text-[11px] uppercase tracking-wider text-amber-400/80 font-bold">Saldo devedor</p>
                                  <p className="font-heading text-[24px] font-bold text-amber-300 leading-tight mt-0.5">
                                    R$ {saldoDevedor.toFixed(2).replace(".", ",")}
                                  </p>
                                  <p className="font-body text-[12px] text-amber-200/70 mt-1">
                                    {pedidosDevendo} {pedidosDevendo === 1 ? "pedido em aberto" : "pedidos em aberto"}
                                  </p>
                                </div>
                                <div className="shrink-0 h-12 w-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-inner">
                                  <span className="font-heading text-[20px] text-amber-300">⌛</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {saldoDevedor <= 0 && totalValor > 0 && (
                            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                                <span className="text-emerald-400 text-[14px]">✓</span>
                              </div>
                              <p className="font-body text-[12px] text-emerald-300/90 font-medium">Cliente sem pendências financeiras.</p>
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent p-3 text-center">
                              <p className="font-heading text-[20px] font-bold text-emerald-400">{confirmedCount}</p>
                              <p className="font-body text-[10px] text-emerald-400/70 uppercase tracking-widest mt-0.5 font-semibold">Realizadas</p>
                            </div>
                            <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-transparent p-3 text-center">
                              <p className="font-heading text-[20px] font-bold text-red-400">{faltaCount}</p>
                              <p className="font-body text-[10px] text-red-400/70 uppercase tracking-widest mt-0.5 font-semibold">Faltas</p>
                            </div>
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
                              <p className="font-heading text-[20px] font-bold text-primary-foreground/50">{cancelCount}</p>
                              <p className="font-body text-[10px] text-primary-foreground/30 uppercase tracking-widest mt-0.5 font-semibold">Canceladas</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <p className="font-body text-[13px] font-semibold text-primary-foreground/60 uppercase tracking-wider pl-1">Histórico de procedimentos</p>
                            <div className="max-h-[220px] space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                              {selAgendamentos.length === 0 && <p className="py-6 text-center font-body text-[13px] text-primary-foreground/30 italic">Nenhum procedimento registrado.</p>}
                              {selAgendamentos
                                .sort((a, b) => b.data_agendamento.localeCompare(a.data_agendamento))
                                .map((a) => (
                                  <div key={a.id} className="group flex flex-col gap-2 rounded-2xl border border-white/[0.04] bg-white/[0.02] p-3.5 hover:bg-white/[0.04] hover:border-white/[0.08] transition-all">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-heading text-[14px] font-semibold text-primary-foreground truncate">{a.servico}{a.variacao ? ` - ${a.variacao}` : ""}</p>
                                        <p className="font-body text-[11px] text-primary-foreground/40 mt-0.5 flex items-center gap-1.5">
                                          <span>{formatDate(a.data_agendamento)}</span>
                                          <span className="w-1 h-1 rounded-full bg-primary-foreground/20"></span>
                                          <span>{a.horario}</span>
                                        </p>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <p className="font-body text-[14px] font-bold text-gold">
                                          R$ {(a.valor_pago || 0).toFixed(2).replace(".", ",")}
                                        </p>
                                        <p className="font-body text-[10px] text-primary-foreground/30 line-through">
                                          R$ {Number(a.valor).toFixed(2).replace(".", ",")}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                      <span
                                          className={`px-2 py-1 rounded-md font-body text-[10px] font-semibold tracking-wide uppercase ${
                                            a.status === "confirmado" || a.status === "concluido"
                                              ? "bg-emerald-500/10 text-emerald-400"
                                              : a.status === "falta"
                                                ? "bg-red-500/10 text-red-400"
                                                : a.status === "cancelado"
                                                  ? "bg-white/[0.05] text-primary-foreground/40"
                                                  : "bg-gold/10 text-gold"
                                          }`}
                                        >
                                          {a.status}
                                      </span>
                                      {a.status !== "cancelado" && a.status !== "falta" && Number(a.valor_pago || 0) < Number(a.valor) && (
                                        <span className="px-2 py-1 rounded-md font-body text-[10px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                          Devendo R$ {(Number(a.valor) - Number(a.valor_pago || 0)).toFixed(2).replace(".", ",")}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>

                          <div className="pt-2">
                            <button
                              onClick={() => setClienteParaExcluir(selProfile)}
                              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-transparent bg-transparent px-4 py-3.5 font-body text-[13px] font-semibold text-red-400/70 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                              Excluir cliente permanentemente
                            </button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>

                  <AlertDialog open={!!clienteParaExcluir} onOpenChange={(o) => !o && !excluindoCliente && setClienteParaExcluir(null)}>
                    <AlertDialogContent className="w-[calc(100vw-1rem)] max-w-md rounded-2xl border-red-500/30 bg-charcoal">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-heading text-primary-foreground">
                          Excluir {clienteParaExcluir?.nome}?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="font-body text-[13px] text-primary-foreground/60">
                          Esta ação é <strong className="text-red-400">permanente e não pode ser desfeita</strong>.
                          Serão excluídos do banco de dados:
                          <ul className="mt-2 list-disc pl-5 space-y-0.5 text-[12px]">
                            <li>O perfil do cliente</li>
                            <li>Todos os agendamentos dele</li>
                            <li>A conta de login (auth)</li>
                            <li>Tokens de senha e notificações push</li>
                          </ul>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={excluindoCliente} className="bg-primary-foreground/[0.05] border-primary-foreground/[0.1] text-primary-foreground hover:bg-primary-foreground/[0.1]">
                          Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                          disabled={excluindoCliente}
                          onClick={(e) => { e.preventDefault(); handleExcluirCliente(); }}
                          className="bg-red-500 text-white hover:bg-red-600"
                        >
                          {excluindoCliente ? "Excluindo..." : "Excluir tudo"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })()}

          {tab === "financeiro" && <FinanceiroTab agendamentos={agendamentos} getClientName={getClientName} />}
          {tab === "caixa" && <CaixaTab agendamentos={agendamentos} getClientName={getClientName} />}
          {tab === "dividas" && <DividasTab />}
          {tab === "pagamentos" && <PagamentosTab agendamentos={agendamentos} getClientName={getClientName} onUpdate={loadData} />}
          {tab === "pedidos" && <PedidosTab agendamentos={agendamentos} getClientName={getClientName} clientes={clientes} onUpdate={loadData} />}
          {tab === "despesas" && <DespesasTab />}
          {tab === "anamnese" && <AnamneseTab />}
          {tab === "avaliacoes" && <AvaliacoesTab />}
          {tab === "produtos" && <ProdutosTab />}
          {tab === "gateway" && <GatewayTab />}
          {tab === "chatbot" && <AdminBotWpp embedded />}
          {tab === "horarios" && <HorariosTab />}
          {tab === "servicos" && <ServicosTab tableName="servicos" storageKey="admin_custom_categorias_servicos" scopeLabel="Catálogo WhatsApp" scopeHint="Estes serviços são enviados pelo chatbot do WhatsApp" />}
          {tab === "servicos_app" && <ServicosTab tableName="servicos_app" storageKey="admin_custom_categorias_servicos_app" scopeLabel="Catálogo App" scopeHint="Estes serviços aparecem somente no aplicativo dos clientes" />}
        </div>
      </div>

      {/* Bottom nav fixa - mobile only - atalhos do dia a dia */}
      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-primary-foreground/[0.06] bg-charcoal/95 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex w-full max-w-md items-stretch justify-around px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
          {tabs
            .filter((t) => ["dashboard", "agendamentos", "pedidos", "pagamentos"].includes(t.id))
            .map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`group flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 transition-all ${
                    active ? "tab-active text-gold" : "text-primary-foreground/45 hover:text-primary-foreground/70"
                  }`}
                >
                  <t.icon
                    className={`h-5 w-5 tab-icon ${t.anim} ${active ? "scale-110" : ""}`}
                    style={{ color: active ? undefined : t.color }}
                  />
                  <span className="font-body text-[10px] font-medium leading-none">{t.label}</span>
                </button>
              );
            })}
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
      if (data) {
        setHours(data.map(d => ({ 
          id: d.id, 
          day: d.dia_semana, 
          open: d.aberto, 
          start: d.hora_inicio?.slice(0, 5) || "00:00", 
          end: d.hora_fim?.slice(0, 5) || "00:00" 
        })));
      }
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
    let hasError = false;
    for (const h of hours) {
      const start = h.start || "00:00";
      const end = h.end || "00:00";
      const { error } = await supabase
        .from("horarios_funcionamento")
        .update({ 
          aberto: h.open, 
          hora_inicio: start, 
          hora_fim: end, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", h.id);
        
      if (error) {
        console.error("Erro ao salvar horário", h, error);
        hasError = true;
      }
    }
    setSaving(false);
    if (hasError) {
      toast.error("Erro ao salvar horários. Verifique se os dados estão corretos.");
    } else {
      setSaved(true); 
      setTimeout(() => setSaved(false), 2000);
      toast.success("Horários salvos com sucesso!");
    }
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
type ServicosTableName = "servicos" | "servicos_app";

interface ServicosTabProps {
  tableName?: ServicosTableName;
  storageKey?: string;
  scopeLabel?: string;
  scopeHint?: string;
}

const ServicosTab = ({
  tableName = "servicos",
  storageKey = "admin_custom_categorias_servicos",
  scopeLabel = "Catálogo",
  scopeHint = "Organize seu portfólio e veja sincronizar no agendamento dos clientes",
}: ServicosTabProps = {}) => {
  const CATEGORIAS_STORAGE_KEY = storageKey;
  const [services, setServices] = useState<{ id: string; name: string; price: number; category: string; active: boolean; duration: number; descricao: string }[]>([]);
  const [extraCategorias, setExtraCategorias] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(CATEGORIAS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newDuration, setNewDuration] = useState("60");
  const [newDescricao, setNewDescricao] = useState("");

  // Categorias state
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [renomeandoCat, setRenomeandoCat] = useState<string | null>(null);
  const [renomeCatValor, setRenomeCatValor] = useState("");
  const [ordemCategorias, setOrdemCategorias] = useState<string[]>([]);

  // Persistência das categorias "vazias" (ainda sem serviços)
  const persistExtras = (lista: string[]) => {
    setExtraCategorias(lista);
    try { localStorage.setItem(CATEGORIAS_STORAGE_KEY, JSON.stringify(lista)); } catch { /* ignore */ }
  };

  // Carrega ordem das categorias do banco
  const reloadOrdemCategorias = useCallback(async () => {
    const { data } = await supabase
      .from("categorias_ordem")
      .select("nome, ordem")
      .eq("scope", tableName)
      .order("ordem");
    if (data) setOrdemCategorias(data.map((r: any) => r.nome));
  }, [tableName]);

  useEffect(() => { reloadOrdemCategorias(); }, [reloadOrdemCategorias]);

  // Persiste nova ordem (substitui todas as linhas do scope)
  const salvarOrdemCategorias = async (nova: string[]) => {
    setOrdemCategorias(nova);
    await supabase.from("categorias_ordem").delete().eq("scope", tableName);
    if (nova.length > 0) {
      const rows = nova.map((nome, idx) => ({ scope: tableName, nome, ordem: idx }));
      await supabase.from("categorias_ordem").insert(rows);
    }
  };

  const moverCategoria = (cat: string, dir: -1 | 1) => {
    const lista = [...categorias];
    const i = lista.indexOf(cat);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    salvarOrdemCategorias(lista);
  };


  const reloadServicos = useCallback(async () => {
    const { data } = await supabase.from(tableName).select("*").order("ordem");
    if (data) setServices(data.map((s: any) => ({ id: s.id, name: s.nome, price: Number(s.preco), category: s.categoria, active: s.ativo, duration: s.duracao_minutos || 60, descricao: s.descricao || "" })));
    setLoading(false);
  }, [tableName]);

  useEffect(() => {
    reloadServicos();
  }, [reloadServicos]);

  // ─── Realtime: sincroniza entre múltiplos admins/abas ───
  const reloadDebounceRef = useRef<number | null>(null);
  useEffect(() => {
    const channel = supabase
      .channel(`${tableName}-realtime-admin`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: tableName },
        () => {
          if (reloadDebounceRef.current) window.clearTimeout(reloadDebounceRef.current);
          reloadDebounceRef.current = window.setTimeout(() => reloadServicos(), 250);
        }
      )
      .subscribe();
    return () => {
      if (reloadDebounceRef.current) window.clearTimeout(reloadDebounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [reloadServicos, tableName]);

  // Lista única de categorias (combina as usadas pelos serviços + extras criadas vazias)
  // Ordenadas conforme `ordemCategorias` (do banco); novas categorias vão pro fim em ordem alfabética.
  const categorias = useMemo(() => {
    const set = new Set<string>();
    services.forEach(s => { if (s.category) set.add(s.category); });
    extraCategorias.forEach(c => set.add(c));
    const todas = Array.from(set);
    const ordenadas = ordemCategorias.filter(c => set.has(c));
    const restantes = todas.filter(c => !ordenadas.includes(c)).sort((a, b) => a.localeCompare(b, "pt-BR"));
    return [...ordenadas, ...restantes];
  }, [services, extraCategorias, ordemCategorias]);

  const contarServicos = (cat: string) => services.filter(s => s.category === cat).length;
  const contarAtivos = (cat: string) => services.filter(s => s.category === cat && s.active).length;
  // Categoria está "ativa" se tem ao menos 1 serviço ativo OU se está vazia (recém-criada)
  const categoriaAtiva = (cat: string) => {
    const total = contarServicos(cat);
    if (total === 0) return true;
    return contarAtivos(cat) > 0;
  };

  const adicionarCategoria = () => {
    const nome = novaCategoria.trim();
    if (!nome) return;
    if (categorias.some(c => c.toLowerCase() === nome.toLowerCase())) {
      toast.error("Essa categoria já existe");
      return;
    }
    persistExtras([...extraCategorias, nome]);
    setNovaCategoria("");
    setShowNewCatInput(false);
    toast.success("Categoria criada");
  };

  // Desativa todos os serviços da categoria — mantém histórico, oculta dos clientes
  const desativarCategoria = async (cat: string) => {
    const ids = services.filter(s => s.category === cat && s.active).map(s => s.id);
    if (ids.length === 0) return;
    const { error } = await supabase
      .from(tableName)
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .in("id", ids);
    if (error) { toast.error("Erro ao desativar: " + error.message); return; }
    setServices(prev => prev.map(s => ids.includes(s.id) ? { ...s, active: false } : s));
    toast.success(`Categoria "${cat}" desativada — ${ids.length} ${ids.length === 1 ? "serviço oculto" : "serviços ocultos"} dos clientes`);
  };

  const reativarCategoria = async (cat: string) => {
    const ids = services.filter(s => s.category === cat && !s.active).map(s => s.id);
    if (ids.length === 0) return;
    const { error } = await supabase
      .from(tableName)
      .update({ ativo: true, updated_at: new Date().toISOString() })
      .in("id", ids);
    if (error) { toast.error("Erro ao reativar: " + error.message); return; }
    setServices(prev => prev.map(s => ids.includes(s.id) ? { ...s, active: true } : s));
    toast.success(`Categoria "${cat}" reativada — ${ids.length} ${ids.length === 1 ? "serviço visível" : "serviços visíveis"} para clientes`);
  };

  const removerCategoria = (cat: string) => {
    if (contarServicos(cat) > 0) {
      toast.error("Categoria com serviços não pode ser excluída. Use o botão 👁 para desativar e ocultar dos clientes mantendo o histórico.", { duration: 5000 });
      return;
    }
    persistExtras(extraCategorias.filter(c => c !== cat));
    toast.success("Categoria removida");
  };

  const iniciarRenomearCat = (cat: string) => {
    setRenomeandoCat(cat);
    setRenomeCatValor(cat);
  };

  const salvarRenomeCat = async () => {
    const novo = renomeCatValor.trim();
    const antigo = renomeandoCat;
    if (!antigo || !novo || novo === antigo) {
      setRenomeandoCat(null);
      return;
    }
    if (categorias.some(c => c.toLowerCase() === novo.toLowerCase() && c !== antigo)) {
      toast.error("Já existe categoria com esse nome");
      return;
    }
    // Atualiza serviços que usavam a categoria antiga
    const idsAfetados = services.filter(s => s.category === antigo).map(s => s.id);
    if (idsAfetados.length > 0) {
      const { error } = await supabase.from(tableName).update({ categoria: novo, updated_at: new Date().toISOString() }).in("id", idsAfetados);
      if (error) { toast.error("Erro ao renomear: " + error.message); return; }
      setServices(prev => prev.map(s => s.category === antigo ? { ...s, category: novo } : s));
    }
    // Atualiza extras (se aplicável)
    if (extraCategorias.includes(antigo)) {
      persistExtras(extraCategorias.map(c => c === antigo ? novo : c));
    }
    // Atualiza ordem persistida
    if (ordemCategorias.includes(antigo)) {
      const nova = ordemCategorias.map(c => c === antigo ? novo : c);
      await salvarOrdemCategorias(nova);
    }
    setRenomeandoCat(null);
    toast.success("Categoria renomeada");
  };

  const startEdit = (s: typeof services[0]) => {
    setEditing(s.id);
    setEditName(s.name);
    setEditPrice(s.price.toString());
    setEditDuration(s.duration.toString());
    setEditCategory(s.category || "");
    setEditDescricao(s.descricao || "");
  };
  const saveEdit = async (id: string) => {
    const finalCategoria = editCategory.trim() || "Outros";
    await supabase.from(tableName).update({ nome: editName, preco: Number(editPrice), duracao_minutos: Number(editDuration), categoria: finalCategoria, descricao: editDescricao, updated_at: new Date().toISOString() }).eq("id", id);
    setServices(prev => prev.map(s => s.id === id ? { ...s, name: editName, price: Number(editPrice), duration: Number(editDuration), category: finalCategoria, descricao: editDescricao } : s));
    setEditing(null);
  };
  const addService = async () => {
    if (!newName || !newPrice) { toast.error("Preencha nome e preço"); return; }
    const finalCategoria = (newCategory || "").trim() || "Outros";
    const { data, error } = await supabase.from(tableName).insert({ nome: newName, preco: Number(newPrice), categoria: finalCategoria, ativo: true, ordem: services.length + 1, duracao_minutos: Number(newDuration) || 60, descricao: newDescricao }).select().single();
    if (error) { toast.error("Erro: " + error.message); return; }
    if (data) {
      setServices(prev => [...prev, { id: data.id, name: data.nome, price: Number(data.preco), category: data.categoria, active: data.ativo, duration: data.duracao_minutos || 60, descricao: (data as any).descricao || "" }]);
      // Se a categoria estava na lista de "extras", remove (agora ela tem serviço)
      if (extraCategorias.includes(finalCategoria)) {
        persistExtras(extraCategorias.filter(c => c !== finalCategoria));
      }
      toast.success("Serviço criado");
    }
    setNewName(""); setNewPrice(""); setNewCategory(""); setNewDuration("60"); setNewDescricao(""); setShowAdd(false);
  };
  const toggleActive = async (id: string) => {
    const s = services.find(s => s.id === id);
    if (!s) return;
    await supabase.from(tableName).update({ ativo: !s.active, updated_at: new Date().toISOString() }).eq("id", id);
    setServices(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };
  const removeService = async (id: string) => {
    await supabase.from(tableName).delete().eq("id", id);
    setServices(prev => prev.filter(s => s.id !== id));
  };

  // Move um serviço para cima/baixo dentro da MESMA categoria.
  // Troca o valor de `ordem` com o vizinho — reflete no app e no WhatsApp.
  const moverServico = async (id: string, dir: -1 | 1) => {
    const atual = services.find(s => s.id === id);
    if (!atual) return;
    // Lista da mesma categoria, ordenada como no banco (por `ordem`, depois nome para estabilidade)
    const mesmaCat = services
      .filter(s => (s.category || "Outros") === (atual.category || "Outros"))
      .slice()
      .sort((a, b) => {
        const oa = (services.indexOf(a));
        const ob = (services.indexOf(b));
        return oa - ob;
      });
    const i = mesmaCat.findIndex(s => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= mesmaCat.length) return;
    const a = mesmaCat[i];
    const b = mesmaCat[j];

    // Busca os valores reais de ordem do banco
    const { data: rows } = await supabase
      .from(tableName)
      .select("id, ordem")
      .in("id", [a.id, b.id]);
    if (!rows || rows.length < 2) return;
    const ordemA = rows.find((r: any) => r.id === a.id)?.ordem ?? 0;
    const ordemB = rows.find((r: any) => r.id === b.id)?.ordem ?? 0;
    // Se forem iguais, força um delta para manter a inversão estável
    const novoA = ordemA === ordemB ? ordemB + (dir === -1 ? -1 : 1) : ordemB;
    const novoB = ordemA === ordemB ? ordemA : ordemA;

    await Promise.all([
      supabase.from(tableName).update({ ordem: novoA, updated_at: new Date().toISOString() }).eq("id", a.id),
      supabase.from(tableName).update({ ordem: novoB, updated_at: new Date().toISOString() }).eq("id", b.id),
    ]);
    await reloadServicos();
  };


  // Filtro / busca (hooks devem ficar antes de qualquer early return)
  const [filtroCat, setFiltroCat] = useState<string>("todas");
  const [busca, setBusca] = useState("");

  const servicosFiltrados = useMemo(() => {
    const catIndex = new Map<string, number>();
    categorias.forEach((c, i) => catIndex.set(c, i));
    return services
      .filter(s => {
        if (filtroCat !== "todas" && s.category !== filtroCat) return false;
        if (busca && !s.name.toLowerCase().includes(busca.toLowerCase())) return false;
        return true;
      })
      .slice()
      .sort((a, b) => {
        const ca = catIndex.get(a.category) ?? 999;
        const cb = catIndex.get(b.category) ?? 999;
        if (ca !== cb) return ca - cb;
        return services.indexOf(a) - services.indexOf(b);
      });
  }, [services, filtroCat, busca, categorias]);

  // Stats agregadas
  const stats = useMemo(() => {
    const ativos = services.filter(s => s.active);
    const ticketMedio = ativos.length ? ativos.reduce((acc, s) => acc + s.price, 0) / ativos.length : 0;
    return {
      total: services.length,
      ativos: ativos.length,
      categorias: categorias.length,
      ticketMedio,
    };
  }, [services, categorias]);

  if (loading) return <p className="font-body text-[13px] text-primary-foreground/30 text-center py-8">Carregando...</p>;

  // Componente reutilizável: select de categoria com opção "+ Nova"
  const CategoriaSelect = ({ value, onChange, idPrefix }: { value: string; onChange: (v: string) => void; idPrefix: string }) => {
    const [criandoInline, setCriandoInline] = useState(false);
    const [valorInline, setValorInline] = useState("");
    if (criandoInline) {
      return (
        <div className="flex gap-1.5 min-w-0">
          <input
            autoFocus
            value={valorInline}
            onChange={e => setValorInline(e.target.value)}
            placeholder="Nova categoria"
            className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-gold/30 text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20"
          />
          <button
            type="button"
            onClick={() => {
              const v = valorInline.trim();
              if (v) {
                if (!categorias.some(c => c.toLowerCase() === v.toLowerCase())) {
                  persistExtras([...extraCategorias, v]);
                }
                onChange(v);
              }
              setCriandoInline(false);
              setValorInline("");
            }}
            className="px-3 py-2.5 rounded-xl bg-gold/10 text-gold font-body text-[12px] hover:bg-gold/20"
          >OK</button>
          <button
            type="button"
            onClick={() => { setCriandoInline(false); setValorInline(""); }}
            className="px-2.5 py-2.5 rounded-xl bg-primary-foreground/[0.05] text-primary-foreground/40 hover:text-primary-foreground/60"
          ><X className="w-3.5 h-3.5" /></button>
        </div>
      );
    }
    return (
      <select
        id={idPrefix}
        value={value}
        onChange={e => {
          if (e.target.value === "__new__") { setCriandoInline(true); return; }
          onChange(e.target.value);
        }}
        className="w-full min-w-0 px-3 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20 [&>option]:bg-charcoal [&>option]:text-primary-foreground"
      >
        <option value="">Selecione a categoria</option>
        {categorias.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
        <option value="__new__">+ Nova categoria…</option>
      </select>
    );
  };


  // Cor sutil por categoria (determinístico via hash) — só tokens do design system
  const corCategoria = (cat: string) => {
    const palette = [
      "from-gold/15 to-gold/5 border-gold/20 text-gold",
      "from-rose/15 to-rose/5 border-rose/20 text-rose",
      "from-gold/10 to-rose/5 border-gold/15 text-gold/90",
      "from-rose/10 to-gold/5 border-rose/15 text-rose/90",
      "from-primary-foreground/10 to-gold/5 border-primary-foreground/15 text-primary-foreground/80",
      "from-primary-foreground/10 to-rose/5 border-primary-foreground/15 text-primary-foreground/80",
    ];
    let hash = 0;
    for (let i = 0; i < cat.length; i++) hash = (hash * 31 + cat.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length];
  };

  return (
    <div className="space-y-6 animate-fade-in overflow-x-hidden">
      {/* ─── Hero Header com gradiente ─── */}
      <div className="relative overflow-hidden rounded-3xl border border-gold/15 bg-gradient-to-br from-gold/[0.08] via-primary-foreground/[0.02] to-transparent p-5">
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-gold/15 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-gold" />
              </div>
              <span className="font-body text-[10px] tracking-[0.18em] uppercase text-gold/80">{scopeLabel}</span>
            </div>
            <h1 className="font-heading text-2xl font-semibold text-primary-foreground leading-tight">Serviços & Categorias</h1>
            <p className="font-body text-[12px] text-primary-foreground/40 mt-1">{scopeHint}</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
          <div className="rounded-2xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.06] p-3">
            <div className="flex items-center gap-1.5 text-primary-foreground/50 mb-1">
              <Sparkles className="w-3 h-3" />
              <span className="font-body text-[9px] uppercase tracking-wider">Total</span>
            </div>
            <p className="font-heading text-xl font-semibold text-primary-foreground">{stats.total}</p>
          </div>
          <div className="rounded-2xl bg-gold/[0.06] border border-gold/15 p-3">
            <div className="flex items-center gap-1.5 text-gold/80 mb-1">
              <Power className="w-3 h-3" />
              <span className="font-body text-[9px] uppercase tracking-wider">Ativos</span>
            </div>
            <p className="font-heading text-xl font-semibold text-gold">{stats.ativos}</p>
          </div>
          <div className="rounded-2xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.06] p-3">
            <div className="flex items-center gap-1.5 text-primary-foreground/50 mb-1">
              <Folder className="w-3 h-3" />
              <span className="font-body text-[9px] uppercase tracking-wider">Categorias</span>
            </div>
            <p className="font-heading text-xl font-semibold text-primary-foreground">{stats.categorias}</p>
          </div>
          <div className="rounded-2xl bg-gold/[0.06] border border-gold/15 p-3">
            <div className="flex items-center gap-1.5 text-gold/80 mb-1">
              <TrendingUp className="w-3 h-3" />
              <span className="font-body text-[9px] uppercase tracking-wider">Ticket médio</span>
            </div>
            <p className="font-heading text-xl font-semibold text-gold">R$ {stats.ticketMedio.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* ─── Categorias ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-gold/70" />
            <h2 className="font-heading text-base font-semibold text-primary-foreground">Categorias</h2>
            <span className="font-body text-[10px] text-primary-foreground/30">({categorias.length})</span>
          </div>
          <PlusButton size={28} title="Nova categoria" onClick={() => setShowNewCatInput(!showNewCatInput)} />
        </div>

        {showNewCatInput && (
          <div className="flex gap-2 min-w-0 animate-fade-in">
            <input
              autoFocus
              value={novaCategoria}
              onChange={e => setNovaCategoria(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") adicionarCategoria(); }}
              placeholder="Nome da categoria (ex: Sobrancelhas)"
              className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-gold/30 text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20"
            />
            <button onClick={adicionarCategoria} className="px-3 py-2.5 rounded-xl bg-gold/10 text-gold font-body text-[12px] hover:bg-gold/20 active:scale-95 transition-all">Criar</button>
            <button onClick={() => { setShowNewCatInput(false); setNovaCategoria(""); }} className="px-2.5 py-2.5 rounded-xl bg-primary-foreground/[0.05] text-primary-foreground/40 hover:text-primary-foreground/60"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {categorias.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-primary-foreground/[0.08] p-6 text-center">
            <Folder className="w-6 h-6 text-primary-foreground/20 mx-auto mb-2" />
            <p className="font-body text-[12px] text-primary-foreground/40">Nenhuma categoria ainda. Crie a primeira!</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categorias.map((cat, idx) => {
              const count = contarServicos(cat);
              const ativos = contarAtivos(cat);
              const ativa = categoriaAtiva(cat);
              const editandoEsta = renomeandoCat === cat;
              const cor = corCategoria(cat);
              const podeExcluir = count === 0;
              return (
                <div
                  key={cat}
                  className={`group flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gradient-to-br border transition-all hover:scale-[1.02] ${
                    ativa ? cor : "from-primary-foreground/[0.02] to-transparent border-primary-foreground/[0.05] text-primary-foreground/40 opacity-60"
                  }`}
                  title={ativa ? "Categoria visível para clientes" : "Categoria oculta — todos os serviços estão desativados"}
                >
                  {editandoEsta ? (
                    <>
                      <input
                        autoFocus
                        value={renomeCatValor}
                        onChange={e => setRenomeCatValor(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") salvarRenomeCat(); if (e.key === "Escape") setRenomeandoCat(null); }}
                        className="bg-transparent border-b border-gold/30 text-primary-foreground font-body text-[12px] focus:outline-none w-28"
                      />
                      <button onClick={salvarRenomeCat} className="text-gold p-0.5"><Save className="w-3 h-3" /></button>
                      <button onClick={() => setRenomeandoCat(null)} className="text-primary-foreground/40 p-0.5"><X className="w-3 h-3" /></button>
                    </>
                  ) : (
                    <>
                      {ativa ? (
                        <Folder className="w-3 h-3 opacity-70" />
                      ) : (
                        <EyeOff className="w-3 h-3 opacity-70" />
                      )}
                      <span className={`font-body text-[12px] font-medium ${ativa ? "text-primary-foreground" : "text-primary-foreground/50 line-through decoration-primary-foreground/20"}`}>
                        {cat}
                      </span>
                      <span className="font-body text-[10px] opacity-60 ml-0.5">
                        {count > 0 ? `${ativos}/${count}` : "0"}
                      </span>
                      <div className="flex items-center gap-0.5 ml-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moverCategoria(cat, -1)}
                          disabled={idx === 0}
                          className="p-1 rounded-md hover:bg-gold/15 text-primary-foreground/50 hover:text-gold transition-colors disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                          title="Mover para cima (afeta a ordem no WhatsApp e no app)"
                        ><ChevronUp className="w-3 h-3" /></button>
                        <button
                          onClick={() => moverCategoria(cat, 1)}
                          disabled={idx === categorias.length - 1}
                          className="p-1 rounded-md hover:bg-gold/15 text-primary-foreground/50 hover:text-gold transition-colors disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                          title="Mover para baixo"
                        ><ChevronDown className="w-3 h-3" /></button>
                        {count > 0 && (
                          ativa ? (
                            <button
                              onClick={() => desativarCategoria(cat)}
                              className="p-1 rounded-md hover:bg-rose/10 text-primary-foreground/50 hover:text-rose transition-colors"
                              title="Desativar — oculta dos clientes mantendo o histórico"
                            ><EyeOff className="w-3 h-3" /></button>
                          ) : (
                            <button
                              onClick={() => reativarCategoria(cat)}
                              className="p-1 rounded-md hover:bg-gold/15 text-primary-foreground/50 hover:text-gold transition-colors"
                              title="Reativar — torna visível para clientes novamente"
                            ><Eye className="w-3 h-3" /></button>
                          )
                        )}
                        <button onClick={() => iniciarRenomearCat(cat)} className="p-1 rounded-md hover:bg-primary-foreground/[0.08] text-primary-foreground/50 hover:text-primary-foreground transition-colors" title="Renomear"><Edit2 className="w-3 h-3" /></button>
                        {podeExcluir && (
                          <BinButton size="sm" onClick={() => removerCategoria(cat)} label="Excluir categoria vazia" />
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="font-body text-[10px] text-primary-foreground/30 px-1">
          👁 desativa toda a categoria para os clientes (mantém histórico). Excluir só é permitido em categorias vazias.
        </p>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-primary-foreground/[0.08] to-transparent" />

      {/* ─── Serviços header + busca ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold/70" />
            <h2 className="font-heading text-base font-semibold text-primary-foreground">Serviços</h2>
            <span className="font-body text-[10px] text-primary-foreground/30">({servicosFiltrados.length}/{services.length})</span>
          </div>
          <PlusButton size={28} title="Adicionar serviço" onClick={() => setShowAdd(!showAdd)} />
        </div>

        {/* Busca + Filtro */}
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary-foreground/30" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar serviço…"
              className="w-full min-w-0 pl-9 pr-3 py-2.5 rounded-xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[12px] placeholder:text-primary-foreground/25 focus:outline-none focus:ring-2 focus:ring-gold/20"
            />
          </div>
          {categorias.length > 0 && (
            <select
              value={filtroCat}
              onChange={e => setFiltroCat(e.target.value)}
              className="shrink-0 px-3 py-2.5 rounded-xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[12px] focus:outline-none focus:ring-2 focus:ring-gold/20 [&>option]:bg-charcoal [&>option]:text-primary-foreground"
            >
              <option value="todas">Todas categorias</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:max-w-md max-h-[85dvh] overflow-y-auto overflow-x-hidden bg-charcoal border border-gold/20 rounded-2xl p-4 sm:p-5">
          <DialogHeader>
            <DialogTitle className="font-body text-[14px] font-medium text-primary-foreground flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-gold" />
              </div>
              Novo Serviço
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 w-full min-w-0 overflow-x-hidden">
            <div>
              <label className="font-body text-[10px] text-primary-foreground/30 mb-1 block">Nome</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Micropigmentação Fio a Fio" className="w-full min-w-0 px-3 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20" />
            </div>
            <div>
              <label className="font-body text-[10px] text-primary-foreground/30 mb-1 block">Categoria</label>
              <CategoriaSelect value={newCategory} onChange={setNewCategory} idPrefix="new-cat" />
            </div>
            <div className="grid grid-cols-2 gap-2 min-w-0">
              <div>
                <label className="font-body text-[10px] text-primary-foreground/30 mb-1 block">Preço (R$)</label>
                <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="0,00" type="number" className="w-full min-w-0 px-3 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20" />
              </div>
              <div>
                <label className="font-body text-[10px] text-primary-foreground/30 mb-1 block">Duração (min)</label>
                <input value={newDuration} onChange={e => setNewDuration(e.target.value)} placeholder="60" type="number" className="w-full min-w-0 px-3 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20" />
              </div>
            </div>
            <div>
              <label className="font-body text-[10px] text-primary-foreground/30 mb-1 block">Descrição (opcional) — aparece para a cliente no app e WhatsApp</label>
              <textarea value={newDescricao} onChange={e => setNewDescricao(e.target.value)} placeholder="Ex: Na Micropigmentação Shadow são usados pigmentos específicos para criar um efeito suave e esfumado..." rows={4} className="w-full min-w-0 px-3 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-2 min-w-0 pt-1">
              <button onClick={addService} className="w-full min-w-0 py-2.5 rounded-xl bg-gradient-to-br from-gold/20 to-gold/10 text-gold font-body text-[12px] font-medium hover:from-gold/25 hover:to-gold/15 active:scale-95 transition-all">Salvar serviço</button>
              <button onClick={() => setShowAdd(false)} className="w-full min-w-0 py-2.5 rounded-xl bg-primary-foreground/[0.05] text-primary-foreground/40 font-body text-[12px] hover:text-primary-foreground/60 transition-all">Cancelar</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Lista de serviços ─── */}
      {servicosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-primary-foreground/[0.08] p-10 text-center">
          <Sparkles className="w-8 h-8 text-primary-foreground/20 mx-auto mb-3" />
          <p className="font-body text-[13px] text-primary-foreground/50 mb-1">
            {services.length === 0 ? "Nenhum serviço cadastrado" : "Nenhum serviço encontrado"}
          </p>
          <p className="font-body text-[11px] text-primary-foreground/30">
            {services.length === 0 ? "Clique em \"Adicionar\" para criar o primeiro" : "Tente ajustar a busca ou filtro"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {servicosFiltrados.map(s => {
            const cor = corCategoria(s.category || "Outros");
            const mesmaCat = services.filter(x => (x.category || "Outros") === (s.category || "Outros"));
            const idxCat = mesmaCat.findIndex(x => x.id === s.id);
            const isFirstInCat = idxCat === 0;
            const isLastInCat = idxCat === mesmaCat.length - 1;
            return (
              <div key={s.id} className={`group relative p-4 rounded-2xl border transition-all overflow-x-hidden ${s.active ? "bg-gradient-to-br from-primary-foreground/[0.04] to-primary-foreground/[0.02] border-primary-foreground/[0.08] hover:border-gold/20 hover:shadow-lg hover:shadow-gold/5" : "bg-primary-foreground/[0.01] border-primary-foreground/[0.03] opacity-50"}`}>
                {/* Faixa lateral colorida pela categoria */}
                {s.active && (
                  <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b ${cor.split(" ").filter(c => c.startsWith("from-") || c.startsWith("to-")).join(" ")}`} />
                )}
                {editing === s.id ? (
                  <div className="space-y-2 min-w-0">
                    <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full min-w-0 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
                    <CategoriaSelect value={editCategory} onChange={setEditCategory} idPrefix={`edit-cat-${s.id}`} />
                    <div className="grid grid-cols-[1fr_96px] gap-2 min-w-0">
                      <input value={editPrice} onChange={e => setEditPrice(e.target.value)} type="number" placeholder="Preço" className="w-full min-w-0 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
                      <input value={editDuration} onChange={e => setEditDuration(e.target.value)} type="number" placeholder="Min" className="w-full min-w-0 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
                    </div>
                    <textarea value={editDescricao} onChange={e => setEditDescricao(e.target.value)} placeholder="Descrição (opcional) — aparece no app e WhatsApp" rows={3} className="w-full min-w-0 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20 resize-none" />
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <button onClick={() => saveEdit(s.id)} className="min-w-0 px-3 py-2 rounded-xl bg-gradient-to-br from-gold/20 to-gold/10 text-gold hover:from-gold/25 hover:to-gold/15 active:scale-95 transition-all font-body text-[12px]"><Save className="w-4 h-4 inline mr-1" />Salvar</button>
                      <button onClick={() => setEditing(null)} className="px-3 py-2 rounded-xl bg-primary-foreground/[0.05] text-primary-foreground/30 hover:text-primary-foreground/50 transition-all"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ) : (
                  <div className="pl-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-[14px] font-medium text-primary-foreground truncate">{s.name}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-body font-medium bg-gradient-to-r border ${cor}`}>
                            <Folder className="w-2.5 h-2.5" />
                            {s.category || "Outros"}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-body text-primary-foreground/50 bg-primary-foreground/[0.04] border border-primary-foreground/[0.06]">
                            <Clock className="w-2.5 h-2.5" />
                            {s.duration}min
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-heading text-lg font-semibold text-gold leading-none">R$ {s.price.toFixed(2).replace(".", ",")}</p>
                        <p className="font-body text-[9px] text-primary-foreground/30 mt-1 uppercase tracking-wider">{s.active ? "Ativo" : "Inativo"}</p>
                      </div>
                    </div>
                    {s.descricao && (
                      <p className="mt-2 font-body text-[12px] text-primary-foreground/55 leading-relaxed whitespace-pre-line line-clamp-3">{s.descricao}</p>
                    )}
                    <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-primary-foreground/[0.05]">
                      <button
                        onClick={() => moverServico(s.id, -1)}
                        disabled={isFirstInCat}
                        className="p-2 rounded-lg hover:bg-gold/10 text-primary-foreground/40 hover:text-gold transition-all active:scale-95 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                        title="Mover para cima na categoria (afeta app e WhatsApp)"
                      ><ChevronUp className="w-3.5 h-3.5" /></button>
                      <button
                        onClick={() => moverServico(s.id, 1)}
                        disabled={isLastInCat}
                        className="p-2 rounded-lg hover:bg-gold/10 text-primary-foreground/40 hover:text-gold transition-all active:scale-95 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                        title="Mover para baixo na categoria"
                      ><ChevronDown className="w-3.5 h-3.5" /></button>
                      <button onClick={() => toggleActive(s.id)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-body text-[11px] font-medium transition-all active:scale-95 ${s.active ? "bg-gold/10 text-gold hover:bg-gold/15" : "bg-primary-foreground/[0.05] text-primary-foreground/40 hover:bg-primary-foreground/[0.08]"}`}>
                        <div className={`w-7 h-4 rounded-full relative transition-all ${s.active ? "bg-gold/50" : "bg-primary-foreground/20"}`}>
                          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all duration-200 ${s.active ? "left-3.5" : "left-0.5"}`} />
                        </div>
                        {s.active ? "Ativo" : "Inativo"}
                      </button>
                      <button onClick={() => startEdit(s)} className="p-2 rounded-lg hover:bg-primary-foreground/[0.06] text-primary-foreground/40 hover:text-gold transition-all active:scale-95"><Edit2 className="w-3.5 h-3.5" /></button>
                      <BinButton size="sm" onClick={() => removeService(s.id)} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="font-body text-[10px] text-primary-foreground/25 text-center pt-2">
        ✨ Tudo que você criar aqui aparece automaticamente para os clientes no agendamento
      </p>
    </div>
  );
};

export default Admin;
