function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variável ausente na Vercel: ${name}`);
  return String(value).trim();
}

function getSupabaseBaseUrl() {
  let raw = env('SUPABASE_URL');

  // Se a pessoa colar a URL do painel do Supabase por engano:
  // https://supabase.com/dashboard/project/xxxx/settings/...
  const dashboardMatch = raw.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dashboardMatch) raw = `https://${dashboardMatch[1]}.supabase.co`;

  // Se colar https://xxxx.supabase.co/rest/v1 ou com algum caminho depois,
  // corta e deixa só https://xxxx.supabase.co
  try {
    const u = new URL(raw);
    if (u.hostname.endsWith('.supabase.co')) return `${u.protocol}//${u.hostname}`;
    throw new Error('SUPABASE_URL precisa ser igual a https://SEU-PROJETO.supabase.co');
  } catch (e) {
    throw new Error('SUPABASE_URL inválida. Use o link Project URL, exemplo: https://xxxx.supabase.co');
  }
}

async function supabaseFetch(path, options = {}) {
  const cleanPath = String(path || '').replace(/^\/+/, '');
  const url = `${getSupabaseBaseUrl()}/rest/v1/${cleanPath}`;
  const key = env('SUPABASE_SERVICE_ROLE_KEY');

  const headers = {
    apikey: key,
    authorization: `Bearer ${key}`,
    'content-type': 'application/json',
    ...(options.headers || {})
  };

  // Prefer só quando precisa retornar representação.
  if (!('prefer' in headers) && ['POST', 'PATCH', 'PUT'].includes(String(options.method || 'GET').toUpperCase())) {
    headers.prefer = 'return=representation';
  }
  if (headers.prefer === undefined) delete headers.prefer;

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const msg = typeof data === 'string' ? data : JSON.stringify(data);
    throw new Error(`Supabase erro ${res.status}: ${msg}`);
  }
  return data;
}

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

module.exports = { env, supabaseFetch, json, getSupabaseBaseUrl };
