const DEFAULT_CARDAPIO = 'https://big-burger-delivery-rho.vercel.app';
const DEFAULT_TIMEOUT_MS = 12000;

function cleanBaseUrl(url){
  let u = String(url || '').trim();
  if (!u) return '';
  u = u.replace(/\/+$/, '');
  // Se colar a URL do painel/manager da Evolution, limpa e deixa só a base da API.
  u = u.replace(/\/manager\/.*$/i, '');
  u = u.replace(/\/instance\/.*$/i, '');
  u = u.replace(/\/message\/.*$/i, '');
  u = u.replace(/\/api\/+$/i, '/api');
  return u.replace(/\/+$/, '');
}

function unique(list){
  return [...new Set(list.filter(Boolean))];
}

function possibleBaseUrls(baseUrl){
  const base = cleanBaseUrl(baseUrl);
  if (!base) return [];
  const semApi = base.replace(/\/api$/i, '');
  return unique([base, semApi, semApi + '/api']);
}

async function fetchJsonSafe(url, options = {}){
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const raw = await response.text();
    let data = raw;
    try { data = raw ? JSON.parse(raw) : null; } catch {}
    return { response, data, raw };
  } finally {
    clearTimeout(timeout);
  }
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

async function getInstances(baseUrl, apiKey){
  const bases = possibleBaseUrls(baseUrl);
  let last = null;
  for (const base of bases) {
    const url = `${base}/instance/fetchInstances`;
    try {
      const { response, data } = await fetchJsonSafe(url, { headers:{ apikey: apiKey, Authorization: `Bearer ${apiKey}` } });
      last = { status: response.status, data, url };
      if (response.ok && Array.isArray(data)) return data;
      if (response.status === 401 || response.status === 403) break;
    } catch (e) {
      last = { error: e.message, url };
    }
  }
  return [];
}

async function resolveInstanceCandidates(baseUrl, apiKey, configuredInstance){
  const preferred = String(configuredInstance || 'bigburger').trim();
  const candidates = [preferred];
  try {
    const instances = await getInstances(baseUrl, apiKey);
    const found = instances.find(i =>
      String(i?.name || '').toLowerCase() === preferred.toLowerCase() ||
      String(i?.id || '').toLowerCase() === preferred.toLowerCase() ||
      String(i?.instanceId || '').toLowerCase() === preferred.toLowerCase()
    );
    if (found) {
      candidates.push(found.name, found.id, found.instanceId);
    }
    // Como último recurso, tenta a primeira instância conectada.
    const aberta = instances.find(i => String(i?.connectionStatus || i?.status || '').toLowerCase().includes('open')) || instances[0];
    if (aberta) candidates.push(aberta.name, aberta.id, aberta.instanceId);
  } catch {}
  return unique(candidates.map(x => String(x || '').trim()));
}

export async function sendEvolutionText(to, text){
  const baseUrl = cleanBaseUrl(process.env.EVOLUTION_API_URL || process.env.EVOLUTION_URL || '');
  const apiKey = String(process.env.EVOLUTION_API_KEY || process.env.AUTHENTICATION_API_KEY || '').trim();
  const instanceEnv = process.env.EVOLUTION_INSTANCE || 'bigburger';
  const number = formatBrazilNumber(to);

  if (!baseUrl || !apiKey || !instanceEnv) {
    return { ok:false, skipped:true, error:'Evolution API não configurada. Configure EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE.' };
  }
  if (!number) {
    return { ok:false, skipped:true, error:'Telefone do cliente vazio.' };
  }

  const bases = possibleBaseUrls(baseUrl);
  const instances = await resolveInstanceCandidates(baseUrl, apiKey, instanceEnv);
  const payload = { number, text: String(text || ''), delay: 800, linkPreview: true };
  const attempts = [];

  for (const base of bases) {
    for (const instance of instances) {
      const url = `${base}/message/sendText/${encodeURIComponent(instance)}`;
      try {
        const { response, data } = await fetchJsonSafe(url, {
          method:'POST',
          headers:{
            'Content-Type':'application/json',
            apikey: apiKey,
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload)
        });
        attempts.push({ url, status: response.status, data });
        if (response.ok) return { ok:true, data, endpoint:url, instanceUsed:instance };
        // API Key errada não adianta tentar outras URLs.
        if (response.status === 401 || response.status === 403) {
          const err = new Error(`Falha ao enviar WhatsApp pela Evolution: HTTP ${response.status} - API KEY incorreta ou não autorizada.`);
          err.status = response.status;
          err.data = data;
          err.attempts = attempts;
          throw err;
        }
      } catch (e) {
        if (e.status === 401 || e.status === 403) throw e;
        attempts.push({ url, error: e.message });
      }
    }
  }

  const last = attempts[attempts.length - 1] || {};
  const status = last.status || 0;
  const err = new Error(`Falha ao enviar WhatsApp pela Evolution${status ? ': HTTP ' + status : ''}. Testei ${attempts.length} rota(s). Confira EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE.`);
  err.status = status || 502;
  err.data = last.data || last.error || null;
  err.attempts = attempts;
  throw err;
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
  const nome = String(pedido?.cliente_nome || '').trim();
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
