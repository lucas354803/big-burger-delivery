import { supabaseFetch } from './_supabase.js';
export default async function handler(req,res){
  try{
    const pedidos=await supabaseFetch('pedidos?select=*&order=created_at.desc',{method:'GET',headers:{Prefer:''}});
    const lista=Array.isArray(pedidos)?pedidos:[];
    const pagos=lista.filter(p=>!['cancelado'].includes(String(p.status||'')));
    const hoje=new Date().toISOString().slice(0,10);
    const doDia=pagos.filter(p=>String(p.created_at||'').slice(0,10)===hoje);
    const resumo={
      pedidos_total: lista.length,
      pedidos_hoje: doDia.length,
      faturamento_total: pagos.reduce((s,p)=>s+Number(p.valor_total||0),0),
      faturamento_hoje: doDia.reduce((s,p)=>s+Number(p.valor_total||0),0),
      taxa_entrega_total: pagos.reduce((s,p)=>s+Number(p.taxa_entrega||0),0),
      ticket_medio: pagos.length?pagos.reduce((s,p)=>s+Number(p.valor_total||0),0)/pagos.length:0,
      pix: pagos.filter(p=>p.forma_pagamento==='pix').reduce((s,p)=>s+Number(p.valor_total||0),0),
      dinheiro: pagos.filter(p=>p.forma_pagamento==='dinheiro').reduce((s,p)=>s+Number(p.valor_total||0),0),
      cartao: pagos.filter(p=>p.forma_pagamento==='cartao').reduce((s,p)=>s+Number(p.valor_total||0),0)
    };
    res.status(200).json({ok:true,pedidos:lista,resumo});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
}