ROBÔ WHATSAPP BIG BURGER - VERSÃO CORRIGIDA

O que esta versão faz:
- Envia mensagem automática quando o status do pedido muda para:
  em_preparo, pronto, em_entrega ou finalizado.
- Tem PLANO B local: mesmo se o SQL do whatsapp_status_enviado não estiver instalado, o robô busca pedidos recentes e envia sem depender do gatilho.
- Salva um arquivo status-enviados.json para não repetir a mesma mensagem.
- Tenta número com 9 e sem 9 quando o WhatsApp não encontra o cliente.

PASSO A PASSO:

1) Suba este ZIP atualizado na Vercel.

2) Na Vercel, confirme as variáveis:
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
BOT_SECRET=bigburger_robo_2026

3) No computador, entre na pasta robo-whatsapp-local.

4) Abra o arquivo .env e confira:
SITE_URL=https://big-burger-delivery.vercel.app
BOT_SECRET=bigburger_robo_2026
POLL_INTERVAL_SECONDS=5
FALLBACK_HORAS=72

5) Rode:
npm install
npm start

6) Escaneie o QR Code com o WhatsApp da Big Burger.

IMPORTANTE:
- Não feche o CMD, senão o robô para.
- Para testar, mude o status de um pedido no painel admin.
- O cliente precisa ter telefone salvo no pedido.
- Se quiser zerar os envios antigos, apague o arquivo status-enviados.json e ligue o robô de novo.
