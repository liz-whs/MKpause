# MKconnection

Jogo de raciocínio lógico visual da plataforma **MKpause** (autorregulação emocional para crianças e
adolescentes). O jogador conecta pontos da mesma cor desenhando caminhos em uma grade, sem cruzar
outros caminhos, no próprio ritmo: **sem cronômetro, sem pontos perdidos, sem mensagens de fracasso**.

É uma atividade educativa complementar de atenção e organização. Não é tratamento nem diagnóstico.

Feito em Python + Pygame, pensado para ser adaptado depois à plataforma web (HTML, CSS, JavaScript e PHP).
Tem a mesma identidade visual do jogo **MK Potion** (paleta MKpause, mascote chinchila, ícones e botões).

---

## 1. Como instalar e executar

Requisitos: **Python 3.9 ou mais novo**.

```bash
# (opcional, recomendado) ambiente virtual
python -m venv .venv
.venv\Scripts\activate            # Windows
source .venv/bin/activate         # Linux / macOS

pip install -r requirements.txt   # instala o pygame
python main.py                    # abre o jogo
```

### No Visual Studio Code
1. **Arquivo → Abrir Pasta…** e escolha a pasta `MKconnection`.
2. Instale a extensão **Python** (o VS Code sugere sozinho).
3. `Ctrl+Shift+P` → **Python: Select Interpreter** → escolha o do `.venv`.
4. No terminal do VS Code: `pip install -r requirements.txt`.
5. Abra `main.py` e clique em ▶ (**Run Python File**), ou use **Executar e Depurar** (F5) → *MKconnection: jogar*.

Se algo der errado, o jogo não fecha: volta ao menu, mostra o erro na parte de baixo e guarda os detalhes em
`erro_mkconnection.log` (ao lado de `main.py`).

## 2. Como jogar

| Ação | Como |
|---|---|
| Começar um caminho | clicar (ou tocar) em um ponto colorido e **arrastar** |
| Continuar | arrastar até a célula vizinha; o caminho segue o mouse |
| Voltar um passo | arrastar de volta pela célula anterior |
| Concluir | chegar ao outro ponto da mesma cor |
| Refazer uma conexão | clicar de novo em um dos pontos da cor (a conexão antiga é apagada) |
| Retomar de um ponto do caminho | clicar em qualquer célula dele; o resto é encurtado |
| Remover um caminho | clique com o botão direito sobre ele |
| Pedir ajuda | botão **Dica** (sem limite) |
| Voltar | botão **Voltar** ou tecla **Esc** |

Regras: só horizontal e vertical; sem diagonais, sem pular células; um caminho não passa sobre outro nem sobre pontos
de outra cor. A fase termina quando todos os pares estão conectados.

Telas: Menu → **Jogar** (próxima fase) / **Fases** (dificuldade → fases) / **Temas** / **Configurações**.
Dificuldades: **Fácil** 6×6, **Médio** 8×8 e **Difícil** 10×10, três fases cada (nove no total). Cada fase libera
a seguinte; o Médio libera depois das 3 fáceis e o Difícil depois das 3 médias.

## 3. Estrutura do projeto

```
MKconnection/
├─ main.py                  inicia o jogo
├─ requirements.txt
├─ game/
│  ├─ cell.py               células (linha, coluna), vizinhança, geometria do arraste        (lógica pura)
│  ├─ path.py               caminho de uma cor                                              (lógica pura)
│  ├─ board.py              tabuleiro: pontos, caminhos e ocupação das células              (lógica pura)
│  ├─ game_logic.py         regras: iniciar/continuar/desfazer/substituir/cancelar, vitória (lógica pura)
│  ├─ hint_solver.py        solucionador e dicas baseadas no estado real                    (lógica pura)
│  ├─ level_validator.py    valida estrutura, solução guardada e solucionabilidade          (lógica pura)
│  ├─ level_generator.py    gera fases reproduzíveis (sementes) e confere com o solucionador (lógica pura)
│  ├─ level_manager.py      carrega data/levels.json e só libera fases válidas; categorias   (lógica pura)
│  ├─ progress.py           progresso salvo em data/progress.json + regras de liberação      (lógica pura)
│  ├─ settings.py           paleta MKpause, cores dos caminhos, dimensões, configurações
│  ├─ themes.py             temas do tabuleiro (só aparência)                                (lógica pura)
│  ├─ game_state.py         telas e regras do botão "voltar"                                 (lógica pura)
│  ├─ ui.py                 tema da interface, fontes, ícones, botões, fundo, mascote        (Pygame)
│  ├─ board_view.py         desenho da grade e conversão mouse ↔ célula                      (Pygame)
│  ├─ screens.py            telas e laço principal                                           (Pygame)
│  └─ sounds.py             sons suaves sintetizados
├─ data/        levels.json (fases) · progress.json (progresso) · settings.json (configurações)
├─ assets/      images/ (ícones, símbolos, mascote) · fonts/ (opcional) · sounds/ (opcional)
├─ tools/       generate_levels.py · make_icons.py
└─ tests/       testes automatizados
```

A regra de ouro: **tudo que é regra do jogo funciona sem abrir janela** (arquivos marcados como "lógica pura").
Só `ui.py`, `board_view.py` e `screens.py` conhecem o Pygame.

### Identidade visual e paleta
A interface usa **a paleta oficial MKpause** (a mesma do MK Potion), em `game/settings.py` (`PALETTE_HEX`):

| Cor | Código | Onde aparece |
|---|---|---|
| Cacao | `#6B403B` | texto, títulos, botão principal (Jogar, Próximo) |
| Jungle | `#65613F` | texto de apoio |
| Peony | `#F7DDD5` | fundo (bem clarinho), botões secundários |
| Lavender | `#CCC3D1` | botões suaves, círculos do fundo, base do tabuleiro padrão |
| Sky | `#AFB8CD` | botão Fases, base do tabuleiro "Noite" |
| Dusty Rose | `#D8A4AF` | botão de Dica, patinhas e enfeites |
| Leaf | `#C1BC77` | folhinhas, acentos |
| Grass | `#8D8B4C` | tons de verde |

A paleta não tem branco nem um roxo escuro, então, onde faltou, seguimos a mesma linha: o fundo é um Peony bem
clarinho, o texto sobre cores escuras é um Peony quase branco, e o **tabuleiro** (que o projeto pede escuro, roxo ou azul
arroxeado) é uma versão escurecida de Lavender (tema Chinchila), Jungle (Jardim) ou Sky (Noite).

**Cores dos caminhos** (`PATH_COLORS`): cinco são os códigos exatos da paleta e duas são "cores próximas", porque a
paleta não tem 7 tons claros bem distintos para usar sobre um tabuleiro escuro:

| Caminho | Cor | Origem |
|---|---|---|
| Rosa | `#D8A4AF` | Dusty Rose (exata) |
| Azul | `#AFB8CD` | Sky (exata) |
| Folha | `#C1BC77` | Leaf (exata) |
| Pêssego | `#F7DDD5` | Peony (exata) |
| Grama | `#8D8B4C` | Grass (exata) |
| Lilás | `#CBABD5` | Lavender um pouco mais roxo: Lavender e Sky quase se confundem na tela |
| Cacau | `#AD796B` | Cacao clareado, mesmo matiz: o Cacao e o Jungle originais são escuros demais para o tabuleiro |

O modo **alto contraste** usa de propósito cores fora da paleta, para que fiquem bem afastadas entre si.

Os contrastes são conferidos por testes (`tests/test_palette.py`): texto sobre o fundo ≥ 7:1, rótulos dos botões ≥ 4:1 e
caminhos sobre o tabuleiro ≥ 3:1 em todos os temas e também no alto contraste; as cores dos caminhos também precisam
ser fáceis de distinguir entre si (diferença perceptual ΔE ≥ 18) e vir da paleta.

Outros pontos:
- Os pontos têm **contorno nítido e um símbolo** (coração, círculo, triângulo, quadrado, estrela, cruz, patinha): ninguém
  depende só da cor. A conexão em uso ganha um halo e um anel na ponta.
- Sem piscar, sem contagem regressiva, sem mensagens punitivas. A dica só "respira" devagar (parada em *Animações reduzidas*).
- Configurações: som, volume, animações reduzidas, **alto contraste** e símbolos nos pontos.
- Temas (**Chinchila**, **Jardim**, **Noite**): mudam só a aparência do tabuleiro e a decoração.
- A mascote é a mesma chinchila do MK Potion (é arte à parte, não faz parte da paleta de interface).

## 4. Como criar e adicionar novas fases

Cada fase é um objeto em `data/levels.json` (lista `"levels"`):

```json
{
  "id": 1, "category": "easy", "size": 6, "seed": 100003,
  "pairs": [ {"color": 0, "a": [0, 0], "b": [3, 2]}, {"color": 4, "a": [1, 1], "b": [4, 3]} ],
  "solution": { "0": [[0,0],[1,0],[2,0],[3,0],[3,1],[3,2]], "4": [[1,1],[1,2],[1,3],[2,3],[3,3],[4,3]] }
}
```

- Coordenadas são `[linha, coluna]`, começando em `[0, 0]` no canto superior esquerdo.
- `color` vai de 0 a 6 (cores e símbolos em `PATH_COLORS`, `game/settings.py`). Cada cor tem **exatamente dois** pontos.
- `solution` guarda um caminho por cor que liga os dois pontos, sem cruzar nem usar diagonais.
- As regras do projeto (tamanho e número de pares por nível) ficam em `LEVEL_RULES`, em `game/level_validator.py`.

**Opção A – gerar automaticamente** (recomendado; reproduzível por sementes):
ajuste `LEVEL_SPECS` em `game/level_generator.py` (tamanho, pares, comprimento dos caminhos, curvas, "taxa de atrapalho") e rode

```bash
python tools/generate_levels.py
```

A ferramenta gera cada fase a partir de uma solução, confere com o **validador** e com o **solucionador** e grava `data/levels.json`.
Se mudar as sementes, atualize `KNOWN_SEEDS` (a ferramenta avisa).

**Opção B – escrever à mão:** edite o JSON e valide:

```bash
python -c "import json; from game.level_validator import validate_all; print(validate_all(json.load(open('data/levels.json'))['levels'], check_solver=True) or 'tudo certo')"
```

O jogo **só disponibiliza fases válidas**: uma fase com problema é ignorada (e um aviso aparece no menu). Se o arquivo faltar ou
estiver corrompido, o jogo usa as fases padrão geradas pelas sementes.

## 5. Testes automatizados

```bash
python -m unittest discover -s tests -v
```

| Arquivo | O que verifica |
|---|---|
| `test_path_validation.py` | conexões válidas; bloqueio de cores diferentes, diagonais, saltos, cruzamentos e células ocupadas; geometria do arraste rápido |
| `test_game_logic.py` | liberação de células ao cancelar/substituir/retomar; detecção de fase concluída; salvar/restaurar; teste de estresse com 4.000 ações aleatórias |
| `test_levels.py` | as 9 fases são válidas e **solucionáveis**; regras por nível; geração reproduzível; carregamento seguro |
| `test_hint_solver.py` | solucionador; dicas úteis, seguras (nunca sugerem célula bloqueada) e rápidas; seguir as dicas termina a fase |
| `test_progress.py` | salvar e recuperar progresso; liberação das dificuldades; configurações |
| `test_navigation.py` | botão voltar / Esc em todas as telas |
| `test_ui_flow.py` | a interface com o Pygame real em modo sem janela: arrastar, vencer, Esc, dica, bloqueios, configurações, desenho em vários tamanhos (pulado se não houver Pygame) |
| `test_palette.py` | a interface usa os códigos exatos da paleta e mantém contraste suficiente em todos os temas |
| `test_screens_static.py`, `test_assets.py` | consistência do código das telas e presença dos ícones/símbolos |

## 6. Arquitetura e futura adaptação para a web

A lógica não depende do Pygame, então pode ser portada quase linha a linha para JavaScript. Mapa das funções pedidas:

| Função | Onde está |
|---|---|
| Carregar uma fase | `GameSession.load_level(level)` · `LevelManager` (lê o JSON) |
| Consultar o estado do tabuleiro | `session.board` · `session.snapshot()` (dicionário serializável em JSON) |
| Iniciar uma conexão | `GameSession.start_connection(cell)` |
| Adicionar um segmento | `GameSession.add_segment(cell)` · `follow_cells(cells)` (arraste) |
| Finalizar uma conexão | `GameSession.finish_connection()` |
| Cancelar ou substituir um caminho | `cancel_connection(cor)` · `start_connection` em um ponto já ligado |
| Consultar conexões concluídas | `GameSession.completed_connections()` |
| Solicitar uma dica | `GameSession.hint()` → `Hint(kind, message, color, cells)` |
| Verificar a vitória | `GameSession.is_won()` |
| Registrar o progresso | `ProgressStore.mark_completed(id)` (hoje JSON local) |

Plano para a web: a interface vira HTML/CSS/JavaScript (um `<canvas>` ou SVG usando `board_view.py` como roteiro e as mesmas
imagens de `assets/`); as regras são portadas de `game_logic.py`/`hint_solver.py`; os níveis continuam em JSON; e o PHP só
cuida de entregar o JSON e de gravar o progresso, substituindo `ProgressStore` (mesma interface: `mark_completed`,
`is_level_unlocked`, `next_to_play`...). Nenhuma integração com PHP ou banco de dados foi feita nesta etapa.

## 7. Detalhes de implementação úteis
- **Dicas**: o solucionador (busca com poda, primeiro caminhos compactos) usa só o estado real; caminhos concluídos ficam fixos e
  os incompletos contam como ocupados. Tempo máximo de 0,45 s por dica; se acabar, dá uma orientação calma sem sugerir movimento.
- **Arraste rápido**: `cells_along_segment` percorre a linha entre dois pontos do mouse; movimento ambíguo (passa pelo canto) é ignorado.
- **Progresso**: gravado de forma atômica em `data/progress.json` (só números de fases e o tema). Não há dados pessoais.
- Para apagar o progresso: apague `data/progress.json`.
