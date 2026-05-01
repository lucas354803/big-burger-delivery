import { supabaseFetch } from './_supabase.js';

const fallbackCategorias = [
  { id: 'destaques', nome: 'Destaques', ordem: 1 },
  { id: 'combos', nome: 'Combos', ordem: 2 }
];
const fallbackProdutos = [
  { id:'big-smash', categoria_id:'destaques', nome:'Big Burger Smash', descricao:'Blend smash, queijo cheddar, bacon, cebola crispy e molho especial da casa.', preco:28.90, badge:'MAIS PEDIDO', ativo:true, ordem:1 },
  { id:'big-onion', categoria_id:'destaques', nome:'Big Onion Burger', descricao:'Blend artesanal, queijo prato, onion rings, barbecue e maionese da casa.', preco:27.90, ativo:true, ordem:2 },
  { id:'big-bacon', categoria_id:'destaques', nome:'Big Bacon Cheddar', descricao:'Blend artesanal, cheddar cremoso, bacon em tiras e molho especial.', preco:29.90, ativo:true, ordem:3 },
  { id:'big-chicken', categoria_id:'destaques', nome:'Big Chicken Crispy', descricao:'Frango empanado crocante, queijo, alface, tomate e maionese temperada.', preco:25.90, ativo:true, ordem:4 },
  { id:'combo-duplo', categoria_id:'combos', nome:'Combo Duplo', descricao:'2 burgers + fritas crocantes + refrigerante 600ml.', preco:39.90, badge:'COMBO', ativo:true, ordem:5 },
  { id:'combo-familia', categoria_id:'combos', nome:'Combo Família', descricao:'4 burgers + 4 fritas + refrigerante 1,5L para dividir.', preco:84.90, badge:'FAMÍLIA', ativo:true, ordem:6 }
];
const fallbackComplementos = [
  { id:'bacon', nome:'Bacon em cubos', preco:5, ativo:true, ordem:1 },
  { id:'calabresa', nome:'Calabresa', preco:5, ativo:true, ordem:2 },
  { id:'mussarela', nome:'Queijo mussarela', preco:3, ativo:true, ordem:3 },
  { id:'cheddar', nome:'Cheddar extra', preco:4, ativo:true, ordem:4 },
  { id:'onion', nome:'Onion rings', preco:5, ativo:true, ordem:5 },
  { id:'maionese', nome:'Maionese da casa', preco:2, ativo:true, ordem:6 }
];

export default async function handler(req, res) {
  try {
    const [categorias, produtos, complementos] = await Promise.all([
      supabaseFetch('categorias?select=*&ativo=eq.true&order=ordem.asc,nome.asc'),
      supabaseFetch('produtos?select=*&ativo=eq.true&order=ordem.asc,nome.asc'),
      supabaseFetch('complementos?select=*&ativo=eq.true&order=ordem.asc,nome.asc')
    ]);
    res.status(200).json({ ok:true, categorias, produtos, complementos });
  } catch (e) {
    res.status(200).json({ ok:true, fallback:true, categorias:fallbackCategorias, produtos:fallbackProdutos, complementos:fallbackComplementos });
  }
}
