-- Allow anon to read all agendamentos (admin panel uses anon key)
CREATE POLICY "Leitura pública de agendamentos" ON public.agendamentos
  FOR SELECT TO anon USING (true);

-- Allow anon to read all profiles (admin panel needs client names)
CREATE POLICY "Leitura pública de perfis" ON public.profiles
  FOR SELECT TO anon USING (true);

-- Allow any authenticated user to update any agendamento (admin actions)
CREATE POLICY "Admin update agendamentos" ON public.agendamentos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Allow any authenticated user to delete agendamentos (admin actions)
CREATE POLICY "Admin delete agendamentos" ON public.agendamentos
  FOR DELETE TO authenticated USING (true);

-- Allow anon to update agendamentos (admin panel not authenticated)
CREATE POLICY "Admin anon update agendamentos" ON public.agendamentos
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Allow anon to delete agendamentos (admin panel)
CREATE POLICY "Admin anon delete agendamentos" ON public.agendamentos
  FOR DELETE TO anon USING (true);