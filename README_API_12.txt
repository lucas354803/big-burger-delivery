BIG BURGER DELIVERY - VERSAO OTIMIZADA COM 12 APIs

Esta versao foi ajustada para ficar com apenas 12 arquivos dentro da pasta /api, para evitar problema de limite no deploy gratuito.

APIs mantidas:
1. admin-menu.js
2. admin.js
3. clientes.js
4. create-pix.js
5. menu.js
6. motoboys.js
7. order-status.js
8. pedidos.js
9. site-banner.js
10. store-settings.js
11. webhook.js
12. zerar-relatorio.js

O arquivo bot-health.js foi removido porque era apenas teste do robo.
O robo local agora testa a API usando /api/store-settings, sem criar uma API extra.

Pode subir este ZIP na Vercel normalmente.
