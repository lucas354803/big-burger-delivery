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

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ ok:false, error:'Use GET' });

    // Usa select=* para funcionar tanto no banco novo quanto em versões antigas do projeto.
    const pedidos = await supabaseFetch(
      'pedidos?select=*&order=created_at.desc',
      { method:'GET', headers:{ Prefer:'' } }
    );

    const listaPedidos = Array.isArray(pedidos) ? pedidos : [];
    const mapa = new Map();

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
          cliente_nome: nome,
          cliente_telefone: telefone,
          whatsapp_limpo: telLimpo,
          endereco,
          cidade,
          bairro,
          rua,
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

      // Como os pedidos vêm em ordem desc, o primeiro é o mais recente.
      if (c.total_pedidos === 1) {
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
