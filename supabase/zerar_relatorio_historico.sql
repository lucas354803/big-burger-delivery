-- Atualização segura: NÃO apaga cardápio, produtos, clientes nem pedidos.
-- Apenas adiciona campos para esconder do painel os pedidos finalizados
-- quando clicar em "Zerar relatório diário".

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS arquivado_relatorio boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS arquivado_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_pedidos_arquivado_relatorio
  ON pedidos (arquivado_relatorio, status, created_at DESC);
