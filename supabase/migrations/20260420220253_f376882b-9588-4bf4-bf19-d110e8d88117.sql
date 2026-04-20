-- Tabela para armazenar Player IDs do OneSignal
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cliente')),
  player_id TEXT NOT NULL UNIQUE,
  device_info JSONB DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para busca rápida por role e por user_id
CREATE INDEX idx_push_subs_role ON public.push_subscriptions(role) WHERE ativo = true;
CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id) WHERE ativo = true;

-- RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anon (admin painel sem login + clientes públicos no fluxo de agendamento) podem inserir/atualizar/ler
CREATE POLICY "Public insert push subs"
  ON public.push_subscriptions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public read push subs"
  ON public.push_subscriptions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public update push subs"
  ON public.push_subscriptions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public delete push subs"
  ON public.push_subscriptions FOR DELETE
  TO anon, authenticated
  USING (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_push_subs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_push_subs_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_push_subs_updated_at();