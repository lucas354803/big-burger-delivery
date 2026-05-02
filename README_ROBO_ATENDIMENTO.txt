ROBÔ WHATSAPP BIG BURGER - VERSÃO CORRIGIDA HTTP 404

O erro HTTP 404 acontecia porque o robô chamava rotas da Vercel que não estavam no deploy atual.

ARQUIVOS CORRIGIDOS/ADICIONADOS:
- api/bot-health.js
- api/bot-whatsapp-pending.js
- api/bot-whatsapp-mark.js
- api/pedidos.js
- package.json com type=module para as APIs funcionarem corretamente na Vercel
- robo-whatsapp-local/bot.js com teste de API e mensagem clara de erro

PASSO CERTO:
1. Suba TODO este projeto novamente na Vercel.
2. Na Vercel, confirme as variáveis:
   SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY
   BOT_SECRET=bigburger_robo_2026
3. Abra no navegador:
   https://big-burger-delivery.vercel.app/api/bot-health
4. Se aparecer {"ok":true}, pode abrir o robô.
5. Dentro da pasta robo-whatsapp-local, rode:
   npm install
   npm start

Se /api/bot-health ainda der 404, a Vercel ainda está com o projeto antigo. Refaça o deploy com este ZIP inteiro.
