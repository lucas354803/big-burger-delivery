-- Rode este arquivo no SQL Editor do Supabase antes de subir o ZIP, se seu banco já existe.
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS aceito_em timestamptz;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS nao_realizado_em timestamptz;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS precisa_troco boolean NOT NULL DEFAULT false;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS troco_para numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS troco_valor numeric(10,2) NOT NULL DEFAULT 0;
