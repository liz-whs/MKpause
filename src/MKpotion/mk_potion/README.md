# MK Potion

Jogo de organizar líquidos coloridos (estilo *Water Sort*) com exercício de respiração guiada, pensado como atividade complementar de autorregulação emocional em escolas. Feito em **Python 3 + Pygame**. Sem tempo, sem pontuação punitiva, sem ranking, sem coleta de dados pessoais.

## Instalação e execução

```bash
python -m venv .venv
# Windows:  .venv\Scripts\activate        Linux/macOS:  source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

No Visual Studio Code: abra a pasta `mk_potion`, selecione o interpretador da `.venv` e execute `main.py`.

## Controles

| Ação | Mouse | Teclado |
|---|---|---|
| Selecionar / desmarcar / transferir | Clique na garrafa (a área inteira ao redor conta) | Teclas `1`–`9` (o número aparece sob cada garrafa) |
| Desfazer | Botão "Desfazer" | `Z` ou `Backspace` |
| Reiniciar fase | Botão "Reiniciar" | `R` |
| Dica | Botão "Dica" (destaca "De" e "Para") | `H` |
| Respirar | Botão "Respirar" | `B` |
| Pausar | Botão "Pausa" | `Esc` ou `P` |
| Navegar nos botões | — | `Tab` / `Shift+Tab` e `Enter`/`Espaço` |

A janela pode ser redimensionada (mínimo 800×560).

## Regras

- Só o topo da garrafa de origem se move (todas as unidades consecutivas da mesma cor vão juntas, até caber).
- O destino precisa estar vazio ou ter a mesma cor no topo, e ter espaço livre.
- Garrafas completas não podem ser origem; passar uma garrafa de cor única para uma vazia é bloqueado (não ajudaria).
- Movimento inválido apenas não acontece, sem penalidade. Desfazer é ilimitado.
- A fase termina quando cada cor está em uma só garrafa.

## Acessibilidade

- Cada cor tem um **símbolo** (círculo, quadrado, triângulo, losango, estrela, cruz), então não depende só de cor.
- Configurações: sons (opcionais; o jogo funciona sem áudio), volume, animações reduzidas, ritmo da respiração, alto contraste e símbolos.
- Verificação automática de contraste entre as cores dos líquidos (`liquid.ensure_distinct`). Grass e Jungle (e Lavender/Sky) são parecidas, então a paleta de líquidos usa Rosa, Azul, Leaf, Cacao, Grass e Peony; Jungle e Lavender ficam para a interface.

## Estrutura

```
main.py                 ponto de entrada
data/levels.json        fases (dados independentes do código)
data/progress.json      progresso local (criado ao jogar)
game/game_logic.py      regras, GameSession (iniciar, mover, desfazer, reiniciar, dica, vitória)
game/hint_solver.py     solver A* ponderado (dicas e validação de fases)
game/level_generator.py geração reproduzível (seed) validada pelo solver
game/level_manager.py   carregar/validar fases e progressão
game/move_history.py    histórico do "Desfazer"
game/breathing.py       exercício de respiração (temporização por dt)
game/progress.py        progresso (JSON) separado da lógica
game/settings.py        configurações
game/liquid.py          paleta e verificação de contraste
game/bottle.py          garrafa (lógica) e desenho
game/ui.py              tema, fontes, ícones, botões
game/screens.py         telas e laço principal Pygame
game/game_state.py      estados/navegação da aplicação
game/sounds.py          sons suaves gerados por código
tools/generate_levels.py
tests/
```

Os módulos de lógica **não importam o Pygame**.

## Testes

```bash
python -m unittest discover -s tests -t . -v
```

Cobrem: transferências válidas/inválidas, capacidade, apenas o topo, vitória, desfazer, reiniciar, validade e solucionabilidade das 8 fases, dicas, progresso/configurações e o temporizador da respiração (sem bloqueio).

## Como adicionar fases

1. Edite `game/level_generator.py` e acrescente um item em `LEVEL_SPECS`
   (`id`, `name`, `colors` até 6, `bottles`, `target` = tamanho aproximado da solução).
2. Rode `python tools/generate_levels.py`. Ele testa várias sementes com o solver, escolhe uma solucionável perto da dificuldade e grava em `data/levels.json`.
3. Rode os testes. Para criar uma fase manualmente, edite `levels.json`: `bottles` lista as garrafas do fundo para o topo; cada cor deve ter exatamente `capacity` unidades e deve haver espaço livre. Fases inválidas são rejeitadas ao carregar.

Para mais de 6 cores, acrescente cores em `liquid.LIQUID_COLORS` (e `HIGH_CONTRAST_COLORS`) e aumente `MAX_COLORS` em `level_manager.py`.

## Adaptação futura para a web

O Pygame não roda no navegador como HTML comum. A arquitetura foi separada para facilitar a portagem:

- `game_logic.py`, `hint_solver.py`, `move_history.py` e `breathing.py` são Python puro com estados imutáveis (tuplas). Podem ser reescritos em JavaScript quase linha a linha, ou rodar no servidor atrás de uma API em PHP.
- `GameSession` já expõe a API necessária (`start_level`, `get_state`/`snapshot()` em formato JSON, `move`, `click`, `undo`, `restart`, `is_won`, `hint`).
- As fases estão em JSON; o front-end HTML/CSS/JS só precisa desenhar as garrafas e chamar essa API.
- `progress.py` é a única parte que grava dados: troque por uma classe com os mesmos métodos que fale com o PHP/banco da plataforma (apenas números de fases, nunca dados pessoais).
- Alternativa: empacotar com `pygbag` (Pygame via WebAssembly), o que exigiria testar `sounds.py` e o acesso a arquivos.


## Visual (estilo da chinchila)
- Cores da interface: tons da mascote (ameixa, rosa da orelha, bege da barriga) — veja `make_theme` em `game/ui.py`.
- Ícones e símbolos dos líquidos são imagens em `assets/images/icons/` e `assets/images/glyphs/` (brancas, o jogo pinta na cor certa).
  Para regenerar ou editar: `python tools/make_icons.py` (precisa do Pillow).
- A mascote fica em `assets/images/mascot_*.png`. Se algum arquivo de imagem faltar, o jogo usa o desenho simples antigo e continua funcionando.
