CREATE TABLE public.dividas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  cliente_nome text NOT NULL,
  descricao text NOT NULL,
  valor_total numeric NOT NULL,
  valor_pago numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  data_criacao date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT dividas_pkey PRIMARY KEY (id)
);

ALTER TABLE public.dividas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.dividas
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.dividas
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.dividas
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.dividas
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (true);

-- Adicionar real-time se necessário
ALTER PUBLICATION supabase_realtime ADD TABLE dividas;
