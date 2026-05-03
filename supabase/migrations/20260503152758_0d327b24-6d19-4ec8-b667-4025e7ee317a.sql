CREATE TABLE public.servicos_app (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Outros',
  preco NUMERIC NOT NULL,
  duracao_minutos INTEGER NOT NULL DEFAULT 60,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.servicos_app ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de serviços app"
ON public.servicos_app FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Gestão de serviços app (auth)"
ON public.servicos_app FOR ALL
TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Gestão de serviços app (anon admin)"
ON public.servicos_app FOR ALL
TO anon
USING (true) WITH CHECK (true);