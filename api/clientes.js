import { supabaseFetch } from './_supabase.js';

const brlNumber = (v) => Number(v || 0);
const onlyDigits = (v) => String(v || '').replace(/\D/g, '');
const firstValue = (...values) => {
  for (const v of values) {
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
};

function montarEndereco(p) {
  const cidade = firstValue(p.cidade, p.cidade_entrega);
  const bairro = firstValue(p.bairro, p.bairro_entrega);
  const rua = firstValue(p.rua, p.rua_entrega, p.endereco_rua);
  const numero = firstValue(p.numero, p.numero_entrega);
  const enderecoCompleto = firstValue(p.endereco, p.endereco_entrega, p.endereco_completo);
  const partes = [cidade, bairro, rua, numero].filter(Boolean);
  return partes.length ? partes.join(' • ') : enderecoCompleto;
}

function clientePayload(body = {}) {
  return {
    cliente_nome: firstValue(body.cliente_nome, body.nome),
    cliente_telefone: firstValue(body.cliente_telefone, body.telefone, body.whatsapp),
    email: firstValue(body.email),
    cidade: firstValue(body.cidade),
    bairro: firstValue(body.bairro),
    rua: firstValue(body.rua),
    numero: firstValue(body.numero),
    endereco: firstValue(body.endereco),
    observacao: firstValue(body.observacao)
  };
}

async function listarClientesCadastrados() {
  try {
    const rows = await supabaseFetch('clientes_cadastros?select=*&order=created_at.desc', { method:'GET', headers:{ Prefer:'' } });
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    // Se a tabela ainda não foi criada, o painel continua funcionando com clientes dos pedidos.
    if (String(e.message || '').includes('clientes_cadastros')) return [];
    throw e;
  }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const payload = clientePayload(req.body || {});
      if (!payload.cliente_nome) return res.status(400).json({ ok:false, error:'Informe o nome do cliente.' });
      const data = await supabaseFetch('clientes_cadastros', { method:'POST', body:JSON.stringify(payload) });
      return res.status(200).json({ ok:true, cliente:data?.[0] || data });
    }

    if (req.method === 'PUT') {
      const id = req.query?.id || req.body?.id;
      if (!id) return res.status(400).json({ ok:false, error:'Informe o ID do cliente.' });
      const payload = clientePayload(req.body || {});
      const data = await supabaseFetch(`clientes_cadastros?id=eq.${encodeURIComponent(id)}`, { method:'PATCH', body:JSON.stringify(payload) });
      return res.status(200).json({ ok:true, cliente:data?.[0] || data });
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id || req.body?.id;
      if (!id) return res.status(400).json({ ok:false, error:'Informe o ID do cliente.' });
      await supabaseFetch(`clientes_cadastros?id=eq.${encodeURIComponent(id)}`, { method:'DELETE' });
      return res.status(200).json({ ok:true });
    }

    if (req.method !== 'GET') return res.status(405).json({ ok:false, error:'Use GET, POST, PUT ou DELETE' });

    const [pedidos, clientesManuais] = await Promise.all([
      supabaseFetch('pedidos?select=*&order=created_at.desc', { method:'GET', headers:{ Prefer:'' } }),
      listarClientesCadastrados()
    ]);

    const listaPedidos = Array.isArray(pedidos) ? pedidos : [];
    const mapa = new Map();

    for (const m of clientesManuais) {
      const telLimpo = onlyDigits(m.cliente_telefone);
      const chave = telLimpo || `manual-${m.id}`;
      const endereco = montarEndereco(m);
      mapa.set(chave, {
        id: m.id,
        origem: 'manual',
        cliente_nome: firstValue(m.cliente_nome, 'Cliente sem nome'),
        cliente_telefone: firstValue(m.cliente_telefone),
        email: firstValue(m.email),
        whatsapp_limpo: telLimpo,
        endereco,
        cidade: firstValue(m.cidade),
        bairro: firstValue(m.bairro),
        rua: firstValue(m.rua),
        numero: firstValue(m.numero),
        observacao: firstValue(m.observacao),
        total_pedidos: 0,
        total_gasto: 0,
        ultimo_pedido: m.created_at || null,
        ultimo_status: 'Cadastro manual',
        pedidos: []
      });
    }

    for (const p of listaPedidos) {
      const nome = firstValue(p.cliente_nome, p.nome, p.nome_cliente, 'Cliente sem nome');
      const telefone = firstValue(p.cliente_telefone, p.whatsapp, p.telefone, p.celular, p.cliente_whatsapp);
      const telLimpo = onlyDigits(telefone);
      const chave = telLimpo || String(nome).toLowerCase();
      const valor = brlNumber(firstValue(p.valor_total, p.total, p.total_pedido, 0));
      const endereco = montarEndereco(p);
      const cidade = firstValue(p.cidade, p.cidade_entrega);
      const bairro = firstValue(p.bairro, p.bairro_entrega);
      const rua = firstValue(p.rua, p.rua_entrega, p.endereco_rua);
      const criado = firstValue(p.created_at, p.data_pedido, p.criado_em);
      const status = firstValue(p.status, p.status_pedido);

      if (!mapa.has(chave)) {
        mapa.set(chave, {
          id: null,
          origem: 'pedido',
          cliente_nome: nome,
          cliente_telefone: telefone,
          email: '',
          whatsapp_limpo: telLimpo,
          endereco,
          cidade,
          bairro,
          rua,
          numero: '',
          observacao: '',
          total_pedidos: 0,
          total_gasto: 0,
          ultimo_pedido: criado || null,
          ultimo_status: status || '',
          pedidos: []
        });
      }

      const c = mapa.get(chave);
      c.total_pedidos += 1;
      c.total_gasto += valor;
      c.pedidos.push({ id:p.id, valor_total:valor, status, created_at:criado });
      c.origem = c.origem === 'manual' ? 'manual+pedido' : 'pedido';

      if (!c.ultimo_pedido || new Date(criado || 0) >= new Date(c.ultimo_pedido || 0)) {
        c.cliente_nome = nome || c.cliente_nome;
        c.cliente_telefone = telefone || c.cliente_telefone;
        c.whatsapp_limpo = telLimpo || c.whatsapp_limpo;
        c.endereco = endereco || c.endereco;
        c.cidade = cidade || c.cidade;
        c.bairro = bairro || c.bairro;
        c.rua = rua || c.rua;
        c.ultimo_pedido = criado || c.ultimo_pedido;
        c.ultimo_status = status || c.ultimo_status;
      }
    }

    const clientes = Array.from(mapa.values())
      .map(c => ({ ...c, total_gasto: Number(c.total_gasto.toFixed(2)) }))
      .sort((a,b) => b.total_gasto - a.total_gasto);

    const faturamento_total = clientes.reduce((s,c)=>s+c.total_gasto,0);
    const resumo = {
      total_clientes: clientes.length,
      total_pedidos: listaPedidos.length,
      faturamento_total: Number(faturamento_total.toFixed(2)),
      ticket_medio: listaPedidos.length ? Number((faturamento_total / listaPedidos.length).toFixed(2)) : 0
    };

    res.status(200).json({ ok:true, resumo, clientes });
  } catch (e) {
    res.status(e.status || 500).json({ ok:false, error:e.message, detalhes:e.data || null, url:e.url_usada || null });
  }
}
