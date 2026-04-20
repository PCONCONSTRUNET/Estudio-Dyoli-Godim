import { Bell, BellOff, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePushNotifications, isPushPreviewBlocked } from "@/hooks/use-push-notifications";
import { sendPush } from "@/lib/push-notify";
import { toast } from "sonner";

interface Props {
  role: "admin" | "cliente";
  userId?: string | null;
  variant?: "default" | "compact";
  /** Show a "send test push" button (admin only). */
  showTestButton?: boolean;
}

const PushToggle = ({ role, userId, variant = "default", showTestButton = false }: Props) => {
  const { supported, subscribed, loading, enable, disable, permission } =
    usePushNotifications({ role, userId });
  const [testing, setTesting] = useState(false);
  const previewBlocked = isPushPreviewBlocked();

  if (!supported) {
    return variant === "compact" ? null : (
      <p className="text-xs text-muted-foreground">
        {previewBlocked
          ? "Push fica disponível só no domínio publicado (não funciona no preview do editor). Abra estudiodyoli.lovable.app/admin pra ativar."
          : "Notificações push não suportadas neste navegador. No iPhone, instale o app na tela inicial pra ativar."}
      </p>
    );
  }

  const blocked = permission === "denied";

  if (variant === "compact") {
    return (
      <Button
        size="sm"
        variant={subscribed ? "secondary" : "default"}
        onClick={subscribed ? disable : enable}
        disabled={loading || blocked}
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : subscribed ? (
          <BellOff className="h-4 w-4" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {subscribed ? "Desativar push" : "Ativar push no celular"}
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2 shrink-0">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">Notificações no celular</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {subscribed
              ? "Você receberá alertas mesmo com o app fechado."
              : "Ative para receber alertas nativos no celular, mesmo fora do app."}
          </p>
        </div>
      </div>

      {blocked && (
        <p className="text-xs text-destructive">
          Permissão bloqueada. Habilite notificações nas configurações do navegador.
        </p>
      )}

      <Button
        onClick={subscribed ? disable : enable}
        disabled={loading || blocked}
        variant={subscribed ? "outline" : "default"}
        className="w-full gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : subscribed ? (
          <BellOff className="h-4 w-4" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {subscribed ? "Desativar notificações" : "Ativar notificações"}
      </Button>

      {showTestButton && subscribed && (
        <Button
          variant="secondary"
          className="w-full gap-2"
          disabled={testing}
          onClick={async () => {
            setTesting(true);
            try {
              sendPush({
                role,
                title: "🔔 Teste de notificação",
                message: "Se você está vendo isso, push está funcionando!",
                url: window.location.href,
              });
              toast.success("Push de teste enviado. Deve chegar em segundos.");
            } catch {
              toast.error("Falha ao enviar teste.");
            } finally {
              setTimeout(() => setTesting(false), 1500);
            }
          }}
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Enviar push de teste
        </Button>
      )}
    </div>
  );
};

export default PushToggle;
