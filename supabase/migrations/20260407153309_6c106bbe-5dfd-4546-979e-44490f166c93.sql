-- Allow anon users (admin panel) to insert agendamentos
CREATE POLICY "Admin anon insert agendamentos"
ON public.agendamentos
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon users to delete blocked slots (for extend feature)
CREATE POLICY "Admin anon delete bloqueios"
ON public.horarios_bloqueados
FOR DELETE
TO anon
USING (true);

-- Allow anon users to insert blocked slots
CREATE POLICY "Admin anon insert bloqueios"
ON public.horarios_bloqueados
FOR INSERT
TO anon
WITH CHECK (true);