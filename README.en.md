[Português](./README.md) · **English**

# MKpause

**MKpause** (*Make a Pause*) is a platform that supports **students' emotional self-regulation** in the school environment. It gives students a short, guided moment to recognize how they feel, complete a self-regulation activity and record how they feel afterwards.

The platform also supports follow-up by **teachers, school psychologists and clinical psychologists**, with access levels defined for each profile.

> Academic project developed in the **Software Engineering program at Pontifícia Universidade Católica do Paraná (PUCPR)**, Brazil.

---

## Goal

To provide an accessible, structured environment that helps students through moments of emotional overload at school.

In each session, students record how they feel, complete a supporting activity and record their state again at the end. This information makes it possible to follow each student's progress and identify situations that require attention from the responsible professionals.

MKpause is a **support** tool: it does not provide diagnoses, does not replace professional care and is not an emergency service.

---

## Scientific rationale

The project's main decisions are grounded in published research:

| Decision | Source |
|---|---|
| Slow-paced guided breathing, with professionals involved in the process | Bentley et al. (2023), systematic review |
| Simple, short games with no penalties | Pine et al. (2020), systematic review |
| Light, low-saturation color palette | Valdez & Mehrabian (1994) |
| Curved shapes in the interface and the mascot's rounded silhouette | Bar & Neta (2006) |
| A chinchilla as mascot: an animal that is easily stressed, like a student who needs a pause | Symbolic choice by the team |

The full analysis is in [Scientific Rationale](./docs/07-fundamentacao/README.en.md).

---

## Users

| Profile | Role |
|---|---|
| Student | Completes self-regulation sessions, records mood before and after, accesses activities, raises alerts and views their history |
| Teacher | Follows linked students, receives alerts and records notes |
| School Psychologist | Follows students within the school, receives alerts and records notes |
| Clinical Psychologist | Views the information needed for clinical follow-up, according to their permissions |
| Administrator | Manages users, links, follow-up records and content |

The **Guardian** is linked to the student after the initial registration, through an invitation.

---

## Main features

- authentication and access control by profile and by link;
- self-regulation sessions with mood recorded before and after;
- supporting activities: games, videos and breathing exercises;
- evaluation of the recorded state and alerts;
- notes recorded by school professionals;
- each student's session history;
- management of users, links, follow-up records and content.

---

## Self-regulation session

```text
Student starts a session
        ↓
Records initial mood
        ↓
System evaluates the recorded state
        ↓
Student completes a self-regulation activity
        ↓
Records mood after the activity
        ↓
System stores the session data
        ↓
Student history is updated
```

Depending on the state identified, the system may alert the professionals responsible for the student.

---

## Available activities

| Activity | Description | Documentation |
|---|---|---|
| PianoPause | A musical-keys game with no score and a guided-breathing pause | [PianoPause README](./src/jogos/pianopause/README.en.md) |

---

## Documentation

The full documentation is organized in [`docs/`](./docs/README.en.md).

| Section | Contents |
|---|---|
| [01. Overview](./docs/01-visao-geral/README.en.md) | Context, problem, objectives and scope |
| [02. Requirements](./docs/02-requisitos/README.en.md) | Functional, non-functional and data requirements, business rules and sources |
| [03. Use Cases](./docs/03-casos-de-uso/README.en.md) | Actors, use case specifications and diagram |
| [04. Data Modeling](./docs/04-modelagem-de-dados/README.en.md) | Conceptual and logical models |
| [05. Interface](./docs/05-interface/README.en.md) | Interface principles, flows, wireframes and prototypes |
| [06. Reports](./docs/06-relatorios/README.en.md) | Reports and supplementary documents |
| [07. Scientific Rationale](./docs/07-fundamentacao/README.en.md) | Research behind the purpose, activities, palette, shapes and mascot |

---

## Repository structure

```text
MKpause/
├── README.md
├── docs/
│   ├── 01-visao-geral/          Overview
│   ├── 02-requisitos/           Requirements
│   ├── 03-casos-de-uso/         Use cases
│   ├── 04-modelagem-de-dados/   Data modeling
│   ├── 05-interface/            Interface
│   ├── 06-relatorios/           Reports
│   └── 07-fundamentacao/        Scientific rationale
└── src/
    └── jogos/                   Games
        └── pianopause/
```

| Directory | Description |
|---|---|
| `docs/` | Requirements, modeling, interface and rationale documentation |
| `src/` | Application source code |
| `src/jogos/` | Self-regulation games, one directory per game |

Every document is available in Portuguese (`file.md`) and English (`file.en.md`). Directory and file names are in Portuguese, the project's working language.

---

## Technologies

| Component | Technology |
|---|---|
| PianoPause | Python 3.10+ and pygame-ce |
| Platform | To be defined |

---

## Project status

**In development.**

The project is in the requirements specification, system modeling and architecture definition stages. The first game, PianoPause, is already implemented and runs independently of the platform.

---

## Academic context

MKpause is developed as an academic project in the **Software Engineering program at PUCPR**, applying concepts from Requirements Engineering, Systems Modeling, Databases, User Experience and Software Development.
