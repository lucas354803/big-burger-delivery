const { env, supabaseFetch, json } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Use POST' });
  try {
    const body = req.body || {};
    const nome = String(body.nome || '').trim();
    const telefone = String(body.telefone || '').trim();
    const endereco = String(body.endereco || '').trim();
    const observacao = String(body.observacao || '').trim();
    const itens = Array.isArray(body.itens) ? body.itens : [];
    const valorTotal = Number(body.valor_total || 0);

    if (!nome || !telefone || !endereco || !itens.length || valorTotal <= 0) {
      return json(res, 400, { error: 'Preencha nome, telefone, endereço e itens.' });
    }

    const pedido = await supabaseFetch('pedidos', {
      method: 'POST',
      body: JSON.stringify({ cliente_nome: nome, cliente_telefone: telefone, endereco, observacao, itens, valor_total: valorTotal, status: 'aguardando_pagamento' })
    });
    const pedidoId = pedido[0].id;

    const baseUrl = process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`;
    const mpPayload = {
      transaction_amount: Number(valorTotal.toFixed(2)),
      description: `Pedido Big Burger ${pedidoId}`,
      payment_method_id: 'pix',
      external_reference: pedidoId,
      notification_url: `${baseUrl}/api/webhook`,
      payer: {
        email: `cliente_${Date.now()}@bigburger.local`,
        first_name: nome.split(' ')[0] || 'Cliente'
      }
    };

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env('MP_TOKEN')}`,
        'content-type': 'application/json',
        'x-idempotency-key': pedidoId
      },
      body: JSON.stringify(mpPayload)
    });
    const mp = await mpRes.json();
    if (!mpRes.ok) throw new Error(mp.message || JSON.stringify(mp));

    const pix = mp.point_of_interaction?.transaction_data || {};
    await supabaseFetch('pagamentos', {
      method: 'POST',
      body: JSON.stringify({
        pedido_id: pedidoId,
        mp_payment_id: String(mp.id),
        status: mp.status || 'pendente',
        valor: valorTotal,
        pix_copia_cola: pix.qr_code || '',
        qr_code_base64: pix.qr_code_base64 || ''
      })
    });

    json(res, 200, { ok: true, pedido_id: pedidoId, payment_id: mp.id, status: mp.status, pix_copia_cola: pix.qr_code, qr_code_base64: pix.qr_code_base64 });
  } catch (e) {
    json(res, 500, { ok: false, error: e.message });
  }
}
