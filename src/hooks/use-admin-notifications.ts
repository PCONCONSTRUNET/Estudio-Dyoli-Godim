import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { playNotificationSound } from "@/lib/notification-sound";

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
  onNewAgendamento?: (agendamento: Agendamento) => void,
  onAgendamentoChange?: () => void,
  onAgendamentoUpdate?: (updated: Agendamento) => void
) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const stored = localStorage.getItem("admin-notifications");
    return stored !== null ? stored === "true" : true;
  });
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);
  const enabledRef = useRef(notificationsEnabled);
  const onNewRef = useRef(onNewAgendamento);
  const onChangeRef = useRef(onAgendamentoChange);

  useEffect(() => { enabledRef.current = notificationsEnabled; }, [notificationsEnabled]);
  useEffect(() => { onNewRef.current = onNewAgendamento; }, [onNewAgendamento]);
  useEffect(() => { onChangeRef.current = onAgendamentoChange; }, [onAgendamentoChange]);
  const onUpdateRef = useRef(onAgendamentoUpdate);
  useEffect(() => { onUpdateRef.current = onAgendamentoUpdate; }, [onAgendamentoUpdate]);

  const toggleNotifications = useCallback((val: boolean) => {
    setNotificationsEnabled(val);
    localStorage.setItem("admin-notifications", String(val));
  }, []);

  const notifyNew = useCallback((record: Agendamento) => {
    if (enabledRef.current) {
      const dateFormatted = new Date(record.data_agendamento + "T12:00:00")
        .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      toast.success("🔔 Novo Pedido!", {
        description: `${record.servico} — ${dateFormatted} às ${record.horario}`,
        duration: 8000,
      });
      playNotificationSound();
    }
    onNewRef.current?.(record);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const loadExisting = async () => {
      const { data } = await supabase
        .from("agendamentos")
        .select("id,status")
        .order("created_at", { ascending: false })
        .limit(500); // Limite reduzido — só precisamos de IDs recentes para detectar novos
      if (data) {
        data.forEach((a: any) => {
          if (a.status !== "aguardando_pagamento") {
            knownIdsRef.current.add(a.id);
          }
        });
      }
      initialLoadDone.current = true;
    };

    loadExisting();

    const channel = supabase
      .channel("admin-agendamentos-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agendamentos" },
        (payload) => {
          if (!initialLoadDone.current) return;
          const newRecord = payload.new as Agendamento;
          if ((newRecord as any).status === "aguardando_pagamento") return;
          if (knownIdsRef.current.has(newRecord.id)) return;
          knownIdsRef.current.add(newRecord.id);
          notifyNew(newRecord);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "agendamentos" },
        (payload) => {
          if (!initialLoadDone.current) return;
          const newRecord = payload.new as Agendamento;
          const oldRecord = payload.old as Partial<Agendamento>;
          const status = (newRecord as any).status;

          // Transição: aguardando_pagamento → confirmado (PIX confirmado pelo MP)
          const becameVisible =
            (oldRecord as any)?.status === "aguardando_pagamento" &&
            status !== "aguardando_pagamento";

          const isNew = !knownIdsRef.current.has(newRecord.id);

          if (status !== "aguardando_pagamento" && (becameVisible || isNew)) {
            knownIdsRef.current.add(newRecord.id);
            notifyNew(newRecord);
          } else if (status !== "aguardando_pagamento") {
            // Atualização pontual — usa payload.new diretamente sem recarregar tudo
            // Isso elimina o reload de 1500 agendamentos a cada mudança de status/valor_pago
            if (onUpdateRef.current) {
              onUpdateRef.current(newRecord);
            } else {
              onChangeRef.current?.();
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "agendamentos" },
        (payload) => {
          const oldRecord = payload.old as Partial<Agendamento>;
          if (oldRecord?.id) knownIdsRef.current.delete(oldRecord.id);
          // DELETE requer reload pois precisamos remover do array
          onChangeRef.current?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, notifyNew]);

  return {
    notificationsEnabled,
    toggleNotifications,
  };
}
