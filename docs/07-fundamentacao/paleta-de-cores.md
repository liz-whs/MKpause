**Português** · [English](./paleta-de-cores.en.md)

# Paleta de Cores

Este documento explica como a paleta do MKpause foi construída e por que ela é adequada a uma plataforma de pausa e autorregulação. A fundamentação principal é o estudo de Valdez e Mehrabian (1994) sobre os efeitos da cor nas emoções.

---

## O que diz a pesquisa

Valdez e Mehrabian (1994) investigaram as reações emocionais a amostras de cor do sistema Munsell, separando os três atributos de uma cor:

| Atributo | Significado | No sistema Munsell |
|---|---|---|
| Matiz | A "família" da cor: azul, verde, vermelho etc. | *Hue* |
| Brilho | Quão clara ou escura a cor é | *Value* |
| Saturação | Quão intensa ou acinzentada a cor é | *Chroma* |

As reações foram medidas pelo modelo **Prazer-Excitação-Dominância** (*Pleasure-Arousal-Dominance*, PAD), que descreve um estado emocional em três dimensões:

- **Prazer:** o quanto a experiência é agradável;
- **Excitação:** o nível de ativação ou agitação;
- **Dominância:** a sensação de controle sobre a situação.

### Brilho e saturação

Brilho e saturação tiveram efeitos fortes e consistentes. Os autores resumiram esses efeitos em equações de regressão, em que **B** é o brilho e **S** é a saturação:

```text
Prazer      = 0,69 B + 0,22 S
Excitação   = -0,31 B + 0,60 S
Dominância  = -0,76 B + 0,32 S
```

Lendo os coeficientes:

- o **brilho** é o principal fator de prazer: cores mais claras foram avaliadas como mais agradáveis;
- a **saturação** é o principal fator de excitação: cores mais intensas foram mais estimulantes;
- o brilho tem peso **negativo** na excitação: cores claras tendem a ser menos agitadoras.

Para uma plataforma cujo objetivo é ajudar o estudante a desacelerar, a combinação desejada é **prazer alto e excitação baixa**. As equações apontam para cores **claras e pouco saturadas**, os chamados tons pastel.

### Matiz

O estudo também comparou as famílias de cor:

| Efeito | Matizes |
|---|---|
| Mais agradáveis | azul, azul-esverdeado, verde, vermelho-púrpura, púrpura, púrpura-azulado |
| Menos agradáveis | amarelo, verde-amarelado |
| Mais excitantes | verde-amarelado, azul-esverdeado, verde |
| Menos excitantes | púrpura-azulado, amarelo-vermelho |

---

## A paleta do MKpause

A tabela apresenta cada cor com medidas objetivas. **L\*** (luminosidade) e **C\*** (croma) vêm do espaço de cor CIELAB e funcionam como equivalentes de brilho e saturação: quanto maior o L\*, mais clara a cor; quanto maior o C\*, mais intensa. A família Munsell é uma aproximação calculada a partir do ângulo de matiz.

| Nome | Hex | L\* | C\* | Família Munsell aproximada | Uso no PianoPause |
|---|---|---:|---:|---|---|
| Peony | `#F7DDD5` | 90,0 | 10,5 | vermelho / amarelo-vermelho | Fundo de todas as telas |
| Lavender | `#CCC3D1` | 79,9 | 8,2 | púrpura / vermelho-púrpura | Círculo de respiração, linhas, nota Dó |
| Sky | `#AFB8CD` | 74,7 | 11,7 | púrpura-azulado | Centro do círculo, nota Mi |
| Leaf | `#C1BC77` | 75,2 | 36,5 | amarelo / verde-amarelado | Botão selecionado, nota Ré |
| Dusty Rose | `#D8A4AF` | 72,4 | 20,9 | vermelho-púrpura | Nota Sol |
| Grass | `#8D8B4C` | 56,7 | 34,9 | amarelo / verde-amarelado | Linha de toque, borda do tabuleiro |
| Jungle | `#65613F` | 40,7 | 20,4 | amarelo / verde-amarelado | Botões secundários |
| Cacao | `#594131` | 29,7 | 16,0 | amarelo-vermelho | Textos e botões principais |
| Cacao Hover | `#9D7D63` | 54,8 | 20,7 | amarelo-vermelho | Botões principais sob o cursor |

---

## Como a pesquisa se aplica

### 1. As superfícies grandes são claras e pouco saturadas

O fundo (Peony) é a cor que o estudante vê durante toda a sessão. Ele tem a maior luminosidade da paleta (L\* 90) e croma baixo (10,5). Pelas equações de Valdez e Mehrabian, essa combinação favorece prazer e reduz excitação.

Lavender e Sky, usadas no círculo de respiração, seguem o mesmo padrão: claras (L\* 75 a 80) e com o menor croma da paleta (8 a 12).

### 2. Os matizes centrais estão entre os mais agradáveis

Lavender (púrpura), Sky (púrpura-azulado) e Dusty Rose (vermelho-púrpura) pertencem às famílias avaliadas como mais agradáveis no estudo. Púrpura-azulado também está entre os matizes **menos excitantes**, o que reforça seu uso no centro do círculo de respiração.

O fundo, próximo da família amarelo-vermelho, fica em outra família classificada entre as menos excitantes.

### 3. As cores escuras têm função de leitura

Cacao e Jungle são escuras por necessidade: textos e botões precisam de contraste com o fundo. O documento de [Requisitos Não Funcionais](../02-requisitos/requisitos-nao-funcionais.md) exige contraste suficiente (RNF12).

Contraste medido pela fórmula da WCAG 2.1:

| Combinação | Contraste | Critério WCAG 2.1 |
|---|---:|---|
| Cacao sobre Peony | 7,31 : 1 | Atende AAA para texto comum (mínimo 7 : 1) |
| Jungle sobre Peony | 4,88 : 1 | Atende AA para texto comum |
| Branco `#FFFAF7` sobre Cacao (texto dos botões principais) | 9,11 : 1 | Atende AAA para texto comum |
| Branco `#FFFAF7` sobre Cacao Hover (botão principal sob o cursor) | 3,65 : 1 | Atende AA apenas para texto grande (mínimo 3 : 1) |
| Branco `#FFFAF7` sobre Jungle (texto dos botões secundários) | 6,08 : 1 | Atende AA para texto comum |
| Cacao sobre Leaf (botão selecionado) | 4,82 : 1 | Atende AA para texto comum |

### 4. Os tons verde-oliva são acentos

Leaf, Grass e Jungle pertencem à família amarelo / verde-amarelado, que o estudo classificou como **menos agradável** e, no caso do verde-amarelado, **mais excitante**. Por isso, essas cores devem continuar restritas a detalhes: botão selecionado, linha de toque, borda e botões secundários.

Elas cumprem uma função prática: diferenciam elementos interativos do fundo sem recorrer a cores saturadas como vermelho ou laranja vivos.

---

## Recomendações para a evolução da interface

1. Manter fundos e áreas grandes em tons claros e pouco saturados (L\* acima de 70 e C\* abaixo de 20, como referência).
2. Não aumentar a saturação dos tons verde-oliva nem usá-los como fundo de telas.
3. Usar Cacao para textos sobre fundos claros.
4. No estado hover (Cacao Hover), manter o texto dos botões em tamanho grande (pelo menos 18,66 px em negrito ou 24 px regular), já que o contraste com o texto branco é de 3,65 : 1. Como o hover é um estado temporário, que o usuário provoca ao apontar para o botão, esse valor é aceitável para texto grande.
5. Não comunicar informações apenas pela cor (RNF14). No PianoPause, cada coluna também tem uma nota sonora própria, o que já atende esse princípio.

---

## Limites desta fundamentação

- O estudo foi realizado com adultos em contexto de laboratório, com amostras de cor isoladas. Uma interface combina várias cores ao mesmo tempo.
- A conversão de hexadecimal para famílias Munsell é aproximada.
- A pesquisa orienta escolhas de design, mas não substitui testes de usabilidade com o público do MKpause.

---

## Referência

VALDEZ, P.; MEHRABIAN, A. Effects of color on emotions. *Journal of Experimental Psychology: General*, v. 123, n. 4, p. 394-409, 1994. DOI: [10.1037/0096-3445.123.4.394](https://doi.org/10.1037/0096-3445.123.4.394).

Lista completa em [Referências](./referencias.md).
