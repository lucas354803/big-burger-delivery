-- BIG BURGER DELIVERY + ROTA EXPRESS - BANCO LIMPO COM ADMIN DE CARDÁPIO
-- ATENÇÃO: isso apaga as tabelas antigas e recria do zero.

drop table if exists corridas cascade;
drop table if exists pagamentos cascade;
drop table if exists pedidos cascade;
drop table if exists produtos cascade;
drop table if exists complementos cascade;
drop table if exists categorias cascade;

create extension if not exists "uuid-ossp";

create table categorias (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table produtos (
  id uuid primary key default uuid_generate_v4(),
  categoria_id uuid references categorias(id) on delete set null,
  nome text not null,
  descricao text,
  preco numeric(10,2) not null default 0,
  badge text,
  imagem_url text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table complementos (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  preco numeric(10,2) not null default 0,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

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

alter table categorias enable row level security;
alter table produtos enable row level security;
alter table complementos enable row level security;
alter table pedidos enable row level security;
alter table pagamentos enable row level security;
alter table corridas enable row level security;

create policy "categorias_all" on categorias for all using (true) with check (true);
create policy "produtos_all" on produtos for all using (true) with check (true);
create policy "complementos_all" on complementos for all using (true) with check (true);
create policy "pedidos_all" on pedidos for all using (true) with check (true);
create policy "pagamentos_all" on pagamentos for all using (true) with check (true);
create policy "corridas_all" on corridas for all using (true) with check (true);

insert into categorias (nome, ordem) values
('Destaques', 1),
('Combos', 2),
('Bebidas', 3);

insert into produtos (categoria_id, nome, descricao, preco, badge, ordem)
select c.id, 'Big Burger Smash', 'Blend smash, queijo cheddar, bacon, cebola crispy e molho especial da casa.', 28.90, 'MAIS PEDIDO', 1 from categorias c where c.nome='Destaques';
insert into produtos (categoria_id, nome, descricao, preco, ordem)
select c.id, 'Big Onion Burger', 'Blend artesanal, queijo prato, onion rings, barbecue e maionese da casa.', 27.90, 2 from categorias c where c.nome='Destaques';
insert into produtos (categoria_id, nome, descricao, preco, ordem)
select c.id, 'Big Bacon Cheddar', 'Blend artesanal, cheddar cremoso, bacon em tiras e molho especial.', 29.90, 3 from categorias c where c.nome='Destaques';
insert into produtos (categoria_id, nome, descricao, preco, ordem)
select c.id, 'Big Chicken Crispy', 'Frango empanado crocante, queijo, alface, tomate e maionese temperada.', 25.90, 4 from categorias c where c.nome='Destaques';
insert into produtos (categoria_id, nome, descricao, preco, badge, ordem)
select c.id, 'Combo Duplo', '2 burgers + fritas crocantes + refrigerante 600ml.', 39.90, 'COMBO', 1 from categorias c where c.nome='Combos';
insert into produtos (categoria_id, nome, descricao, preco, badge, ordem)
select c.id, 'Combo Família', '4 burgers + 4 fritas + refrigerante 1,5L para dividir.', 84.90, 'FAMÍLIA', 2 from categorias c where c.nome='Combos';

insert into complementos (nome, preco, ordem) values
('Bacon em cubos', 5.00, 1),
('Calabresa', 5.00, 2),
('Queijo mussarela', 3.00, 3),
('Cheddar extra', 4.00, 4),
('Onion rings', 5.00, 5),
('Maionese da casa', 2.00, 6);
