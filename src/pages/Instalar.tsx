import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Apple,
  Smartphone,
  Share,
  Plus,
  MoreVertical,
  Download,
  CheckCircle2,
  Sparkles,
  Bell,
  Zap,
  WifiOff,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";

type Platform = "ios" | "android";

const detectPlatform = (): Platform => {
  if (typeof navigator === "undefined") return "android";
  const ua = navigator.userAgent || navigator.vendor || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  return "android";
};

const Instalar = () => {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<Platform>("android");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    // Detect if already running as standalone PWA
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    setInstalled(!!isStandalone);
  }, []);

  const benefits = useMemo(
    () => [
      { icon: Bell, title: "Receba lembretes", desc: "Avisos do seu agendamento direto no celular." },
      { icon: Zap, title: "Acesso rápido", desc: "Abre como um app, sem precisar do navegador." },
      { icon: WifiOff, title: "Funciona offline", desc: "Veja seus agendamentos mesmo sem internet." },
      { icon: Sparkles, title: "Tela cheia", desc: "Visual limpo, sem barras do navegador." },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-heading text-xl font-semibold text-foreground">Instalar o app</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4">
        {/* Hero */}
        <section className="relative mt-8 overflow-hidden rounded-3xl border border-gold/20 bg-gradient-to-br from-charcoal via-charcoal to-[hsl(340_25%_18%)] p-8 text-center shadow-xl">
          <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-gold/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-rose/20 blur-3xl" />

          <div className="relative mx-auto mb-5 h-24 w-24 overflow-hidden rounded-3xl border border-gold/40 bg-charcoal shadow-lg shadow-gold/20">
            <img src={logo} alt="Estúdio Dyoli Godim" className="h-full w-full object-cover" />
          </div>
          <p className="font-body text-[10px] tracking-[0.3em] uppercase text-gold/80">
            Estúdio Dyoli Godim
          </p>
          <h2 className="mt-2 font-heading text-3xl font-semibold text-primary-foreground">
            Tenha o estúdio no seu bolso
          </h2>
          <p className="mt-3 text-sm text-primary-foreground/70">
            Instale nosso app no celular em poucos toques e tenha acesso rápido aos seus agendamentos,
            lembretes e novidades.
          </p>

          {installed && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              App já instalado neste dispositivo
            </div>
          )}
        </section>

        {/* Benefits */}
        <section className="mt-8 grid grid-cols-2 gap-3">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <b.icon className="h-4 w-4" />
              </div>
              <p className="font-heading text-base font-semibold text-foreground">{b.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </section>

        {/* Platform tabs */}
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-heading text-2xl font-semibold text-foreground">
              Passo a passo
            </h3>
            <span className="text-xs text-muted-foreground">
              Detectamos: {platform === "ios" ? "iPhone" : "Android"}
            </span>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 rounded-full bg-secondary p-1">
            <button
              onClick={() => setPlatform("ios")}
              className={`flex items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium transition ${
                platform === "ios"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              <Apple className="h-4 w-4" /> iPhone (iOS)
            </button>
            <button
              onClick={() => setPlatform("android")}
              className={`flex items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium transition ${
                platform === "android"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              <Smartphone className="h-4 w-4" /> Android
            </button>
          </div>

          {platform === "ios" ? <IosSteps /> : <AndroidSteps />}
        </section>

        {/* Tip box */}
        <section className="mt-8 rounded-2xl border border-gold/30 bg-gold/5 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="font-heading text-base font-semibold text-foreground">
                Dica para receber notificações
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {platform === "ios"
                  ? "No iPhone, as notificações só funcionam após instalar o app na tela de início. Depois de instalar, abra o app uma vez e confirme as notificações no seu perfil."
                  : "No Android funciona direto pelo Chrome, mesmo sem instalar — mas instalando você recebe avisos com mais destaque e abre o app em tela cheia."}
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-10 text-center">
          <Button
            onClick={() => navigate("/")}
            className="h-12 rounded-full bg-primary px-8 text-base font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
          >
            Voltar ao início
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            Precisa de ajuda? Fale com a Dyoli no WhatsApp.
          </p>
        </section>
      </main>
    </div>
  );
};

/* ----------------- iOS steps ----------------- */
const IosSteps = () => {
  return (
    <ol className="space-y-3">
      <Step
        n={1}
        title="Abra este site no Safari"
        desc="Importante: o passo a passo só funciona no navegador Safari (não funciona no Chrome do iPhone)."
        icon={<Apple className="h-5 w-5" />}
      />
      <Step
        n={2}
        title='Toque no ícone de "Compartilhar"'
        desc="É o quadrado com uma seta para cima, na barra inferior do Safari."
        icon={<Share className="h-5 w-5" />}
      />
      <Step
        n={3}
        title='Selecione "Adicionar à Tela de Início"'
        desc="Role o menu para baixo se não encontrar essa opção logo."
        icon={<Plus className="h-5 w-5" />}
      />
      <Step
        n={4}
        title='Toque em "Adicionar"'
        desc="Pronto! O ícone do Estúdio Dyoli aparecerá na sua tela inicial como um app."
        icon={<CheckCircle2 className="h-5 w-5" />}
        isLast
      />
    </ol>
  );
};

/* ----------------- Android steps ----------------- */
const AndroidSteps = () => {
  return (
    <ol className="space-y-3">
      <Step
        n={1}
        title="Abra este site no Chrome"
        desc="Funciona também no Edge, Brave e Samsung Internet."
        icon={<Smartphone className="h-5 w-5" />}
      />
      <Step
        n={2}
        title='Toque no menu (⋮) no canto superior direito'
        desc="É o ícone com três pontinhos verticais."
        icon={<MoreVertical className="h-5 w-5" />}
      />
      <Step
        n={3}
        title='Selecione "Instalar app" ou "Adicionar à tela inicial"'
        desc="O nome muda conforme o navegador, mas a ação é a mesma."
        icon={<Download className="h-5 w-5" />}
      />
      <Step
        n={4}
        title='Confirme tocando em "Instalar"'
        desc="Pronto! O app abrirá em tela cheia e ficará disponível na sua gaveta de aplicativos."
        icon={<CheckCircle2 className="h-5 w-5" />}
        isLast
      />
    </ol>
  );
};

/* ----------------- Step item ----------------- */
const Step = ({
  n,
  title,
  desc,
  icon,
  isLast,
}: {
  n: number;
  title: string;
  desc: string;
  icon: React.ReactNode;
  isLast?: boolean;
}) => (
  <li className="relative flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
    <div className="flex shrink-0 flex-col items-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
        <span className="font-heading text-base font-semibold">{n}</span>
      </div>
      {!isLast && <div className="mt-2 w-px flex-1 bg-border" />}
    </div>
    <div className="flex-1 pb-1">
      <div className="mb-1 flex items-center gap-2 text-foreground">
        <span className="text-primary">{icon}</span>
        <p className="font-heading text-base font-semibold leading-tight">{title}</p>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  </li>
);

export default Instalar;
