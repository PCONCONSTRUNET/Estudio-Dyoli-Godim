-- =====================================================================
-- MIGRATION: Estabilidade critica para instancia NANO
-- Problema: Banco caindo por esgotamento de conexoes (OOM / conn limit)
-- Solucao: Limites de timeout + configuracoes defensivas para NANO
-- Criado em: 2026-09-11
-- =====================================================================

-- 1. Timeout para conexoes ociosas (idle) — encerra conexoes que ficam
--    abertas sem fazer nada apos 10 minutos. Evita acumulo de conexoes zumbis
--    de abas fechadas ou clientes que perderam o WebSocket sem cleanup.
ALTER DATABASE postgres SET idle_in_transaction_session_timeout = '10min';

-- 2. Timeout de statement — mata queries que rodam por mais de 30 segundos.
--    Evita que uma query pesada trave o banco inteiro (OOM ou lock starvation).
ALTER DATABASE postgres SET statement_timeout = '30s';

-- 3. Reduz work_mem para economizar RAM no NANO (512MB total).
--    Cada operacao de sort/hash pode usar ate work_mem de RAM.
--    Com 60 conexoes e 4MB cada = 240MB so de work_mem — metade da RAM!
--    Reduzindo para 1MB, liberamos memoria para o PostgreSQL em si.
ALTER DATABASE postgres SET work_mem = '1MB';

-- 4. Forca o uso de indices em buscas (desencoraja seq scans custosos)
ALTER DATABASE postgres SET random_page_cost = 1.1;
ALTER DATABASE postgres SET effective_cache_size = '256MB';

-- 5. Garante que autovacuum rode com prioridade
ALTER DATABASE postgres SET autovacuum_vacuum_cost_delay = '2ms';
