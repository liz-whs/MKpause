[Português](./modelo-conceitual.md) · **English**

# Conceptual Model

The **MKpause** conceptual model represents the main entities in the application's domain and the relationships between them.

At this stage, the focus is on representing business information, without considering the implementation details of a specific Database Management System.

Entity names in the diagrams and in the logical model are in Portuguese. The English name is followed by the Portuguese name in parentheses.

---

## Purpose

The conceptual model aims to represent:

- what information needs to exist;
- which entities take part in the system;
- which characteristics belong to each entity;
- how these entities relate to each other;
- the cardinality of each relationship.

---

## Main Entities

### Student (Estudante)

Represents the student who uses the platform's self-regulation resources.

The student is related to elements such as:

- sessions;
- mood records;
- alerts;
- notes;
- follow-up record;
- teachers;
- psychologists;
- guardians.

The student is central to the MKpause model, since most follow-up records relate to them.

---

### Teacher (Professor)

Represents the teachers responsible for following students in the school context.

A teacher may be linked to different students and record notes about the students they have access to.

---

### School Psychologist (Psicólogo Escolar)

Represents the psychology professional who follows students within the school.

The school psychologist may be linked to students, receive alerts and record follow-up notes.

---

### Clinical Psychologist (Psicólogo Clínico)

Represents the professional responsible for the student's clinical follow-up, when a corresponding link exists.

The clinical psychologist may view the information the system makes available, according to their permissions and established links.

---

### Guardian (Responsável)

Represents the person responsible for the student.

The guardian may be linked to the student after the initial registration, through the process defined by the platform.

---

### Session (Sessão)

Represents a self-regulation session completed by a student.

A session records information about the process, including:

- student;
- when it took place;
- mood records;
- activities used;
- any related alerts.

A student may complete many sessions over time.

---

### Mood Record (Registro de Humor)

Represents the emotional state reported by the student during a session.

The records distinguish moments such as:

- pre-session;
- post-session.

A single session may therefore have more than one mood record.

---

### Activity (Atividade)

Represents a self-regulation resource provided by the platform.

An activity may be a:

- game;
- video;
- exercise;
- breathing technique;
- other self-regulation resource.

A session may use one or more activities.

The same activity may also be used in different sessions.

---

### Alert (Alerta)

Represents a situation recorded by the system that needs to be communicated to the professionals responsible for follow-up.

An alert relates to a student and may relate to the session in which it originated.

Depending on the system's rules, professionals linked to the student may receive the alert.

---

### Note (Observação)

Represents a record made by a professional about a given student.

In the current model, notes may be recorded by:

- Teacher;
- School Psychologist.

Every note must identify the related student and its author.

---

### Follow-up Record (Ficha de Acompanhamento)

Represents the set of information used to follow the student.

The record remains associated with the student, and access to it depends on the permissions set for each profile.

---

### Announcement (Aviso)

Represents notices made available to platform users.

An announcement may include a title, content, publication date and target audience.

---

## Main Relationships

### Student — Session

```text
ESTUDANTE 1 ───────── N SESSÃO
```

A student may complete many sessions.

Each session belongs to one student.

---

### Session — Mood Record

```text
SESSÃO 1 ───────── N REGISTRO_HUMOR
```

A session may have several mood records.

Each record belongs to a specific session.

---

### Student — Teacher

```text
ESTUDANTE N ───────── N PROFESSOR
```

A student may be related to different teachers, and a teacher may follow different students.

This many-to-many relationship will become an associative structure in the logical model.

---

### Student — School Psychologist

This relationship represents the professionals responsible for the student's follow-up at school.

Depending on the institution's rules, one professional may follow different students.

---

### Student — Clinical Psychologist

Represents the link needed to allow the clinical follow-up provided for by the platform.

---

### Student — Guardian

```text
ESTUDANTE N ───────── N RESPONSÁVEL
```

The model can represent cases in which a student has more than one guardian and a guardian is related to more than one student.

This relationship may also require an associative entity in the logical model.

---

### Student — Note

```text
ESTUDANTE 1 ───────── N OBSERVAÇÃO
```

A student may have many notes over time.

Each note relates to one student.

---

### Session — Activity

```text
SESSÃO N ───────── N ATIVIDADE
```

A session may use different activities.

An activity may be used in many sessions.

This relationship becomes an associative table in the logical model.

---

### Student — Alert

```text
ESTUDANTE 1 ───────── N ALERTA
```

A student may have different alerts over time.

Each alert has one originating student.

---

### Student — Follow-up Record

The follow-up record is directly related to the student.

The cardinality must reflect the rule defined by the project for creating and maintaining each student's record.

---

## Many-to-Many Relationships

**N:N** relationships are allowed in the conceptual model.

They represent real situations in the domain without immediate concern for how they are implemented in tables.

Existing or planned examples in MKpause include:

```text
ESTUDANTE N ───── N PROFESSOR

ESTUDANTE N ───── N RESPONSÁVEL

SESSÃO N ───── N ATIVIDADE
```

In the logical model, these relationships become associative tables.

---

## Conceptual vs. Logical

An important point is that the conceptual model does not need to show tables created solely to resolve N:N relationships.

For example:

#### Conceptual Model

```text
ESTUDANTE N ───────── N PROFESSOR
```

#### Logical Model

```text
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

The associative table appears during the transformation into the relational model.

---

## Diagram

The conceptual model diagram is available as a PDF:

[MKpause Conceptual Model (PDF)](./diagramas/modelo-conceitual.pdf)

---

## Related documents

- [Logical Model](./modelo-logico.en.md)
- [Data Requirements](../02-requisitos/requisitos-de-dados.en.md)
- [Business Rules](../02-requisitos/regras-de-negocio.en.md)
