import { useEffect, useState } from "react";
import { Bell, X, Sparkles } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";

const STORAGE_KEY = "push-prompt-asked-v1";
const DELAY_MS = 2500;

interface Props {
  /** Pages where the prompt should NOT appear (e.g. ["/admin"]) */
  excludePaths?: string[];
}

const PushPromptModal = ({ excludePaths = ["/admin"] }: Props) => {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const { supported, permission, subscribed, loading, enable } =
    usePushNotifications({ role: "cliente", autoInit: true });

  useEffect(() => {
    // Excluded routes
    if (excludePaths.some((p) => window.location.pathname.startsWith(p))) return;
    // Already asked
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Browser doesn't support
    if (!supported) return;
    // Already granted or denied — no point asking
    if (permission === "granted" || permission === "denied") return;
    // Already subscribed
    if (subscribed) return;

    const t = setTimeout(() => setOpen(true), DELAY_MS);
    return () => clearTimeout(t);
  }, [supported, permission, subscribed, excludePaths]);

  const dismiss = () => {
    setClosing(true);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setTimeout(() => setOpen(false), 200);
  };

  const handleEnable = async () => {
    const ok = await enable();
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    if (ok) {
      setClosing(true);
      setTimeout(() => setOpen(false), 200);
    } else {
      // Permission denied or failed — close anyway
      setClosing(true);
      setTimeout(() => setOpen(false), 200);
    }
  };

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0 ${
        closing ? "animate-fade-out" : "animate-fade-in"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-sm rounded-3xl border border-primary-foreground/[0.08] bg-charcoal/95 backdrop-blur-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.7)] overflow-hidden ${
          closing ? "animate-scale-out" : "animate-scale-in"
        }`}
      >
        {/* Close (X) */}
        <button
          onClick={dismiss}
          aria-label="Fechar"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary-foreground/[0.08] flex items-center justify-center text-primary-foreground/40 hover:text-primary-foreground/80 hover:bg-primary-foreground/[0.12] transition-all z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Glow header */}
        <div className="relative px-6 pt-8 pb-4">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-gold/[0.15] rounded-full blur-3xl" />
          <div className="relative flex justify-center mb-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/30 to-rose/20 border border-gold/30 flex items-center justify-center shadow-[0_8px_24px_-8px_hsl(40_50%_60%/0.4)]">
                <Bell className="w-7 h-7 text-gold" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-gold animate-pulse" />
            </div>
          </div>
          <h2 className="text-center font-heading text-[20px] font-semibold text-primary-foreground leading-tight">
            Receber lembretes do seu agendamento?
          </h2>
          <p className="text-center font-body text-[13px] text-primary-foreground/55 mt-2 leading-relaxed">
            Avisaremos sobre confirmações, lembretes e novidades —
            mesmo com o app fechado.
          </p>
        </div>

        {/* Benefits */}
        <div className="px-6 pb-5 space-y-2">
          {[
            "Lembrete antes do seu horário",
            "Confirmação imediata do agendamento",
            "Promoções exclusivas (raro)",
          ].map((b) => (
            <div key={b} className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
              <p className="font-body text-[13px] text-primary-foreground/75">{b}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-2.5">
          <button
            onClick={handleEnable}
            disabled={loading}
            className="ios-press w-full py-3.5 rounded-2xl bg-gradient-to-r from-gold to-rose text-charcoal font-body text-[15px] font-semibold shadow-[0_4px_20px_-4px_hsl(40_50%_60%/0.5)] disabled:opacity-60 transition-all"
          >
            {loading ? "Ativando..." : "Permitir notificações"}
          </button>
          <button
            onClick={dismiss}
            className="ios-press w-full py-3 rounded-2xl text-primary-foreground/50 font-body text-[14px] font-medium hover:text-primary-foreground/80 transition-all"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
};

export default PushPromptModal;
