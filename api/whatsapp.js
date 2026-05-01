function limparTelefoneBrasil(valor) {
  let tel = String(valor || '').replace(/\D/g, '');
  if (!tel) return '';
  if (!tel.startsWith('55')) tel = '55' + tel;
  return tel;
}

export function numeroPedido(pedido) {
  if (pedido?.numero_pedido) return '#' + String(pedido.numero_pedido).padStart(2, '0');
  return '#' + String(pedido?.id || '').split('-')[0].toUpperCase();
}

function brl(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function itensTexto(itens) {
  try { if (typeof itens === 'string') itens = JSON.parse(itens); } catch {}
  if (!Array.isArray(itens) || !itens.length) return 'Itens não informados';
  return itens.map(i => `• ${i.qtd || i.quantidade || 1}x ${i.nome || i.name || 'Produto'}`).join('\n');
}

function enderecoTexto(p) {
  return [p.cidade, p.bairro, p.rua].filter(Boolean).join(' • ') || p.endereco || 'Endereço não informado';
}

function mensagemPorStatus(pedido, status) {
  const n = numeroPedido(pedido);
  const itens = itensTexto(pedido.itens);
  const total = brl(pedido.valor_total);
  const tempo = pedido.tempo_estimado_minutos ? `${pedido.tempo_estimado_minutos} min` : 'em breve';

  if (status === 'em_preparo') {
    return `🍔 *Big Burger*\n\n✅ *Pedido ${n} aceito!*\n\n👨‍🍳 Já estamos preparando seu pedido com carinho.\n\n📦 *Resumo:*\n${itens}\n\n💰 *Total:* ${total}\n⏱️ *Previsão:* ${tempo}\n\nObrigado pela preferência! ❤️`;
  }

  if (status === 'pronto') {
    return `🍔 *Big Burger*\n\n📦 *Pedido ${n} está pronto!*\n\nLogo ele será enviado para entrega.\n⏱️ Previsão: ${tempo}`;
  }

  if (status === 'em_entrega') {
    return `🚀 *Big Burger*\n\n🛵 *Pedido ${n} saiu para entrega!*\n\n📍 *Endereço:*\n${enderecoTexto(pedido)}\n\n💰 *Total:* ${total}\n⏱️ *Chegada prevista:* ${tempo}\n\nFique atento, estamos chegando! 🍔`;
  }

  if (status === 'finalizado') {
    return `🎉 *Big Burger*\n\n✅ *Pedido ${n} entregue!*\n\nEsperamos que tenha gostado 😍\nObrigado pela preferência. Até o próximo pedido! 🍔🔥`;
  }

  return `🍔 *Big Burger*\n\nSeu pedido ${n} foi atualizado.\nStatus: ${status}`;
}

export async function enviarWhatsAppTexto(numero, mensagem) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    return { ok: false, skipped: true, error: 'WHATSAPP_TOKEN ou WHATSAPP_PHONE_NUMBER_ID não configurado na Vercel' };
  }

  const to = limparTelefoneBrasil(numero);
  if (!to) return { ok: false, skipped: true, error: 'Telefone do cliente inválido' };

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: mensagem }
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: data?.error?.message || JSON.stringify(data), data };
  return { ok: true, data };
}

export async function enviarWhatsAppStatus(pedido, status) {
  return enviarWhatsAppTexto(pedido.cliente_telefone, mensagemPorStatus(pedido, status));
}
