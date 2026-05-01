import { supabaseFetch, safeEnvStatus } from './_supabase.js';

export default async function handler(req, res) {
  try {
    const teste = await supabaseFetch('pedidos?select=id&limit=1', { method: 'GET' });
    res.status(200).json({ ok: true, env: safeEnvStatus(), supabase: teste });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, env: safeEnvStatus(), error: e.message, detalhes: e.data || null, rota: e.url_usada || null });
  }
}
