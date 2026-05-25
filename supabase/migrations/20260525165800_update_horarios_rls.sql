-- Allow anon users (admin panel) to update horarios_funcionamento
CREATE POLICY "Admin anon update horarios_funcionamento"
ON public.horarios_funcionamento
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
