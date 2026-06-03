-- ─── Tabela: gastos ───────────────────────────────────────────────────────────
-- Registro de gastos gerais do estúdio.
-- NÃO afeta caixa, comissão ou despesas — é apenas para controle de gastos.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists gastos (
  id            uuid primary key default gen_random_uuid(),
  descricao     text not null,
  valor         numeric(10,2) not null check (valor >= 0),
  categoria     text not null default 'Outros',
  responsavel   text not null default 'Dona' check (responsavel in ('Dona', 'Zelia')),
  data_gasto    date not null default current_date,
  observacao    text,
  created_at    timestamptz not null default now()
);

-- RLS
alter table gastos enable row level security;

-- Acesso total para service_role (funções edge)
create policy "service_role_gastos_all"
  on gastos for all
  using (true)
  with check (true);

-- Acesso anon para leitura + escrita (admin sem auth)
create policy "anon_gastos_select"
  on gastos for select
  to anon
  using (true);

create policy "anon_gastos_insert"
  on gastos for insert
  to anon
  with check (true);

create policy "anon_gastos_update"
  on gastos for update
  to anon
  using (true)
  with check (true);

create policy "anon_gastos_delete"
  on gastos for delete
  to anon
  using (true);
