ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'estudio';
CREATE INDEX IF NOT EXISTS idx_despesas_tipo ON public.despesas(tipo);