-- =====================================================================
-- MIGRATION: Correcao de triggers duplicados, bloat do pg_cron e crons
-- para estabilizacao definitiva da instancia Supabase NANO (512MB RAM)
-- Criado em: 2026-11-19
-- =====================================================================

-- 1. Remove trigger duplicado na tabela agendamentos
--    (Existiam dois triggers executando manage_blocked_slots() a cada INSERT/UPDATE/DELETE)
DROP TRIGGER IF EXISTS trigger_manage_blocked_slots ON public.agendamentos;
DROP TRIGGER IF EXISTS trg_manage_blocked_slots ON public.agendamentos;

-- Recria apenas UM trigger e dispara somente nas colunas que afetam slots bloqueados
-- (evita disparar ao atualizar valor_pago, observacao, payer_name, receipt_url, etc.)
CREATE TRIGGER trg_manage_blocked_slots
AFTER INSERT OR DELETE OR UPDATE OF status, duracao_minutos, data_agendamento, horario
ON public.agendamentos
FOR EACH ROW
EXECUTE FUNCTION public.manage_blocked_slots();

-- 2. Limpa historico acumulado do pg_cron e pg_net que consomem disco e RAM no Nano
DO $$
BEGIN
  DELETE FROM cron.job_run_details WHERE end_time < now() - interval '1 day';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  DELETE FROM net._http_response WHERE created < now() - interval '1 day';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Limpa bloqueios e logs de lembretes antigos que nao sao mais necessarios
DELETE FROM public.horarios_bloqueados WHERE data < CURRENT_DATE - interval '7 days';

DO $$
BEGIN
  DELETE FROM public.lembretes_enviados WHERE enviado_em < now() - interval '7 days';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 3. Reagenda o cron de lembretes para rodar a cada 30 minutos (reduz de 144 para 48 chamadas/dia)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-lembretes-every-10-min') THEN
    PERFORM cron.unschedule('send-lembretes-every-10-min');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-lembretes-every-30-min') THEN
    PERFORM cron.unschedule('send-lembretes-every-30-min');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
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

-- 4. Rotina diaria de limpeza automatica do pg_cron, pg_net e tabelas auxiliares (06:00 UTC / 03:00 BRT)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-nano-bloat-daily') THEN
    PERFORM cron.unschedule('cleanup-nano-bloat-daily');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'cleanup-nano-bloat-daily',
  '0 6 * * *',
  $$
  DELETE FROM cron.job_run_details WHERE end_time < now() - interval '1 day';
  DELETE FROM net._http_response WHERE created < now() - interval '1 day';
  DELETE FROM public.horarios_bloqueados WHERE data < CURRENT_DATE - interval '7 days';
  DELETE FROM public.lembretes_enviados WHERE enviado_em < now() - interval '7 days';
  $$
);
