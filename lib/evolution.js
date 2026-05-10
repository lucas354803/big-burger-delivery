const DEFAULT_CARDAPIO = 'https://big-burger-delivery-rho.vercel.app';

function cleanBaseUrl(url){
  return String(url || '').trim().replace(/\/+$/, '').replace(/\/webhook$/i, '');
}

export function onlyDigits(value){
  return String(value || '').replace(/\D/g, '');
}

export function formatBrazilNumber(value){
  let n = onlyDigits(value);
  if (!n) return '';
  n = n.replace(/^0+/, '');
  if (n.startsWith('55')) {
    n = n.replace(/^5555/, '55');
    return n;
  }
  if (n.length === 10 || n.length === 11) return '55' + n;
  if (n.length === 9) return '5548' + n;
  return n;
}

export function evolutionEnv(){
  return {
    baseUrl: cleanBaseUrl(process.env.EVOLUTION_API_URL),
    apiKey: String(process.env.EVOLUTION_API_KEY || '').trim(),
    instance: String(process.env.EVOLUTION_INSTANCE || 'bigburger').trim(),
  };
}

export function evolutionConfigured(){
  const env = evolutionEnv();
  return Boolean(env.baseUrl && env.apiKey && env.instance);
}

async function readResponse(response){
  const raw = await response.text();
  let data = raw;
  try { data = raw ? JSON.parse(raw) : null; } catch {}
  return { raw, data };
}

export async function getEvolutionState(){
  const { baseUrl, apiKey, instance } = evolutionEnv();
  if (!baseUrl || !apiKey || !instance) return { ok:false, error:'Evolution API não configurada.' };
  const url = `${baseUrl}/instance/connectionState/${encodeURIComponent(instance)}`;
  const response = await fetch(url, { headers:{ apikey: apiKey } });
  const { data } = await readResponse(response);
  return { ok:response.ok, status:response.status, url, data };
}

export async function sendEvolutionText(to, text){
  const { baseUrl, apiKey, instance } = evolutionEnv();
  const number = formatBrazilNumber(to);

  if (!baseUrl || !apiKey || !instance) {
    return { ok:false, skipped:true, error:'Evolution API não configurada no Vercel.', env:{ baseUrl_ok:Boolean(baseUrl), apiKey_ok:Boolean(apiKey), instance } };
  }
  if (!number) {
    return { ok:false, skipped:true, error:'Telefone do cliente vazio.' };
  }

  const state = await getEvolutionState().catch((e)=>({ ok:false, error:e.message }));
  const url = `${baseUrl}/message/sendText/${encodeURIComponent(instance)}`;
  const payload = {
    number,
    text: String(text || ''),
    delay: 1200,
    linkPreview: false
  };

  const response = await fetch(url, {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      apikey: apiKey
    },
    body: JSON.stringify(payload)
  });

  const { data, raw } = await readResponse(response);

  if (!response.ok) {
    const err = new Error(`Falha ao enviar WhatsApp pela Evolution: HTTP ${response.status}`);
    err.status = response.status;
    err.data = data;
    err.url = url;
    err.number = number;
    err.state = state;
    throw err;
  }

  return { ok:true, number, url, state, payload, data, raw };
}

export function moneyBR(value){
  const n = Number(value || 0);
  try { return n.toLocaleString('pt-BR', { style:'currency', currency:'BRL' }); } catch { return `R$ ${n.toFixed(2).replace('.', ',')}`; }
}

export function resumoItensPedido(pedido){
  let itens = pedido?.itens || [];
  if (typeof itens === 'string') {
    try { itens = JSON.parse(itens); } catch { itens = []; }
  }
  if (!Array.isArray(itens) || !itens.length) return '';
  return itens.slice(0, 6).map((item) => {
    const qtd = item.qtd || item.quantidade || 1;
    const nome = item.nome || item.produto_nome || item.title || 'Item';
    return `• ${qtd}x ${nome}`;
  }).join('\n');
}

export function buildStatusMessage(pedido, status){
  const nome = String(pedido?.cliente_nome || pedido?.nome_cliente || pedido?.nome || '').trim();
  const primeiroNome = nome ? nome.split(/\s+/)[0] : '';
  const numero = pedido?.numero_pedido || pedido?.numero || pedido?.id || '';
  const pedidoTxt = numero ? `#${numero}` : '';
  const cardapio = process.env.CARDAPIO_LINK || process.env.SITE_URL || DEFAULT_CARDAPIO;
  const tempo = pedido?.tempo_estimado_minutos || process.env.TEMPO_ENTREGA_PADRAO || '35 a 45';
  const total = pedido?.valor_total || pedido?.total || pedido?.valor || '';
  const totalTxt = total ? `\n💰 *Total:* ${moneyBR(total)}` : '';
  const itens = resumoItensPedido(pedido);
  const itensTxt = itens ? `\n\n🧾 *Resumo do pedido:*\n${itens}` : '';
  const saudacao = primeiroNome ? `Olá, *${primeiroNome}*!` : 'Olá!';

  const mensagens = {
    em_analise:
`${saudacao} 🍔\n\nRecebemos seu pedido *${pedidoTxt}* na *Big Burger*.\n\nEstamos conferindo tudo com carinho e já vamos te avisar quando ele entrar em preparo.${itensTxt}${totalTxt}\n\nObrigado por pedir com a gente!`,

    em_preparo:
`${saudacao} 🔥\n\nSeu pedido *${pedidoTxt}* foi *aceito* e já entrou em preparo.\n\n⏱️ *Previsão:* ${tempo} minutos\n👨‍🍳 Nossa equipe já está preparando tudo fresquinho pra você.${itensTxt}${totalTxt}`,

    pronto:
`${saudacao} ✅\n\nSeu pedido *${pedidoTxt}* está *pronto*.\n\nAgora estamos separando os últimos detalhes para entrega ou retirada. Obrigado pela paciência! 🍔`,

    em_entrega:
`${saudacao} 🛵💨\n\nSeu pedido *${pedidoTxt}* *saiu para entrega*.\n\nFica de olho no celular, o motoboy já está a caminho.\n\n🍔 *Big Burger* agradece pela preferência!`,

    finalizado:
`${saudacao} ❤️\n\nPedido *${pedidoTxt}* finalizado com sucesso.\n\nMuito obrigado por comprar na *Big Burger*!\n\nQuando bater aquela fome de novo, nosso cardápio está aqui:\n${cardapio}\n\n⭐ Se puder, avalie nosso atendimento. Sua opinião ajuda muito!`,

    cancelado:
`${saudacao} ⚠️\n\nSeu pedido *${pedidoTxt}* foi cancelado.\n\nSe tiver alguma dúvida ou quiser refazer o pedido, chama a gente por aqui.`,

    nao_realizado:
`${saudacao} ⚠️\n\nSeu pedido *${pedidoTxt}* foi marcado como *não realizado*.\n\nQualquer dúvida, a equipe Big Burger está à disposição.`
  };

  return mensagens[status] || `${saudacao}\n\nO status do seu pedido *${pedidoTxt}* foi atualizado para: *${status}*.`;
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

  const resposta = `🍔 *Bem-vindo à Big Burger!*\n\nQue bom ter você por aqui 😍\n\n📲 *Cardápio e pedidos online:*\n${cardapio}\n\n🔥 No cardápio você vê promoções, adicionais, formas de pagamento e taxa de entrega certinha pelo seu bairro.\n\n🕒 *Horário:* ${horario}\n🚚 *Entrega:* ${taxa}\n\nQualquer dúvida, manda aqui que a equipe Big Burger te atende. 🍔`;
  const sent = await sendEvolutionText(number, resposta);
  return { handled:true, sent };
}
