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
