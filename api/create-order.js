import { supabaseAdmin } from './_supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })
  try {
    const db = supabaseAdmin()
    const body = req.body || {}
    const { cliente_nome, cliente_telefone, endereco_entrega, itens, observacao } = body
    if (!cliente_nome || !cliente_telefone || !endereco_entrega || !Array.isArray(itens) || !itens.length) {
      return res.status(400).json({ error: 'Dados do pedido incompletos' })
    }
    const ids = itens.map(i => i.produto_id)
    const { data: produtos, error: prodErr } = await db.from('produtos').select('*').in('id', ids).eq('ativo', true)
    if (prodErr) throw prodErr
    let valor_total = 0
    const itensNormalizados = itens.map(item => {
      const p = produtos.find(prod => prod.id === item.produto_id)
      if (!p) throw new Error('Produto não encontrado: ' + item.produto_id)
      const qtd = Math.max(1, Number(item.quantidade || 1))
      valor_total += Number(p.preco) * qtd
      return { produto_id: p.id, nome: p.nome, preco: Number(p.preco), quantidade: qtd }
    })
    const { data: pedido, error } = await db.from('pedidos').insert({
      cliente_nome, cliente_telefone, endereco_entrega, observacao: observacao || '',
      itens: itensNormalizados, valor_total, status: 'aguardando_pagamento', origem: 'big_burger'
    }).select('*').single()
    if (error) throw error
    return res.status(200).json({ pedido })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
