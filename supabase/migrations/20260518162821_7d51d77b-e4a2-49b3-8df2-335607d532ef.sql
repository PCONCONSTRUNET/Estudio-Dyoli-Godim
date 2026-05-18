CREATE TABLE public.pagamento_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agendamento_id UUID NOT NULL,
  status_anterior TEXT NOT NULL,
  status_novo TEXT NOT NULL,
  valor_anterior NUMERIC NOT NULL DEFAULT 0,
  valor_novo NUMERIC NOT NULL DEFAULT 0,
  valor_delta NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  acao TEXT NOT NULL DEFAULT 'registro',
  autor_id UUID,
  autor_nome TEXT NOT NULL DEFAULT 'Admin',
  observacao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_pagamento_historico_agendamento ON public.pagamento_historico(agendamento_id, created_at DESC);

ALTER TABLE public.pagamento_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública histórico pagamento"
ON public.pagamento_historico FOR SELECT
TO anon, authenticated USING (true);

CREATE POLICY "Anon admin insere histórico pagamento"
ON public.pagamento_historico FOR INSERT
TO anon WITH CHECK (true);

CREATE POLICY "Auth insere histórico pagamento"
ON public.pagamento_historico FOR INSERT
TO authenticated WITH CHECK (true);

CREATE POLICY "Auth gerencia histórico pagamento"
ON public.pagamento_historico FOR ALL
TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anon admin gerencia histórico pagamento"
ON public.pagamento_historico FOR ALL
TO anon USING (true) WITH CHECK (true);