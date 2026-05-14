
CREATE TABLE public.anamneses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  cliente_nome TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL DEFAULT '',
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  pdf_url TEXT,
  pdf_path TEXT,
  revisada BOOLEAN NOT NULL DEFAULT false,
  revisada_at TIMESTAMPTZ,
  observacao TEXT NOT NULL DEFAULT '',
  origem TEXT NOT NULL DEFAULT 'chatbot',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_anamneses_user_id ON public.anamneses(user_id);
CREATE INDEX idx_anamneses_whatsapp ON public.anamneses(whatsapp);
CREATE INDEX idx_anamneses_created_at ON public.anamneses(created_at DESC);

ALTER TABLE public.anamneses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de anamneses"
  ON public.anamneses FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anon admin gerencia anamneses"
  ON public.anamneses FOR ALL
  TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "Auth gerencia anamneses"
  ON public.anamneses FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_anamneses_updated_at
  BEFORE UPDATE ON public.anamneses
  FOR EACH ROW EXECUTE FUNCTION public.update_push_subs_updated_at();

-- Storage bucket privado para PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('anamneses', 'anamneses', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anon read anamneses files"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'anamneses');

CREATE POLICY "Anon upload anamneses files"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'anamneses');

CREATE POLICY "Anon update anamneses files"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'anamneses');

CREATE POLICY "Anon delete anamneses files"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'anamneses');
