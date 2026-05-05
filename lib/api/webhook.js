import { supabaseFetch } from '../_supabase.js';
import { getSettings } from './store-settings.js';
export default async function handler(req, res) {
  try {
    const paymentId = req.query?.['data.id'] || req.query?.id || req.body?.data?.id || req.body?.id;
    const token = process.env.MP_TOKEN || process.env.MP_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!paymentId || !token) return res.status(200).json({ ok: true, ignored: true });
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, { headers: { Authorization: `Bearer ${token}` } });
    const mp = await mpRes.json();
    if (!mpRes.ok) return res.status(200).json({ ok: false, mp });
    let pagamentos = await supabaseFetch(`pagamentos?mp_payment_id=eq.${paymentId}&select=*`, { method: 'GET', headers: { Prefer: '' } });
    if ((!pagamentos || !pagamentos.length) && mp.external_reference) {
      pagamentos = await supabaseFetch(`pagamentos?pedido_id=eq.${mp.external_reference}&select=*`, { method: 'GET', headers: { Prefer: '' } });
    }
    if (!pagamentos?.length) return res.status(200).json({ ok: true, message: 'Pagamento não encontrado' });
    const pagamento = pagamentos[0];
    const status = mp.status === 'approved' ? 'aprovado' : mp.status;
    await supabaseFetch(`pagamentos?id=eq.${pagamento.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    if (status === 'aprovado') {
      const settings = await getSettings();
      await supabaseFetch(`pedidos?id=eq.${pagamento.pedido_id}`, { method: 'PATCH', body: JSON.stringify({ status: settings.config.pedido_automatico ? 'em_preparo' : 'em_analise', tempo_estimado_minutos: settings.config.tempo_entrega_padrao || 40 }) });
      const pedidos = await supabaseFetch(`pedidos?id=eq.${pagamento.pedido_id}&select=*`, { method: 'GET', headers: { Prefer: '' } });
      const taxa = Number(pedidos?.[0]?.taxa_entrega || 0);
      await supabaseFetch('corridas', { method: 'POST', body: JSON.stringify({ pedido_id: pagamento.pedido_id, status: 'disponivel', valor_entrega: taxa }) });
    }
    res.status(200).json({ ok: true });
  } catch (e) { res.status(200).json({ ok: false, erro: e.message }); }
}
