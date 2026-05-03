-- Atualização segura: NÃO apaga cardápio, produtos, clientes nem pedidos.
-- Apenas adiciona campos para esconder do painel os pedidos finalizados
-- quando clicar em "Zerar relatório diário".

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS arquivado_relatorio boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS arquivado_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_pedidos_arquivado_relatorio
  ON pedidos (arquivado_relatorio, status, created_at DESC);

-- Permite reiniciar a numeração diária sem apagar pedidos antigos.
-- Remove a trava UNIQUE antiga, porque depois do reset vai existir #01 em dias diferentes.
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_numero_pedido_key;
DROP INDEX IF EXISTS pedidos_numero_pedido_key;

CREATE OR REPLACE FUNCTION resetar_numero_pedidos_diario()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  seq_name text;
BEGIN
  seq_name := pg_get_serial_sequence('public.pedidos', 'numero_pedido');
  IF seq_name IS NOT NULL THEN
    EXECUTE format('ALTER SEQUENCE %s RESTART WITH 1', seq_name);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION resetar_numero_pedidos_diario() TO anon;
GRANT EXECUTE ON FUNCTION resetar_numero_pedidos_diario() TO authenticated;
GRANT EXECUTE ON FUNCTION resetar_numero_pedidos_diario() TO service_role;
