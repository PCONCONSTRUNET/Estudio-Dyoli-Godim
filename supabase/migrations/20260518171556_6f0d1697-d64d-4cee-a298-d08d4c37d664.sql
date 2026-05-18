ALTER TABLE public.avaliacoes ALTER COLUMN agendamento_id DROP NOT NULL;
ALTER TABLE public.avaliacoes ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.avaliacoes ADD COLUMN IF NOT EXISTS cliente_nome text;

DROP POLICY IF EXISTS "Public insert reviews" ON public.avaliacoes;
CREATE POLICY "Public insert reviews"
ON public.avaliacoes
FOR INSERT
TO anon, authenticated
WITH CHECK (true);