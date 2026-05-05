import QRCode from 'qrcode';
import { supabaseFetch } from '../_supabase.js';
import { getSettings } from './store-settings.js';

function money(n){ return Number(Number(n || 0).toFixed(2)); }

function onlyAscii(str){
  return String(str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 $%*+\-\.\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function emv(id, value){
  const v = String(value ?? '');
  return String(id).padStart(2, '0') + String(v.length).padStart(2, '0') + v;
}

function crc16(payload){
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function gerarPixCopiaCola({ chave, nome, cidade, valor, txid }){
  const pixKey = String(chave || '').trim();
  if (!pixKey) throw new Error('Configure a variável PIX_KEY no Vercel para gerar Pix copia e cola.');
  const merchantName = onlyAscii(nome || 'BIG BURGER').toUpperCase().slice(0, 25) || 'BIG BURGER';
  const merchantCity = onlyAscii(cidade || 'CRICIUMA').toUpperCase().slice(0, 15) || 'CRICIUMA';
  const amount = Number(valor || 0).toFixed(2);
  const cleanTxid = onlyAscii(txid || 'BIGBURGER').replace(/\s/g, '').slice(0, 25) || 'BIGBURGER';

  const merchantAccount =
    emv('00', 'br.gov.bcb.pix') +
    emv('01', pixKey);

  const additionalData = emv('05', cleanTxid);

  const payloadSemCrc =
    emv('00', '01') +
    emv('26', merchantAccount) +
    emv('52', '0000') +
    emv('53', '986') +
    emv('54', amount) +
    emv('58', 'BR') +
    emv('59', merchantName) +
    emv('60', merchantCity) +
    emv('62', additionalData) +
    '6304';

  return payloadSemCrc + crc16(payloadSemCrc);
}

async function gerarPixEstatico({ pedido, valor_total }){
  const pix_copia_cola = gerarPixCopiaCola({
    chave: process.env.PIX_KEY || process.env.CHAVE_PIX || process.env.PIX_CHAVE || 'b76aa9c2-2ec4-4110-954e-ebfe34f05b615',
    nome: process.env.PIX_NOME || 'BIG BURGER',
    cidade: process.env.PIX_CIDADE || 'CRICIUMA',
    valor: valor_total,
    txid: `BB${String(pedido.id || Date.now()).replace(/[^A-Za-z0-9]/g, '').slice(0, 20)}`
  });
  const dataUrl = await QRCode.toDataURL(pix_copia_cola, { errorCorrectionLevel: 'M', margin: 2, width: 320 });
  return {
    mp_payment_id: '',
    pix_copia_cola,
    qr_code_base64: dataUrl.replace(/^data:image\/png;base64,/, ''),
    origem: 'pix_estatico_valido'
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
    const token = process.env.MP_TOKEN || process.env.MP_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (forma_pagamento === 'pix') {
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
            payer: { email: String(body.cliente_email || process.env.MP_PAYER_EMAIL || 'cliente.bigburger@email.com'), first_name: cliente_nome || 'Cliente' },
            external_reference: String(pedido.id),
            metadata: { pedido_id: String(pedido.id), cliente_telefone: cliente_telefone },
            notification_url: process.env.MP_WEBHOOK_URL || process.env.WEBHOOK_URL || undefined
          })
        });
        const mp = await mpRes.json();
        if (!mpRes.ok) return res.status(400).json({ error: 'Erro Mercado Pago', detalhes: mp, pedido });
        pix = {
          mp_payment_id: String(mp.id || ''),
          pix_copia_cola: mp.point_of_interaction?.transaction_data?.qr_code || '',
          qr_code_base64: mp.point_of_interaction?.transaction_data?.qr_code_base64 || '',
          origem: 'mercado_pago'
        };
        if (!pix.pix_copia_cola || !pix.qr_code_base64) {
          pix = await gerarPixEstatico({ pedido, valor_total });
        }
      } else {
        pix = await gerarPixEstatico({ pedido, valor_total });
      }
      await supabaseFetch('pagamentos', { method: 'POST', body: JSON.stringify({ pedido_id: pedido.id, status: 'pendente', valor: valor_total, ...pix }) });
    } else {
      await supabaseFetch('pagamentos', { method: 'POST', body: JSON.stringify({ pedido_id: pedido.id, status: 'pagamento_na_entrega', valor: valor_total }) });
      await supabaseFetch('corridas', { method: 'POST', body: JSON.stringify({ pedido_id: pedido.id, status: 'disponivel', valor_entrega: taxa_entrega }) });
    }

    res.status(200).json({ ok: true, pedido, pix, mensagem: pix ? 'Pix gerado' : 'Pedido criado.' });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, detalhes: e.data || null });
  }
}
