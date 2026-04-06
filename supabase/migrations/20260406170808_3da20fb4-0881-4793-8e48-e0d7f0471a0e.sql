GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.despesas TO anon, authenticated;

DROP POLICY IF EXISTS "Admin anon manage despesas" ON public.despesas;
CREATE POLICY "Admin anon manage despesas"
ON public.despesas
FOR ALL
TO anon
USING (true)
WITH CHECK (true);