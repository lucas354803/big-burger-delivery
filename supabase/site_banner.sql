-- Execute este arquivo no SQL Editor do Supabase para liberar a aba Admin > Banner / Vídeo.

CREATE TABLE IF NOT EXISTS site_banner (
  id integer PRIMARY KEY DEFAULT 1,
  ativo boolean NOT NULL DEFAULT true,
  tipo text NOT NULL DEFAULT 'video' CHECK (tipo IN ('video','imagem')),
  media_url text NOT NULL DEFAULT '/bigburger-video.mp4',
  tag text NOT NULL DEFAULT '🔥 Feito na hora • entrega rápida',
  titulo text NOT NULL DEFAULT 'O MELHOR BURGER DA CIDADE!',
  destaque text NOT NULL DEFAULT 'BURGER',
  texto text NOT NULL DEFAULT 'Ingredientes selecionados, sabor irresistível e Pix direto no pedido.',
  botao_texto text NOT NULL DEFAULT 'PEÇA AGORA ›',
  selo text NOT NULL DEFAULT '🔥 BIG BURGER',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_banner_singleton CHECK (id = 1)
);

ALTER TABLE site_banner ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "site_banner_all" ON site_banner;
CREATE POLICY "site_banner_all" ON site_banner FOR ALL USING (true) WITH CHECK (true);

INSERT INTO site_banner (id, ativo, tipo, media_url, tag, titulo, destaque, texto, botao_texto, selo)
VALUES (1, true, 'video', '/bigburger-video.mp4', '🔥 Feito na hora • entrega rápida', 'O MELHOR BURGER DA CIDADE!', 'BURGER', 'Ingredientes selecionados, sabor irresistível e Pix direto no pedido.', 'PEÇA AGORA ›', '🔥 BIG BURGER')
ON CONFLICT (id) DO NOTHING;
