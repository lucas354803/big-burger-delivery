import { supabaseFetch } from './_supabase.js';
const STATUS_OK = new Set(['em_analise','em_preparo','pronto','em_entrega','finalizado','cancelado']);
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Use POST' });
  try {
    const { id, status } = req.body || {};
    if (!id) return res.status(400).json({ ok:false, error:'ID do pedido obrigatório' });
    if (!STATUS_OK.has(status)) return res.status(400).json({ ok:false, error:'Status inválido' });
    const data = await supabaseFetch(`pedidos?id=eq.${encodeURIComponent(id)}`, { method:'PATCH', body: JSON.stringify({ status }) });
    res.status(200).json({ ok:true, pedido:data?.[0] || data });
  } catch (e) { res.status(e.status || 500).json({ ok:false, error:e.message, detalhes:e.data || null }); }
}
