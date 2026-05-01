let produtos=[];
let categorias=[];
let adicionais=[];
let categoriasComplementos=[];
let produtoComplementoCategorias=[];

const produtosFallback=[
  {id:'big-classico',categoria_id:'hamburgueres',nome:'🍔✨ Big Clássico',descricao:'Pão macio, carne suculenta, queijo derretido, cebola caramelizada, alface, tomate e maionese especial.',preco:19.90,desconto_ativo:true,preco_promocional:16.90,badge:'Mais Pedido'},
  {id:'big-smash',categoria_id:'hamburgueres',nome:'Big Burger Smash',descricao:'Blend smash, queijo cheddar, bacon, cebola crispy e molho especial da casa.',preco:28.90,desconto_ativo:true,preco_promocional:25.90,badge:'MAIS PEDIDO'},
  {id:'big-onion',categoria_id:'hamburgueres',nome:'Big Onion Burger',descricao:'Blend artesanal, queijo prato, onion rings, barbecue e maionese da casa.',preco:27.90},
  {id:'big-bacon',categoria_id:'hamburgueres',nome:'Big Bacon Cheddar',descricao:'Blend artesanal, cheddar cremoso, bacon em tiras e molho especial.',preco:29.90},
  {id:'combo-duplo',categoria_id:'combos',nome:'Combo Duplo',descricao:'2 burgers + fritas crocantes + refrigerante 600ml.',preco:39.90,badge:'COMBO',promocao_ativa:true},
  {id:'combo-familia',categoria_id:'combos',nome:'Combo Família',descricao:'4 burgers + 4 fritas + refrigerante 1,5L para dividir.',preco:84.90,badge:'FAMÍLIA',promocao_ativa:true}
];
const categoriasFallback=[
  {id:'todos',nome:'🔥 Todos',ordem:0},
  {id:'destaques',nome:'🔥 Destaques da casa',ordem:1},
  {id:'hamburgueres',nome:'🍔 Hambúrgueres',ordem:2},
  {id:'combos',nome:'🍟 Combos',ordem:3},
  {id:'porcoes',nome:'🍗 Porções',ordem:4},
  {id:'bebidas',nome:'🥤 Bebidas',ordem:5}
];
const categoriasComplementosFallback=[
  {id:'combo',nome:'🍔 Transforme em combo',min_escolha:0,max_escolha:3,ordem:1},
  {id:'carnes',nome:'🥩 Carnes',min_escolha:0,max_escolha:3,ordem:2},
  {id:'queijos',nome:'🧀 Queijos',min_escolha:0,max_escolha:3,ordem:3},
  {id:'extras',nome:'🍟 Extras',min_escolha:0,max_escolha:6,ordem:4},
  {id:'molhos',nome:'🥫 Molhos',min_escolha:0,max_escolha:4,ordem:5}
];
const adicionaisFallback=[
  {id:'fritas',categoria_complemento_id:'combo',nome:'Fritas',preco:4.5},
  {id:'bacon',categoria_complemento_id:'carnes',nome:'Bacon em cubos',preco:5},
  {id:'calabresa',categoria_complemento_id:'carnes',nome:'Calabresa',preco:5},
  {id:'mussarela',categoria_complemento_id:'queijos',nome:'Queijo mussarela',preco:3},
  {id:'cheddar',categoria_complemento_id:'queijos',nome:'Cheddar extra',preco:4},
  {id:'onion',categoria_complemento_id:'extras',nome:'Onion rings',preco:5},
  {id:'maionese',categoria_complemento_id:'molhos',nome:'Maionese da casa',preco:2}
];
let carrinho=[];
let produtoAberto=null;
let addonsSelecionados=[];
let categoriaSelecionada='todos';
const fmt=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function precoProduto(p){return p.desconto_ativo && Number(p.preco_promocional||0)>0 ? Number(p.preco_promocional) : Number(p.preco||0)}
function descontoHtml(p){return p.desconto_ativo && Number(p.preco_promocional||0)>0 ? `<div class="price promo"><span>${fmt(p.preco_promocional)}</span><small>${fmt(p.preco)}</small></div>` : `<div class="price">${fmt(p.preco)}</div>`}

async function carregarMenu(){
  try{
    const r=await fetch('/api/menu');
    const d=await r.json();
    categorias=(d.categorias&&d.categorias.length?d.categorias:categoriasFallback.filter(c=>c.id!=='todos'));
    produtos=(d.produtos&&d.produtos.length?d.produtos:produtosFallback).map(p=>({...p,preco:Number(p.preco||0),preco_promocional:p.preco_promocional==null?null:Number(p.preco_promocional)}));
    categoriasComplementos=(d.categorias_complementos&&d.categorias_complementos.length?d.categorias_complementos:categoriasComplementosFallback);
    adicionais=(d.complementos&&d.complementos.length?d.complementos:adicionaisFallback).map(a=>({...a,preco:Number(a.preco||0)}));
    produtoComplementoCategorias=Array.isArray(d.produto_complemento_categorias)?d.produto_complemento_categorias:[];
  }catch(e){categorias=categoriasFallback.filter(c=>c.id!=='todos');produtos=produtosFallback;categoriasComplementos=categoriasComplementosFallback;adicionais=adicionaisFallback;produtoComplementoCategorias=[];}
  render();
}


function produtoCardHtml(p){
  const i=produtos.findIndex(x=>String(x.id)===String(p.id));
  return `<article class="card" onclick="abrirProduto(${i})">
      ${p.badge?`<div class="badge">${p.badge}</div>`:''}
      ${p.desconto_ativo&&p.preco_promocional?`<div class="badge discount">OFERTA</div>`:''}
      <div class="food-img" style="${p.imagem_url?`background-image:url('${p.imagem_url}')`:''}"></div>
      <div class="card-body">
        <h3>${p.nome}</h3>
        <p>${p.descricao||''}</p>
        <div class="card-foot">
          ${descontoHtml(p)}
          <button class="mini-btn" onclick="event.stopPropagation(); abrirProduto(${i})">🛒 Adicionar</button>
        </div>
      </div>
    </article>`;
}

function render(){
  renderCategorias();
  const visiveis = categoriaSelecionada==='todos' ? produtos : produtos.filter(p=>String(p.categoria_id||'')===String(categoriaSelecionada));
  if(typeof menuTitle !== 'undefined' && menuTitle){
    const cat = categoriaSelecionada==='todos' ? null : categorias.find(c=>String(c.id)===String(categoriaSelecionada));
    menuTitle.textContent = cat ? cat.nome.replace(/^[^A-Za-zÀ-ÿ0-9]+\s*/, '') : 'Os mais pedidos da Big Burger';
  }
  menu.innerHTML=visiveis.map(produtoCardHtml).join('') || '<div class="empty-menu">Nenhum produto cadastrado nessa categoria.</div>';
  const promos = produtos.filter(p=>p.promocao_ativa);
  if(typeof promosGrid !== 'undefined' && promosGrid){
    promosGrid.innerHTML = promos.length ? promos.map(produtoCardHtml).join('') : '<div class="empty-menu">Nenhuma promoção cadastrada ainda. Cadastre pelo Admin → Promoções.</div>';
  }
  const valor=carrinho.reduce((s,p)=>s+p.preco,0);
  cartCount.textContent=carrinho.length;
  topTotal.textContent=fmt(valor);
  total.textContent=fmt(valor);
  cart.innerHTML=carrinho.length?carrinho.map(p=>`<div class="row"><span><b>1x ${p.nome}</b><br><small class="small">${(p.addons||[]).map(a=>a.nome).join(', ')||'Sem adicionais'}</small></span><b>${fmt(p.preco)}</b></div>`).join(''):'<div class="cart-empty">🛒<br>Seu carrinho está vazio<br><small>Adicione itens deliciosos para começar!</small></div>';
}
function renderCategorias(){
  if(typeof categoryBar === 'undefined' || !categoryBar) return;
  const catsBase=[{id:'todos',nome:'🔥 Todos'},...categorias].filter((c,idx,arr)=>arr.findIndex(x=>String(x.id)===String(c.id))===idx);
  categoryBar.innerHTML=catsBase.map(c=>`<button class="cat-btn ${String(categoriaSelecionada)===String(c.id)?'active':''}" onclick="selecionarCategoria('${String(c.id).replace(/'/g,"\\'")}')">${c.nome}</button>`).join('');
}
function selecionarCategoria(id){
  categoriaSelecionada=id;
  render();
  document.querySelector('#cardapio')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function abrirProduto(i){
  produtoAberto=i; addonsSelecionados=[];
  const p=produtos[i];
  modalNome.textContent=p.nome;
  modalDesc.textContent=p.descricao||'';
  modalPreco.innerHTML=p.desconto_ativo&&p.preco_promocional?`${fmt(p.preco_promocional)} <small class="old-price">${fmt(p.preco)}</small>`:fmt(p.preco);
  if(p.imagem_url){modalImg.style.backgroundImage=`url('${p.imagem_url}')`;modalImg.classList.add('tem-imagem')}else{modalImg.style.backgroundImage='';modalImg.classList.remove('tem-imagem')}
  addons.innerHTML=renderAddonsAgrupados(p);
  modal.hidden=false;
}
function categoriasPermitidasProduto(produto){
  const ids=produtoComplementoCategorias.filter(v=>v.produto_id===produto.id).map(v=>v.categoria_complemento_id);
  return ids.length?new Set(ids):null;
}
function renderAddonsAgrupados(produto){
  const permitidas=categoriasPermitidasProduto(produto);
  const gruposBase = categoriasComplementos.length ? categoriasComplementos : [{id:'geral',nome:'Adicionais',min_escolha:0,max_escolha:6}];
  const grupos = permitidas ? gruposBase.filter(g=>permitidas.has(g.id)) : gruposBase;
  let html='';
  grupos.forEach(g=>{
    const itens=adicionais.map((a,idx)=>({...a,idx})).filter(a=>(a.categoria_complemento_id||'geral')===g.id);
    if(!itens.length) return;
    html+=`<div class="addon-group"><div class="addon-title"><b>${g.nome}</b><small>Escolha de ${g.min_escolha||0} até ${g.max_escolha||6} opções</small></div>`;
    html+=itens.map(a=>`<div class="addon" id="addon-${a.idx}"><span>${a.nome}<br><small>+ ${fmt(a.preco)}</small></span><button onclick="toggleAddon(${a.idx})">+</button></div>`).join('');
    html+='</div>';
  });
  return html || '<p class="small">Este produto não possui complementos vinculados.</p>';
}
function fecharModal(){modal.hidden=true;}
function toggleAddon(idx){
  const add=adicionais[idx];
  const grupo=categoriasComplementos.find(g=>g.id===add.categoria_complemento_id);
  const selecionadosGrupo=addonsSelecionados.filter(i=>adicionais[i]?.categoria_complemento_id===add.categoria_complemento_id);
  const exists=addonsSelecionados.includes(idx);
  if(exists) addonsSelecionados=addonsSelecionados.filter(x=>x!==idx);
  else if(!grupo || selecionadosGrupo.length < Number(grupo.max_escolha||6)) addonsSelecionados.push(idx);
  else alert(`Você pode escolher no máximo ${grupo.max_escolha} opções em ${grupo.nome}.`);
  adicionais.forEach((_,i)=>document.getElementById('addon-'+i)?.classList.toggle('active',addonsSelecionados.includes(i)));
}
function adicionarModal(){
  const p=produtos[produtoAberto];
  const adds=addonsSelecionados.map(i=>adicionais[i]);
  const precoAdds=adds.reduce((s,a)=>s+a.preco,0);
  carrinho.push({nome:p.nome,descricao:p.descricao,preco:precoProduto(p)+precoAdds,preco_base:precoProduto(p),addons:adds});
  fecharModal(); render();
}
async function finalizar(){
  const valor=carrinho.reduce((s,p)=>s+p.preco,0);
  if(!carrinho.length){result.innerHTML='<div class="err"><b>Adicione pelo menos um item ao pedido.</b></div>';return}
  if(!nome.value||!telefone.value||!endereco.value){result.innerHTML='<div class="err"><b>Preencha nome, telefone e endereço.</b></div>';return}
  result.innerHTML='<p>Gerando Pix...</p>';
  try{
    const r=await fetch('/api/create-pix',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cliente_nome:nome.value,cliente_telefone:telefone.value,endereco:endereco.value,observacao:obs.value,itens:carrinho,valor_total:valor})});
    const data=await r.json();
    if(!r.ok)throw new Error((data.error||'Erro')+' '+(data.detalhes?JSON.stringify(data.detalhes):''));
    if(data.pix?.qr_code_base64){result.innerHTML=`<div class="ok"><h3>Pix gerado!</h3><img class="qr" src="data:image/png;base64,${data.pix.qr_code_base64}"><textarea readonly>${data.pix.pix_copia_cola}</textarea><p class="small">Após pagar, o webhook libera a entrega automaticamente.</p></div>`}
    else{result.innerHTML=`<div class="ok"><h3>Pedido criado</h3><p>${data.mensagem||'Pedido registrado com sucesso.'}</p></div>`}
  }catch(e){result.innerHTML=`<div class="err"><b>Erro:</b> ${e.message}</div>`}
}
carregarMenu();
