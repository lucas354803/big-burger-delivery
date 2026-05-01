# Big Burger Delivery + Rota Express

Projeto limpo para Vercel. Não renomeie a pasta `api`.

## Variáveis obrigatórias na Vercel

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MP_TOKEN`

Opcional:
- `PUBLIC_BASE_URL` = https://seu-site.vercel.app

## Supabase

Abra `supabase/schema.sql`, copie tudo e rode no SQL Editor do Supabase.

## Testes

Depois do deploy:

- `/api/debug` deve mostrar `ok: true`
- Página inicial: `/`
- Admin: `/admin.html`
- Motoboy: `/motoboy.html`

## Webhook Mercado Pago

Use:

`https://SEU-SITE.vercel.app/api/webhook`
