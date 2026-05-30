CREATE POLICY "Enable read access for anon" ON public.dividas
  AS PERMISSIVE FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Enable insert access for anon" ON public.dividas
  AS PERMISSIVE FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Enable update access for anon" ON public.dividas
  AS PERMISSIVE FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete access for anon" ON public.dividas
  AS PERMISSIVE FOR DELETE
  TO anon
  USING (true);
