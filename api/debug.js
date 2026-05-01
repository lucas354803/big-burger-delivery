const { env, supabaseFetch, json } = require('./_lib');
module.exports = async function handler(req, res) {
  try {
    env('SUPABASE_URL'); env('SUPABASE_SERVICE_ROLE_KEY');
    await supabaseFetch('pedidos?select=id&limit=1', { method: 'GET', headers: { prefer: undefined } });
    json(res, 200, { ok: true, message: 'Supabase conectado e API funcionando' });
  } catch (e) {
    json(res, 500, { ok: false, error: e.message });
  }
}
