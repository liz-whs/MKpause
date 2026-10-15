**Português** · [English](./formas-e-mascote.en.md)

# Formas Arredondadas e Mascote

Este documento explica por que a interface do MKpause privilegia formas curvas e por que a chinchila foi adotada como mascote. A fundamentação principal é o estudo de Bar e Neta (2006) sobre a preferência humana por objetos curvos.

---

## O que diz a pesquisa

Bar e Neta (2006) apresentaram a participantes pares de imagens do mesmo objeto, um com contornos curvos e outro com contornos angulosos. Os participantes **preferiram os objetos curvos**.

A explicação proposta pelos autores é que contornos pontiagudos e ângulos agudos podem transmitir uma sensação de ameaça. Essa percepção, mesmo sem que a pessoa tenha consciência dela, gera um viés negativo em relação ao objeto anguloso.

Para o MKpause, a consequência é direta: em um momento de sobrecarga emocional, a interface não deve acrescentar sinais visuais de tensão.

---

## Formas na interface

O PianoPause, primeiro jogo da plataforma, aplica esse princípio:

| Elemento | Forma |
|---|---|
| Círculo de respiração guiada | Círculo com halo, que expande e contrai |
| Bolinhas decorativas | Círculos que flutuam ao fundo das telas de início e encerramento |
| Partículas | Pontos circulares soltos ao tocar uma tecla |
| Teclas e botões | Retângulos com cantos arredondados |

A animação de respiração também evita mudanças bruscas: o movimento segue uma curva cossenoidal, que começa e termina devagar, e o círculo cresce em frações de pixel para não "saltar" entre quadros. Os detalhes técnicos estão na [documentação do PianoPause](../../src/jogos/pianopause/README.md).

### Diretrizes para novas telas

1. Preferir cantos arredondados em botões, cartões e campos.
2. Evitar ícones e ilustrações com pontas agudas em destaque.
3. Usar círculos e curvas como elementos de apoio visual.
4. Manter transições suaves, sem movimentos bruscos.

---

## A chinchila como mascote

O MKpause adota uma **chinchila** como mascote. A escolha atende a critérios de design coerentes com o propósito da plataforma.

### 1. Silhueta arredondada

A chinchila tem corpo compacto, orelhas grandes e arredondadas e pelagem densa, que forma uma silhueta curva, sem pontas. Pelo estudo de Bar e Neta (2006), contornos assim tendem a ser percebidos como mais agradáveis e menos ameaçadores do que formas angulosas.

### 2. Associação com calma e acolhimento

É um animal pequeno, de aparência macia e sem associação com perigo. A representação transmite tranquilidade, que é o estado que a pausa busca promover.

### 3. Personagem não humano

Um personagem animal não representa idade, gênero, etnia ou aparência física de uma pessoa. Isso permite que qualquer estudante se relacione com o mascote, sem que ele represente um padrão específico.

### 4. Tom adequado ao público

O público principal são estudantes adolescentes. Um animal real, desenhado com traços simples, permite um tom acolhedor sem parecer infantil.

### Diretrizes para representar o mascote

- Manter a silhueta arredondada, sem contornos pontiagudos.
- Usar as cores da [paleta do MKpause](./paleta-de-cores.md), com predominância de tons claros e pouco saturados.
- Representar o mascote em expressões calmas e neutras.
- Não usar o mascote para comunicar estados emocionais que possam ser interpretados como avaliação do estudante, como tristeza ou reprovação.

---

## Limites desta fundamentação

- O estudo de Bar e Neta (2006) trata da preferência visual por objetos. Ele não avaliou mascotes nem interfaces digitais especificamente.
- A preferência por curvas é um fator entre vários. A aceitação do mascote pelo público deve ser verificada em testes com estudantes.

---

## Referência

BAR, M.; NETA, M. Humans prefer curved visual objects. *Psychological Science*, v. 17, n. 8, p. 645-648, 2006. DOI: [10.1111/j.1467-9280.2006.01759.x](https://doi.org/10.1111/j.1467-9280.2006.01759.x).

Lista completa em [Referências](./referencias.md).
