**Português** · [English](./README.en.md)

# Código-fonte

Este diretório reúne o código-fonte do MKpause.

---

## Estrutura

```text
src/
└── jogos/
    └── pianopause/
        ├── README.md
        └── main.py
```

| Diretório | Conteúdo |
|---|---|
| `jogos/` | Jogos de autorregulação, um diretório por jogo |
| `jogos/pianopause/` | PianoPause: jogo de teclas musicais com pausa para respiração guiada |

---

## Jogos

| Jogo | Tecnologia | Status | Documentação |
|---|---|---|---|
| PianoPause | Python 3.10+ e pygame-ce | Funcional, independente da plataforma | [README](./jogos/pianopause/README.md) |

---

## Convenções para novos jogos

1. Criar um diretório próprio em `jogos/`, com nome em letras minúsculas e sem espaços.
2. Incluir um `README.md` e um `README.en.md` com: autoria, como executar, fluxo de telas, controles, mecânica e limitações atuais.
3. Seguir as diretrizes de [Atividades de Autorregulação](../docs/07-fundamentacao/atividades-de-autorregulacao.md), da [Paleta de Cores](../docs/07-fundamentacao/paleta-de-cores.md) e de [Formas e Mascote](../docs/07-fundamentacao/formas-e-mascote.md).
4. Indicar os requisitos e regras de negócio atendidos (por exemplo, RF02 e RN08).

---

## Plataforma

A tecnologia da plataforma principal ainda está em definição. Quando a implementação começar, sua estrutura será documentada nesta página.
