import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Loader2, Sparkles, Folder } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BookingFlow from "@/components/BookingFlow";
import SuccessScreen from "@/components/SuccessScreen";
import logo from "@/assets/logo.png";

type Step = "identificacao" | "categoria" | "servico" | "booking" | "sucesso";

interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
  categoria: string;
}

const formatWhatsApp = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)})${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)})${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)})${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const Agendamento = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("identificacao");
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loadingServicos, setLoadingServicos] = useState(false);
  const [servicoSelecionado, setServicoSelecionado] = useState<Servico | null>(null);

  // Não mistura com sessão pré-existente do site (cliente público)
  useEffect(() => {
    supabase.auth.signOut().catch(() => {});
  }, []);

  const handleIdentificar = async (e: React.FormEvent) => {
    e.preventDefault();
    const wa = whatsapp.replace(/\D/g, "");
    if (!nome.trim() || nome.trim().length < 2) {
      toast.error("Informe seu nome completo");
      return;
    }
    if (wa.length < 10 || wa.length > 11) {
      toast.error("WhatsApp inválido");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("public-cliente-signin", {
        body: { nome: nome.trim(), whatsapp: wa },
      });
      if (error || !data?.session) {
        toast.error(data?.error || "Não foi possível iniciar. Tente novamente.");
        setLoading(false);
        return;
      }
      const { error: setErr } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      if (setErr) {
        toast.error("Falha ao iniciar sessão.");
        setLoading(false);
        return;
      }
      // Mantém o nome cadastrado se já existia
      if (data.cliente?.nome) setNome(data.cliente.nome);
      await loadServicos();
      setStep("servico");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao identificar. Tente novamente.");
    }
    setLoading(false);
  };

  const loadServicos = async () => {
    setLoadingServicos(true);
    const { data } = await supabase
      .from("servicos")
      .select("id, nome, preco, duracao_minutos, categoria")
      .eq("ativo", true)
      .order("ordem", { ascending: true });
    setServicos((data as Servico[]) || []);
    setLoadingServicos(false);
  };

  const handleSelectService = (s: Servico) => {
    setServicoSelecionado(s);
    setStep("booking");
  };

  const handleBookingConfirm = () => {
    setStep("sucesso");
  };

  const handleVoltarServicos = () => {
    setServicoSelecionado(null);
    setStep("servico");
  };

  // ─── Sucesso ─────────────────────────────────────────────────────────
  if (step === "sucesso") {
    return (
      <SuccessScreen
        onHome={() => {
          supabase.auth.signOut().catch(() => {});
          navigate("/");
        }}
      />
    );
  }

  // ─── Header mínimo ───────────────────────────────────────────────────
  const Header = () => (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
      <div className="mx-auto max-w-md lg:max-w-2xl flex items-center justify-center px-6 py-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Estúdio Dyoli Godim" className="h-9 w-9 rounded-full object-cover border border-gold/20" />
          <div className="text-center">
            <p className="font-heading text-[15px] font-semibold text-foreground leading-none">Estúdio Dyoli Godim</p>
            <p className="font-body text-[10px] uppercase tracking-[0.18em] text-gold/80 mt-1">Agendamento online</p>
          </div>
        </div>
      </div>
    </header>
  );

  // ─── Booking ─────────────────────────────────────────────────────────
  if (step === "booking" && servicoSelecionado) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-md lg:max-w-2xl">
          <BookingFlow
            service={servicoSelecionado.nome}
            onBack={handleVoltarServicos}
            onConfirm={handleBookingConfirm}
          />
        </div>
      </div>
    );
  }

  // ─── Seleção de serviço ──────────────────────────────────────────────
  if (step === "servico") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <section className="mx-auto max-w-md lg:max-w-2xl px-6 py-8">
          <button
            onClick={() => setStep("identificacao")}
            className="ios-press flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-body text-[14px]">Voltar</span>
          </button>

          <div className="space-y-2 mb-7">
            <p className="font-body text-[11px] tracking-widest uppercase text-gold font-medium">
              Olá, {nome.split(" ")[0]} 🌸
            </p>
            <h2 className="font-heading text-3xl font-semibold text-foreground">
              Escolha o serviço
            </h2>
            <p className="font-body text-[13px] text-muted-foreground">
              Selecione o procedimento que deseja agendar
            </p>
          </div>

          {loadingServicos ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gold" />
            </div>
          ) : servicos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground font-body text-[13px]">
              Nenhum serviço disponível no momento.
            </div>
          ) : (
            <div className="space-y-3">
              {servicos.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectService(s)}
                  className="ios-press w-full text-left p-4 rounded-2xl border border-border/60 bg-card/70 hover:border-gold/30 hover:bg-card transition-all flex items-center gap-3"
                >
                  <div className="w-11 h-11 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-[14px] font-medium text-foreground truncate">{s.nome}</p>
                    <p className="font-body text-[12px] text-muted-foreground mt-0.5">
                      {s.duracao_minutos} min · R$ {s.preco}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ─── Identificação ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="mx-auto max-w-md lg:max-w-2xl px-6 py-10">
        <div className="space-y-2 mb-8 text-center">
          <p className="font-body text-[11px] tracking-widest uppercase text-gold font-medium">
            Bem-vinda 🤍
          </p>
          <h1 className="font-heading text-3xl font-semibold text-foreground">
            Vamos agendar?
          </h1>
          <p className="font-body text-[13px] text-muted-foreground max-w-xs mx-auto">
            Preencha seus dados para começar. Caso já seja cliente, vamos reconhecer você pelo WhatsApp.
          </p>
        </div>

        <form onSubmit={handleIdentificar} className="space-y-4">
          <div>
            <label className="font-body text-[12px] uppercase tracking-widest text-muted-foreground font-medium block mb-2">
              Nome completo
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Como podemos te chamar?"
              autoComplete="name"
              maxLength={80}
              className="w-full px-4 py-3.5 rounded-2xl bg-card border border-border focus:border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold/20 font-body text-[14px] text-foreground placeholder:text-muted-foreground/60 transition-all"
            />
          </div>

          <div>
            <label className="font-body text-[12px] uppercase tracking-widest text-muted-foreground font-medium block mb-2">
              WhatsApp
            </label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
              placeholder="(48) 99977-9829"
              autoComplete="tel"
              inputMode="tel"
              className="w-full px-4 py-3.5 rounded-2xl bg-card border border-border focus:border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold/20 font-body text-[14px] text-foreground placeholder:text-muted-foreground/60 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="ios-press w-full py-4 rounded-full bg-rose text-primary-foreground font-body font-semibold text-[15px] tracking-wide shadow-[0_4px_20px_-4px_hsl(340_30%_50%/0.4)] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Identificando...
              </>
            ) : (
              <>
                Continuar <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>

          <p className="text-center font-body text-[11px] text-muted-foreground/70 pt-2">
            Ao continuar, você concorda em receber notificações via WhatsApp sobre seu agendamento.
          </p>
        </form>
      </section>
    </div>
  );
};

export default Agendamento;
