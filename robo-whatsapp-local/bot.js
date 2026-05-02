require('dotenv').config();

const fs = require('fs');
const path = require('path');
const http = require('http');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const SITE_URL = String(process.env.SITE_URL || '').replace(/\/+$/, '');
const BOT_SECRET = process.env.BOT_SECRET || 'bigburger_robo_2026';
const POLL_INTERVAL_SECONDS = Number(process.env.POLL_INTERVAL_SECONDS || 5);
const ROBO_PORT = Number(process.env.ROBO_PORT || 3001);
let ultimoErroApi = '';
let apiOnline = false;

const STATUS_ENVIAR = new Set(['em_preparo', 'pronto', 'em_entrega', 'finalizado']);
const CACHE_FILE = path.join(__dirname, 'status-enviados.json');
let statusEnviados = carregarCacheStatus();

if (!SITE_URL) {
  console.error('❌ Configure SITE_URL no arquivo .env');
  process.exit(1);
}

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'bigburger-status' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});


function carregarCacheStatus() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      return data && typeof data === 'object' ? data : {};
    }
  } catch (e) {
    console.log('⚠️ Não consegui ler status-enviados.json. Vou criar outro.');
  }
  return {};
}

function salvarCacheStatus() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(statusEnviados, null, 2));
  } catch (e) {
    console.log('⚠️ Não consegui salvar status-enviados.json:', e.message);
  }
}

function normalizarStatusBanco(status) {
  const s = String(status || '').toLowerCase().trim();
  const mapa = {
    aguardando_pagamento: 'em_analise',
    pedido_recebido: 'em_analise',
    pago: 'em_analise',
    aprovado: 'em_analise',
    pendente: 'em_analise',
    preparo: 'em_preparo',
    saiu_entrega: 'em_entrega',
    entrega: 'em_entrega',
    entregue: 'finalizado'
  };
  return mapa[s] || s;
}

function limparTelefone(valor) {
  let n = String(valor || '').replace(/\D/g, '');
  if (!n) return '';
  if (!n.startsWith('55')) n = '55' + n;
  return n;
}

function brl(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
}

function numeroPedido(p) {
  if (p.numero_pedido) return '#' + String(p.numero_pedido).padStart(2, '0');
  return '#' + String(p.id || '').split('-')[0].toUpperCase();
}

function statusBonito(status) {
  const mapa = {
    em_analise: 'em análise',
    em_preparo: 'em preparo',
    pronto: 'pronto',
    em_entrega: 'saiu para entrega',
    finalizado: 'finalizado'
  };
  const s = normalizarStatusBanco(status);
  return mapa[s] || String(s || 'atualizado').replaceAll('_',' ');
}

function itensTexto(itens) {
  try { if (typeof itens === 'string') itens = JSON.parse(itens); } catch {}
  if (!Array.isArray(itens) || !itens.length) return '';
  return itens.map(i => `• ${i.qtd || i.quantidade || 1}x ${i.nome || i.name || 'Produto'}${i.observacao ? `\n  Obs: ${i.observacao}` : ''}`).join('\n');
}

function mensagemPedido(p) {
  const statusNormalizado = normalizarStatusBanco(p.status);
  const status = statusBonito(statusNormalizado);
  const nome = p.cliente_nome || p.nome_cliente || p.nome || 'cliente';
  const itens = itensTexto(p.itens);
  const total = brl(p.valor_total || p.total || 0);
  const tempo = p.tempo_estimado_minutos ? `${p.tempo_estimado_minutos} min` : '';

  if (statusNormalizado === 'em_preparo') {
    return `🍔 *Big Burger*\n\n✅ Pedido ${numeroPedido(p)} aceito!\n\nOlá, ${nome}! Já estamos preparando seu pedido.\n\n${itens ? `📦 *Itens:*\n${itens}\n\n` : ''}💰 *Total:* ${total}${tempo ? `\n⏱️ *Previsão:* ${tempo}` : ''}\n\nObrigado pela preferência! ❤️`;
  }
  if (statusNormalizado === 'pronto') {
    return `🍔 *Big Burger*\n\n📦 Pedido ${numeroPedido(p)} está pronto!\n\nLogo ele será enviado para entrega.`;
  }
  if (statusNormalizado === 'em_entrega') {
    return `🚀 *Big Burger*\n\n🛵 Pedido ${numeroPedido(p)} saiu para entrega!${tempo ? `\n⏱️ Chegada prevista: ${tempo}` : ''}\n\nFique atento, estamos chegando! 🍔`;
  }
  if (statusNormalizado === 'finalizado') {
    return `🎉 *Big Burger*\n\n✅ Pedido ${numeroPedido(p)} finalizado!\n\nObrigado pela preferência. Até o próximo pedido! 🍔🔥`;
  }
  return `🍔 *Big Burger*\n\nOlá, ${nome}!\nSeu pedido ${numeroPedido(p)} foi atualizado.\n\n📦 Status: *${status}*`;
}

async function testarApi() {
  const url = `${SITE_URL}/api/bot-health`;
  try {
    const r = await fetch(url);
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.ok) {
      throw new Error(`HTTP ${r.status}`);
    }
    apiOnline = true;
    console.log('✅ API do site online para o robô.');
    if (data.env) {
      console.log(`🔎 Supabase na Vercel: URL=${data.env.supabase_url_ok ? 'OK' : 'FALTANDO'} | SERVICE_ROLE=${data.env.service_role_key_ok ? 'OK' : 'FALTANDO'} | ANON=${data.env.anon_key_ok ? 'OK' : 'FALTANDO'}`);
    }
  } catch (e) {
    apiOnline = false;
    console.error('❌ A API do robô não respondeu.');
    console.error(`➡️ Teste no navegador: ${url}`);
    console.error('➡️ Se aparecer 404, você precisa reenviar/deployar este ZIP atualizado na Vercel.');
    console.error(`Detalhe: ${e.message}`);
  }
}

async function buscarPendentes() {
  const url = `${SITE_URL}/api/bot-whatsapp-pending?key=${encodeURIComponent(BOT_SECRET)}`;
  const r = await fetch(url);
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    if (r.status === 404) {
      throw new Error(`HTTP 404 - rota não existe na Vercel. Faça deploy deste ZIP atualizado e teste: ${SITE_URL}/api/bot-health`);
    }
    throw new Error(data.error || `HTTP ${r.status}`);
  }
  return data.pedidos || [];
}


async function buscarRecentesFallback() {
  // Plano B: busca pedidos recentes direto na API normal.
  // Assim funciona mesmo se você não rodou o SQL do gatilho whatsapp_status_enviado.
  const url = `${SITE_URL}/api/pedidos?limit=80`;
  const r = await fetch(url);
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) throw new Error(data.error || `HTTP ${r.status}`);
  const agora = Date.now();
  const limiteHoras = Number(process.env.FALLBACK_HORAS || 72);
  return (data.pedidos || []).filter(p => {
    const st = normalizarStatusBanco(p.status);
    if (!STATUS_ENVIAR.has(st)) return false;
    const criado = p.created_at ? new Date(p.created_at).getTime() : agora;
    if (Number.isFinite(criado) && agora - criado > limiteHoras * 60 * 60 * 1000) return false;
    const chave = String(p.id || '') + ':' + st;
    return !statusEnviados[chave];
  }).map(p => ({ ...p, _fallback_local: true }));
}

async function enviarMensagemPedido(p) {
  const telefoneLimpo = limparTelefone(p.cliente_telefone || p.telefone_cliente || p.telefone || p.whatsapp || p.celular);
  if (!telefoneLimpo) {
    console.log(`⚠️ Pedido ${p.id} sem telefone. Marcando como enviado para não repetir.`);
    if (!p._fallback_local) await marcar(p.id, true);
    return;
  }

  const candidatos = gerarCandidatosTelefone(telefoneLimpo);
  let ultimoErro = null;

  for (const numero of candidatos) {
    try {
      const numberId = await client.getNumberId(numero);
      if (!numberId) {
        ultimoErro = new Error(`Número ${numero} não encontrado no WhatsApp`);
        continue;
      }
      console.log(`📲 Enviando WhatsApp para ${numberId._serialized} | Pedido ${numeroPedido(p)} | ${statusBonito(p.status)}`);
      await client.sendMessage(numberId._serialized, mensagemPedido(p));
      const st = normalizarStatusBanco(p.status);
      statusEnviados[String(p.id || '') + ':' + st] = new Date().toISOString();
      salvarCacheStatus();
      if (!p._fallback_local) await marcar(p.id, true);
      console.log('✅ Enviado com sucesso');
      return;
    } catch (e) {
      ultimoErro = e;
    }
  }

  const erroMsg = ultimoErro?.message || 'Não consegui enviar para este telefone';
  console.log(`❌ Falha ao enviar pedido ${numeroPedido(p)}: ${erroMsg}`);
  if (!p._fallback_local) await marcar(p.id, false, erroMsg).catch(() => null);
}

function gerarCandidatosTelefone(numero) {
  const n = limparTelefone(numero);
  const set = new Set([n]);
  // Brasil: às vezes o WhatsApp está cadastrado sem o 9 depois do DDD.
  if (n.startsWith('55') && n.length === 13 && n[4] === '9') {
    set.add(n.slice(0, 4) + n.slice(5));
  }
  // E às vezes vem sem o 9, mas o WhatsApp está com o 9.
  if (n.startsWith('55') && n.length === 12) {
    set.add(n.slice(0, 4) + '9' + n.slice(4));
  }
  return [...set];
}

async function marcar(id, enviado, erro=null) {
  const r = await fetch(`${SITE_URL}/api/bot-whatsapp-mark?key=${encodeURIComponent(BOT_SECRET)}`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ id, enviado, erro })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) throw new Error(data.error || `HTTP ${r.status}`);
}

async function verificar() {
  try {
    let pedidos = [];

    try {
      pedidos = await buscarPendentes();
    } catch (e) {
      // Se a fila por SQL falhar, usa o plano B local.
      const msg = String(e.message || e);
      if (msg !== ultimoErroApi) {
        console.error('⚠️ Fila do WhatsApp não respondeu, usando plano B:', msg);
        ultimoErroApi = msg;
      }
    }

    const fallback = await buscarRecentesFallback().catch(e => {
      throw new Error(`Plano B também falhou: ${e.message}`);
    });

    const porChave = new Map();
    for (const p of [...pedidos, ...fallback]) {
      const st = normalizarStatusBanco(p.status);
      if (!STATUS_ENVIAR.has(st)) continue;
      const chave = String(p.id || '') + ':' + st;
      if (statusEnviados[chave]) continue;
      porChave.set(chave, { ...p, status: st });
    }

    const lista = [...porChave.values()];
    if (!lista.length) return;

    console.log(`🔔 ${lista.length} mensagem(ns) de status para enviar.`);
    for (const p of lista) {
      await enviarMensagemPedido(p);
    }
  } catch (e) {
    const msg = String(e.message || e);
    if (msg !== ultimoErroApi) {
      console.error('❌ Erro no robô:', msg);
      ultimoErroApi = msg;
    }
  }
}



// ===== SERVIDOR LOCAL PARA O ADMIN CHAMAR VIA NGROK =====
// O painel Admin na Vercel chama: https://SEU-NGROK.ngrok-free.dev/enviar-status
// Este servidor precisa ficar ligado junto com o robô. Porta padrão: 3001.
function responderJson(res, statusCode, obj) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(obj));
}

function lerBodyJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) reject(new Error('Body muito grande'));
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(new Error('JSON inválido')); }
    });
    req.on('error', reject);
  });
}

function iniciarServidorLocal() {
  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') return responderJson(res, 200, { ok: true });

      if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
        return responderJson(res, 200, {
          ok: true,
          nome: 'Robô WhatsApp Big Burger',
          porta: ROBO_PORT,
          whatsapp: client.info ? 'conectado' : 'aguardando_qrcode'
        });
      }

      if (req.method === 'POST' && req.url === '/enviar-status') {
        const body = await lerBodyJson(req);
        const pedido = body.pedido || {};
        const status = normalizarStatusBanco(body.status || pedido.status);
        const telefone = body.telefone || pedido.cliente_telefone || pedido.telefone_cliente || pedido.telefone || pedido.whatsapp || pedido.celular;
        const id = body.numeroPedido || body.id || pedido.numero_pedido || pedido.id;

        if (!telefone) return responderJson(res, 400, { ok: false, error: 'Telefone do cliente não veio do Admin' });
        if (!status) return responderJson(res, 400, { ok: false, error: 'Status não veio do Admin' });

        const pedidoCompleto = {
          ...pedido,
          id: pedido.id || id,
          numero_pedido: pedido.numero_pedido || body.numeroPedido,
          status,
          cliente_telefone: telefone,
          tempo_estimado_minutos: body.tempo_estimado_minutos || pedido.tempo_estimado_minutos,
          _fallback_local: true
        };

        console.log(`📩 Admin chamou /enviar-status | Pedido ${numeroPedido(pedidoCompleto)} | ${statusBonito(status)}`);
        await enviarMensagemPedido(pedidoCompleto);
        return responderJson(res, 200, { ok: true, enviado: true });
      }

      return responderJson(res, 404, { ok: false, error: 'Rota não encontrada. Use POST /enviar-status ou GET /health' });
    } catch (e) {
      console.error('❌ Erro no servidor local:', e.message);
      return responderJson(res, 500, { ok: false, error: e.message });
    }
  });

  server.listen(ROBO_PORT, () => {
    console.log(`🌐 Servidor local do robô ligado na porta ${ROBO_PORT}`);
    console.log(`🔗 Para o ngrok use: ngrok http ${ROBO_PORT}`);
    console.log(`🧪 Teste local: http://localhost:${ROBO_PORT}/health\n`);
  });
}

client.on('qr', qr => {
  console.log('\n📲 ESCANEIE O QR CODE COM O WHATSAPP DA BIG BURGER:\n');
  qrcode.generate(qr, { small:true });
});

client.on('ready', () => {
  console.log('✅ Robô conectado no WhatsApp!');
  console.log(`🌐 Site conectado: ${SITE_URL}`);
  console.log(`🔁 Verificando pedidos a cada ${POLL_INTERVAL_SECONDS} segundos.`);
  console.log('⚠️ Não feche este CMD.\n');
  testarApi().then(verificar);
  setInterval(verificar, POLL_INTERVAL_SECONDS * 1000);
});

client.on('auth_failure', () => console.error('❌ Falha na autenticação do WhatsApp.'));
client.on('disconnected', () => console.error('❌ WhatsApp desconectado. Abra o robô novamente.'));


// ===== ROBÔ DE ATENDIMENTO AUTOMÁTICO =====

const CARDAPIO_LINK = process.env.CARDAPIO_LINK || SITE_URL || 'https://big-burger-delivery.vercel.app';
const TAXA_ENTREGA_TEXTO = process.env.TAXA_ENTREGA_TEXTO || 'A taxa de entrega depende do bairro e aparece certinha no fechamento do pedido.';
const HORARIO_TEXTO = process.env.HORARIO_TEXTO || 'Atendemos conforme o horário configurado no cardápio. Se aparecer loja fechada no site, não estamos recebendo pedidos no momento.';
const PIX_TEXTO = process.env.PIX_TEXTO || 'Aceitamos Pix pelo site e também dinheiro/cartão quando disponível no pedido.';
const ATENDENTE_TEXTO = process.env.ATENDENTE_TEXTO || 'Certo! Já já alguém da Big Burger te responde por aqui. 🍔';

const atendimentosRecentes = new Map();

function normalizarTexto(txt) {
  return String(txt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function menuBoasVindas(nome = '') {
  return `🍔 *Bem-vindo à Big Burger!*${nome ? `\nOlá, ${nome}!` : ''}

Que bom ter você aqui ❤️

Escolha uma opção:

1️⃣ Ver cardápio e fazer pedido
2️⃣ Horário de atendimento
3️⃣ Taxa de entrega
4️⃣ Formas de pagamento
5️⃣ Falar com atendente

📲 Cardápio online:
${CARDAPIO_LINK}

Digite o número da opção que deseja.`;
}

function respostaMenu(texto, nome) {
  const t = normalizarTexto(texto);

  if (['1', 'cardapio', 'cardápio', 'pedido', 'pedir', 'fazer pedido', 'quero pedir'].includes(t) || t.includes('cardapio')) {
    return `🍔 *Cardápio Big Burger*

Faça seu pedido direto pelo nosso cardápio online:

${CARDAPIO_LINK}

Lá você escolhe os produtos, adicionais, endereço e forma de pagamento.`;
  }

  if (['2', 'horario', 'horário', 'aberto', 'fechado', 'funcionamento'].includes(t) || t.includes('horario') || t.includes('aberto') || t.includes('fechado')) {
    return `🕒 *Horário de atendimento*

${HORARIO_TEXTO}

📲 Confira no cardápio:
${CARDAPIO_LINK}`;
  }

  if (['3', 'taxa', 'entrega', 'frete', 'valor entrega'].includes(t) || t.includes('taxa') || t.includes('frete')) {
    return `🏍️ *Taxa de entrega*

${TAXA_ENTREGA_TEXTO}

No cardápio você seleciona cidade e bairro para ver o valor correto.`;
  }

  if (['4', 'pagamento', 'pix', 'cartao', 'cartão', 'dinheiro'].includes(t) || t.includes('pix') || t.includes('pagamento')) {
    return `🔐 *Formas de pagamento*

${PIX_TEXTO}

Finalize seu pedido pelo cardápio:
${CARDAPIO_LINK}`;
  }

  if (['5', 'atendente', 'humano', 'pessoa', 'falar'].includes(t) || t.includes('atendente')) {
    return `🙋 *Atendimento Big Burger*

${ATENDENTE_TEXTO}`;
  }

  if (
    t === 'oi' || t === 'ola' || t === 'olá' || t === 'bom dia' ||
    t === 'boa tarde' || t === 'boa noite' || t === 'menu' ||
    t === 'inicio' || t === 'início' || t.includes('big burger')
  ) {
    return menuBoasVindas(nome);
  }

  return `🍔 *Big Burger*

Não entendi certinho sua mensagem, mas posso te ajudar por aqui.

Digite uma opção:

1️⃣ Ver cardápio
2️⃣ Horário de atendimento
3️⃣ Taxa de entrega
4️⃣ Pagamento
5️⃣ Falar com atendente`;
}

client.on('message', async (msg) => {
  try {
    if (!msg.body) return;
    if (msg.fromMe) return;
    if (msg.from.includes('@g.us')) return; // ignora grupos

    const contato = await msg.getContact().catch(() => null);
    const nome = contato?.pushname || contato?.name || '';

    const telefone = msg.from;
    const agora = Date.now();
    const textoNormalizado = normalizarTexto(msg.body);

    // Evita mandar boas-vindas repetida para qualquer mensagem em sequência.
    const ultimo = atendimentosRecentes.get(telefone) || 0;
    const ehSaudacao = ['oi','ola','olá','bom dia','boa tarde','boa noite','menu','inicio','início'].includes(textoNormalizado);

    if (!ehSaudacao && agora - ultimo < 2500) return;

    const resposta = respostaMenu(msg.body, nome);
    atendimentosRecentes.set(telefone, agora);

    await msg.reply(resposta);
    console.log(`🤖 Respondi atendimento para ${telefone}`);
  } catch (e) {
    console.error('❌ Erro ao responder cliente:', e.message);
  }
});

iniciarServidorLocal();
client.initialize();
