import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Download, X } from "lucide-react";
import logo from "@/assets/logo.png";

const STORAGE_KEY = "install-banner-dismissed-at";
const SNOOZE_DAYS = 5;

const InstallAppBanner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Hide on admin/auth/instalar pages
    const path = location.pathname;
    if (path.startsWith("/admin") || path.startsWith("/auth") || path.startsWith("/instalar")) {
      setVisible(false);
      return;
    }

    // Hide if already running as PWA
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (isStandalone) return;

    // Snooze check
    try {
      const dismissedAt = localStorage.getItem(STORAGE_KEY);
      if (dismissedAt) {
        const elapsed = Date.now() - Number(dismissedAt);
        if (elapsed < SNOOZE_DAYS * 24 * 60 * 60 * 1000) return;
      }
    } catch {
      // ignore
    }

    // Show after a small delay so it doesn't fight with page load animation
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, [location.pathname]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-3 pt-2 pointer-events-none animate-fade-in">
      <div className="pointer-events-auto mx-auto flex max-w-[340px] items-center gap-2.5 rounded-2xl border border-gold/30 bg-charcoal/90 p-2 pr-1.5 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-gold/30 bg-charcoal">
          <img src={logo} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-[12.5px] font-semibold leading-tight text-primary-foreground">
            Instale o app no celular
          </p>
          <p className="mt-0.5 font-body text-[10px] leading-tight text-primary-foreground/55">
            Acesso rápido e lembretes.
          </p>
        </div>
        <button
          onClick={() => {
            dismiss();
            navigate("/instalar");
          }}
          className="ios-press flex shrink-0 items-center gap-1 rounded-full bg-gold px-2.5 py-1.5 text-[11px] font-semibold text-charcoal shadow-sm hover:bg-gold/90"
        >
          <Download className="h-3 w-3" />
          <span>Instalar</span>
        </button>
        <button
          onClick={dismiss}
          aria-label="Fechar"
          className="ios-press flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-primary-foreground/50 hover:bg-primary-foreground/10 hover:text-primary-foreground/80"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default InstallAppBanner;
