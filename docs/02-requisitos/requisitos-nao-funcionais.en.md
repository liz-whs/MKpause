[Português](./requisitos-nao-funcionais.md) · **English**

# Non-Functional Requirements

Non-functional requirements define the quality attributes, constraints and conditions **MKpause** must meet while in use.

Unlike functional requirements, which describe what the system does, non-functional requirements establish **how the system must behave** in areas such as security, privacy, usability, accessibility, performance and reliability.

---

## Security

### RNF01 — Authentication

The system must require authentication to access the platform's restricted features and information.

---

### RNF02 — Access control

The system must control access to features and information according to the authenticated user's profile.

---

### RNF03 — Link-based control

The system must take the existing links between students and professionals into account before making follow-up information available.

---

### RNF04 — Credential protection

User passwords must not be stored in plain text.

Secure mechanisms must be used to store and validate credentials.

---

### RNF05 — Protection against unauthorized access

The system must prevent users from accessing information or features they are not authorized to use.

---

### RNF06 — Signing out

The system must allow users to end their authenticated session securely.

---

## Privacy

### RNF07 — Protection of student data

Students' personal and follow-up information must be accessible only to authorized users.

---

### RNF08 — Minimal access

Each profile must see only the information needed to perform its functions in the system.

---

### RNF09 — Privacy of records

Mood records, sessions, alerts, notes and follow-up records must not be made publicly available.

---

### RNF10 — Identification of the responsible user

Records that depend on a professional's action must keep enough information to identify the user responsible for that action.

---

## Accessibility

### RNF11 — Accessible interface

The interface must be developed following digital accessibility principles.

---

### RNF12 — Contrast

Visual elements must have enough contrast for interface components to be read and identified.

The contrast values of the current palette are documented in [Color Palette](../07-fundamentacao/paleta-de-cores.en.md).

---

### RNF13 — Clear navigation

Navigation must present text, buttons and actions in a way that is clear and understandable to users.

---

### RNF14 — Reliance on color

Important information must not be conveyed through color alone.

Icons, text or other indicators must be used when needed to complement visual information.

---

### RNF15 — Keyboard navigation

The main features of the web application must be accessible using keyboard navigation.

---

## Usability

### RNF16 — Interface consistency

Elements that perform similar functions must look and behave consistently across the platform's screens.

---

### RNF17 — Action feedback

The system must give users visual feedback after relevant actions, such as:

- saving information;
- completing a session;
- recording mood;
- raising an alert;
- recording a note;
- performing administrative operations.

---

### RNF18 — Error messages

Error messages must be understandable to users and, when possible, explain how to fix the problem.

---

### RNF19 — Confirmation of critical actions

Operations that may cause information to be lost or removed must ask for confirmation before completing, where applicable.

---

### RNF20 — Ease of use

The student's main flows, especially starting and completing a self-regulation session, must avoid unnecessary steps and give clear instructions.

---

## Compatibility

### RNF21 — Responsive interface

The web interface must adapt its layout to different screen sizes.

---

### RNF22 — Modern browsers

The system must be compatible with current versions of the main browsers used by its users.

---

## Performance

### RNF23 — Adequate response time

Common platform operations must respond quickly enough not to harm the user experience under normal conditions of use.

---

### RNF24 — Content loading

Content used during self-regulation sessions must load in a way that does not needlessly interrupt the session.

---

## Integrity and Reliability

### RNF25 — Data integrity

The system must keep stored information and its relationships consistent.

---

### RNF26 — Record persistence

Once a recording operation is confirmed, the information must remain persistently stored.

---

### RNF27 — History preservation

Changes to registration data must not compromise the historical records needed to understand past sessions, alerts and follow-up.

---

### RNF28 — Failure handling

Failures during write operations must not leave partially stored records that compromise data integrity.

---

## Maintainability

### RNF29 — Code organization

The source code must be organized in a modular way, separating responsibilities wherever applicable.

---

### RNF30 — Standardization

The project must follow consistent conventions for naming, file organization and code structure.

---

### RNF31 — Documentation

The system's main features, rules, structures and technical decisions must be documented and kept up to date in the project repository.

---

### RNF32 — Version control

MKpause's source code and documentation must be kept under a version control system.

---

## Traceability

### RNF33 — Record traceability

Records relevant to follow-up must contain information that identifies when they were created and which student they relate to.

---

### RNF34 — Consistency between documentation and system

Relevant changes to the system's features or rules must be reflected in the corresponding documentation.

---

## Summary

| Category | Requirements |
|---|---|
| Security | RNF01–RNF06 |
| Privacy | RNF07–RNF10 |
| Accessibility | RNF11–RNF15 |
| Usability | RNF16–RNF20 |
| Compatibility | RNF21–RNF22 |
| Performance | RNF23–RNF24 |
| Integrity and Reliability | RNF25–RNF28 |
| Maintainability | RNF29–RNF32 |
| Traceability | RNF33–RNF34 |

---

## Note

Some non-functional requirements may receive more specific metrics and acceptance criteria during the design, implementation and testing stages.

These criteria should be based on real conditions of use, avoiding arbitrary values that cannot later be validated.

---

## Related documents

Non-functional requirements should be considered together with:

- [Functional Requirements](./requisitos-funcionais.en.md)
- [Data Requirements](./requisitos-de-dados.en.md)
- [Business Rules](./regras-de-negocio.en.md)
- [Use Cases](../03-casos-de-uso/casos-de-uso.en.md)

They should also guide future decisions about MKpause's architecture, interface, database, security and testing.
