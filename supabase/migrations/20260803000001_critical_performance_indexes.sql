-- =============================================================
-- MIGRATION: Índices de performance críticos
-- Resolve: full scans em pagamento_historico, agendamentos, vendas
-- Criado em: 2026-08-03
-- =============================================================

-- 1. CRÍTICO: pagamento_historico.agendamento_id
-- Todas as queries .in("agendamento_id", [...]) viravam full scan sem isso
-- Impacto: PedidosTab, CaixaTab, PagamentosTab
CREATE INDEX IF NOT EXISTS idx_pagamento_historico_agendamento_id
ON public.pagamento_historico(agendamento_id);

-- 2. pagamento_historico.created_at — para queries de período (CaixaTab regime de caixa)
CREATE INDEX IF NOT EXISTS idx_pagamento_historico_created_at_desc
ON public.pagamento_historico(created_at DESC);

-- 3. agendamentos.status — para filtros .neq("status","aguardando_pagamento") em todo o sistema
CREATE INDEX IF NOT EXISTS idx_agendamentos_status
ON public.agendamentos(status);

-- 4. Índice composto agendamentos(status, data_agendamento) para o load principal do admin
CREATE INDEX IF NOT EXISTS idx_agendamentos_status_data
ON public.agendamentos(status, data_agendamento DESC)
WHERE status != 'aguardando_pagamento';

-- 5. vendas.pago — para filtros .or("pago.eq.false,pago.is.null")
CREATE INDEX IF NOT EXISTS idx_vendas_pago
ON public.vendas(pago);

-- 6. vendas.created_at já existe, mas garantir composto com pago para consultas de pendentes
CREATE INDEX IF NOT EXISTS idx_vendas_pago_created_at
ON public.vendas(pago, created_at DESC);

-- 7. despesas.tipo — para filtros .neq("tipo","comissao") e .neq("tipo","pessoal")
CREATE INDEX IF NOT EXISTS idx_despesas_tipo
ON public.despesas(tipo);

-- 8. despesas.pago + data_vencimento — para queries de despesas pagas no PagamentosTab
CREATE INDEX IF NOT EXISTS idx_despesas_pago_data_vencimento
ON public.despesas(pago, data_vencimento DESC);

-- 9. profiles.nome — para busca ilike em searchs
CREATE INDEX IF NOT EXISTS idx_profiles_nome_trgm
ON public.profiles USING gin(nome gin_trgm_ops);

-- 10. agendamentos.cliente_nome — para busca ilike em searchs
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente_nome_trgm
ON public.agendamentos USING gin(cliente_nome gin_trgm_ops);
