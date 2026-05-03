import { supabaseFetch } from '../lib/_supabase.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const status = req.query?.status;
      const limit = Math.min(Number(req.query?.limit || 50), 200);
      let path = `pedidos?select=*&order=created_at.desc&limit=${limit}`;
      if (status) path = `pedidos?select=*&status=eq.${encodeURIComponent(status)}&order=created_at.desc&limit=${limit}`;
      const pedidos = await supabaseFetch(path, { method: 'GET', headers: { Prefer: '' } });
      return res.status(200).json({ ok: true, pedidos: pedidos || [] });
    }

    if (req.method === 'PATCH') {
      const { id, ...patch } = req.body || {};
      if (!id) return res.status(400).json({ ok:false, error:'ID obrigatório' });
      const data = await supabaseFetch(`pedidos?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(patch)
      });
      return res.status(200).json({ ok: true, pedido: data?.[0] || data });
    }

    return res.status(405).json({ ok:false, error:'Use GET ou PATCH' });
  } catch (e) {
    return res.status(e.status || 500).json({ ok:false, error:e.message, detalhes:e.data || null });
  }
}
