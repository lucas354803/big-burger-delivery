import { supabaseFetch } from '../_supabase.js';
import { getSettings } from './store-settings.js';

function money(n){ return Number(Number(n || 0).toFixed(2)); }

function getMpToken(){
  return process.env.MP_TOKEN || process.env.MP_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
}

function getBaseUrl(req){
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return host ? `${proto}://${host}` : '';
}

function normalizarTelefone(v){
  return String(v || '').replace(/\D/g, '');
}

function emailValido(v){
  const email = String(v || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : '';
}

function gerarEmailCliente(cliente_email, cliente_telefone){
  const informado = emailValido(cliente_email);
  if (informado) return informado;

  const envEmail = emailValido(process.env.MP_PAYER_EMAIL);
  if (envEmail) return envEmail;

  const tel = normalizarTelefone(cliente_telefone);
  const id = tel || String(Date.now());
  return `cliente${id}@bigburger.com.br`;
}

async function criarPagamentoMercadoPago({ req, pedido, valor_total, cliente_nome, cliente_telefone, cliente_email }){
  const token = getMpToken();
  if (!token) {
    throw new Error('Mercado Pago não configurado. Coloque seu Access Token no Vercel em MP_TOKEN.');
  }

  const baseUrl = getBaseUrl(req);
  const notificationUrl = process.env.MP_WEBHOOK_URL || process.env.WEBHOOK_URL || (baseUrl ? `${baseUrl}/api?route=webhook` : undefined);
  const email = gerarEmailCliente(cliente_email, cliente_telefone);

  const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `bigburger-${pedido.id}`
    },
    body: JSON.stringify({
      transaction_amount: money(valor_total),
      description: `Pedido Big Burger #${pedido.numero || pedido.id}`,
      payment_method_id: 'pix',
      payer: {
        email,
        first_name: String(cliente_nome || 'Cliente').slice(0, 80)
      },
      external_reference: String(pedido.id),
      metadata: {
        pedido_id: String(pedido.id),
        cliente_telefone: String(cliente_telefone || '')
      },
      notification_url: notificationUrl
    })
  });

  const mp = await mpRes.json();
  if (!mpRes.ok) {
    const msg = mp?.message || mp?.error || 'Erro ao gerar Pix no Mercado Pago.';
    const detalhes = mp?.cause || mp;
    const err = new Error(`${msg} ${JSON.stringify(detalhes)}`);
    err.status = 400;
    throw err;
  }

  const tx = mp?.point_of_interaction?.transaction_data || {};
  const pix_copia_cola = tx.qr_code || '';
  const qr_code_base64 = tx.qr_code_base64 || '';

  if (!pix_copia_cola || !qr_code_base64) {
    throw new Error('Mercado Pago não retornou QR Code Pix. Confira se o token é de produção/teste válido e se Pix está habilitado na conta.');
  }

  return {
    mp_payment_id: String(mp.id || ''),
    pix_copia_cola,
    qr_code_base64,
    origem: 'mercado_pago',
    mp_status: String(mp.status || 'pending')
  };
}

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
    const cliente_email = String(body.cliente_email || body.email || '').trim();
    const endereco = String(body.endereco || '').trim();
    const observacao = String(body.observacao || '').trim();
    const cidade = String(body.cidade || '').trim();
    const bairro = String(body.bairro || '').trim();
    const rua = String(body.rua || '').trim();
    const forma_pagamento = String(body.forma_pagamento || 'pix').trim().toLowerCase();
    const taxa_entrega = money(body.taxa_entrega);
    const subtotal = money(body.subtotal || (Number(body.valor_total||0)-taxa_entrega));
    const itens = Array.isArray(body.itens) ? body.itens : [];
    const valor_total = money(body.valor_total);
    const precisa_troco = body.precisa_troco === true || body.precisa_troco === 'true';
    const troco_para = precisa_troco ? money(body.troco_para) : 0;
    const troco_valor = precisa_troco ? money(body.troco_valor || (troco_para - valor_total)) : 0;

    if (!cliente_nome || !cliente_telefone || !endereco || !itens.length || valor_total <= 0) {
      return res.status(400).json({ error: 'Preencha nome, telefone, endereço e pedido.' });
    }

    const tempoEstimado = Number(body.tempo_estimado_minutos || settings.config.tempo_entrega_padrao || 40);
    const statusInicial = forma_pagamento === 'pix'
      ? 'aguardando_pagamento'
      : (settings.config.pedido_automatico ? 'em_preparo' : 'em_analise');

    const [pedido] = await supabaseFetch('pedidos', {
      method: 'POST',
      body: JSON.stringify({
        cliente_nome,
        cliente_telefone,
        endereco,
        cidade,
        bairro,
        rua,
        forma_pagamento,
        taxa_entrega,
        subtotal,
        observacao,
        itens,
        valor_total,
        status: statusInicial,
        tempo_estimado_minutos: tempoEstimado,
        precisa_troco,
        troco_para,
        troco_valor
      })
    });

    let pix = null;
    if (forma_pagamento === 'pix') {
      pix = await criarPagamentoMercadoPago({ req, pedido, valor_total, cliente_nome, cliente_telefone, cliente_email });
      await supabaseFetch('pagamentos', {
        method: 'POST',
        body: JSON.stringify({
          pedido_id: pedido.id,
          mp_payment_id: pix.mp_payment_id,
          status: 'pendente',
          origem: 'mercado_pago',
          valor: valor_total,
          qr_code: pix.pix_copia_cola,
          qr_code_base64: pix.qr_code_base64
        })
      });
    } else {
      await supabaseFetch('pagamentos', { method: 'POST', body: JSON.stringify({ pedido_id: pedido.id, status: 'pagamento_na_entrega', origem: forma_pagamento, valor: valor_total }) });
      await supabaseFetch('corridas', { method: 'POST', body: JSON.stringify({ pedido_id: pedido.id, status: 'disponivel', valor_entrega: taxa_entrega }) });
    }

    res.status(200).json({ ok: true, pedido, pix, mensagem: pix ? 'Pix Mercado Pago gerado' : 'Pedido criado.' });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, detalhes: e.data || null });
  }
}
