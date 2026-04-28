import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ShoppingCart, Plus, Minus, Trash2, Lock, Bell, Printer, Store, Eye, CheckCircle, Bike, Clock, X } from 'lucide-react';
import './style.css';

const ADMIN_PASSWORD = 'P@loma3548';

const initialProducts = [
  { id: 1, category: '🔥🍔 Destaques da Casa', name: '🍔🔥 Big Explosão ⭐', desc: 'Hambúrguer artesanal com cheddar, bacon, salada e molho especial.', price: 18.9, active: true, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop' },
  { id: 2, category: '🔥🍔 Destaques da Casa', name: '🍔 Big Supremo', desc: 'Pão macio, burger suculento, queijo, alface e molho da casa.', price: 19.9, active: true, image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=600&auto=format&fit=crop' },
  { id: 3, category: '🍔🔥 Hambúrgueres', name: 'Big Insano', desc: 'Burger duplo com muito queijo e sabor Big Burger.', price: 24.9, active: true, image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?q=80&w=600&auto=format&fit=crop' },
  { id: 4, category: '🍟🔥 Combos', name: 'Combo Big Burger', desc: 'Hambúrguer + fritas + refrigerante.', price: 29.9, active: true, image: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?q=80&w=600&auto=format&fit=crop' },
  { id: 5, category: '🍟🔥 Porções', name: 'Batata Frita', desc: 'Porção crocante de batata frita.', price: 14.9, active: true, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?q=80&w=600&auto=format&fit=crop' },
  { id: 6, category: '🧒🍔 Kids', name: 'Big Kids', desc: 'Mini hambúrguer + fritas + bebida pequena.', price: 19.9, active: true, image: 'https://images.unsplash.com/photo-1585238342024-78d387f4a707?q=80&w=600&auto=format&fit=crop' },
  { id: 7, category: '🥤❄️ Refrigerantes', name: 'Refrigerante Lata', desc: 'Coca, Guaraná ou Fanta.', price: 6, active: true, image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=600&auto=format&fit=crop' },
  { id: 8, category: '🍺❄️ Cervejas', name: 'Cerveja Long Neck', desc: 'Consulte disponibilidade.', price: 9.9, active: true, image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?q=80&w=600&auto=format&fit=crop' },
];
const categories = ['🔥🍔 Destaques da Casa','💥🔥 Promoção do Dia','🍔🔥 Hambúrgueres','🍟🔥 Combos','🍟🔥 Porções','🧒🍔 Kids','🥤❄️ Refrigerantes','🍺❄️ Cervejas'];
const money = v => v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const load = (k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const save = (k,v)=>localStorage.setItem(k,JSON.stringify(v));

function App(){
 const [view,setView]=useState(location.hash==='#admin'?'admin':'cliente');
 const [products,setProducts]=useState(()=>load('bb_products',initialProducts));
 const [orders,setOrders]=useState(()=>load('bb_orders',[]));
 const [open,setOpen]=useState(()=>load('bb_open',true));
 const [autoAccept,setAutoAccept]=useState(()=>load('bb_auto_accept',false));
 useEffect(()=>save('bb_products',products),[products]); useEffect(()=>save('bb_orders',orders),[orders]); useEffect(()=>save('bb_open',open),[open]); useEffect(()=>save('bb_auto_accept',autoAccept),[autoAccept]);
 return <><header><img src="/logo.png"/><div><h1>Big Burger Delivery</h1><p>Seu pedido online, rápido e fácil 🍔</p></div><button onClick={()=>setView(view==='cliente'?'admin':'cliente')}>{view==='cliente'?'Painel Admin':'Ver Cardápio'}</button></header>{view==='cliente'?<Cliente products={products} setOrders={setOrders} open={open} autoAccept={autoAccept}/>:<Admin products={products} setProducts={setProducts} orders={orders} setOrders={setOrders} open={open} setOpen={setOpen} autoAccept={autoAccept} setAutoAccept={setAutoAccept}/>}</>
}
function Cliente({products,setOrders,open,autoAccept}){
 const [cat,setCat]=useState(categories[0]); const [cart,setCart]=useState([]); const [checkout,setCheckout]=useState(false); const [last,setLast]=useState(null);
 const list=products.filter(p=>p.active&&p.category===cat); const total=cart.reduce((s,i)=>s+i.price*i.qty,0);
 const add=p=>setCart(c=>{let f=c.find(i=>i.id===p.id); return f?c.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i):[...c,{...p,qty:1}]});
 const qty=(id,n)=>setCart(c=>c.map(i=>i.id===id?{...i,qty:Math.max(1,i.qty+n)}:i)); const rem=id=>setCart(c=>c.filter(i=>i.id!==id));
 const finish=e=>{e.preventDefault(); const fd=new FormData(e.currentTarget); const order={id:'BB-'+Date.now().toString().slice(-6),created:new Date().toLocaleString('pt-BR'),status:autoAccept?'Em preparo':'Em análise',items:cart, total, customer:Object.fromEntries(fd.entries())}; setOrders(o=>[order,...o]); setCart([]); setCheckout(false); setLast(order)};
 return <main className="grid"><section className="menu"><div className={open?'status ok':'status'}>{open?'🟢 Loja aberta':'🔴 Loja fechada'}</div><div className="cats">{categories.map(c=><button className={cat===c?'sel':''} onClick={()=>setCat(c)}>{c}</button>)}</div><div className="products">{list.map(p=><div className="card"><img src={p.image}/><div><h3>{p.name}</h3><p>{p.desc}</p><b>{money(p.price)}</b></div><button disabled={!open} onClick={()=>add(p)}><Plus/> Adicionar</button></div>)}</div></section><aside className="cart"><h2><ShoppingCart/> Carrinho</h2>{cart.length===0?<p>Seu carrinho está vazio.</p>:cart.map(i=><div className="cartitem"><span>{i.name}<br/><b>{money(i.price*i.qty)}</b></span><button onClick={()=>qty(i.id,-1)}><Minus size={16}/></button><b>{i.qty}</b><button onClick={()=>qty(i.id,1)}><Plus size={16}/></button><button onClick={()=>rem(i.id)}><Trash2 size={16}/></button></div>)}<h3>Total: {money(total)}</h3>{cart.length>0&&<button className="primary" onClick={()=>setCheckout(true)}>Finalizar pedido</button>}{last&&<div className="success"><CheckCircle/> Pedido {last.id} enviado! Status: {last.status}</div>}</aside>{checkout&&<div className="modal"><form onSubmit={finish}><button type="button" className="close" onClick={()=>setCheckout(false)}><X/></button><h2>Finalizar pedido</h2><input required name="nome" placeholder="Seu nome"/><input required name="whatsapp" placeholder="WhatsApp"/><input name="rua" placeholder="Rua e número"/><input name="bairro" placeholder="Bairro"/><select name="tipo"><option>Delivery</option><option>Retirada</option></select><select name="pagamento"><option>Pix</option><option>Dinheiro</option><option>Cartão na entrega</option></select><textarea name="obs" placeholder="Observação"/><button className="primary">Enviar pedido</button></form></div>}</main>
}
function Admin({products,setProducts,orders,setOrders,open,setOpen,autoAccept,setAutoAccept}){
 const [auth,setAuth]=useState(false); const [tab,setTab]=useState('pedidos'); const [pass,setPass]=useState('');
 if(!auth) return <main className="login"><form onSubmit={e=>{e.preventDefault(); if(pass===ADMIN_PASSWORD)setAuth(true); else alert('Senha incorreta')}}><img src="/logo.png"/><h2><Lock/> Admin Big Burger</h2><input type="password" placeholder="Senha do admin" onChange={e=>setPass(e.target.value)}/><button className="primary">Entrar</button></form></main>;
 const statuses=['Em análise','Em preparo','Pronto','Em entrega','Finalizado'];
 const nextStep={
  'Em análise':{status:'Em preparo',label:'✅ Aceitar pedido'},
  'Em preparo':{status:'Pronto',label:'🍔 Marcar como pronto'},
  'Pronto':{status:'Em entrega',label:'🛵 Saiu pra entrega'},
  'Em entrega':{status:'Finalizado',label:'✅ Finalizar pedido'}
 };
 const update=(id,status)=>setOrders(o=>o.map(x=>x.id===id?{...x,status}:x));
 const del=id=>confirm('Apagar pedido?')&&setOrders(o=>o.filter(x=>x.id!==id));
 return <main className="admin"><nav><button onClick={()=>setTab('pedidos')}>Pedidos</button><button onClick={()=>setTab('produtos')}>Produtos</button><button onClick={()=>setTab('relatorio')}>Relatório</button><button onClick={()=>setOpen(!open)}><Store/> {open?'Fechar loja':'Abrir loja'}</button><button className={autoAccept?'auto on':'auto'} onClick={()=>setAutoAccept(!autoAccept)}>{autoAccept?'⚡ Aceite automático ligado':'⚪ Aceite automático desligado'}</button></nav>{tab==='pedidos'&&<div className="columns">{statuses.map(st=><section><h2>{st} <small>{orders.filter(o=>o.status===st).length}</small></h2>{orders.filter(o=>o.status===st).map(o=><div className="order"><h3>{o.id} - {money(o.total)}</h3><p><b>{o.customer.nome}</b> - {o.customer.whatsapp}<br/>{o.customer.rua} {o.customer.bairro}<br/>{o.customer.pagamento} • {o.created}</p>{o.items.map(i=><p>{i.qty}x {i.name}</p>)}{nextStep[o.status]?<button className="statusBtn" onClick={()=>update(o.id,nextStep[o.status].status)}>{nextStep[o.status].label}</button>:<div className="done">✅ Pedido finalizado</div>}<button onClick={()=>window.print()}><Printer/> Imprimir</button><button onClick={()=>del(o.id)}><Trash2/> Apagar</button></div>)}</section>)}</div>}{tab==='produtos'&&<Products products={products} setProducts={setProducts}/>} {tab==='relatorio'&&<Report orders={orders}/>}</main>
}
function Products({products,setProducts}){
 const [p,setP]=useState({category:categories[0],name:'',desc:'',price:'',image:'',active:true});
 const add=e=>{e.preventDefault(); setProducts(v=>[{...p,id:Date.now(),price:Number(String(p.price).replace(',','.')),image:p.image||'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop'},...v]); setP({category:categories[0],name:'',desc:'',price:'',image:'',active:true})};
 return <section><h2>Produtos</h2><form className="productForm" onSubmit={add}><select value={p.category} onChange={e=>setP({...p,category:e.target.value})}>{categories.map(c=><option>{c}</option>)}</select><input required placeholder="Nome" value={p.name} onChange={e=>setP({...p,name:e.target.value})}/><input placeholder="Descrição" value={p.desc} onChange={e=>setP({...p,desc:e.target.value})}/><input required placeholder="Preço" value={p.price} onChange={e=>setP({...p,price:e.target.value})}/><input placeholder="URL da imagem" value={p.image} onChange={e=>setP({...p,image:e.target.value})}/><button className="primary">Cadastrar</button></form><div className="products">{products.map(x=><div className="card"><img src={x.image}/><div><h3>{x.name}</h3><p>{x.category}</p><b>{money(x.price)}</b></div><button onClick={()=>setProducts(v=>v.map(i=>i.id===x.id?{...i,active:!i.active}:i))}>{x.active?'Ativo':'Inativo'}</button><button onClick={()=>setProducts(v=>v.filter(i=>i.id!==x.id))}><Trash2/></button></div>)}</div></section>
}
function Report({orders}){const done=orders.filter(o=>o.status==='Finalizado'); const total=done.reduce((s,o)=>s+o.total,0); return <section className="report"><h2>Relatório</h2><div className="dash"><div><Eye/><b>{orders.length}</b><span>Pedidos</span></div><div><CheckCircle/><b>{done.length}</b><span>Finalizados</span></div><div><Bike/><b>{money(total)}</b><span>Faturamento finalizado</span></div><div><Clock/><b>{money(orders.reduce((s,o)=>s+o.total,0))}</b><span>Total geral</span></div></div></section>}
createRoot(document.getElementById('root')).render(<App/>);
