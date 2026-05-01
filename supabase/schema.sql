create extension if not exists "pgcrypto";

create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  preco numeric(10,2) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_nome text not null,
  cliente_telefone text not null,
  endereco_entrega text not null,
  observacao text,
  itens jsonb not null default '[]'::jsonb,
  valor_total numeric(10,2) not null default 0,
  valor_entrega numeric(10,2) not null default 7,
  status text not null default 'aguardando_pagamento',
  origem text default 'big_burger',
  created_at timestamptz default now()
);

create table if not exists pagamentos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos(id) on delete cascade,
  valor numeric(10,2) not null default 0,
  status text not null default 'pendente',
  mp_payment_id text,
  resposta_mp jsonb,
  created_at timestamptz default now()
);

create table if not exists corridas (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos(id) on delete cascade,
  motoboy_nome text,
  status text not null default 'disponivel',
  valor_entrega numeric(10,2) not null default 7,
  valor_motoboy numeric(10,2) not null default 5.95,
  valor_admin numeric(10,2) not null default 1.05,
  origem text default 'big_burger',
  created_at timestamptz default now()
);

create table if not exists historico_pagamentos (
  id uuid primary key default gen_random_uuid(),
  corrida_id uuid references corridas(id) on delete set null,
  motoboy_nome text,
  valor_motoboy numeric(10,2),
  valor_admin numeric(10,2),
  status text default 'pendente_pagamento',
  created_at timestamptz default now()
);

insert into produtos (id,nome,descricao,preco,ativo) values
('11111111-1111-1111-1111-111111111111','Big Burger','Hambúrguer artesanal da casa',23.90,true),
('22222222-2222-2222-2222-222222222222','Combo Duplo','2 burgers + fritas + refri 600ml',39.90,true),
('33333333-3333-3333-3333-333333333333','Combo Família','4 burgers + 4 fritas + refri 1,5L',84.90,true)
on conflict (id) do update set nome=excluded.nome, descricao=excluded.descricao, preco=excluded.preco, ativo=excluded.ativo;
