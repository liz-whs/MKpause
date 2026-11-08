# mk connection: integração visual — 08/11/2026

## Alterações

A versão web usa o fundo creme, as superfícies claras, as cores de apoio e o texto marrom do MKpause. O tabuleiro roxo foi substituído por uma superfície clara com bordas em azul suave. Os temas alternativos também seguem a paleta, e os pontos mantêm símbolos para diferenciar as conexões além da cor.

As imagens da mascote vêm dos mesmos SVGs de emoção da interface: `calmo.svg` para orientação e `feliz.svg` para conclusão. A compilação rasteriza esses arquivos diretamente, sem redesenhar a personagem.

No computador, nível, orientação e controles ficam ao lado do tabuleiro. A página ocupa a largura disponível e o tabuleiro aproveita a altura da área de jogo. No celular, os elementos ficam em coluna. As medidas consideram a densidade do canvas para preservar o tamanho visual e a nitidez em telas de alta densidade.

O link “Terminar exercício” fica na barra superior direita. Não há mais botão de encerramento abaixo do mk connection. No uso livre ele retorna ao catálogo; na pausa guiada ele abre a avaliação final obrigatória.

As adaptações são aplicadas à cópia usada na compilação web, em `src/web/scripts/integrar-jogos.mjs` e `src/web/scripts/mkconnection-web.py`. As regras e os arquivos originais da versão desktop em `src/MKconnection` foram preservados.

## Verificação

- 225 testes da interface passaram, incluindo encerramento livre e avaliação final obrigatória na pausa guiada.
- 121 testes originais do jogo passaram.
- A cópia compilada foi desenhada em seis tamanhos de janela. Foram verificados limites do tabuleiro, ausência de sobreposição dos controles e correspondência entre células e coordenadas de interação.
- Chrome local carregou o jogo compilado, exibiu o novo desenho e confirmou o retorno ao catálogo. A conferência incluiu computador, janela de celular e densidades de pixels 1 e 2; não equivale a teste em aparelho físico.
- No computador de teste, a área do jogo ocupou 1376 × 816 pixels CSS. O encerramento permaneceu na barra superior.
- Compilação do jogo e build da aplicação concluídos.

Disponível localmente em http://localhost:5173/estudante/atividades/mkconnection, sem commit ou publicação em produção.


## Padronização das telas auxiliares

As telas de dificuldade, fases, temas, ajustes e conclusão foram adaptadas em `src/web/scripts/mkconnection-menus-web.py`, aplicado somente à cópia compilada para web. As regras de desbloqueio, os callbacks das configurações e o progresso continuam sendo os do jogo. Os títulos internos usam Fraunces em tamanho moderado; textos e controles usam Lexend. Foram retirados os grandes ícones decorativos dos títulos.

Os cards, espaçamentos, bordas, botões, prévias de temas e mensagens de conclusão seguem a paleta do MKpause. No celular, os temas ficam em coluna e as configurações acomodam rótulos e controles na largura disponível. Títulos longos reduzem o tamanho para caber.

O canvas solicita renderização com densidade mínima alvo de 2×, limitada a cinco milhões de pixels em telas maiores. O navegador reduz a imagem com suavização, em vez de ampliá-la como pixel art. Esse ajuste vale para o jogo e todas as telas auxiliares. A densidade efetiva pode ficar abaixo de 2× em telas muito grandes para limitar o custo da renderização.

A validação da cópia compilada incluiu cinco telas, três tamanhos de janela e duas densidades (30 combinações). Botões foram verificados dentro dos limites e sem sobreposição. A navegação em Chrome percorreu dificuldades, fases, temas e ajustes sem erros JavaScript e confirmou densidade interna de 2× na janela de teste. As capturas foram conferidas visualmente. Os 225 testes da interface, os 121 testes do jogo e o build passaram.

A versão atual também mantém o nome do jogo discreto na barra superior, sem o título grande acima do tabuleiro. Todas essas alterações continuam locais, sem publicação em produção.


## Encerramento padronizado das atividades

O componente `TerminarExercicio` centraliza a ação de encerramento na barra superior. Ele aparece nos jogos (incluindo todas as telas internas do mk connection), nos três vídeos e nas respirações em andamento. Os encerramentos duplicados na parte inferior dos players foram removidos. A ação tem fundo pêssego e contorno mesmo em repouso; hover e foco usam fundo marrom e texto claro.

O uso livre retorna ao catálogo. As sessões guiadas continuam exigindo humor final; no nível 3, o botão aparece durante a respiração e abre a avaliação final, sem cancelar o alerta nem dispensar avaliações.

Os 225 testes da interface passaram. Uma conferência no navegador verificou a presença de uma única ação nas sete atividades, sua disposição em 320 pixels de largura e a mudança de cores no hover. O build também passou. Alterações locais.
