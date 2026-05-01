const { env, supabaseFetch, json, getSupabaseBaseUrl } = require('./_lib');

module.exports = async function handler(req, res) {
  try {
    env('SUPABASE_SERVICE_ROLE_KEY');
    env('MP_TOKEN');
    const supabase_url_corrigida = getSupabaseBaseUrl();
    await supabaseFetch('pedidos?select=id&limit=1', { method: 'GET' });
    json(res, 200, { ok: true, message: 'API, Vercel e Supabase funcionando', supabase_url_corrigida });
  } catch (e) {
    json(res, 500, { ok: false, error: e.message });
  }
};
