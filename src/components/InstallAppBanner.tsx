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
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 pt-2 pointer-events-none animate-fade-in">
      <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-gold/30 bg-charcoal/90 p-3 pr-2 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gold/30 bg-charcoal">
          <img src={logo} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-[15px] font-semibold leading-tight text-primary-foreground">
            Instale o app no seu celular
          </p>
          <p className="mt-0.5 font-body text-[11px] text-primary-foreground/55">
            Acesso rápido e lembretes na palma da mão.
          </p>
        </div>
        <button
          onClick={() => {
            dismiss();
            navigate("/instalar");
          }}
          className="ios-press flex shrink-0 items-center gap-1.5 rounded-full bg-gold px-3 py-2 text-[12px] font-semibold text-charcoal shadow-sm hover:bg-gold/90"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Instalar</span>
        </button>
        <button
          onClick={dismiss}
          aria-label="Fechar"
          className="ios-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary-foreground/50 hover:bg-primary-foreground/10 hover:text-primary-foreground/80"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default InstallAppBanner;
