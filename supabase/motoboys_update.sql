-- Atualização SEM apagar nada: sistema de motoboys + link individual + QR da comanda
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
  motoboy_id uuid NOT NULL REFERENCES motoboys(id) ON DELETE CASCADE,
  pedido_id uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'registrado',
  valor_entrega numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(motoboy_id, pedido_id)
);

ALTER TABLE motoboys ENABLE ROW LEVEL SECURITY;
ALTER TABLE motoboy_entregas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "motoboys_all" ON motoboys;
DROP POLICY IF EXISTS "motoboy_entregas_all" ON motoboy_entregas;
CREATE POLICY "motoboys_all" ON motoboys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "motoboy_entregas_all" ON motoboy_entregas FOR ALL USING (true) WITH CHECK (true);
