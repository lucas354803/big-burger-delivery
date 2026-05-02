import { supabaseFetch } from './_supabase.js';

function checkKey(req) {
  const expected = process.env.BOT_SECRET || 'bigburger_robo_2026';
  const got = req.query?.key || req.headers['x-bot-secret'];
  return String(got || '') === String(expected);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok:false, error:'Use GET' });
  if (!checkKey(req)) return res.status(401).json({ ok:false, error:'BOT_SECRET inválido' });

  try {
    const pedidos = await supabaseFetch(
      'pedidos?select=*&status=neq.em_analise&status=neq.cancelado&or=(whatsapp_status_enviado.is.null,whatsapp_status_enviado.eq.false)&order=created_at.asc&limit=10'
    );
    res.status(200).json({ ok:true, pedidos: pedidos || [] });
  } catch (e) {
    res.status(e.status || 500).json({ ok:false, error:e.message, detalhes:e.data || null });
  }
}
