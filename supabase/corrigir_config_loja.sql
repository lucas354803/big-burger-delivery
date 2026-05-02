-- Correção da página: Loja aberta, pedido automático e horários
-- Execute este arquivo no Supabase > SQL Editor > RUN.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS loja_config (
  id integer PRIMARY KEY DEFAULT 1,
  loja_aberta boolean NOT NULL DEFAULT true,
  pedido_automatico boolean NOT NULL DEFAULT true,
  som_pedidos boolean NOT NULL DEFAULT true,
  tempo_entrega_padrao integer NOT NULL DEFAULT 40,
  pontos_por_real numeric(10,2) NOT NULL DEFAULT 1,
  mensagem_fechado text NOT NULL DEFAULT 'Estamos fechados no momento. Volte no nosso horário de atendimento.',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE loja_config ADD COLUMN IF NOT EXISTS loja_aberta boolean NOT NULL DEFAULT true;
ALTER TABLE loja_config ADD COLUMN IF NOT EXISTS pedido_automatico boolean NOT NULL DEFAULT true;
ALTER TABLE loja_config ADD COLUMN IF NOT EXISTS som_pedidos boolean NOT NULL DEFAULT true;
ALTER TABLE loja_config ADD COLUMN IF NOT EXISTS tempo_entrega_padrao integer NOT NULL DEFAULT 40;
ALTER TABLE loja_config ADD COLUMN IF NOT EXISTS pontos_por_real numeric(10,2) NOT NULL DEFAULT 1;
ALTER TABLE loja_config ADD COLUMN IF NOT EXISTS mensagem_fechado text NOT NULL DEFAULT 'Estamos fechados no momento. Volte no nosso horário de atendimento.';
ALTER TABLE loja_config ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS horarios_funcionamento (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  dia_semana integer NOT NULL UNIQUE,
  nome_dia text NOT NULL,
  abre text NOT NULL DEFAULT '18:30',
  fecha text NOT NULL DEFAULT '00:00',
  ativo boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE horarios_funcionamento ADD COLUMN IF NOT EXISTS dia_semana integer;
ALTER TABLE horarios_funcionamento ADD COLUMN IF NOT EXISTS nome_dia text;
ALTER TABLE horarios_funcionamento ADD COLUMN IF NOT EXISTS abre text NOT NULL DEFAULT '18:30';
ALTER TABLE horarios_funcionamento ADD COLUMN IF NOT EXISTS fecha text NOT NULL DEFAULT '00:00';
ALTER TABLE horarios_funcionamento ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
ALTER TABLE horarios_funcionamento ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'horarios_funcionamento_dia_semana_key'
  ) THEN
    ALTER TABLE horarios_funcionamento ADD CONSTRAINT horarios_funcionamento_dia_semana_key UNIQUE (dia_semana);
  END IF;
END $$;

ALTER TABLE loja_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE horarios_funcionamento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loja_config_all" ON loja_config;
DROP POLICY IF EXISTS "horarios_funcionamento_all" ON horarios_funcionamento;
CREATE POLICY "loja_config_all" ON loja_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "horarios_funcionamento_all" ON horarios_funcionamento FOR ALL USING (true) WITH CHECK (true);

INSERT INTO loja_config (id, loja_aberta, pedido_automatico, som_pedidos, tempo_entrega_padrao, pontos_por_real, mensagem_fechado, updated_at)
VALUES (1, true, true, true, 40, 1, 'Estamos fechados no momento. Volte no nosso horário de atendimento.', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO horarios_funcionamento (dia_semana, nome_dia, abre, fecha, ativo, updated_at) VALUES
(0,'Domingo','18:30','00:00',true,now()),
(1,'Segunda','18:30','00:00',false,now()),
(2,'Terça','18:30','00:00',true,now()),
(3,'Quarta','18:30','00:00',true,now()),
(4,'Quinta','18:30','00:00',true,now()),
(5,'Sexta','18:30','01:00',true,now()),
(6,'Sábado','18:30','01:00',true,now())
ON CONFLICT (dia_semana) DO NOTHING;
