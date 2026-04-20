import { useState, useEffect } from "react";
import { ArrowLeft, User, Calendar, Clock, LogOut, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notifyLembreteById } from "@/lib/notify-webhook";
import professionalImg from "@/assets/professional.png";

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
}

const ProfileScreen = ({ onBack, onLogout }: ProfileScreenProps) => {
  const [tab, setTab] = useState<"dados" | "historico">("dados");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, agendamentosRes] = await Promise.all([
      supabase.from("profiles").select("nome, whatsapp").eq("id", user.id).single(),
      supabase.from("agendamentos").select("*").eq("user_id", user.id).order("data_agendamento", { ascending: false }),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (agendamentosRes.data) setAgendamentos(agendamentosRes.data as Agendamento[]);
    setLoading(false);
  };

  const handleCancel = async (id: string) => {
    setCancelling(id);
    await supabase.from("agendamentos").update({ status: "cancelado" }).eq("id", id);
    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: "cancelado" } : a));
    notifyLembreteById(id, "cancelamento");
    setCancelling(null);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmado": return "text-gold bg-gold/10 border-gold/20";
      case "cancelado": return "text-rose bg-rose/10 border-rose/20";
      case "concluido": return "text-green-500 bg-green-500/10 border-green-500/20";
      default: return "text-muted-foreground bg-secondary border-border";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmado": return "Confirmado";
      case "cancelado": return "Cancelado";
      case "concluido": return "Concluído";
      default: return status;
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

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
      <div className="relative w-full max-w-sm lg:max-w-md max-h-[85vh] rounded-3xl border border-primary-foreground/[0.08] bg-charcoal/70 backdrop-blur-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.6)] animate-scale-in flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-7 pt-6 pb-4">
          <button
            onClick={onBack}
            className="ios-press absolute top-4 right-4 w-8 h-8 rounded-full bg-primary-foreground/[0.08] flex items-center justify-center text-primary-foreground/40 hover:text-primary-foreground/70 hover:bg-primary-foreground/[0.12] transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Photo + name */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gold/15 shadow-[0_4px_16px_-4px_hsl(40_40%_55%/0.15)]">
              <img src={professionalImg} alt="" className="w-full h-full object-cover object-top" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-semibold text-primary-foreground">
                {loading ? "..." : profile?.nome || "Cliente"}
              </h2>
              <p className="font-body text-[13px] text-primary-foreground/40">
                {loading ? "..." : profile?.whatsapp ? `(${profile.whatsapp.slice(0,2)}) ${profile.whatsapp.slice(2,7)}-${profile.whatsapp.slice(7)}` : ""}
              </p>
            </div>
          </div>

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
              Meus Dados
            </button>
            <button
              onClick={() => setTab("historico")}
              className={`ios-press py-2.5 rounded-xl font-body text-[13px] font-medium transition-all duration-200 ${
                tab === "historico"
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
        <div className="flex-1 overflow-y-auto px-7 pb-6 scrollbar-hide">
          {tab === "dados" && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1.5">
                <label className="font-body text-[11px] text-primary-foreground/35 uppercase tracking-widest font-medium">Nome</label>
                <div className="px-4 py-3 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[15px]">
                  {loading ? "Carregando..." : profile?.nome || "—"}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="font-body text-[11px] text-primary-foreground/35 uppercase tracking-widest font-medium">WhatsApp</label>
                <div className="px-4 py-3 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[15px]">
                  {loading ? "Carregando..." : profile?.whatsapp ? `(${profile.whatsapp.slice(0,2)}) ${profile.whatsapp.slice(2,7)}-${profile.whatsapp.slice(7)}` : "—"}
                </div>
              </div>

              {/* Logout */}
              <div className="pt-4">
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

          {tab === "historico" && (
            <div className="space-y-3 animate-fade-in">
              {loading ? (
                <div className="text-center py-8">
                  <p className="font-body text-[13px] text-primary-foreground/40">Carregando...</p>
                </div>
              ) : agendamentos.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 text-primary-foreground/15 mx-auto mb-3" />
                  <p className="font-body text-[14px] text-primary-foreground/40">Nenhum agendamento ainda</p>
                  <p className="font-body text-[12px] text-primary-foreground/25 mt-1">Seus agendamentos aparecerão aqui</p>
                </div>
              ) : (
                agendamentos.map((a) => (
                  <div key={a.id} className="p-4 rounded-2xl bg-primary-foreground/[0.04] border border-primary-foreground/[0.06] space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-body text-[14px] font-medium text-primary-foreground">
                          {a.servico}
                        </p>
                        {a.variacao && (
                          <p className="font-body text-[12px] text-primary-foreground/40 mt-0.5">{a.variacao}</p>
                        )}
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-body font-medium border ${getStatusColor(a.status)}`}>
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
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
