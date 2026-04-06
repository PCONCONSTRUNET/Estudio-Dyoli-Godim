CREATE TABLE public.gateway_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway text NOT NULL UNIQUE,
  access_token text DEFAULT '',
  public_key text DEFAULT '',
  webhook_url text DEFAULT '',
  ativo boolean NOT NULL DEFAULT false,
  pix_enabled boolean NOT NULL DEFAULT true,
  cartao_enabled boolean NOT NULL DEFAULT false,
  boleto_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gateway_configs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gateway_configs TO anon, authenticated;

CREATE POLICY "Leitura pública gateway" ON public.gateway_configs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin manage gateway" ON public.gateway_configs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Auth manage gateway" ON public.gateway_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.gateway_configs (gateway, webhook_url)
VALUES ('mercadopago', 'https://vlepenxinekoljxecomr.supabase.co/functions/v1/mercadopago-webhook');