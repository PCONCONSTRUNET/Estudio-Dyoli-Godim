import { supabase } from "@/integrations/supabase/client";

export interface PushPayload {
  role: "admin" | "cliente";
  user_id?: string;
  title: string;
  message: string;
  url?: string;
  data?: Record<string, unknown>;
}

/** Fire-and-forget — never blocks UI on push delivery. */
export function sendPush(payload: PushPayload): void {
  supabase.functions
    .invoke("send-push", { body: payload })
    .catch((e) => console.warn("send-push failed:", e));
}
