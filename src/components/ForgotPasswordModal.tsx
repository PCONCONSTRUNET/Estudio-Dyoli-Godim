import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Check, Loader2 } from "lucide-react";

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
  initialWhatsapp?: string;
}

const formatWhatsapp = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const ForgotPasswordModal = ({ open, onClose, initialWhatsapp = "" }: ForgotPasswordModalProps) => {
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  if (!open) return null;

  const handleClose = () => {
    setError("");
    setSent(false);
    setEmail("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const digits = whatsapp.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Informe um WhatsApp válido");
      return;
    }
    const mail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setError("Informe um e-mail válido");
      return;
    }

    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("request-password-reset", {
        body: { whatsapp: digits, email: mail },
      });
      if (fnError || !data?.success) {
        setError(data?.error || "Não foi possível enviar agora. Tente novamente.");
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-sm rounded-3xl border border-primary-foreground/[0.08] bg-charcoal/95 backdrop-blur-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.7)] px-7 py-6 space-y-4 animate-scale-in">
        <button
          onClick={handleClose}
          className="ios-press absolute top-4 right-4 w-8 h-8 rounded-full bg-primary-foreground/[0.08] flex items-center justify-center text-primary-foreground/50 hover:text-primary-foreground/80"
        >
          <X className="w-4 h-4" />
        </button>

        <header className="text-center space-y-1 pr-6">
          <h2 className="font-heading text-xl font-semibold text-primary-foreground">
            Esqueci minha senha
          </h2>
          <p className="font-body text-[12px] text-primary-foreground/45 font-light leading-relaxed">
            Vamos enviar um link de redefinição para o e-mail que você informar.
          </p>
        </header>

        {sent ? (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col items-center gap-3 px-3 py-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Check className="w-8 h-8 text-emerald-400" />
              <p className="font-body text-[13px] text-primary-foreground/85 text-center leading-relaxed">
                Se o WhatsApp estiver cadastrado, o link foi enviado.
                <br />
                <span className="text-primary-foreground/50">Verifique sua caixa de entrada e spam.</span>
              </p>
            </div>
            <button
              onClick={handleClose}
              className="ios-press w-full py-3 rounded-full bg-primary-foreground/[0.08] text-primary-foreground font-body font-medium text-[14px]"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="font-body text-[11px] text-primary-foreground/40 uppercase tracking-widest font-medium">
                WhatsApp do cadastro
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatWhatsapp(e.target.value))}
                placeholder="(00) 00000-0000"
                className="w-full px-4 py-3 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[15px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-body text-[11px] text-primary-foreground/40 uppercase tracking-widest font-medium">
                E-mail para receber o link
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                maxLength={255}
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[15px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20"
              />
            </div>

            {error && (
              <div className="px-3 py-2 rounded-xl bg-rose/10 border border-rose/20">
                <p className="font-body text-[12px] text-rose text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="ios-press w-full py-3.5 rounded-full bg-rose text-primary-foreground font-body font-semibold text-[15px] tracking-wide shadow-[0_4px_20px_-4px_hsl(340_30%_50%/0.4)] disabled:opacity-40 mt-2 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Enviando..." : "Enviar link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
