-- Livro-caixa canônico: separa a data do pagamento da data do atendimento.
-- A tabela é alimentada por triggers para cobrir todos os fluxos que alteram
-- valor_pago (admin, pedidos, pagamentos, PIX local e gateways).

CREATE TABLE IF NOT EXISTS public.caixa_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia_tipo TEXT NOT NULL CHECK (referencia_tipo IN ('agendamento', 'venda')),
  referencia_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'estorno', 'gorjeta')),
  valor NUMERIC(12,2) NOT NULL CHECK (valor <> 0),
  forma_pagamento TEXT,
  data_pagamento DATE NOT NULL,
  ocorrido_em TIMESTAMP WITH TIME ZONE NOT NULL,
  origem TEXT NOT NULL DEFAULT 'sistema',
  descricao TEXT,
  cliente_nome TEXT,
  contabiliza_comissao BOOLEAN NOT NULL DEFAULT true,
  inferido BOOLEAN NOT NULL DEFAULT false,
  external_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_caixa_movimentacoes_data
  ON public.caixa_movimentacoes(data_pagamento DESC);

CREATE INDEX IF NOT EXISTS idx_caixa_movimentacoes_referencia
  ON public.caixa_movimentacoes(referencia_tipo, referencia_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_caixa_movimentacoes_external_id
  ON public.caixa_movimentacoes(external_id)
  WHERE external_id IS NOT NULL;

ALTER TABLE public.caixa_movimentacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura pública movimentações do caixa" ON public.caixa_movimentacoes;
CREATE POLICY "Leitura pública movimentações do caixa"
  ON public.caixa_movimentacoes FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.caixa_movimentacoes TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'caixa_movimentacoes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.caixa_movimentacoes;
  END IF;
END $$;

-- Vendas também precisam guardar a data/hora real quando forem quitadas
-- depois da criação. Em vendas criadas já pagas, data_venda é a data financeira.
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- 1) Backfill dos eventos que já possuem data auditável no histórico.
INSERT INTO public.caixa_movimentacoes (
  referencia_tipo,
  referencia_id,
  tipo,
  valor,
  forma_pagamento,
  data_pagamento,
  ocorrido_em,
  origem,
  descricao,
  cliente_nome,
  contabiliza_comissao,
  inferido,
  external_id
)
SELECT
  CASE WHEN a.id IS NULL AND v.id IS NOT NULL THEN 'venda' ELSE 'agendamento' END,
  h.agendamento_id,
  CASE WHEN h.valor_delta > 0 THEN 'entrada' ELSE 'estorno' END,
  h.valor_delta,
  COALESCE(a.forma_pagamento, v.forma_pagamento),
  (h.created_at AT TIME ZONE 'America/Sao_Paulo')::date,
  h.created_at,
  'historico_legado',
  COALESCE(a.servico, CASE WHEN v.id IS NOT NULL THEN 'Venda de Produtos' END),
  COALESCE(a.cliente_nome, v.cliente_nome),
  position('SEM_COMISSAO' in COALESCE(a.observacao, v.observacao, '')) = 0,
  false,
  'historico:' || h.id::text
FROM public.pagamento_historico h
LEFT JOIN public.agendamentos a ON a.id = h.agendamento_id
LEFT JOIN public.vendas v ON v.id = h.agendamento_id
WHERE h.acao <> 'acrescimo'
  AND h.valor_delta <> 0
ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING;

-- 2) Completa saldos antigos que nunca ganharam histórico. Para esses casos,
-- paid_at é autoritativo quando existe; caso contrário, created_at é a melhor
-- evidência disponível e o movimento fica marcado como inferido.
WITH historico_por_agendamento AS (
  SELECT
    agendamento_id,
    COALESCE(SUM(valor_delta) FILTER (WHERE acao <> 'acrescimo'), 0) AS total_historico
  FROM public.pagamento_historico
  GROUP BY agendamento_id
), residuais AS (
  SELECT
    a.*,
    COALESCE(a.valor_pago, 0) - COALESCE(h.total_historico, 0) AS residual,
    COALESCE(a.paid_at, a.created_at) AS momento_pagamento
  FROM public.agendamentos a
  LEFT JOIN historico_por_agendamento h ON h.agendamento_id = a.id
)
INSERT INTO public.caixa_movimentacoes (
  referencia_tipo,
  referencia_id,
  tipo,
  valor,
  forma_pagamento,
  data_pagamento,
  ocorrido_em,
  origem,
  descricao,
  cliente_nome,
  contabiliza_comissao,
  inferido,
  external_id
)
SELECT
  'agendamento',
  id,
  CASE WHEN residual > 0 THEN 'entrada' ELSE 'estorno' END,
  residual,
  forma_pagamento,
  (momento_pagamento AT TIME ZONE 'America/Sao_Paulo')::date,
  momento_pagamento,
  CASE WHEN paid_at IS NOT NULL THEN 'paid_at_legado' ELSE 'saldo_inicial_legado' END,
  servico,
  cliente_nome,
  position('SEM_COMISSAO' in COALESCE(observacao, '')) = 0,
  paid_at IS NULL,
  COALESCE(
    CASE WHEN payment_id IS NOT NULL AND residual > 0 THEN 'gateway:' || payment_id END,
    'agendamento-residual:' || id::text
  )
FROM residuais
WHERE residual <> 0
ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING;

-- 3) Gorjetas antigas são entradas integrais de comissão e não fazem parte de valor_pago.
INSERT INTO public.caixa_movimentacoes (
  referencia_tipo,
  referencia_id,
  tipo,
  valor,
  forma_pagamento,
  data_pagamento,
  ocorrido_em,
  origem,
  descricao,
  cliente_nome,
  contabiliza_comissao,
  inferido,
  external_id
)
SELECT
  'agendamento',
  id,
  'gorjeta',
  valor_gorjeta,
  forma_pagamento,
  (COALESCE(paid_at, created_at) AT TIME ZONE 'America/Sao_Paulo')::date,
  COALESCE(paid_at, created_at),
  'gorjeta_legado',
  'Gorjeta',
  cliente_nome,
  true,
  paid_at IS NULL,
  'agendamento-gorjeta:' || id::text
FROM public.agendamentos
WHERE COALESCE(valor_gorjeta, 0) <> 0
ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING;

-- 4) Vendas antigas já possuem uma data financeira explícita (data_venda).
-- Desconta eventos legados já migrados para não duplicar quitações de vendas.
WITH historico_por_venda AS (
  SELECT
    h.agendamento_id AS venda_id,
    COALESCE(SUM(h.valor_delta) FILTER (WHERE h.acao <> 'acrescimo'), 0) AS total_historico
  FROM public.pagamento_historico h
  JOIN public.vendas v ON v.id = h.agendamento_id
  GROUP BY h.agendamento_id
), vendas_residuais AS (
  SELECT
    v.*,
    (
      CASE
        WHEN COALESCE(v.valor_pago, 0) > 0 THEN v.valor_pago
        WHEN v.pago THEN v.valor_total
        ELSE 0
      END
    ) - COALESCE(h.total_historico, 0) AS residual
  FROM public.vendas v
  LEFT JOIN historico_por_venda h ON h.venda_id = v.id
)
INSERT INTO public.caixa_movimentacoes (
  referencia_tipo,
  referencia_id,
  tipo,
  valor,
  forma_pagamento,
  data_pagamento,
  ocorrido_em,
  origem,
  descricao,
  cliente_nome,
  contabiliza_comissao,
  inferido,
  external_id
)
SELECT
  'venda',
  id,
  'entrada',
  residual,
  forma_pagamento,
  data_venda,
  COALESCE(paid_at, (data_venda::timestamp + time '12:00') AT TIME ZONE 'America/Sao_Paulo', created_at),
  'venda_legado',
  'Venda de Produtos',
  cliente_nome,
  true,
  paid_at IS NULL,
  'venda-residual:' || id::text
FROM vendas_residuais
WHERE residual <> 0
ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING;

CREATE OR REPLACE FUNCTION public.registrar_caixa_agendamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  valor_anterior NUMERIC := 0;
  valor_atual NUMERIC := COALESCE(NEW.valor_pago, 0);
  delta NUMERIC;
  gorjeta_anterior NUMERIC := 0;
  gorjeta_atual NUMERIC := COALESCE(NEW.valor_gorjeta, 0);
  delta_gorjeta NUMERIC;
  momento TIMESTAMP WITH TIME ZONE;
  data_financeira DATE;
  id_externo TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    valor_anterior := COALESCE(OLD.valor_pago, 0);
    gorjeta_anterior := COALESCE(OLD.valor_gorjeta, 0);
  END IF;

  delta := valor_atual - valor_anterior;
  delta_gorjeta := gorjeta_atual - gorjeta_anterior;

  IF TG_OP = 'INSERT' THEN
    momento := COALESCE(NEW.paid_at, NEW.created_at, now());
  ELSIF NEW.paid_at IS DISTINCT FROM OLD.paid_at AND NEW.paid_at IS NOT NULL THEN
    momento := NEW.paid_at;
  ELSE
    momento := now();
  END IF;
  data_financeira := (momento AT TIME ZONE 'America/Sao_Paulo')::date;

  IF delta <> 0 THEN
    id_externo := CASE
      WHEN delta > 0 AND NEW.payment_id IS NOT NULL THEN 'gateway:' || NEW.payment_id
      ELSE NULL
    END;

    INSERT INTO public.caixa_movimentacoes (
      referencia_tipo,
      referencia_id,
      tipo,
      valor,
      forma_pagamento,
      data_pagamento,
      ocorrido_em,
      origem,
      descricao,
      cliente_nome,
      contabiliza_comissao,
      inferido,
      external_id
    ) VALUES (
      'agendamento',
      NEW.id,
      CASE WHEN delta > 0 THEN 'entrada' ELSE 'estorno' END,
      delta,
      NEW.forma_pagamento,
      data_financeira,
      momento,
      COALESCE(NULLIF(NEW.origem, ''), CASE WHEN NEW.payment_id IS NOT NULL THEN 'gateway' ELSE 'agendamento' END),
      NEW.servico,
      NEW.cliente_nome,
      position('SEM_COMISSAO' in COALESCE(NEW.observacao, '')) = 0,
      false,
      id_externo
    )
    ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING;
  END IF;

  IF delta_gorjeta <> 0 THEN
    INSERT INTO public.caixa_movimentacoes (
      referencia_tipo,
      referencia_id,
      tipo,
      valor,
      forma_pagamento,
      data_pagamento,
      ocorrido_em,
      origem,
      descricao,
      cliente_nome,
      contabiliza_comissao,
      inferido
    ) VALUES (
      'agendamento',
      NEW.id,
      CASE WHEN delta_gorjeta > 0 THEN 'gorjeta' ELSE 'estorno' END,
      delta_gorjeta,
      NEW.forma_pagamento,
      data_financeira,
      momento,
      'gorjeta',
      'Gorjeta',
      NEW.cliente_nome,
      true,
      false
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrar_caixa_agendamento ON public.agendamentos;
CREATE TRIGGER trg_registrar_caixa_agendamento
AFTER INSERT OR UPDATE OF valor_pago, valor_gorjeta, paid_at
ON public.agendamentos
FOR EACH ROW
EXECUTE FUNCTION public.registrar_caixa_agendamento();

CREATE OR REPLACE FUNCTION public.registrar_caixa_venda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  valor_anterior NUMERIC := 0;
  valor_atual NUMERIC;
  delta NUMERIC;
  momento TIMESTAMP WITH TIME ZONE;
BEGIN
  valor_atual := CASE
    WHEN NEW.pago THEN COALESCE(NULLIF(NEW.valor_pago, 0), NEW.valor_total, 0)
    ELSE COALESCE(NEW.valor_pago, 0)
  END;

  IF TG_OP = 'UPDATE' THEN
    valor_anterior := CASE
      WHEN OLD.pago THEN COALESCE(NULLIF(OLD.valor_pago, 0), OLD.valor_total, 0)
      ELSE COALESCE(OLD.valor_pago, 0)
    END;
  END IF;

  delta := valor_atual - valor_anterior;
  IF delta = 0 THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    momento := COALESCE(
      NEW.paid_at,
      (NEW.data_venda::timestamp + time '12:00') AT TIME ZONE 'America/Sao_Paulo',
      NEW.created_at,
      now()
    );
  ELSIF NEW.paid_at IS DISTINCT FROM OLD.paid_at AND NEW.paid_at IS NOT NULL THEN
    momento := NEW.paid_at;
  ELSE
    momento := now();
  END IF;

  INSERT INTO public.caixa_movimentacoes (
    referencia_tipo,
    referencia_id,
    tipo,
    valor,
    forma_pagamento,
    data_pagamento,
    ocorrido_em,
    origem,
    descricao,
    cliente_nome,
    contabiliza_comissao,
    inferido
  ) VALUES (
    'venda',
    NEW.id,
    CASE WHEN delta > 0 THEN 'entrada' ELSE 'estorno' END,
    delta,
    NEW.forma_pagamento,
    (momento AT TIME ZONE 'America/Sao_Paulo')::date,
    momento,
    'venda',
    'Venda de Produtos',
    NEW.cliente_nome,
    true,
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrar_caixa_venda ON public.vendas;
CREATE TRIGGER trg_registrar_caixa_venda
AFTER INSERT OR UPDATE OF valor_pago, valor_total, pago, paid_at
ON public.vendas
FOR EACH ROW
EXECUTE FUNCTION public.registrar_caixa_venda();
