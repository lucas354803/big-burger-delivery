import { MercadoPagoConfig, Payment } from 'mercadopago'
import { supabaseAdmin } from './_supabase.js'

async function criarCorridaSeNaoExiste(db, pedido) {
  const { data: existente } = await db.from('corridas').select('id').eq('pedido_id', pedido.id).maybeSingle()
  if (existente) return existente
  const valorEntrega = Number(pedido.valor_entrega || 7)
  const valorAdmin = Number((valorEntrega * 0.15).toFixed(2))
  const valorMotoboy = Number((valorEntrega - valorAdmin).toFixed(2))
  const { data, error } = await db.from('corridas').insert({
    pedido_id: pedido.id,
    status: 'disponivel',
    valor_entrega: valorEntrega,
    valor_motoboy: valorMotoboy,
    valor_admin: valorAdmin,
    origem: 'big_burger'
  }).select('*').single()
  if (error) throw error
  return data
}

export default async function handler(req, res) {
  try {
    const id = req.query['data.id'] || req.query.id || req.body?.data?.id || req.body?.id
    if (!id) return res.status(200).json({ ok: true, ignored: 'sem id' })
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_TOKEN })
    const payment = new Payment(client)
    const mp = await payment.get({ id })
    const db = supabaseAdmin()
    const { data: pagamento } = await db.from('pagamentos').select('*').eq('mp_payment_id', String(id)).maybeSingle()
    if (!pagamento) return res.status(200).json({ ok: true, ignored: 'pagamento não localizado' })
    await db.from('pagamentos').update({ status: mp.status || 'desconhecido', resposta_mp: mp }).eq('id', pagamento.id)
    if (mp.status === 'approved') {
      const { data: pedido, error } = await db.from('pedidos').update({ status: 'pago' }).eq('id', pagamento.pedido_id).select('*').single()
      if (error) throw error
      await criarCorridaSeNaoExiste(db, pedido)
    }
    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
