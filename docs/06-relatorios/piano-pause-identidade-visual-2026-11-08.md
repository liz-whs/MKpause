# piano pause: identidade visual — 08/11/2026

O piano pause foi adaptado ao padrão do mk connection e do mk potion. O nome fica discreto no topo esquerdo e o encerramento permanece destacado no topo direito. Foram retiradas a introdução repetida e a orientação de fones abaixo do jogo.

A área do piano ocupa o espaço disponível, com cores, fontes e mascote do MKpause. No computador, informações e controles ficam ao lado do teclado; no celular, acima e abaixo. O canvas considera a densidade da tela para melhorar a nitidez, com limite de cinco milhões de pixels internos.

A pausa congela a partida e apresenta um play branco transparente no centro. Os ajustes permitem escolher o ritmo e ligar ou desligar o som, preservando as notas. Redimensionar a janela não recarrega o jogo, e o deslocamento das notas acompanha proporcionalmente o tamanho do tabuleiro para manter o ritmo.

As adaptações são aplicadas à cópia compilada para web por `src/web/scripts/pianopause-web.py`, `integrar-jogos.mjs` e `build-pianopause.mjs`. Os arquivos originais de `src/jogos/pianopause` foram preservados. O encerramento retorna ao catálogo no uso livre e à avaliação final no fluxo guiado.

## Verificação

- 226 testes da interface passaram, incluindo um teste que confirma a preservação do iframe ao mudar entre computador e celular.
- Compilação do jogo e build da aplicação concluídos.
- A cópia compilada foi verificada em 32 combinações de estado, tamanho de janela e densidade de tela.
- Verificadas as ações de tocar notas, pausar, continuar, mudar ritmo e som e retornar dos ajustes sem perder a partida.
- No Chrome local, o clique respondeu, a pausa congelou a imagem, o play continuou a partida, o redimensionamento não recarregou o jogo e o encerramento retornou ao catálogo. Sem erros JavaScript registrados. Não houve teste em aparelho físico.

Disponível em http://localhost:5173/estudante/atividades/pianopause. Alterações locais, sem commit ou publicação em produção.


## Revisão do áudio

O áudio da versão web usa quatro notas pré-renderizadas de dó maior (dó, mi, sol e dó na oitava superior), com timbre harmônico suave, ataque de 22 ms e final gradual. A sequência de colunas e as regras do jogo permanecem iguais. A síntese é determinística, sem componente de ruído aleatório. Os arquivos são gerados em PCM a 44,1 kHz e convertidos para Ogg Vorbis de alta qualidade, formato compatível com pygbag. O carregamento interpreta o formato do arquivo, em vez de receber somente bytes PCM sem cabeçalho.

O mixer web solicita 44,1 kHz, estéreo e buffer de 1024 amostras. O ganho das amostras e o volume reservam margem para oito vozes simultâneas. Os originais do jogo continuam preservados; o gerador é `src/web/scripts/pianopause-audio.py` e a alteração se aplica à cópia web.

Os quatro arquivos extraídos do APK foram decodificados e verificados quanto à frequência fundamental, duração, transições nas extremidades, energia de alta frequência e margem contra saturação em oito vozes alinhadas. Carregamento pelo pygame e build da aplicação aprovados. Agradabilidade continua sendo uma avaliação subjetiva de escuta.


A reprodução foi confirmada no Chrome por um analisador Web Audio conectado à saída do jogo após tocar uma nota, com pico observado de 0,0649. A verificação também aprovou clique, pausa, continuação, ajustes, redimensionamento sem recarga e encerramento, sem erros JavaScript. O carregador `pianopause-audio-web.py` importa apenas os arquivos prontos; o gerador com a biblioteca wave não é empacotado para execução no navegador.
