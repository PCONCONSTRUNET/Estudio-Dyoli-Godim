-- Permitir leitura pública de avaliações (para a vitrine na home)
CREATE POLICY "Public read reviews"
ON public.avaliacoes FOR SELECT
TO anon, authenticated
USING (true);