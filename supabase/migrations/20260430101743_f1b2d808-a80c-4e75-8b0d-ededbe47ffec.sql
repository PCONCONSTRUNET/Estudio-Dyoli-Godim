DROP POLICY IF EXISTS "Users can view own appointments" ON public.agendamentos;

CREATE POLICY "Authenticated can view all appointments"
ON public.agendamentos
FOR SELECT
TO authenticated
USING (true);