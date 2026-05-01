import { supabaseFetch } from './_supabase.js';

const tabelas = new Set(['categorias', 'produtos', 'categorias_complementos', 'complementos']);

function limparPayload(tabela, body) {
  const base = {};
  if ('nome' in body) base.nome = String(body.nome || '').trim();
  if ('descricao' in body) base.descricao = String(body.descricao || '').trim();
  if ('preco' in body) base.preco = Number(body.preco || 0);
  if ('badge' in body) base.badge = String(body.badge || '').trim();
  if ('imagem_url' in body) base.imagem_url = String(body.imagem_url || '').trim();
  if ('categoria_id' in body) base.categoria_id = body.categoria_id || null;
  if ('categoria_complemento_id' in body) base.categoria_complemento_id = body.categoria_complemento_id || null;
  if ('ordem' in body) base.ordem = Number(body.ordem || 0);
  if ('ativo' in body) base.ativo = Boolean(body.ativo);
  if ('min_escolha' in body) base.min_escolha = Number(body.min_escolha || 0);
  if ('max_escolha' in body) base.max_escolha = Number(body.max_escolha || 0);

  if (tabela === 'categorias') return { nome: base.nome, ordem: base.ordem || 0, ativo: 'ativo' in body ? base.ativo : true };
  if (tabela === 'categorias_complementos') return { nome: base.nome, min_escolha: base.min_escolha || 0, max_escolha: base.max_escolha || 6, ordem: base.ordem || 0, ativo: 'ativo' in body ? base.ativo : true };
  if (tabela === 'produtos') return { categoria_id: base.categoria_id, nome: base.nome, descricao: base.descricao || '', preco: base.preco, badge: base.badge || '', imagem_url: base.imagem_url || '', ordem: base.ordem || 0, ativo: 'ativo' in body ? base.ativo : true };
  if (tabela === 'complementos') return { categoria_complemento_id: base.categoria_complemento_id, nome: base.nome, preco: base.preco, ordem: base.ordem || 0, ativo: 'ativo' in body ? base.ativo : true };
  return base;
}

export default async function handler(req, res) {
  try {
    const tabela = String(req.query.tabela || req.body?.tabela || '').toLowerCase();
    if (!tabelas.has(tabela)) return res.status(400).json({ ok:false, error:'Tabela inválida' });
    if (req.method === 'GET') {
      const data = await supabaseFetch(`${tabela}?select=*&order=ordem.asc,nome.asc`);
      return res.status(200).json({ ok:true, data });
    }
    if (req.method === 'POST') {
      const payload = limparPayload(tabela, req.body || {});
      if (!payload.nome) return res.status(400).json({ ok:false, error:'Nome é obrigatório' });
      const data = await supabaseFetch(tabela, { method:'POST', body: JSON.stringify(payload) });
      return res.status(200).json({ ok:true, data:data?.[0] || data });
    }
    if (req.method === 'PUT') {
      const id = req.body?.id;
      if (!id) return res.status(400).json({ ok:false, error:'ID obrigatório' });
      const payload = limparPayload(tabela, req.body || {});
      const data = await supabaseFetch(`${tabela}?id=eq.${encodeURIComponent(id)}`, { method:'PATCH', body: JSON.stringify(payload) });
      return res.status(200).json({ ok:true, data:data?.[0] || data });
    }
    if (req.method === 'DELETE') {
      const id = req.query.id || req.body?.id;
      if (!id) return res.status(400).json({ ok:false, error:'ID obrigatório' });
      await supabaseFetch(`${tabela}?id=eq.${encodeURIComponent(id)}`, { method:'DELETE' });
      return res.status(200).json({ ok:true });
    }
    res.status(405).json({ ok:false, error:'Método não permitido' });
  } catch (e) {
    res.status(e.status || 500).json({ ok:false, error:e.message, detalhes:e.data || null });
  }
}
