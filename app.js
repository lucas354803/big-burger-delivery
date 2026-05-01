let produtos=[];
let adicionais=[];
const produtosFallback=[
  {nome:'Big Burger Smash',descricao:'Blend smash, queijo cheddar, bacon, cebola crispy e molho especial da casa.',preco:28.90,badge:'MAIS PEDIDO'},
  {nome:'Big Onion Burger',descricao:'Blend artesanal, queijo prato, onion rings, barbecue e maionese da casa.',preco:27.90},
  {nome:'Big Bacon Cheddar',descricao:'Blend artesanal, cheddar cremoso, bacon em tiras e molho especial.',preco:29.90},
  {nome:'Big Chicken Crispy',descricao:'Frango empanado crocante, queijo, alface, tomate e maionese temperada.',preco:25.90},
  {nome:'Combo Duplo',descricao:'2 burgers + fritas crocantes + refrigerante 600ml.',preco:39.90,badge:'COMBO'},
  {nome:'Combo Família',descricao:'4 burgers + 4 fritas + refrigerante 1,5L para dividir.',preco:84.90,badge:'FAMÍLIA'}
];
const adicionaisFallback=[
  {nome:'Bacon em cubos',preco:5},{nome:'Calabresa',preco:5},{nome:'Queijo mussarela',preco:3},{nome:'Cheddar extra',preco:4},{nome:'Onion rings',preco:5},{nome:'Maionese da casa',preco:2}
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
    adicionais=(d.complementos&&d.complementos.length?d.complementos:adicionaisFallback).map(a=>({...a,preco:Number(a.preco||0)}));
  }catch(e){produtos=produtosFallback;adicionais=adicionaisFallback;}
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
  addons.innerHTML=adicionais.map((a,idx)=>`<div class="addon" id="addon-${idx}"><span>${a.nome}<br><small>+ ${fmt(a.preco)}</small></span><button onclick="toggleAddon(${idx})">+</button></div>`).join('');
  modal.hidden=false;
}
function fecharModal(){modal.hidden=true;}
function toggleAddon(idx){
  const exists=addonsSelecionados.includes(idx);
  if(exists) addonsSelecionados=addonsSelecionados.filter(x=>x!==idx); else if(addonsSelecionados.length<6) addonsSelecionados.push(idx);
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
