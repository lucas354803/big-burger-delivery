let produtos=[];
let categorias=[];
let adicionais=[];
let categoriasComplementos=[];
let produtoComplementoCategorias=[];
let cidadesEntrega=[];
let bairrosEntrega=[];
let taxaEntregaSelecionada=0;
let lojaConfig={loja_aberta:true,pedido_automatico:true,som_pedidos:true,tempo_entrega_padrao:40,mensagem_fechado:'Estamos fechados no momento.'};
let horariosFuncionamento=[];
let lojaStatus={aberto:true,motivo:'fallback'};

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
    const r=await fetch('/api?route=menu');
    const d=await r.json();
    categorias=(d.categorias&&d.categorias.length?d.categorias:categoriasFallback.filter(c=>c.id!=='todos'));
    produtos=(d.produtos&&d.produtos.length?d.produtos:produtosFallback).map(p=>({...p,preco:Number(p.preco||0),preco_promocional:p.preco_promocional==null?null:Number(p.preco_promocional)}));
    categoriasComplementos=(d.categorias_complementos&&d.categorias_complementos.length?d.categorias_complementos:categoriasComplementosFallback);
    adicionais=(d.complementos&&d.complementos.length?d.complementos:adicionaisFallback).map(a=>({...a,preco:Number(a.preco||0)}));
    produtoComplementoCategorias=Array.isArray(d.produto_complemento_categorias)?d.produto_complemento_categorias:[];
    cidadesEntrega=Array.isArray(d.cidades_entrega)?d.cidades_entrega:[];
    bairrosEntrega=Array.isArray(d.bairros_entrega)?d.bairros_entrega:[];
    lojaConfig=d.loja_config||lojaConfig;
    horariosFuncionamento=Array.isArray(d.horarios_funcionamento)?d.horarios_funcionamento:[];
    lojaStatus=d.loja_status||lojaStatus;
  }catch(e){categorias=categoriasFallback.filter(c=>c.id!=='todos');produtos=produtosFallback;categoriasComplementos=categoriasComplementosFallback;adicionais=adicionaisFallback;produtoComplementoCategorias=[];cidadesEntrega=[];bairrosEntrega=[];}
  renderCidadesEntrega();
  renderStatusLoja();
  render();
}



function proximoHorarioTexto(){
  if(!horariosFuncionamento.length) return '';
  const ativos=horariosFuncionamento.filter(h=>h.ativo!==false);
  const nomes=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  return ativos.map(h=>`${h.nome_dia||nomes[h.dia_semana]} ${h.abre} às ${h.fecha}`).join(' • ');
}
function renderStatusLoja(){
  const aberto=lojaStatus?.aberto!==false;
  const statusEl=document.getElementById('lojaStatus');
  const entregaEl=document.getElementById('tempoEntregaInfo');
  const checkoutAlert=document.getElementById('checkoutStatus');
  if(statusEl){
    statusEl.className='store-status '+(aberto?'open':'closed');
    statusEl.innerHTML=aberto?`🟢 Loja aberta <small>Tempo de entrega: ${lojaConfig.tempo_entrega_padrao||40} min</small>`:`🔴 Loja fechada <small>${lojaConfig.mensagem_fechado||'Não estamos recebendo pedidos agora.'}</small>`;
  }
  if(entregaEl) entregaEl.textContent=`Tempo médio: ${lojaConfig.tempo_entrega_padrao||40} min`;
  if(checkoutAlert) checkoutAlert.innerHTML=aberto?`<div class="ok mini">✅ Estamos recebendo pedidos agora. Entrega média: ${lojaConfig.tempo_entrega_padrao||40} min.</div>`:`<div class="err"><b>Loja fechada.</b><br>${lojaConfig.mensagem_fechado||'Volte no horário de atendimento.'}<br><small>${proximoHorarioTexto()}</small></div>`;
  if(typeof btnFinalizar!=='undefined' && btnFinalizar){btnFinalizar.disabled=!aberto;btnFinalizar.classList.toggle('disabled',!aberto)}
}

function produtoCardHtml(p){
  const i=produtos.findIndex(x=>String(x.id)===String(p.id));
  return `<article class="card" onclick="abrirProduto(${i})">
      <div class="food-img" style="${p.imagem_url?`background-image:url('${p.imagem_url}')`:''}"></div>
      <div class="card-body">
        ${(p.desconto_ativo&&p.preco_promocional)||p.badge?`<div class="card-badges">${p.desconto_ativo&&p.preco_promocional?`<span class="badge discount">OFERTA</span>`:''}${p.badge?`<span class="badge">${p.badge}</span>`:''}</div>`:''}
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
  const totalGeral=valor+Number(taxaEntregaSelecionada||0);
  cartCount.textContent=carrinho.length;
  topTotal.textContent=fmt(totalGeral);
  total.textContent=fmt(totalGeral);
  if(typeof taxaEntrega !== 'undefined' && taxaEntrega) taxaEntrega.textContent=fmt(taxaEntregaSelecionada);
  if(typeof totalComEntrega !== 'undefined' && totalComEntrega) totalComEntrega.textContent=fmt(totalGeral);
  cart.innerHTML=carrinho.length?carrinho.map((p,index)=>`<div class="row cart-item-row"><span class="cart-item-info"><b>1x ${p.nome}</b><br><small class="small">${(p.addons||[]).map(a=>a.nome).join(', ')||'Sem adicionais'}${p.observacao?`<br>📝 Obs: ${p.observacao}`:''}</small></span><div class="cart-item-actions"><b>${fmt(p.preco)}</b><button class="cart-trash" type="button" title="Remover produto" aria-label="Remover produto" onclick="removerItemCarrinho(${index})">🗑️</button></div></div>`).join(''):'<div class="cart-empty">🛒<br>Seu carrinho está vazio<br><small>Adicione itens deliciosos para começar!</small></div>';
}

function removerItemCarrinho(index){
  if(index < 0 || index >= carrinho.length) return;
  carrinho.splice(index,1);
  render();
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
  if(typeof obsItem !== 'undefined' && obsItem) obsItem.value='';
  modal.hidden=false;
}
function categoriasPermitidasProduto(produto){
  const ids=produtoComplementoCategorias.filter(v=>String(v.produto_id)===String(produto.id)).map(v=>v.categoria_complemento_id);
  return new Set(ids); // vazio = produto sem adicionais
}
function renderAddonsAgrupados(produto){
  const permitidas=categoriasPermitidasProduto(produto);
  if(!permitidas.size) return '<p class="small">Este produto não possui adicionais.</p>';
  const gruposBase = categoriasComplementos.length ? categoriasComplementos : [{id:'geral',nome:'Adicionais',min_escolha:0,max_escolha:6}];
  const grupos = gruposBase.filter(g=>permitidas.has(g.id));
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
  const observacaoItem=(typeof obsItem !== 'undefined' && obsItem ? obsItem.value.trim() : '');
  carrinho.push({nome:p.nome,descricao:p.descricao,preco:precoProduto(p)+precoAdds,preco_base:precoProduto(p),addons:adds,observacao:observacaoItem});
  fecharModal(); render();
}
function renderCidadesEntrega(){
  if(typeof cidade === 'undefined' || !cidade) return;
  cidade.innerHTML='<option value="">Selecione a cidade</option>'+cidadesEntrega.map(c=>`<option value="${c.id}">${c.nome}</option>`).join('');
  bairro.innerHTML='<option value="">Selecione o bairro</option>';
  taxaEntregaSelecionada=0;
  atualizarBotaoPagamento();
}
function atualizarBairros(){
  if(typeof bairro === 'undefined' || !bairro) return;
  const cid=cidade.value;
  const lista=bairrosEntrega.filter(b=>String(b.cidade_id)===String(cid));
  bairro.innerHTML='<option value="">Selecione o bairro</option>'+lista.map(b=>`<option value="${b.id}" data-preco="${Number(b.preco||0)}" data-tempo="${b.tempo_maximo_minutos||0}">${b.nome} • ${b.tempo_maximo_minutos||0} min • ${fmt(b.preco||0)}</option>`).join('');
  taxaEntregaSelecionada=0;
  render();
}
function atualizarTaxaEntrega(){
  const opt=bairro?.selectedOptions?.[0];
  taxaEntregaSelecionada=Number(opt?.dataset?.preco||0);
  render();
}
function atualizarBotaoPagamento(){
  if(typeof btnFinalizar === 'undefined' || !btnFinalizar) return;
  const f=formaPagamento?.value||'pix';
  btnFinalizar.textContent = f==='pix' ? 'Gerar Pix e finalizar pedido' : 'Finalizar pedido';
}
function nomeSelecionado(selectEl){return selectEl?.selectedOptions?.[0]?.textContent?.split('•')?.[0]?.trim()||'';}

function limparPedidoDepoisDeFinalizar(){
  carrinho=[];
  taxaEntregaSelecionada=0;
  if(typeof nome!=='undefined' && nome) nome.value='';
  if(typeof telefone!=='undefined' && telefone) telefone.value='';
  if(typeof cidade!=='undefined' && cidade) cidade.value='';
  if(typeof bairro!=='undefined' && bairro) bairro.innerHTML='<option value="">Selecione o bairro</option>';
  if(typeof rua!=='undefined' && rua) rua.value='';
  if(typeof obs!=='undefined' && obs) obs.value='';
  if(typeof formaPagamento!=='undefined' && formaPagamento) formaPagamento.value='pix';
  renderCidadesEntrega();
  render();
}

async function finalizar(){
  const subtotal=carrinho.reduce((s,p)=>s+p.preco,0);
  const valor=subtotal+Number(taxaEntregaSelecionada||0);
  const cidadeNome=nomeSelecionado(cidade);
  const bairroNome=nomeSelecionado(bairro);
  const ruaTexto=(rua?.value||'').trim();
  const forma=(formaPagamento?.value||'pix');
  if(lojaStatus?.aberto===false){result.innerHTML='<div class="err"><b>Loja fechada.</b><br>'+ (lojaConfig.mensagem_fechado||'Não estamos recebendo pedidos agora.') +'</div>';return}
  if(!carrinho.length){result.innerHTML='<div class="err"><b>Adicione pelo menos um item ao pedido.</b></div>';return}
  if(!nome.value||!telefone.value||!cidade.value||!bairro.value||!ruaTexto){result.innerHTML='<div class="err"><b>Preencha nome, WhatsApp, cidade, bairro e rua.</b></div>';return}
  result.innerHTML= forma==='pix' ? '<p>Gerando Pix...</p>' : '<p>Finalizando pedido...</p>';
  try{
    const r=await fetch('/api?route=create-pix',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      cliente_nome:nome.value,cliente_telefone:telefone.value,cidade_id:cidade.value,cidade:cidadeNome,bairro_id:bairro.value,bairro:bairroNome,rua:ruaTexto,
      endereco:`${ruaTexto} - ${bairroNome} - ${cidadeNome}`,forma_pagamento:forma,taxa_entrega:Number(taxaEntregaSelecionada||0),observacao:obs.value,itens:carrinho,subtotal,valor_total:valor,tempo_estimado_minutos:Number(lojaConfig.tempo_entrega_padrao||40)
    })});
    const data=await r.json();
    if(!r.ok)throw new Error((data.error||'Erro')+' '+(data.detalhes?JSON.stringify(data.detalhes):''));
    if(data.pix?.qr_code_base64){const pixCode=data.pix.pix_copia_cola||'';result.innerHTML=`<div class="ok"><h3>Pix gerado!</h3><p>Total com entrega: <b>${fmt(valor)}</b></p><img class="qr" src="data:image/png;base64,${data.pix.qr_code_base64}"><textarea id="pixCopiaCola" readonly>${pixCode}</textarea><button type="button" class="copy-pix-btn" onclick="copiarPixCopiaCola()">📋 Copiar código Pix</button><p class="small">Após pagar, o pedido entra automaticamente no painel e avisa a loja.</p></div>`; limparPedidoDepoisDeFinalizar(); }
    else{
      result.innerHTML=`<div class="ok"><h3>Pedido criado!</h3><p>Forma de pagamento: <b>${forma==='dinheiro'?'Dinheiro':'Cartão na entrega'}</b></p><p>Total com entrega: <b>${fmt(valor)}</b></p><p class="small">Carrinho limpo. Tela pronta para novo pedido.</p></div>`;
      limparPedidoDepoisDeFinalizar();
      setTimeout(()=>{ if(result) result.innerHTML=''; }, 3500);
    }
  }catch(e){result.innerHTML=`<div class="err"><b>Erro:</b> ${e.message}</div>`}
}
carregarMenu();


const bannerPadrao={ativo:true,tipo:'video',media_url:'/bigburger-video.mp4',tag:'🔥 Feito na hora • entrega rápida',titulo:'O MELHOR BURGER DA CIDADE!',destaque:'BURGER',texto:'Ingredientes selecionados, sabor irresistível e Pix direto no pedido.',botao_texto:'PEÇA AGORA ›',selo:'🔥 BIG BURGER'};
function escapeHtmlBanner(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function tituloBannerHtml(titulo,destaque){
  titulo=String(titulo||bannerPadrao.titulo); destaque=String(destaque||'').trim();
  if(destaque && titulo.toLowerCase().includes(destaque.toLowerCase())){
    const i=titulo.toLowerCase().indexOf(destaque.toLowerCase());
    return `${escapeHtmlBanner(titulo.slice(0,i))}<span>${escapeHtmlBanner(titulo.slice(i,i+destaque.length))}</span>${escapeHtmlBanner(titulo.slice(i+destaque.length))}`;
  }
  return escapeHtmlBanner(titulo);
}
function aplicarBannerInicial(b){
  b={...bannerPadrao,...(b||{})};
  const hero=document.getElementById('heroBanner'); if(!hero) return;
  hero.style.display=b.ativo===false?'none':'';
  const tagEl=document.getElementById('heroTag');
  const tituloEl=document.getElementById('heroTitulo');
  const textoEl=document.getElementById('heroTexto');
  const botaoEl=document.getElementById('heroBotao');
  const seloEl=document.getElementById('heroSelo');
  if(tagEl) tagEl.textContent=b.tag||bannerPadrao.tag;
  if(tituloEl) tituloEl.innerHTML=tituloBannerHtml(b.titulo,b.destaque);
  if(textoEl) textoEl.textContent=b.texto||'';
  if(botaoEl) botaoEl.textContent=b.botao_texto||'PEÇA AGORA ›';
  if(seloEl) seloEl.textContent=b.selo||'🔥 BIG BURGER';
  const card=document.getElementById('heroMediaCard');
  if(card){
    const url=b.media_url||bannerPadrao.media_url;
    if(b.tipo==='imagem') card.innerHTML=`<img class="hero-video hero-image" id="heroMedia" src="${escapeHtmlBanner(url)}" alt="Big Burger"><div class="video-badge" id="heroSelo">${escapeHtmlBanner(b.selo||'🔥 BIG BURGER')}</div>`;
    else card.innerHTML=`<video class="hero-video" id="heroMedia" src="${escapeHtmlBanner(url)}" autoplay muted loop playsinline></video><div class="video-badge" id="heroSelo">${escapeHtmlBanner(b.selo||'🔥 BIG BURGER')}</div>`;
  }
}
async function carregarBannerInicial(){
  try{
    const local=JSON.parse(localStorage.getItem('bigburger_banner_inicial')||'null');
    if(local) aplicarBannerInicial(local);
    const r=await fetch('/api?route=site-banner&_='+Date.now(),{cache:'no-store'});
    const d=await r.json();
    if(r.ok&&d.ok&&d.banner){ localStorage.setItem('bigburger_banner_inicial',JSON.stringify(d.banner)); aplicarBannerInicial(d.banner); }
  }catch(e){}
}
carregarBannerInicial();


async function copiarPixCopiaCola(){
  const el=document.getElementById('pixCopiaCola');
  const texto=(el?.value||el?.textContent||'').trim();
  if(!texto){alert('Código Pix não encontrado.');return;}
  try{
    if(navigator.clipboard && window.isSecureContext){await navigator.clipboard.writeText(texto);}
    else{el.focus();el.select();document.execCommand('copy');}
    alert('✅ Código Pix copiado!');
  }catch(e){
    try{el.focus();el.select();document.execCommand('copy');alert('✅ Código Pix copiado!');}
    catch(_){alert('Não consegui copiar automático. Segure no código e copie manualmente.');}
  }
}
