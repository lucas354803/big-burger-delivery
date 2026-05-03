# Big Burger Delivery + Rota Express

## Passo 1 - Supabase
SQL Editor > rode `supabase/schema.sql`.

## Passo 2 - Vercel Environment Variables
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- MP_TOKEN

## Passo 3 - Teste
- /api/debug
- /api/create-pix pelo botão do site


Atualização: Aba 👥 Clientes no admin com registro automático por WhatsApp, quantidade de pedidos, total gasto e último endereço.

## WhatsApp automático
Configure na Vercel:

- WHATSAPP_TOKEN = token da Meta
- WHATSAPP_PHONE_NUMBER_ID = ID do número da Meta

Depois faça Redeploy. O envio automático acontece quando o status do pedido muda no admin.

## Robô WhatsApp local por CMD

Esta versão vem com a pasta `robo-whatsapp-local` integrada.

1. Suba este projeto no Vercel.
2. Na Vercel, adicione a variável: `BOT_SECRET=bigburger_robo_2026`.
3. No Supabase do Big Burger, rode `supabase/robo_whatsapp_status.sql`.
4. No computador, abra `robo-whatsapp-local/1 - INSTALAR DEPENDENCIAS.bat`.
5. Depois abra `robo-whatsapp-local/2 - LIGAR ROBO.bat`.
6. Escaneie o QR Code com o WhatsApp da Big Burger.

Quando o status do pedido mudar no Admin, o site salva no Supabase e o robô local envia a mensagem pelo WhatsApp.
