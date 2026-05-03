ATUALIZAÇÃO: ZERAR RELATÓRIO + REINICIAR PEDIDOS #01

Agora, ao clicar em "Zerar relatório diário":
1. Os pedidos finalizados saem do painel e vão para o Histórico.
2. A próxima numeração de pedido volta para #01.

IMPORTANTE:
Antes de publicar, rode no Supabase o arquivo atualizado:

supabase/zerar_relatorio_historico.sql

Ele NÃO apaga cardápio, produtos, clientes nem pedidos.
Ele só adiciona campos de arquivamento, remove a trava UNIQUE antiga do numero_pedido e cria a função segura para reiniciar a sequência.
