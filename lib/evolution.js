const DEFAULT_CARDAPIO = 'https://big-burger-delivery-rho.vercel.app';

function cleanBaseUrl(url){
  return String(url || '').trim().replace(/\/+$/, '');
}

export function onlyDigits(value){
  return String(value || '').replace(/\D/g, '');
}

export function formatBrazilNumber(value){
  let n = onlyDigits(value);
  if (!n) return '';
  if (n.startsWith('55')) return n;
  if (n.length === 10 || n.length === 11) return '55' + n;
  return n;
}

export function evolutionConfigured(){
  return Boolean(cleanBaseUrl(process.env.EVOLUTION_API_URL) && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE);
}

export async function sendEvolutionText(to, text){
  const baseUrl = cleanBaseUrl(process.env.EVOLUTION_API_URL);
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE || 'bigburger';
  const number = formatBrazilNumber(to);

  if (!baseUrl || !apiKey || !instance) {
    return { ok:false, skipped:true, error:'Evolution API não configurada no .env/Vercel.' };
  }
  if (!number) {
    return { ok:false, skipped:true, error:'Telefone do cliente vazio.' };
  }

  const url = `${baseUrl}/message/sendText/${encodeURIComponent(instance)}`;
  const response = await fetch(url, {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      apikey: apiKey
    },
    body: JSON.stringify({
      number,
      text: String(text || ''),
      delay: 800,
      linkPreview: true
    })
  });

  const raw = await response.text();
  let data = raw;
  try { data = raw ? JSON.parse(raw) : null; } catch {}

  if (!response.ok) {
    const err = new Error(`Falha ao enviar WhatsApp pela Evolution: HTTP ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return { ok:true, data };
}

export function buildStatusMessage(pedido, status){
  const nome = String(pedido?.cliente_nome || '').trim();
  const numero = pedido?.numero_pedido || pedido?.numero || pedido?.id || '';
  const cardapio = process.env.CARDAPIO_LINK || process.env.SITE_URL || DEFAULT_CARDAPIO;
  const tempo = pedido?.tempo_estimado_minutos || process.env.TEMPO_ENTREGA_PADRAO || '';
  const saudacao = nome ? `Olá, ${nome}!` : 'Olá!';
  const pedidoTxt = numero ? `#${numero}` : '';

  const mensagens = {
    em_analise: `${saudacao} Recebemos seu pedido ${pedidoTxt} na Big Burger. Estamos analisando e já vamos confirmar. 🍔`,
    em_preparo: `${saudacao} Seu pedido ${pedidoTxt} foi aceito e já está em preparo. Tempo estimado: ${tempo || '35 a 45'} minutos. 🍔🔥`,
    pronto: `${saudacao} Seu pedido ${pedidoTxt} está pronto. Já vamos separar para entrega/retirada. ✅`,
    em_entrega: `${saudacao} Seu pedido ${pedidoTxt} saiu para entrega. Daqui a pouco chega aí. 🛵🍔`,
    finalizado: `${saudacao} Seu pedido ${pedidoTxt} foi finalizado. Muito obrigado por comprar na Big Burger! Para pedir de novo: ${cardapio}`,
    cancelado: `${saudacao} Seu pedido ${pedidoTxt} foi cancelado. Qualquer dúvida, chama a Big Burger por aqui.`,
    nao_realizado: `${saudacao} Seu pedido ${pedidoTxt} foi marcado como não realizado. Qualquer dúvida, chama a Big Burger por aqui.`
  };
  return mensagens[status] || `${saudacao} O status do seu pedido ${pedidoTxt} foi atualizado para: ${status}.`;
}

export function extractIncomingNumber(body){
  const remoteJid = body?.data?.key?.remoteJid || body?.data?.remoteJid || body?.key?.remoteJid || '';
  if (remoteJid) return onlyDigits(String(remoteJid).split('@')[0]);
  return onlyDigits(body?.number || body?.from || body?.sender || '');
}

export function extractIncomingText(body){
  const msg = body?.data?.message || body?.message || {};
  return String(
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    body?.text ||
    ''
  ).trim();
}

export function isEvolutionMessageEvent(body){
  const event = String(body?.event || body?.type || '').toUpperCase();
  return event.includes('MESSAGES_UPSERT') || event.includes('MESSAGE') || Boolean(body?.data?.message);
}

export async function handleEvolutionAutoReply(body){
  if (!isEvolutionMessageEvent(body)) return { handled:false };
  if (body?.data?.key?.fromMe === true || body?.data?.fromMe === true) return { handled:true, ignored:'fromMe' };

  const text = extractIncomingText(body).toLowerCase();
  const number = extractIncomingNumber(body);
  if (!number || !text) return { handled:true, ignored:'empty' };

  const cardapio = process.env.CARDAPIO_LINK || process.env.SITE_URL || DEFAULT_CARDAPIO;
  const horario = process.env.HORARIO_TEXTO || 'Atendemos de terça a domingo, das 18:30 às 00:00.';
  const taxa = process.env.TAXA_ENTREGA_TEXTO || 'A taxa de entrega aparece no cardápio ao selecionar seu bairro.';

  const querCardapio = /(card[aá]pio|menu|pedido|pedir|lanche|hamb[uú]rguer|hamburguer|promo|promo[cç][aã]o|pre[cç]o|valor)/i.test(text);
  if (!querCardapio) return { handled:true, ignored:'no_keyword' };

  const resposta = `🍔 *Big Burger*\n\nPara ver nosso cardápio e fazer seu pedido, acesse:\n${cardapio}\n\n🕒 ${horario}\n🚚 ${taxa}`;
  const sent = await sendEvolutionText(number, resposta);
  return { handled:true, sent };
}
