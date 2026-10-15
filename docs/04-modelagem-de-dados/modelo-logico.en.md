[Português](./modelo-logico.md) · **English**

# Logical Model

The **MKpause** logical model represents the transformation of the conceptual model into a structure compatible with relational databases.

This stage defines:

- tables;
- attributes;
- primary keys (PK);
- foreign keys (FK);
- relationships;
- associative tables;
- structural constraints.

The logical model serves as the basis for the future physical model and the database implementation.

Table and key names are kept in Portuguese, as they will appear in the database. The table below lists their meaning.

| Table | Meaning |
|---|---|
| `ESTUDANTE` | Student |
| `PROFESSOR` | Teacher |
| `PSICOLOGO_ESCOLAR` | School psychologist |
| `PSICOLOGO_CLINICO` | Clinical psychologist |
| `RESPONSAVEL` | Guardian |
| `ADMINISTRADOR` | Administrator |
| `SESSAO` | Session |
| `REGISTRO_HUMOR` | Mood record |
| `ATIVIDADE` | Activity |
| `ALERTA` | Alert |
| `OBSERVACAO` | Note |
| `FICHA_ACOMPANHAMENTO` | Follow-up record |
| `AVISO` | Announcement |

---

## Conventions

The following abbreviations are used in this documentation:

| Abbreviation | Meaning |
|---|---|
| `PK` | Primary Key |
| `FK` | Foreign Key |
| `PK/FK` | Attribute that is part of the primary key and also references another table |
| `1:N` | One-to-many relationship |
| `N:N` | Many-to-many relationship |

---

## Main Tables

### ESTUDANTE

Stores data about the students registered in MKpause.

#### General structure

- `id_estudante` — PK
- name
- date of birth
- contact data
- authentication data
- school information
- class
- registration status

#### Relationships

A student may be related to:

- sessions;
- alerts;
- notes;
- follow-up record;
- teachers;
- psychologists;
- guardians.

---

### PROFESSOR

Stores data about registered teachers.

#### General structure

- `id_professor` — PK
- name
- contact data
- authentication data
- institutional information
- registration status

#### Relationships

A teacher may be linked to different students.

The relationship with students is represented by an associative table.

---

### PSICOLOGO_ESCOLAR

Stores data about school psychologists.

#### General structure

- `id_psicologo_escolar` — PK
- name
- contact data
- authentication data
- professional registration number
- state of the professional registration
- institutional information
- registration status

---

### PSICOLOGO_CLINICO

Stores data about clinical psychologists.

#### General structure

- `id_psicologo_clinico` — PK
- name
- contact data
- authentication data
- professional registration number
- state of the professional registration
- registration status

---

### RESPONSAVEL

Stores data about the guardians linked to students.

#### General structure

- `id_responsavel` — PK
- name
- contact data
- data needed for the link
- registration status

The link between guardian and student may be established after the student's initial registration.

---

### ADMINISTRADOR

Stores data about the users responsible for administering the platform.

#### General structure

- `id_administrador` — PK
- name
- contact data
- authentication data
- registration status

---

### SESSAO

Represents a self-regulation session completed by a student.

#### General structure

- `id_sessao` — PK
- `id_estudante` — FK
- session date
- start time
- end time
- session information

#### Relationship

```text
ESTUDANTE
    1
    │
    │
    N
 SESSAO
```

A student may complete many sessions.

Each session belongs to a single student.

---

### REGISTRO_HUMOR

Stores the emotional states reported during a session.

#### General structure

- `id_registro_humor` — PK
- `id_sessao` — FK
- recorded state
- moment of the record
- date and time

The moment attribute distinguishes records such as:

- pre-session;
- post-session.

#### Relationship

```text
SESSAO
   1
   │
   │
   N
REGISTRO_HUMOR
```

---

### ATIVIDADE

Represents the self-regulation resources available to students.

#### General structure

- `id_atividade` — PK
- name
- description
- type
- content or reference to the resource
- availability status

An activity may be a:

- game;
- video;
- exercise;
- breathing technique;
- other self-regulation resource.

---

### ALERTA

Stores alerts related to students.

#### General structure

- `id_alerta` — PK
- `id_estudante` — FK
- `id_sessao` — FK, when applicable
- level
- date
- time
- status
- alert information

#### Relationships

```text
ESTUDANTE 1 ───── N ALERTA
```

An alert belongs to one student.

When raised during a session, it may also reference that session.

Recipients must be determined by the platform's links and access rules.

---

### OBSERVACAO

Stores notes recorded about students.

#### General structure

- `id_observacao` — PK
- `id_estudante` — FK
- content
- date
- time
- author identification

The system must be able to identify whether the note was recorded by a:

- Teacher;
- School Psychologist.

The strategy used to represent different author types must remain consistent with the implementation chosen for the database.

---

### FICHA_ACOMPANHAMENTO

Stores the information used in the student's follow-up.

#### General structure

- `id_ficha` — PK
- `id_estudante` — FK
- follow-up information
- creation date
- date of last update
- status

#### Relationship

The record is associated with the corresponding student.

If the project's rule establishes **a single record per student**, `id_estudante` must have a constraint that prevents multiple records for the same student.

---

### AVISO

Stores notices made available to users.

#### General structure

- `id_aviso` — PK
- title
- content
- publication date
- person responsible for publishing
- target audience
- status

---

## Associative Tables

N:N relationships identified in the conceptual model become associative tables in the logical model.

---

### PROFESSOR_ESTUDANTE

Represents the link between teachers and students.

```text
PROFESSOR
    │
    │ 1
    │
    N
PROFESSOR_ESTUDANTE
    N
    │
    │ 1
    │
ESTUDANTE
```

#### Structure

- `id_professor` — PK/FK
- `id_estudante` — PK/FK

The combination of the two identifiers can form the association's primary key.

Link-specific information can also be added when needed.

---

### PSICOLOGO_ESCOLAR_ESTUDANTE

Represents the links between school psychologists and students.

#### Structure

- `id_psicologo_escolar` — PK/FK
- `id_estudante` — PK/FK

---

### PSICOLOGO_CLINICO_ESTUDANTE

Represents the links between clinical psychologists and students.

#### Structure

- `id_psicologo_clinico` — PK/FK
- `id_estudante` — PK/FK

This link can be used by the authorization rules to determine which students the professional can view.

---

### ESTUDANTE_RESPONSAVEL

Represents the relationship between students and guardians.

#### Structure

- `id_estudante` — PK/FK
- `id_responsavel` — PK/FK
- relationship or kinship, when needed
- link status

#### Transformation

Conceptual model:

```text
ESTUDANTE N ───── N RESPONSAVEL
```

Logical model:

```text
ESTUDANTE
    │
    ▼
ESTUDANTE_RESPONSAVEL
    ▲
    │
RESPONSAVEL
```

---

### SESSAO_ATIVIDADE

Represents which activities were used in a given session.

#### Structure

- `id_sessao` — PK/FK
- `id_atividade` — PK/FK

Information specific to how the activity was used may be added later if needed.

#### Transformation

Conceptual model:

```text
SESSAO N ───── N ATIVIDADE
```

Logical model:

```text
SESSAO
   │
   ▼
SESSAO_ATIVIDADE
   ▲
   │
ATIVIDADE
```

---

## Relationship Summary

| Origin | Relationship | Target | Implementation |
|---|---|---|---|
| Student | 1:N | Session | FK in `SESSAO` |
| Session | 1:N | Mood Record | FK in `REGISTRO_HUMOR` |
| Student | 1:N | Alert | FK in `ALERTA` |
| Student | 1:N | Note | FK in `OBSERVACAO` |
| Student | 1:1* | Follow-up Record | FK in `FICHA_ACOMPANHAMENTO` |
| Teacher | N:N | Student | `PROFESSOR_ESTUDANTE` |
| School Psychologist | N:N | Student | `PSICOLOGO_ESCOLAR_ESTUDANTE` |
| Clinical Psychologist | N:N | Student | `PSICOLOGO_CLINICO_ESTUDANTE` |
| Student | N:N | Guardian | `ESTUDANTE_RESPONSAVEL` |
| Session | N:N | Activity | `SESSAO_ATIVIDADE` |

\* Based on the current rule of one follow-up record per student.

---

## Referential Integrity

Foreign keys must prevent invalid relationships from being created.

For example:

- a session cannot reference a student that does not exist;
- a mood record cannot reference a session that does not exist;
- a link cannot reference users that do not exist;
- a note cannot be associated with a student that does not exist.

The specific rules for deletes and updates will be defined in the physical model, taking into account the need to preserve history.

---

## Deletions and History

Relevant historical records must not be deleted automatically without analyzing their dependencies.

For example, removing a student's registration must not cause the indiscriminate loss of:

- previous sessions;
- alerts;
- notes;
- follow-up records.

Where necessary, a logical deactivation strategy may be adopted instead of physical deletion.

This decision must be formalized when the database is implemented.

---

## Conceptual Model vs. Logical Model

Example of the transformation:

```text
CONCEPTUAL MODEL

ESTUDANTE N ───────── N PROFESSOR


            ↓ transformation


LOGICAL MODEL

ESTUDANTE
    │
    │
    ▼
PROFESSOR_ESTUDANTE
    ▲
    │
    │
PROFESSOR
```

The associative table resolves the N:N relationship within the relational model.

---

## Logical Diagram

The logical model diagram is available as a PDF:

[MKpause Logical Model (PDF)](./diagramas/modelo-logico.pdf)

It is also recommended to keep the editable file from the modeling tool alongside the project documentation.

---

## Next Step

The logical model serves as the basis for the **physical model**, which will define aspects specific to the chosen DBMS, including:

- data types;
- field sizes;
- `NOT NULL`;
- `UNIQUE`;
- `DEFAULT`;
- indexes;
- constraints;
- `ON DELETE` and `ON UPDATE` strategies;
- table creation statements.

---

## Related documents

- [Conceptual Model](./modelo-conceitual.en.md)
- [Data Requirements](../02-requisitos/requisitos-de-dados.en.md)
- [Business Rules](../02-requisitos/regras-de-negocio.en.md)
- [Use Cases](../03-casos-de-uso/casos-de-uso.en.md)
