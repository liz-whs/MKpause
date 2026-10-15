[Português](./atores.md) · **English**

# System Actors

Actors represent users or external elements that interact directly with **MKpause** features.

In a use case diagram, an actor represents a **role played while interacting with the system**, not necessarily an entity or a database table.

---

## Student

The **Student** is the main user of MKpause's self-regulation features.

Students use the platform to access support resources, record their emotional state and keep a history of their sessions.

### Main interactions

The student can:

- sign in;
- start a self-regulation session;
- record their mood before the session;
- access activities, games and videos;
- record their mood after the activity;
- request help;
- raise alerts in the situations defined;
- view their history.

### Role in the system

The student is the central actor of the flow:

```text
Complete self-regulation session
```

During this process, other features are carried out or made available according to the recorded state and the system's rules.

---

## Teacher

The **Teacher** takes part in following students in the school environment.

Their access is limited to the students and information they are authorized to see.

### Main interactions

The teacher can:

- sign in;
- view linked students;
- receive alerts;
- view alerts;
- record notes;
- view the information permitted by the system;
- view announcements.

### Role in the system

The teacher acts mainly in following situations that arise in the school context.

They do not need to act together with the School Psychologist to use features associated with both actors.

---

## School Psychologist

The **School Psychologist** follows students within the school.

### Main interactions

The school psychologist can:

- sign in;
- view linked students;
- receive alerts;
- view alerts;
- record notes;
- view authorized information;
- view announcements.

### Role in the system

Teacher and School Psychologist may share access to some features, but they represent **distinct roles** in the system.

These shared features do not imply a generalization between the actors.

---

## Clinical Psychologist

The **Clinical Psychologist** represents the professional responsible for the student's clinical follow-up, when a corresponding link exists in the system.

### Main interactions

The clinical psychologist can:

- sign in;
- view followed students;
- view history;
- view the records made available;
- view the follow-up record;
- receive alerts;
- view announcements;
- access the information needed for follow-up, according to their permissions.

### Role in the system

The clinical psychologist's access depends on the links and permissions established for each student.

The professional profile does not grant automatic access to information about every registered student.

---

## Administrator

The **Administrator** is responsible for maintaining the information the platform needs to operate.

### Main interactions

The administrator can:

- sign in;
- manage students;
- manage teachers;
- manage school psychologists;
- manage clinical psychologists;
- manage follow-up records;
- manage links;
- manage the content available on the platform.

### Role in the system

The administrator's responsibilities concern managing the platform, not the student's self-regulation process.

---

## Guardian

The **Guardian** is related to the student and may take part in specific MKpause processes.

However, being part of the system's domain does not mean they must appear as an actor in every use case diagram.

### Registration and link

The guardian **does not take part directly in the student's initial registration**.

The link is established afterwards through an invitation, an email or another mechanism defined by the platform.

For this reason, the Guardian should not be connected to the registration use case just to show that they exist in the database.

---

## Relationships between actors

### Teacher and School Psychologist

Teacher and School Psychologist share some similar features, such as:

- viewing students;
- receiving alerts;
- recording notes.

This does not mean that an action depends on both professionals being present.

For example:

```text
Teacher ───────────────── Record note

School Psychologist ───── Record note
```

Each actor can perform the use case independently.

---

### No generalization

Although Teacher and School Psychologist share some features, each has its own responsibilities and permissions.

For this reason, the current MKpause model does not use a generalization between these actors merely to remove repeated associations.

---

## Actor vs. Entity

It is important to distinguish the concepts used in the different models.

#### Use Case

Represents who **interacts with the system**.

Example:

```text
Teacher → Record note
```

#### Data Model

Represents what information the system **needs to store**.

Example:

```text
PROFESSOR
- id
- nome
- email
...
```

An entity in the database does not necessarily have to appear as an actor in a given use case diagram.

Likewise, the presence of an actor indicates interaction with the system and does not automatically determine how the data will be structured in the database.

---

## Actor summary

| Actor | Main role |
|---|---|
| Student | Complete sessions and use self-regulation resources |
| Teacher | Follow students in the school context |
| School Psychologist | Provide follow-up within the school |
| Clinical Psychologist | View the information needed for clinical follow-up |
| Administrator | Manage users, links and platform resources |
| Guardian | Take part in specific processes once the link is established |

---

## Related documents

- [Use Cases](./casos-de-uso.en.md)
- [Functional Requirements](../02-requisitos/requisitos-funcionais.en.md)
- [Business Rules](../02-requisitos/regras-de-negocio.en.md)
