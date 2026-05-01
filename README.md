# Big Burger Delivery + Rota Express

Sistema inicial para Big Burger com cardápio online, Pix Mercado Pago e liberação automática de corrida para motoboy.

## Rotas
- `/` cardápio do cliente
- `/admin.html` ou `/admin` painel da lancheria
- `/motoboy.html` ou `/motoboy` painel Rota Express

## Instalação
1. Crie um projeto no Supabase.
2. Rode o arquivo `supabase/schema.sql` no SQL Editor.
3. Suba o projeto na Vercel.
4. Configure as variáveis:
   - `SUPABASE_URL` = URL do projeto Supabase, começa com `https://`
   - `SUPABASE_SERVICE_ROLE_KEY` = chave secreta `sb_secret_...`
   - `SUPABASE_ANON_KEY` = chave pública `sb_publishable_...`
   - `MP_TOKEN` = Access Token de produção do Mercado Pago, começa com `APP_USR-`
   - `PUBLIC_BASE_URL` = opcional. Exemplo: `https://big-burger-delivery.vercel.app`

## Webhook Mercado Pago
Use uma destas URLs:
- `https://SEU-SITE.vercel.app/api/mp-webhook`
- `https://SEU-SITE.vercel.app/api/webhook`

## Correção feita nesta versão
- Corrigida a geração do Pix quando `PUBLIC_BASE_URL` não está configurado.
- Adicionada rota `/api/webhook` além de `/api/mp-webhook`.
- Simplificado `vercel.json` para não quebrar as rotas `/api`.

## Fluxo automático
Cliente cria pedido → sistema gera Pix → webhook Mercado Pago confirma → pedido fica pago → corrida aparece em `/motoboy.html`.
