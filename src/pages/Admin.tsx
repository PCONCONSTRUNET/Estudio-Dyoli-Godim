import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3, Calendar, Users, Clock, Settings, LogOut, Search,
  ChevronDown, X, Edit2, Trash2, Plus, Save, ArrowLeft, Eye
} from "lucide-react";

// ─── Types ───
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
}

interface Profile {
  id: string;
  nome: string;
  whatsapp: string;
  created_at: string;
}

type Tab = "dashboard" | "agendamentos" | "clientes" | "horarios" | "servicos";

// ─── Admin Password Gate ───
const ADMIN_PASSWORD = "admin2024";

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
            if (password === ADMIN_PASSWORD) {
              setAuthenticated(true);
              setError("");
            } else {
              setError("Senha incorreta");
            }
          }} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha de acesso"
              className="w-full px-4 py-3 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[15px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20"
            />
            {error && <p className="font-body text-[12px] text-rose text-center">{error}</p>}
            <button type="submit" className="w-full py-3.5 rounded-2xl bg-rose text-primary-foreground font-body font-semibold text-[15px] shadow-[0_4px_20px_-4px_hsl(340_30%_50%/0.4)]">
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <AdminPanel onLogout={() => setAuthenticated(false)} />;
};

// ─── Admin Panel ───
const AdminPanel = ({ onLogout }: { onLogout: () => void }) => {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [clientes, setClientes] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");

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
    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const deleteAgendamento = async (id: string) => {
    await supabase.from("agendamentos").delete().eq("id", id);
    setAgendamentos(prev => prev.filter(a => a.id !== id));
  };

  const tabs = [
    { id: "dashboard" as Tab, label: "Dashboard", icon: BarChart3 },
    { id: "agendamentos" as Tab, label: "Agendamentos", icon: Calendar },
    { id: "clientes" as Tab, label: "Clientes", icon: Users },
    { id: "horarios" as Tab, label: "Horários", icon: Clock },
    { id: "servicos" as Tab, label: "Serviços", icon: Settings },
  ];

  // Stats
  const total = agendamentos.length;
  const confirmados = agendamentos.filter(a => a.status === "confirmado").length;
  const cancelados = agendamentos.filter(a => a.status === "cancelado").length;
  const concluidos = agendamentos.filter(a => a.status === "concluido").length;
  const faturamento = agendamentos
    .filter(a => a.status !== "cancelado")
    .reduce((sum, a) => sum + (a.valor_pago || 0), 0);

  const getClientName = (userId: string) => {
    const c = clientes.find(c => c.id === userId);
    return c?.nome || "—";
  };

  const filteredAgendamentos = agendamentos.filter(a => {
    if (statusFilter !== "todos" && a.status !== statusFilter) return false;
    if (searchTerm) {
      const name = getClientName(a.user_id).toLowerCase();
      return name.includes(searchTerm.toLowerCase()) || a.servico.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const formatDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  const formatWhatsapp = (w: string) => w ? `(${w.slice(0,2)}) ${w.slice(2,7)}-${w.slice(7)}` : "—";

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      confirmado: "bg-gold/10 text-gold border-gold/20",
      cancelado: "bg-rose/10 text-rose border-rose/20",
      concluido: "bg-green-500/10 text-green-500 border-green-500/20",
    };
    const labels: Record<string, string> = { confirmado: "Confirmado", cancelado: "Cancelado", concluido: "Concluído" };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[11px] font-body font-medium border ${map[s] || "bg-secondary text-muted-foreground border-border"}`}>
        {labels[s] || s}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-charcoal flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-primary-foreground/[0.06] bg-charcoal/50 backdrop-blur-xl flex flex-col">
        <div className="px-6 py-6 border-b border-primary-foreground/[0.06]">
          <h1 className="font-heading text-lg font-semibold text-primary-foreground">Admin Panel</h1>
          <p className="font-body text-[11px] text-primary-foreground/30 mt-0.5">Estúdio Dyoli Godim</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-body text-[13px] font-medium transition-all duration-200 ${
                tab === t.id
                  ? "bg-primary-foreground/[0.08] text-primary-foreground"
                  : "text-primary-foreground/40 hover:text-primary-foreground/70 hover:bg-primary-foreground/[0.04]"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-primary-foreground/[0.06]">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-body text-[13px] font-medium text-rose/70 hover:text-rose hover:bg-rose/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-6xl">
          {/* ── Dashboard ── */}
          {tab === "dashboard" && (
            <div className="space-y-8 animate-fade-in">
              <h2 className="font-heading text-2xl font-semibold text-primary-foreground">Dashboard</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total", value: total, color: "text-primary-foreground" },
                  { label: "Confirmados", value: confirmados, color: "text-gold" },
                  { label: "Concluídos", value: concluidos, color: "text-green-500" },
                  { label: "Cancelados", value: cancelados, color: "text-rose" },
                ].map(s => (
                  <div key={s.label} className="p-5 rounded-2xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
                    <p className="font-body text-[11px] text-primary-foreground/35 uppercase tracking-widest">{s.label}</p>
                    <p className={`font-heading text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
                  <p className="font-body text-[11px] text-primary-foreground/35 uppercase tracking-widest">Faturamento (pago)</p>
                  <p className="font-heading text-3xl font-bold text-gold mt-1">R$ {faturamento.toFixed(2).replace(".", ",")}</p>
                </div>
                <div className="p-5 rounded-2xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
                  <p className="font-body text-[11px] text-primary-foreground/35 uppercase tracking-widest">Total de clientes</p>
                  <p className="font-heading text-3xl font-bold text-primary-foreground mt-1">{clientes.length}</p>
                </div>
              </div>

              {/* Recent */}
              <div>
                <h3 className="font-body text-[13px] text-primary-foreground/50 uppercase tracking-widest mb-4">Últimos agendamentos</h3>
                <div className="space-y-2">
                  {agendamentos.slice(0, 5).map(a => (
                    <div key={a.id} className="flex items-center justify-between p-4 rounded-2xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-body text-[14px] font-medium text-primary-foreground">{getClientName(a.user_id)}</p>
                          <p className="font-body text-[12px] text-primary-foreground/40">{a.servico}{a.variacao ? ` — ${a.variacao}` : ""}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-body text-[12px] text-primary-foreground/40">{formatDate(a.data_agendamento)} · {a.horario}</p>
                        {statusBadge(a.status)}
                      </div>
                    </div>
                  ))}
                  {agendamentos.length === 0 && (
                    <p className="font-body text-[13px] text-primary-foreground/30 text-center py-8">Nenhum agendamento ainda</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Agendamentos ── */}
          {tab === "agendamentos" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-2xl font-semibold text-primary-foreground">Agendamentos</h2>
              </div>
              {/* Filters */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/25" />
                  <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar cliente ou serviço..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20"
                >
                  <option value="todos">Todos</option>
                  <option value="confirmado">Confirmados</option>
                  <option value="concluido">Concluídos</option>
                  <option value="cancelado">Cancelados</option>
                </select>
              </div>
              {/* Table */}
              <div className="rounded-2xl border border-primary-foreground/[0.06] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-primary-foreground/[0.06]">
                      {["Cliente", "Serviço", "Data", "Horário", "Valor", "Pago", "Status", "Ações"].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-body text-[11px] text-primary-foreground/35 uppercase tracking-widest font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgendamentos.map(a => (
                      <tr key={a.id} className="border-b border-primary-foreground/[0.04] hover:bg-primary-foreground/[0.02] transition-colors">
                        <td className="px-4 py-3 font-body text-[13px] text-primary-foreground">{getClientName(a.user_id)}</td>
                        <td className="px-4 py-3 font-body text-[13px] text-primary-foreground/70">{a.servico}{a.variacao ? ` (${a.variacao})` : ""}</td>
                        <td className="px-4 py-3 font-body text-[13px] text-primary-foreground/50">{formatDate(a.data_agendamento)}</td>
                        <td className="px-4 py-3 font-body text-[13px] text-primary-foreground/50">{a.horario}</td>
                        <td className="px-4 py-3 font-body text-[13px] text-gold">R$ {Number(a.valor).toFixed(2).replace(".", ",")}</td>
                        <td className="px-4 py-3 font-body text-[13px] text-primary-foreground/50">R$ {Number(a.valor_pago || 0).toFixed(2).replace(".", ",")}</td>
                        <td className="px-4 py-3">{statusBadge(a.status)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {a.status === "confirmado" && (
                              <button onClick={() => updateStatus(a.id, "concluido")} className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-500/50 hover:text-green-500 transition-all" title="Concluir">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {a.status === "confirmado" && (
                              <button onClick={() => updateStatus(a.id, "cancelado")} className="p-1.5 rounded-lg hover:bg-rose/10 text-rose/50 hover:text-rose transition-all" title="Cancelar">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => deleteAgendamento(a.id)} className="p-1.5 rounded-lg hover:bg-rose/10 text-primary-foreground/20 hover:text-rose transition-all" title="Excluir">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredAgendamentos.length === 0 && (
                  <p className="font-body text-[13px] text-primary-foreground/30 text-center py-8">Nenhum agendamento encontrado</p>
                )}
              </div>
            </div>
          )}

          {/* ── Clientes ── */}
          {tab === "clientes" && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="font-heading text-2xl font-semibold text-primary-foreground">Clientes</h2>
              <div className="rounded-2xl border border-primary-foreground/[0.06] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-primary-foreground/[0.06]">
                      {["Nome", "WhatsApp", "Cadastro", "Agendamentos"].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-body text-[11px] text-primary-foreground/35 uppercase tracking-widest font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map(c => {
                      const count = agendamentos.filter(a => a.user_id === c.id).length;
                      return (
                        <tr key={c.id} className="border-b border-primary-foreground/[0.04] hover:bg-primary-foreground/[0.02] transition-colors">
                          <td className="px-4 py-3 font-body text-[13px] text-primary-foreground font-medium">{c.nome}</td>
                          <td className="px-4 py-3 font-body text-[13px] text-primary-foreground/50">{formatWhatsapp(c.whatsapp)}</td>
                          <td className="px-4 py-3 font-body text-[13px] text-primary-foreground/40">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                          <td className="px-4 py-3 font-body text-[13px] text-gold font-medium">{count}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {clientes.length === 0 && (
                  <p className="font-body text-[13px] text-primary-foreground/30 text-center py-8">Nenhum cliente cadastrado</p>
                )}
              </div>
            </div>
          )}

          {/* ── Horários ── */}
          {tab === "horarios" && <HorariosTab />}

          {/* ── Serviços ── */}
          {tab === "servicos" && <ServicosTab />}
        </div>
      </main>
    </div>
  );
};

// ─── Horários Tab ───
const HorariosTab = () => {
  const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const [hours, setHours] = useState<{ id: string; day: number; open: boolean; start: string; end: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("horarios_funcionamento").select("*").order("dia_semana").then(({ data }) => {
      if (data) {
        setHours(data.map(d => ({ id: d.id, day: d.dia_semana, open: d.aberto, start: d.hora_inicio, end: d.hora_fim })));
      }
      setLoading(false);
    });
  }, []);

  const toggle = (day: number) => {
    setHours(prev => prev.map(h => h.day === day ? { ...h, open: !h.open } : h));
  };

  const updateTime = (day: number, field: "start" | "end", val: string) => {
    setHours(prev => prev.map(h => h.day === day ? { ...h, [field]: val } : h));
  };

  const handleSave = async () => {
    setSaving(true);
    for (const h of hours) {
      await supabase.from("horarios_funcionamento").update({
        aberto: h.open,
        hora_inicio: h.start,
        hora_fim: h.end,
        updated_at: new Date().toISOString(),
      }).eq("id", h.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <p className="font-body text-[13px] text-primary-foreground/30 text-center py-8">Carregando...</p>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-semibold text-primary-foreground">Horários de Funcionamento</h2>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold/10 text-gold font-body text-[13px] font-medium hover:bg-gold/20 transition-all disabled:opacity-40">
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar"}
        </button>
      </div>
      <div className="space-y-2">
        {hours.map(h => (
          <div key={h.day} className="flex items-center gap-4 p-4 rounded-2xl bg-primary-foreground/[0.03] border border-primary-foreground/[0.06]">
            <button
              onClick={() => toggle(h.day)}
              className={`w-12 h-7 rounded-full relative transition-all duration-200 ${h.open ? "bg-gold" : "bg-primary-foreground/10"}`}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${h.open ? "left-6" : "left-1"}`} />
            </button>
            <span className="font-body text-[14px] text-primary-foreground w-36">{dayNames[h.day]}</span>
            {h.open ? (
              <div className="flex items-center gap-2">
                <input type="time" value={h.start} onChange={e => updateTime(h.day, "start", e.target.value)} className="px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
                <span className="text-primary-foreground/30">—</span>
                <input type="time" value={h.end} onChange={e => updateTime(h.day, "end", e.target.value)} className="px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
              </div>
            ) : (
              <span className="font-body text-[13px] text-primary-foreground/30">Fechado</span>
            )}
          </div>
        ))}
      </div>
      <div className="p-4 rounded-2xl bg-gold/5 border border-gold/10">
        <p className="font-body text-[12px] text-gold/70 leading-relaxed">
          ⚠ Alterações nos horários afetam apenas novos agendamentos. Agendamentos já confirmados não são alterados automaticamente.
        </p>
      </div>
    </div>
  );
};

// ─── Serviços Tab ───
const ServicosTab = () => {
  const [services, setServices] = useState([
    { id: "1", name: "Micropigmentação Fio a Fio", price: 550, category: "Sobrancelhas", active: true },
    { id: "2", name: "Micropigmentação Labial", price: 480, category: "Lábios", active: true },
    { id: "3", name: "Perfuração Básica", price: 170, category: "Perfuração", active: true },
    { id: "4", name: "Perfuração Padrão", price: 180, category: "Perfuração", active: true },
    { id: "5", name: "Perfuração Premium", price: 300, category: "Perfuração", active: true },
  ]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const startEdit = (s: typeof services[0]) => {
    setEditing(s.id);
    setEditName(s.name);
    setEditPrice(s.price.toString());
  };

  const saveEdit = (id: string) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, name: editName, price: Number(editPrice) } : s));
    setEditing(null);
  };

  const addService = () => {
    if (!newName || !newPrice) return;
    setServices(prev => [...prev, {
      id: Date.now().toString(),
      name: newName,
      price: Number(newPrice),
      category: newCategory || "Outros",
      active: true,
    }]);
    setNewName("");
    setNewPrice("");
    setNewCategory("");
    setShowAdd(false);
  };

  const toggleActive = (id: string) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const removeService = (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-semibold text-primary-foreground">Serviços</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold/10 text-gold font-body text-[13px] font-medium hover:bg-gold/20 transition-all">
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      {showAdd && (
        <div className="p-5 rounded-2xl bg-primary-foreground/[0.03] border border-gold/20 space-y-3 animate-fade-in">
          <h3 className="font-body text-[14px] font-medium text-primary-foreground">Novo Serviço</h3>
          <div className="grid grid-cols-3 gap-3">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do serviço" className="px-4 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20" />
            <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Preço" type="number" className="px-4 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20" />
            <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Categoria" className="px-4 py-2.5 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20" />
          </div>
          <div className="flex gap-2">
            <button onClick={addService} className="px-4 py-2 rounded-xl bg-gold/10 text-gold font-body text-[12px] font-medium hover:bg-gold/20 transition-all">Salvar</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl bg-primary-foreground/[0.05] text-primary-foreground/40 font-body text-[12px] hover:text-primary-foreground/60 transition-all">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {services.map(s => (
          <div key={s.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${s.active ? "bg-primary-foreground/[0.03] border-primary-foreground/[0.06]" : "bg-primary-foreground/[0.01] border-primary-foreground/[0.03] opacity-50"}`}>
            {editing === s.id ? (
              <div className="flex items-center gap-3 flex-1">
                <input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
                <input value={editPrice} onChange={e => setEditPrice(e.target.value)} type="number" className="w-24 px-3 py-2 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/20" />
                <button onClick={() => saveEdit(s.id)} className="p-2 rounded-lg bg-gold/10 text-gold hover:bg-gold/20 transition-all">
                  <Save className="w-4 h-4" />
                </button>
                <button onClick={() => setEditing(null)} className="p-2 rounded-lg bg-primary-foreground/[0.05] text-primary-foreground/30 hover:text-primary-foreground/50 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div>
                  <p className="font-body text-[14px] font-medium text-primary-foreground">{s.name}</p>
                  <p className="font-body text-[11px] text-primary-foreground/30">{s.category}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-body text-[14px] font-semibold text-gold">R$ {s.price.toFixed(2).replace(".", ",")}</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleActive(s.id)} className={`w-10 h-6 rounded-full relative transition-all duration-200 ${s.active ? "bg-gold" : "bg-primary-foreground/10"}`}>
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${s.active ? "left-4.5" : "left-0.5"}`} />
                    </button>
                    <button onClick={() => startEdit(s)} className="p-1.5 rounded-lg hover:bg-primary-foreground/[0.06] text-primary-foreground/30 hover:text-primary-foreground/60 transition-all">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeService(s.id)} className="p-1.5 rounded-lg hover:bg-rose/10 text-primary-foreground/20 hover:text-rose transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
