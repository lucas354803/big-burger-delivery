const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

export function checkEnv() {
  if (!SUPABASE_URL) throw new Error('Falta SUPABASE_URL na Vercel');
  if (!SUPABASE_KEY) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY na Vercel');
}

export async function supabaseFetch(path, options = {}) {
  checkEnv();
  const url = `${SUPABASE_URL}/rest/v1/${path.replace(/^\//, '')}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err = new Error(typeof data === 'string' ? data : JSON.stringify(data));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
