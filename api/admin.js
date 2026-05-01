import { supabaseAdmin } from './_supabase.js'
export default async function handler(req, res) {
  try {
    const db = supabaseAdmin()
    if (req.method === 'GET') {
      const { data, error } = await db.from('pedidos').select('*').order('created_at', { ascending: false }).limit(100)
      if (error) throw error
      return res.json({ pedidos: data })
    }
    if (req.method === 'POST') {
      const { pedido_id, status } = req.body || {}
      const { data, error } = await db.from('pedidos').update({ status }).eq('id', pedido_id).select('*').single()
      if (error) throw error
      return res.json({ pedido: data })
    }
    return res.status(405).json({ error: 'Método não permitido' })
  } catch (err) { return res.status(500).json({ error: err.message }) }
}
