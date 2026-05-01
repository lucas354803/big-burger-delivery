
const state={categorias:[],produtos:[],categorias_complementos:[],complementos:[],produto_complemento_categorias:[],cidades_entrega:[],bairros_entrega:[],clientes:[],clientesResumo:null};
const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function abrirMain(id){
  document.querySelectorAll('.main-tab,.main-content').forEach(x=>x.classList.remove('active'));
  document.querySelector(`.main-tab[onclick="abrirMain('${id}')"]`).classList.add('active');
  document.getElementById('main-'+id).classList.add('active');
}
function abrirTab(id){
  abrirMain('editor');
  document.querySelectorAll('#main-editor .tab,#main-editor .tab-content').forEach(x=>x.classList.remove('active'));
  document.querySelector(`#main-editor .tab[onclick="abrirTab('${id}')"]`).classList.add('active');
  document.getElementById(id).classList.add('active');
}
async function api(tabela,method='GET',body=null,id=null){const url='/api/admin-menu?tabela='+tabela+(id?'&id='+id:'');const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify({...body,tabela}):null});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||JSON.stringify(d));return d.data;}
let pedidosCache=[];
let somPedidosLigado=localStorage.getItem('somPedidosLigado')!=='0';
let ultimoTotalPedidos=0;
const orderStatuses=[
  {id:'em_analise',titulo:'Em análise',emoji:'🔴',cls:'analise'},
  {id:'em_preparo',titulo:'Em preparo',emoji:'🟡',cls:'preparo'},
  {id:'pronto',titulo:'Pronto',emoji:'🔵',cls:'pronto'},
  {id:'em_entrega',titulo:'Em entrega',emoji:'🟢',cls:'entrega'},
  {id:'finalizado',titulo:'Finalizados',emoji:'⚫',cls:'finalizado'}
];
function normalizarStatusPedido(status){
  if(['aguardando_pagamento','pedido_recebido','pago','aprovado','pendente'].includes(status)) return 'em_analise';
  if(['preparo'].includes(status)) return 'em_preparo';
  if(['entregue'].includes(status)) return 'finalizado';
  return status || 'em_analise';
}
function shortId(id){return String(id||'').split('-')[0].toUpperCase()}
function itensTexto(itens){
  try{ if(typeof itens==='string') itens=JSON.parse(itens); }catch(e){}
  if(!Array.isArray(itens)||!itens.length) return 'Itens não informados';
  return itens.map(i=>`${i.qtd||i.quantidade||1}x ${i.nome||i.name||'Produto'}${i.preco?` - ${brl(i.preco)}`:''}`).join('\\n');
}
function enderecoPedido(p){return [p.cidade,p.bairro,p.rua].filter(Boolean).join(' • ') || p.endereco || ''}
function limparTel(t){return String(t||'').replace(/\D/g,'').replace(/^55/,'')}
function abrirWhats(p,tipo){
  const tel=limparTel(p.cliente_telefone);
  if(!tel){alert('Cliente sem WhatsApp cadastrado.');return;}
  let msg='';
  if(tipo==='aceito') msg=`🍔 Big Burger\\n\\nSeu pedido #${shortId(p.id)} foi ACEITO! ✅\\n\\n📦 Pedido:\\n${itensTexto(p.itens)}\\n\\n💰 Total: ${brl(p.valor_total)}\\n👨‍🍳 Já estamos preparando seu pedido.`;
  if(tipo==='entrega') msg=`🚀 Big Burger\\n\\nSeu pedido #${shortId(p.id)} saiu para entrega!\\n\\n📍 Endereço: ${enderecoPedido(p)}\\n💰 Total: ${brl(p.valor_total)}\\n\\n🛵 Já está a caminho. Fique atento!`;
  if(tipo==='pronto') msg=`🍔 Big Burger\\n\\nSeu pedido #${shortId(p.id)} está PRONTO! ✅\\nLogo será enviado para entrega.`;
  window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`,'_blank');
}
async function atualizarStatusPedido(id,status,whatsTipo){
  const pedido=pedidosCache.find(p=>p.id===id);
  try{
    const r=await fetch('/api/order-status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status})});
    const d=await r.json();
    if(!r.ok||!d.ok) throw new Error(d.error||JSON.stringify(d));
    if(pedido && whatsTipo) abrirWhats({...pedido,status},whatsTipo);
    await loadPedidos();
  }catch(e){alert('Erro ao atualizar pedido: '+e.message)}
}
function cardPedido(p){
  const st=normalizarStatusPedido(p.status);
  const itens=itensTexto(p.itens).replaceAll('\\n','<br>');
  let acoes='';
  if(st==='em_analise') acoes=`<button class="order-action accept" onclick="atualizarStatusPedido('${p.id}','em_preparo','aceito')">✅ Aceitar pedido</button>`;
  if(st==='em_preparo') acoes=`<button class="order-action ready" onclick="atualizarStatusPedido('${p.id}','pronto','pronto')">🔵 Marcar pronto</button><button class="order-action delivery" onclick="atualizarStatusPedido('${p.id}','em_entrega','entrega')">🛵 Saiu para entrega</button>`;
  if(st==='pronto') acoes=`<button class="order-action delivery" onclick="atualizarStatusPedido('${p.id}','em_entrega','entrega')">🛵 Saiu para entrega</button>`;
  if(st==='em_entrega') acoes=`<button class="order-action done" onclick="atualizarStatusPedido('${p.id}','finalizado','')">✅ Finalizar</button>`;
  if(st==='finalizado') acoes=`<span class="order-done">Pedido finalizado</span>`;
  return `<div class="order-card"><div class="order-title"><b>#${shortId(p.id)}</b><span>${brl(p.valor_total)}</span></div><div class="order-customer">👤 ${p.cliente_nome||''}<br>📞 ${p.cliente_telefone||''}</div><div class="order-items">${itens}</div><div class="order-address">📍 ${enderecoPedido(p)}<br>💳 ${p.forma_pagamento||'pix'} • 🚚 ${brl(p.taxa_entrega||0)}</div><div class="order-actions">${acoes}<button class="order-action whats" onclick='abrirWhats(${JSON.stringify(p).replaceAll("'","&#39;")},"aceito")'>💬 WhatsApp</button></div></div>`;
}
function tocarSomPedido(){try{const ctx=new (window.AudioContext||window.webkitAudioContext)();const osc=ctx.createOscillator();const gain=ctx.createGain();osc.type='sine';osc.frequency.value=880;gain.gain.value=.12;osc.connect(gain);gain.connect(ctx.destination);osc.start();setTimeout(()=>{osc.frequency.value=660},120);setTimeout(()=>{osc.stop();ctx.close()},360)}catch(e){}}
function toggleSomPedidos(){somPedidosLigado=!somPedidosLigado;localStorage.setItem('somPedidosLigado',somPedidosLigado?'1':'0');const b=document.getElementById('btnSomPedidos');if(b)b.textContent=somPedidosLigado?'🔔 Som ligado':'🔕 Som desligado'}
function renderPedidosGestor(){
  const out=document.getElementById('pedidosBoard'); if(!out) return;
  const busca=(document.getElementById('pedidoBusca')?.value||'').toLowerCase().trim();
  let lista=[...pedidosCache];
  if(busca) lista=lista.filter(p=>[p.id,p.cliente_nome,p.cliente_telefone,enderecoPedido(p),itensTexto(p.itens)].join(' ').toLowerCase().includes(busca));
  const totalNovos=lista.filter(p=>normalizarStatusPedido(p.status)==='em_analise').length;
  out.innerHTML=`<div class="orders-summary"><div><b>${lista.length}</b><span>Pedidos totais</span></div><div><b>${totalNovos}</b><span>Em análise</span></div><div><b>${brl(lista.reduce((s,p)=>s+Number(p.valor_total||0),0))}</b><span>Valor dos pedidos</span></div></div><div class="kanban">${orderStatuses.map(col=>{const pedidos=lista.filter(p=>normalizarStatusPedido(p.status)===col.id);const valor=pedidos.reduce((s,p)=>s+Number(p.valor_total||0),0);return `<section class="kanban-col ${col.cls}"><h3>${col.emoji} ${col.titulo} <em>${pedidos.length}</em></h3><small>${brl(valor)}</small><div class="kanban-list">${pedidos.map(cardPedido).join('')||'<p class="empty-col">Sem pedidos</p>'}</div></section>`}).join('')}</div>`;
  toggleSomPedidos();
}
async function loadPedidos(){
  const out=document.getElementById('pedidosBoard')||document.getElementById('pedidosOut'); if(out) out.innerHTML='Carregando pedidos...';
  try{
    const r=await fetch('/api/admin'); const d=await r.json();
    if(!r.ok||!d.ok) throw new Error(d.error||JSON.stringify(d));
    pedidosCache=d.pedidos||[];
    const novoTotal=pedidosCache.length;
    if(ultimoTotalPedidos && novoTotal>ultimoTotalPedidos && somPedidosLigado) tocarSomPedido();
    ultimoTotalPedidos=novoTotal;
    renderPedidosGestor();
  }catch(e){if(out) out.innerHTML='<div class="err">Erro ao carregar pedidos: '+e.message+'</div>'}
}

async function loadClientes(){
  if(typeof clientesOut!=='undefined') clientesOut.innerHTML='Carregando clientes...';
  try{
    const r=await fetch('/api/clientes');
    const d=await r.json();
    if(!r.ok||!d.ok) throw new Error(d.error||JSON.stringify(d));
    state.clientes=d.clientes||[];
    state.clientesResumo=d.resumo||{};
    renderClientes();
  }catch(e){
    if(typeof clientesOut!=='undefined') clientesOut.innerHTML='<div class="err">Erro ao carregar clientes: '+e.message+'</div>';
  }
}
function dataBR(v){return v?new Date(v).toLocaleString('pt-BR'):''}
function whatsLink(tel){const limpo=String(tel||'').replace(/\D/g,'');return limpo?`https://wa.me/55${limpo.replace(/^55/,'')}`:'#'}
function renderClientes(){
  if(typeof clientesOut==='undefined') return;
  let lista=[...(state.clientes||[])];
  const busca=(clienteBusca?.value||'').toLowerCase().trim();
  const ordem=clienteOrdem?.value||'gasto';
  if(busca){lista=lista.filter(c=>[c.cliente_nome,c.cliente_telefone,c.endereco,c.cidade,c.bairro,c.rua].join(' ').toLowerCase().includes(busca));}
  if(ordem==='gasto') lista.sort((a,b)=>Number(b.total_gasto||0)-Number(a.total_gasto||0));
  if(ordem==='pedidos') lista.sort((a,b)=>Number(b.total_pedidos||0)-Number(a.total_pedidos||0));
  if(ordem==='recente') lista.sort((a,b)=>new Date(b.ultimo_pedido||0)-new Date(a.ultimo_pedido||0));
  if(ordem==='nome') lista.sort((a,b)=>String(a.cliente_nome||'').localeCompare(String(b.cliente_nome||''),'pt-BR'));
  const resumo=state.clientesResumo||{};
  clientesResumo.innerHTML=`<div class="stat-card"><b>${resumo.total_clientes||0}</b><span>Clientes</span></div><div class="stat-card"><b>${resumo.total_pedidos||0}</b><span>Pedidos</span></div><div class="stat-card"><b>${brl(resumo.faturamento_total||0)}</b><span>Total gasto</span></div><div class="stat-card"><b>${brl(resumo.ticket_medio||0)}</b><span>Ticket médio</span></div>`;
  clientesOut.innerHTML=lista.length?`<table class="table clientes-table"><tr><th>Cliente</th><th>WhatsApp</th><th>Pedidos</th><th>Total gasto</th><th>Endereço</th><th>Último pedido</th></tr>${lista.map(c=>`<tr><td><b>${c.cliente_nome||''}</b><br><small>Status último: ${c.ultimo_status||''}</small></td><td>${c.cliente_telefone||''}<br><a href="${whatsLink(c.cliente_telefone)}" target="_blank">Chamar no WhatsApp</a></td><td><b>${c.total_pedidos||0}</b></td><td><b>${brl(c.total_gasto||0)}</b></td><td>${[c.cidade,c.bairro,c.rua].filter(Boolean).join(' • ') || c.endereco || ''}</td><td>${dataBR(c.ultimo_pedido)}</td></tr>`).join('')}</table>`:'<p>Nenhum cliente registrado ainda. Quando fizerem pedidos, eles aparecerão aqui automaticamente.</p>';
}
async function loadTudo(){try{state.categorias=await api('categorias');state.produtos=await api('produtos');state.categorias_complementos=await api('categorias_complementos');state.complementos=await api('complementos');state.produto_complemento_categorias=await api('produto_complemento_categorias');state.cidades_entrega=await api('cidades_entrega');state.bairros_entrega=await api('bairros_entrega');renderAdmin();}catch(e){document.querySelector('.admin-panel').insertAdjacentHTML('afterbegin','<div class="err">Erro: '+e.message+'</div>')}}
function renderAdmin(){
 prod_categoria.innerHTML=state.categorias.map(c=>`<option value="${c.id}">${c.nome}</option>`).join('');
 promo_categoria.innerHTML=prod_categoria.innerHTML;
 comp_categoria.innerHTML=state.categorias_complementos.map(c=>`<option value="${c.id}">${c.nome}</option>`).join('');
 bairro_cidade.innerHTML=state.cidades_entrega.map(c=>`<option value="${c.id}">${c.nome}</option>`).join('');
 renderProdutoComplementosChecks();
 renderPromoComplementosChecks();
 categoriasOut.innerHTML=lista(state.categorias,'categorias',c=>`<b>${c.nome}</b><small>Ordem ${c.ordem||0} • ${c.ativo?'Ativo':'Inativo'}</small>`);
 produtosOut.innerHTML=lista(state.produtos,'produtos',p=>`<b>${p.nome}</b><small>${precoProdutoTexto(p)} • ${state.categorias.find(c=>c.id===p.categoria_id)?.nome||'Sem categoria'} • ${p.promocao_ativa?'⭐ Promoção • ':''}${p.ativo?'Ativo':'Inativo'}</small><p>${p.descricao||''}</p><p class="small"><b>Complementos:</b> ${nomesComplementosProduto(p.id)}</p>`);
 promocoesOut.innerHTML=lista(state.produtos.filter(p=>p.promocao_ativa),'promocoes',p=>`<b>${p.nome}</b><small>${precoProdutoTexto(p)} • ${state.categorias.find(c=>c.id===p.categoria_id)?.nome||'Sem categoria'} • ${p.ativo?'Ativa':'Inativa'}</small><p>${p.descricao||''}</p><p class="small"><b>Complementos:</b> ${nomesComplementosProduto(p.id)}</p>`);
 catcompOut.innerHTML=lista(state.categorias_complementos,'categorias_complementos',c=>`<b>${c.nome}</b><small>Escolha de ${c.min_escolha||0} até ${c.max_escolha||0} • Ordem ${c.ordem||0} • ${c.ativo?'Ativo':'Inativo'}</small>`);
 complementosOut.innerHTML=lista(state.complementos,'complementos',c=>`<b>${c.nome}</b><small>${brl(c.preco)} • ${state.categorias_complementos.find(x=>x.id===c.categoria_complemento_id)?.nome||'Sem categoria'} • Ordem ${c.ordem||0} • ${c.ativo?'Ativo':'Inativo'}</small>`);
 cidadesOut.innerHTML=lista(state.cidades_entrega,'cidades_entrega',c=>`<b>${c.nome}</b><small>Ordem ${c.ordem||0} • ${c.ativo?'Ativa':'Inativa'}</small>`);
 bairrosOut.innerHTML=renderBairrosEntrega();
}
function precoProdutoTexto(p){return p.desconto_ativo&&p.preco_promocional?`${brl(p.preco_promocional)} com desconto (${brl(p.preco)})`:brl(p.preco)}
function nomesComplementosProduto(produto_id){const ids=state.produto_complemento_categorias.filter(v=>v.produto_id===produto_id).map(v=>v.categoria_complemento_id);return ids.length?ids.map(id=>state.categorias_complementos.find(c=>c.id===id)?.nome).filter(Boolean).join(', '):'Todas as categorias'}
function lista(arr,tabela,html){return arr.length?arr.map(x=>`<div class="admin-item"><div>${html(x)}</div><div><button onclick='editar("${tabela}",${JSON.stringify(x).replaceAll("'","&#39;")})'>Editar</button><button class="danger" onclick='excluir("${tabela}","${x.id}")'>Excluir</button></div></div>`).join(''):'<p>Nenhum item cadastrado.</p>'}
function renderBairrosEntrega(){
  if(!state.bairros_entrega.length) return '<p>Nenhum bairro cadastrado.</p>';
  return state.cidades_entrega.map(c=>{
    const bairros=state.bairros_entrega.filter(b=>b.cidade_id===c.id);
    if(!bairros.length) return '';
    return `<div class="delivery-city"><h3>${c.nome}</h3><table class="table"><tr><th>Bairro</th><th>Tempo máximo</th><th>Preço</th><th>Status</th><th>Ações</th></tr>${bairros.map(b=>`<tr><td>${b.nome}</td><td>${b.tempo_maximo_minutos||0} min</td><td>${brl(b.preco||0)}</td><td>${b.ativo?'Ativo':'Inativo'}</td><td><button onclick='editar("bairros_entrega",${JSON.stringify(b).replaceAll("'","&#39;")})'>Editar</button> <button class="danger" onclick='excluir("bairros_entrega","${b.id}")'>Excluir</button></td></tr>`).join('')}</table></div>`;
  }).join('') || '<p>Nenhum bairro cadastrado.</p>';
}
function renderProdutoComplementosChecks(produtoId=''){
 const vinculadas=new Set(state.produto_complemento_categorias.filter(v=>v.produto_id===produtoId).map(v=>v.categoria_complemento_id));
 prod_categorias_complementos.innerHTML=state.categorias_complementos.length?state.categorias_complementos.map(c=>`<label class="check card-check"><input type="checkbox" class="produto-catcomp" value="${c.id}" ${!produtoId||vinculadas.has(c.id)?'checked':''}> ${c.nome}<small>Escolha de ${c.min_escolha||0} até ${c.max_escolha||6}</small></label>`).join(''):'<p class="small">Cadastre as categorias dos complementos primeiro.</p>';
}
function renderPromoComplementosChecks(produtoId=''){
 const vinculadas=new Set(state.produto_complemento_categorias.filter(v=>v.produto_id===produtoId).map(v=>v.categoria_complemento_id));
 promo_categorias_complementos.innerHTML=state.categorias_complementos.length?state.categorias_complementos.map(c=>`<label class="check card-check"><input type="checkbox" class="promo-catcomp" value="${c.id}" ${!produtoId||vinculadas.has(c.id)?'checked':''}> ${c.nome}<small>Escolha de ${c.min_escolha||0} até ${c.max_escolha||6}</small></label>`).join(''):'<p class="small">Cadastre as categorias dos complementos primeiro.</p>';
}
function novo(t){if(t==='categorias'){cat_id.value='';cat_nome.value='';cat_ordem.value=0;cat_ativo.checked=true} if(t==='produtos'){prod_id.value='';prod_nome.value='';prod_descricao.value='';prod_preco.value='';prod_preco_promocional.value='';prod_desconto_percentual.value='';prod_badge.value='';prod_imagem.value='';prod_ordem.value=0;prod_desconto_ativo.checked=false;prod_promocao_ativa.checked=false;prod_ativo.checked=true;renderProdutoComplementosChecks('')} if(t==='promocoes'){promo_id.value='';promo_nome.value='';promo_descricao.value='';promo_preco.value='';promo_preco_promocional.value='';promo_desconto_percentual.value='';promo_badge.value='PROMOÇÃO';promo_imagem.value='';promo_ordem.value=0;promo_ativo.checked=true;renderPromoComplementosChecks('')} if(t==='categorias_complementos'){cc_id.value='';cc_nome.value='';cc_min.value=0;cc_max.value=6;cc_ordem.value=0;cc_ativo.checked=true} if(t==='complementos'){comp_id.value='';comp_nome.value='';comp_preco.value='';comp_ordem.value=0;comp_ativo.checked=true} if(t==='cidades_entrega'){cidade_id.value='';cidade_nome.value='';cidade_ordem.value=0;cidade_ativo.checked=true} if(t==='bairros_entrega'){bairro_id.value='';bairro_nome.value='';bairro_tempo.value=40;bairro_preco.value='0.00';bairro_ordem.value=0;bairro_ativo.checked=true;if(state.cidades_entrega[0]) bairro_cidade.value=state.cidades_entrega[0].id}}
function editar(t,x){if(t==='cidades_entrega'||t==='bairros_entrega')abrirMain('entrega');else if(t==='categorias_complementos')abrirTab('catcomp');else if(t==='promocoes')abrirTab('promocoes');else abrirTab(t); if(t==='categorias'){cat_id.value=x.id;cat_nome.value=x.nome;cat_ordem.value=x.ordem||0;cat_ativo.checked=x.ativo!==false} if(t==='produtos'){prod_id.value=x.id;prod_categoria.value=x.categoria_id||'';prod_nome.value=x.nome;prod_descricao.value=x.descricao||'';prod_preco.value=x.preco||0;prod_preco_promocional.value=x.preco_promocional||'';prod_desconto_percentual.value=x.desconto_percentual||'';prod_desconto_ativo.checked=x.desconto_ativo===true;prod_promocao_ativa.checked=x.promocao_ativa===true;prod_badge.value=x.badge||'';prod_imagem.value=x.imagem_url||'';prod_ordem.value=x.ordem||0;prod_ativo.checked=x.ativo!==false;renderProdutoComplementosChecks(x.id)} if(t==='promocoes'){promo_id.value=x.id;promo_categoria.value=x.categoria_id||'';promo_nome.value=x.nome;promo_descricao.value=x.descricao||'';promo_preco.value=x.preco||0;promo_preco_promocional.value=x.preco_promocional||'';promo_desconto_percentual.value=x.desconto_percentual||'';promo_badge.value=x.badge||'PROMOÇÃO';promo_imagem.value=x.imagem_url||'';promo_ordem.value=x.ordem||0;promo_ativo.checked=x.ativo!==false;renderPromoComplementosChecks(x.id)} if(t==='categorias_complementos'){cc_id.value=x.id;cc_nome.value=x.nome;cc_min.value=x.min_escolha||0;cc_max.value=x.max_escolha||6;cc_ordem.value=x.ordem||0;cc_ativo.checked=x.ativo!==false} if(t==='complementos'){comp_id.value=x.id;comp_categoria.value=x.categoria_complemento_id||'';comp_nome.value=x.nome;comp_preco.value=x.preco||0;comp_ordem.value=x.ordem||0;comp_ativo.checked=x.ativo!==false} if(t==='cidades_entrega'){abrirMain('entrega');cidade_id.value=x.id;cidade_nome.value=x.nome;cidade_ordem.value=x.ordem||0;cidade_ativo.checked=x.ativo!==false} if(t==='bairros_entrega'){abrirMain('entrega');bairro_id.value=x.id;bairro_cidade.value=x.cidade_id||'';bairro_nome.value=x.nome;bairro_tempo.value=x.tempo_maximo_minutos||40;bairro_preco.value=x.preco||0;bairro_ordem.value=x.ordem||0;bairro_ativo.checked=x.ativo!==false}}
async function salvar(e,t){e.preventDefault();try{let body={},id=''; if(t==='categorias'){id=cat_id.value;body={id,nome:cat_nome.value,ordem:cat_ordem.value,ativo:cat_ativo.checked}} if(t==='produtos'){id=prod_id.value;body={id,categoria_id:prod_categoria.value,nome:prod_nome.value,descricao:prod_descricao.value,preco:prod_preco.value,desconto_ativo:prod_desconto_ativo.checked,desconto_percentual:prod_desconto_percentual.value,preco_promocional:prod_preco_promocional.value,badge:prod_badge.value,imagem_url:prod_imagem.value,ordem:prod_ordem.value,ativo:prod_ativo.checked,promocao_ativa:prod_promocao_ativa.checked}} if(t==='promocoes'){id=promo_id.value;body={id,categoria_id:promo_categoria.value,nome:promo_nome.value,descricao:promo_descricao.value,preco:promo_preco.value,desconto_ativo:true,desconto_percentual:promo_desconto_percentual.value,preco_promocional:promo_preco_promocional.value,badge:promo_badge.value||'PROMOÇÃO',imagem_url:promo_imagem.value,ordem:promo_ordem.value,ativo:promo_ativo.checked,promocao_ativa:true}} if(t==='categorias_complementos'){id=cc_id.value;body={id,nome:cc_nome.value,min_escolha:cc_min.value,max_escolha:cc_max.value,ordem:cc_ordem.value,ativo:cc_ativo.checked}} if(t==='complementos'){id=comp_id.value;body={id,categoria_complemento_id:comp_categoria.value,nome:comp_nome.value,preco:comp_preco.value,ordem:comp_ordem.value,ativo:comp_ativo.checked}} if(t==='cidades_entrega'){id=cidade_id.value;body={id,nome:cidade_nome.value,ordem:cidade_ordem.value,ativo:cidade_ativo.checked}} if(t==='bairros_entrega'){id=bairro_id.value;body={id,cidade_id:bairro_cidade.value,nome:bairro_nome.value,tempo_maximo_minutos:bairro_tempo.value,preco:bairro_preco.value,ordem:bairro_ordem.value,ativo:bairro_ativo.checked}}
 const tabelaSalvar=t==='promocoes'?'produtos':t;
 const saved=await api(tabelaSalvar,id?'PUT':'POST',body);
 if(t==='produtos'||t==='promocoes'){
   const produtoId=id || saved?.id;
   const categorias_ids=[...document.querySelectorAll(t==='promocoes'?'.promo-catcomp:checked':'.produto-catcomp:checked')].map(x=>x.value);
   if(produtoId){await api('produto_complemento_categorias_set','POST',{produto_id:produtoId,categorias_ids});}
 }
 await loadTudo(); novo(t); alert('Salvo com sucesso!');}catch(err){alert('Erro: '+err.message)}}
async function excluir(t,id){if(!confirm('Excluir este item?'))return;try{await api(t==='promocoes'?'produtos':t,'DELETE',null,id);await loadTudo()}catch(e){alert('Erro: '+e.message)}}
loadPedidos();loadClientes();loadTudo();
