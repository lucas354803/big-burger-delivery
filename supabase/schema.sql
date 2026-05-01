create extension if not exists "uuid-ossp";

create table if not exists pedidos (
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

create table if not exists pagamentos (
  id uuid primary key default uuid_generate_v4(),
  pedido_id uuid references pedidos(id) on delete cascade,
  mp_payment_id text,
  status text not null default 'pendente',
  valor numeric(10,2) not null default 0,
  pix_copia_cola text,
  qr_code_base64 text,
  created_at timestamptz not null default now()
);

create table if not exists corridas (
  id uuid primary key default uuid_generate_v4(),
  pedido_id uuid references pedidos(id) on delete cascade,
  motoboy_id text,
  status text not null default 'disponivel',
  valor_entrega numeric(10,2) not null default 7.00,
  created_at timestamptz not null default now(),
  finalizada_em timestamptz
);

alter table pedidos enable row level security;
alter table pagamentos enable row level security;
alter table corridas enable row level security;

create policy if not exists "Leitura pedidos" on pedidos for select using (true);
create policy if not exists "Leitura pagamentos" on pagamentos for select using (true);
create policy if not exists "Leitura corridas" on corridas for select using (true);
