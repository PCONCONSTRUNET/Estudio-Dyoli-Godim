CREATE POLICY "Authenticated can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);