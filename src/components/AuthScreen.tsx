import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import professionalImg from "@/assets/professional.png";

interface AuthScreenProps {
  onSuccess: () => void;
  onBack: () => void;
  initialMode?: "login" | "signup";
}

type AuthMode = "login" | "signup";

const AuthScreen = ({ onSuccess, onBack, initialMode = "signup" }: AuthScreenProps) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatWhatsapp = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const getEmailFromWhatsapp = (wpp: string) => {
    const digits = wpp.replace(/\D/g, "");
    return `${digits}@studio-dyoli.app`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const digits = whatsapp.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Informe um número de WhatsApp válido");
      setLoading(false);
      return;
    }

    if (senha.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      setLoading(false);
      return;
    }

    const email = getEmailFromWhatsapp(whatsapp);

    try {
      if (mode === "signup") {
        if (!nome.trim()) {
          setError("Informe seu nome");
          setLoading(false);
          return;
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: {
              nome: nome.trim(),
              whatsapp: digits,
            },
          },
        });

        if (signUpError) {
          if (signUpError.message.includes("already registered")) {
            setError("Este WhatsApp já está cadastrado. Faça login.");
            setMode("login");
          } else {
            setError(signUpError.message);
          }
          setLoading(false);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });

        if (signInError) {
          if (signInError.message.includes("Invalid login")) {
            setError("WhatsApp ou senha incorretos");
          } else {
            setError(signInError.message);
          }
          setLoading(false);
          return;
        }
      }

      onSuccess();
    } catch {
      setError("Ocorreu um erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in overflow-hidden">
      {/* Full background matching HeroSection */}
      <div className="absolute inset-0 animate-bg-drift" style={{
        background: 'linear-gradient(135deg, hsl(0 0% 8%) 0%, hsl(30 15% 12%) 25%, hsl(20 10% 10%) 50%, hsl(0 0% 9%) 75%, hsl(30 20% 11%) 100%)',
        backgroundSize: '400% 400%',
      }} />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gold/[0.025] blur-[150px] animate-hero-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-nude/[0.03] blur-[130px] animate-hero-glow-alt" />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onBack} />

      {/* iOS-style glass modal */}
      <div className="relative w-full max-w-sm lg:max-w-md rounded-3xl border border-primary-foreground/[0.08] bg-charcoal/70 backdrop-blur-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.6)] px-7 py-6 space-y-4 animate-scale-in">
        {/* Close */}
        <button
          onClick={onBack}
          className="ios-press absolute top-4 right-4 w-8 h-8 rounded-full bg-primary-foreground/[0.08] flex items-center justify-center text-primary-foreground/40 hover:text-primary-foreground/70 hover:bg-primary-foreground/[0.12] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Photo */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gold/15 shadow-[0_8px_30px_-8px_hsl(40_40%_55%/0.15)]">
            <img src={professionalImg} alt="Dyoli Godim" className="w-full h-full object-cover object-top" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="font-heading text-2xl font-semibold text-primary-foreground tracking-wide">
            {mode === "signup" ? "Criar Conta" : "Entrar"}
          </h1>
          <p className="font-body text-[13px] text-primary-foreground/45 font-light">
            {mode === "signup"
              ? "Cadastre-se para agendar seu procedimento"
              : "Acesse sua conta para agendar"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <label className="font-body text-[11px] text-primary-foreground/40 uppercase tracking-widest font-medium">
                Nome
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo"
                className="w-full px-4 py-3 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[15px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-transparent focus:bg-primary-foreground/[0.07] transition-all duration-200"
                maxLength={100}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-body text-[11px] text-primary-foreground/40 uppercase tracking-widest font-medium">
              WhatsApp
            </label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(formatWhatsapp(e.target.value))}
              placeholder="(00) 00000-0000"
              className="w-full px-4 py-3 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[15px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-transparent focus:bg-primary-foreground/[0.07] transition-all duration-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-body text-[11px] text-primary-foreground/40 uppercase tracking-widest font-medium">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-3 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[15px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-transparent focus:bg-primary-foreground/[0.07] transition-all duration-200 pr-12"
                maxLength={72}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="ios-press absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-primary-foreground/25 hover:text-primary-foreground/50 hover:bg-primary-foreground/[0.06] transition-all"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-xl bg-rose/10 border border-rose/20">
              <p className="font-body text-[12px] text-rose text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="ios-press w-full py-3.5 rounded-2xl bg-rose text-primary-foreground font-body font-semibold text-[15px] tracking-wide shadow-[0_4px_20px_-4px_hsl(340_30%_50%/0.4)] disabled:opacity-40 disabled:cursor-not-allowed mt-2 transition-all duration-200"
          >
            {loading
              ? "Aguarde..."
              : mode === "signup"
              ? "Criar Conta"
              : "Entrar"}
          </button>
        </form>

        {/* Toggle mode */}
        <div className="text-center pb-1">
          <button
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setError("");
            }}
            className="font-body text-[13px] text-primary-foreground/35 hover:text-gold transition-colors duration-200"
          >
            {mode === "signup"
              ? "Já tenho conta · Entrar"
              : "Não tenho conta · Cadastrar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;