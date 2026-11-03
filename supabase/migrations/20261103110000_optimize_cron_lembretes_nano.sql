-- =====================================================================
-- MIGRATION: Otimização de Cron de Lembretes para Instância NANO
-- Reduz a frequência do cron de 10 em 10 minutos (144x/dia)
-- para 30 em 30 minutos (48x/dia), aliviando I/O e conexões do Supabase Nano.
-- A janela de elegibilidade em send-lembretes tem margem de +-30min (largura de 60min),
-- garantindo que nenhum agendamento seja perdido, e a tabela lembretes_enviados
-- garante idempotência contra envios duplicados.
-- Criado em: 2026-11-03
-- =====================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-lembretes-every-10-min') THEN
    PERFORM cron.unschedule('send-lembretes-every-10-min');
  END IF;
END $$;

SELECT cron.schedule(
  'send-lembretes-every-30-min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://vlepenxinekoljxecomr.supabase.co/functions/v1/send-lembretes',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsZXBlbnhpbmVrb2xqeGVjb21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjI0NDksImV4cCI6MjA5MDYzODQ0OX0.5U3grLWxVeHl2JnuTRWh4P3lPmiv04YAOFosjDZmjMA"}'::jsonb,
    body := concat('{"trigger": "cron", "time": "', now(), '"}')::jsonb
  );
  $$
);
