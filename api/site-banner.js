import { supabaseFetch } from '../lib/_supabase.js';

const defaultBanner = {
  id: 1,
  ativo: true,
  tipo: 'video',
  media_url: '/bigburger-video.mp4',
  tag: '🔥 Feito na hora • entrega rápida',
  titulo: 'O MELHOR BURGER DA CIDADE!',
  destaque: 'BURGER',
  texto: 'Ingredientes selecionados, sabor irresistível e Pix direto no pedido.',
  botao_texto: 'PEÇA AGORA ›',
  selo: '🔥 BIG BURGER'
};

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function clean(body = {}) {
  return {
    id: 1,
    ativo: body.ativo !== false,
    tipo: String(body.tipo || 'video') === 'imagem' ? 'imagem' : 'video',
    media_url: String(body.media_url || defaultBanner.media_url).trim(),
    tag: String(body.tag || defaultBanner.tag).trim(),
    titulo: String(body.titulo || defaultBanner.titulo).trim(),
    destaque: String(body.destaque || defaultBanner.destaque).trim(),
    texto: String(body.texto || defaultBanner.texto).trim(),
    botao_texto: String(body.botao_texto || defaultBanner.botao_texto).trim(),
    selo: String(body.selo || defaultBanner.selo).trim(),
    updated_at: new Date().toISOString()
  };
}

async function getBanner() {
  try {
    const rows = await supabaseFetch('site_banner?select=*&id=eq.1&limit=1', { headers: { Prefer: '' } });
    if (rows?.[0]) return { ...defaultBanner, ...rows[0] };
  } catch (e) {}
  return defaultBanner;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  try {
    if (req.method === 'GET') return res.status(200).json({ ok: true, banner: await getBanner() });
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Use GET ou POST' });

    const payload = clean(parseBody(req));
    let saved = null;
    try {
      const patched = await supabaseFetch('site_banner?id=eq.1', {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload)
      });
      if (Array.isArray(patched) && patched.length) saved = patched[0];
    } catch (e) {}

    if (!saved) {
      const upserted = await supabaseFetch('site_banner?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(payload)
      });
      saved = Array.isArray(upserted) ? upserted[0] : upserted;
    }
    return res.status(200).json({ ok: true, banner: saved || payload });
  } catch (e) {
    return res.status(e.status || 500).json({ ok: false, error: e.message, detalhes: e.data || null, dica: 'Execute o arquivo supabase/site_banner.sql no SQL Editor do Supabase.' });
  }
}
