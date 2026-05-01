-- BIG BURGER DELIVERY + ROTA EXPRESS - BANCO LIMPO COM ADMIN PROFISSIONAL
-- ATENÇÃO: isso apaga as tabelas antigas e recria do zero.

DROP TABLE IF EXISTS bairros_entrega CASCADE;
DROP TABLE IF EXISTS cidades_entrega CASCADE;
DROP TABLE IF EXISTS corridas CASCADE;
DROP TABLE IF EXISTS pagamentos CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS produto_complemento_categorias CASCADE;
DROP TABLE IF EXISTS complementos CASCADE;
DROP TABLE IF EXISTS categorias_complementos CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
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
  desconto_ativo boolean NOT NULL DEFAULT false,
  desconto_percentual numeric(5,2) NOT NULL DEFAULT 0,
  preco_promocional numeric(10,2),
  badge text,
  promocao_ativa boolean NOT NULL DEFAULT false,
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

CREATE TABLE produto_complemento_categorias (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id uuid NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  categoria_complemento_id uuid NOT NULL REFERENCES categorias_complementos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(produto_id, categoria_complemento_id)
);

CREATE TABLE pedidos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_nome text NOT NULL,
  cliente_telefone text NOT NULL,
  endereco text NOT NULL,
  cidade text,
  bairro text,
  rua text,
  forma_pagamento text NOT NULL DEFAULT 'pix',
  taxa_entrega numeric(10,2) NOT NULL DEFAULT 0,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
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


CREATE TABLE cidades_entrega (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bairros_entrega (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cidade_id uuid NOT NULL REFERENCES cidades_entrega(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tempo_maximo_minutos integer NOT NULL DEFAULT 40,
  preco numeric(10,2) NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);


ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_complementos ENABLE ROW LEVEL SECURITY;
ALTER TABLE complementos ENABLE ROW LEVEL SECURITY;
ALTER TABLE produto_complemento_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE corridas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cidades_entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE bairros_entrega ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorias_all" ON categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "produtos_all" ON produtos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "categorias_complementos_all" ON categorias_complementos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "complementos_all" ON complementos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "produto_complemento_categorias_all" ON produto_complemento_categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pedidos_all" ON pedidos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pagamentos_all" ON pagamentos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "corridas_all" ON corridas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "cidades_entrega_all" ON cidades_entrega FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "bairros_entrega_all" ON bairros_entrega FOR ALL USING (true) WITH CHECK (true);



-- Cidades e bairros de entrega iniciais editáveis no Admin → Entrega
INSERT INTO cidades_entrega (nome, ordem) VALUES
('Criciúma - SC', 1),
('Içara - SC', 2);

INSERT INTO bairros_entrega (cidade_id, nome, tempo_maximo_minutos, preco, ordem)
SELECT c.id, v.nome, v.tempo, v.preco, v.ordem
FROM cidades_entrega c
JOIN (VALUES
('Vila Rica',40,6.00,1),
('Argentina',40,6.00,2),
('Imigrantes',40,9.00,3),
('Brasília',35,6.00,4),
('Próspera',35,5.00,5),
('Pio Corrêa',35,5.00,6),
('Vera Cruz',40,6.00,7),
('Santa Catarina',40,8.00,8),
('Operária Nova',40,8.00,9),
('Santo Antônio',40,8.00,10),
('São Cristóvão',35,6.00,11),
('Comerciário',35,6.00,12),
('Santa Bárbara',40,8.00,13),
('Michel',35,6.00,14),
('Pedro Zanivan',40,8.00,15),
('Primeira Linha',40,8.00,16),
('Milanese',40,8.00,17),
('Recanto Verde',35,6.00,18),
('Fábio Silva',35,6.00,19),
('São Luiz',35,6.00,20),
('São João',40,6.00,21),
('Renascer',35,4.00,22),
('Bosque do Repouso',30,3.00,23),
('Ceará',30,3.00,24),
('Nossa Senhora da Salete',30,4.00,25),
('Jardim Maristela',25,0.00,26),
('Cristo Redentor',30,0.00,27),
('Ana Maria',25,0.00,28)
) AS v(nome, tempo, preco, ordem) ON c.nome='Criciúma - SC';

INSERT INTO bairros_entrega (cidade_id, nome, tempo_maximo_minutos, preco, ordem)
SELECT c.id, v.nome, v.tempo, v.preco, v.ordem
FROM cidades_entrega c
JOIN (VALUES
('Cristo Rei',40,8.00,1),
('Raichaski',40,8.00,2),
('Liri',40,8.00,3),
('Marili',35,5.00,4),
('Presidente Vargas',35,8.00,5)
) AS v(nome, tempo, preco, ordem) ON c.nome='Içara - SC';

INSERT INTO categorias (nome, ordem) VALUES
('🍔 HAMBÚRGUERES', 1),
('🔥 COMBOS', 2),
('🍟 PORÇÕES', 3),
('🥤 BEBIDAS', 4);

INSERT INTO produtos (categoria_id, nome, descricao, preco, desconto_ativo, desconto_percentual, preco_promocional, badge, ordem)
SELECT c.id, 'Big Burger Smash', 'Blend smash, queijo cheddar, bacon, cebola crispy e molho especial da casa.', 28.90, true, 10.38, 25.90, 'MAIS PEDIDO', 1 FROM categorias c WHERE c.nome='🍔 HAMBÚRGUERES';
INSERT INTO produtos (categoria_id, nome, descricao, preco, ordem)
SELECT c.id, 'Big Onion Burger', 'Blend artesanal, queijo prato, onion rings, barbecue e maionese da casa.', 27.90, 2 FROM categorias c WHERE c.nome='🍔 HAMBÚRGUERES';
INSERT INTO produtos (categoria_id, nome, descricao, preco, ordem)
SELECT c.id, 'Big Bacon Cheddar', 'Blend artesanal, cheddar cremoso, bacon em tiras e molho especial.', 29.90, 3 FROM categorias c WHERE c.nome='🍔 HAMBÚRGUERES';
INSERT INTO produtos (categoria_id, nome, descricao, preco, ordem)
SELECT c.id, 'Big Chicken Crispy', 'Frango empanado crocante, queijo, alface, tomate e maionese temperada.', 25.90, 4 FROM categorias c WHERE c.nome='🍔 HAMBÚRGUERES';
INSERT INTO produtos (categoria_id, nome, descricao, preco, badge, ordem)
SELECT c.id, 'Combo Duplo', '2 burgers + fritas crocantes + refrigerante 600ml.', 39.90, 'COMBO', 1 FROM categorias c WHERE c.nome='🔥 COMBOS';
UPDATE produtos SET promocao_ativa=true, desconto_ativo=true, preco_promocional=39.90, desconto_percentual=0 WHERE nome='Combo Duplo';
INSERT INTO produtos (categoria_id, nome, descricao, preco, badge, ordem)
SELECT c.id, 'Combo Família', '4 burgers + 4 fritas + refrigerante 1,5L para dividir.', 84.90, 'FAMÍLIA', 2 FROM categorias c WHERE c.nome='🔥 COMBOS';
UPDATE produtos SET promocao_ativa=true WHERE nome='Combo Família';

INSERT INTO categorias_complementos (nome, min_escolha, max_escolha, ordem) VALUES
('🍔 Transforme em combo', 0, 3, 1),
('🥩 Carnes', 0, 3, 2),
('🧀 Queijos', 0, 3, 3),
('🍟 Extras', 0, 6, 4),
('🥫 Molhos', 0, 4, 5);

INSERT INTO complementos (categoria_complemento_id, nome, preco, ordem)
SELECT cc.id, 'Fritas', 4.50, 1 FROM categorias_complementos cc WHERE cc.nome='🍔 Transforme em combo';
INSERT INTO complementos (categoria_complemento_id, nome, preco, ordem)
SELECT cc.id, 'Cebola onion rings', 5.00, 2 FROM categorias_complementos cc WHERE cc.nome='🍔 Transforme em combo';
INSERT INTO complementos (categoria_complemento_id, nome, preco, ordem)
SELECT cc.id, 'Adicional de carne', 6.00, 1 FROM categorias_complementos cc WHERE cc.nome='🥩 Carnes';
INSERT INTO complementos (categoria_complemento_id, nome, preco, ordem)
SELECT cc.id, 'Bacon em cubos', 5.00, 2 FROM categorias_complementos cc WHERE cc.nome='🥩 Carnes';
INSERT INTO complementos (categoria_complemento_id, nome, preco, ordem)
SELECT cc.id, 'Queijo mussarela', 3.00, 1 FROM categorias_complementos cc WHERE cc.nome='🧀 Queijos';
INSERT INTO complementos (categoria_complemento_id, nome, preco, ordem)
SELECT cc.id, 'Cheddar extra', 4.00, 2 FROM categorias_complementos cc WHERE cc.nome='🧀 Queijos';
INSERT INTO complementos (categoria_complemento_id, nome, preco, ordem)
SELECT cc.id, 'Onion rings', 5.00, 1 FROM categorias_complementos cc WHERE cc.nome='🍟 Extras';
INSERT INTO complementos (categoria_complemento_id, nome, preco, ordem)
SELECT cc.id, 'Maionese da casa', 2.00, 1 FROM categorias_complementos cc WHERE cc.nome='🥫 Molhos';

-- Vincula todas as categorias de complementos aos produtos iniciais.
INSERT INTO produto_complemento_categorias (produto_id, categoria_complemento_id)
SELECT p.id, cc.id
FROM produtos p
CROSS JOIN categorias_complementos cc
ON CONFLICT DO NOTHING;
