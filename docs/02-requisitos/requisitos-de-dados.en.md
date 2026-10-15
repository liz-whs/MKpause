[Português](./requisitos-de-dados.md) · **English**

# Data Requirements

Data requirements define the information **MKpause** needs to store, query and relate in order for its features to work.

This document describes the data at the business level. Primary keys, foreign keys, data types and other technical details are covered in the database modeling documentation.

---

## Student

The system must keep the information needed to identify the student, give them access to the platform and support their follow-up.

### Required data

- student identifier;
- name;
- date of birth;
- contact information;
- information needed for authentication;
- school information;
- class;
- information needed for the student's follow-up;
- registration status.

### Relationships

A student may be related to:

- self-regulation sessions;
- mood records;
- alerts;
- notes;
- follow-up record;
- teachers;
- school psychologist;
- clinical psychologist;
- guardians.

---

## Teacher

The system must store information about the teachers responsible for following students in the school environment.

### Required data

- teacher identifier;
- name;
- contact information;
- information needed for authentication;
- institution information;
- registration status.

### Relationships

A teacher may be related to:

- linked students;
- alerts;
- notes recorded.

---

## School Psychologist

The system must store information about the psychologists who follow students within the school.

### Required data

- school psychologist identifier;
- name;
- contact information;
- information needed for authentication;
- professional registration number;
- state of the professional registration;
- institution information;
- registration status.

### Relationships

A school psychologist may be related to:

- linked students;
- alerts;
- notes recorded.

---

## Clinical Psychologist

The system must store information about the clinical psychologists linked to students' follow-up.

### Required data

- clinical psychologist identifier;
- name;
- contact information;
- information needed for authentication;
- professional registration number;
- state of the professional registration;
- registration status.

### Relationships

A clinical psychologist may be related to:

- followed students;
- follow-up records;
- students' history;
- alerts;
- records made available for follow-up.

---

## Guardian

The system must keep the data needed to identify a guardian and establish their link with a student.

### Required data

- guardian identifier;
- name;
- contact information;
- relationship to the student;
- information needed to establish the link;
- link or registration status.

### Relationships

A guardian may be related to one or more students, according to the rules defined by the system.

The guardian's link is not necessarily created during the student's initial registration. It may be established later through an invitation or an equivalent mechanism.

---

## Administrator

The system must keep the information needed to identify and authenticate the users responsible for administering the platform.

### Required data

- administrator identifier;
- name;
- information needed for authentication;
- contact information;
- registration status.

The administrator is responsible for managing the users, follow-up records, content and links in the system.

---

## Self-Regulation Session

Each time a student uses the self-regulation resources, a session record must be created.

### Required data

- session identifier;
- student who completed the session;
- session date;
- start time;
- end time;
- emotional state recorded before the activity;
- emotional state recorded after the activity;
- resources or activities used;
- information or notes about the session.

### Relationships

A session is related to:

- one student;
- mood records;
- one or more activities or content items;
- any alerts raised during the process.

---

## Mood Record

The system must record the emotional state reported by the student during a session.

### Required data

- record identifier;
- student;
- related session;
- emotional state reported;
- moment of the record;
- date and time of the record.

The moment of the record must distinguish at least:

- pre-session mood;
- post-session mood.

These records make it possible to compare the state reported by the student before and after the self-regulation activity.

---

## Self-Regulation Activity

The system must store the resources made available to students during sessions.

### Required data

- activity identifier;
- name;
- description;
- type;
- associated content or resource;
- availability status.

### Content types

Activities may include:

- games;
- videos;
- exercises;
- breathing techniques;
- other self-regulation resources offered by the platform.

---

## Alert

The system must store the alerts raised while the platform is in use.

### Required data

- alert identifier;
- related student;
- related session, when applicable;
- alert level or classification;
- date;
- time;
- alert status;
- recipient professionals;
- information needed to give the alert context.

### Relationships

An alert may be related to:

- student;
- session;
- teacher;
- school psychologist;
- clinical psychologist.

Recipients depend on existing links and on the business rules defined for each type of alert.

---

## Note

The system must allow notes about a student's follow-up to be stored.

### Required data

- note identifier;
- related student;
- note author;
- note content;
- date;
- time;
- type or origin of the note, when needed.

### Authors

Under the permissions currently defined, follow-up notes may be recorded by:

- teacher;
- school psychologist.

Other records related to the session or to clinical follow-up must be handled according to their own features and permissions.

---

## Follow-up Record

The system must keep a record containing the information used in the student's follow-up.

### Required data

- record identifier;
- related student;
- follow-up information;
- creation date;
- date of last update;
- record status.

The follow-up record must be associated with the student, and access to it must be controlled according to the user's profile.

---

## Announcement

The system must store announcements made available to platform users.

### Required data

- announcement identifier;
- title;
- content;
- publication date;
- author or person responsible for publishing;
- target audience;
- announcement status.

---

## Links

MKpause must store the relationships between students and the people responsible for their follow-up.

The links include:

- student ↔ teacher;
- student ↔ school psychologist;
- student ↔ clinical psychologist;
- student ↔ guardian.

These links are used to determine which professionals may view information about, or receive alerts for, a given student.

---

## Data Access Control

Access to stored information must take into account the authenticated user's profile and links.

A user must not automatically gain access to every record in the system simply because they have a certain type of profile.

For example, professionals who follow students should see only the information the system makes available about the students they are authorized to access.

---

## Summary of the main data entities

| Entity | Purpose |
|---|---|
| Student | Identify the student and keep their information |
| Teacher | Represent teachers linked to students |
| School Psychologist | Represent psychological follow-up at school |
| Clinical Psychologist | Represent clinical follow-up professionals |
| Guardian | Represent guardians linked to the student |
| Administrator | Represent administrative users |
| Session | Record self-regulation sessions |
| Mood Record | Store recorded emotional states |
| Activity | Represent self-regulation resources |
| Alert | Record situations that require attention |
| Note | Store follow-up notes |
| Follow-up Record | Bring follow-up information together |
| Announcement | Store notices published on the platform |
| Link | Represent relationships between students and their guardians or professionals |

---

## Relationship with Modeling

These requirements are the basis for:

- [Conceptual Model](../04-modelagem-de-dados/modelo-conceitual.en.md)
- [Logical Model](../04-modelagem-de-dados/modelo-logico.en.md)

Data requirements describe **what information is needed**, while the data models define **how that information will be structured and related in the database**.
