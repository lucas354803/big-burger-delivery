import { supabaseFetch } from '../_supabase.js';

export default async function handler(req,res){
  if(req.method !== 'POST') return res.status(405).json({ok:false,error:'Método não permitido'});
  try{
    const agora = new Date().toISOString();
    const payload = { arquivado_relatorio: true, arquivado_em: agora };
    let total = 0;

    // 1) Esconde do painel os pedidos finalizados/entregues do dia
    const finalizados = await supabaseFetch('pedidos?status=eq.finalizado&arquivado_relatorio=is.false', { method:'PATCH', body: JSON.stringify(payload) });
    total += Array.isArray(finalizados) ? finalizados.length : 0;

    const entregues = await supabaseFetch('pedidos?status=eq.entregue&arquivado_relatorio=is.false', { method:'PATCH', body: JSON.stringify(payload) });
    total += Array.isArray(entregues) ? entregues.length : 0;

    // 2) Reinicia a numeração dos próximos pedidos para #01
    // IMPORTANTE: precisa rodar supabase/zerar_relatorio_historico.sql atualizado.
    let numeracao = 'reiniciada';
    try{
      await supabaseFetch('rpc/resetar_numero_pedidos_diario', { method:'POST', body: JSON.stringify({}) });
    }catch(e){
      numeracao = 'não reiniciada: rode o SQL supabase/zerar_relatorio_historico.sql atualizado';
    }

    res.status(200).json({ok:true,arquivados:total,numeracao});
  }catch(e){
    res.status(e.status||500).json({ok:false,error:e.message,detalhes:e.data||null});
  }
}
