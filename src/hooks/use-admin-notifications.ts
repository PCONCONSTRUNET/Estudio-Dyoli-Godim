import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Agendamento {
  id: string;
  servico: string;
  variacao: string | null;
  data_agendamento: string;
  horario: string;
  valor: number;
  user_id: string;
  status: string;
}

export function useAdminNotifications(
  enabled: boolean,
  onNewAgendamento?: (agendamento: Agendamento) => void
) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const stored = localStorage.getItem("admin-notifications");
    return stored !== null ? stored === "true" : true;
  });
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  const toggleNotifications = useCallback((val: boolean) => {
    setNotificationsEnabled(val);
    localStorage.setItem("admin-notifications", String(val));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Load existing IDs first
    const loadExisting = async () => {
      const { data } = await supabase
        .from("agendamentos")
        .select("id")
        .neq("status", "aguardando_pagamento")
        .order("created_at", { ascending: false });
      if (data) {
        data.forEach((a) => knownIdsRef.current.add(a.id));
      }
      initialLoadDone.current = true;
    };

    loadExisting();

    // Subscribe to realtime inserts
    const channel = supabase
      .channel("admin-agendamentos-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agendamentos",
        },
        (payload) => {
          if (!initialLoadDone.current) return;
          const newRecord = payload.new as Agendamento;
          // Ignorar agendamentos aguardando pagamento — só notificar quando confirmar
          if ((newRecord as any).status === "aguardando_pagamento") return;
          if (knownIdsRef.current.has(newRecord.id)) return;
          knownIdsRef.current.add(newRecord.id);

          if (notificationsEnabled) {
            const dateFormatted = new Date(newRecord.data_agendamento + "T12:00:00")
              .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

            toast.success("🔔 Novo Agendamento!", {
              description: `${newRecord.servico} — ${dateFormatted} às ${newRecord.horario}`,
              duration: 8000,
            });
          }

          onNewAgendamento?.(newRecord);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, notificationsEnabled, onNewAgendamento]);

  return {
    notificationsEnabled,
    toggleNotifications,
  };
}
