function normalizeSupabaseUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';

  const match = value.match(/https:\/\/[^\s/]+\.supabase\.co/i);
  if (match) return match[0].replace(/\/$/, '');

  return value
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/auth\/v1\/?$/i, '')
    .replace(/\/storage\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

const SUPABASE_URL = normalizeSupabaseUrl(process.env.SUPABASE_URL);
const SUPABASE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

export function checkEnv() {
  if (!SUPABASE_URL) throw new Error('Falta SUPABASE_URL na Vercel');
  if (!SUPABASE_KEY) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY na Vercel');
  if (!SUPABASE_URL.includes('.supabase.co')) throw new Error('SUPABASE_URL inválida. Use só o link do projeto: https://SEU-PROJETO.supabase.co');
}

export function safeEnvStatus() {
  return {
    supabase_url_ok: Boolean(SUPABASE_URL && SUPABASE_URL.includes('.supabase.co')),
    supabase_url_base: SUPABASE_URL ? SUPABASE_URL.replace(/https:\/\/([^\.]+)\./, 'https://***.') : null,
    service_role_key_ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    anon_key_ok: Boolean(process.env.SUPABASE_ANON_KEY),
    mp_token_ok: Boolean(process.env.MP_TOKEN),
    whatsapp_token_ok: Boolean(process.env.WHATSAPP_TOKEN),
    whatsapp_phone_number_id_ok: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID)
  };
}

export async function supabaseFetch(path, options = {}) {
  checkEnv();
  const cleanPath = String(path || '').replace(/^\/+/, '');
  const url = `${SUPABASE_URL}/rest/v1/${cleanPath}`;

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
    err.url_usada = url.replace(SUPABASE_URL, 'SUPABASE_URL');
    throw err;
  }
  return data;
}
