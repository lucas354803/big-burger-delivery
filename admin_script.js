
const state={categorias:[],produtos:[],categorias_complementos:[],complementos:[],produto_complemento_categorias:[],cidades_entrega:[],bairros_entrega:[],clientes:[],clientesResumo:null,financeiro:null,loja_config:null,horarios_funcionamento:[],clientesPagina:1,clientesPorPagina:20,clienteEditando:null,motoboys:[],motoboyEntregas:[],banner_inicial:null,pedidosHistorico:[],historicoPagina:1,historicoPorPagina:15,historicoBuscaAtual:''};
const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function removerEmojis(txt){return String(txt||'').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,'').replace(/[\uFE0E\uFE0F]/g,'').replace(/\s{2,}/g,' ').trim();}
function textoPrint(txt){return removerEmojis(txt).normalize('NFKC');}
function abrirMain(id){
  document.querySelectorAll('.main-tab,.main-content').forEach(x=>x.classList.remove('active'));
  document.querySelector(`.main-tab[onclick="abrirMain('${id}')"]`).classList.add('active');
  document.getElementById('main-'+id).classList.add('active');

  // Carrega o Histórico somente quando a aba for aberta.
  // Isso evita que o auto-refresh dos pedidos fique piscando/recarregando a tela do histórico.
  if(id==='historico') renderHistoricoPedidos();
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
let pedidosAutoRefreshTimer=null;
let ultimoIdsEmPreparoImpresso=new Set(JSON.parse(localStorage.getItem('pedidosImpressosAuto')||'[]'));
let loadPedidosEmAndamento=false;
const orderStatuses=[
  {id:'em_analise',titulo:'Em análise',emoji:'🔴',cls:'analise'},
  {id:'em_preparo',titulo:'Em preparo',emoji:'🟡',cls:'preparo'},
  {id:'pronto',titulo:'Pronto',emoji:'🔵',cls:'pronto'},
  {id:'em_entrega',titulo:'Em entrega',emoji:'🟢',cls:'entrega'},
  {id:'finalizado',titulo:'Finalizados',emoji:'⚫',cls:'finalizado'}
];

const impressoraPadrao={papel:80,larguraUtil:72,fonte:13,titulo:22,margem:2,espacoItens:5,logoTamanho:42,qrTamanho:34,nome:'BIG BURGER',subtitulo:'COMANDA DE PEDIDO',negrito:true,auto:true,logo:true,mostrarBordas:false,fecharJanela:true,direto:true,qzAtivo:false,qzImpressora:''};
function getConfigImpressora(){
  try{return {...impressoraPadrao,...JSON.parse(localStorage.getItem('configImpressoraBigBurger')||'{}')}}catch(e){return {...impressoraPadrao}}
}
function setConfigImpressora(cfg){localStorage.setItem('configImpressoraBigBurger',JSON.stringify({...getConfigImpressora(),...cfg}));}
function carregarConfigImpressora(){
  const c=getConfigImpressora();
  if(typeof imp_papel!=='undefined') imp_papel.value=String(c.papel||80);
  if(typeof imp_fonte!=='undefined') imp_fonte.value=c.fonte||13;
  if(typeof imp_titulo!=='undefined') imp_titulo.value=c.titulo||22;
  if(typeof imp_margem!=='undefined') imp_margem.value=c.margem??2;
  if(typeof imp_largura_util!=='undefined') imp_largura_util.value=c.larguraUtil||72;
  if(typeof imp_espaco_itens!=='undefined') imp_espaco_itens.value=c.espacoItens||5;
  if(typeof imp_logo_tamanho!=='undefined') imp_logo_tamanho.value=c.logoTamanho||42;
  if(typeof imp_qr_tamanho!=='undefined') imp_qr_tamanho.value=c.qrTamanho||34;
  if(typeof imp_bordas!=='undefined') imp_bordas.checked=c.mostrarBordas===true;
  if(typeof imp_nome!=='undefined') imp_nome.value=c.nome||'BIG BURGER';
  if(typeof imp_subtitulo!=='undefined') imp_subtitulo.value=c.subtitulo||'COMANDA DE PEDIDO';
  if(typeof imp_negrito!=='undefined') imp_negrito.checked=c.negrito!==false;
  if(typeof imp_auto!=='undefined') imp_auto.checked=c.auto!==false;
  if(typeof imp_logo!=='undefined') imp_logo.checked=c.logo!==false;
  if(typeof imp_fechar!=='undefined') imp_fechar.checked=c.fecharJanela!==false;
  if(typeof imp_direto!=='undefined') imp_direto.checked=c.direto!==false;
  if(typeof imp_qz_ativo!=='undefined') imp_qz_ativo.checked=c.qzAtivo===true;
  if(typeof imp_qz_nome!=='undefined') imp_qz_nome.value=c.qzImpressora||'';
  renderPreviewComanda();
}
function lerConfigImpressoraTela(){return {papel:Number(imp_papel?.value||80),larguraUtil:Number(imp_largura_util?.value||(Number(imp_papel?.value||80)===58?48:72)),fonte:Number(imp_fonte?.value||13),titulo:Number(imp_titulo?.value||22),margem:Number(imp_margem?.value||2),espacoItens:Number(imp_espaco_itens?.value||5),logoTamanho:Number(imp_logo_tamanho?.value||42),qrTamanho:Number(imp_qr_tamanho?.value||34),nome:(imp_nome?.value||'BIG BURGER').trim(),subtitulo:(imp_subtitulo?.value||'COMANDA DE PEDIDO').trim(),negrito:!!imp_negrito?.checked,auto:!!imp_auto?.checked,logo:!!imp_logo?.checked,mostrarBordas:!!imp_bordas?.checked,fecharJanela:!!imp_fechar?.checked,direto:!!imp_direto?.checked,qzAtivo:!!imp_qz_ativo?.checked,qzImpressora:(imp_qz_nome?.value||'').trim()};}
function salvarConfigImpressora(e){
  if(e) e.preventDefault();
  setConfigImpressora(lerConfigImpressoraTela());
  renderPreviewComanda();
  const out=document.getElementById('impressoraStatus'); if(out) out.innerHTML='✅ Configuração da impressora salva com sucesso!';
}
function renderPreviewComanda(){
  const box=document.getElementById('previewComanda'); if(!box) return;
  const c=(typeof imp_papel!=='undefined')?lerConfigImpressoraTela():getConfigImpressora();
  box.style.maxWidth=(c.larguraUtil||72)+'mm';
  box.style.fontSize=(c.fonte||13)+'px';
  box.style.fontWeight=c.negrito!==false?'800':'400';
  box.innerHTML=`${c.logo!==false?'<div class="preview-logo-wrap"><img src="/print-logo.png" class="preview-logo" alt="Big Burger"></div>':''}<h3 style="font-size:${c.titulo||22}px">${escapeHtml(c.nome||'BIG BURGER')}</h3><p>${escapeHtml(c.subtitulo||'COMANDA DE PEDIDO')}</p><hr><div><b>Pedido #01</b></div><div>Cliente: Lucas</div><div>1x Big Burger</div><div>1x Fritas</div><div>Pagamento: dinheiro</div><div>Troco: para R$ 50,00 / devolver R$ 10,10</div><hr><div><b>TOTAL: R$ 39,90</b></div>`;
}
function testarImpressora(){
  salvarConfigImpressora();
  imprimirPedido({id:'TESTE',numero_pedido:'01',cliente_nome:'Cliente Teste',cliente_telefone:'(48) 99999-9999',itens:[{qtd:1,nome:'Big Burger',preco:29.9},{qtd:1,nome:'Fritas',preco:10}],cidade:'Criciúma',bairro:'Centro',rua:'Rua Teste, 123',forma_pagamento:'pix',taxa_entrega:5,valor_total:44.9,observacao:'Teste de impressão da comanda.'});
}
function normalizarStatusPedido(status){
  if(['pedido_recebido','pago','aprovado','pendente'].includes(status)) return 'em_analise';
  if(['aguardando_pagamento','aguardando_pix'].includes(status)) return 'aguardando_pagamento';
  if(['preparo'].includes(status)) return 'em_preparo';
  if(['entregue'].includes(status)) return 'finalizado';
  if(['nao_realizado','não_realizado','recusado'].includes(status)) return 'nao_realizado';
  return status || 'em_analise';
}
function pedidoArquivado(p){return p?.arquivado_relatorio===true || p?.arquivado_relatorio==='true' || p?.arquivado===true || p?.arquivado==='true';}
function pedidosVisiveisPainel(){return pedidosCache.filter(p=>!pedidoArquivado(p) && !['aguardando_pagamento','aguardando_pix','nao_realizado','cancelado'].includes(String(p.status||'')));}
function pedidosHistoricoRelatorio(){return pedidosCache.filter(p=>pedidoArquivado(p) && normalizarStatusPedido(p.status)==='finalizado');}
function numeroPedido(p){ if(p && p.numero_pedido) return String(p.numero_pedido).padStart(2, '0'); return String(p?.id||'').split('-')[0].toUpperCase(); }
function shortId(id){return String(id||'').split('-')[0].toUpperCase()}
function normalizarListaComplementos(valor){
  if(!valor) return [];
  if(typeof valor==='string'){
    try{ valor=JSON.parse(valor); }catch(e){ return valor.trim() ? [valor.trim()] : []; }
  }
  if(!Array.isArray(valor)) valor=[valor];
  return valor.map(a=>{
    if(!a) return '';
    if(typeof a==='string') return a;
    const nome=a.nome||a.name||a.titulo||a.title||a.descricao||a.label||'Adicional';
    const preco=Number(a.preco||a.price||a.valor||0);
    return `${nome}${preco>0?` (${brl(preco)})`:''}`;
  }).filter(Boolean);
}
function observacaoItem(i){
  return i?.observacao || i?.observacao_item || i?.obs || i?.note || i?.notes || '';
}
function normalizarItensPedido(itens){
  try{ if(typeof itens==='string') itens=JSON.parse(itens); }catch(e){}
  if(!Array.isArray(itens)) return [];
  return itens.map(i=>{
    const qtd=i.qtd||i.quantidade||i.quantity||1;
    const nome=i.nome||i.name||i.produto_nome||i.produto||'Produto';
    const preco=Number(i.preco||i.valor||i.total||i.price||0);
    const adicionais=normalizarListaComplementos(i.addons||i.adicionais||i.complementos||i.extras||i.opcionais||i.opcoes||i.options);
    const obs=observacaoItem(i);
    return {qtd,nome,preco,adicionais,obs};
  });
}
function itensTexto(itens){
  const lista=normalizarItensPedido(itens);
  if(!lista.length) return 'Itens não informados';
  return lista.map(i=>{
    let linha=`${i.qtd}x ${i.nome}${i.preco>0?` - ${brl(i.preco)}`:''}`;
    if(i.adicionais.length) linha += '\n' + i.adicionais.map(a=>`  + ${a}`).join('\n');
    if(i.obs) linha += `\n  Obs: ${i.obs}`;
    return linha;
  }).join('\n\n');
}
function itensHtmlComanda(itens){
  const lista=normalizarItensPedido(itens);
  if(!lista.length) return '<div class="item-box"><b>Itens não informados</b></div>';
  return lista.map(i=>{
    const adds=i.adicionais.map(a=>`<div class="item-add">+ ${escapeHtml(textoPrint(a))}</div>`).join('');
    const obs=i.obs?`<div class="item-obs">Obs: ${escapeHtml(textoPrint(i.obs))}</div>`:'';
    const preco=i.preco>0?` <span class="item-price">${brl(i.preco)}</span>`:'';
    return `<div class="item-box"><div class="item-name">${escapeHtml(String(i.qtd))}x ${escapeHtml(textoPrint(i.nome))}${preco}</div>${adds}${obs}</div>`;
  }).join('');
}
function enderecoPedido(p){
  const numero = p.numero || p.numero_casa || p.numero_endereco || '';
  const ruaNumero = p.rua ? (numero ? `${p.rua}, Nº ${numero}` : p.rua) : '';
  return [p.cidade,p.bairro,ruaNumero].filter(Boolean).join(' • ') || p.endereco || ''
}
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



// ===== IMPRESSÃO AUTOMÁTICA REAL COM QZ TRAY =====
// Para funcionar 100% sem abrir a tela de impressão, instale e deixe o QZ Tray aberto no Windows.
let qzConectando = null;
function qzDisponivel(){ return typeof window.qz !== 'undefined' && qz.websocket; }
function configurarSegurancaQZ(){
  if(!qzDisponivel() || window.__bigBurgerQzSecurityOk) return;
  try{
    // Modo sem certificado próprio: o QZ vai pedir permissão na primeira vez.
    // Marque "Remember this decision / Permitir sempre" no QZ Tray.
    qz.security.setCertificatePromise((resolve)=>resolve(null));
    qz.security.setSignaturePromise(()=> (resolve)=>resolve(null));
    window.__bigBurgerQzSecurityOk=true;
  }catch(e){ console.warn('QZ security config:', e); }
}
async function conectarQZ(){
  if(!qzDisponivel()) throw new Error('Biblioteca QZ não carregou. Verifique sua internet e se o script qz-tray.js carregou.');
  configurarSegurancaQZ();
  if(qz.websocket.isActive()) return true;
  if(!qzConectando){
    const conexao = qz.websocket.connect({retries:1, delay:500});
    const limite = new Promise((_, reject)=>setTimeout(()=>reject(new Error('QZ Tray não respondeu. Abra o QZ Tray perto do relógio do Windows e tente de novo.')), 5000));
    qzConectando = Promise.race([conexao, limite]).finally(()=>{qzConectando=null;});
  }
  await qzConectando;
  return true;
}
function montarHtmlComandaQZ(p){
  const cfg=getConfigImpressora();
  const papel=Number(cfg.papel||80);
  const larguraUtil=Number(cfg.larguraUtil||(papel===58?48:72));
  const fonte=Number(cfg.fonte||13);
  const titulo=Number(cfg.titulo||22);
  const margem=Number(cfg.margem??2);
  const espacoItens=Number(cfg.espacoItens||5);
  const logoTamanho=Number(cfg.logoTamanho||(papel===58?34:42));
  const qrTamanho=Number(cfg.qrTamanho||(papel===58?30:34));
  const bordaItem=cfg.mostrarBordas===true?'1px solid #000':'0';
  const peso=cfg.negrito!==false?'800':'500';
  const data=new Date().toLocaleString('pt-BR');
  const logoUrl=location.origin + '/print-logo.png';
  const qrUrl='https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=1&data=' + encodeURIComponent(location.origin+'/motoboy?pedido='+p.id);
  const itens=itensHtmlComanda(p.itens);
  const obs=p.observacao ? `<div class="sec obs"><b>OBSERVAÇÃO</b><br>${escapeHtml(textoPrint(p.observacao))}</div>` : '';
  const largura=papel===58 ? 210 : 300;
  const logoW=papel===58 ? 88 : 120;
  const qrW=papel===58 ? 96 : 118;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .ticket{width:${largura}px;margin:0 auto;padding:${margem}px;font-size:${fonte}px;font-weight:${peso};line-height:1.32;color:#000}
    .center{text-align:center}.logo{width:${logoW}px;max-height:92px;object-fit:contain;margin:0 auto 4px;display:block}
    h1{font-size:${titulo}px;line-height:1;margin:2px 0 2px;font-weight:900;letter-spacing:.4px}.sub{font-size:${Math.max(11,fonte-1)}px;margin:0 0 6px;font-weight:800}.dash{border-top:1px dashed #000;margin:7px 0}.row{display:flex;justify-content:space-between;gap:8px;margin:3px 0}.label{font-weight:900}.pedido{font-size:${Math.max(18,fonte+6)}px;font-weight:900}.item-box{border:1px solid #000;border-radius:6px;padding:6px 7px;margin:6px 0;font-size:${Math.max(13,fonte+1)}px;font-weight:900;page-break-inside:avoid}.item-name{font-weight:900}.item-price{float:right}.item-add{padding-left:10px;margin-top:2px;font-weight:800}.item-obs{padding-left:10px;margin-top:3px;font-weight:900}.endereco{font-size:${Math.max(12,fonte)}px;font-weight:800}.total{font-size:${Math.max(20,fonte+8)}px;font-weight:900;text-align:right;margin-top:6px}.obs{white-space:pre-wrap}.thanks{font-weight:900;margin-top:5px}.qr{width:${qrW}px;height:${qrW}px;margin:3px auto;display:block}.small{font-size:10px}.cut{height:16px}
  </style></head><body><div class="ticket">
    <div class="center">${cfg.logo!==false?`<img src="${logoUrl}" class="logo">`:''}<h1>${escapeHtml(cfg.nome||'BIG BURGER')}</h1><div class="sub">${escapeHtml(cfg.subtitulo||'COMANDA DE PEDIDO')}<br>${data}</div></div>
    <div class="dash"></div>
    <div class="row pedido"><span>Pedido</span><span>#${numeroPedido(p)}</span></div>
    <div class="row"><span class="label">Cliente</span><span>${escapeHtml(textoPrint(p.cliente_nome||''))}</span></div>
    <div class="row"><span class="label">Telefone</span><span>${escapeHtml(p.cliente_telefone||'')}</span></div>
    <div class="dash"></div>
    <div class="label">ITENS</div>${itens}
    <div class="dash"></div>
    <div class="label">ENDEREÇO</div><div class="endereco">${escapeHtml(textoPrint(enderecoPedido(p)||'Retirada/sem endereco'))}</div>
    <div class="dash"></div>
    <div class="row"><span class="label">Pagamento</span><span>${escapeHtml(p.forma_pagamento||'pix')}</span></div>
    <div class="row"><span class="label">Taxa entrega</span><span>${brl(p.taxa_entrega||0)}</span></div>
    ${String(p.forma_pagamento||'').toLowerCase()==='dinheiro'?`<div class="row"><span class="label">Troco</span><span>${(p.precisa_troco===true||p.precisa_troco==='true'||Number(p.troco_para||0)>0)?('para '+brl(p.troco_para||0)+' / devolver '+brl(p.troco_valor||0)):'não precisa'}</span></div>`:''}
    <div class="total">TOTAL: ${brl(p.valor_total||0)}</div>
    ${obs}
    <div class="dash"></div>
    <div class="center"><div class="label">QR CODE DO MOTOBOY</div><img class="qr" src="${qrUrl}"><div class="small">Escanear para registrar pedido</div><div class="thanks">Obrigado pela preferencia</div></div><div class="cut"></div>
  </div></body></html>`;
}
function textoComandaQZ(p){
  const cfg=getConfigImpressora();
  const data=new Date().toLocaleString('pt-BR');
  const itens=itensTexto(p.itens).split('\n').map(textoPrint).join('\n');
  const endereco=textoPrint(enderecoPedido(p)||'Retirada/sem endereco');
  const qr=location.origin+'/motoboy?pedido='+p.id;
  const negritoOn='\x1B\x45\x01', negritoOff='\x1B\x45\x00';
  const centro='\x1B\x61\x01', esquerda='\x1B\x61\x00';
  const maior='\x1D\x21\x11', normal='\x1D\x21\x00';
  const corte='\n\n\n\x1D\x56\x00';
  return '\x1B\x40' + centro + negritoOn + maior + (cfg.nome||'BIG BURGER') + normal + '\n' +
    (cfg.subtitulo||'COMANDA DE PEDIDO') + '\n' + data + '\n' +
    '------------------------------\n' + esquerda +
    negritoOn + 'PEDIDO #' + numeroPedido(p) + negritoOff + '\n\n' +
    'Cliente: ' + textoPrint(p.cliente_nome||'') + '\n' +
    'Telefone: ' + textoPrint(p.cliente_telefone||'') + '\n' +
    '------------------------------\n' +
    negritoOn + 'ITENS\n' + negritoOff + itens + '\n' +
    '------------------------------\n' +
    negritoOn + 'ENDERECO\n' + negritoOff + endereco + '\n' +
    '------------------------------\n' +
    'Pagamento: ' + (p.forma_pagamento||'pix') + '\n' +
    'Taxa entrega: ' + brl(p.taxa_entrega||0) + '\n' +
    (String(p.forma_pagamento||'').toLowerCase()==='dinheiro' ? ('Troco: ' + ((p.precisa_troco===true||p.precisa_troco==='true'||Number(p.troco_para||0)>0)?('para '+brl(p.troco_para||0)+' / devolver '+brl(p.troco_valor||0)):'nao precisa') + '\n') : '') +
    negritoOn + 'TOTAL: ' + brl(p.valor_total||0) + negritoOff + '\n' +
    (p.observacao ? '\nOBS: ' + textoPrint(p.observacao) + '\n' : '') +
    '------------------------------\n' +
    'QR Motoboy:\n' + qr + '\n' +
    corte;
}
async function carregarImpressorasQZ(){
  const out=document.getElementById('impressoraStatus');
  const select=document.getElementById('imp_qz_nome');
  try{
    if(out) out.innerHTML='🔌 Conectando no QZ Tray...';
    await conectarQZ();
    const printers=await qz.printers.find();
    if(select){
      const atual=getConfigImpressora().qzImpressora||'';
      select.innerHTML='<option value="">Impressora padrão do Windows</option>' + printers.map(n=>`<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
      select.value=atual;
    }
    if(out) out.innerHTML='✅ QZ conectado. Impressoras carregadas.';
  }catch(e){
    if(out) out.innerHTML='<span class="err-inline">Erro no QZ: '+escapeHtml(e.message||String(e))+'</span>';
  }
}
async function testarConexaoQZ(){
  const out=document.getElementById('impressoraStatus');
  try{
    if(out) out.innerHTML='🔌 Testando QZ Tray...';
    await conectarQZ();
    if(out) out.innerHTML='✅ QZ Tray funcionando. Agora clique em "Carregar impressoras" e escolha sua térmica.';
  }catch(e){
    if(out) out.innerHTML='<span class="err-inline">QZ não conectado. Instale/abra o QZ Tray. Erro: '+escapeHtml(e.message||String(e))+'</span>';
  }
}
async function imprimirPedidoQZ(p){
  if(!p){alert('Pedido não encontrado para imprimir.');return;}
  await conectarQZ();
  const cfg=getConfigImpressora();
  const printer = cfg.qzImpressora ? await qz.printers.find(cfg.qzImpressora) : await qz.printers.getDefault();
  const config = qz.configs.create(printer, {copies:1, units:'mm', margins:{top:0,right:0,bottom:0,left:0}, scaleContent:true, rasterize:true});
  const html = montarHtmlComandaQZ(p);
  try{
    await qz.print(config, [{type:'html', format:'plain', data:html}]);
  }catch(htmlErr){
    console.warn('Falha no QZ HTML, tentando modo térmico texto:', htmlErr);
    const rawConfig = qz.configs.create(printer, {encoding:'UTF-8', copies:1});
    await qz.print(rawConfig, [{type:'raw', format:'plain', data:textoComandaQZ(p)}]);
  }
  const out=document.getElementById('impressoraStatus');
  if(out) out.innerHTML='✅ Comanda bonita com logo enviada direto para: '+escapeHtml(printer);
}

function htmlComandaPedido(p, autoPrint=true){
  const cfg=getConfigImpressora();
  const papel=Number(cfg.papel||80);
  const larguraUtil=Number(cfg.larguraUtil||(papel===58?48:72));
  const fonte=Number(cfg.fonte||13);
  const titulo=Number(cfg.titulo||22);
  const margem=Number(cfg.margem??2);
  const espacoItens=Number(cfg.espacoItens||5);
  const logoTamanho=Number(cfg.logoTamanho||(papel===58?34:42));
  const qrTamanho=Number(cfg.qrTamanho||(papel===58?30:34));
  const bordaItem=cfg.mostrarBordas===true?'1px solid #000':'0';
  const peso=cfg.negrito!==false?'800':'400';
  const itens=itensHtmlComanda(p.itens);
  const data=new Date().toLocaleString('pt-BR');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Comanda #${numeroPedido(p)}</title><style>
  *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:${margem}px;color:#000;background:#fff;font-size:${fonte}px;font-weight:${peso};overflow:visible}.ticket{width:${larguraUtil}mm;max-width:${larguraUtil}mm;margin:0 auto;overflow:hidden}.logo{display:block;width:${logoTamanho}mm;max-height:28mm;object-fit:contain;margin:0 auto 4px}h1{font-size:${titulo}px;text-align:center;margin:0 0 4px;font-weight:900}.sub{text-align:center;border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px;font-weight:${peso}}.row{display:flex;justify-content:space-between;gap:8px;margin:4px 0}.big{font-size:${Math.max(fonte+5,18)}px;font-weight:900}.sec{border-top:1px dashed #000;margin-top:8px;padding-top:8px}.items{font-size:${Math.max(fonte+2,15)}px;line-height:1.35}.item-box{border:${bordaItem};border-radius:4px;padding:${cfg.mostrarBordas===true?'5px 6px':'2px 0'};margin:${espacoItens}px 0;page-break-inside:avoid;break-inside:avoid}.item-name{font-weight:900}.item-price{float:right}.item-add{padding-left:10px;margin-top:2px}.item-obs{padding-left:10px;margin-top:3px;font-weight:900}.total{font-size:${Math.max(fonte+7,20)}px;font-weight:900;text-align:right;margin-top:8px}.obs{font-size:${Math.max(fonte+1,14)}px;white-space:pre-wrap}@page{size:${papel}mm auto;margin:0}@media print{html,body{width:${papel}mm;margin:0!important;padding:0!important}.ticket{width:${larguraUtil}mm;max-width:${larguraUtil}mm;margin:0 auto;overflow:hidden}button{display:none}}
  </style></head><body><div class="ticket">${cfg.logo!==false?'<img src="/print-logo.png" class="logo" alt="Big Burger">':''}<h1>${escapeHtml(cfg.nome||'BIG BURGER')}</h1><div class="sub">${escapeHtml(cfg.subtitulo||'COMANDA DE PEDIDO')}<br>${data}</div><div class="row big"><span>Pedido</span><span>#${numeroPedido(p)}</span></div><div class="row"><span>Cliente</span><b>${escapeHtml(textoPrint(p.cliente_nome||''))}</b></div><div class="row"><span>Telefone</span><b>${escapeHtml(p.cliente_telefone||'')}</b></div><div class="sec"><b>ITENS</b><div class="items">${itens}</div></div><div class="sec"><b>ENDEREÇO</b><div>${escapeHtml(textoPrint(enderecoPedido(p)||'Retirada/sem endereco'))}</div></div><div class="sec"><div class="row"><span>Pagamento</span><b>${escapeHtml(p.forma_pagamento||'pix')}</b></div><div class="row"><span>Taxa entrega</span><b>${brl(p.taxa_entrega||0)}</b></div>${String(p.forma_pagamento||'').toLowerCase()==='dinheiro'?`<div class="row"><span>Troco</span><b>${(p.precisa_troco===true||p.precisa_troco==='true'||Number(p.troco_para||0)>0)?('para '+brl(p.troco_para||0)+' / devolver '+brl(p.troco_valor||0)):'não precisa'}</b></div>`:''}<div class="total">TOTAL: ${brl(p.valor_total||0)}</div></div>${p.observacao?`<div class="sec obs"><b>OBS:</b><br>${escapeHtml(textoPrint(p.observacao))}</div>`:''}<div class="sec" style="text-align:center"><b>QR CODE DO MOTOBOY</b><br><img style="width:${qrTamanho}mm;height:${qrTamanho}mm;object-fit:contain" src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(location.origin+'/motoboy?pedido='+p.id)}" alt="QR Pedido"><br><small>Escanear para registrar pedido</small></div></div>${autoPrint?`<script>window.onload=function(){const imgs=[...document.images];Promise.all(imgs.map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=img.onerror=r;setTimeout(r,1800)}))).then(()=>setTimeout(()=>window.print(),250)); if(${cfg.fecharJanela!==false?'true':'false'}){window.onafterprint=function(){setTimeout(function(){window.close();},300)}}}<\/script>`:''}</body></html>`;
}
function imprimirPedidoDireto(p){
  if(!p){alert('Pedido não encontrado para imprimir.');return;}
  // Impressão sem abrir nova janela: usa iframe oculto. Em navegador normal ainda pode aparecer a tela de impressão.
  // Para imprimir 100% direto, abra o painel pelo arquivo BAT em modo kiosk printing.
  const antigo=document.getElementById('iframeImpressaoBigBurger');
  if(antigo) antigo.remove();
  const iframe=document.createElement('iframe');
  iframe.id='iframeImpressaoBigBurger';
  iframe.style.position='fixed';
  iframe.style.right='0';
  iframe.style.bottom='0';
  iframe.style.width='0';
  iframe.style.height='0';
  iframe.style.border='0';
  iframe.style.opacity='0';
  document.body.appendChild(iframe);
  const doc=iframe.contentWindow.document;
  doc.open();
  doc.write(htmlComandaPedido(p));
  doc.close();
  setTimeout(()=>{ try{iframe.remove()}catch(e){} }, 15000);
}
function imprimirPedidoPopup(p){
  if(!p){alert('Pedido não encontrado para imprimir.');return;}
  const w=window.open('','_blank','width=420,height=720');
  if(!w){alert('O navegador bloqueou a impressão. Libere pop-ups para este site ou ative o modo direto na aba Impressora.');return;}
  w.document.open(); w.document.write(htmlComandaPedido(p)); w.document.close();
}
async function imprimirPedidoElectron(p){
  if(!p){alert('Pedido não encontrado para imprimir.');return;}
  if(window.BigBurgerApp && typeof window.BigBurgerApp.printReceipt === 'function'){
    const out=document.getElementById('impressoraStatus');
    try{
      if(out) out.innerHTML='🖨️ Enviando comanda direto para o app Big Burger...';
      const html=htmlComandaPedido(p, false);
      const r=await window.BigBurgerApp.printReceipt(html);
      if(!r || !r.success) throw new Error((r && r.reason) || 'Falha na impressão silenciosa');
      if(out) out.innerHTML='✅ Comanda enviada para a impressora pelo app, sem popup.';
      return true;
    }catch(e){
      console.error('Falha no Electron:', e);
      if(out) out.innerHTML='<span class="err-inline">Erro no app de impressão: '+escapeHtml(e.message||String(e))+'</span>';
      alert('Erro no app de impressão: '+(e.message||e));
      return false;
    }
  }
  return false;
}
function imprimirPedido(p){
  const cfg=getConfigImpressora();
  if(window.BigBurgerApp && typeof window.BigBurgerApp.printReceipt === 'function'){
    imprimirPedidoElectron(p);
    return;
  }
  if(cfg.qzAtivo===true){
    imprimirPedidoQZ(p).catch(e=>{
      console.error(e);
      const out=document.getElementById('impressoraStatus'); if(out) out.innerHTML='<span class="err-inline">QZ falhou, usando impressão normal: '+escapeHtml(e.message||String(e))+'</span>'; console.warn('QZ falhou, usando reserva:', e);
      if(cfg.direto!==false) imprimirPedidoDireto(p); else imprimirPedidoPopup(p);
    });
    return;
  }
  if(cfg.direto!==false) return imprimirPedidoDireto(p);
  return imprimirPedidoPopup(p);
}
function registrarPedidoImpresso(id){
  if(!id) return;
  ultimoIdsEmPreparoImpresso.add(String(id));
  localStorage.setItem('pedidosImpressosAuto', JSON.stringify([...ultimoIdsEmPreparoImpresso].slice(-300)));
}
function imprimirPedidoAoAceitar(p){
  if(!p || getConfigImpressora().auto===false || ultimoIdsEmPreparoImpresso.has(String(p.id))) return;
  imprimirPedido(p);
  registrarPedidoImpresso(p.id);
}


async function enviarStatusPeloRoboNgrok(pedido, status, tempo){
  if(status === 'cancelado') return { ok:false, pulado:true };

  let roboUrl = localStorage.getItem('BIGBURGER_ROBO_URL') || '';
  if(!roboUrl){
    roboUrl = prompt('Cole aqui o link do ngrok do robô. Exemplo: https://xxxx.ngrok-free.dev');
    if(roboUrl) localStorage.setItem('BIGBURGER_ROBO_URL', roboUrl.trim().replace(/\/+$/,''));
  }
  roboUrl = (localStorage.getItem('BIGBURGER_ROBO_URL') || roboUrl || '').trim().replace(/\/+$/,'');
  if(!roboUrl) return { ok:false, error:'URL do robô não configurada' };

  const payload = {
    id: pedido?.id,
    numeroPedido: pedido?.numero_pedido || pedido?.id,
    telefone: pedido?.cliente_telefone || pedido?.telefone_cliente || pedido?.telefone || pedido?.whatsapp || pedido?.celular,
    status,
    tempo_estimado_minutos: tempo,
    pedido: {...(pedido||{}), status, tempo_estimado_minutos: tempo}
  };

  const r = await fetch(`${roboUrl}/enviar-status`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  const d = await r.json().catch(()=>({}));
  if(!r.ok || !d.ok) throw new Error(d.error || `Erro HTTP ${r.status} no robô`);
  return d;
}
function trocarUrlRoboNgrok(){
  const atual=localStorage.getItem('BIGBURGER_ROBO_URL')||'';
  const nova=prompt('Cole a nova URL do ngrok do robô:', atual);
  if(nova){localStorage.setItem('BIGBURGER_ROBO_URL', nova.trim().replace(/\/+$/,'')); alert('URL do robô salva!');}
}


function dataAceitePedido(p){return p?.aceito_em || p?.accepted_at || p?.preparo_iniciado_em || p?.updated_at || p?.created_at;}
function timerPedidoHtml(p){
  const st=normalizarStatusPedido(p.status);
  if(!['em_preparo','pronto','em_entrega'].includes(st)) return '';
  const emEntrega = st==='em_entrega';
  const min=Number(p.tempo_estimado_minutos||0);
  if(!min) return '';
  const inicio=dataAceitePedido(p);
  if(!inicio) return `<div class="order-timer">Tempo: ${min}:00</div>`;
  const fim=new Date(inicio).getTime()+min*60000;
  const diff=fim-Date.now();
  if(diff>=0){
    const m=Math.floor(diff/60000), ss=Math.floor((diff%60000)/1000);
    return `<div class="order-timer ${emEntrega ? 'delivery-mode' : ''}" data-fim="${fim}">${emEntrega ? '🛵 Tempo de entrega' : '⏱ Entrega'}: ${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}</div>`;
  }
  const atraso=Math.abs(diff);
  const m=Math.floor(atraso/60000), ss=Math.floor((atraso%60000)/1000);
  return `<div class="order-timer late" data-fim="${fim}">🔴 Atrasado: +${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}</div>`;
}
function atualizarTimersPedidos(){
  document.querySelectorAll('.order-timer[data-fim]').forEach(el=>{
    const fim=Number(el.dataset.fim||0); if(!fim) return;
    const diff=fim-Date.now();
    if(diff>=0){const m=Math.floor(diff/60000), s=Math.floor((diff%60000)/1000); el.classList.remove('late'); el.textContent=`⏱ Entrega: ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
    else{const atraso=Math.abs(diff); const m=Math.floor(atraso/60000), s=Math.floor((atraso%60000)/1000); el.classList.add('late'); el.textContent=`🔴 Atrasado: +${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
  });
}
setInterval(atualizarTimersPedidos,1000);
function trocoPedidoHtml(p){
  if(String(p.forma_pagamento||'').toLowerCase()!=='dinheiro') return '';
  const precisa=p.precisa_troco===true || p.precisa_troco==='true' || Number(p.troco_para||0)>0;
  if(!precisa) return '<br>💵 Troco: não precisa';
  return `<br>💵 Troco para: ${brl(p.troco_para||0)} • devolver: ${brl(p.troco_valor||0)}`;
}
async function marcarNaoRealizado(id){
  if(!id) return;
  if(!confirm('Marcar este pedido como NÃO REALIZADO?\n\nEle sai do painel e NÃO entra no relatório.')) return;
  try{
    const r=await fetch('/api?route=order-status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status:'nao_realizado',nao_realizado_em:new Date().toISOString()})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok) throw new Error(d.error||JSON.stringify(d));
    alert('Pedido marcado como não realizado e removido do relatório.');
    await loadPedidos();
  }catch(e){alert('Erro ao marcar não realizado: '+e.message)}
}

async function atualizarStatusPedido(id,status,whatsTipo){
  const pedido=pedidosCache.find(p=>p.id===id);
  let tempo = pedido?.tempo_estimado_minutos || '';
  if(status==='em_preparo') tempo = prompt('Tempo estimado para preparo e entrega (minutos):', tempo || 40) || tempo;
  if(status==='em_entrega') tempo = prompt('Tempo estimado até chegar no cliente (minutos):', 15) || 15;
  try{
    const r=await fetch('/api?route=order-status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status,tempo_estimado_minutos:tempo,enviar_whatsapp:true})});
    const d=await r.json();
    if(!r.ok||!d.ok) throw new Error(d.error||JSON.stringify(d));
    if(status==='em_preparo'){ pararSomPedido(); imprimirPedidoAoAceitar(pedido); }

    let roboResultado=null;
    try{
      roboResultado = await enviarStatusPeloRoboNgrok(pedido,status,tempo);
    }catch(erroRobo){
      alert('Status atualizado, mas o WhatsApp NÃO enviou. Verifique se o robô e o ngrok estão abertos. Erro: '+erroRobo.message);
      await loadPedidos();
      return;
    }

    if(status==='em_preparo'){ alert('Pedido aceito, comanda enviada para impressão e WhatsApp enviado!'); }
    else { alert('Status atualizado e WhatsApp enviado!'); }
    await loadPedidos();
  }catch(e){alert('Erro ao atualizar pedido: '+e.message)}
}

async function recusarPedido(id){
  if(!id) return;
  const ok=confirm('Deseja recusar e apagar este pedido?\n\nEssa ação remove o pedido do painel.');
  if(!ok) return;
  try{
    const r=await fetch('/api?route=pedidos',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok) throw new Error(d.error||JSON.stringify(d));
    alert('❌ Pedido recusado e apagado.');
    await loadPedidos();
  }catch(e){alert('Erro ao recusar pedido: '+e.message)}
}


async function cancelarPedido(id){
  if(!id){ alert('Não encontrei o ID do pedido.'); return; }
  if(!confirm('Cancelar este pedido? Ele vai sair do painel e não entra no financeiro.')) return;

  const payload = {
    id: id,
    status:'cancelado',
    arquivado_relatorio:true
  };

  try{
    const r = await fetch('/api/pedidos', {
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });

    const d = await r.json().catch(()=>({}));
    if(!r.ok || d.error) throw new Error(d.error || JSON.stringify(d));

    await loadPedidos(true);
    if(typeof renderFinanceiro==='function') renderFinanceiro();
    if(typeof renderHistoricoPedidos==='function') renderHistoricoPedidos();
    alert('Pedido cancelado com sucesso.');
  }catch(e){
    alert('Erro ao cancelar pedido: ' + (e.message || 'falha desconhecida'));
  }
}


function cardPedido(p){
  const st=normalizarStatusPedido(p.status);
  const itens=itensTexto(p.itens).replaceAll('\n','<br>');
  let acoes='';
  if(st==='em_analise') acoes=`<button class="order-action accept" onclick="atualizarStatusPedido('${p.id}','em_preparo','aceito')">✅ Aceitar pedido</button><button class="order-action no-realizado" onclick="marcarNaoRealizado('${p.id}')">🚫 Não realizado</button><button class="order-action refuse" onclick="recusarPedido('${p.id}')">❌ Recusar pedido</button>`;
  if(st==='em_preparo') acoes=`<button class="order-action danger cancel" onclick="cancelarPedido('${p.id}')">❌ Cancelar</button><button class="order-action ready" onclick="atualizarStatusPedido('${p.id}','pronto','pronto')">🔵 Marcar pronto</button><button class="order-action delivery" onclick="atualizarStatusPedido('${p.id}','em_entrega','entrega')">🛵 Saiu para entrega</button>`;
  if(st==='pronto') acoes=`<button class="order-action danger cancel" onclick="cancelarPedido('${p.id}')">❌ Cancelar</button><button class="order-action delivery" onclick="atualizarStatusPedido('${p.id}','em_entrega','entrega')">🛵 Saiu para entrega</button>`;
  if(st==='em_entrega') acoes=`<button class="order-action danger cancel" onclick="cancelarPedido('${p.id}')">❌ Cancelar</button><button class="order-action done" onclick="atualizarStatusPedido('${p.id}','finalizado','')">✅ Finalizar</button>`;
  if(st==='finalizado') acoes=`<button class="order-action danger cancel" onclick="cancelarPedido('${p.id}')">❌ Cancelar</button><span class="order-done">Pedido finalizado</span>`;
  return `<div class="order-card"><div class="order-title"><b>#${numeroPedido(p)}</b><span>${brl(p.valor_total)}</span></div><div class="order-customer">👤 ${p.cliente_nome||''}<br>📞 ${p.cliente_telefone||''}</div><div class="order-items">${itens}</div><div class="order-address">📍 ${enderecoPedido(p)}<br>💳 ${p.forma_pagamento||'pix'} • 🚚 ${brl(p.taxa_entrega||0)}${trocoPedidoHtml(p)}</div>${timerPedidoHtml(p)}<div class="order-actions">${acoes}<button class="order-action print" onclick='imprimirPedido(${JSON.stringify(p).replaceAll("'","&#39;")})'>🖨️ Imprimir</button><button class="order-action whats" onclick='abrirWhats(${JSON.stringify(p).replaceAll("'","&#39;")},"aceito")'>💬 WhatsApp</button></div></div>`;
}
let somPedidoLoopTimer=null;
let somPedidoAudioCtx=null;
function getSomPedidoCtx(){
  try{
    if(!somPedidoAudioCtx) somPedidoAudioCtx=new (window.AudioContext||window.webkitAudioContext)();
    if(somPedidoAudioCtx.state==='suspended') somPedidoAudioCtx.resume().catch(()=>{});
    return somPedidoAudioCtx;
  }catch(e){return null;}
}
function beepPedido(freq=980, inicio=0, duracao=0.18, volume=0.18){
  const ctx=getSomPedidoCtx(); if(!ctx) return;
  const osc=ctx.createOscillator(); const gain=ctx.createGain();
  osc.type='square'; osc.frequency.value=freq;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime+inicio);
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime+inicio+0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+inicio+duracao);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(ctx.currentTime+inicio); osc.stop(ctx.currentTime+inicio+duracao+0.03);
}
function tocarSomPedido(){
  beepPedido(1040,0,0.16,.20);
  beepPedido(780,.20,0.16,.18);
  beepPedido(1040,.40,0.22,.20);
}
function iniciarSomPedidoAteAceitar(){
  if(!somPedidosLigado || somPedidoLoopTimer) return;
  tocarSomPedido();
  somPedidoLoopTimer=setInterval(()=>{ if(somPedidosLigado) tocarSomPedido(); }, 1400);
}
function pararSomPedido(){
  if(somPedidoLoopTimer){ clearInterval(somPedidoLoopTimer); somPedidoLoopTimer=null; }
}
function atualizarSomPedidoPendente(){
  const temPedidoPendente=pedidosVisiveisPainel().some(p=>normalizarStatusPedido(p.status)==='em_analise');
  if(temPedidoPendente && somPedidosLigado) iniciarSomPedidoAteAceitar(); else pararSomPedido();
}
function atualizarBotaoSom(){const b=document.getElementById('btnSomPedidos');if(b)b.textContent=somPedidosLigado?'🔔 Som ligado':'🔕 Som desligado'}
function toggleSomPedidos(){somPedidosLigado=!somPedidosLigado;localStorage.setItem('somPedidosLigado',somPedidosLigado?'1':'0');if(!somPedidosLigado) pararSomPedido(); else atualizarSomPedidoPendente();atualizarBotaoSom()}
window.addEventListener('click',()=>{getSomPedidoCtx();},{once:true});
function renderPedidosGestor(){
  const out=document.getElementById('pedidosBoard'); if(!out) return;
  const busca=(document.getElementById('pedidoBusca')?.value||'').toLowerCase().trim();
  let lista=pedidosVisiveisPainel();
  if(busca) lista=lista.filter(p=>[p.id,p.cliente_nome,p.cliente_telefone,enderecoPedido(p),itensTexto(p.itens)].join(' ').toLowerCase().includes(busca));
  const totalNovos=lista.filter(p=>normalizarStatusPedido(p.status)==='em_analise').length;
  out.innerHTML=`<div class="orders-summary"><div><b>${lista.length}</b><span>Pedidos totais</span></div><div><b>${totalNovos}</b><span>Em análise</span></div><div><b>${brl(lista.reduce((s,p)=>s+Number(p.valor_total||0),0))}</b><span>Valor dos pedidos</span></div></div><div class="kanban">${orderStatuses.map(col=>{const pedidos=lista.filter(p=>normalizarStatusPedido(p.status)===col.id);const valor=pedidos.reduce((s,p)=>s+Number(p.valor_total||0),0);return `<section class="kanban-col ${col.cls}"><h3>${col.emoji} ${col.titulo} <em>${pedidos.length}</em></h3><small>${brl(valor)}</small><div class="kanban-list">${pedidos.map(cardPedido).join('')||'<p class="empty-col">Sem pedidos</p>'}</div></section>`}).join('')}</div>`;
  atualizarBotaoSom();
  renderFinanceiro();
}
async function loadPedidos(silencioso=false){
  if(loadPedidosEmAndamento) return;
  loadPedidosEmAndamento=true;
  const out=document.getElementById('pedidosBoard')||document.getElementById('pedidosOut'); if(out && !silencioso) out.innerHTML='Carregando pedidos...';
  try{
    const anteriores=[...pedidosCache];
    const r=await fetch('/api?route=admin&ts='+Date.now(), {cache:'no-store'}); const d=await r.json();
    if(!r.ok||!d.ok) throw new Error(d.error||JSON.stringify(d));
    pedidosCache=d.pedidos||[];
    state.pedidosHistorico=pedidosHistoricoRelatorio();
    state.financeiro=d.resumo||null;
    const novoTotal=pedidosCache.length;
    pedidosCache.forEach(p=>{
      const antes=anteriores.find(a=>String(a.id)===String(p.id));
      const agora=normalizarStatusPedido(p.status);
      const statusAntes=antes?normalizarStatusPedido(antes.status):null;
      if(agora==='em_preparo' && statusAntes && statusAntes!=='em_preparo') imprimirPedidoAoAceitar(p);
    });
    ultimoTotalPedidos=novoTotal;
    renderPedidosGestor();
    atualizarSomPedidoPendente();
    // Não atualiza o histórico junto com o painel de pedidos.
    // O histórico agora carrega só ao abrir a aba, trocar página, pesquisar ou zerar relatório.
  }catch(e){if(out && !silencioso) out.innerHTML='<div class="err">Erro ao carregar pedidos: '+e.message+'</div>'}
  finally{loadPedidosEmAndamento=false;}
}

async function loadClientes(){
  if(typeof clientesOut!=='undefined') clientesOut.innerHTML='Carregando clientes...';
  try{
    const r=await fetch('/api?route=clientes');
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
function escapeHtml(v){return String(v??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function renderClientes(){
  if(typeof clientesOut==='undefined') return;
  let lista=[...(state.clientes||[])];
  const busca=(clienteBusca?.value||'').toLowerCase().trim();
  const ordem=clienteOrdem?.value||'gasto';
  if(busca){lista=lista.filter(c=>[c.cliente_nome,c.cliente_telefone,c.email,c.endereco,c.cidade,c.bairro,c.rua,c.observacao].join(' ').toLowerCase().includes(busca));}
  if(ordem==='gasto') lista.sort((a,b)=>Number(b.total_gasto||0)-Number(a.total_gasto||0));
  if(ordem==='pedidos') lista.sort((a,b)=>Number(b.total_pedidos||0)-Number(a.total_pedidos||0));
  if(ordem==='recente') lista.sort((a,b)=>new Date(b.ultimo_pedido||0)-new Date(a.ultimo_pedido||0));
  if(ordem==='nome') lista.sort((a,b)=>String(a.cliente_nome||'').localeCompare(String(b.cliente_nome||''),'pt-BR'));
  const resumo=state.clientesResumo||{};
  clientesResumo.innerHTML=`<div class="stat-card dark-stat client-stat"><div>👥</div><b>${resumo.total_clientes||0}</b><span>Clientes cadastrados</span></div><div class="stat-card dark-stat client-stat"><div>🛍️</div><b>${resumo.total_pedidos||0}</b><span>Pedidos realizados</span></div><div class="stat-card dark-stat client-stat"><div>💰</div><b>${brl(resumo.faturamento_total||0)}</b><span>Total gasto</span></div><div class="stat-card dark-stat client-stat"><div>🧾</div><b>${brl(resumo.ticket_medio||0)}</b><span>Ticket médio</span></div>`;
  const total=lista.length;
  const porPagina=Number(state.clientesPorPagina||20);
  const paginas=Math.max(1,Math.ceil(total/porPagina));
  if(state.clientesPagina>paginas) state.clientesPagina=paginas;
  if(state.clientesPagina<1) state.clientesPagina=1;
  const inicio=(state.clientesPagina-1)*porPagina;
  const pagina=lista.slice(inicio,inicio+porPagina);
  const rows=pagina.map(c=>{
    const safe=JSON.stringify(c).replaceAll("'","&#39;");
    return `<tr><td><b>${escapeHtml(c.cliente_nome||'')}</b><br><small>${escapeHtml(c.origem==='manual'?'Cadastro manual':(c.origem==='manual+pedido'?'Manual + pedidos':'Pedido automático'))}</small></td><td>${escapeHtml(c.cliente_telefone||'')}<br>${c.cliente_telefone?`<a href="${whatsLink(c.cliente_telefone)}" target="_blank">Chamar no WhatsApp</a>`:''}</td><td>${escapeHtml(c.email||'')}</td><td><b>${c.total_pedidos||0}</b></td><td><b>${brl(c.total_gasto||0)}</b></td><td>${dataBR(c.ultimo_pedido)}</td><td class="client-actions"><button title="Ver" onclick='verCliente(${safe})'>👁️</button>${c.id?`<button title="Editar" onclick='editarCliente(${safe})'>✏️</button>`:''}<button class="danger" title="Excluir cliente" onclick='excluirClienteCompleto(${safe})'>🗑️</button></td></tr>`;
  }).join('');
  clientesOut.innerHTML=total?`<div class="client-table-wrap"><table class="table clientes-table dark-table"><thead><tr><th>Nome</th><th>Telefone</th><th>E-mail</th><th>Pedidos</th><th>Total gasto</th><th>Último pedido</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table></div><div class="client-pagination"><span>Mostrando ${total?inicio+1:0} a ${Math.min(inicio+porPagina,total)} de ${total} clientes</span><div><button onclick="mudarPaginaClientes(1)" ${state.clientesPagina===1?'disabled':''}>Primeira</button><button onclick="mudarPaginaClientes(${state.clientesPagina-1})" ${state.clientesPagina===1?'disabled':''}>Anterior</button><b>${state.clientesPagina}</b><button onclick="mudarPaginaClientes(${state.clientesPagina+1})" ${state.clientesPagina===paginas?'disabled':''}>Próxima</button><button onclick="mudarPaginaClientes(${paginas})" ${state.clientesPagina===paginas?'disabled':''}>Última</button></div><label>Itens por página:<select onchange="state.clientesPorPagina=Number(this.value);state.clientesPagina=1;renderClientes()"><option value="20" ${porPagina===20?'selected':''}>20</option><option value="40" ${porPagina===40?'selected':''}>40</option><option value="60" ${porPagina===60?'selected':''}>60</option></select></label></div>`:'<p class="empty-finance">Nenhum cliente registrado ainda. Cadastre manualmente ou aguarde os pedidos aparecerem aqui automaticamente.</p>';
}
function mudarPaginaClientes(p){state.clientesPagina=Number(p||1);renderClientes()}
function abrirCadastroCliente(){
  state.clienteEditando=null;
  clienteFormTitulo.textContent='Cadastrar novo cliente';
  clienteId.value=''; clienteNome.value=''; clienteTelefone.value=''; clienteEmail.value=''; clienteCidade.value=''; clienteBairro.value=''; clienteRua.value=''; clienteNumero.value=''; clienteObservacao.value='';
  clienteModal.classList.add('active');
}
function fecharCadastroCliente(){clienteModal.classList.remove('active')}
function editarCliente(c){
  state.clienteEditando=c;
  clienteFormTitulo.textContent='Editar cliente';
  clienteId.value=c.id||''; clienteNome.value=c.cliente_nome||''; clienteTelefone.value=c.cliente_telefone||''; clienteEmail.value=c.email||''; clienteCidade.value=c.cidade||''; clienteBairro.value=c.bairro||''; clienteRua.value=c.rua||''; clienteNumero.value=c.numero||''; clienteObservacao.value=c.observacao||'';
  clienteModal.classList.add('active');
}
function verCliente(c){
  alert(`Cliente: ${c.cliente_nome||''}\nTelefone: ${c.cliente_telefone||''}\nE-mail: ${c.email||''}\nPedidos: ${c.total_pedidos||0}\nTotal gasto: ${brl(c.total_gasto||0)}\nEndereço: ${[c.cidade,c.bairro,c.rua,c.numero].filter(Boolean).join(' • ') || c.endereco || ''}\nObs: ${c.observacao||''}`);
}
async function salvarClienteManual(ev){
  ev.preventDefault();
  const payload={
    cliente_nome:clienteNome.value.trim(), cliente_telefone:clienteTelefone.value.trim(), email:clienteEmail.value.trim(),
    cidade:clienteCidade.value.trim(), bairro:clienteBairro.value.trim(), rua:clienteRua.value.trim(), numero:clienteNumero.value.trim(), observacao:clienteObservacao.value.trim()
  };
  if(!payload.cliente_nome){alert('Informe o nome do cliente.');return;}
  const id=clienteId.value;
  const r=await fetch('/api?route=clientes'+(id?'?id='+encodeURIComponent(id):''),{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const d=await r.json();
  if(!r.ok||!d.ok){alert('Erro ao salvar cliente: '+(d.error||JSON.stringify(d)));return;}
  fecharCadastroCliente();
  await loadClientes();
}
async function excluirCliente(id){
  if(!confirm('Excluir este cadastro manual? Os pedidos feitos por ele não serão apagados.')) return;
  const r=await fetch('/api?route=clientes&id='+encodeURIComponent(id),{method:'DELETE'});
  const d=await r.json();
  if(!r.ok||!d.ok){alert('Erro ao excluir cliente: '+(d.error||JSON.stringify(d)));return;}
  await loadClientes();
}
async function excluirClienteCompleto(c){
  const nome=c?.cliente_nome||'este cliente';
  const temPedidos=Number(c?.total_pedidos||0)>0;
  const msg=temPedidos
    ? `Excluir ${nome} da lista e apagar todos os pedidos desse cliente?\n\nAtenção: isso remove pedidos ativos, finalizados e arquivados ligados ao telefone/nome dele.`
    : `Excluir o cadastro de ${nome}?`;
  if(!confirm(msg)) return;
  const params=new URLSearchParams();
  if(c?.id) params.set('id', c.id);
  if(c?.cliente_telefone) params.set('telefone', c.cliente_telefone);
  if(c?.cliente_nome) params.set('nome', c.cliente_nome);
  if(temPedidos) params.set('apagarPedidos','true');
  const r=await fetch('/api?route=clientes&'+params.toString(),{method:'DELETE'});
  const d=await r.json();
  if(!r.ok||!d.ok){alert('Erro ao excluir cliente: '+(d.error||JSON.stringify(d)));return;}
  alert(`Cliente excluído. Pedidos apagados: ${d.pedidos_apagados||0}`);
  await loadClientes();
  await loadPedidos();
  renderHistoricoPedidos();
}
function exportarClientesCSV(){
  const lista=state.clientes||[];
  const header=['Nome','Telefone','Email','Pedidos','Total gasto','Cidade','Bairro','Rua','Numero','Ultimo pedido','Observacao'];
  const linhas=lista.map(c=>[c.cliente_nome,c.cliente_telefone,c.email,c.total_pedidos,Number(c.total_gasto||0).toFixed(2),c.cidade,c.bairro,c.rua,c.numero,dataBR(c.ultimo_pedido),c.observacao].map(v=>`"${String(v||'').replaceAll('"','""')}"`).join(';'));
  const blob=new Blob([[header.join(';'),...linhas].join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='clientes-big-burger.csv';a.click();URL.revokeObjectURL(a.href);
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
 toggleProdutoAdicionais(true);
}
function toggleProdutoAdicionais(apenasAtualizar=false){
 const usar = typeof prod_usar_adicionais==='undefined' || !prod_usar_adicionais ? true : !!prod_usar_adicionais.checked;
 document.querySelectorAll('.produto-catcomp').forEach(ch=>{
   ch.disabled=!usar;
   ch.closest('label')?.classList.toggle('disabled', !usar);
   if(!usar && !apenasAtualizar) ch.checked=false;
 });
 if(!usar && prod_categorias_complementos){
   prod_categorias_complementos.title='Adicionais desativados para este produto';
 }else if(prod_categorias_complementos){
   prod_categorias_complementos.title='';
 }
}
function renderPromoComplementosChecks(produtoId=''){
 const vinculadas=new Set(state.produto_complemento_categorias.filter(v=>v.produto_id===produtoId).map(v=>v.categoria_complemento_id));
 promo_categorias_complementos.innerHTML=state.categorias_complementos.length?state.categorias_complementos.map(c=>`<label class="check card-check"><input type="checkbox" class="promo-catcomp" value="${c.id}" ${!produtoId||vinculadas.has(c.id)?'checked':''}> ${c.nome}<small>Escolha de ${c.min_escolha||0} até ${c.max_escolha||6}</small></label>`).join(''):'<p class="small">Cadastre as categorias dos complementos primeiro.</p>';
}
function novo(t){if(t==='categorias'){cat_id.value='';cat_nome.value='';cat_ordem.value=0;cat_ativo.checked=true} if(t==='produtos'){prod_id.value='';prod_nome.value='';prod_descricao.value='';prod_preco.value='';prod_preco_promocional.value='';prod_desconto_percentual.value='';prod_badge.value='';prod_imagem.value='';prod_ordem.value=0;prod_desconto_ativo.checked=false;prod_promocao_ativa.checked=false;if(typeof prod_usar_adicionais!=='undefined') prod_usar_adicionais.checked=true;prod_ativo.checked=true;renderProdutoComplementosChecks('')} if(t==='promocoes'){promo_id.value='';promo_nome.value='';promo_descricao.value='';promo_preco.value='';promo_preco_promocional.value='';promo_desconto_percentual.value='';promo_badge.value='PROMOÇÃO';promo_imagem.value='';promo_ordem.value=0;promo_ativo.checked=true;renderPromoComplementosChecks('')} if(t==='categorias_complementos'){cc_id.value='';cc_nome.value='';cc_min.value=0;cc_max.value=6;cc_ordem.value=0;cc_ativo.checked=true} if(t==='complementos'){comp_id.value='';comp_nome.value='';comp_preco.value='';comp_ordem.value=0;comp_ativo.checked=true} if(t==='cidades_entrega'){cidade_id.value='';cidade_nome.value='';cidade_ordem.value=0;cidade_ativo.checked=true} if(t==='bairros_entrega'){bairro_id.value='';bairro_nome.value='';bairro_tempo.value=40;bairro_preco.value='0.00';bairro_ordem.value=0;bairro_ativo.checked=true;if(state.cidades_entrega[0]) bairro_cidade.value=state.cidades_entrega[0].id}}
function editar(t,x){if(t==='cidades_entrega'||t==='bairros_entrega')abrirMain('entrega');else if(t==='categorias_complementos')abrirTab('catcomp');else if(t==='promocoes')abrirTab('promocoes');else abrirTab(t); if(t==='categorias'){cat_id.value=x.id;cat_nome.value=x.nome;cat_ordem.value=x.ordem||0;cat_ativo.checked=x.ativo!==false} if(t==='produtos'){prod_id.value=x.id;prod_categoria.value=x.categoria_id||'';prod_nome.value=x.nome;prod_descricao.value=x.descricao||'';prod_preco.value=x.preco||0;prod_preco_promocional.value=x.preco_promocional||'';prod_desconto_percentual.value=x.desconto_percentual||'';prod_desconto_ativo.checked=x.desconto_ativo===true;prod_promocao_ativa.checked=x.promocao_ativa===true;prod_badge.value=x.badge||'';prod_imagem.value=x.imagem_url||'';prod_ordem.value=x.ordem||0;prod_ativo.checked=x.ativo!==false;if(typeof prod_usar_adicionais!=='undefined') prod_usar_adicionais.checked=state.produto_complemento_categorias.some(v=>v.produto_id===x.id);renderProdutoComplementosChecks(x.id)} if(t==='promocoes'){promo_id.value=x.id;promo_categoria.value=x.categoria_id||'';promo_nome.value=x.nome;promo_descricao.value=x.descricao||'';promo_preco.value=x.preco||0;promo_preco_promocional.value=x.preco_promocional||'';promo_desconto_percentual.value=x.desconto_percentual||'';promo_badge.value=x.badge||'PROMOÇÃO';promo_imagem.value=x.imagem_url||'';promo_ordem.value=x.ordem||0;promo_ativo.checked=x.ativo!==false;renderPromoComplementosChecks(x.id)} if(t==='categorias_complementos'){cc_id.value=x.id;cc_nome.value=x.nome;cc_min.value=x.min_escolha||0;cc_max.value=x.max_escolha||6;cc_ordem.value=x.ordem||0;cc_ativo.checked=x.ativo!==false} if(t==='complementos'){comp_id.value=x.id;comp_categoria.value=x.categoria_complemento_id||'';comp_nome.value=x.nome;comp_preco.value=x.preco||0;comp_ordem.value=x.ordem||0;comp_ativo.checked=x.ativo!==false} if(t==='cidades_entrega'){abrirMain('entrega');cidade_id.value=x.id;cidade_nome.value=x.nome;cidade_ordem.value=x.ordem||0;cidade_ativo.checked=x.ativo!==false} if(t==='bairros_entrega'){abrirMain('entrega');bairro_id.value=x.id;bairro_cidade.value=x.cidade_id||'';bairro_nome.value=x.nome;bairro_tempo.value=x.tempo_maximo_minutos||40;bairro_preco.value=x.preco||0;bairro_ordem.value=x.ordem||0;bairro_ativo.checked=x.ativo!==false}}
async function salvar(e,t){e.preventDefault();try{let body={},id=''; if(t==='categorias'){id=cat_id.value;body={id,nome:cat_nome.value,ordem:cat_ordem.value,ativo:cat_ativo.checked}} if(t==='produtos'){id=prod_id.value;body={id,categoria_id:prod_categoria.value,nome:prod_nome.value,descricao:prod_descricao.value,preco:prod_preco.value,desconto_ativo:prod_desconto_ativo.checked,desconto_percentual:prod_desconto_percentual.value,preco_promocional:prod_preco_promocional.value,badge:prod_badge.value,imagem_url:prod_imagem.value,ordem:prod_ordem.value,ativo:prod_ativo.checked,promocao_ativa:prod_promocao_ativa.checked}} if(t==='promocoes'){id=promo_id.value;body={id,categoria_id:promo_categoria.value,nome:promo_nome.value,descricao:promo_descricao.value,preco:promo_preco.value,desconto_ativo:true,desconto_percentual:promo_desconto_percentual.value,preco_promocional:promo_preco_promocional.value,badge:promo_badge.value||'PROMOÇÃO',imagem_url:promo_imagem.value,ordem:promo_ordem.value,ativo:promo_ativo.checked,promocao_ativa:true}} if(t==='categorias_complementos'){id=cc_id.value;body={id,nome:cc_nome.value,min_escolha:cc_min.value,max_escolha:cc_max.value,ordem:cc_ordem.value,ativo:cc_ativo.checked}} if(t==='complementos'){id=comp_id.value;body={id,categoria_complemento_id:comp_categoria.value,nome:comp_nome.value,preco:comp_preco.value,ordem:comp_ordem.value,ativo:comp_ativo.checked}} if(t==='cidades_entrega'){id=cidade_id.value;body={id,nome:cidade_nome.value,ordem:cidade_ordem.value,ativo:cidade_ativo.checked}} if(t==='bairros_entrega'){id=bairro_id.value;body={id,cidade_id:bairro_cidade.value,nome:bairro_nome.value,tempo_maximo_minutos:bairro_tempo.value,preco:bairro_preco.value,ordem:bairro_ordem.value,ativo:bairro_ativo.checked}}
 const tabelaSalvar=t==='promocoes'?'produtos':t;
 const saved=await api(tabelaSalvar,id?'PUT':'POST',body);
 if(t==='produtos'||t==='promocoes'){
   const produtoId=id || saved?.id;
   const usarAdicionais = t==='promocoes' ? true : (typeof prod_usar_adicionais==='undefined' || !prod_usar_adicionais ? true : !!prod_usar_adicionais.checked);
   const categorias_ids = usarAdicionais ? [...document.querySelectorAll(t==='promocoes'?'.promo-catcomp:checked':'.produto-catcomp:checked')].map(x=>x.value) : [];
   if(produtoId){await api('produto_complemento_categorias_set','POST',{produto_id:produtoId,categorias_ids});}
 }
 await loadTudo(); novo(t); alert('Salvo com sucesso!');}catch(err){alert('Erro: '+err.message)}}
async function excluir(t,id){if(!confirm('Excluir este item?'))return;try{await api(t==='promocoes'?'produtos':t,'DELETE',null,id);await loadTudo()}catch(e){alert('Erro: '+e.message)}}


function getConfigLojaLocal(){
  try{return JSON.parse(localStorage.getItem('bigburger_config_loja_salva')||'null')}catch(e){return null}
}
function setConfigLojaLocal(payload){
  try{localStorage.setItem('bigburger_config_loja_salva', JSON.stringify(payload));}catch(e){}
}
async function loadConfigLoja(){
  const out=document.getElementById('configLojaStatus'); if(out) out.textContent='Carregando configuração...';

  // Mostra imediatamente o último valor salvo neste navegador, sem voltar para o padrão.
  const local=getConfigLojaLocal();
  if(local?.config){
    state.loja_config=local.config||{};
    state.horarios_funcionamento=local.horarios||[];
    renderConfigLoja();
  }

  try{
    const r=await fetch('/api?route=store-settings&_=' + Date.now(), { cache: 'no-store', headers:{'Cache-Control':'no-cache'} });
    const d=await r.json();
    if(!r.ok||!d.ok) throw new Error(d.error||JSON.stringify(d));
    state.loja_config=d.config||local?.config||{};
    state.horarios_funcionamento=(d.horarios&&d.horarios.length?d.horarios:local?.horarios)||[];
    setConfigLojaLocal({config:state.loja_config, horarios:state.horarios_funcionamento});
    renderConfigLoja();
    if(out) out.innerHTML=`✅ Configuração carregada. Status do cardápio: <b>${d.status?.aberto?'ABERTO':'FECHADO'}</b>`;
  }catch(e){
    if(local?.config){
      if(out) out.innerHTML='✅ Configuração carregada do navegador. ⚠️ Banco não respondeu: '+e.message;
    }else{
      if(out) out.innerHTML='<span class="err">Erro ao carregar: '+e.message+'</span>';
    }
  }
}
function renderConfigLoja(){
  const c=state.loja_config||{};
  if(typeof cfg_loja_aberta!=='undefined') cfg_loja_aberta.checked=c.loja_aberta!==false;
  if(typeof cfg_pedido_automatico!=='undefined') cfg_pedido_automatico.checked=c.pedido_automatico!==false;
  if(typeof cfg_som_pedidos!=='undefined') cfg_som_pedidos.checked=c.som_pedidos!==false;
  if(typeof cfg_tempo_entrega!=='undefined') cfg_tempo_entrega.value=c.tempo_entrega_padrao||40;
  if(typeof cfg_mensagem_fechado!=='undefined') cfg_mensagem_fechado.value=c.mensagem_fechado||'Estamos fechados no momento. Volte no nosso horário de atendimento.';
  const box=document.getElementById('horariosBox'); if(!box) return;
  const nomes=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const horarios=state.horarios_funcionamento?.length?state.horarios_funcionamento:nomes.map((n,i)=>({dia_semana:i,nome_dia:n,abre:'18:30',fecha:i>=5?'01:00':'00:00',ativo:i!==1}));
  box.innerHTML=horarios.map(h=>`<div class="hour-row" data-dia="${h.dia_semana}"><label class="check"><input class="h-ativo" type="checkbox" ${h.ativo!==false?'checked':''}> ${h.nome_dia||nomes[h.dia_semana]}</label><input class="h-abre" type="time" value="${h.abre||'18:30'}"><span>até</span><input class="h-fecha" type="time" value="${h.fecha||'00:00'}"></div>`).join('');
}
async function salvarConfigLoja(e){
  e.preventDefault();
  const horarios=[...document.querySelectorAll('.hour-row')].map(row=>({dia_semana:Number(row.dataset.dia),nome_dia:row.querySelector('label')?.textContent.trim()||'',ativo:row.querySelector('.h-ativo').checked,abre:row.querySelector('.h-abre').value,fecha:row.querySelector('.h-fecha').value}));
  const payload={config:{loja_aberta:cfg_loja_aberta.checked,pedido_automatico:cfg_pedido_automatico.checked,som_pedidos:cfg_som_pedidos.checked,tempo_entrega_padrao:cfg_tempo_entrega.value,mensagem_fechado:cfg_mensagem_fechado.value},horarios};
  const out=document.getElementById('configLojaStatus'); if(out) out.textContent='Salvando...';
  try{
    // Salva primeiro no navegador para não voltar ao padrão mesmo se o PWA estiver com cache antigo.
    state.loja_config=payload.config;
    state.horarios_funcionamento=payload.horarios;
    setConfigLojaLocal(payload);
    somPedidosLigado=cfg_som_pedidos.checked;
    localStorage.setItem('somPedidosLigado',somPedidosLigado?'1':'0');

    const r=await fetch('/api?route=store-settings&_=' + Date.now(),{method:'POST',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},cache:'no-store',body:JSON.stringify(payload)});
    const d=await r.json();
    if(!r.ok||!d.ok)throw new Error(d.error||JSON.stringify(d));
    state.loja_config=d.config||payload.config;
    state.horarios_funcionamento=d.horarios||payload.horarios;
    setConfigLojaLocal({config:state.loja_config,horarios:state.horarios_funcionamento});
    renderConfigLoja();
    if(out)out.innerHTML='✅ Salvo! Agora pode atualizar a página que não volta mais para o padrão.';
    atualizarBotaoSom();
  }catch(err){
    renderConfigLoja();
    if(out)out.innerHTML='⚠️ Salvei neste navegador, mas o banco não confirmou. Erro: '+err.message+'<br>Confira SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e execute o SQL corrigir_config_loja.sql.';
  }
}
function inicioDiaISO(){const d=new Date();d.setHours(0,0,0,0);return d.toISOString();}
function getFinanceiroResetISO(){
  // IMPORTANTE:
  // Antes o sistema usava inicioDiaISO() como padrão.
  // Isso fazia o financeiro virar 00:00 sozinho depois da meia-noite.
  // Agora o relatório só zera quando você clicar em "Zerar relatório diário".
  return localStorage.getItem('financeiroResetDiarioISO') || '2000-01-01T00:00:00.000Z';
}
function pedidosDoRelatorioDiario(){
  const reset=new Date(getFinanceiroResetISO()).getTime();
  return [...pedidosCache].filter(p=>{
    const st=normalizarStatusPedido(p.status);
    if(st!=='finalizado') return false;
    if(pedidoArquivado(p)) return false;
    const dt=new Date(p.created_at||p.updated_at||Date.now());
    return dt.getTime()>=reset;
  });
}
function resumoFinanceiroLista(lista){
  const total=lista.reduce((s,p)=>s+Number(p.valor_total||0),0);
  const taxas=lista.reduce((s,p)=>s+Number(p.taxa_entrega||0),0);
  return {
    pedidos: lista.length,
    faturamento: total,
    taxas,
    liquido: total-taxas,
    ticket: lista.length?total/lista.length:0,
    pix: lista.filter(p=>String(p.forma_pagamento||'').toLowerCase()==='pix').reduce((s,p)=>s+Number(p.valor_total||0),0),
    dinheiro: lista.filter(p=>String(p.forma_pagamento||'').toLowerCase()==='dinheiro').reduce((s,p)=>s+Number(p.valor_total||0),0),
    cartao: lista.filter(p=>String(p.forma_pagamento||'').toLowerCase().includes('cart')).reduce((s,p)=>s+Number(p.valor_total||0),0)
  };
}
function htmlRelatorioDiario(lista=pedidosDoRelatorioDiario()){
  const r=resumoFinanceiroLista(lista);
  const data=new Date().toLocaleDateString('pt-BR');
  const gerado=new Date().toLocaleString('pt-BR');
  const linhas=lista.map(p=>`<tr><td>#${numeroPedido(p)}</td><td>${escapeHtml(textoPrint(p.cliente_nome||''))}</td><td>${escapeHtml(p.forma_pagamento||'')}</td><td>${escapeHtml(normalizarStatusPedido(p.status))}</td><td>${brl(p.valor_total||0)}</td><td>${brl(p.taxa_entrega||0)}</td><td>${dataBR(p.created_at)}</td></tr>`).join('') || '<tr><td colspan="7">Nenhum pedido neste relatório.</td></tr>';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório diário Big Burger</title><style>body{font-family:Arial,sans-serif;color:#111;margin:28px}h1{margin:0 0 6px}.muted{color:#555;margin-bottom:20px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}.card{border:1px solid #ddd;border-radius:10px;padding:14px}.card b{font-size:22px;display:block;color:#d71919}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#111;color:#fff}td,th{border:1px solid #ddd;padding:8px;text-align:left}.total{font-weight:bold;background:#f5f5f5}@media print{button{display:none}body{margin:12px}}</style></head><body><button onclick="window.print()">Imprimir / Salvar em PDF</button><h1>Big Burger — Relatório diário</h1><div class="muted">Período desde a última zeragem • Gerado em: ${gerado}</div><div class="cards"><div class="card"><span>Faturamento bruto</span><b>${brl(r.faturamento)}</b></div><div class="card"><span>Taxas de entrega</span><b>${brl(r.taxas)}</b></div><div class="card"><span>Faturamento líquido</span><b>${brl(r.liquido)}</b></div><div class="card"><span>Pedidos</span><b>${r.pedidos}</b></div><div class="card"><span>Ticket médio</span><b>${brl(r.ticket)}</b></div><div class="card"><span>Pix / dinheiro / cartão</span><b>${brl(r.pix)} • ${brl(r.dinheiro)} • ${brl(r.cartao)}</b></div></div><h2>Pedidos do dia</h2><table><tr><th>Pedido</th><th>Cliente</th><th>Pagamento</th><th>Status</th><th>Total</th><th>Taxa entrega</th><th>Data/Hora</th></tr>${linhas}<tr class="total"><td colspan="4">Totais</td><td>${brl(r.faturamento)}</td><td>${brl(r.taxas)}</td><td></td></tr></table><script>setTimeout(()=>window.print(),400)</script></body></html>`;
}
function baixarRelatorioDiario(){
  const html=htmlRelatorioDiario();
  const blob=new Blob([html],{type:'text/html;charset=utf-8'});
  const a=document.createElement('a');
  const data=new Date().toISOString().slice(0,10);
  a.href=URL.createObjectURL(blob); a.download=`relatorio-big-burger-${data}.html`; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  const w=window.open('','_blank'); if(w){w.document.write(html);w.document.close();}
}
async function zerarRelatorioDiario(){
  if(!confirm('Antes de zerar, o relatório será baixado para você imprimir. Os pedidos finalizados também sairão do painel e irão para o Histórico. Deseja continuar?')) return;
  baixarRelatorioDiario();
  try{
    const r=await fetch('/api?route=zerar-relatorio',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok) throw new Error(d.error||JSON.stringify(d));
    localStorage.setItem('financeiroResetDiarioISO', new Date().toISOString());
    await loadPedidos(true);
    renderFinanceiro();
    renderHistoricoPedidos();
    alert(`Relatório diário zerado com sucesso. ${d.arquivados||0} pedido(s) finalizado(s) foram enviados para o Histórico.`);
  }catch(e){
    alert('Relatório baixado, mas não consegui limpar os finalizados do painel. Execute o SQL supabase/zerar_relatorio_historico.sql e tente novamente. Erro: '+e.message);
  }
}
function renderFinanceiro(){
  const lista=pedidosDoRelatorioDiario();
  const resumo=resumoFinanceiroLista(lista);
  const box=document.getElementById('financeiroResumo');
  const out=document.getElementById('financeiroOut');
  const dataRef=document.getElementById('financeiroDataRef');
  if(dataRef){dataRef.textContent=`Relatório desde a última zeragem • última zeragem: ${new Date(getFinanceiroResetISO()).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;}
  if(box){box.innerHTML=`<div class="stat-card dark-stat"><div>🛒</div><span>Faturamento bruto</span><b>${brl(resumo.faturamento)}</b></div><div class="stat-card dark-stat"><div>🧾</div><span>Taxas de entrega</span><b>${brl(resumo.taxas)}</b></div><div class="stat-card dark-stat"><div>💰</div><span>Faturamento líquido</span><b>${brl(resumo.liquido)}</b></div><div class="stat-card dark-stat"><div>📦</div><span>Pedidos</span><b>${resumo.pedidos}</b></div><div class="stat-card dark-stat"><div>🎟️</div><span>Ticket médio</span><b>${brl(resumo.ticket)}</b></div><div class="stat-card dark-stat"><div>💳</div><span>Pix / dinheiro / cartão</span><b>${brl(resumo.pix)} / ${brl(resumo.dinheiro)} / ${brl(resumo.cartao)}</b></div>`;}
  if(out){out.innerHTML=lista.length?`<table class="table dark-table"><tr><th>Pedido</th><th>Cliente</th><th>Pagamento</th><th>Status</th><th>Entrega</th><th>Taxa entrega</th><th>Total</th><th>Data/Hora</th></tr>${lista.map(p=>`<tr><td>#${numeroPedido(p)}</td><td>${escapeHtml(textoPrint(p.cliente_nome||''))}</td><td>${escapeHtml(p.forma_pagamento||'')}</td><td>${escapeHtml(normalizarStatusPedido(p.status)).replaceAll('_',' ')}</td><td>${p.taxa_entrega?'Delivery':'Retirada'}</td><td>${brl(p.taxa_entrega||0)}</td><td><b>${brl(p.valor_total||0)}</b></td><td>${dataBR(p.created_at)}</td></tr>`).join('')}<tr class="finance-total"><td colspan="5"><b>Totais do dia</b></td><td><b>${brl(resumo.taxas)}</b></td><td><b>${brl(resumo.faturamento)}</b></td><td></td></tr></table>`:'<div class="empty-finance">Relatório zerado. Os próximos pedidos finalizados aparecerão aqui.</div>';}
}



function renderCardHistorico(p){
  const safePedido=JSON.stringify(p).replaceAll("'","&#39;");
  return `<div class="order-card history-card"><div class="order-title"><b>#${numeroPedido(p)}</b><span>${brl(p.valor_total)}</span></div><div class="order-customer">👤 ${escapeHtml(textoPrint(p.cliente_nome||''))}<br>📞 ${escapeHtml(p.cliente_telefone||'')}</div><div class="order-items">${itensTexto(p.itens).replaceAll('\n','<br>')}</div><div class="order-address">📍 ${escapeHtml(enderecoPedido(p))}<br>💳 ${escapeHtml(p.forma_pagamento||'pix')} • 🚚 ${brl(p.taxa_entrega||0)}<br>🕒 Arquivado: ${p.arquivado_em?dataBR(p.arquivado_em):'relatório diário'}</div><div class="order-actions"><button class="order-action danger cancel" onclick="cancelarPedido('${p.id}')">❌ Cancelar</button><button class="order-action print" onclick='imprimirPedido(${safePedido})'>🖨️ Imprimir</button><button class="order-action whats" onclick='abrirWhats(${safePedido},"aceito")'>💬 WhatsApp</button><button class="order-action danger" onclick='excluirPedidoArquivado(${safePedido})'>🗑️ Excluir</button></div></div>`;
}
async function excluirPedidoArquivado(p){
  if(!p?.id){alert('Não encontrei o ID desse pedido.');return;}
  if(!confirm(`Excluir o pedido arquivado #${numeroPedido(p)}? Essa ação apaga o pedido do histórico.`)) return;
  const r=await fetch('/api/historico?id='+encodeURIComponent(p.id),{method:'DELETE'});
  const d=await r.json();
  if(!r.ok||!d.ok){alert('Erro ao excluir pedido arquivado: '+(d.error||JSON.stringify(d)));return;}
  await loadPedidos();
  renderHistoricoPedidos();
  await loadClientes();
}
function irPaginaHistorico(pagina){
  const total=Math.max(1, Number(window.__totalPaginasHistorico||1));
  state.historicoPagina=Math.min(Math.max(1, Number(pagina)||1), total);
  renderHistoricoPedidos();
}
function renderPaginacaoHistorico(totalPaginas,totalItens,inicio){
  const atual=state.historicoPagina;
  const porPagina=Number(state.historicoPorPagina||15);
  const inicioMostra=totalItens?inicio+1:0;
  const fimMostra=Math.min(inicio+porPagina,totalItens);
  return `<div class="client-pagination history-client-pagination"><span>Mostrando ${inicioMostra} a ${fimMostra} de ${totalItens} pedidos</span><div><button onclick="irPaginaHistorico(1)" ${atual===1?'disabled':''}>Primeira</button><button onclick="irPaginaHistorico(${atual-1})" ${atual===1?'disabled':''}>Anterior</button><b>${atual}</b><button onclick="irPaginaHistorico(${atual+1})" ${atual===totalPaginas?'disabled':''}>Próxima</button><button onclick="irPaginaHistorico(${totalPaginas})" ${atual===totalPaginas?'disabled':''}>Última</button></div><label>Itens por página:<select onchange="state.historicoPorPagina=Number(this.value);state.historicoPagina=1;renderHistoricoPedidos()"><option value="15" ${porPagina===15?'selected':''}>15</option><option value="30" ${porPagina===30?'selected':''}>30</option><option value="50" ${porPagina===50?'selected':''}>50</option><option value="100" ${porPagina===100?'selected':''}>100</option></select></label></div>`;
}
let historicoTimer=null;
function renderHistoricoPedidos(){
  clearTimeout(historicoTimer);
  historicoTimer=setTimeout(loadHistoricoPedidosServidor,120);
}
async function loadHistoricoPedidosServidor(){
  const out=document.getElementById('historicoPedidosOut');
  const resumo=document.getElementById('historicoPedidosResumo');
  if(!out && !resumo) return;
  const busca=(document.getElementById('historicoBusca')?.value||'').trim();
  if(busca!==state.historicoBuscaAtual){ state.historicoBuscaAtual=busca; state.historicoPagina=1; }
  const page=Number(state.historicoPagina||1);
  const perPage=Number(state.historicoPorPagina||15);
  if(out) out.innerHTML='<div class="empty-finance">Carregando histórico paginado...</div>';
  try{
    const url=`/api/historico?page=${page}&perPage=${perPage}&busca=${encodeURIComponent(busca)}&ts=${Date.now()}`;
    const r=await fetch(url,{cache:'no-store'});
    const d=await r.json();
    if(!r.ok||!d.ok) throw new Error(d.error||JSON.stringify(d));
    const lista=d.pedidos||[];
    const totalItens=Number(d.total||0);
    const totalPaginas=Math.max(1,Number(d.totalPages||Math.ceil(totalItens/perPage)||1));
    window.__totalPaginasHistorico=totalPaginas;
    if(state.historicoPagina>totalPaginas){ state.historicoPagina=totalPaginas; return renderHistoricoPedidos(); }
    const inicio=(state.historicoPagina-1)*perPage;
    if(resumo) resumo.innerHTML=`<div class="stat-card dark-stat"><div>📦</div><span>Pedidos no histórico</span><b>${totalItens}</b></div><div class="stat-card dark-stat"><div>💰</div><span>Valor arquivado</span><b>${brl(d.resumo?.valor_total||0)}</b></div><div class="stat-card dark-stat"><div>📄</div><span>Mostrando por página</span><b>${perPage}</b></div>`;
    if(out){
      if(lista.length){
        const paginacao=renderPaginacaoHistorico(totalPaginas,totalItens,inicio);
        out.innerHTML=`${paginacao}<div class="history-list">${lista.map(renderCardHistorico).join('')}</div>${paginacao}`;
      }else{
        out.innerHTML='<div class="empty-finance">Nenhum pedido no histórico ainda. Quando você zerar o relatório diário, os finalizados vão aparecer aqui.</div>';
      }
    }
  }catch(e){
    // Plano B: se a API nova ainda não subiu na Vercel, usa o cache local antigo para não deixar a aba quebrada.
    try{
      let lista=pedidosHistoricoRelatorio().sort((a,b)=>new Date(b.arquivado_em||b.created_at||0)-new Date(a.arquivado_em||a.created_at||0));
      const buscaLocal=(busca||'').toLowerCase();
      if(buscaLocal) lista=lista.filter(p=>[p.id,p.numero_pedido,p.cliente_nome,p.cliente_telefone,enderecoPedido(p),itensTexto(p.itens)].join(' ').toLowerCase().includes(buscaLocal));
      const total=lista.reduce((s,p)=>s+Number(p.valor_total||0),0);
      const totalPaginas=Math.max(1, Math.ceil(lista.length/perPage));
      window.__totalPaginasHistorico=totalPaginas;
      const inicio=(state.historicoPagina-1)*perPage;
      const pagina=lista.slice(inicio,inicio+perPage);
      if(resumo) resumo.innerHTML=`<div class="stat-card dark-stat"><div>📦</div><span>Pedidos no histórico</span><b>${lista.length}</b></div><div class="stat-card dark-stat"><div>💰</div><span>Valor arquivado</span><b>${brl(total)}</b></div><div class="stat-card dark-stat"><div>📄</div><span>Mostrando por página</span><b>${perPage}</b></div>`;
      if(out){
        const paginacao=renderPaginacaoHistorico(totalPaginas,lista.length,inicio);
        out.innerHTML=pagina.length?`${paginacao}<div class="history-list">${pagina.map(renderCardHistorico).join('')}</div>${paginacao}`:`<div class="err">Erro ao carregar histórico profissional: ${escapeHtml(e.message)}</div>`;
      }
    }catch(_){ if(out) out.innerHTML='<div class="err">Erro ao carregar histórico: '+escapeHtml(e.message)+'</div>'; }
  }
}

async function loadMotoboys(){
  const out=document.getElementById('motoboysOut');
  const ent=document.getElementById('motoboyEntregasOut');
  if(out) out.innerHTML='Carregando motoboys...';
  try{
    const r=await fetch('/api?route=motoboys&ts='+Date.now(),{cache:'no-store'});
    const d=await r.json();
    if(!r.ok||!d.ok) throw new Error(d.error||JSON.stringify(d));
    state.motoboys=d.motoboys||[];
    state.motoboyEntregas=d.entregas||[];
    renderMotoboys();
  }catch(e){ if(out) out.innerHTML='<div class="err">Erro ao carregar motoboys: '+e.message+'</div>'; if(ent) ent.innerHTML=''; }
}
function linkMotoboy(m){return location.origin+'/motoboy?token='+encodeURIComponent(m.token)+'&nome='+encodeURIComponent(m.nome||'Motoboy')}
function renderMotoboys(){
  const out=document.getElementById('motoboysOut');
  const ent=document.getElementById('motoboyEntregasOut');
  if(out){
    const rows=(state.motoboys||[]).map(m=>{
      const link=linkMotoboy(m);
      const msg=`🏍️ Big Burger - Área do Motoboy

Olá ${m.nome}, acesse seu painel pelo link abaixo e escaneie o QR Code da comanda para registrar a entrega:

${link}`;
      const wa=m.telefone?`https://wa.me/55${String(m.telefone).replace(/\D/g,'').replace(/^55/,'')}?text=${encodeURIComponent(msg)}`:'#';
      return `<tr><td><b>${escapeHtml(m.nome)}</b><br><small>${m.ativo?'Ativo':'Inativo'}</small></td><td>${escapeHtml(m.telefone||'')}</td><td><input readonly value="${escapeHtml(link)}" onclick="this.select()"></td><td class="client-actions"><a class="btn mini" target="_blank" href="${wa}">📲 Enviar link</a><button onclick='editarMotoboy(${JSON.stringify(m).replaceAll("'","&#39;")})'>✏️</button><button onclick="excluirMotoboy('${m.id}')">🗑️</button></td></tr>`;
    }).join('');
    out.innerHTML=rows?`<div class="client-table-wrap"><table class="table dark-table"><tr><th>Nome</th><th>WhatsApp</th><th>Link individual</th><th>Ações</th></tr>${rows}</table></div>`:'<p class="empty-finance">Nenhum motoboy cadastrado ainda.</p>';
  }
  if(ent){
    const rows=(state.motoboyEntregas||[]).map(e=>`<tr><td>${dataBR(e.created_at)}</td><td><b>${escapeHtml(e.motoboys?.nome||'')}</b></td><td>#${numeroPedido(e.pedidos||{})}</td><td>${escapeHtml(e.pedidos?.cliente_nome||'')}</td><td>${brl(e.pedidos?.valor_total||0)}</td><td>${brl(e.valor_entrega||0)}</td><td>${escapeHtml(e.status||'')}</td></tr>`).join('');
    ent.innerHTML=rows?`<table class="table dark-table"><tr><th>Hora</th><th>Motoboy</th><th>Pedido</th><th>Cliente</th><th>Total pedido</th><th>Entrega</th><th>Status</th></tr>${rows}</table>`:'<p class="empty-finance">Nenhum QR Code registrado hoje.</p>';
  }
}
async function salvarMotoboy(ev){
  ev.preventDefault();
  const id=motoboyId.value;
  const payload={nome:motoboyNome.value.trim(),telefone:motoboyTelefone.value.trim(),ativo:motoboyAtivo.checked};
  if(!payload.nome){alert('Informe o nome do motoboy.');return;}
  const r=await fetch('/api?route=motoboys'+(id?'?id='+encodeURIComponent(id):''),{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const d=await r.json();
  if(!r.ok||!d.ok){alert('Erro ao salvar motoboy: '+(d.error||JSON.stringify(d)));return;}
  limparMotoboyForm();
  if(motoboyStatus) motoboyStatus.innerHTML='✅ Motoboy salvo. Agora clique em “Enviar link”.';
  await loadMotoboys();
}
function limparMotoboyForm(){ if(typeof motoboyId==='undefined') return; motoboyId.value=''; motoboyNome.value=''; motoboyTelefone.value=''; motoboyAtivo.checked=true; }
function editarMotoboy(m){ motoboyId.value=m.id||''; motoboyNome.value=m.nome||''; motoboyTelefone.value=m.telefone||''; motoboyAtivo.checked=m.ativo!==false; abrirMain('motoboys'); window.scrollTo({top:0,behavior:'smooth'}); }
async function excluirMotoboy(id){ if(!confirm('Excluir este motoboy?')) return; const r=await fetch('/api?route=motoboys&id='+encodeURIComponent(id),{method:'DELETE'}); const d=await r.json(); if(!r.ok||!d.ok){alert('Erro: '+(d.error||JSON.stringify(d)));return;} await loadMotoboys(); }
async function zerarMotoboysDia(){
  if(!confirm('Zerar os registros dos motoboys do dia? Isso limpa os pedidos registrados por QR Code e reinicia as corridas para disponível.')) return;
  const r=await fetch('/api?route=motoboys',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'reset'})});
  const d=await r.json();
  if(!r.ok||!d.ok){alert('Erro ao zerar: '+(d.error||JSON.stringify(d)));return;}
  alert('Motoboys zerados com sucesso.');
  await loadMotoboys();
}



const bannerInicialPadrao={ativo:true,tipo:'video',media_url:'/bigburger-video.mp4',tag:'🔥 Feito na hora • entrega rápida',titulo:'O MELHOR BURGER DA CIDADE!',destaque:'BURGER',texto:'Ingredientes selecionados, sabor irresistível e Pix direto no pedido.',botao_texto:'PEÇA AGORA ›',selo:'🔥 BIG BURGER'};
function getBannerInicialLocal(){try{return JSON.parse(localStorage.getItem('bigburger_banner_inicial')||'null')}catch(e){return null}}
function setBannerInicialLocal(b){try{localStorage.setItem('bigburger_banner_inicial',JSON.stringify(b))}catch(e){}}
function renderBannerInicialForm(){
  const b={...bannerInicialPadrao,...(state.banner_inicial||{})};
  if(typeof banner_ativo!=='undefined') banner_ativo.checked=b.ativo!==false;
  if(typeof banner_tipo!=='undefined') banner_tipo.value=b.tipo==='imagem'?'imagem':'video';
  if(typeof banner_url!=='undefined') banner_url.value=b.media_url||'';
  if(typeof banner_tag!=='undefined') banner_tag.value=b.tag||'';
  if(typeof banner_titulo!=='undefined') banner_titulo.value=b.titulo||'';
  if(typeof banner_destaque!=='undefined') banner_destaque.value=b.destaque||'';
  if(typeof banner_texto!=='undefined') banner_texto.value=b.texto||'';
  if(typeof banner_botao!=='undefined') banner_botao.value=b.botao_texto||'';
  if(typeof banner_selo!=='undefined') banner_selo.value=b.selo||'';
  previewBannerInicial();
}
function dadosBannerInicialForm(){return {ativo:banner_ativo.checked,tipo:banner_tipo.value,media_url:banner_url.value.trim()||'/bigburger-video.mp4',tag:banner_tag.value.trim(),titulo:banner_titulo.value.trim(),destaque:banner_destaque.value.trim(),texto:banner_texto.value.trim(),botao_texto:banner_botao.value.trim(),selo:banner_selo.value.trim()};}
function previewBannerInicial(){
  const out=document.getElementById('bannerPreview'); if(!out || typeof banner_tipo==='undefined') return;
  const b={...bannerInicialPadrao,...dadosBannerInicialForm()};
  const media=b.tipo==='imagem'?`<img src="${escapeHtml(b.media_url)}" alt="Prévia">`:`<video src="${escapeHtml(b.media_url)}" autoplay muted loop playsinline></video>`;
  out.innerHTML=`<div class="banner-preview-card">${media}<span>${escapeHtml(b.selo||'🔥 BIG BURGER')}</span></div><h3>${escapeHtml(b.titulo||'')}</h3><p><b>${escapeHtml(b.tag||'')}</b></p><p>${escapeHtml(b.texto||'')}</p><button class="btn red" type="button">${escapeHtml(b.botao_texto||'PEÇA AGORA ›')}</button>`;
}
async function loadBannerInicial(){
  const out=document.getElementById('bannerStatus'); if(out) out.textContent='Carregando banner...';
  const local=getBannerInicialLocal(); if(local){state.banner_inicial=local;renderBannerInicialForm();}
  try{
    const r=await fetch('/api?route=site-banner&_='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
    const d=await r.json();
    if(!r.ok||!d.ok) throw new Error(d.error||JSON.stringify(d));
    state.banner_inicial=d.banner||bannerInicialPadrao;
    setBannerInicialLocal(state.banner_inicial);
    renderBannerInicialForm();
    if(out) out.innerHTML='✅ Banner carregado.';
  }catch(e){
    if(out) out.innerHTML=local?'✅ Banner carregado do navegador. ⚠️ Banco não respondeu: '+e.message:'<span class="err">Erro ao carregar banner: '+e.message+'</span>';
  }
}
async function salvarBannerInicial(e){
  e.preventDefault();
  const payload=dadosBannerInicialForm();
  state.banner_inicial=payload; setBannerInicialLocal(payload); previewBannerInicial();
  const out=document.getElementById('bannerStatus'); if(out) out.textContent='Salvando banner...';
  try{
    const r=await fetch('/api?route=site-banner&_='+Date.now(),{method:'POST',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},cache:'no-store',body:JSON.stringify(payload)});
    const d=await r.json();
    if(!r.ok||!d.ok) throw new Error(d.error||JSON.stringify(d));
    state.banner_inicial=d.banner||payload; setBannerInicialLocal(state.banner_inicial); renderBannerInicialForm();
    if(out) out.innerHTML='✅ Banner salvo! Atualize o cardápio para ver.';
  }catch(err){
    if(out) out.innerHTML='⚠️ Salvei neste navegador, mas o banco não confirmou. Execute supabase/site_banner.sql. Erro: '+err.message;
  }
}

loadPedidos();loadClientes();loadTudo();loadConfigLoja();loadBannerInicial();carregarConfigImpressora();loadMotoboys();
if(pedidosAutoRefreshTimer) clearInterval(pedidosAutoRefreshTimer);
pedidosAutoRefreshTimer=setInterval(()=>loadPedidos(true),5000);


// ================================
// CRONÔMETRO ENTREGA BIG BURGER
// ================================
function iniciarCronometroEntrega(idPedido, minutos=20){
  console.log('Cronômetro entrega iniciado:', idPedido, minutos);
  localStorage.setItem('cronometroEntrega_'+idPedido, Date.now());
}

// botão cancelar pedido
