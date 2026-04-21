import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Smartphone, Wifi, WifiOff, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// 🔌 Endpoint do backend (provisório via Ngrok até subir na VPS definitiva)
const BOT_STATUS_URL = "https://graffiti-plunging-ravine.ngrok-free.dev/api/status";
const POLL_INTERVAL_MS = 3000;

type BotStatus = "WAITING" | "QR_READY" | "CONNECTED" | "ERROR";

interface BotStatusResponse {
  status: BotStatus;
  qr?: string; // base64 (data:image/png;base64,... ou só o conteúdo base64)
}

const AdminBotWpp = () => {
  const [status, setStatus] = useState<BotStatus>("WAITING");
  const [qr, setQr] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    document.title = "Configuração do Robô de Agendamento";
  }, []);

  // Função que faz o GET no backend local
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

  // Polling a cada 3s
  useEffect(() => {
    fetchStatus();
    intervalRef.current = window.setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  // Para o polling quando o robô estiver conectado (economiza requests)
  useEffect(() => {
    if (status === "CONNECTED" && intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [status]);

  const handleManualRefresh = async () => {
    setManualRefreshing(true);
    await fetchStatus();
    // Reinicia o polling caso ele tenha parado
    if (!intervalRef.current && status !== "CONNECTED") {
      intervalRef.current = window.setInterval(fetchStatus, POLL_INTERVAL_MS);
    }
    setTimeout(() => setManualRefreshing(false), 500);
  };

  // Normaliza o QR base64 — aceita "data:image/...;base64,XXX" ou só "XXX"
  const qrSrc =
    qr && (qr.startsWith("data:image") ? qr : `data:image/png;base64,${qr}`);

  // Configuração visual do indicador de status
  const statusConfig: Record<
    BotStatus,
    {
      label: string;
      dot: string;
      variant: "default" | "secondary" | "destructive";
      icon: typeof Wifi;
    }
  > = {
    WAITING: {
      label: "Iniciando Robô...",
      dot: "bg-destructive",
      variant: "destructive",
      icon: Loader2,
    },
    QR_READY: {
      label: "Aguardando Leitura do QR",
      dot: "bg-yellow-500",
      variant: "secondary",
      icon: WifiOff,
    },
    CONNECTED: {
      label: "Robô Online",
      dot: "bg-green-500",
      variant: "default",
      icon: Wifi,
    },
    ERROR: {
      label: "Erro de Conexão",
      dot: "bg-destructive",
      variant: "destructive",
      icon: WifiOff,
    },
  };

  const current = statusConfig[status];
  const StatusIcon = current.icon;
  const isConnected = status === "CONNECTED";

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl md:text-4xl font-semibold text-foreground">
            Configuração do Robô de Agendamento
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Painel de conexão do assistente de WhatsApp
          </p>
        </div>

        {/* Status — versão grande quando online */}
        {isConnected ? (
          <div className="mb-6 flex flex-col items-center gap-3 rounded-2xl border-2 border-green-500/30 bg-green-500/10 py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <h2 className="font-heading text-4xl md:text-5xl font-bold uppercase tracking-wide text-green-500">
              Robô Online
            </h2>
            <p className="text-sm text-muted-foreground">
              O assistente já está respondendo no WhatsApp
            </p>
          </div>
        ) : (
          <div className="mb-6 flex justify-center">
            <Badge
              variant={current.variant}
              className="gap-2 px-4 py-2 text-sm font-medium shadow-sm"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={cn(
                    "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                    current.dot
                  )}
                />
                <span
                  className={cn(
                    "relative inline-flex h-2.5 w-2.5 rounded-full",
                    current.dot
                  )}
                />
              </span>
              <StatusIcon
                className={cn(
                  "h-3.5 w-3.5",
                  status === "WAITING" && "animate-spin"
                )}
              />
              {current.label}
            </Badge>
          </div>
        )}

        {/* QR Card — escondido quando conectado */}
        {!isConnected && (
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-center text-lg font-medium">
                {status === "QR_READY"
                  ? "Escaneie o QR Code"
                  : "Preparando QR Code..."}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <div className="relative rounded-2xl border-2 border-dashed border-border bg-muted/30 p-6">
                {status === "QR_READY" && qrSrc ? (
                  <div className="rounded-lg bg-white p-2">
                    <img
                      src={qrSrc}
                      alt="QR Code WhatsApp"
                      className="h-[256px] w-[256px] rounded"
                    />
                  </div>
                ) : (
                  <div className="flex h-[256px] w-[256px] flex-col items-center justify-center gap-3 text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-sm font-medium text-foreground">
                      {status === "WAITING"
                        ? "Iniciando Robô..."
                        : "Aguardando QR Code"}
                    </p>
                    <p className="text-xs text-muted-foreground">
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
                className="w-full sm:w-auto"
              >
                <RefreshCw
                  className={cn("h-4 w-4", manualRefreshing && "animate-spin")}
                />
                Gerar novo QR Code / Atualizar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Instruções — só faz sentido quando ainda não conectou */}
        {!isConnected && (
          <Card className="mt-6 border bg-muted/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Smartphone className="h-5 w-5 text-primary" />
                Como conectar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    1
                  </span>
                  <span className="text-muted-foreground pt-0.5">
                    Abra o <strong className="text-foreground">WhatsApp</strong> no seu celular
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    2
                  </span>
                  <span className="text-muted-foreground pt-0.5">
                    Toque em <strong className="text-foreground">Configurações</strong> →{" "}
                    <strong className="text-foreground">Aparelhos conectados</strong>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    3
                  </span>
                  <span className="text-muted-foreground pt-0.5">
                    Toque em <strong className="text-foreground">Conectar um aparelho</strong> e
                    aponte a câmera para esta tela
                  </span>
                </li>
              </ol>
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-center text-[11px] text-muted-foreground/60">
          Página privada • Polling a cada 3s em {BOT_STATUS_URL}
        </p>
      </div>
    </div>
  );
};

export default AdminBotWpp;
