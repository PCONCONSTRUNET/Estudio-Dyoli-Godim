import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { User, Calendar, Clock, LogOut, X, Sparkles, Cake, TrendingUp, Award, Pencil, Check, Heart, FileText, Download, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notifyLembreteById } from "@/lib/notify-webhook";
import { sendPush } from "@/lib/push-notify";
import PushToggle from "@/components/PushToggle";
import RatingModal from "@/components/RatingModal";
import professionalImg from "@/assets/professional.png";

interface Avaliacao {
  agendamento_id: string;
  nota: number;
  comentario: string;
}

interface ProfileScreenProps {
  onBack: () => void;
  onLogout: () => void;
}

interface Agendamento {
  id: string;
  servico: string;
  variacao: string | null;
  data_agendamento: string;
  horario: string;
  valor: number;
  valor_pago: number;
  status: string;
  created_at: string;
}

interface Profile {
  nome: string;
  whatsapp: string;
  data_nascimento: string | null;
  created_at: string;
}

const ProfileScreen = ({ onBack, onLogout }: ProfileScreenProps) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"dados" | "agendamentos">("dados");
  const [agendamentosTab, setAgendamentosTab] = useState<"proximos" | "historico">("proximos");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Inline edit
  const [editingNome, setEditingNome] = useState(false);
  const [editingNasc, setEditingNasc] = useState(false);
  const [editingWpp, setEditingWpp] = useState(false);
  const [nomeDraft, setNomeDraft] = useState("");
  const [nascDraft, setNascDraft] = useState("");
  const [wppDraft, setWppDraft] = useState("");
  const [wppError, setWppError] = useState<string | null>(null);
  const [savingWpp, setSavingWpp] = useState(false);
  const [saving, setSaving] = useState(false);

  // Avaliações
  const [avaliacoes, setAvaliacoes] = useState<Record<string, Avaliacao>>({});
  const [ratingTarget, setRatingTarget] = useState<Agendamento | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const [profileRes, agendamentosRes, avaliacoesRes] = await Promise.all([
      supabase.from("profiles").select("nome, whatsapp, data_nascimento, created_at").eq("id", user.id).single(),
      supabase.from("agendamentos").select("*").eq("user_id", user.id).order("data_agendamento", { ascending: false }),
      supabase.from("avaliacoes").select("agendamento_id, nota, comentario").eq("user_id", user.id),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data);
      setNomeDraft(profileRes.data.nome || "");
      setNascDraft(profileRes.data.data_nascimento || "");
    }
    if (agendamentosRes.data) setAgendamentos(agendamentosRes.data as Agendamento[]);
    if (avaliacoesRes.data) {
      const map: Record<string, Avaliacao> = {};
      (avaliacoesRes.data as Avaliacao[]).forEach((a) => { map[a.agendamento_id] = a; });
      setAvaliacoes(map);
    }
    setLoading(false);
  };

  const handleCancel = async (id: string) => {
    setCancelling(id);
    // Snapshot do agendamento antes do update pra montar a mensagem
    const ag = agendamentos.find((a) => a.id === id);
    const clienteNome = profile?.nome || "Cliente";

    await supabase.from("agendamentos").update({ status: "cancelado" }).eq("id", id);
    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: "cancelado" } : a));
    notifyLembreteById(id, "cancelamento");

    // Push pro admin avisando do cancelamento
    if (ag) {
      try {
        const dataFmt = new Date(ag.data_agendamento + "T12:00:00").toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        });
        const variacaoTxt = ag.variacao ? ` (${ag.variacao})` : "";
        await sendPush({
          role: "admin",
          title: "❌ Agendamento cancelado",
          message: `${clienteNome} cancelou ${ag.servico}${variacaoTxt} de ${dataFmt} às ${ag.horario}`,
          url: "/admin",
          data: { agendamento_id: id, tipo: "cancelamento_cliente" },
        });
      } catch (e) {
        console.warn("Push de cancelamento falhou:", e);
      }
    }

    setCancelling(null);
  };

  const saveProfile = async (patch: Partial<Profile>) => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (!error) setProfile(prev => prev ? { ...prev, ...patch } : prev);
    setSaving(false);
  };

  const saveWhatsapp = async () => {
    const digits = wppDraft.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) {
      setWppError("Número inválido. Inclua DDD + número.");
      return;
    }
    setWppError(null);
    setSavingWpp(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-cliente-whatsapp", {
        body: { whatsapp: digits },
      });
      if (error) {
        // Tenta extrair mensagem amigável do contexto da edge function
        let msg = "Não foi possível atualizar o WhatsApp.";
        try {
          const ctx: any = (error as any).context;
          if (ctx?.json) msg = ctx.json.error || msg;
          else if (ctx instanceof Response) {
            const j = await ctx.json().catch(() => null);
            if (j?.error) msg = j.error;
          }
        } catch {}
        setWppError(msg);
        return;
      }
      if (data?.error) {
        setWppError(data.error);
        return;
      }
      setProfile(prev => prev ? { ...prev, whatsapp: digits } : prev);
      setEditingWpp(false);
    } catch (e: any) {
      setWppError(e?.message || "Erro ao atualizar WhatsApp.");
    } finally {
      setSavingWpp(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatDateLong = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmado": return "text-gold bg-gold/10 border-gold/20";
      case "cancelado": return "text-rose bg-rose/10 border-rose/20";
      case "concluido": return "text-green-500 bg-green-500/10 border-green-500/20";
      case "falta": return "text-rose bg-rose/10 border-rose/20";
      default: return "text-primary-foreground/50 bg-primary-foreground/[0.05] border-primary-foreground/[0.08]";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmado": return "Confirmado";
      case "cancelado": return "Cancelado";
      case "concluido": return "Concluído";
      case "falta": return "Falta";
      default: return status;
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  // ===== Stats =====
  const stats = useMemo(() => {
    const concluidos = agendamentos.filter(a => a.status === "concluido");
    const totalAtendimentos = concluidos.length;
    const totalInvestido = concluidos.reduce((s, a) => s + Number(a.valor_pago || 0), 0);

    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const proximos = agendamentos
      .filter(a => a.status === "confirmado" && new Date(a.data_agendamento + "T12:00:00") >= hoje)
      .sort((a, b) => a.data_agendamento.localeCompare(b.data_agendamento) || a.horario.localeCompare(b.horario));
    const proximo = proximos[0] || null;

    let diasAte: number | null = null;
    if (proximo) {
      const diff = new Date(proximo.data_agendamento + "T12:00:00").getTime() - hoje.getTime();
      diasAte = Math.round(diff / (1000 * 60 * 60 * 24));
    }

    // Loyalty tiers
    let tier = { label: "Cliente", color: "text-primary-foreground/60", bg: "bg-primary-foreground/[0.06]", next: 3, progress: totalAtendimentos / 3 };
    if (totalAtendimentos >= 10) tier = { label: "VIP Diamond", color: "text-gold", bg: "bg-gold/15", next: 10, progress: 1 };
    else if (totalAtendimentos >= 5) tier = { label: "VIP Gold", color: "text-gold", bg: "bg-gold/10", next: 10, progress: totalAtendimentos / 10 };
    else if (totalAtendimentos >= 3) tier = { label: "Cliente Fiel", color: "text-nude", bg: "bg-nude/10", next: 5, progress: totalAtendimentos / 5 };

    return { totalAtendimentos, totalInvestido, proximo, proximos, diasAte, tier };
  }, [agendamentos]);

  const historico = useMemo(
    () => agendamentos.filter(a => a.status !== "confirmado" || (stats.proximo?.id !== a.id && new Date(a.data_agendamento + "T12:00:00").getTime() < new Date().setHours(0,0,0,0))),
    [agendamentos, stats.proximo]
  );
  const proximosList = stats.proximos;

  const clienteDesde = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
    : "—";

  const formatWhatsapp = (w: string) => w ? `(${w.slice(0,2)}) ${w.slice(2,7)}-${w.slice(7)}` : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 animate-bg-drift" style={{
        background: 'linear-gradient(135deg, hsl(0 0% 8%) 0%, hsl(30 15% 12%) 25%, hsl(20 10% 10%) 50%, hsl(0 0% 9%) 75%, hsl(30 20% 11%) 100%)',
        backgroundSize: '400% 400%',
      }} />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gold/[0.025] blur-[150px] animate-hero-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-nude/[0.03] blur-[130px] animate-hero-glow-alt" />
      <div className="absolute inset-0 bg-black/40" onClick={onBack} />

      {/* Glass modal */}
      <div className="relative w-full max-w-sm lg:max-w-md max-h-[88vh] rounded-3xl border border-primary-foreground/[0.08] bg-charcoal/70 backdrop-blur-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.6)] animate-scale-in flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <button
            onClick={onBack}
            className="ios-press absolute top-4 right-4 w-8 h-8 rounded-full bg-primary-foreground/[0.08] flex items-center justify-center text-primary-foreground/40 hover:text-primary-foreground/70 hover:bg-primary-foreground/[0.12] transition-all z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Photo + name + tier badge */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="w-[68px] h-[68px] rounded-full overflow-hidden border-2 border-gold/20 shadow-[0_4px_16px_-4px_hsl(40_40%_55%/0.2)] bg-primary-foreground/[0.06] flex items-center justify-center">
                <User className="w-8 h-8 text-primary-foreground/40" strokeWidth={1.5} />
              </div>
              {stats.totalAtendimentos >= 3 && (
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${stats.tier.bg} border-2 border-charcoal flex items-center justify-center`}>
                  <Sparkles className={`w-3 h-3 ${stats.tier.color}`} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 pr-8">
              <h2 className="font-heading text-xl font-semibold text-primary-foreground truncate">
                {loading ? "..." : profile?.nome || "Cliente"}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-body font-medium ${stats.tier.bg} ${stats.tier.color}`}>
                  {stats.tier.label}
                </span>
                <span className="font-body text-[11px] text-primary-foreground/35">
                  desde {clienteDesde}
                </span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-2xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.06] px-2 py-2.5 text-center">
              <Award className="w-3.5 h-3.5 text-gold mx-auto mb-1" />
              <p className="font-heading text-[17px] leading-none text-primary-foreground font-semibold">{stats.totalAtendimentos}</p>
              <p className="font-body text-[9px] uppercase tracking-wider text-primary-foreground/40 mt-1">Atendim.</p>
            </div>
            <div className="rounded-2xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.06] px-2 py-2.5 text-center">
              <TrendingUp className="w-3.5 h-3.5 text-nude mx-auto mb-1" />
              <p className="font-heading text-[17px] leading-none text-primary-foreground font-semibold">
                R${stats.totalInvestido.toFixed(0)}
              </p>
              <p className="font-body text-[9px] uppercase tracking-wider text-primary-foreground/40 mt-1">Investido</p>
            </div>
            <div className="rounded-2xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.06] px-2 py-2.5 text-center">
              <Heart className="w-3.5 h-3.5 text-rose mx-auto mb-1" />
              <p className="font-heading text-[17px] leading-none text-primary-foreground font-semibold">{proximosList.length}</p>
              <p className="font-body text-[9px] uppercase tracking-wider text-primary-foreground/40 mt-1">Próx.</p>
            </div>
          </div>

          {/* Loyalty progress (only if not maxed) */}
          {stats.totalAtendimentos < 10 && (
            <div className="mb-4 px-3 py-2.5 rounded-xl bg-gradient-to-r from-gold/[0.06] to-nude/[0.06] border border-gold/[0.12]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-body text-[11px] text-primary-foreground/70">
                  Faltam <span className="text-gold font-semibold">{stats.tier.next - stats.totalAtendimentos}</span> para <span className="text-gold font-medium">{stats.totalAtendimentos < 3 ? "Cliente Fiel" : stats.totalAtendimentos < 5 ? "VIP Gold" : "VIP Diamond"}</span>
                </span>
                <Sparkles className="w-3 h-3 text-gold" />
              </div>
              <div className="h-1 rounded-full bg-primary-foreground/[0.06] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-gold to-nude rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(stats.tier.progress * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* iOS segmented control */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06]">
            <button
              onClick={() => setTab("dados")}
              className={`ios-press py-2.5 rounded-xl font-body text-[13px] font-medium transition-all duration-200 ${
                tab === "dados"
                  ? "bg-primary-foreground/[0.1] text-primary-foreground shadow-[0_2px_8px_-2px_rgba(0,0,0,0.2)]"
                  : "text-primary-foreground/40"
              }`}
            >
              <User className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              Dados
            </button>
            <button
              onClick={() => setTab("agendamentos")}
              className={`ios-press py-2.5 rounded-xl font-body text-[13px] font-medium transition-all duration-200 ${
                tab === "agendamentos"
                  ? "bg-primary-foreground/[0.1] text-primary-foreground shadow-[0_2px_8px_-2px_rgba(0,0,0,0.2)]"
                  : "text-primary-foreground/40"
              }`}
            >
              <Calendar className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              Agendamentos
            </button>
          </div>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-hide">
          {tab === "dados" && (
            <div className="space-y-3 animate-fade-in">
              {/* Próximo agendamento - destaque */}
              {stats.proximo && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gold/[0.12] via-nude/[0.08] to-rose/[0.06] border border-gold/[0.18] p-4">
                  <div className="absolute top-2 right-3 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-gold" />
                    <span className="font-body text-[10px] uppercase tracking-widest text-gold/80 font-medium">Próximo</span>
                  </div>
                  <p className="font-heading text-[17px] text-primary-foreground font-semibold leading-tight pr-16">
                    {stats.proximo.servico}
                  </p>
                  {stats.proximo.variacao && (
                    <p className="font-body text-[12px] text-primary-foreground/55 mt-0.5">{stats.proximo.variacao}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2.5">
                    <div className="flex items-center gap-1.5 text-primary-foreground/70">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="font-body text-[12px]">{formatDate(stats.proximo.data_agendamento)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-primary-foreground/70">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="font-body text-[12px]">{stats.proximo.horario}</span>
                    </div>
                  </div>
                  {stats.diasAte !== null && (
                    <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-foreground/[0.08]">
                      <span className="font-body text-[11px] text-primary-foreground/80 font-medium">
                        {stats.diasAte === 0 ? "✨ É hoje!" : stats.diasAte === 1 ? "Amanhã" : `Em ${stats.diasAte} dias`}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Nome editável */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-body text-[10px] text-primary-foreground/35 uppercase tracking-widest font-medium">Nome</label>
                  {!editingNome && (
                    <button
                      onClick={() => setEditingNome(true)}
                      className="ios-press text-primary-foreground/40 hover:text-gold transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {editingNome ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={nomeDraft}
                      onChange={(e) => setNomeDraft(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl bg-primary-foreground/[0.05] border border-gold/30 text-primary-foreground font-body text-[15px] outline-none focus:border-gold/60"
                    />
                    <button
                      disabled={saving || !nomeDraft.trim()}
                      onClick={async () => { await saveProfile({ nome: nomeDraft.trim() }); setEditingNome(false); }}
                      className="ios-press px-3 rounded-xl bg-gold/15 border border-gold/25 text-gold disabled:opacity-40"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="px-4 py-3 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[15px]">
                    {loading ? "Carregando..." : profile?.nome || "—"}
                  </div>
                )}
              </div>

              {/* WhatsApp (também é o login) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-body text-[10px] text-primary-foreground/35 uppercase tracking-widest font-medium">
                    WhatsApp <span className="text-primary-foreground/25 normal-case tracking-normal">(seu login)</span>
                  </label>
                  {!editingWpp && !loading && (
                    <button
                      onClick={() => {
                        setWppDraft(profile?.whatsapp || "");
                        setWppError(null);
                        setEditingWpp(true);
                      }}
                      className="ios-press text-primary-foreground/40 hover:text-gold transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {editingWpp ? (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        type="tel"
                        inputMode="numeric"
                        placeholder="(11) 99999-9999"
                        value={wppDraft}
                        onChange={(e) => { setWppDraft(e.target.value); setWppError(null); }}
                        className="flex-1 px-4 py-3 rounded-xl bg-primary-foreground/[0.05] border border-gold/30 text-primary-foreground font-body text-[15px] outline-none focus:border-gold/60"
                      />
                      <button
                        disabled={savingWpp || !wppDraft.trim()}
                        onClick={saveWhatsapp}
                        className="ios-press px-3 rounded-xl bg-gold/15 border border-gold/25 text-gold disabled:opacity-40"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        disabled={savingWpp}
                        onClick={() => { setEditingWpp(false); setWppError(null); }}
                        className="ios-press px-3 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.08] text-primary-foreground/60 disabled:opacity-40"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {wppError && (
                      <p className="font-body text-[11px] text-rose px-1">{wppError}</p>
                    )}
                    <p className="font-body text-[10px] text-primary-foreground/35 px-1">
                      Sua senha continua a mesma. Use o novo número no próximo login.
                    </p>
                  </div>
                ) : (
                  <div className="px-4 py-3 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[15px]">
                    {loading ? "Carregando..." : formatWhatsapp(profile?.whatsapp || "") || "—"}
                  </div>
                )}
              </div>


              {/* Aniversário */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-body text-[10px] text-primary-foreground/35 uppercase tracking-widest font-medium flex items-center gap-1.5">
                    <Cake className="w-3 h-3" />
                    Aniversário
                  </label>
                  {!editingNasc && (
                    <button
                      onClick={() => setEditingNasc(true)}
                      className="ios-press text-primary-foreground/40 hover:text-gold transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {editingNasc ? (
                  <div className="flex gap-2">
                    <input
                      type="date"
                      autoFocus
                      value={nascDraft}
                      onChange={(e) => setNascDraft(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl bg-primary-foreground/[0.05] border border-gold/30 text-primary-foreground font-body text-[15px] outline-none focus:border-gold/60"
                    />
                    <button
                      disabled={saving}
                      onClick={async () => { await saveProfile({ data_nascimento: nascDraft || null } as any); setEditingNasc(false); }}
                      className="ios-press px-3 rounded-xl bg-gold/15 border border-gold/25 text-gold disabled:opacity-40"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="px-4 py-3 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[15px] flex items-center justify-between">
                    <span>
                      {loading ? "Carregando..." : profile?.data_nascimento ? formatDateLong(profile.data_nascimento) : <span className="text-primary-foreground/40">Adicione para receber um mimo 🎁</span>}
                    </span>
                  </div>
                )}
              </div>

              {/* Quick links */}
              <div className="pt-2 grid grid-cols-1 gap-2">
                <a
                  href="/cuidados"
                  className="ios-press flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.06] hover:bg-primary-foreground/[0.07] transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-nude/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-nude" />
                  </div>
                  <div className="flex-1">
                    <p className="font-body text-[13px] text-primary-foreground font-medium">Cuidados pós-procedimento</p>
                    <p className="font-body text-[11px] text-primary-foreground/40">Recomendações para sua pele</p>
                  </div>
                </a>
              </div>

              {/* Push notifications */}
              <div className="pt-2">
                <PushToggle role="cliente" userId={userId} />
              </div>

              {/* Instalar app */}
              <div className="pt-3">
                <button
                  onClick={() => { onBack(); navigate("/instalar"); }}
                  className="ios-press w-full py-3 rounded-full bg-gold/10 border border-gold/25 text-gold font-body text-[14px] font-medium flex items-center justify-center gap-2 transition-all duration-200 hover:bg-gold/15"
                >
                  <Download className="w-4 h-4" />
                  Instalar app no celular
                </button>
              </div>

              {/* Logout */}
              <div className="pt-2">
                <button
                  onClick={handleLogout}
                  className="ios-press w-full py-3 rounded-full bg-rose/10 border border-rose/20 text-rose font-body text-[14px] font-medium flex items-center justify-center gap-2 transition-all duration-200 hover:bg-rose/15"
                >
                  <LogOut className="w-4 h-4" />
                  Sair da Conta
                </button>
              </div>
            </div>
          )}

          {tab === "agendamentos" && (
            <div className="animate-fade-in">
              {/* Sub-tabs */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.06] mb-3">
                <button
                  onClick={() => setAgendamentosTab("proximos")}
                  className={`py-2 rounded-lg font-body text-[12px] font-medium transition-all ${
                    agendamentosTab === "proximos"
                      ? "bg-gold/15 text-gold"
                      : "text-primary-foreground/40"
                  }`}
                >
                  Próximos {proximosList.length > 0 && `(${proximosList.length})`}
                </button>
                <button
                  onClick={() => setAgendamentosTab("historico")}
                  className={`py-2 rounded-lg font-body text-[12px] font-medium transition-all ${
                    agendamentosTab === "historico"
                      ? "bg-primary-foreground/[0.1] text-primary-foreground"
                      : "text-primary-foreground/40"
                  }`}
                >
                  Histórico {historico.length > 0 && `(${historico.length})`}
                </button>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-8">
                    <p className="font-body text-[13px] text-primary-foreground/40">Carregando...</p>
                  </div>
                ) : (agendamentosTab === "proximos" ? proximosList : historico).length === 0 ? (
                  <div className="text-center py-10">
                    <Calendar className="w-10 h-10 text-primary-foreground/15 mx-auto mb-3" />
                    <p className="font-body text-[14px] text-primary-foreground/40">
                      {agendamentosTab === "proximos" ? "Nenhum agendamento futuro" : "Sem histórico ainda"}
                    </p>
                    <p className="font-body text-[12px] text-primary-foreground/25 mt-1">
                      {agendamentosTab === "proximos" ? "Que tal agendar um cuidado?" : "Seus atendimentos passados aparecerão aqui"}
                    </p>
                  </div>
                ) : (
                  (agendamentosTab === "proximos" ? proximosList : historico).map((a) => (
                    <div key={a.id} className="p-4 rounded-2xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.06] space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-[14px] font-medium text-primary-foreground">
                            {a.servico}
                          </p>
                          {a.variacao && (
                            <p className="font-body text-[12px] text-primary-foreground/40 mt-0.5">{a.variacao}</p>
                          )}
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-body font-medium border whitespace-nowrap ${getStatusColor(a.status)}`}>
                          {getStatusLabel(a.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-primary-foreground/50">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="font-body text-[12px]">{formatDate(a.data_agendamento)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-primary-foreground/50">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="font-body text-[12px]">{a.horario}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-primary-foreground/[0.05]">
                        <p className="font-body text-[13px] text-gold font-medium">
                          R$ {Number(a.valor).toFixed(2).replace(".", ",")}
                        </p>
                        {a.status === "confirmado" && (
                          <button
                            onClick={() => handleCancel(a.id)}
                            disabled={cancelling === a.id}
                            className="ios-press px-3 py-1.5 rounded-xl text-[12px] font-body font-medium text-rose bg-rose/10 border border-rose/15 hover:bg-rose/15 transition-all disabled:opacity-40"
                          >
                            {cancelling === a.id ? "Cancelando..." : "Cancelar"}
                          </button>
                        )}
                        {a.status === "concluido" && (
                          avaliacoes[a.id] ? (
                            <button
                              onClick={() => setRatingTarget(a)}
                              className="ios-press flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-body font-medium text-gold bg-gold/10 border border-gold/20 hover:bg-gold/15 transition-all"
                              title="Editar avaliação"
                            >
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <Star
                                    key={n}
                                    className={`w-3 h-3 ${n <= avaliacoes[a.id].nota ? "fill-gold text-gold" : "text-gold/25"}`}
                                    strokeWidth={1.5}
                                  />
                                ))}
                              </div>
                              <Pencil className="w-2.5 h-2.5 opacity-60" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setRatingTarget(a)}
                              className="ios-press flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-body font-medium text-gold bg-gradient-to-r from-gold/15 to-nude/10 border border-gold/25 hover:from-gold/20 hover:to-nude/15 transition-all"
                            >
                              <Star className="w-3.5 h-3.5" />
                              Avaliar
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {ratingTarget && userId && (
        <RatingModal
          agendamentoId={ratingTarget.id}
          userId={userId}
          servico={ratingTarget.servico + (ratingTarget.variacao ? ` — ${ratingTarget.variacao}` : "")}
          clienteNome={profile?.nome || "Cliente"}
          existingNota={avaliacoes[ratingTarget.id]?.nota}
          existingComentario={avaliacoes[ratingTarget.id]?.comentario}
          onClose={() => setRatingTarget(null)}
          onSaved={(nota, comentario) => {
            const id = ratingTarget.id;
            setAvaliacoes((prev) => ({
              ...prev,
              [id]: { agendamento_id: id, nota, comentario },
            }));
            setRatingTarget(null);
          }}
        />
      )}
    </div>
  );
};

export default ProfileScreen;
