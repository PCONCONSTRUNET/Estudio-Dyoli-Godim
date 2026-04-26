-- Remove policies permissivas demais
DROP POLICY IF EXISTS "Admin anon manage reviews" ON public.avaliacoes;
DROP POLICY IF EXISTS "Public read reviews" ON public.avaliacoes;

-- Garante que o cliente também consiga apagar a própria avaliação
CREATE POLICY "Users can delete own reviews"
ON public.avaliacoes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);