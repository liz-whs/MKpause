[Português](./requisitos-funcionais.md) · **English**

# Functional Requirements

Functional requirements describe the features **MKpause** must provide to the system's different users.

The requirements are grouped by the profile that interacts with each feature.

---

## Student

### RF01 — Sign in

**Description:**  
The system must allow students to sign in using their registered credentials.

**Actor:** Student

---

### RF02 — Access activities and games

**Description:**  
The system must allow students to access the activities and games provided to support self-regulation.

**Actor:** Student

---

### RF03 — Access videos

**Description:**  
The system must allow students to watch videos provided as self-regulation support resources.

**Actor:** Student

---

### RF04 — Record initial mood

**Description:**  
The system must allow students to record their emotional state before a self-regulation activity.

**Actor:** Student

---

### RF05 — Record self-regulation session

**Description:**  
The system must record the information related to the self-regulation session completed by the student.

**Actor:** Student

---

### RF06 — Record final mood

**Description:**  
The system must allow students to record their emotional state after the self-regulation activity.

**Actor:** Student

---

### RF07 — Record session notes

**Description:**  
The system must allow information or notes about the student's experience during the session to be recorded.

**Actor:** Student

---

### RF08 — Request help

**Description:**  
The system must allow students to request help by raising an alert when they need support.

**Actor:** Student

**Relationships:**  
The alert may be forwarded to the professionals responsible for the student's follow-up, according to the links registered in the system.

---

### RF09 — View session history

**Description:**  
The system must allow students to view the history of their self-regulation sessions.

**Actor:** Student

---

## Clinical Psychologist

### RF10 — Sign in

**Description:**  
The system must allow clinical psychologists to sign in using their registered credentials.

**Actor:** Clinical Psychologist

---

### RF11 — View followed students

**Description:**  
The system must allow clinical psychologists to view the students linked to their follow-up.

**Actor:** Clinical Psychologist

---

### RF12 — View student history

**Description:**  
The system must allow clinical psychologists to view the session history of the students linked to their follow-up.

**Actor:** Clinical Psychologist

---

### RF13 — View mood records

**Description:**  
The system must allow clinical psychologists to view the mood records from the sessions of the students they follow.

**Actor:** Clinical Psychologist

---

### RF14 — View notes

**Description:**  
The system must allow clinical psychologists to view notes about the students they follow, within their access permissions.

**Actor:** Clinical Psychologist

---

### RF15 — Receive alerts

**Description:**  
The system must allow clinical psychologists to receive alerts about the students linked to their follow-up.

**Actor:** Clinical Psychologist

---

### RF16 — View follow-up record

**Description:**  
The system must allow clinical psychologists to view the follow-up record of the students linked to them.

**Actor:** Clinical Psychologist

---

### RF17 — Record follow-up information

**Description:**  
The system must allow clinical psychologists to record information about a student's follow-up, within the permissions set for their profile.

**Actor:** Clinical Psychologist

---

### RF18 — View announcements

**Description:**  
The system must allow clinical psychologists to view announcements published on the platform.

**Actor:** Clinical Psychologist

---

## School Professionals

The requirements in this section cover the features available to the professionals responsible for following students in the school environment, taking into account the specific permissions of the **Teacher** and the **School Psychologist**.

---

### RF19 — Sign in

**Description:**  
The system must allow teachers and school psychologists to sign in using their registered credentials.

**Actors:** Teacher and School Psychologist

---

### RF20 — View linked students

**Description:**  
The system must allow teachers and school psychologists to view the students linked to them.

**Actors:** Teacher and School Psychologist

> Associating both actors with the same requirement does not mean they must perform the action together. Each professional can use the feature according to their own link and permissions.

---

### RF21 — Receive alerts

**Description:**  
The system must allow school professionals to receive alerts about the students linked to them.

**Actors:** Teacher and School Psychologist

---

### RF22 — View alerts

**Description:**  
The system must allow teachers and school psychologists to view the alerts received about the students they follow.

**Actors:** Teacher and School Psychologist

---

### RF23 — Record notes

**Description:**  
The system must allow teachers and school psychologists to record notes about linked students.

**Actors:** Teacher and School Psychologist

---

### RF24 — View authorized information

**Description:**  
The system must allow teachers and school psychologists to view student information according to the permissions set for each profile.

**Actors:** Teacher and School Psychologist

---

### RF25 — View announcements

**Description:**  
The system must allow teachers and school psychologists to view announcements published on the platform.

**Actors:** Teacher and School Psychologist

---

## Administrator

### RF26 — Sign in

**Description:**  
The system must allow administrators to sign in using their registered credentials.

**Actor:** Administrator

---

### RF27 — Manage students

**Description:**  
The system must allow administrators to register, view, update and remove students.

**Actor:** Administrator

---

### RF28 — Manage teachers

**Description:**  
The system must allow administrators to register, view, update and remove teachers.

**Actor:** Administrator

---

### RF29 — Manage school psychologists

**Description:**  
The system must allow administrators to register, view, update and remove school psychologists.

**Actor:** Administrator

---

### RF30 — Manage clinical psychologists

**Description:**  
The system must allow administrators to register, view, update and remove clinical psychologists.

**Actor:** Administrator

---

### RF31 — Manage follow-up records

**Description:**  
The system must allow administrators to create, view, update and manage students' follow-up records.

**Actor:** Administrator

---

### RF32 — Manage student-teacher links

**Description:**  
The system must allow administrators to establish and manage links between students and teachers.

**Actor:** Administrator

---

### RF33 — Manage student-psychologist links

**Description:**  
The system must allow administrators to establish and manage links between students and school or clinical psychologists.

**Actor:** Administrator

---

### RF34 — Manage guardian links

**Description:**  
The system must allow the links between students and their guardians to be managed.

The guardian does not take part directly in the student's initial registration. The link is established afterwards through the process defined by the system, such as sending an invitation or an equivalent mechanism.

**Primary actor:** Administrator

---

### RF35 — Manage self-regulation content

**Description:**  
The system must allow the content offered to students during self-regulation sessions to be managed, including activities, games, videos and other resources provided by the platform.

**Actor:** Administrator

---

## Requirements Summary

| Range | Profile | Count |
|---|---|---:|
| RF01–RF09 | Student | 9 |
| RF10–RF18 | Clinical Psychologist | 9 |
| RF19–RF25 | Teacher / School Psychologist | 7 |
| RF26–RF35 | Administrator | 10 |
| **Total** | | **35** |

---

## Relationship with other artifacts

These requirements must remain consistent with the project's other documents:

- [Data Requirements](./requisitos-de-dados.en.md)
- [Business Rules](./regras-de-negocio.en.md)
- [Actors](../03-casos-de-uso/atores.en.md)
- [Use Cases](../03-casos-de-uso/casos-de-uso.en.md)
- [Conceptual Model](../04-modelagem-de-dados/modelo-conceitual.en.md)
- [Logical Model](../04-modelagem-de-dados/modelo-logico.en.md)

Changes to the functional requirements must be reviewed against the other artifacts to ensure traceability and consistency across the documentation.
