# Big Burger Delivery + Rota Express

Sistema inicial para Big Burger com cardápio online, Pix Mercado Pago e liberação automática de corrida para motoboy.

## Rotas
- `/` cardápio do cliente
- `/admin.html` painel da lancheria
- `/motoboy.html` painel Rota Express

## Instalação
1. Crie um projeto no Supabase.
2. Rode o arquivo `supabase/schema.sql` no SQL Editor.
3. Suba o projeto na Vercel.
4. Configure as variáveis:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
   - `MP_TOKEN`
   - `PUBLIC_BASE_URL`

## Fluxo automático
Cliente cria pedido → sistema gera Pix → webhook Mercado Pago confirma → pedido fica pago → corrida aparece em `/motoboy.html`.

## Importante
Para produção, adicione login no admin/motoboy e regras de segurança mais fortes.
