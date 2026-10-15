[Português](./README.md) · **English**

# Source Code

This directory contains the MKpause source code.

---

## Structure

```text
src/
└── jogos/
    └── pianopause/
        ├── README.md
        └── main.py
```

| Directory | Contents |
|---|---|
| `jogos/` | Self-regulation games, one directory per game |
| `jogos/pianopause/` | PianoPause: a musical-keys game with a guided-breathing pause |

---

## Games

| Game | Technology | Status | Documentation |
|---|---|---|---|
| PianoPause | Python 3.10+ and pygame-ce | Working, independent of the platform | [README](./jogos/pianopause/README.en.md) |

---

## Conventions for new games

1. Create a dedicated directory in `jogos/`, named in lowercase with no spaces.
2. Include a `README.md` and a `README.en.md` covering: authorship, how to run, screen flow, controls, mechanics and current limitations.
3. Follow the guidelines in [Self-Regulation Activities](../docs/07-fundamentacao/atividades-de-autorregulacao.en.md), [Color Palette](../docs/07-fundamentacao/paleta-de-cores.en.md) and [Shapes and Mascot](../docs/07-fundamentacao/formas-e-mascote.en.md).
4. State which requirements and business rules the game addresses (for example, RF02 and RN08).

---

## Platform

The technology for the main platform is still being defined. Its structure will be documented here once implementation begins.
