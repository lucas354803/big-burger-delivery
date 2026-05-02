import { supabaseFetch } from './_supabase.js';

function checkKey(req) {
  const expected = process.env.BOT_SECRET || 'bigburger_robo_2026';
  const got = req.query?.key || req.headers['x-bot-secret'];
  return String(got || '') === String(expected);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Use POST' });
  if (!checkKey(req)) return res.status(401).json({ ok:false, error:'BOT_SECRET inválido' });

  try {
    const { id, enviado = true, erro = null } = req.body || {};
    if (!id) return res.status(400).json({ ok:false, error:'ID obrigatório' });

    const patch = enviado
      ? { whatsapp_status_enviado: true, whatsapp_status_enviado_em: new Date().toISOString(), whatsapp_status_erro: null }
      : { whatsapp_status_enviado: false, whatsapp_status_erro: String(erro || 'Erro desconhecido') };

    const data = await supabaseFetch(`pedidos?id=eq.${encodeURIComponent(id)}`, {
      method:'PATCH',
      body: JSON.stringify(patch)
    });

    res.status(200).json({ ok:true, pedido: data?.[0] || data });
  } catch (e) {
    res.status(e.status || 500).json({ ok:false, error:e.message, detalhes:e.data || null });
  }
}
