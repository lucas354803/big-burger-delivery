-- Correção da área do motoboy / QR Code
-- Rode este SQL no Supabase se a tabela motoboy_entregas ainda não existir ou estiver sem relacionamento.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS motoboys (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome text NOT NULL,
  telefone text,
  token text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS motoboy_entregas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  motoboy_id uuid NOT NULL,
  pedido_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'registrado',
  valor_entrega numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE motoboy_entregas
  ADD CONSTRAINT motoboy_entregas_motoboy_id_fkey
  FOREIGN KEY (motoboy_id) REFERENCES motoboys(id) ON DELETE CASCADE;

ALTER TABLE motoboy_entregas
  ADD CONSTRAINT motoboy_entregas_pedido_id_fkey
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS motoboy_entregas_motoboy_pedido_uidx
ON motoboy_entregas (motoboy_id, pedido_id);

ALTER TABLE motoboys ENABLE ROW LEVEL SECURITY;
ALTER TABLE motoboy_entregas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "motoboys_all" ON motoboys;
DROP POLICY IF EXISTS "motoboy_entregas_all" ON motoboy_entregas;

CREATE POLICY "motoboys_all" ON motoboys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "motoboy_entregas_all" ON motoboy_entregas FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
