require('dotenv').config();

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const SITE_URL = String(process.env.SITE_URL || '').replace(/\/+$/, '');
const BOT_SECRET = process.env.BOT_SECRET || 'bigburger_robo_2026';
const POLL_INTERVAL_SECONDS = Number(process.env.POLL_INTERVAL_SECONDS || 5);

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
  return mapa[String(status || '').toLowerCase()] || String(status || 'atualizado').replaceAll('_',' ');
}

function itensTexto(itens) {
  try { if (typeof itens === 'string') itens = JSON.parse(itens); } catch {}
  if (!Array.isArray(itens) || !itens.length) return '';
  return itens.map(i => `• ${i.qtd || i.quantidade || 1}x ${i.nome || i.name || 'Produto'}${i.observacao ? `\n  Obs: ${i.observacao}` : ''}`).join('\n');
}

function mensagemPedido(p) {
  const status = statusBonito(p.status);
  const nome = p.cliente_nome || p.nome_cliente || p.nome || 'cliente';
  const itens = itensTexto(p.itens);
  const total = brl(p.valor_total || p.total || 0);
  const tempo = p.tempo_estimado_minutos ? `${p.tempo_estimado_minutos} min` : '';

  if (p.status === 'em_preparo') {
    return `🍔 *Big Burger*\n\n✅ Pedido ${numeroPedido(p)} aceito!\n\nOlá, ${nome}! Já estamos preparando seu pedido.\n\n${itens ? `📦 *Itens:*\n${itens}\n\n` : ''}💰 *Total:* ${total}${tempo ? `\n⏱️ *Previsão:* ${tempo}` : ''}\n\nObrigado pela preferência! ❤️`;
  }
  if (p.status === 'pronto') {
    return `🍔 *Big Burger*\n\n📦 Pedido ${numeroPedido(p)} está pronto!\n\nLogo ele será enviado para entrega.`;
  }
  if (p.status === 'em_entrega') {
    return `🚀 *Big Burger*\n\n🛵 Pedido ${numeroPedido(p)} saiu para entrega!${tempo ? `\n⏱️ Chegada prevista: ${tempo}` : ''}\n\nFique atento, estamos chegando! 🍔`;
  }
  if (p.status === 'finalizado') {
    return `🎉 *Big Burger*\n\n✅ Pedido ${numeroPedido(p)} finalizado!\n\nObrigado pela preferência. Até o próximo pedido! 🍔🔥`;
  }
  return `🍔 *Big Burger*\n\nOlá, ${nome}!\nSeu pedido ${numeroPedido(p)} foi atualizado.\n\n📦 Status: *${status}*`;
}

async function buscarPendentes() {
  const url = `${SITE_URL}/api/bot-whatsapp-pending?key=${encodeURIComponent(BOT_SECRET)}`;
  const r = await fetch(url);
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data.pedidos || [];
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
    const pedidos = await buscarPendentes();
    for (const p of pedidos) {
      const telefone = limparTelefone(p.cliente_telefone || p.telefone_cliente || p.telefone || p.whatsapp || p.celular);
      if (!telefone) {
        console.log(`⚠️ Pedido ${p.id} sem telefone. Marcando como enviado para não repetir.`);
        await marcar(p.id, true);
        continue;
      }
      console.log(`📲 Enviando WhatsApp para ${telefone} | Pedido ${numeroPedido(p)} | ${statusBonito(p.status)}`);
      await client.sendMessage(`${telefone}@c.us`, mensagemPedido(p));
      await marcar(p.id, true);
      console.log('✅ Enviado com sucesso');
    }
  } catch (e) {
    console.error('❌ Erro no robô:', e.message);
  }
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
  verificar();
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

client.initialize();
