import { supabaseFetch } from '../_supabase.js';

export default async function handler(req,res){
  if(req.method !== 'POST') return res.status(405).json({ok:false,error:'Método não permitido'});
  try{
    const agora = new Date().toISOString();
    const payload = { arquivado_relatorio: true, arquivado_em: agora };
    let total = 0;
    const finalizados = await supabaseFetch('pedidos?status=eq.finalizado&arquivado_relatorio=is.false', { method:'PATCH', body: JSON.stringify(payload) });
    total += Array.isArray(finalizados) ? finalizados.length : 0;
    const entregues = await supabaseFetch('pedidos?status=eq.entregue&arquivado_relatorio=is.false', { method:'PATCH', body: JSON.stringify(payload) });
    total += Array.isArray(entregues) ? entregues.length : 0;
    res.status(200).json({ok:true,arquivados:total});
  }catch(e){
    res.status(e.status||500).json({ok:false,error:e.message,detalhes:e.data||null});
  }
}
