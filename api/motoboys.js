import { supabaseFetch } from '../lib/_supabase.js';

function cleanPhone(v){return String(v||'').replace(/\D/g,'').replace(/^55/,'');}
function token(){return Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-6);}
function uniq(arr){return [...new Set((arr||[]).filter(Boolean))];}

async function enrichEntregas(entregas){
  const lista=Array.isArray(entregas)?entregas:[];
  if(!lista.length) return [];

  const pedidoIds=uniq(lista.map(e=>e.pedido_id));
  const motoboyIds=uniq(lista.map(e=>e.motoboy_id));

  let pedidos=[];
  let motoboys=[];

  if(pedidoIds.length){
    pedidos=await supabaseFetch(`pedidos?id=in.(${pedidoIds.map(encodeURIComponent).join(',')})&select=*`,{method:'GET',headers:{Prefer:''}}).catch(()=>[]);
  }
  if(motoboyIds.length){
    motoboys=await supabaseFetch(`motoboys?id=in.(${motoboyIds.map(encodeURIComponent).join(',')})&select=*`,{method:'GET',headers:{Prefer:''}}).catch(()=>[]);
  }

  const pedidosMap=new Map((pedidos||[]).map(p=>[p.id,p]));
  const motoboysMap=new Map((motoboys||[]).map(m=>[m.id,m]));

  return lista.map(e=>({
    ...e,
    pedidos: pedidosMap.get(e.pedido_id) || null,
    motoboys: motoboysMap.get(e.motoboy_id) || null
  }));
}

export default async function handler(req,res){
  try{
    const method=req.method;
    const body=req.body||{};
    const action=body.action || req.query?.action;

    if(method==='GET'){
      const tokenParam=req.query?.token;
      if(tokenParam){
        const motoboys=await supabaseFetch(`motoboys?token=eq.${encodeURIComponent(tokenParam)}&limit=1`);
        const motoboy=motoboys?.[0]||null;
        if(!motoboy) return res.status(404).json({ok:false,error:'Motoboy não encontrado'});

        // Busca sem join automático do Supabase para não depender do cache de relacionamento.
        const entregasBase=await supabaseFetch(`motoboy_entregas?motoboy_id=eq.${motoboy.id}&select=*&order=created_at.desc`,{method:'GET',headers:{Prefer:''}}).catch(async(err)=>{
          if(String(err.message||'').includes('does not exist') || String(err.message||'').includes('motoboy_entregas')) return [];
          throw err;
        });
        const entregas=await enrichEntregas(entregasBase);
        return res.status(200).json({ok:true,motoboy,entregas});
      }

      const motoboys=await supabaseFetch('motoboys?order=created_at.desc').catch(async(err)=>{
        if(String(err.message||'').includes('does not exist') || String(err.message||'').includes('motoboys')) return [];
        throw err;
      });
      // Busca sem select=*,motoboys(*),pedidos(*) para corrigir o erro:
      // "Could not find a relationship between 'motoboy_entregas' and 'pedidos'".
      const entregasBase=await supabaseFetch('motoboy_entregas?select=*&order=created_at.desc',{method:'GET',headers:{Prefer:''}}).catch(async(err)=>{
        if(String(err.message||'').includes('does not exist') || String(err.message||'').includes('motoboy_entregas')) return [];
        throw err;
      });
      const entregas=await enrichEntregas(entregasBase);
      return res.status(200).json({ok:true,motoboys,entregas});
    }

    if(method==='POST' && action==='scan'){
      const motoboys=await supabaseFetch(`motoboys?token=eq.${encodeURIComponent(body.token||'')}&limit=1`);
      const motoboy=motoboys?.[0];
      if(!motoboy) return res.status(404).json({ok:false,error:'Motoboy inválido'});
      let pedidoId=String(body.pedido_id||'').trim();
      try{ const u=new URL(pedidoId); pedidoId=u.searchParams.get('pedido')||u.searchParams.get('pedido_id')||pedidoId; }catch(e){}
      if(!pedidoId) return res.status(400).json({ok:false,error:'QR Code sem pedido'});
      const pedidos=await supabaseFetch(`pedidos?id=eq.${encodeURIComponent(pedidoId)}&limit=1`);
      const pedido=pedidos?.[0];
      if(!pedido) return res.status(404).json({ok:false,error:'Pedido não encontrado'});
      const existe=await supabaseFetch(`motoboy_entregas?motoboy_id=eq.${motoboy.id}&pedido_id=eq.${pedido.id}&limit=1`);
      let entrega=existe?.[0];
      if(!entrega){
        const ins=await supabaseFetch('motoboy_entregas',{method:'POST',body:JSON.stringify({motoboy_id:motoboy.id,pedido_id:pedido.id,status:'registrado',valor_entrega:pedido.taxa_entrega||0})});
        entrega=ins?.[0];
      }
      await supabaseFetch(`corridas?pedido_id=eq.${pedido.id}`,{method:'PATCH',body:JSON.stringify({motoboy_nome:motoboy.nome,status:'aceita'})}).catch(()=>null);
      return res.status(200).json({ok:true,motoboy,pedido,entrega:{...entrega,pedidos:pedido,motoboys:motoboy}});
    }

    if(method==='POST' && action==='reset'){
      await supabaseFetch('motoboy_entregas?id=not.is.null',{method:'DELETE',headers:{Prefer:'return=minimal'}}).catch(()=>null);
      await supabaseFetch('corridas?id=not.is.null',{method:'PATCH',body:JSON.stringify({status:'disponivel',motoboy_nome:null})}).catch(()=>null);
      return res.status(200).json({ok:true});
    }

    if(method==='POST'){
      const payload={nome:String(body.nome||'').trim(),telefone:cleanPhone(body.telefone),ativo:body.ativo!==false,token:body.token||token()};
      if(!payload.nome) return res.status(400).json({ok:false,error:'Informe o nome do motoboy'});
      const data=await supabaseFetch('motoboys',{method:'POST',body:JSON.stringify(payload)});
      return res.status(200).json({ok:true,motoboy:data?.[0]});
    }

    if(method==='PUT'){
      const id=req.query?.id||body.id;
      if(!id) return res.status(400).json({ok:false,error:'ID obrigatório'});
      const payload={nome:String(body.nome||'').trim(),telefone:cleanPhone(body.telefone),ativo:body.ativo!==false};
      const data=await supabaseFetch(`motoboys?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(payload)});
      return res.status(200).json({ok:true,motoboy:data?.[0]});
    }

    if(method==='DELETE'){
      const id=req.query?.id;
      if(!id) return res.status(400).json({ok:false,error:'ID obrigatório'});
      await supabaseFetch(`motoboys?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});
      return res.status(200).json({ok:true});
    }

    res.status(405).json({ok:false,error:'Método não permitido'});
  }catch(e){res.status(500).json({ok:false,error:e.message,detalhes:e.data||null});}
}
