const { env, supabaseFetch, json } = require('./_lib');

module.exports = async function handler(req, res) {
  try {
    const paymentId = req.query?.id || req.query?.['data.id'] || req.body?.data?.id || req.body?.id;
    if (!paymentId) return json(res, 200, { ok: true, ignored: 'sem payment id' });

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { authorization: `Bearer ${env('MP_TOKEN')}` }
    });
    const mp = await mpRes.json();
    if (!mpRes.ok) throw new Error(mp.message || JSON.stringify(mp));

    const pedidoId = mp.external_reference;
    if (pedidoId && mp.status === 'approved') {
      await supabaseFetch(`pedidos?id=eq.${pedidoId}`, { method: 'PATCH', body: JSON.stringify({ status: 'pago' }) });
      await supabaseFetch(`pagamentos?mp_payment_id=eq.${paymentId}`, { method: 'PATCH', body: JSON.stringify({ status: 'aprovado' }) });
      const existing = await supabaseFetch(`corridas?pedido_id=eq.${pedidoId}&select=id`, { method: 'GET', headers: { prefer: undefined } });
      if (!existing.length) {
        await supabaseFetch('corridas', { method: 'POST', body: JSON.stringify({ pedido_id: pedidoId, status: 'disponivel', valor_entrega: 7 }) });
      }
    }
    json(res, 200, { ok: true });
  } catch (e) {
    json(res, 500, { ok: false, error: e.message });
  }
}
