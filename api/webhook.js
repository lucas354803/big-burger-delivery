import { supabaseFetch } from './_supabase.js';
export default async function handler(req, res) {
  try {
    const paymentId = req.query?.['data.id'] || req.query?.id || req.body?.data?.id || req.body?.id;
    if (!paymentId || !process.env.MP_TOKEN) return res.status(200).json({ ok: true, ignored: true });
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, { headers: { Authorization: `Bearer ${process.env.MP_TOKEN}` } });
    const mp = await mpRes.json();
    if (!mpRes.ok) return res.status(200).json({ ok: false, mp });
    const pagamentos = await supabaseFetch(`pagamentos?mp_payment_id=eq.${paymentId}&select=*`, { method: 'GET', headers: { Prefer: '' } });
    if (!pagamentos?.length) return res.status(200).json({ ok: true, message: 'Pagamento não encontrado' });
    const pagamento = pagamentos[0];
    const status = mp.status === 'approved' ? 'aprovado' : mp.status;
    await supabaseFetch(`pagamentos?id=eq.${pagamento.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    if (status === 'aprovado') {
      await supabaseFetch(`pedidos?id=eq.${pagamento.pedido_id}`, { method: 'PATCH', body: JSON.stringify({ status: 'pago' }) });
      await supabaseFetch('corridas', { method: 'POST', body: JSON.stringify({ pedido_id: pagamento.pedido_id, status: 'disponivel', valor_entrega: 7.00 }) });
    }
    res.status(200).json({ ok: true });
  } catch (e) { res.status(200).json({ ok: false, erro: e.message }); }
}
