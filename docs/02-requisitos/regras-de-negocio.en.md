[Português](./regras-de-negocio.md) · **English**

# Business Rules

Business rules define the conditions, constraints and behaviors **MKpause** must respect, regardless of the technology used to implement it.

These rules complement the functional requirements and must be taken into account during modeling, implementation and validation.

---

## Authentication and Access

### RN01 — Mandatory authentication

Users must be authenticated to access MKpause's restricted features.

---

### RN02 — Access by profile

The features available must depend on the authenticated user's profile.

The main profiles are:

- Student;
- Teacher;
- School Psychologist;
- Clinical Psychologist;
- Administrator.

---

### RN03 — Access by link

Professionals must not automatically have access to information about every registered student.

Access must depend on the links established between the professional and the student, as well as on the permissions defined for each profile.

---

## Student

### RN04 — Access to own information

Students may view only information about their own account, sessions and history.

---

### RN05 — Session linked to the student

Every self-regulation session must be associated with the student who completed it.

---

## Self-Regulation Session

### RN06 — Pre-session mood record

Students must record their emotional state before the self-regulation activity included in the session.

---

### RN07 — Evaluation of the recorded state

The system must evaluate the state reported by the student according to the criteria defined for the self-regulation process.

This evaluation may determine the system's subsequent behavior, including the possibility of raising alerts.

---

### RN08 — Completing the activity

After the initial record, students may access the self-regulation resources provided by the system.

These resources may include games, videos, exercises or other activities offered by the platform.

---

### RN09 — Post-session mood record

At the end of the activity, students must be able to record their emotional state again.

The post-session record must remain associated with the same session as the initial record.

---

### RN10 — Session history

The information recorded during a completed session must be stored to build the student's history.

---

## Alerts

### RN11 — Raising an alert

Students may raise an alert when their state or situation indicates a need for help, according to the rules defined by the system.

---

### RN12 — Alert levels

Alerts must have a classification that represents different levels of need for follow-up.

In the flow currently defined for MKpause, situations classified at **levels 2 and 3** may result in an alert.

---

### RN13 — Alert recipients

Alerts must be directed to the professionals responsible for the student's follow-up, according to existing links and established permissions.

Possible recipients include:

- Teacher;
- School Psychologist;
- Clinical Psychologist.

---

### RN14 — Alert record

Every alert raised must be recorded in the system with the information needed to identify and follow it up.

---

### RN15 — Alert linked to the student

Every alert must be related to the student who originated the situation.

When the alert is raised during a session, it may also remain associated with that session.

---

## Notes

### RN16 — Notes recorded by school professionals

Teachers and school psychologists may record notes about the students they are authorized to access.

---

### RN17 — Note author

Every note recorded must identify its author.

---

### RN18 — Note linked to the student

Every note must be associated with the student it refers to.

---

### RN19 — Independence between Teacher and School Psychologist

Teachers and school psychologists may each use the features available to both on their own.

Associating both actors with the same feature does not mean they must perform the action together.

For example, a teacher can record a note without the involvement of a school psychologist, and vice versa.

---

## Follow-up

### RN20 — Follow-up by authorization

Psychologists and other professionals may view only the information made available to their profile and to the students they are authorized to access.

---

### RN21 — Student history

Session records must remain available to build the student's history, according to the system's access rules.

---

### RN22 — Follow-up record

The follow-up record must be associated with the corresponding student.

Access to it must respect the permissions defined for each professional profile.

---

## Guardian

### RN23 — Guardian linked later

The guardian does not necessarily take part in the student's initial registration.

Their link with the student must be established afterwards through the mechanism defined by the platform.

---

### RN24 — Guardian invitation

Where applicable, the system must allow an invitation, or an equivalent mechanism, to be sent so that the link between guardian and student can be established.

---

### RN25 — Guardian-student link

A guardian may be associated with a student only after the process for establishing the link has been completed.

---

## Links

### RN26 — Student-professional link

Professionals' access to a given student's information must depend on the links registered in the system.

---

### RN27 — Link management

Links between students and professionals must be managed by users with administrative permission.

---

### RN28 — Multiple links

The model must allow the links needed for a student's follow-up without assuming that different professionals must act at the same time.

---

## Administration

### RN29 — Administrative management

Administrative operations to register, update, remove and manage users must be performed only by authorized users.

---

### RN30 — Link integrity

Removing or changing users must not create invalid links or inconsistent records in the system.

The rules for handling these records must preserve the integrity of relevant historical information.

---

## Self-Regulation Content

### RN31 — Content availability

Only content marked as available may be shown to students during self-regulation sessions.

---

### RN32 — Identification of content used

When an activity, game, video or other resource is used during a session, the system must allow it to be associated with that session.

---

## Privacy and Data

### RN33 — Restricted access to information

Information about students may be accessed only by authorized users.

---

### RN34 — Separation between professional profiles

Having professional access to the system does not mean having unrestricted access to all of a student's data.

The information made available must take into account:

1. the user's profile;
2. the link with the student;
3. the purpose of the information;
4. the permissions set by the system.

---

## Platform Boundaries

### RN35 — Support, not diagnosis

The evaluations performed by the system are intended to support the self-regulation and follow-up flow.

MKpause must not present these evaluations as a psychological or psychiatric diagnosis.

---

### RN36 — No replacement for professional care

The system does not replace follow-up by qualified professionals.

---

### RN37 — Emergencies

MKpause must not be presented as an emergency service.

The platform's alerts are internal communication and follow-up mechanisms and do not replace services suited to emergency situations.

---

## Summary

| Category | Rules |
|---|---|
| Authentication and access | RN01–RN03 |
| Student | RN04–RN05 |
| Self-regulation session | RN06–RN10 |
| Alerts | RN11–RN15 |
| Notes | RN16–RN19 |
| Follow-up | RN20–RN22 |
| Guardian | RN23–RN25 |
| Links | RN26–RN28 |
| Administration | RN29–RN30 |
| Content | RN31–RN32 |
| Privacy and data | RN33–RN34 |
| Platform boundaries | RN35–RN37 |

---

## Relationship with other documents

The business rules complement:

- [Functional Requirements](./requisitos-funcionais.en.md)
- [Data Requirements](./requisitos-de-dados.en.md)
- [Use Cases](../03-casos-de-uso/casos-de-uso.en.md)
- [Conceptual Model](../04-modelagem-de-dados/modelo-conceitual.en.md)
- [Logical Model](../04-modelagem-de-dados/modelo-logico.en.md)

If a business rule changes, the related artifacts must be reviewed to keep the documentation consistent.
