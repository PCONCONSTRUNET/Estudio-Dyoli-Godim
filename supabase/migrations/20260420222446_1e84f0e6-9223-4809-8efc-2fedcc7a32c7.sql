ALTER TABLE public.agendamentos
ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'app';

CREATE INDEX IF NOT EXISTS idx_agendamentos_origem ON public.agendamentos(origem);