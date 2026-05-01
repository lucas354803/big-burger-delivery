let produtos=[];
let adicionais=[];
let categoriasComplementos=[];
const produtosFallback=[
  {nome:'Big Burger Smash',descricao:'Blend smash, queijo cheddar, bacon, cebola crispy e molho especial da casa.',preco:28.90,badge:'MAIS PEDIDO'},
  {nome:'Big Onion Burger',descricao:'Blend artesanal, queijo prato, onion rings, barbecue e maionese da casa.',preco:27.90},
  {nome:'Big Bacon Cheddar',descricao:'Blend artesanal, cheddar cremoso, bacon em tiras e molho especial.',preco:29.90},
  {nome:'Big Chicken Crispy',descricao:'Frango empanado crocante, queijo, alface, tomate e maionese temperada.',preco:25.90},
  {nome:'Combo Duplo',descricao:'2 burgers + fritas crocantes + refrigerante 600ml.',preco:39.90,badge:'COMBO'},
  {nome:'Combo Família',descricao:'4 burgers + 4 fritas + refrigerante 1,5L para dividir.',preco:84.90,badge:'FAMÍLIA'}
];
const categoriasComplementosFallback=[
  {id:'carnes',nome:'🥩 Carnes',min_escolha:0,max_escolha:3,ordem:1},
  {id:'queijos',nome:'🧀 Queijos',min_escolha:0,max_escolha:3,ordem:2},
  {id:'extras',nome:'🍟 Extras',min_escolha:0,max_escolha:6,ordem:3},
  {id:'molhos',nome:'🥫 Molhos',min_escolha:0,max_escolha:4,ordem:4}
];
const adicionaisFallback=[
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
const fmt=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

async function carregarMenu(){
  try{
    const r=await fetch('/api/menu');
    const d=await r.json();
    produtos=(d.produtos&&d.produtos.length?d.produtos:produtosFallback).map(p=>({...p,preco:Number(p.preco||0)}));
    categoriasComplementos=(d.categorias_complementos&&d.categorias_complementos.length?d.categorias_complementos:categoriasComplementosFallback);
    adicionais=(d.complementos&&d.complementos.length?d.complementos:adicionaisFallback).map(a=>({...a,preco:Number(a.preco||0)}));
  }catch(e){produtos=produtosFallback;categoriasComplementos=categoriasComplementosFallback;adicionais=adicionaisFallback;}
  render();
}

function render(){
  menu.innerHTML=produtos.map((p,i)=>`
    <article class="card" onclick="abrirProduto(${i})">
      ${p.badge?`<div class="badge">${p.badge}</div>`:''}
      <div class="food-img" style="${p.imagem_url?`background-image:url('${p.imagem_url}')`:''}"></div>
      <div class="card-body">
        <h3>${p.nome}</h3>
        <p>${p.descricao||''}</p>
        <div class="card-foot">
          <div class="price">${fmt(p.preco)}</div>
          <button class="mini-btn" onclick="event.stopPropagation(); abrirProduto(${i})">🛒 Adicionar</button>
        </div>
      </div>
    </article>`).join('');
  const valor=carrinho.reduce((s,p)=>s+p.preco,0);
  cartCount.textContent=carrinho.length;
  topTotal.textContent=fmt(valor);
  total.textContent=fmt(valor);
  cart.innerHTML=carrinho.length?carrinho.map(p=>`<div class="row"><span><b>1x ${p.nome}</b><br><small class="small">${(p.addons||[]).map(a=>a.nome).join(', ')||'Sem adicionais'}</small></span><b>${fmt(p.preco)}</b></div>`).join(''):'<div class="cart-empty">🛒<br>Seu carrinho está vazio<br><small>Adicione itens deliciosos para começar!</small></div>';
}
function abrirProduto(i){
  produtoAberto=i; addonsSelecionados=[];
  const p=produtos[i];
  modalNome.textContent=p.nome;
  modalDesc.textContent=p.descricao||'';
  modalPreco.textContent=fmt(p.preco);
  if(p.imagem_url){modalImg.style.backgroundImage=`url('${p.imagem_url}')`;modalImg.classList.add('tem-imagem')}else{modalImg.style.backgroundImage='';modalImg.classList.remove('tem-imagem')}
  addons.innerHTML=renderAddonsAgrupados();
  modal.hidden=false;
}
function renderAddonsAgrupados(){
  const grupos = categoriasComplementos.length ? categoriasComplementos : [{id:'geral',nome:'Adicionais',min_escolha:0,max_escolha:6}];
  let html='';
  grupos.forEach(g=>{
    const itens=adicionais.map((a,idx)=>({...a,idx})).filter(a=>(a.categoria_complemento_id||'geral')===g.id);
    if(!itens.length) return;
    html+=`<div class="addon-group"><div class="addon-title"><b>${g.nome}</b><small>Escolha de ${g.min_escolha||0} até ${g.max_escolha||6} opções</small></div>`;
    html+=itens.map(a=>`<div class="addon" id="addon-${a.idx}"><span>${a.nome}<br><small>+ ${fmt(a.preco)}</small></span><button onclick="toggleAddon(${a.idx})">+</button></div>`).join('');
    html+='</div>';
  });
  const semCat=adicionais.map((a,idx)=>({...a,idx})).filter(a=>!a.categoria_complemento_id && !categoriasComplementos.length);
  return html || semCat.map(a=>`<div class="addon" id="addon-${a.idx}"><span>${a.nome}<br><small>+ ${fmt(a.preco)}</small></span><button onclick="toggleAddon(${a.idx})">+</button></div>`).join('');
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
  carrinho.push({nome:p.nome,descricao:p.descricao,preco:Number(p.preco)+precoAdds,addons:adds});
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
