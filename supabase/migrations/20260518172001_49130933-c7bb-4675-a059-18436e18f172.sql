CREATE POLICY "Admin anon delete avaliacoes"
ON public.avaliacoes
FOR DELETE
TO anon
USING (true);

CREATE POLICY "Admin anon update avaliacoes"
ON public.avaliacoes
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);