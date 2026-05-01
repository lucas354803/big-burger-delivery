import { supabaseFetch } from './_supabase.js';
export default async function handler(req,res){try{const data=await supabaseFetch('pedidos?select=*&order=created_at.desc',{method:'GET',headers:{Prefer:''}});res.status(200).json({ok:true,pedidos:data});}catch(e){res.status(500).json({ok:false,error:e.message});}}
