[Português](./README.md) · **English**

# MKpause Documentation

This directory contains the MKpause documentation, organized in the order the artifacts are produced: from understanding the problem to the rationale behind design decisions.

---

## Sections

| Section | Contents | Main documents |
|---|---|---|
| [01. Overview](./01-visao-geral/README.en.md) | The context, the problem and what the system sets out to do | [Context](./01-visao-geral/contexto.en.md), [Problem](./01-visao-geral/problema.en.md), [Objectives](./01-visao-geral/objetivos.en.md), [Scope](./01-visao-geral/escopo.en.md) |
| [02. Requirements](./02-requisitos/README.en.md) | What the system must do and under which rules | [Functional](./02-requisitos/requisitos-funcionais.en.md), [Non-Functional](./02-requisitos/requisitos-nao-funcionais.en.md), [Data](./02-requisitos/requisitos-de-dados.en.md), [Business Rules](./02-requisitos/regras-de-negocio.en.md), [Sources](./02-requisitos/fontes-de-informacao.en.md) |
| [03. Use Cases](./03-casos-de-uso/README.en.md) | Who interacts with the system, and how | [Actors](./03-casos-de-uso/atores.en.md), [Use Cases](./03-casos-de-uso/casos-de-uso.en.md) |
| [04. Data Modeling](./04-modelagem-de-dados/README.en.md) | How information is structured | [Conceptual Model](./04-modelagem-de-dados/modelo-conceitual.en.md), [Logical Model](./04-modelagem-de-dados/modelo-logico.en.md) |
| [05. Interface](./05-interface/README.en.md) | Screen principles, flows and prototypes | [Interface](./05-interface/README.en.md) |
| [06. Reports](./06-relatorios/README.en.md) | Reports and supplementary documents | [Reports](./06-relatorios/README.en.md) |
| [07. Scientific Rationale](./07-fundamentacao/README.en.md) | Why the system takes its current form | [Purpose](./07-fundamentacao/proposito.en.md), [Activities](./07-fundamentacao/atividades-de-autorregulacao.en.md), [Palette](./07-fundamentacao/paleta-de-cores.en.md), [Shapes and Mascot](./07-fundamentacao/formas-e-mascote.en.md), [References](./07-fundamentacao/referencias.en.md) |

---

## Suggested reading order

For readers new to the project:

1. [Overview](./01-visao-geral/README.en.md), to understand the problem;
2. [System Purpose](./07-fundamentacao/proposito.en.md), to understand the proposal and its rationale;
3. [Functional Requirements](./02-requisitos/requisitos-funcionais.en.md) and [Use Cases](./03-casos-de-uso/casos-de-uso.en.md), to understand how it works;
4. [Data Modeling](./04-modelagem-de-dados/README.en.md), to understand how information is structured.

---

## Traceability

The artifacts are connected:

```text
Information Sources and Scientific Rationale
        ↓
Requirements and Business Rules
        ↓
Use Cases
        ↓
Data Modeling
        ↓
Interface and Implementation
        ↓
Testing
```

Requirements, rules and use cases carry identifiers that link one document to another. The identifiers keep their original Portuguese prefixes in both languages:

| Prefix | Portuguese | English |
|---|---|---|
| `RF` | Requisito Funcional | Functional requirement |
| `RNF` | Requisito Não Funcional | Non-functional requirement |
| `RN` | Regra de Negócio | Business rule |
| `UC` | Caso de Uso | Use case |

---

## Conventions

- Every document is available in Portuguese (`file.md`) and English (`file.en.md`). Portuguese is the reference version.
- Changes to an artifact should be checked against related documents.
- Diagrams are kept in the `diagramas/` subdirectory of the corresponding section.
