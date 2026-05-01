# Big Burger Delivery + Rota Express

## Variáveis obrigatórias na Vercel

Coloque em **Settings > Environment Variables**:

```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=sb_publishable_xxxxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxx
MP_TOKEN=APP_USR-xxxxx
```

### Atenção no SUPABASE_URL
Use o **Project URL**, nesse formato:

```txt
https://fpqpmgmpbuqkfnomlas.supabase.co
```

Não cole o link do painel tipo `https://supabase.com/dashboard/project/...`.
Mesmo assim, essa versão tenta corrigir automaticamente caso você cole o link errado.

## Teste rápido
Depois do deploy, abra:

```txt
https://SEU-SITE.vercel.app/api/debug
```

Se aparecer `ok: true`, o Supabase está conectado.

## Webhook Mercado Pago
Configure no Mercado Pago:

```txt
https://SEU-SITE.vercel.app/api/mp-webhook
```

## Páginas

- Cliente: `/`
- Admin: `/admin`
- Motoboy: `/motoboy`
