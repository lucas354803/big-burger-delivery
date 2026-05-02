
import { supabaseFetch } from './_supabase.js';

const defaultConfig = {
  id: 1,
  loja_aberta: true,
  pedido_automatico: true,
  som_pedidos: true,
  tempo_entrega_padrao: 40,
  mensagem_fechado: 'Estamos fechados no momento. Volte no nosso horário de atendimento.'
};
const defaultHorarios = [
  { dia_semana: 0, nome_dia: 'Domingo', abre: '18:30', fecha: '00:00', ativo: true },
  { dia_semana: 1, nome_dia: 'Segunda', abre: '18:30', fecha: '00:00', ativo: false },
  { dia_semana: 2, nome_dia: 'Terça', abre: '18:30', fecha: '00:00', ativo: true },
  { dia_semana: 3, nome_dia: 'Quarta', abre: '18:30', fecha: '00:00', ativo: true },
  { dia_semana: 4, nome_dia: 'Quinta', abre: '18:30', fecha: '00:00', ativo: true },
  { dia_semana: 5, nome_dia: 'Sexta', abre: '18:30', fecha: '01:00', ativo: true },
  { dia_semana: 6, nome_dia: 'Sábado', abre: '18:30', fecha: '01:00', ativo: true }
];

function minutos(h){ const [a,b]=String(h||'00:00').split(':').map(Number); return (a||0)*60+(b||0); }
function agoraSaoPaulo(){
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date());
  const wd = {Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[parts.find(x=>x.type==='weekday')?.value] ?? 0;
  const hour = Number(parts.find(x=>x.type==='hour')?.value || 0);
  const minute = Number(parts.find(x=>x.type==='minute')?.value || 0);
  return { dia_semana: wd, minuto: hour*60+minute };
}
export function calcularAberto(config, horarios){
  if(config?.loja_aberta === false) return { aberto:false, motivo:'manual' };
  const agora = agoraSaoPaulo();
  const h = (horarios||[]).find(x=>Number(x.dia_semana)===agora.dia_semana);
  if(!h || h.ativo === false) return { aberto:false, motivo:'fora_horario' };
  const ini = minutos(h.abre), fim = minutos(h.fecha);
  const atual = agora.minuto;
  const aberto = fim <= ini ? (atual >= ini || atual <= fim) : (atual >= ini && atual <= fim);
  return { aberto, motivo: aberto?'aberto':'fora_horario', horario:h };
}
async function getSettings(){
  let config=defaultConfig, horarios=defaultHorarios;
  try{ const c=await supabaseFetch('loja_config?select=*&id=eq.1&limit=1',{headers:{Prefer:''}}); if(c?.[0]) config={...defaultConfig,...c[0]}; }catch(e){}
  try{ const h=await supabaseFetch('horarios_funcionamento?select=*&order=dia_semana.asc',{headers:{Prefer:''}}); if(h?.length) horarios=h; }catch(e){}
  return { config, horarios, status: calcularAberto(config, horarios) };
}
export { getSettings };

export default async function handler(req,res){
  try{
    if(req.method==='GET') return res.status(200).json({ok:true,...await getSettings()});
    if(req.method!=='POST') return res.status(405).json({ok:false,error:'Use GET ou POST'});
    const body=req.body||{};
    const config = body.config || {};
    const cleanConfig = {
      id: 1,
      loja_aberta: Boolean(config.loja_aberta),
      pedido_automatico: Boolean(config.pedido_automatico),
      som_pedidos: Boolean(config.som_pedidos),
      tempo_entrega_padrao: Number(config.tempo_entrega_padrao || 40),
      mensagem_fechado: String(config.mensagem_fechado || defaultConfig.mensagem_fechado)
    };
    const existsConfig = await supabaseFetch('loja_config?select=id&id=eq.1&limit=1', {headers:{Prefer:''}}).catch(()=>[]);
    if (existsConfig?.length) await supabaseFetch('loja_config?id=eq.1',{method:'PATCH',body:JSON.stringify(cleanConfig)});
    else await supabaseFetch('loja_config',{method:'POST',body:JSON.stringify(cleanConfig)});
    if(Array.isArray(body.horarios)){
      for(const h of body.horarios){
        const payload={dia_semana:Number(h.dia_semana),nome_dia:String(h.nome_dia||''),abre:String(h.abre||'18:30'),fecha:String(h.fecha||'00:00'),ativo:Boolean(h.ativo)};
        const existsHorario = await supabaseFetch(`horarios_funcionamento?select=id&dia_semana=eq.${payload.dia_semana}&limit=1`, {headers:{Prefer:''}}).catch(()=>[]);
        if (existsHorario?.length) await supabaseFetch(`horarios_funcionamento?dia_semana=eq.${payload.dia_semana}`,{method:'PATCH',body:JSON.stringify(payload)});
        else await supabaseFetch('horarios_funcionamento',{method:'POST',body:JSON.stringify(payload)});
      }
    }
    res.status(200).json({ok:true,...await getSettings()});
  }catch(e){res.status(e.status||500).json({ok:false,error:e.message,detalhes:e.data||null});}
}
