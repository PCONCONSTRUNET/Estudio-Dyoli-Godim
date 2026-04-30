import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Smartphone, Wifi, WifiOff, Loader2, CheckCircle2, KeyRound, QrCode, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

// 🔌 Endpoints do backend (VPS fixa)
const BOT_BASE_URL = "http://178.105.54.230:3001";
const BOT_STATUS_URL = `${BOT_BASE_URL}/api/status`;
const BOT_PAIRING_URL = `${BOT_BASE_URL}/api/pairing-code`;
const POLL_INTERVAL_MS = 3000;

// Headers padrão para chamadas ao backend do robô.
const BOT_HEADERS = {} as const;

type ConnectMode = "qr" | "code";

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
  const [connectMode, setConnectMode] = useState<ConnectMode>("qr");
  const [phone, setPhone] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    document.title = "Estúdio Dyoli • Robô de Agendamento";
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch(BOT_STATUS_URL, {
        cache: "no-store",
        headers: BOT_HEADERS,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BotStatusResponse = await res.json();
      setStatus(data.status);
      if (data.qr) setQr(data.qr);
      setErrorMsg(null);
      setLastUpdate(new Date());
    } catch (err) {
      setErrorMsg(
        "Não foi possível conectar ao servidor do robô. Verifique se a VPS está online."
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

  // Polling continua ativo mesmo quando conectado, para detectar desconexão em tempo real
  const handleManualRefresh = async () => {
    setManualRefreshing(true);
    await fetchStatus();
    if (!intervalRef.current) {
      intervalRef.current = window.setInterval(fetchStatus, POLL_INTERVAL_MS);
    }
    setTimeout(() => setManualRefreshing(false), 500);
  };

  const handleGeneratePairingCode = async () => {
    setPairingError(null);
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) {
      setPairingError("Digite um número válido com DDD (ex: 11 91234-5678).");
      return;
    }
    setPairingLoading(true);
    try {
      const res = await fetch(BOT_PAIRING_URL, {
        method: "POST",
        cache: "no-store",
        headers: {
          ...BOT_HEADERS,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: digits }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { code?: string } = await res.json();
      if (!data.code) throw new Error("Resposta sem código");
      setPairingCode(data.code);
    } catch (err) {
      setPairingError(
        "Não foi possível gerar o código. Verifique o servidor e tente novamente."
      );
    } finally {
      setPairingLoading(false);
    }
  };

  const handleSwitchMode = (mode: ConnectMode) => {
    setConnectMode(mode);
    setPairingError(null);
    if (mode === "qr") {
      setPairingCode(null);
    }
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
      label: "Assistente Online",
      dotClass: "bg-success",
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
            Configuração do Assistente Virtual
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Painel privado de conexão do Assistente Virtual de WhatsApp
          </p>
          <div className="mt-3 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
        </div>

        {/* Estado: Assistente Online */}
        {isConnected ? (
          <div className="mb-6 flex flex-col items-center gap-3 rounded-3xl border border-success/40 bg-card/80 py-10 px-6 shadow-[0_20px_60px_-20px_hsl(var(--success)/0.4)] backdrop-blur-sm">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-success/10 border border-success/40">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/30" />
              <CheckCircle2 className="relative h-9 w-9 text-success" />
            </div>
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-success shadow-[0_0_12px_hsl(var(--success))]" />
              </span>
              <h2 className="font-heading text-4xl md:text-5xl font-semibold uppercase tracking-wide text-success">
                Assistente Online
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              O assistente já está respondendo no WhatsApp
            </p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
              Monitorando conexão • Última verificação: {lastUpdate.toLocaleTimeString("pt-BR")}
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

        {/* Card de conexão tematizado: QR ou Código */}
        {!isConnected && (
          <Card className="border border-gold/20 bg-card/80 shadow-[0_20px_60px_-25px_hsl(var(--rose)/0.3)] backdrop-blur-sm rounded-3xl overflow-hidden">
            <CardHeader className="pb-4 border-b border-gold/10">
              <CardTitle className="text-center font-heading text-xl font-medium text-foreground">
                {connectMode === "qr"
                  ? status === "QR_READY"
                    ? "Escaneie o QR Code"
                    : "Preparando QR Code..."
                  : pairingCode
                    ? "Seu código exclusivo"
                    : "Conectar via código"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6 pt-6">
              {connectMode === "qr" ? (
                <>
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

                  <div className="w-full pt-2 border-t border-gold/10">
                    <button
                      type="button"
                      onClick={() => handleSwitchMode("code")}
                      className="group w-full flex items-center justify-center gap-3 rounded-2xl border-2 border-rose/40 bg-gradient-to-r from-rose/10 via-gold/10 to-rose/10 px-5 py-4 shadow-[0_8px_30px_-12px_hsl(var(--rose)/0.5)] hover:border-rose hover:shadow-[0_12px_40px_-12px_hsl(var(--rose)/0.7)] hover:scale-[1.02] active:scale-[0.99] transition-all"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose text-primary-foreground shadow-md">
                        <KeyRound className="h-4 w-4" />
                      </span>
                      <span className="flex flex-col items-start text-left">
                        <span className="font-heading text-base font-semibold text-rose">
                          Conectar via código
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          Sem câmera • Use o número
                        </span>
                      </span>
                    </button>
                  </div>
                </>
              ) : pairingCode ? (
                <>
                  <div className="w-full rounded-2xl border-2 border-rose/40 bg-gradient-to-br from-rose/10 via-nude/40 to-gold/10 p-8 text-center shadow-inner">
                    <p className="font-body text-[11px] uppercase tracking-[0.3em] text-gold mb-3">
                      Código de pareamento
                    </p>
                    <p className="font-heading text-5xl md:text-6xl font-bold tracking-[0.25em] text-rose drop-shadow-sm break-all">
                      {pairingCode}
                    </p>
                  </div>

                  <p className="text-center text-sm text-muted-foreground px-2">
                    Abra o <strong className="text-foreground">WhatsApp do Studio</strong> →{" "}
                    <strong className="text-foreground">Aparelhos Conectados</strong> →{" "}
                    <strong className="text-foreground">Vincular com Número de Telefone</strong> e digite o código acima.
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Aguardando confirmação no celular... Última verificação: {lastUpdate.toLocaleTimeString("pt-BR")}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setPairingCode(null);
                        setPairingError(null);
                      }}
                      className="rounded-full border-gold/40"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Gerar outro código
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleSwitchMode("qr")}
                      className="rounded-full"
                    >
                      <QrCode className="h-4 w-4" />
                      Voltar para QR Code
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-full max-w-sm space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bot-phone" className="text-sm text-foreground">
                        Número do WhatsApp (com DDD)
                      </Label>
                      <Input
                        id="bot-phone"
                        type="tel"
                        inputMode="tel"
                        placeholder="Ex: 11 91234-5678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="rounded-full border-gold/30 bg-background/70 h-11 text-center tracking-wide"
                      />
                      {pairingError && (
                        <p className="text-xs text-destructive text-center">{pairingError}</p>
                      )}
                    </div>

                    <Button
                      type="button"
                      onClick={handleGeneratePairingCode}
                      disabled={pairingLoading}
                      size="lg"
                      className="w-full rounded-full bg-rose hover:bg-rose/90 text-primary-foreground shadow-md"
                    >
                      {pairingLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <KeyRound className="h-4 w-4" />
                      )}
                      Gerar Código Exclusivo
                    </Button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSwitchMode("qr")}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-rose hover:underline transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para o QR Code
                  </button>
                </>
              )}
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
