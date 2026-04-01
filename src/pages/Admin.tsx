import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3, Calendar, Users, Clock, Settings, LogOut, Search,
  X, Edit2, Trash2, Plus, Save, CheckCircle, Bell, MessageSquare,
  UserX, DollarSign, CreditCard
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription
} from "@/components/ui/sheet";
import FinanceiroTab from "@/components/FinanceiroTab";

// ─── Types ───
interface Agendamento {
  id: string; servico: string; variacao: string | null; data_agendamento: string;
  horario: string; valor: number; valor_pago: number | null; status: string;
  created_at: string; user_id: string;
}
interface Profile { id: string; nome: string; whatsapp: string; created_at: string; }
interface LembreteConfig { id: string; tipo: string; ativo: boolean; mensagem: string; horas_antes: number; }

type Tab = "dashboard" | "agendamentos" | "clientes" | "horarios" | "servicos";

const ADMIN_PASSWORD = "dyoliadmin";

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

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-3xl border border-primary-foreground/[0.08] bg-charcoal/70 backdrop-blur-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.6)] p-8 space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
              <Settings className="w-7 h-7 text-gold" />
            </div>
            <h1 className="font-heading text-2xl font-semibold text-primary-foreground">Painel Admin</h1>
            <p className="font-body text-[13px] text-primary-foreground/40 mt-1">Acesso restrito</p>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (password === ADMIN_PASSWORD) { setAuthenticated(true); setError(""); }
            else { setError("Senha incorreta"); }
          }} className="space-y-4">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha de acesso"
              className="w-full px-4 py-3 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[15px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20" />
            {error && <p className="font-body text-[12px] text-rose text-center">{error}</p>}
            <button type="submit" className="w-full py-3.5 rounded-2xl bg-rose text-primary-foreground font-body font-semibold text-[15px] shadow-[0_4px_20px_-4px_hsl(340_30%_50%/0.4)]">Entrar</button>
          </form>
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

  useEffect(() => { loadData(); }, []);

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
    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const deleteAgendamento = async (id: string) => {
    await supabase.from("agendamentos").delete().eq("id", id);
    setAgendamentos(prev => prev.filter(a => a.id !== id));
  };

  const tabs: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
    { id: "dashboard", label: "Início", icon: BarChart3 },
    { id: "agendamentos", label: "Agenda", icon: Calendar },
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "horarios", label: "Horários", icon: Clock },
    { id: "servicos", label: "Serviços", icon: Settings },
  ];

  const total = agendamentos.length;
  const confirmados = agendamentos.filter(a => a.status === "confirmado").length;
  const cancelados = agendamentos.filter(a => a.status === "cancelado").length;
  const concluidos = agendamentos.filter(a => a.status === "concluido").length;
  const faltas = agendamentos.filter(a => a.status === "falta").length;
  const faturamento = agendamentos.filter(a => a.status !== "cancelado" && a.status !== "falta").reduce((sum, a) => sum + (a.valor_pago || 0), 0);

  const getClientName = (userId: string) => clientes.find(c => c.id === userId)?.nome || "—";
  const formatDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const formatWhatsapp = (w: string) => w ? `(${w.slice(0,2)}) ${w.slice(2,7)}-${w.slice(7)}` : "—";

  const filteredAgendamentos = agendamentos.filter(a => {
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
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-body font-medium border ${map[s] || "bg-secondary text-muted-foreground border-border"}`}>
        {labels[s] || s}
      </span>
    );
  };

  const pagamentoBadge = (a: Agendamento) => {
    const pago = Number(a.valor_pago || 0);
    const total = Number(a.valor);
    if (pago >= total) return <span className="px-2 py-0.5 rounded-full text-[10px] font-body font-medium border bg-green-500/10 text-green-500 border-green-500/20">Pago</span>;
    if (pago > 0) return <span className="px-2 py-0.5 rounded-full text-[10px] font-body font-medium border bg-gold/10 text-gold border-gold/20">Sinal</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-body font-medium border bg-primary-foreground/5 text-primary-foreground/30 border-primary-foreground/[0.06]">Pendente</span>;
  };

  const updatePayment = async (id: string, type: "sinal" | "completo") => {
    const a = agendamentos.find(a => a.id === id);
    if (!a) return;
    const valor = Number(a.valor);
    const newPago = type === "completo" ? valor : valor * 0.5;
    await supabase.from("agendamentos").update({ valor_pago: newPago }).eq("id", id);
    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, valor_pago: newPago } : a));
  };

  return (
    <div className="min-h-screen bg-charcoal pb-20 max-w-md mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-charcoal/90 backdrop-blur-xl border-b border-primary-foreground/[0.06] px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-[16px] font-semibold text-primary-foreground">Admin</h1>
          <p className="font-body text-[10px] text-primary-foreground/30">Estúdio Dyoli Godim</p>
        </div>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-2 rounded-xl hover:bg-gold/10 text-primary-foreground/40 hover:text-gold transition-all">
                <Bell className="w-4 h-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-charcoal border-primary-foreground/[0.06] w-[340px] p-0 overflow-y-auto">
              <LembretesHub />
            </SheetContent>
          </Sheet>
          <button onClick={onLogout} className="p-2 rounded-xl hover:bg-rose/10 text-rose/60 hover:text-rose transition-all">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {/* Dashboard */}
        {tab === "dashboard" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total", value: total, color: "text-primary-foreground" },
                { label: "Confirmados", value: confirmados, color: "text-gold" },
                { label: "Concluídos", value: concluidos, color: "text-green-500" },
                { label: "Cancelados", value: cancelados, color: "text-rose" },
                { label: "Faltas", value: faltas, color: "text-orange-500" },
                { label: "Faturamento", value: `R$ ${faturamento.toFixed(2).replace(".", ",")}`, color: "text-gold" },
              ].map(s => (
                <div key={s.label} className="p-4 rounded-2xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
                  <p className="font-body text-[10px] text-primary-foreground/35 uppercase tracking-widest">{s.label}</p>
                  <p className={`font-heading text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="font-body text-[10px] text-primary-foreground/25 text-center">Total de clientes: {clientes.length}</p>
            </div>
            <div>
              <h3 className="font-body text-[11px] text-primary-foreground/40 uppercase tracking-widest mb-3">Últimos agendamentos</h3>
              <div className="space-y-2">
                {agendamentos.slice(0, 5).map(a => (
                  <div key={a.id} className="p-3 rounded-2xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-[13px] font-medium text-primary-foreground truncate">{getClientName(a.user_id)}</p>
                        <p className="font-body text-[11px] text-primary-foreground/40 truncate">{a.servico}{a.variacao ? ` — ${a.variacao}` : ""}</p>
                      </div>
                      {statusBadge(a.status)}
                    </div>
                    <p className="font-body text-[11px] text-primary-foreground/30 mt-1">{formatDate(a.data_agendamento)} · {a.horario}</p>
                  </div>
                ))}
                {agendamentos.length === 0 && <p className="font-body text-[13px] text-primary-foreground/30 text-center py-6">Nenhum agendamento ainda</p>}
              </div>
            </div>
          </div>
        )}

        {/* Agendamentos */}
        {tab === "agendamentos" && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="font-heading text-lg font-semibold text-primary-foreground">Agendamentos</h2>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/25" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar cliente ou serviço..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[{ value: "todos", label: "Todos" }, { value: "confirmado", label: "Confirmados" }, { value: "concluido", label: "Concluídos" }, { value: "cancelado", label: "Cancelados" }, { value: "falta", label: "Faltas" }].map(f => (
                  <button key={f.value} onClick={() => setStatusFilter(f.value)}
                    className={`px-3 py-1.5 rounded-full font-body text-[11px] font-medium whitespace-nowrap border transition-all ${statusFilter === f.value ? "bg-gold/10 text-gold border-gold/20" : "bg-primary-foreground/[0.03] text-primary-foreground/40 border-primary-foreground/[0.06]"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {filteredAgendamentos.map(a => (
                <div key={a.id} className="p-4 rounded-2xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-[14px] font-medium text-primary-foreground truncate">{getClientName(a.user_id)}</p>
                      <p className="font-body text-[12px] text-primary-foreground/40 truncate">{a.servico}{a.variacao ? ` (${a.variacao})` : ""}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {statusBadge(a.status)}
                      {pagamentoBadge(a)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-body text-[11px] text-primary-foreground/30">{formatDate(a.data_agendamento)} · {a.horario}</p>
                    <p className="font-body text-[12px] text-gold font-semibold">R$ {Number(a.valor).toFixed(2).replace(".", ",")}</p>
                    {Number(a.valor_pago || 0) > 0 && Number(a.valor_pago || 0) < Number(a.valor) && (
                      <p className="font-body text-[10px] text-primary-foreground/30">Pago: R$ {Number(a.valor_pago).toFixed(2).replace(".", ",")}</p>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center justify-between border-t border-primary-foreground/[0.04] pt-2 mt-1">
                    {/* Payment buttons */}
                    <div className="flex items-center gap-1">
                      {a.status !== "cancelado" && a.status !== "falta" && (
                        <>
                          <button onClick={() => updatePayment(a.id, "sinal")} title="Marcar sinal (50%)"
                            className={`px-2 py-1 rounded-lg font-body text-[10px] font-medium transition-all ${Number(a.valor_pago || 0) > 0 && Number(a.valor_pago || 0) < Number(a.valor) ? "bg-gold/10 text-gold" : "bg-primary-foreground/[0.03] text-primary-foreground/30 hover:text-gold hover:bg-gold/10"}`}>
                            Sinal
                          </button>
                          <button onClick={() => updatePayment(a.id, "completo")} title="Marcar pago completo"
                            className={`px-2 py-1 rounded-lg font-body text-[10px] font-medium transition-all ${Number(a.valor_pago || 0) >= Number(a.valor) ? "bg-green-500/10 text-green-500" : "bg-primary-foreground/[0.03] text-primary-foreground/30 hover:text-green-500 hover:bg-green-500/10"}`}>
                            Pago
                          </button>
                        </>
                      )}
                    </div>
                    {/* Status buttons */}
                    <div className="flex items-center gap-1">
                      {a.status === "confirmado" && (
                        <>
                          <button onClick={() => updateStatus(a.id, "concluido")} className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-500/50 hover:text-green-500 transition-all" title="Concluir">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => updateStatus(a.id, "falta")} className="p-1.5 rounded-lg hover:bg-orange-500/10 text-orange-500/50 hover:text-orange-500 transition-all" title="Marcar falta">
                            <UserX className="w-4 h-4" />
                          </button>
                          <button onClick={() => updateStatus(a.id, "cancelado")} className="p-1.5 rounded-lg hover:bg-rose/10 text-rose/50 hover:text-rose transition-all" title="Cancelar">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button onClick={() => deleteAgendamento(a.id)} className="p-1.5 rounded-lg hover:bg-rose/10 text-primary-foreground/20 hover:text-rose transition-all" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredAgendamentos.length === 0 && <p className="font-body text-[13px] text-primary-foreground/30 text-center py-6">Nenhum agendamento encontrado</p>}
            </div>
          </div>
        )}

        {/* Clientes */}
        {tab === "clientes" && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="font-heading text-lg font-semibold text-primary-foreground">Clientes</h2>
            <div className="space-y-2">
              {clientes.map(c => {
                const count = agendamentos.filter(a => a.user_id === c.id).length;
                return (
                  <div key={c.id} className="p-4 rounded-2xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-[14px] font-medium text-primary-foreground truncate">{c.nome}</p>
                        <p className="font-body text-[12px] text-primary-foreground/40">{formatWhatsapp(c.whatsapp)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-body text-[14px] font-semibold text-gold">{count}</p>
                        <p className="font-body text-[10px] text-primary-foreground/30">agendamentos</p>
                      </div>
                    </div>
                    <p className="font-body text-[10px] text-primary-foreground/25 mt-1">Cadastro: {new Date(c.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                );
              })}
              {clientes.length === 0 && <p className="font-body text-[13px] text-primary-foreground/30 text-center py-6">Nenhum cliente cadastrado</p>}
            </div>
          </div>
        )}

        {tab === "horarios" && <HorariosTab />}
        {tab === "servicos" && <ServicosTab />}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-charcoal/95 backdrop-blur-xl border-t border-primary-foreground/[0.06]">
        <div className="max-w-md mx-auto flex">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all ${tab === t.id ? "text-gold" : "text-primary-foreground/30"}`}>
              <t.icon className="w-5 h-5" />
              <span className="font-body text-[9px] font-medium">{t.label}</span>
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

  useEffect(() => {
    supabase.from("horarios_funcionamento").select("*").order("dia_semana").then(({ data }) => {
      if (data) setHours(data.map(d => ({ id: d.id, day: d.dia_semana, open: d.aberto, start: d.hora_inicio, end: d.hora_fim })));
      setLoading(false);
    });
  }, []);

  const toggle = (day: number) => setHours(prev => prev.map(h => h.day === day ? { ...h, open: !h.open } : h));
  const updateTime = (day: number, field: "start" | "end", val: string) => setHours(prev => prev.map(h => h.day === day ? { ...h, [field]: val } : h));

  const handleSave = async () => {
    setSaving(true);
    for (const h of hours) {
      await supabase.from("horarios_funcionamento").update({ aberto: h.open, hora_inicio: h.start, hora_fim: h.end, updated_at: new Date().toISOString() }).eq("id", h.id);
    }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

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
      <div className="space-y-2">
        {hours.map(h => (
          <div key={h.day} className="p-3 rounded-2xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-body text-[13px] text-primary-foreground">{dayNames[h.day]}</span>
              <button onClick={() => toggle(h.day)} className={`w-10 h-6 rounded-full relative transition-all duration-200 ${h.open ? "bg-gold" : "bg-primary-foreground/10"}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${h.open ? "left-4" : "left-0.5"}`} />
              </button>
            </div>
            {h.open ? (
              <div className="flex items-center gap-2">
                <input type="time" value={h.start} onChange={e => updateTime(h.day, "start", e.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
                <span className="text-primary-foreground/30 text-[12px]">até</span>
                <input type="time" value={h.end} onChange={e => updateTime(h.day, "end", e.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
              </div>
            ) : <p className="font-body text-[12px] text-primary-foreground/25">Fechado</p>}
          </div>
        ))}
      </div>
      <div className="p-3 rounded-2xl bg-gold/5 border border-gold/10">
        <p className="font-body text-[11px] text-gold/70 leading-relaxed">⚠ Alterações nos horários afetam apenas novos agendamentos.</p>
      </div>
    </div>
  );
};

// ─── Serviços Tab ───
const ServicosTab = () => {
  const [services, setServices] = useState<{ id: string; name: string; price: number; category: string; active: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    supabase.from("servicos").select("*").order("ordem").then(({ data }) => {
      if (data) setServices(data.map(s => ({ id: s.id, name: s.nome, price: Number(s.preco), category: s.categoria, active: s.ativo })));
      setLoading(false);
    });
  }, []);

  const startEdit = (s: typeof services[0]) => { setEditing(s.id); setEditName(s.name); setEditPrice(s.price.toString()); };
  const saveEdit = async (id: string) => {
    await supabase.from("servicos").update({ nome: editName, preco: Number(editPrice), updated_at: new Date().toISOString() }).eq("id", id);
    setServices(prev => prev.map(s => s.id === id ? { ...s, name: editName, price: Number(editPrice) } : s));
    setEditing(null);
  };
  const addService = async () => {
    if (!newName || !newPrice) return;
    const { data } = await supabase.from("servicos").insert({ nome: newName, preco: Number(newPrice), categoria: newCategory || "Outros", ativo: true, ordem: services.length + 1 }).select().single();
    if (data) setServices(prev => [...prev, { id: data.id, name: data.nome, price: Number(data.preco), category: data.categoria, active: data.ativo }]);
    setNewName(""); setNewPrice(""); setNewCategory(""); setShowAdd(false);
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
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-primary-foreground">Serviços</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gold/10 text-gold font-body text-[12px] font-medium hover:bg-gold/20 transition-all">
          <Plus className="w-3.5 h-3.5" />Adicionar
        </button>
      </div>
      {showAdd && (
        <div className="p-4 rounded-2xl bg-primary-foreground/[0.03] border border-gold/20 space-y-3 animate-fade-in">
          <h3 className="font-body text-[13px] font-medium text-primary-foreground">Novo Serviço</h3>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do serviço" className="w-full px-3 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20" />
          <div className="flex gap-2">
            <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Preço" type="number" className="flex-1 px-3 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20" />
            <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Categoria" className="flex-1 px-3 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20" />
          </div>
          <div className="flex gap-2">
            <button onClick={addService} className="flex-1 py-2.5 rounded-xl bg-gold/10 text-gold font-body text-[12px] font-medium hover:bg-gold/20 transition-all">Salvar</button>
            <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl bg-primary-foreground/[0.05] text-primary-foreground/40 font-body text-[12px] hover:text-primary-foreground/60 transition-all">Cancelar</button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {services.map(s => (
          <div key={s.id} className={`p-4 rounded-2xl border transition-all ${s.active ? "bg-primary-foreground/[0.03] border-primary-foreground/[0.06]" : "bg-primary-foreground/[0.01] border-primary-foreground/[0.03] opacity-50"}`}>
            {editing === s.id ? (
              <div className="space-y-2">
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
                <div className="flex gap-2">
                  <input value={editPrice} onChange={e => setEditPrice(e.target.value)} type="number" className="flex-1 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
                  <button onClick={() => saveEdit(s.id)} className="px-3 py-2 rounded-xl bg-gold/10 text-gold hover:bg-gold/20 transition-all"><Save className="w-4 h-4" /></button>
                  <button onClick={() => setEditing(null)} className="px-3 py-2 rounded-xl bg-primary-foreground/[0.05] text-primary-foreground/30 hover:text-primary-foreground/50 transition-all"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-[14px] font-medium text-primary-foreground truncate">{s.name}</p>
                    <p className="font-body text-[10px] text-primary-foreground/30">{s.category}</p>
                  </div>
                  <p className="font-body text-[14px] font-semibold text-gold ml-2">R$ {s.price.toFixed(2).replace(".", ",")}</p>
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
