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

const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export function useAdminNotifications(
  enabled: boolean,
  onNewAgendamento?: (agendamento: Agendamento) => void
) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const stored = localStorage.getItem("admin-notifications");
    return stored !== null ? stored === "true" : true;
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem("admin-sound");
    return stored !== null ? stored === "true" : true;
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  // Preload audio
  useEffect(() => {
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.volume = 0.7;
    audio.preload = "auto";
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const playSound = useCallback(() => {
    if (!soundEnabled || !audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  }, [soundEnabled]);

  const toggleNotifications = useCallback((val: boolean) => {
    setNotificationsEnabled(val);
    localStorage.setItem("admin-notifications", String(val));
  }, []);

  const toggleSound = useCallback((val: boolean) => {
    setSoundEnabled(val);
    localStorage.setItem("admin-sound", String(val));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Load existing IDs first
    const loadExisting = async () => {
      const { data } = await supabase
        .from("agendamentos")
        .select("id")
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
          if (knownIdsRef.current.has(newRecord.id)) return;
          knownIdsRef.current.add(newRecord.id);

          if (notificationsEnabled) {
            playSound();

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
  }, [enabled, notificationsEnabled, playSound, onNewAgendamento]);

  return {
    notificationsEnabled,
    soundEnabled,
    toggleNotifications,
    toggleSound,
    playSound,
  };
}
