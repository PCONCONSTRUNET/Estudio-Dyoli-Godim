-- =============================================================
-- MIGRATION: Índices críticos de estabilidade e performance para Nano
-- Resolve: full scans em horarios_bloqueados, agendamentos e vendas
-- Criado em: 2026-09-07
-- =============================================================

-- 1. CRÍTICO: horarios_bloqueados.motivo
-- O trigger manage_blocked_slots() faz DELETE por motivo ('agendamento:' || id)
-- e o cron send-lembretes faz SELECT com .in('motivo', [...]).
-- Sem esse índice, toda alteração de agendamento ou checagem de lembrete
-- realizava um full table scan sequencial.
CREATE INDEX IF NOT EXISTS idx_horarios_bloqueados_motivo
ON public.horarios_bloqueados(motivo);

-- 2. horarios_bloqueados.data
-- Acelera consultas de agendamento que buscam bloqueios por período (ex: BookingFlow, HorariosTab)
CREATE INDEX IF NOT EXISTS idx_horarios_bloqueados_data
ON public.horarios_bloqueados(data);

-- 3. CRÍTICO: agendamentos.user_id
-- Postgres NÃO cria índice automático em chaves estrangeiras.
-- Consultas de histórico de perfil (ProfileScreen), notificações e integridade
-- faziam full scan buscando pelo ID do usuário.
CREATE INDEX IF NOT EXISTS idx_agendamentos_user_id
ON public.agendamentos(user_id);

-- 4. vendas.cliente_id
-- Chave estrangeira de clientes em vendas
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id
ON public.vendas(cliente_id);

-- 5. agendamentos.servico + data_agendamento
-- Para filtros de serviços na agenda e pedidos
CREATE INDEX IF NOT EXISTS idx_agendamentos_servico_data
ON public.agendamentos(servico, data_agendamento DESC);
