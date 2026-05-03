import { supabaseFetch } from '../_supabase.js';
import { getSettings } from './store-settings.js';

const fallbackCategorias = [{ id:'destaques', nome:'Destaques', ordem:1 },{ id:'combos', nome:'Combos', ordem:2 }];
const fallbackProdutos = [
  { id:'big-smash', categoria_id:'destaques', nome:'Big Burger Smash', descricao:'Blend smash, queijo cheddar, bacon, cebola crispy e molho especial da casa.', preco:28.90, desconto_ativo:true, preco_promocional:25.90, desconto_percentual:10.38, badge:'MAIS PEDIDO', ativo:true, ordem:1 },
  { id:'big-onion', categoria_id:'destaques', nome:'Big Onion Burger', descricao:'Blend artesanal, queijo prato, onion rings, barbecue e maionese da casa.', preco:27.90, ativo:true, ordem:2 },
  { id:'big-bacon', categoria_id:'destaques', nome:'Big Bacon Cheddar', descricao:'Blend artesanal, cheddar cremoso, bacon em tiras e molho especial.', preco:29.90, ativo:true, ordem:3 },
  { id:'combo-duplo', categoria_id:'combos', nome:'Combo Duplo', descricao:'2 burgers + fritas crocantes + refrigerante 600ml.', preco:39.90, badge:'COMBO', ativo:true, ordem:4 }
];
const fallbackCategoriasComplementos = [
  { id:'combo', nome:'🍔 Transforme em combo', min_escolha:0, max_escolha:3, ordem:1, ativo:true },
  { id:'carnes', nome:'🥩 Carnes', min_escolha:0, max_escolha:3, ordem:2, ativo:true },
  { id:'queijos', nome:'🧀 Queijos', min_escolha:0, max_escolha:3, ordem:3, ativo:true },
  { id:'extras', nome:'🍟 Extras', min_escolha:0, max_escolha:6, ordem:4, ativo:true },
  { id:'molhos', nome:'🥫 Molhos', min_escolha:0, max_escolha:4, ordem:5, ativo:true }
];
const fallbackComplementos = [
  { id:'fritas', categoria_complemento_id:'combo', nome:'Fritas', preco:4.5, ativo:true, ordem:1 },
  { id:'bacon', categoria_complemento_id:'carnes', nome:'Bacon em cubos', preco:5, ativo:true, ordem:1 },
  { id:'calabresa', categoria_complemento_id:'carnes', nome:'Calabresa', preco:5, ativo:true, ordem:2 },
  { id:'mussarela', categoria_complemento_id:'queijos', nome:'Queijo mussarela', preco:3, ativo:true, ordem:1 },
  { id:'cheddar', categoria_complemento_id:'queijos', nome:'Cheddar extra', preco:4, ativo:true, ordem:2 },
  { id:'onion', categoria_complemento_id:'extras', nome:'Onion rings', preco:5, ativo:true, ordem:1 },
  { id:'maionese', categoria_complemento_id:'molhos', nome:'Maionese da casa', preco:2, ativo:true, ordem:1 }
];

export default async function handler(req, res) {
  try {
    const settingsPromise = getSettings();
    const [categorias, produtos, categorias_complementos, complementos, produto_complemento_categorias, cidades_entrega, bairros_entrega, settings] = await Promise.all([
      supabaseFetch('categorias?select=*&ativo=eq.true&order=ordem.asc,nome.asc'),
      supabaseFetch('produtos?select=*&ativo=eq.true&order=ordem.asc,nome.asc'),
      supabaseFetch('categorias_complementos?select=*&ativo=eq.true&order=ordem.asc,nome.asc'),
      supabaseFetch('complementos?select=*&ativo=eq.true&order=ordem.asc,nome.asc'),
      supabaseFetch('produto_complemento_categorias?select=*'),
      supabaseFetch('cidades_entrega?select=*&ativo=eq.true&order=ordem.asc,nome.asc'),
      supabaseFetch('bairros_entrega?select=*&ativo=eq.true&order=ordem.asc,nome.asc'),
      settingsPromise
    ]);
    res.status(200).json({ ok:true, categorias, produtos, categorias_complementos, complementos, produto_complemento_categorias, cidades_entrega, bairros_entrega, loja_config:settings.config, horarios_funcionamento:settings.horarios, loja_status:settings.status });
  } catch (e) {
    res.status(200).json({
      ok:false,
      fallback:true,
      error:e.message,
      categorias:fallbackCategorias,
      produtos:fallbackProdutos,
      categorias_complementos:fallbackCategoriasComplementos,
      complementos:fallbackComplementos,
      produto_complemento_categorias:[],
      cidades_entrega:[],
      bairros_entrega:[],
      loja_config:{loja_aberta:true,pedido_automatico:true,som_pedidos:true,tempo_entrega_padrao:40,mensagem_fechado:'Estamos fechados no momento.'},
      horarios_funcionamento:[],
      loja_status:{aberto:true,motivo:'fallback'}
    });
  }
}
