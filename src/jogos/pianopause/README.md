# PianoPause

O **PianoPause** é um dos jogos de autorregulação do MKpause. O estudante toca, no seu próprio ritmo, teclas coloridas que descem pela tela, e cada toque produz uma nota suave. A qualquer momento é possível pausar e fazer uma **respiração guiada**.

O jogo não tem pontuação, erro, derrota nem contagem regressiva visível: a proposta é desacelerar, e não competir.

> Atende ao requisito [RF02 — Acessar atividades e jogos](../../../docs/02-requisitos/requisitos-funcionais.md) e à regra [RN08 — Realização da atividade](../../../docs/02-requisitos/regras-de-negocio.md).

## Autoria

| Parte | Quem |
|---|---|
| Criação do jogo: conceito, mecânica, melodias, sons e código original | **Ana Beatriz Patussi** ([@anaapatussi-prog](https://github.com/anaapatussi-prog)) |
| Animação mais fluida da respiração guiada, movimento das bolinhas decorativas e esta documentação | **Giovanna Ribas dos Reis** ([@ribasgiovanna](https://github.com/ribasgiovanna)) |

O código do jogo entrou no repositório pelo PR #1, aberto pela Giovanna, por isso o histórico de commits não mostra a autoria da Ana Beatriz. Esta seção registra o crédito.

---

## Como executar

Requisitos: **Python 3.10+** e **pygame-ce**.

```bash
pip install pygame-ce
python main.py
```

O laço principal é assíncrono (`async def main()` com `await asyncio.sleep(0)`), formato compatível com ferramentas que empacotam jogos pygame para o navegador, como o **pygbag**.

---

## Fluxo de telas

```text
Início ──(Começar)──► Jogando ──(Pausar / Esc)──► Respiração guiada
  ▲                     │  ▲                          │
  │                     │  └─────(Continuar / Esc)────┘
  │                     │                             │
  │              (Encerrar ou 2 min)            (Encerrar)
  │                     ▼                             │
  └──(Voltar ao início)─ Final ◄──────────────────────┘
                          │
                          └──(Jogar novamente)──► Jogando
```

| Estado      | Tela              | O que acontece                                                                 |
|-------------|-------------------|--------------------------------------------------------------------------------|
| `inicio`    | Início            | Escolha do ritmo (**Lento** ou **Moderado**) e botão **Começar**. Bolinhas decorativas flutuam ao fundo. |
| `jogando`   | Jogo              | Teclas descem em 4 colunas. Tocar uma tecla toca a nota e solta partículas.     |
| `pausado`   | Respiração guiada | Círculo que expande ("Inspire") e contrai ("Expire"). O tempo de jogo fica parado. |
| `final`     | Encerramento      | Mensagem de acolhimento, tempo dedicado e opções de jogar novamente ou voltar.  |

As trocas de tela usam um esmaecimento curto (`opacidade_transicao`).

---

## Controles

| Ação                         | Mouse / toque                 | Teclado |
|------------------------------|-------------------------------|---------|
| Tocar uma tecla              | Clicar/tocar na tecla         | —       |
| Pausar (respiração guiada)   | Botão **Pausar**              | `Esc`   |
| Voltar ao jogo               | Botão **Continuar**           | `Esc`   |
| Encerrar a sessão            | Botão **Encerrar**            | —       |

O jogo trata tanto `MOUSEBUTTONDOWN` quanto `FINGERDOWN`, então funciona em telas sensíveis ao toque.

---

## Mecânica

### Ritmos

| Ritmo        | Velocidade das teclas | Tempo base entre teclas |
|--------------|-----------------------|-------------------------|
| **Lento**    | 105 px/s              | 1,15 s                  |
| **Moderado** | 155 px/s              | 0,85 s                  |

O intervalo real entre uma tecla e a próxima é `tempo base × duração da nota` (1 ou 2 tempos), o que dá à sequência uma cadência de música.

### Melodias

As teclas seguem três frases musicais fixas (`MELODIAS`), tocadas em sequência e em ciclo. Cada coluna corresponde a uma nota:

| Coluna | Nota | Frequência | Cor        |
|--------|------|------------|------------|
| 0      | Dó   | 261,63 Hz  | Lavender   |
| 1      | Ré   | 293,66 Hz  | Leaf       |
| 2      | Mi   | 329,63 Hz  | Sky        |
| 3      | Sol  | 392,00 Hz  | Dusty Rose |

Os sons são **gerados pelo próprio código** (`criar_sons()`): uma onda senoidal com um harmônico leve e envelope de ataque e decaimento suaves. Não há arquivos de áudio. Se o áudio não puder ser iniciado, o jogo continua funcionando em silêncio.

### Sem penalidade

- Uma tecla que chega à linha verde sem ser tocada apenas se desfaz em partículas.
- O contador mostra só **quantas notas foram tocadas**, nunca erros.
- A sessão termina sozinha após **2 minutos** (`DURACAO = 120`) ou quando o estudante escolhe **Encerrar**.

---

## Respiração guiada

Ao pausar, o jogo mostra um círculo que acompanha um ciclo de **8 segundos**:

```text
0 s ──── Inspire (expande) ──── 4 s ──── Expire (contrai) ──── 8 s
```

- O movimento usa uma curva cossenoidal (`suavizado`), que começa e termina devagar, como uma respiração natural.
- O tamanho varia entre `ESCALA_MINIMA` (0,75) e `ESCALA_MAXIMA` (1,15) dos raios base (`RAIO_EXTERNO = 100`, `RAIO_INTERNO = 70`).
- Um halo externo fica mais visível ao inspirar e mais transparente ao expirar.
- O ciclo sempre recomeça em "Inspire" ao entrar na pausa.

### Por que o círculo é desenhado assim

A função `desenhar_circulo_fluido()` desenha os círculos com **raio fracionário**: a parte inteira do raio vira o círculo, e a parte decimal vira uma borda semitransparente. Assim o círculo cresce em frações de pixel e a animação não fica "em degraus".

Uma versão anterior redimensionava uma imagem a cada quadro (`smoothscale`). Isso deixava o movimento travado, fazia o centro tremer e era pesado no navegador. O jogo usa `pygame.gfxdraw` quando disponível; sem ele, o jogo recorre a `pygame.draw.circle`, com movimento menos suave.

---

## Identidade visual

O jogo usa a paleta do MKpause:

| Nome       | Constante  | Hex       | Uso principal                         |
|------------|------------|-----------|---------------------------------------|
| Lavender   | `LAVENDER` | `#CCC3D1` | Nota Dó, círculo de respiração, linhas |
| Leaf       | `LEAF`     | `#C1BC77` | Nota Ré, botão em destaque/selecionado |
| Grass      | `GRASS`    | `#8D8B4C` | Linha de toque e borda do tabuleiro   |
| Jungle     | `JUNGLE`   | `#65613F` | Botões secundários                    |
| Sky        | `SKY`      | `#AFB8CD` | Nota Mi, centro do círculo            |
| Cacao      | `CACAO`    | `#6B403B` | Textos e botões principais            |
| Peony      | `PEONY`    | `#F7DDD5` | Fundo de todas as telas               |
| Dusty Rose | `ROSE`     | `#D8A4AF` | Nota Sol                              |

A janela tem **480 × 720 px** (formato retrato, pensado para celular e tablet).

---

## Organização do código

Todo o jogo está em [`main.py`](./main.py).

| Parte                     | Funções / constantes                                                       |
|---------------------------|----------------------------------------------------------------------------|
| Configuração              | `LARGURA`, `ALTURA`, cores, fontes, `DURACAO`, `VOLUME_FIXO`               |
| Áudio                     | `frequencias`, `criar_sons()`                                              |
| Melodia e teclas          | `MELODIAS`, `obter_proxima_nota()`, `criar_tecla()`, `tocar_tecla()`       |
| Partículas                | `criar_particulas()`, `atualizar_particulas()`, `desenhar_particulas()`    |
| Respiração guiada         | `desenhar_circulo_fluido()`, `desenhar_pausa()`                            |
| Bolinhas decorativas      | `BOLHAS_INICIO`, `BOLHAS_FINAL`, `criar_bolha()`, `desenhar_bolhas()`      |
| Telas                     | `desenhar_inicio()`, `desenhar_jogo()`, `desenhar_pausa()`, `desenhar_final()` |
| Interface                 | `texto()`, `botao()`, `desenhar_check()`, `desenhar_nota_musical()`        |
| Estado e entrada          | `mudar_estado()`, `iniciar_jogo()`, `clique()`                             |
| Laço principal            | `main()`                                                                   |

### Ajustes mais comuns

| Quero mudar…                         | Onde                                                     |
|--------------------------------------|----------------------------------------------------------|
| Duração da sessão                    | `DURACAO`                                                |
| Volume                               | `VOLUME_FIXO`                                            |
| Velocidade de cada ritmo             | `velocidade` e `tempo_base` em `main()` e `iniciar_jogo()` |
| Melodias                             | `MELODIAS` (pares `(coluna, duração)`)                   |
| Ritmo da respiração                  | o ciclo de `8.0` s e o limite de `4.0` s em `desenhar_pausa()` |
| Tamanho do círculo de respiração     | `ESCALA_MINIMA`, `ESCALA_MAXIMA`, `RAIO_EXTERNO`, `RAIO_INTERNO` |
| Movimento das bolinhas decorativas   | amplitude, velocidade e fase em `BOLHAS_INICIO` / `BOLHAS_FINAL` |

> As áreas de clique dos botões em `clique()` usam as mesmas coordenadas passadas para `botao()`. Ao mover um botão, atualize os dois lugares.

---

## Limitações atuais

- **Sem integração com a plataforma:** o jogo ainda não registra humor inicial/final (RF04, RF06), não salva a sessão (RF05) e não emite alertas. Ele roda de forma independente.
- **Alguns textos estão sem acento** (por exemplo, "Comecar", "competicao", "Voce"). A fonte usada exibe acentos normalmente (a tela de respiração já mostra "respiração"), então eles podem ser corrigidos.
- **Apenas o Nível 1** está implementado.
