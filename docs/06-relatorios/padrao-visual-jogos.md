# Integração visual dos jogos — 06/11/2026

PianoPause, MK Potion e MKconnection abrem diretamente na atividade dentro da pausa, sem a tela inicial independente com os botões Jogar/Fases/Temas/Configurações.

O título e uma instrução breve aparecem na própria interface do MKpause, com a mesma apresentação nos três jogos. As fontes são Fraunces nos títulos e Lexend nos textos e controles; o fundo é creme `#F6EFE4` e o texto principal cacau `#594131`. Os controles do MK Potion e MKconnection passam a usar o acabamento plano do sistema, sem sombra de botão em relevo.

O MKconnection mantém Fases, Temas, Ajustes e Dica em uma barra durante o jogo. No MK Potion, Ajustes fica disponível durante a fase e Fases pode ser acessado pela pausa do jogo. Retornar dessas opções não abre a antiga tela inicial. O PianoPause mantém Pausar/Continuar; encerrar a sessão usa o botão Terminei do site, sem outra tela interna de encerramento. Seu pré-carregamento não avança a atividade enquanto o iframe está oculto.

As adaptações ficam em `src/web/scripts/integrar-jogos.mjs` e são aplicadas nas cópias temporárias pelos três scripts de compilação. Os arquivos originais dos jogos desktop permanecem preservados. Para recompilar, execute `build:pianopause`, `build:mkpotion` e `build:mkconnection` em `src/web`, com Python/pygbag configurados.

## Verificação

- 179 testes da interface aprovados e build de produção concluído.
- Três jogos recompilados com pygbag; código Python dos pacotes verificado.
- Conferência no Chrome em 1280 × 850 e 390 × 844: entrada direta, fontes, controles e adaptação à tela.
- MKconnection: fase 1 concluída por arraste no tamanho de celular, com progresso persistido.
- MK Potion e MKconnection: simulação do pacote compilado para entrada direta, desenho no tamanho de celular, acesso aos ajustes e retorno ao jogo.

Alterações locais; este ajuste não publica nem envia commits automaticamente.
