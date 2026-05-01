-- BIG BURGER DELIVERY + ROTA EXPRESS - BANCO LIMPO
-- ATENÇÃO: isso apaga as tabelas antigas e recria do zero.

drop table if exists corridas cascade;
drop table if exists pagamentos cascade;
drop table if exists pedidos cascade;

create extension if not exists "uuid-ossp";

create table pedidos (
  id uuid primary key default uuid_generate_v4(),
  cliente_nome text not null,
  cliente_telefone text not null,
  endereco text not null,
  observacao text,
  itens jsonb not null default '[]'::jsonb,
  valor_total numeric(10,2) not null default 0,
  status text not null default 'aguardando_pagamento',
  created_at timestamptz not null default now()
);

create table pagamentos (
  id uuid primary key default uuid_generate_v4(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  mp_payment_id text,
  status text not null default 'pendente',
  valor numeric(10,2) not null default 0,
  pix_copia_cola text,
  qr_code_base64 text,
  created_at timestamptz not null default now()
);

create table corridas (
  id uuid primary key default uuid_generate_v4(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  motoboy_nome text,
  status text not null default 'disponivel',
  valor_entrega numeric(10,2) not null default 7.00,
  created_at timestamptz not null default now()
);

alter table pedidos enable row level security;
alter table pagamentos enable row level security;
alter table corridas enable row level security;

create policy "pedidos_select" on pedidos for select using (true);
create policy "pedidos_insert" on pedidos for insert with check (true);
create policy "pedidos_update" on pedidos for update using (true);

create policy "pagamentos_select" on pagamentos for select using (true);
create policy "pagamentos_insert" on pagamentos for insert with check (true);
create policy "pagamentos_update" on pagamentos for update using (true);

create policy "corridas_select" on corridas for select using (true);
create policy "corridas_insert" on corridas for insert with check (true);
create policy "corridas_update" on corridas for update using (true);
