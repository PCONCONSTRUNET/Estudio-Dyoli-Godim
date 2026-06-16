-- Tabela de clientes (sem auth, qualquer um pode ser cadastrado)
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_clientes" ON public.clientes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Tabela de vendas (separada de agendamentos)
CREATE TABLE IF NOT EXISTS public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  telefone TEXT DEFAULT '',
  itens JSONB NOT NULL DEFAULT '[]',
  valor_total NUMERIC NOT NULL DEFAULT 0,
  valor_pago NUMERIC NOT NULL DEFAULT 0,
  forma_pagamento TEXT DEFAULT 'pix',
  pago BOOLEAN NOT NULL DEFAULT true,
  data_venda DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_vendas" ON public.vendas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
