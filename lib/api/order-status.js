import { supabaseFetch } from '../_supabase.js';
import { buildStatusMessage, sendEvolutionText } from '../evolution.js';

const STATUS_OK = new Set(['em_analise','em_preparo','pronto','em_entrega','finalizado','cancelado','nao_realizado']);
const STATUS_AGUARDANDO_PIX = new Set(['aguardando_pagamento','aguardando_pix']);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Use POST' });
  try {
    const { id, status, tempo_estimado_minutos } = req.body || {};
    if (!id) return res.status(400).json({ ok:false, error:'ID do pedido obrigatório' });
    if (!STATUS_OK.has(status)) return res.status(400).json({ ok:false, error:'Status inválido' });

    const atuais = await supabaseFetch(`pedidos?id=eq.${encodeURIComponent(id)}&select=*`, { method:'GET', headers:{ Prefer:'' } });
    const atual = Array.isArray(atuais) ? atuais[0] : null;
    if (!atual) return res.status(404).json({ ok:false, error:'Pedido não encontrado' });
    if (STATUS_AGUARDANDO_PIX.has(String(atual.status||'')) && !['cancelado','nao_realizado'].includes(status)) {
      return res.status(409).json({ ok:false, error:'Pix ainda não confirmado. O pedido só pode ser liberado depois do pagamento.' });
    }

    const patch = { status, whatsapp_status_enviado: false, whatsapp_status_enviado_em: null, whatsapp_status_erro: null };
    if (status === 'em_preparo') {
      // Marca o início do tempo do pedido quando ele é aceito.
      patch.aceito_em = new Date().toISOString();
    }

    if (status === 'em_entrega') {
      // IMPORTANTE: ao sair para entrega, reinicia o cronômetro usando
      // o campo já existente no banco. Assim não precisa criar coluna nova.
      patch.aceito_em = new Date().toISOString();
    }
    if (status === 'nao_realizado') {
      patch.nao_realizado_em = new Date().toISOString();
      patch.arquivado_relatorio = true;
    }

    if (tempo_estimado_minutos !== undefined && tempo_estimado_minutos !== null && tempo_estimado_minutos !== '') {
      patch.tempo_estimado_minutos = Number(tempo_estimado_minutos);
    }

    const data = await supabaseFetch(`pedidos?id=eq.${encodeURIComponent(id)}`, {
      method:'PATCH',
      body: JSON.stringify(patch)
    });

    const pedido = data?.[0] || data;

    let whatsapp = { ok:false, skipped:true };
    if (status !== 'cancelado' && status !== 'nao_realizado') {
      try {
        const mensagem = buildStatusMessage(pedido, status);
        whatsapp = await sendEvolutionText(pedido.cliente_telefone, mensagem);
        await supabaseFetch(`pedidos?id=eq.${encodeURIComponent(id)}`, {
          method:'PATCH',
          body: JSON.stringify({ whatsapp_status_enviado: true, whatsapp_status_enviado_em: new Date().toISOString(), whatsapp_status_erro: null })
        }).catch(()=>null);
      } catch (err) {
        whatsapp = { ok:false, error: err.message, detalhes: err.data || null };
        await supabaseFetch(`pedidos?id=eq.${encodeURIComponent(id)}`, {
          method:'PATCH',
          body: JSON.stringify({ whatsapp_status_enviado: false, whatsapp_status_erro: err.message })
        }).catch(()=>null);
      }
    }

    res.status(200).json({ ok:true, pedido, whatsapp });
  } catch (e) {
    res.status(e.status || 500).json({ ok:false, error:e.message, detalhes:e.data || null });
  }
}
