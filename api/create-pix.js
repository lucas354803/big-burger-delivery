import { supabaseAdmin } from './_supabase.js'

function getBaseUrl(req) {
  if (process.env.PUBLIC_BASE_URL && process.env.PUBLIC_BASE_URL.startsWith('http')) {
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, '')
  }
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return host ? `${proto}://${host}` : ''
}

function cleanToken(raw) {
  return String(raw || '').trim().replace(/^MP_TOKEN\s*=\s*/i, '').replace(/^['"]|['"]$/g, '')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  try {
    const token = cleanToken(process.env.MP_TOKEN)
    if (!token) return res.status(500).json({ error: 'Configure MP_TOKEN na Vercel' })

    const { pedido_id } = req.body || {}
    if (!pedido_id) return res.status(400).json({ error: 'Informe pedido_id' })

    const db = supabaseAdmin()
    const { data: pedido, error } = await db.from('pedidos').select('*').eq('id', pedido_id).single()
    if (error) throw error

    const baseUrl = getBaseUrl(req)
    const notificationUrl = baseUrl ? `${baseUrl}/api/mp-webhook` : undefined

    const body = {
      transaction_amount: Number(pedido.valor_total),
      description: `Pedido Big Burger #${pedido.id}`,
      payment_method_id: 'pix',
      external_reference: String(pedido.id),
      payer: {
        email: `cliente-${pedido.id}@bigburger.local`,
        first_name: pedido.cliente_nome || 'Cliente'
      }
    }
    if (notificationUrl && notificationUrl.startsWith('https://')) {
      body.notification_url = notificationUrl
    }

    const mpResp = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `pedido-${pedido.id}-${Date.now()}`
      },
      body: JSON.stringify(body)
    })

    const mp = await mpResp.json()
    if (!mpResp.ok) {
      return res.status(500).json({
        error: mp?.message || mp?.error || 'Mercado Pago recusou a criação do Pix',
        detalhe: mp
      })
    }

    await db.from('pagamentos').insert({
      pedido_id: pedido.id,
      valor: pedido.valor_total,
      status: mp.status || 'pendente',
      mp_payment_id: String(mp.id),
      resposta_mp: mp
    })

    return res.status(200).json({
      payment_id: mp.id,
      qr_code: mp.point_of_interaction?.transaction_data?.qr_code || '',
      qr_code_base64: mp.point_of_interaction?.transaction_data?.qr_code_base64 || ''
    })
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Erro ao gerar Pix' })
  }
}
