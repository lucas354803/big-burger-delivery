-- BIG BURGER - Mercado Pago Pix automático
-- Rode no Supabase > SQL Editor antes de testar o Pix.

CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id TEXT,
  mp_payment_id TEXT,
  status TEXT DEFAULT 'pendente',
  origem TEXT DEFAULT 'mercado_pago',
  valor NUMERIC DEFAULT 0,
  qr_code TEXT,
  qr_code_base64 TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS pedido_id TEXT;
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS mp_payment_id TEXT;
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente';
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'mercado_pago';
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS valor NUMERIC DEFAULT 0;
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS qr_code_base64 TEXT;
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_pagamentos_pedido_id ON pagamentos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_mp_payment_id ON pagamentos(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos(status);

-- Colunas que o sistema pode usar em pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS forma_pagamento TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'em_analise';
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS tempo_estimado_minutos INTEGER DEFAULT 40;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS taxa_entrega NUMERIC DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS valor_total NUMERIC DEFAULT 0;
