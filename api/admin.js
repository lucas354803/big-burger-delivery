const { supabaseFetch, json } = require('./_lib');
module.exports = async function handler(req, res) {
  try {
    const pedidos = await supabaseFetch('pedidos?select=*&order=created_at.desc&limit=100', { method: 'GET', headers: { prefer: undefined } });
    json(res, 200, { ok: true, pedidos });
  } catch (e) { json(res, 500, { ok: false, error: e.message }); }
}
