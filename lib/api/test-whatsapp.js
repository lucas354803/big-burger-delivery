import { sendEvolutionText, formatBrazilNumber, getEvolutionState, evolutionEnv } from '../evolution.js';

export default async function handler(req, res) {
  try {
    const body = req.method === 'POST' ? (req.body || {}) : (req.query || {});
    const number = body.number || body.telefone || body.whatsapp || '48996371214';
    const text = body.text || '🔥 TESTE BIG BURGER EVOLUTION 🔥';
    const state = await getEvolutionState().catch((e)=>({ ok:false, error:e.message }));
    const sent = await sendEvolutionText(number, text);
    return res.status(200).json({ ok:true, numero_digitado:number, numero_formatado:formatBrazilNumber(number), env:evolutionEnv(), state, sent });
  } catch (e) {
    return res.status(e.status || 500).json({ ok:false, error:e.message, detalhes:e.data || null, number:e.number || null, state:e.state || null, url:e.url || null });
  }
}
