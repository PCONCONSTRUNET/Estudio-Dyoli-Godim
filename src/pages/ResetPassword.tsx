import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Check, AlertCircle, Loader2 } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const [errorMsg, setErrorMsg] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    document.title = "Redefinir senha · Estúdio Dyoli";
    if (!token) {
      setStatus("invalid");
      setErrorMsg("Link inválido ou incompleto.");
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("confirm-password-reset", {
          body: { token, action: "validate" },
        });
        if (error || !data?.valid) {
          setStatus("invalid");
          setErrorMsg(data?.error || "Link inválido ou expirado.");
        } else {
          setStatus("ready");
        }
      } catch {
        setStatus("invalid");
        setErrorMsg("Não conseguimos validar o link. Tente novamente.");
      }
    })();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (senha.length < 6) {
      setSubmitError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmaSenha) {
      setSubmitError("As senhas não conferem.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-password-reset", {
        body: { token, newPassword: senha },
      });
      if (error || !data?.success) {
        setSubmitError(data?.error || "Não foi possível redefinir a senha.");
        setSubmitting(false);
        return;
      }
      setStatus("done");
    } catch {
      setSubmitError("Erro ao redefinir. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4 overflow-hidden">
      <div
        className="absolute inset-0 animate-bg-drift"
        style={{
          background:
            "linear-gradient(135deg, hsl(0 0% 8%) 0%, hsl(30 15% 12%) 25%, hsl(20 10% 10%) 50%, hsl(0 0% 9%) 75%, hsl(30 20% 11%) 100%)",
          backgroundSize: "400% 400%",
        }}
      />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gold/[0.025] blur-[150px] animate-hero-glow" />

      <div className="relative w-full max-w-sm rounded-3xl border border-primary-foreground/[0.08] bg-charcoal/70 backdrop-blur-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.6)] px-7 py-8 space-y-5 animate-scale-in">
        <header className="text-center space-y-1">
          <h1 className="font-heading text-2xl font-semibold text-primary-foreground tracking-wide">
            Redefinir senha
          </h1>
          <p className="font-body text-[13px] text-primary-foreground/45 font-light">
            Estúdio Dyoli
          </p>
        </header>

        {status === "checking" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-6 h-6 text-gold animate-spin" />
            <p className="font-body text-[13px] text-primary-foreground/50">Validando link...</p>
          </div>
        )}

        {status === "invalid" && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3 px-3 py-5 rounded-xl bg-rose/10 border border-rose/20">
              <AlertCircle className="w-7 h-7 text-rose" />
              <p className="font-body text-[13px] text-primary-foreground/80 text-center">{errorMsg}</p>
            </div>
            <button
              onClick={() => navigate("/auth?mode=login")}
              className="ios-press w-full py-3.5 rounded-full bg-rose text-primary-foreground font-body font-semibold text-[15px]"
            >
              Voltar para o login
            </button>
          </div>
        )}

        {status === "done" && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3 px-3 py-5 rounded-xl bg-success/10 border border-success/20">
              <Check className="w-8 h-8 text-success" />
              <p className="font-body text-[14px] text-primary-foreground/90 text-center">
                Senha redefinida com sucesso!
              </p>
            </div>
            <button
              onClick={() => navigate("/auth?mode=login")}
              className="ios-press w-full py-3.5 rounded-full bg-rose text-primary-foreground font-body font-semibold text-[15px]"
            >
              Fazer login
            </button>
          </div>
        )}

        {status === "ready" && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="font-body text-[11px] text-primary-foreground/40 uppercase tracking-widest font-medium">
                Nova senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  maxLength={72}
                  className="w-full px-4 py-3 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[15px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="ios-press absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-primary-foreground/30 hover:text-primary-foreground/60"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-body text-[11px] text-primary-foreground/40 uppercase tracking-widest font-medium">
                Confirmar senha
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmaSenha}
                onChange={(e) => setConfirmaSenha(e.target.value)}
                placeholder="Repita a nova senha"
                maxLength={72}
                className="w-full px-4 py-3 rounded-xl bg-primary-foreground/[0.05] border border-primary-foreground/[0.06] text-primary-foreground font-body text-[15px] placeholder:text-primary-foreground/20 focus:outline-none focus:ring-2 focus:ring-gold/20"
              />
            </div>

            {submitError && (
              <div className="px-3 py-2 rounded-xl bg-rose/10 border border-rose/20">
                <p className="font-body text-[12px] text-rose text-center">{submitError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="ios-press w-full py-3.5 rounded-full bg-rose text-primary-foreground font-body font-semibold text-[15px] tracking-wide shadow-[0_4px_20px_-4px_hsl(340_30%_50%/0.4)] disabled:opacity-40 mt-2"
            >
              {submitting ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
