const produtosPadrao = [
  {id:'11111111-1111-1111-1111-111111111111', nome:'Big Burger', descricao:'Hambúrguer artesanal da casa', preco:23.90},
  {id:'22222222-2222-2222-2222-222222222222', nome:'Combo Duplo', descricao:'2 burgers + fritas + refri 600ml', preco:39.90},
  {id:'33333333-3333-3333-3333-333333333333', nome:'Combo Família', descricao:'4 burgers + 4 fritas + refri 1,5L', preco:84.90}
]
let carrinho=[]
function money(v){return Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function renderProdutos(){
 const el=document.querySelector('#produtos'); if(!el)return
 el.innerHTML=produtosPadrao.map(p=>`<div class="card"><h3>${p.nome}</h3><p class="muted">${p.descricao}</p><div class="price">${money(p.preco)}</div><button onclick="add('${p.id}')">Adicionar</button></div>`).join('')
}
function add(id){const p=produtosPadrao.find(x=>x.id===id);const item=carrinho.find(x=>x.produto_id===id); if(item)item.quantidade++;else carrinho.push({produto_id:id,quantidade:1,nome:p.nome,preco:p.preco}); renderCarrinho()}
function renderCarrinho(){const el=document.querySelector('#carrinho'); if(!el)return; let total=0; el.innerHTML=carrinho.map(i=>{total+=i.preco*i.quantidade; return `<div class="cart-item"><span>${i.quantidade}x ${i.nome}</span><b>${money(i.preco*i.quantidade)}</b></div>`}).join('')+`<h3>Total: ${money(total)}</h3>`}
async function finalizar(){
 const body={cliente_nome:nome.value,cliente_telefone:telefone.value,endereco_entrega:endereco.value,observacao:obs.value,itens:carrinho.map(({produto_id,quantidade})=>({produto_id,quantidade}))}
 if(!body.cliente_nome||!body.cliente_telefone||!body.endereco_entrega||!body.itens.length)return alert('Preencha seus dados e adicione um produto')
 const r=await fetch('/api/create-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const j=await r.json(); if(j.error)return alert(j.error)
 const p=await fetch('/api/create-pix',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pedido_id:j.pedido.id})}); const pix=await p.json(); if(pix.error)return alert(pix.error)
 resultado.innerHTML=`<h2>Pix gerado ✅</h2><p>Copie e pague. Quando aprovar, a entrega será liberada automaticamente no Rota Express.</p>${pix.qr_code_base64?`<img class="qr" src="data:image/png;base64,${pix.qr_code_base64}">`:''}<textarea rows="5" readonly>${pix.qr_code||''}</textarea><p class="muted">Pedido #${j.pedido.id}</p>`
}
window.addEventListener('load',()=>{renderProdutos();renderCarrinho()})
