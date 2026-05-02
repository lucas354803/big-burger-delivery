import { supabaseFetch } from './_supabase.js';

const STATUS_OK = new Set(['em_analise','em_preparo','pronto','em_entrega','finalizado','cancelado']);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Use POST' });
  try {
    const { id, status, tempo_estimado_minutos } = req.body || {};
    if (!id) return res.status(400).json({ ok:false, error:'ID do pedido obrigatório' });
    if (!STATUS_OK.has(status)) return res.status(400).json({ ok:false, error:'Status inválido' });

    const patch = { status, whatsapp_status_enviado: false, whatsapp_status_enviado_em: null, whatsapp_status_erro: null };
    if (tempo_estimado_minutos !== undefined && tempo_estimado_minutos !== null && tempo_estimado_minutos !== '') {
      patch.tempo_estimado_minutos = Number(tempo_estimado_minutos);
    }

    const data = await supabaseFetch(`pedidos?id=eq.${encodeURIComponent(id)}`, {
      method:'PATCH',
      body: JSON.stringify(patch)
    });

    const pedido = data?.[0] || data;

    // O WhatsApp agora é enviado pelo robô local (CMD) em /robo-whatsapp-local.
    // Este endpoint só atualiza o status e libera a fila para o robô buscar.
    res.status(200).json({ ok:true, pedido, whatsapp: { queued: status !== 'cancelado' } });
  } catch (e) {
    res.status(e.status || 500).json({ ok:false, error:e.message, detalhes:e.data || null });
  }
}
