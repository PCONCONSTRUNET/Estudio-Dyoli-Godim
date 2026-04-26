-- Tabela para avaliações de agendamentos concluídos
CREATE TABLE public.avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  nota INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

-- Cliente pode criar/ver/editar a própria avaliação
CREATE POLICY "Users can view own reviews"
ON public.avaliacoes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reviews"
ON public.avaliacoes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
ON public.avaliacoes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Leitura pública (para mostrar avaliações no site futuramente)
CREATE POLICY "Public read reviews"
ON public.avaliacoes FOR SELECT
TO anon
USING (true);

-- Admin (anon no painel) pode ler/gerenciar
CREATE POLICY "Admin anon manage reviews"
ON public.avaliacoes FOR ALL
TO anon
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_avaliacoes_updated_at
BEFORE UPDATE ON public.avaliacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_push_subs_updated_at();

CREATE INDEX idx_avaliacoes_user_id ON public.avaliacoes(user_id);
CREATE INDEX idx_avaliacoes_agendamento_id ON public.avaliacoes(agendamento_id);