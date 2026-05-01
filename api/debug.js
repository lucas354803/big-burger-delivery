import { supabaseAdmin } from './_supabase.js'

export default async function handler(req, res) {
  try {
    const db = supabaseAdmin()
    const { error } = await db.from('produtos').select('id').limit(1)
    if (error) throw error
    return res.status(200).json({ ok: true, supabase: 'conectado', mp_token: Boolean(process.env.MP_TOKEN) })
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message })
  }
}
