import { supabaseFetch } from '../_supabase.js';

const tabelas = new Set(['categorias', 'produtos', 'categorias_complementos', 'complementos', 'produto_complemento_categorias', 'cidades_entrega', 'bairros_entrega']);

function limparPayload(tabela, body) {
  const base = {};
  if ('nome' in body) base.nome = String(body.nome || '').trim();
  if ('descricao' in body) base.descricao = String(body.descricao || '').trim();
  if ('preco' in body) base.preco = Number(body.preco || 0);
  if ('desconto_ativo' in body) base.desconto_ativo = Boolean(body.desconto_ativo);
  if ('desconto_percentual' in body) base.desconto_percentual = Number(body.desconto_percentual || 0);
  if ('preco_promocional' in body) base.preco_promocional = body.preco_promocional === '' || body.preco_promocional == null ? null : Number(body.preco_promocional || 0);
  if ('badge' in body) base.badge = String(body.badge || '').trim();
  if ('promocao_ativa' in body) base.promocao_ativa = Boolean(body.promocao_ativa);
  if ('imagem_url' in body) base.imagem_url = String(body.imagem_url || '').trim();
  if ('categoria_id' in body) base.categoria_id = body.categoria_id || null;
  if ('categoria_complemento_id' in body) base.categoria_complemento_id = body.categoria_complemento_id || null;
  if ('produto_id' in body) base.produto_id = body.produto_id || null;
  if ('ordem' in body) base.ordem = Number(body.ordem || 0);
  if ('ativo' in body) base.ativo = Boolean(body.ativo);
  if ('min_escolha' in body) base.min_escolha = Number(body.min_escolha || 0);
  if ('max_escolha' in body) base.max_escolha = Number(body.max_escolha || 0);
  if ('cidade_id' in body) base.cidade_id = body.cidade_id || null;
  if ('tempo_maximo_minutos' in body) base.tempo_maximo_minutos = Number(body.tempo_maximo_minutos || 0);

  if (tabela === 'categorias') return { nome: base.nome, ordem: base.ordem || 0, ativo: 'ativo' in body ? base.ativo : true };
  if (tabela === 'categorias_complementos') return { nome: base.nome, min_escolha: base.min_escolha || 0, max_escolha: base.max_escolha || 6, ordem: base.ordem || 0, ativo: 'ativo' in body ? base.ativo : true };
  if (tabela === 'produtos') return {
    categoria_id: base.categoria_id,
    nome: base.nome,
    descricao: base.descricao || '',
    preco: base.preco,
    desconto_ativo: 'desconto_ativo' in body ? base.desconto_ativo : false,
    desconto_percentual: base.desconto_percentual || 0,
    preco_promocional: base.preco_promocional,
    badge: base.badge || '',
    imagem_url: base.imagem_url || '',
    ordem: base.ordem || 0,
    ativo: 'ativo' in body ? base.ativo : true,
    promocao_ativa: 'promocao_ativa' in body ? base.promocao_ativa : false
  };
  if (tabela === 'complementos') return { categoria_complemento_id: base.categoria_complemento_id, nome: base.nome, preco: base.preco, ordem: base.ordem || 0, ativo: 'ativo' in body ? base.ativo : true };
  if (tabela === 'produto_complemento_categorias') return { produto_id: base.produto_id, categoria_complemento_id: base.categoria_complemento_id };
  if (tabela === 'cidades_entrega') return { nome: base.nome, ordem: base.ordem || 0, ativo: 'ativo' in body ? base.ativo : true };
  if (tabela === 'bairros_entrega') return { cidade_id: base.cidade_id, nome: base.nome, tempo_maximo_minutos: base.tempo_maximo_minutos || 40, preco: base.preco, ordem: base.ordem || 0, ativo: 'ativo' in body ? base.ativo : true };
  return base;
}

async function setCategoriasProduto(body) {
  const produto_id = body.produto_id;
  const categorias_ids = Array.isArray(body.categorias_ids) ? body.categorias_ids.filter(Boolean) : [];
  if (!produto_id) throw new Error('produto_id obrigatório');
  await supabaseFetch(`produto_complemento_categorias?produto_id=eq.${encodeURIComponent(produto_id)}`, { method:'DELETE' });
  if (!categorias_ids.length) return [];
  const payload = categorias_ids.map(categoria_complemento_id => ({ produto_id, categoria_complemento_id }));
  return await supabaseFetch('produto_complemento_categorias', { method:'POST', body: JSON.stringify(payload) });
}

export default async function handler(req, res) {
  try {
    const tabela = String(req.query.tabela || req.body?.tabela || '').toLowerCase();
    if (tabela === 'produto_complemento_categorias_set') {
      if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Método não permitido' });
      const data = await setCategoriasProduto(req.body || {});
      return res.status(200).json({ ok:true, data });
    }
    if (!tabelas.has(tabela)) return res.status(400).json({ ok:false, error:'Tabela inválida' });

    if (req.method === 'GET') {
      let query = `${tabela}?select=*`;
      if (tabela === 'produto_complemento_categorias') query += '&order=created_at.asc';
      else if (tabela === 'bairros_entrega') query += '&order=ordem.asc,nome.asc';
      else query += '&order=ordem.asc,nome.asc';
      const data = await supabaseFetch(query);
      return res.status(200).json({ ok:true, data });
    }
    if (req.method === 'POST') {
      const payload = limparPayload(tabela, req.body || {});
      if (['categorias','produtos','categorias_complementos','complementos','cidades_entrega','bairros_entrega'].includes(tabela) && !payload.nome) return res.status(400).json({ ok:false, error:'Nome é obrigatório' });
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
