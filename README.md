# Big Burger Delivery + Rota Express

## Importante
A pasta precisa ser `api` minúscula.

## Variáveis obrigatórias na Vercel

- `SUPABASE_URL` = use somente o Project URL, exemplo: `https://xxxx.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = chave `sb_secret_...`
- `MP_TOKEN` = Access Token de produção do Mercado Pago

Opcional:
- `PUBLIC_BASE_URL` = https://big-burger-delivery.vercel.app

## Supabase
Copie tudo de `supabase/schema.sql` e rode no SQL Editor.

## Teste
Depois do deploy, abra:

`/api/debug`

Se aparecer `ok: true`, teste o pedido.
