import { supabaseFetch } from '../_supabase.js';
import { getSettings } from './store-settings.js';

function money(n){ return Number(Number(n || 0).toFixed(2)); }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  try {
    const body = req.body || {};
    const settings = await getSettings();
    if(!settings.status.aberto){
      return res.status(403).json({ error: settings.config.mensagem_fechado || 'Loja fechada no momento.', loja_fechada:true, status_loja:settings.status });
    }
    const cliente_nome = String(body.cliente_nome || '').trim();
    const cliente_telefone = String(body.cliente_telefone || '').trim();
    const endereco = String(body.endereco || '').trim();
    const observacao = String(body.observacao || '').trim();
    const cidade = String(body.cidade || '').trim();
    const bairro = String(body.bairro || '').trim();
    const rua = String(body.rua || '').trim();
    const forma_pagamento = String(body.forma_pagamento || 'pix').trim();
    const taxa_entrega = money(body.taxa_entrega);
    const subtotal = money(body.subtotal || (Number(body.valor_total||0)-taxa_entrega));
    const itens = Array.isArray(body.itens) ? body.itens : [];
    const valor_total = money(body.valor_total);
    if (!cliente_nome || !cliente_telefone || !endereco || !itens.length || valor_total <= 0) {
      return res.status(400).json({ error: 'Preencha nome, telefone, endereço e pedido.' });
    }

    const statusInicial = forma_pagamento === 'pix' ? 'aguardando_pagamento' : (settings.config.pedido_automatico ? 'em_preparo' : 'pedido_recebido');
    const tempoEstimado = Number(body.tempo_estimado_minutos || settings.config.tempo_entrega_padrao || 40);
    const [pedido] = await supabaseFetch('pedidos', {
      method: 'POST',
      body: JSON.stringify({ cliente_nome, cliente_telefone, endereco, cidade, bairro, rua, forma_pagamento, taxa_entrega, subtotal, observacao, itens, valor_total, status: statusInicial, tempo_estimado_minutos: tempoEstimado })
    });

    let pix = null;
    const token = process.env.MP_TOKEN;
    if (forma_pagamento === 'pix' && token) {
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
          payer: { email: 'teste@teste.com', first_name: cliente_nome || 'Cliente' }
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
      await supabaseFetch('pagamentos', { method: 'POST', body: JSON.stringify({ pedido_id: pedido.id, status: forma_pagamento === 'pix' ? 'sem_mp_token' : 'pagamento_na_entrega', valor: valor_total }) });
      if (forma_pagamento !== 'pix') {
        await supabaseFetch('corridas', { method: 'POST', body: JSON.stringify({ pedido_id: pedido.id, status: 'disponivel', valor_entrega: taxa_entrega }) });
      }
    }

    res.status(200).json({ ok: true, pedido, pix, mensagem: pix ? 'Pix gerado' : 'Pedido criado.' });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, detalhes: e.data || null });
  }
}
