-- Performance Indexes for Large Table Queries with Sorting and Limits

-- 1. Index on agendamentos for admin dashboard views and real-time updates
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_agendamento_desc 
ON public.agendamentos(data_agendamento DESC, status);

CREATE INDEX IF NOT EXISTS idx_agendamentos_created_at_desc 
ON public.agendamentos(created_at DESC);

-- 2. Index on profiles for dashboard search and sorting
CREATE INDEX IF NOT EXISTS idx_profiles_created_at_desc 
ON public.profiles(created_at DESC);

-- 3. Index on vendas for payment tracking views
CREATE INDEX IF NOT EXISTS idx_vendas_created_at_desc 
ON public.vendas(created_at DESC);

-- 4. Index on despesas for financial tracking views
CREATE INDEX IF NOT EXISTS idx_despesas_data_vencimento_desc 
ON public.despesas(data_vencimento DESC);
