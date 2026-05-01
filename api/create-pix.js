import { supabaseFetch } from './_supabase.js';

function money(n){ return Number(Number(n || 0).toFixed(2)); }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  try {
    const body = req.body || {};
    const cliente_nome = String(body.cliente_nome || '').trim();
    const cliente_telefone = String(body.cliente_telefone || '').trim();
    const endereco = String(body.endereco || '').trim();
    const observacao = String(body.observacao || '').trim();
    const itens = Array.isArray(body.itens) ? body.itens : [];
    const valor_total = money(body.valor_total);
    if (!cliente_nome || !cliente_telefone || !endereco || !itens.length || valor_total <= 0) {
      return res.status(400).json({ error: 'Preencha nome, telefone, endereço e pedido.' });
    }

    const [pedido] = await supabaseFetch('pedidos', {
      method: 'POST',
      body: JSON.stringify({ cliente_nome, cliente_telefone, endereco, observacao, itens, valor_total, status: 'aguardando_pagamento' })
    });

    let pix = null;
    const token = process.env.MP_TOKEN;
    if (token) {
      const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': pedido.id
        },
        body: JSON.stringify({
          transaction_amount: valor_total,
          description: `Big Burger Pedido ${pedido.id}`,
          payment_method_id: 'pix',
          payer: { email: `cliente-${Date.now()}@bigburger.local`, first_name: cliente_nome }
        })
      });
      const mp = await mpRes.json();
      if (!mpRes.ok) return res.status(400).json({ error: 'Erro Mercado Pago', detalhes: mp, pedido });
      pix = {
        mp_payment_id: String(mp.id || ''),
        pix_copia_cola: mp.point_of_interaction?.transaction_data?.qr_code || '',
        qr_code_base64: mp.point_of_interaction?.transaction_data?.qr_code_base64 || ''
      };
      await supabaseFetch('pagamentos', { method: 'POST', body: JSON.stringify({ pedido_id: pedido.id, status: 'pendente', valor: valor_total, ...pix }) });
    } else {
      await supabaseFetch('pagamentos', { method: 'POST', body: JSON.stringify({ pedido_id: pedido.id, status: 'sem_mp_token', valor: valor_total }) });
    }

    res.status(200).json({ ok: true, pedido, pix, mensagem: pix ? 'Pix gerado' : 'Pedido criado. Falta MP_TOKEN para gerar Pix.' });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, detalhes: e.data || null });
  }
}
