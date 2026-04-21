import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Smartphone, Wifi, WifiOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ConnectionStatus = "waiting" | "connecting" | "online" | "expired";

const AdminBotWpp = () => {
  // Placeholder QR — substitua por um base64/string vinda da sua VPS
  const [qrValue, setQrValue] = useState<string>(
    "https://wa.me/qr/PLACEHOLDER-AGUARDANDO-VPS"
  );
  const [status, setStatus] = useState<ConnectionStatus>("waiting");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Define o título da página
  useEffect(() => {
    document.title = "Configuração do Robô de Agendamento";
  }, []);

  /**
   * 🔌 PONTO DE INTEGRAÇÃO COM A VPS
   * --------------------------------------------------
   * Quando a VPS estiver pronta, substitua o conteúdo
   * de fetchQrFromServer() por uma chamada real, ex:
   *
   *   const res = await fetch("https://sua-vps.com/bot/qr");
   *   const data = await res.json();
   *   setQrValue(data.qrBase64); // string ou data:image/png;base64,...
   *   setStatus(data.connected ? "online" : "waiting");
   *
   * O componente já aceita tanto strings quanto data-URLs base64.
   */
  const fetchQrFromServer = async () => {
    setRefreshing(true);
    try {
      // MOCK: simula uma atualização do QR
      await new Promise((r) => setTimeout(r, 800));
      setQrValue(`https://wa.me/qr/MOCK-${Date.now()}`);
      setStatus("waiting");
      setLastUpdate(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  const statusConfig: Record<
    ConnectionStatus,
    { label: string; dot: string; variant: "default" | "secondary" | "destructive"; icon: typeof Wifi }
  > = {
    waiting: {
      label: "Aguardando Leitura",
      dot: "bg-orange-500",
      variant: "secondary",
      icon: WifiOff,
    },
    connecting: {
      label: "Conectando...",
      dot: "bg-yellow-500",
      variant: "secondary",
      icon: Loader2,
    },
    online: {
      label: "Robô Online",
      dot: "bg-green-500",
      variant: "default",
      icon: Wifi,
    },
    expired: {
      label: "QR Code Expirado",
      dot: "bg-destructive",
      variant: "destructive",
      icon: WifiOff,
    },
  };

  const current = statusConfig[status];
  const StatusIcon = current.icon;

  // Detecta se o valor é base64/dataURL (vai virar <img>) ou string normal (canvas)
  const isImageData =
    qrValue.startsWith("data:image") || qrValue.startsWith("http") === false && qrValue.length > 200;

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

        {/* Status Badge */}
        <div className="mb-6 flex justify-center">
          <Badge
            variant={current.variant}
            className="gap-2 px-4 py-2 text-sm font-medium shadow-sm"
          >
            <span className="relative flex h-2.5 w-2.5">
              {status === "online" && (
                <span
                  className={cn(
                    "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                    current.dot
                  )}
                />
              )}
              <span
                className={cn(
                  "relative inline-flex h-2.5 w-2.5 rounded-full",
                  current.dot
                )}
              />
            </span>
            <StatusIcon
              className={cn("h-3.5 w-3.5", status === "connecting" && "animate-spin")}
            />
            {current.label}
          </Badge>
        </div>

        {/* QR Code Card */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-lg font-medium">
              Escaneie o QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            {/* QR Box */}
            <div className="relative rounded-2xl border-2 border-dashed border-border bg-muted/30 p-6">
              {status === "online" ? (
                <div className="flex h-[256px] w-[256px] flex-col items-center justify-center gap-3 text-center">
                  <Wifi className="h-16 w-16 text-green-500" />
                  <p className="text-sm font-medium text-foreground">
                    Conectado com sucesso!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    O robô já está respondendo no WhatsApp
                  </p>
                </div>
              ) : isImageData ? (
                // Caso a VPS envie um base64/data URL, exibe como imagem
                <img
                  src={qrValue}
                  alt="QR Code WhatsApp"
                  className="h-[256px] w-[256px] rounded-lg"
                />
              ) : (
                <QRCodeCanvas
                  value={qrValue}
                  size={256}
                  level="H"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#1a1a1a"
                />
              )}

              {refreshing && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/80 backdrop-blur-sm">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Última atualização: {lastUpdate.toLocaleTimeString("pt-BR")}
            </p>

            {/* Refresh button */}
            <Button
              onClick={fetchQrFromServer}
              disabled={refreshing}
              size="lg"
              className="w-full sm:w-auto"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              Gerar novo QR Code / Atualizar
            </Button>
          </CardContent>
        </Card>

        {/* Instruções */}
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

        {/* Dev hint — pode remover depois */}
        <p className="mt-6 text-center text-[11px] text-muted-foreground/60">
          Página privada • Acesso apenas via link direto
        </p>
      </div>
    </div>
  );
};

export default AdminBotWpp;
