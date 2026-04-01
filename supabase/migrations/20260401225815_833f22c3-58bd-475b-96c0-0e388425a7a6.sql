
-- Tabela de produtos
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  preco NUMERIC NOT NULL,
  imagem_url TEXT DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Leitura pública
CREATE POLICY "Leitura pública de produtos" ON public.produtos
  FOR SELECT TO anon, authenticated USING (true);

-- Gestão admin (authenticated)
CREATE POLICY "Gestão de produtos" ON public.produtos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket para imagens de produtos
INSERT INTO storage.buckets (id, name, public) VALUES ('produtos', 'produtos', true);

-- Política de upload para autenticados
CREATE POLICY "Upload de imagens de produtos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'produtos');

-- Política de leitura pública
CREATE POLICY "Leitura pública de imagens de produtos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'produtos');

-- Política de delete para autenticados
CREATE POLICY "Delete de imagens de produtos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'produtos');

-- Política de update para autenticados
CREATE POLICY "Update de imagens de produtos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'produtos')
  WITH CHECK (bucket_id = 'produtos');
