CREATE TABLE public.horarios_bloqueados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  horario text NOT NULL,
  motivo text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(data, horario)
);

ALTER TABLE public.horarios_bloqueados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de bloqueios" ON public.horarios_bloqueados
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Gestão de bloqueios" ON public.horarios_bloqueados
  FOR ALL TO authenticated USING (true) WITH CHECK (true);