import { useCallback, useEffect, useRef, useState } from "react";
import OneSignal from "react-onesignal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Role = "admin" | "cliente";

interface UsePushOptions {
  role: Role;
  userId?: string | null;
  /** auto-init OneSignal SDK on mount (does NOT request permission) */
  autoInit?: boolean;
}

let initPromise: Promise<void> | null = null;
let cachedAppId: string | null = null;

async function fetchAppId(): Promise<string> {
  if (cachedAppId) return cachedAppId;
  const { data, error } = await supabase.functions.invoke("onesignal-config");
  if (error || !data?.appId) throw new Error("Falha ao carregar config OneSignal");
  cachedAppId = data.appId;
  return data.appId;
}

async function initOneSignal(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const appId = await fetchAppId();
    await OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerParam: { scope: "/" },
      serviceWorkerPath: "OneSignalSDKWorker.js",
    });
  })();
  return initPromise;
}

function isLovablePreview(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host.includes("id-preview--") || host.includes("lovableproject.com");
}

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return false;
  // Only block the Lovable preview iframe — real domains in iframes (rare) still try.
  if (isLovablePreview() && isInIframe()) return false;
  return true;
}

export function isPushPreviewBlocked(): boolean {
  return isLovablePreview() && isInIframe();
}

export function usePushNotifications({ role, userId, autoInit = true }: UsePushOptions) {
  const [supported] = useState(() => isSupported());
  const [permission, setPermission] = useState<NotificationPermission | "default">(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const initStarted = useRef(false);

  const refreshState = useCallback(async () => {
    try {
      const id = OneSignal.User?.PushSubscription?.id ?? null;
      const optedIn = OneSignal.User?.PushSubscription?.optedIn ?? false;
      setPlayerId(id);
      setSubscribed(!!optedIn && !!id);
      if (typeof Notification !== "undefined") setPermission(Notification.permission);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!supported || !autoInit || initStarted.current) return;
    initStarted.current = true;
    initOneSignal()
      .then(() => refreshState())
      .catch((e) => console.warn("OneSignal init failed:", e));
  }, [supported, autoInit, refreshState]);

  useEffect(() => {
    if (!supported || !userId) return;

    const currentId = OneSignal.User?.PushSubscription?.id ?? playerId;
    const optedIn = OneSignal.User?.PushSubscription?.optedIn ?? subscribed;

    if (!currentId || !optedIn) return;

    savePlayerId(currentId).catch((error) => {
      console.error("Falha ao vincular player_id ao usuário:", error);
    });
  }, [supported, userId, playerId, subscribed, savePlayerId]);

  const savePlayerId = useCallback(
    async (id: string) => {
      const deviceInfo = {
        ua: navigator.userAgent,
        lang: navigator.language,
        platform: (navigator as any).userAgentData?.platform ?? "",
      };
      // Upsert by player_id (unique)
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert(
          {
            player_id: id,
            role,
            user_id: userId ?? null,
            device_info: deviceInfo,
            ativo: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "player_id" }
        );
      if (error) console.error("Falha ao salvar player_id:", error);
    },
    [role, userId]
  );

  const enable = useCallback(async () => {
    if (!supported) {
      toast.error("Push não suportado neste dispositivo/navegador.");
      return false;
    }
    setLoading(true);
    try {
      await initOneSignal();
      // Solicita permissão nativa
      await OneSignal.Notifications.requestPermission();
      // opt-in subscription
      await OneSignal.User.PushSubscription.optIn();

      // Aguarda o player_id ficar disponível (até 5s)
      let id = OneSignal.User?.PushSubscription?.id ?? null;
      for (let i = 0; i < 10 && !id; i++) {
        await new Promise((r) => setTimeout(r, 500));
        id = OneSignal.User?.PushSubscription?.id ?? null;
      }

      if (!id) {
        toast.error("Não foi possível registrar o dispositivo. Tente novamente.");
        return false;
      }

      await savePlayerId(id);
      await refreshState();
      toast.success("🔔 Notificações ativadas!");
      return true;
    } catch (e) {
      console.error(e);
      toast.error("Erro ao ativar notificações.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [supported, savePlayerId, refreshState]);

  const disable = useCallback(async () => {
    setLoading(true);
    try {
      await OneSignal.User.PushSubscription.optOut();
      const id = playerId;
      if (id) {
        await supabase
          .from("push_subscriptions")
          .update({ ativo: false })
          .eq("player_id", id);
      }
      await refreshState();
      toast.success("Notificações desativadas.");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [playerId, refreshState]);

  return {
    supported,
    permission,
    subscribed,
    loading,
    playerId,
    enable,
    disable,
  };
}
