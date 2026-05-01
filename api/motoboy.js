import { supabaseAdmin } from './_supabase.js'
export default async function handler(req, res) {
  try {
    const db = supabaseAdmin()
    if (req.method === 'GET') {
      const { data, error } = await db.from('corridas').select('*, pedidos(*)').order('created_at', { ascending: false }).limit(100)
      if (error) throw error
      return res.json({ corridas: data })
    }
    if (req.method === 'POST') {
      const { corrida_id, status, motoboy_nome } = req.body || {}
      const update = { status }
      if (status === 'aceita') update.motoboy_nome = motoboy_nome || 'Motoboy'
      const { data: corrida, error } = await db.from('corridas').update(update).eq('id', corrida_id).select('*').single()
      if (error) throw error
      if (status === 'finalizada') {
        await db.from('pedidos').update({ status: 'entregue' }).eq('id', corrida.pedido_id)
        await db.from('historico_pagamentos').insert({
          corrida_id: corrida.id,
          motoboy_nome: corrida.motoboy_nome || motoboy_nome || 'Motoboy',
          valor_motoboy: corrida.valor_motoboy,
          valor_admin: corrida.valor_admin,
          status: 'pendente_pagamento'
        })
      }
      return res.json({ corrida })
    }
    return res.status(405).json({ error: 'Método não permitido' })
  } catch (err) { return res.status(500).json({ error: err.message }) }
}
