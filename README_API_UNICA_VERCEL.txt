BIG BURGER - API ÚNICA PARA VERCEL HOBBY

O projeto foi ajustado para não passar do limite gratuito da Vercel.

O que mudou:
- Agora existe apenas 1 função serverless dentro da pasta /api: api/index.js
- As APIs antigas foram movidas para /lib/api
- O arquivo vercel.json redireciona automaticamente as rotas antigas.

Você pode continuar usando normalmente:
/api/menu
/api/pedidos
/api/admin
/api/clientes
/api/motoboys
/api/store-settings
/api/site-banner
/api/webhook

A Vercel vai contar apenas 1 função: /api/index.js

Depois de enviar esse ZIP:
1. Faça o upload na Vercel.
2. Aguarde o deploy.
3. Se ainda der erro, apague os arquivos antigos do projeto na Vercel/GitHub e envie este ZIP limpo.
