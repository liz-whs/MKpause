# Cabeçalhos das atividades — 08/11/2026

As sete atividades usam o nome pequeno no canto superior esquerdo, com o componente `NomeAtividade`. Ele permanece visível no celular. Foram removidos os títulos grandes de respire & pause e piano pause; nos vídeos, o nome antes oculto passa a aparecer na barra superior. Os cabeçalhos de execução ocupam a largura da tela.

A seta de voltar não aparece nos players, seja no uso livre ou na pausa guiada. “Terminar exercício” continua no canto superior direito: volta ao catálogo no uso livre e abre a avaliação final obrigatória na pausa guiada. A respiração em andamento do nível 3 também usa o nome pequeno, sem dispensar avaliações nem cancelar alertas.

O retorno foi mantido nas etapas anteriores à execução (por exemplo, escolha de atividade) e nas telas internas de fases e ajustes dos jogos. Nesses lugares, ele permite corrigir uma escolha ou retornar à partida sem encerrá-la.

## Verificação

- 225 testes da interface e build passaram.
- Testes das sete atividades verificam nome visível, ausência de “Voltar” no player e encerramento com o destino correto.
- Chrome local conferiu os sete cabeçalhos em 320 e 1440 pixels de largura, incluindo posição no canto, fonte pequena e ausência de sobreposição ou rolagem horizontal.
- A barra reserva espaço para as ações, permitindo que nomes longos quebrem linha em telas pequenas.

Alterações locais, sem commit ou publicação em produção.


## Centro da respiração no nível 3

O nível 3 ainda posicionava o círculo abaixo do cabeçalho. Foi unificado com o palco fixo da atividade respire & pause, centralizado geometricamente na janela, independentemente dos avisos. O círculo do nível 3 também usa a escala fluida. Cabeçalho, alerta e avaliação final obrigatória permanecem no fluxo.

Chrome confirmou centro com desvio inferior a um pixel em 1440×900, 1920×1080, 390×844 e 320×740, na atividade livre e no nível 3, incluindo movimento reduzido. O envio de alerta foi simulado na resposta do navegador, sem gravação no banco. Encerramento do nível 3 continuou exigindo humor final. Os 56 testes dos fluxos estudantis/livres e o build passaram.
