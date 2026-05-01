import { supabaseFetch } from './_supabase.js';
export default async function handler(req, res) {
  try {
    const pedidos = await supabaseFetch('pedidos?select=id&limit=1', { method: 'GET', headers: { Prefer: '' } });
    res.status(200).json({ ok: true, mensagem: 'API e Supabase funcionando', teste: pedidos });
  } catch (e) {
    res.status(500).json({ ok: false, erro: e.message, detalhes: e.data || null });
  }
}
