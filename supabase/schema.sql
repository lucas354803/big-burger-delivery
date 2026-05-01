-- BIG BURGER DELIVERY + ROTA EXPRESS - BANCO LIMPO COM ADMIN DE CARDÁPIO
-- ATENÇÃO: isso apaga as tabelas antigas e recria do zero.

DROP TABLE IF EXISTS corridas CASCADE;
DROP TABLE IF EXISTS pagamentos CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
DROP TABLE IF EXISTS complementos CASCADE;
DROP TABLE IF EXISTS categorias_complementos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE categorias (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE produtos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria_id uuid REFERENCES categorias(id) ON DELETE SET NULL,
  nome text NOT NULL,
  descricao text,
  preco numeric(10,2) NOT NULL DEFAULT 0,
  badge text,
  imagem_url text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE categorias_complementos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome text NOT NULL,
  min_escolha integer NOT NULL DEFAULT 0,
  max_escolha integer NOT NULL DEFAULT 6,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE complementos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria_complemento_id uuid REFERENCES categorias_complementos(id) ON DELETE SET NULL,
  nome text NOT NULL,
  preco numeric(10,2) NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pedidos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_nome text NOT NULL,
  cliente_telefone text NOT NULL,
  endereco text NOT NULL,
  observacao text,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  valor_total numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aguardando_pagamento',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pagamentos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  mp_payment_id text,
  status text NOT NULL DEFAULT 'pendente',
  valor numeric(10,2) NOT NULL DEFAULT 0,
  pix_copia_cola text,
  qr_code_base64 text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE corridas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  motoboy_nome text,
  status text NOT NULL DEFAULT 'disponivel',
  valor_entrega numeric(10,2) NOT NULL DEFAULT 7.00,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_complementos ENABLE ROW LEVEL SECURITY;
ALTER TABLE complementos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE corridas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorias_all" ON categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "produtos_all" ON produtos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "categorias_complementos_all" ON categorias_complementos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "complementos_all" ON complementos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pedidos_all" ON pedidos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pagamentos_all" ON pagamentos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "corridas_all" ON corridas FOR ALL USING (true) WITH CHECK (true);

INSERT INTO categorias (nome, ordem) VALUES
('Destaques', 1),
('Combos', 2),
('Bebidas', 3);

INSERT INTO produtos (categoria_id, nome, descricao, preco, badge, ordem)
SELECT c.id, 'Big Burger Smash', 'Blend smash, queijo cheddar, bacon, cebola crispy e molho especial da casa.', 28.90, 'MAIS PEDIDO', 1 FROM categorias c WHERE c.nome='Destaques';
INSERT INTO produtos (categoria_id, nome, descricao, preco, ordem)
SELECT c.id, 'Big Onion Burger', 'Blend artesanal, queijo prato, onion rings, barbecue e maionese da casa.', 27.90, 2 FROM categorias c WHERE c.nome='Destaques';
INSERT INTO produtos (categoria_id, nome, descricao, preco, ordem)
SELECT c.id, 'Big Bacon Cheddar', 'Blend artesanal, cheddar cremoso, bacon em tiras e molho especial.', 29.90, 3 FROM categorias c WHERE c.nome='Destaques';
INSERT INTO produtos (categoria_id, nome, descricao, preco, ordem)
SELECT c.id, 'Big Chicken Crispy', 'Frango empanado crocante, queijo, alface, tomate e maionese temperada.', 25.90, 4 FROM categorias c WHERE c.nome='Destaques';
INSERT INTO produtos (categoria_id, nome, descricao, preco, badge, ordem)
SELECT c.id, 'Combo Duplo', '2 burgers + fritas crocantes + refrigerante 600ml.', 39.90, 'COMBO', 1 FROM categorias c WHERE c.nome='Combos';
INSERT INTO produtos (categoria_id, nome, descricao, preco, badge, ordem)
SELECT c.id, 'Combo Família', '4 burgers + 4 fritas + refrigerante 1,5L para dividir.', 84.90, 'FAMÍLIA', 2 FROM categorias c WHERE c.nome='Combos';

INSERT INTO categorias_complementos (nome, min_escolha, max_escolha, ordem) VALUES
('🥩 Carnes', 0, 3, 1),
('🧀 Queijos', 0, 3, 2),
('🍟 Extras', 0, 6, 3),
('🥫 Molhos', 0, 4, 4);

INSERT INTO complementos (categoria_complemento_id, nome, preco, ordem)
SELECT cc.id, 'Bacon em cubos', 5.00, 1 FROM categorias_complementos cc WHERE cc.nome='🥩 Carnes';
INSERT INTO complementos (categoria_complemento_id, nome, preco, ordem)
SELECT cc.id, 'Calabresa', 5.00, 2 FROM categorias_complementos cc WHERE cc.nome='🥩 Carnes';
INSERT INTO complementos (categoria_complemento_id, nome, preco, ordem)
SELECT cc.id, 'Queijo mussarela', 3.00, 1 FROM categorias_complementos cc WHERE cc.nome='🧀 Queijos';
INSERT INTO complementos (categoria_complemento_id, nome, preco, ordem)
SELECT cc.id, 'Cheddar extra', 4.00, 2 FROM categorias_complementos cc WHERE cc.nome='🧀 Queijos';
INSERT INTO complementos (categoria_complemento_id, nome, preco, ordem)
SELECT cc.id, 'Onion rings', 5.00, 1 FROM categorias_complementos cc WHERE cc.nome='🍟 Extras';
INSERT INTO complementos (categoria_complemento_id, nome, preco, ordem)
SELECT cc.id, 'Maionese da casa', 2.00, 1 FROM categorias_complementos cc WHERE cc.nome='🥫 Molhos';
