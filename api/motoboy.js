const { supabaseFetch, json } = require('./_lib');

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const corridas = await supabaseFetch('corridas?select=*,pedidos(*)&order=created_at.desc&limit=100', { method: 'GET' });
      return json(res, 200, { ok: true, corridas });
    }

    const { id, acao } = req.body || {};
    if (!id) return json(res, 400, { error: 'id obrigatório' });

    let patch = {};
    if (acao === 'aceitar') patch = { status: 'aceita', motoboy_id: 'motoboy' };
    else if (acao === 'finalizar') patch = { status: 'finalizada', finalizada_em: new Date().toISOString() };
    else return json(res, 400, { error: 'ação inválida' });

    const updated = await supabaseFetch(`corridas?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    if (acao === 'finalizar' && updated?.[0]?.pedido_id) {
      await supabaseFetch(`pedidos?id=eq.${updated[0].pedido_id}`, { method: 'PATCH', body: JSON.stringify({ status: 'entregue' }) });
    }
    json(res, 200, { ok: true });
  } catch (e) {
    json(res, 500, { ok: false, error: e.message });
  }
};
