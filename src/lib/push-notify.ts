import { supabase } from "@/integrations/supabase/client";

export interface PushPayload {
  role: "admin" | "cliente";
  user_id?: string;
  title: string;
  message: string;
  url?: string;
  data?: Record<string, unknown>;
}

export async function sendPush(payload: PushPayload): Promise<void> {
  const { error } = await supabase.functions.invoke("send-push", { body: payload });
  if (error) throw error;
}

export function showLocalNotification(title: string, message: string): void {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

  try {
    new Notification(title, {
      body: message,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      silent: true,
    });
  } catch (e) {
    console.warn("local notification failed:", e);
  }
}
