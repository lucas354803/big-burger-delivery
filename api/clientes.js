import { supabaseFetch } from './_supabase.js';

const brlNumber = (v) => Number(v || 0);
const onlyDigits = (v) => String(v || '').replace(/\D/g, '');

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ ok:false, error:'Use GET' });
    const pedidos = await supabaseFetch(
      'pedidos?select=id,cliente_nome,cliente_telefone,endereco,cidade,bairro,rua,valor_total,status,created_at&order=created_at.desc',
      { method:'GET', headers:{ Prefer:'' } }
    );
    const mapa = new Map();
    for (const p of (pedidos || [])) {
      const telLimpo = onlyDigits(p.cliente_telefone);
      const chave = telLimpo || String(p.cliente_telefone || p.cliente_nome || 'cliente_sem_identificacao').toLowerCase();
      if (!mapa.has(chave)) {
        mapa.set(chave, {
          cliente_nome: p.cliente_nome || 'Cliente sem nome',
          cliente_telefone: p.cliente_telefone || '',
          whatsapp_limpo: telLimpo,
          endereco: p.endereco || '', cidade: p.cidade || '', bairro: p.bairro || '', rua: p.rua || '',
          total_pedidos: 0, total_gasto: 0,
          ultimo_pedido: p.created_at || null, ultimo_status: p.status || '', pedidos: []
        });
      }
      const c = mapa.get(chave);
      c.total_pedidos += 1;
      c.total_gasto += brlNumber(p.valor_total);
      c.pedidos.push({ id:p.id, valor_total:p.valor_total, status:p.status, created_at:p.created_at });
      if (c.total_pedidos === 1) {
        c.cliente_nome = p.cliente_nome || c.cliente_nome;
        c.cliente_telefone = p.cliente_telefone || c.cliente_telefone;
        c.whatsapp_limpo = telLimpo || c.whatsapp_limpo;
        c.endereco = p.endereco || c.endereco;
        c.cidade = p.cidade || c.cidade;
        c.bairro = p.bairro || c.bairro;
        c.rua = p.rua || c.rua;
        c.ultimo_pedido = p.created_at || c.ultimo_pedido;
        c.ultimo_status = p.status || c.ultimo_status;
      }
    }
    const clientes = Array.from(mapa.values()).map(c => ({ ...c, total_gasto: Number(c.total_gasto.toFixed(2)) })).sort((a,b) => b.total_gasto - a.total_gasto);
    const faturamento_total = clientes.reduce((s,c)=>s+c.total_gasto,0);
    const resumo = { total_clientes: clientes.length, total_pedidos: (pedidos || []).length, faturamento_total: Number(faturamento_total.toFixed(2)), ticket_medio: (pedidos || []).length ? Number((faturamento_total / pedidos.length).toFixed(2)) : 0 };
    res.status(200).json({ ok:true, resumo, clientes });
  } catch (e) {
    res.status(e.status || 500).json({ ok:false, error:e.message, detalhes:e.data || null });
  }
}
