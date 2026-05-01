import { createClient } from '@supabase/supabase-js'

function normalizeSupabaseUrl(raw) {
  if (!raw) return ''
  const value = String(raw).trim().replace(/\/$/, '')

  // Correto: https://xxxx.supabase.co
  if (/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(value)) return value

  // Se o usuário colou a URL do painel do Supabase, tipo:
  // https://supabase.com/dashboard/project/xxxx/settings/api-keys
  const dashboardMatch = value.match(/\/project\/([a-z0-9]+)(?:\/|$)/i)
  if (dashboardMatch?.[1]) return `https://${dashboardMatch[1]}.supabase.co`

  // Se colou só o project ref: xxxx
  if (/^[a-z0-9]{15,40}$/i.test(value)) return `https://${value}.supabase.co`

  return value
}

export function supabaseAdmin() {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

  if (!url) throw new Error('Configure SUPABASE_URL na Vercel. Use o Project URL: https://SEU-PROJETO.supabase.co')
  if (!key) throw new Error('Configure SUPABASE_SERVICE_ROLE_KEY na Vercel. Use a chave sb_secret_...')

  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    throw new Error('SUPABASE_URL inválida. Não cole o link do painel. Use: https://SEU-PROJETO.supabase.co')
  }

  return createClient(url, key, { auth: { persistSession: false } })
}
