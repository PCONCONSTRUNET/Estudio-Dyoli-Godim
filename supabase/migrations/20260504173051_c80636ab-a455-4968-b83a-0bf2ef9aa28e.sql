
CREATE TABLE IF NOT EXISTS public.categorias_ordem (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL,
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(scope, nome)
);

ALTER TABLE public.categorias_ordem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de categorias_ordem"
ON public.categorias_ordem FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Auth manage categorias_ordem"
ON public.categorias_ordem FOR ALL
TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Anon admin manage categorias_ordem"
ON public.categorias_ordem FOR ALL
TO anon
USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_categorias_ordem_scope ON public.categorias_ordem(scope, ordem);
