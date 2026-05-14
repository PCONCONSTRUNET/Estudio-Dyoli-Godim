ALTER TABLE public.anamneses ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendente';
UPDATE public.anamneses SET status = 'aprovada' WHERE revisada = true AND status = 'pendente';
ALTER TABLE public.anamneses ADD CONSTRAINT anamneses_status_check CHECK (status IN ('pendente','aprovada','negada'));
ALTER TABLE public.anamneses REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.anamneses;