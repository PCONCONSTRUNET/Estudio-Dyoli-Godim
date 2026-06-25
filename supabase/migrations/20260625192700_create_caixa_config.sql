-- Tabela de configurações do caixa (saldo físico manual por ciclo)
create table if not exists public.caixa_config (
  id text primary key,           -- chave do ciclo ex: "2026-06-01_2026-06-30"
  saldo_fisico_manual numeric,   -- valor digitado manualmente pela admin
  updated_at timestamptz default now()
);

-- Acesso apenas para usuários autenticados (admin)
alter table public.caixa_config enable row level security;

create policy "Admin acessa caixa_config"
  on public.caixa_config
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
