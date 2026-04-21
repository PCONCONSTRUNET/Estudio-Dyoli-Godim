import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Smartphone, Wifi, WifiOff, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

// 🔌 Endpoint do backend (provisório via Ngrok até subir na VPS definitiva)
const BOT_STATUS_URL = "https://graffiti-plunging-ravine.ngrok-free.dev/api/status";
const POLL_INTERVAL_MS = 3000;

type BotStatus = "WAITING" | "QR_READY" | "CONNECTED" | "ERROR";

interface BotStatusResponse {
  status: BotStatus;
  qr?: string;
}

const AdminBotWpp = () => {
  const [status, setStatus] = useState<BotStatus>("WAITING");
  const [qr, setQr] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    document.title = "Estúdio Dyoli • Robô de Agendamento";
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch(BOT_STATUS_URL, {
        cache: "no-store",
        headers: {
          "ngrok-skip-browser-warning": "true",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BotStatusResponse = await res.json();
      setStatus(data.status);
      if (data.qr) setQr(data.qr);
      setErrorMsg(null);
      setLastUpdate(new Date());
    } catch (err) {
      setErrorMsg(
        "Não foi possível conectar ao servidor do robô. Verifique se o túnel Ngrok está ativo."
      );
    }
  };

  useEffect(() => {
    fetchStatus();
    intervalRef.current = window.setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (status === "CONNECTED" && intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [status]);

  const handleManualRefresh = async () => {
    setManualRefreshing(true);
    await fetchStatus();
    if (!intervalRef.current && status !== "CONNECTED") {
      intervalRef.current = window.setInterval(fetchStatus, POLL_INTERVAL_MS);
    }
    setTimeout(() => setManualRefreshing(false), 500);
  };

  const qrSrc =
    qr && (qr.startsWith("data:image") ? qr : `data:image/png;base64,${qr}`);

  const statusConfig: Record<
    BotStatus,
    {
      label: string;
      dotClass: string;
      icon: typeof Wifi;
    }
  > = {
    WAITING: {
      label: "Iniciando Robô...",
      dotClass: "bg-gold",
      icon: Loader2,
    },
    QR_READY: {
      label: "Aguardando Leitura do QR",
      dotClass: "bg-gold",
      icon: WifiOff,
    },
    CONNECTED: {
      label: "Robô Online",
      dotClass: "bg-rose",
      icon: Wifi,
    },
    ERROR: {
      label: "Erro de Conexão",
      dotClass: "bg-destructive",
      icon: WifiOff,
    },
  };

  const current = statusConfig[status];
  const StatusIcon = current.icon;
  const isConnected = status === "CONNECTED";

  return (
    <div className="min-h-screen bg-gradient-to-b from-nude via-background to-nude py-10 px-4">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header com logo da Dyoli */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-gold/40 bg-charcoal shadow-lg">
              <img
                src={logo}
                alt="Estúdio Dyoli Godim"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <p className="font-body text-[11px] uppercase tracking-[0.25em] text-gold">
            Estúdio Dyoli Godim
          </p>
          <h1 className="mt-2 font-heading text-3xl md:text-4xl font-semibold text-foreground">
            Configuração do Robô de Agendamento
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Painel privado de conexão do assistente de WhatsApp
          </p>
          <div className="mt-3 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
        </div>

        {/* Estado: Robô Online */}
        {isConnected ? (
          <div className="mb-6 flex flex-col items-center gap-3 rounded-3xl border border-rose/30 bg-card/80 py-10 px-6 shadow-[0_20px_60px_-20px_hsl(var(--rose)/0.4)] backdrop-blur-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose/10 border border-rose/30">
              <CheckCircle2 className="h-9 w-9 text-rose" />
            </div>
            <h2 className="font-heading text-4xl md:text-5xl font-semibold uppercase tracking-wide text-rose">
              Robô Online
            </h2>
            <p className="text-sm text-muted-foreground">
              O assistente já está respondendo no WhatsApp
            </p>
          </div>
        ) : (
          /* Status badge tematizado */
          <div className="mb-6 flex justify-center">
            <div className="flex items-center gap-2.5 rounded-full border border-gold/30 bg-card/70 px-5 py-2.5 shadow-sm backdrop-blur-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={cn(
                    "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                    current.dotClass
                  )}
                />
                <span
                  className={cn(
                    "relative inline-flex h-2.5 w-2.5 rounded-full",
                    current.dotClass
                  )}
                />
              </span>
              <StatusIcon
                className={cn(
                  "h-3.5 w-3.5 text-foreground",
                  status === "WAITING" && "animate-spin"
                )}
              />
              <span className="font-body text-sm font-medium text-foreground">
                {current.label}
              </span>
            </div>
          </div>
        )}

        {/* QR Card tematizado */}
        {!isConnected && (
          <Card className="border border-gold/20 bg-card/80 shadow-[0_20px_60px_-25px_hsl(var(--rose)/0.3)] backdrop-blur-sm rounded-3xl overflow-hidden">
            <CardHeader className="pb-4 border-b border-gold/10">
              <CardTitle className="text-center font-heading text-xl font-medium text-foreground">
                {status === "QR_READY"
                  ? "Escaneie o QR Code"
                  : "Preparando QR Code..."}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6 pt-6">
              <div className="relative rounded-2xl border-2 border-dashed border-gold/40 bg-nude/40 p-6">
                {status === "QR_READY" && qrSrc ? (
                  <div className="rounded-xl bg-white p-3 shadow-md">
                    <img
                      src={qrSrc}
                      alt="QR Code WhatsApp"
                      className="h-[256px] w-[256px] rounded"
                    />
                  </div>
                ) : (
                  <div className="flex h-[256px] w-[256px] flex-col items-center justify-center gap-3 text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-rose" />
                    <p className="font-heading text-base font-medium text-foreground">
                      {status === "WAITING"
                        ? "Iniciando Robô..."
                        : "Aguardando QR Code"}
                    </p>
                    <p className="text-xs text-muted-foreground px-4">
                      {errorMsg ?? "Verificando status do servidor a cada 3s"}
                    </p>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Última verificação: {lastUpdate.toLocaleTimeString("pt-BR")}
              </p>

              <Button
                onClick={handleManualRefresh}
                disabled={manualRefreshing}
                size="lg"
                className="w-full sm:w-auto rounded-full bg-rose hover:bg-rose/90 text-primary-foreground shadow-md"
              >
                <RefreshCw
                  className={cn("h-4 w-4", manualRefreshing && "animate-spin")}
                />
                Gerar novo QR Code / Atualizar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Instruções tematizadas */}
        {!isConnected && (
          <Card className="mt-6 border border-gold/20 bg-card/60 backdrop-blur-sm rounded-3xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-heading text-lg font-medium text-foreground">
                <Smartphone className="h-5 w-5 text-rose" />
                Como conectar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                {[
                  <>Abra o <strong className="text-foreground">WhatsApp</strong> no seu celular</>,
                  <>
                    Toque em <strong className="text-foreground">Configurações</strong> →{" "}
                    <strong className="text-foreground">Aparelhos conectados</strong>
                  </>,
                  <>
                    Toque em <strong className="text-foreground">Conectar um aparelho</strong> e
                    aponte a câmera para esta tela
                  </>,
                ].map((text, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose text-xs font-semibold text-primary-foreground shadow-sm">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground pt-1">{text}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        <p className="mt-8 text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60">
          Estúdio Dyoli Godim • Página privada
        </p>
      </div>
    </div>
  );
};

export default AdminBotWpp;
