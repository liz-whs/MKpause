[Português](./casos-de-uso.md) · **English**

# Use Cases

This document describes the main **MKpause** use cases, presenting the actors involved, goals, preconditions, main flows and relationships between features.

The use cases complement the UML diagram available in the project documentation.

---

## UC01 — Sign In

**Actors:**  
Student, Teacher, School Psychologist, Clinical Psychologist and Administrator.

**Goal:**  
Give a registered user access to the features for their profile.

**Precondition:**  
The user must have an active registration in the system.

### Main flow

1. The user opens the sign-in page.
2. The user enters their credentials.
3. The system validates the information provided.
4. The system identifies the user's profile.
5. The system starts the authenticated session.
6. The user is taken to their area.

### Alternative flow

**Invalid credentials**

1. The system determines that the credentials are not valid.
2. Access is not granted.
3. The system informs the user of the problem.
4. The user can try again.

**Postcondition:**  
The user remains authenticated in the system.

---

## UC02 — Complete Self-Regulation Session

**Primary actor:** Student

**Goal:**  
Allow the student to complete a session using the self-regulation resources provided by MKpause.

**Preconditions:**

- the student must be authenticated;
- the student must have an active registration.

### Main flow

1. The student starts a session.
2. The system asks for the initial mood record.
3. The student records their state.
4. The system stores and evaluates the reported state.
5. The student opens a self-regulation activity.
6. The student completes the activity.
7. The system asks for the final mood record.
8. The student records their state again.
9. The system stores the session information.
10. The session becomes part of the student's history.

**Postcondition:**  
The session and its records remain stored in the student's history.

### Relationships

Completing the session involves features such as:

- Record mood;
- Evaluate state;
- accessing self-regulation activities;
- Record post-session mood;
- recording session information.

Depending on the outcome of the evaluation, an alert may also be raised.

---

## UC03 — Record Mood

**Primary actor:** Student

**Goal:**  
Record the emotional state reported by the student during a session.

**Precondition:**  
The student must be in a self-regulation session.

### Main flow

1. The system presents the options available for recording the state.
2. The student selects the corresponding option.
3. The system records the reported state.
4. The record is associated with the current session.
5. The system identifies whether the record is pre-session or post-session.

**Postcondition:**  
The mood record remains associated with the session.

---

## UC04 — Evaluate State

**Related actor:** Student

**Goal:**  
Evaluate the state reported by the student to determine how the system should proceed during the session.

**Precondition:**  
A valid mood record must exist.

### Main flow

1. The system receives the recorded state.
2. The system applies the evaluation criteria.
3. The system determines the corresponding classification.
4. The session continues according to the result.

### Alternative flow

If the evaluation identifies a situation covered by the alert rules, the alert flow may be started.

**Postcondition:**  
The recorded state has a corresponding evaluation used by the session flow.

---

## UC05 — Raise Alert

**Originating actor:** Student

**Receiving actors:**  
Teacher, School Psychologist and Clinical Psychologist, according to links and permissions.

**Goal:**  
Record and communicate a situation that requires attention from the professionals responsible for the student.

**Preconditions:**

- the student must be identified;
- there must be enough information to record the alert.

### Main flow

1. The student requests help, or a condition defined for raising an alert occurs.
2. The system identifies the classification of the situation.
3. The system creates the alert.
4. The alert is associated with the student.
5. Where applicable, the alert is associated with the session.
6. The system identifies the recipient professionals based on the links.
7. The alert is made available to the authorized professionals.

**Postcondition:**  
The alert remains recorded in the system.

### Related rule

Under the project's current rules, situations classified at levels **2 and 3** may result in an alert.

---

## UC06 — View History

**Primary actor:** Student

**Goal:**  
Allow the student to view information about their previous sessions.

**Precondition:**  
The student must be authenticated.

### Main flow

1. The student opens their history.
2. The system identifies the authenticated student.
3. The system retrieves the authorized records.
4. The system displays the previous sessions.
5. The student can view the information available for each session.

**Postcondition:**  
No data is changed.

---

## UC07 — View Students

**Actors:**  
Teacher, School Psychologist and Clinical Psychologist, according to their permissions.

**Goal:**  
Allow professionals to view the students linked to their follow-up.

**Preconditions:**

- the professional must be authenticated;
- a corresponding link or authorization must exist.

### Main flow

1. The professional opens the students area.
2. The system identifies their profile.
3. The system checks the existing links.
4. The system displays the students the professional has access to.
5. The professional selects a student.
6. The system displays the information permitted for that profile.

**Postcondition:**  
No data is changed.

---

## UC08 — Record Note

**Actors:**  
Teacher and School Psychologist.

**Goal:**  
Allow school professionals to record notes about a student.

**Preconditions:**

- the professional must be authenticated;
- they must have authorized access to the student.

### Main flow

1. The professional opens the student's page.
2. The professional selects the option to record a note.
3. The system displays the input field.
4. The professional enters the note.
5. The system validates the information.
6. The system records the note.
7. The note is associated with the student and with the professional who wrote it.

**Postcondition:**  
The note remains recorded in the system.

### Note on the actors

Teachers and school psychologists can perform this use case **independently**.

Associating both with the same use case does not require them to take part at the same time.

---

## UC09 — View Alerts

**Actors:**  
Teacher, School Psychologist and Clinical Psychologist, according to permissions.

**Goal:**  
Allow authorized professionals to view alerts about the students they follow.

**Precondition:**  
The professional must be authenticated and have access to the student related to the alert.

### Main flow

1. The professional opens their alerts area.
2. The system identifies the alerts they have access to.
3. The system displays the available alerts.
4. The professional selects an alert.
5. The system displays its information.

**Postcondition:**  
Viewing alone does not change any core data.

---

## UC10 — View Follow-up Record

**Primary actor:** Clinical Psychologist

**Goal:**  
Allow the follow-up record of an authorized student to be viewed.

**Preconditions:**

- the psychologist must be authenticated;
- they must have authorized access to the student.

### Main flow

1. The psychologist selects a student they follow.
2. The system checks the link and permissions.
3. The system retrieves the corresponding record.
4. The system displays the authorized information.

**Postcondition:**  
No data is changed.

---

## UC11 — Manage Students

**Primary actor:** Administrator

**Goal:**  
Allow student registrations to be administered.

### Operations

The administrator can:

- register;
- view;
- update;
- remove, when permitted by the integrity rules.

**Precondition:**  
The administrator must be authenticated.

**Postcondition:**  
The student's data is updated according to the operation performed.

---

## UC12 — Manage Teachers

**Primary actor:** Administrator

**Goal:**  
Allow the teachers registered in MKpause to be managed.

### Operations

- register;
- view;
- update;
- remove.

---

## UC13 — Manage Psychologists

**Primary actor:** Administrator

**Goal:**  
Allow the psychologists registered on the platform to be managed.

The feature must take into account the different professional profiles in the system.

### Operations

- register;
- view;
- update;
- remove.

---

## UC14 — Manage Links

**Primary actor:** Administrator

**Goal:**  
Allow the relationships between students and professionals or guardians to be managed.

### Links

- student ↔ teacher;
- student ↔ school psychologist;
- student ↔ clinical psychologist;
- student ↔ guardian.

### Main flow

1. The administrator opens link management.
2. Selects the student.
3. Selects the user to be linked.
4. The system validates whether the link is possible.
5. The system records the relationship.

**Postcondition:**  
The link is taken into account by the corresponding access rules.

---

## UC15 — Manage Follow-up Record

**Primary actor:** Administrator

**Goal:**  
Allow students' follow-up records to be managed.

**Precondition:**  
The administrator must be authenticated.

**Postcondition:**  
The record's information remains associated with the corresponding student.

---

## UC16 — Manage Content

**Primary actor:** Administrator

**Goal:**  
Allow the self-regulation resources made available to students to be managed.

### Content

Resources such as the following can be managed:

- games;
- videos;
- exercises;
- self-regulation activities.

### Operations

- register;
- view;
- update;
- change availability;
- remove, when permitted.

---

## Relationships between Use Cases

### `<<include>>`

An `<<include>>` relationship indicates that a behavior is always incorporated into the flow of the main use case whenever that relationship applies to the model.

In the self-regulation flow, essential session features may be represented as included use cases when they are a mandatory part of completing the session.

Conceptual example:

```text
Complete self-regulation session
            |
            | <<include>>
            ↓
       Record mood
```

---

### `<<extend>>`

An `<<extend>>` relationship represents additional behavior that occurs only under certain conditions.

Raising an alert can be represented this way when it happens only under the conditions defined by the system's rules.

Conceptual example:

```text
         Raise alert
              |
              | <<extend>>
              ↓
Evaluate state / session flow
```

The exact direction of the relationships must remain consistent with the final version of the UML diagram adopted by the project.

---

## Summary

| ID | Use Case | Primary actor |
|---|---|---|
| UC01 | Sign In | System users |
| UC02 | Complete Self-Regulation Session | Student |
| UC03 | Record Mood | Student |
| UC04 | Evaluate State | System / session flow |
| UC05 | Raise Alert | Student |
| UC06 | View History | Student |
| UC07 | View Students | Professionals |
| UC08 | Record Note | Teacher / School Psychologist |
| UC09 | View Alerts | Authorized professionals |
| UC10 | View Follow-up Record | Clinical Psychologist |
| UC11 | Manage Students | Administrator |
| UC12 | Manage Teachers | Administrator |
| UC13 | Manage Psychologists | Administrator |
| UC14 | Manage Links | Administrator |
| UC15 | Manage Follow-up Record | Administrator |
| UC16 | Manage Content | Administrator |

---

## Related documents

- [Actors](./atores.en.md)
- [Functional Requirements](../02-requisitos/requisitos-funcionais.en.md)
- [Business Rules](../02-requisitos/regras-de-negocio.en.md)
- [Conceptual Model](../04-modelagem-de-dados/modelo-conceitual.en.md)
- [Logical Model](../04-modelagem-de-dados/modelo-logico.en.md)
