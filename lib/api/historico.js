import { supabaseFetch, supabaseFetchMeta } from '../_supabase.js';

function termoSeguro(v) {
  return String(v || '').trim().replace(/[()*%,]/g, '');
}

export default async function handler(req, res) {
  try {
    if (req.method === 'DELETE') {
      const id = req.query?.id || req.body?.id;
      if (!id) return res.status(400).json({ ok: false, error: 'Informe o ID do pedido.' });
      await supabaseFetch(`pedidos?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return res.status(200).json({ ok: true });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ ok: false, error: 'Use GET ou DELETE' });
    }

    const page = Math.max(1, Number(req.query?.page || 1));
    const perPage = Math.min(Math.max(1, Number(req.query?.perPage || 15)), 100);
    const offset = (page - 1) * perPage;
    const busca = termoSeguro(req.query?.busca || '');

    let filtros = 'arquivado_relatorio=eq.true&status=in.(finalizado,entregue)';
    if (busca) {
      const condicoes = [
        `cliente_nome.ilike.*${busca}*`,
        `cliente_telefone.ilike.*${busca}*`,
        `cidade.ilike.*${busca}*`,
        `bairro.ilike.*${busca}*`,
        `rua.ilike.*${busca}*`
      ];
      if (/^\d+$/.test(busca)) condicoes.push(`numero_pedido.eq.${busca}`);
      filtros += `&or=(${condicoes.join(',')})`;
    }

    const order = 'arquivado_em.desc.nullslast,created_at.desc';
    const pagePath = `pedidos?select=*&${filtros}&order=${order}&limit=${perPage}&offset=${offset}`;
    const { data, total } = await supabaseFetchMeta(pagePath, { method: 'GET' });

    // Resumo financeiro do histórico filtrado. Busca somente os valores para não pesar o painel.
    const resumoDados = await supabaseFetch(`pedidos?select=valor_total&${filtros}&limit=5000`, {
      method: 'GET',
      headers: { Prefer: '' }
    });
    const valorTotal = Array.isArray(resumoDados)
      ? resumoDados.reduce((s, p) => s + Number(p.valor_total || 0), 0)
      : 0;

    return res.status(200).json({
      ok: true,
      pedidos: data || [],
      total: Number(total || 0),
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(Number(total || 0) / perPage)),
      resumo: { total_pedidos: Number(total || 0), valor_total: valorTotal }
    });
  } catch (e) {
    return res.status(e.status || 500).json({ ok: false, error: e.message, detalhes: e.data || null });
  }
}
