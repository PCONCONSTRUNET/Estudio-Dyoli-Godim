-- =====================================================================
-- MIGRATION: Fix disparos em massa de lembretes WhatsApp
-- Problema: horarios_bloqueados tem UNIQUE(data,horario) que impedia
--           a gravacao do flag de idempotencia do send-lembretes.
-- Solucao:  Tabela dedicada lembretes_enviados com UNIQUE(agendamento_id)
-- Criado em: 2026-09-22
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.lembretes_enviados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID NOT NULL UNIQUE,
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indice explícito para buscas rápidas por agendamento_id
CREATE INDEX IF NOT EXISTS idx_lembretes_enviados_agendamento_id
  ON public.lembretes_enviados(agendamento_id);

ALTER TABLE public.lembretes_enviados ENABLE ROW LEVEL SECURITY;

-- Apenas o service_role (usado pelas Edge Functions) pode ler/escrever
CREATE POLICY "Service role full access lembretes_enviados"
  ON public.lembretes_enviados
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
