import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

interface AuthScreenProps {
  onSuccess: () => void;
  onBack: () => void;
}

type AuthMode = "login" | "signup";

const AuthScreen = ({ onSuccess, onBack }: AuthScreenProps) => {
  const [mode, setMode] = useState<AuthMode>("signup");
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
    <section className="relative min-h-screen flex flex-col bg-charcoal">
      {/* Header */}
      <div className="relative z-10 pt-6 px-6 flex items-center">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-primary-foreground/60 hover:text-primary-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="font-heading text-2xl font-semibold text-primary-foreground tracking-wide">
              {mode === "signup" ? "Criar Conta" : "Entrar"}
            </h1>
            <p className="font-body text-sm text-primary-foreground/60">
              {mode === "signup"
                ? "Cadastre-se para agendar seu procedimento"
                : "Acesse sua conta para agendar"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="font-body text-xs text-primary-foreground/50 uppercase tracking-wider">
                  Nome
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full px-4 py-3.5 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10 text-primary-foreground font-body text-sm placeholder:text-primary-foreground/30 focus:outline-none focus:border-gold/50 transition-colors"
                  maxLength={100}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="font-body text-xs text-primary-foreground/50 uppercase tracking-wider">
                WhatsApp
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatWhatsapp(e.target.value))}
                placeholder="(00) 00000-0000"
                className="w-full px-4 py-3.5 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10 text-primary-foreground font-body text-sm placeholder:text-primary-foreground/30 focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-body text-xs text-primary-foreground/50 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-3.5 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10 text-primary-foreground font-body text-sm placeholder:text-primary-foreground/30 focus:outline-none focus:border-gold/50 transition-colors pr-12"
                  maxLength={72}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-foreground/40 hover:text-primary-foreground/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="font-body text-xs text-rose text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-lg bg-rose text-primary-foreground font-body font-medium text-sm tracking-wide uppercase transition-all duration-300 hover:brightness-110 active:scale-[0.98] shadow-lg shadow-rose/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading
                ? "Aguarde..."
                : mode === "signup"
                ? "Criar Conta"
                : "Entrar"}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="text-center">
            <button
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setError("");
              }}
              className="font-body text-sm text-primary-foreground/50 hover:text-gold transition-colors"
            >
              {mode === "signup"
                ? "Já tenho conta · Entrar"
                : "Não tenho conta · Cadastrar"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AuthScreen;
