ALTER TABLE public.despesas
  ADD COLUMN IF NOT EXISTS fixa BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recorrencia_id UUID;

CREATE INDEX IF NOT EXISTS idx_despesas_recorrencia ON public.despesas(recorrencia_id);