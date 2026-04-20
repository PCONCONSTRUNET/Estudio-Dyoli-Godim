import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";

interface Props {
  role: "admin" | "cliente";
  userId?: string | null;
  variant?: "default" | "compact";
}

const PushToggle = ({ role, userId, variant = "default" }: Props) => {
  const { supported, subscribed, loading, enable, disable, permission } =
    usePushNotifications({ role, userId });

  if (!supported) {
    return variant === "compact" ? null : (
      <p className="text-xs text-muted-foreground">
        Notificações push não suportadas neste navegador.
        {" "}Instale o app na tela inicial pra ativar.
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
    </div>
  );
};

export default PushToggle;
