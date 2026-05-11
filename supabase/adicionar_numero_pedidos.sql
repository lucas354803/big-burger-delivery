-- Rode este SQL no Supabase para salvar o número da casa nos pedidos
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS numero text;

-- Opcional: tenta preencher o número antigo quando ele estava junto na rua/endereço
UPDATE public.pedidos
SET numero = COALESCE(
  NULLIF(numero, ''),
  NULLIF(substring(endereco from '(?i)(?:n[ºo°]?\.?|numero|número)\s*[:,-]?\s*([0-9A-Za-z\-/]+)'), ''),
  NULLIF(substring(rua from ',\s*(?:n[ºo°]?\.?\s*)?([0-9A-Za-z\-/]+)\s*$'), '')
)
WHERE numero IS NULL OR numero = '';
