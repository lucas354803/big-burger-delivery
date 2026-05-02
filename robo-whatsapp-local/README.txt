ROBÔ WHATSAPP LOCAL - BIG BURGER

1) Suba o projeto principal atualizado no Vercel.
2) No Vercel, coloque a variável:
   BOT_SECRET=bigburger_robo_2026
3) Rode no Supabase o arquivo:
   supabase/robo_whatsapp_status.sql
4) Entre nesta pasta robo-whatsapp-local.
5) Clique em: 1 - INSTALAR DEPENDENCIAS.bat
6) Clique em: 2 - LIGAR ROBO.bat
7) Escaneie o QR Code com o WhatsApp da Big Burger.

O robô não usa mais Supabase direto no CMD.
Ele conversa com o seu próprio site na Vercel.
Assim evita erro de URL, DNS e chave do Supabase no computador.

O CMD precisa ficar aberto para funcionar.


ATENDIMENTO AUTOMÁTICO ADICIONADO:
Quando alguém mandar mensagem no WhatsApp, o robô responde com menu:

1 - Ver cardápio e fazer pedido
2 - Horário de atendimento
3 - Taxa de entrega
4 - Formas de pagamento
5 - Falar com atendente

Você pode alterar textos no arquivo .env:
CARDAPIO_LINK
TAXA_ENTREGA_TEXTO
HORARIO_TEXTO
PIX_TEXTO
ATENDENTE_TEXTO
