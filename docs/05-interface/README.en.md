[Português](./README.md) · **English**

# MKpause Interface

This section contains the documentation for the **MKpause interface and user experience**, including the wireframes, prototypes and interface decisions made during the project.

The interfaces must reflect the requirements, use cases and business rules defined for the system.

---

## Structure

```text
05-interface/
├── README.md
├── wireframes/
└── prototipos/
```

### Wireframes

The `wireframes/` directory (created once the first version is validated) is intended for structural representations of the MKpause screens.

Wireframes are used to define aspects such as:

- how information is organized;
- the hierarchy of elements;
- navigation;
- component placement;
- flows between screens;
- the actions available to each profile.

At this stage, the main focus is on the **structure and behavior of the interface**, not necessarily its final appearance.

---

### Prototypes

The `prototipos/` directory (created once the first version is validated) holds the visual versions of the interfaces developed for MKpause.

Prototypes may represent aspects such as:

- visual identity;
- colors;
- typography;
- components;
- screen states;
- navigation;
- visual feedback;
- the user experience.

The visual identity guidelines and their rationale are in [Color Palette](../07-fundamentacao/paleta-de-cores.en.md) and [Rounded Shapes and Mascot](../07-fundamentacao/formas-e-mascote.en.md).

---

## Interface Profiles

Because MKpause has different types of users, the interface must take into account the specific needs and permissions of each profile.

The main profiles are:

- Student;
- Teacher;
- School Psychologist;
- Clinical Psychologist;
- Administrator.

The features shown in each interface must respect the permissions defined for each user.

---

## Student Flow

One of the main interface flows is completing a self-regulation session.

In simplified form:

```text
Sign in
  ↓
Student Area
  ↓
Start Session
  ↓
Record Initial Mood
  ↓
Complete Activity
  ↓
Record Final Mood
  ↓
End Session
  ↓
History
```

Depending on the state identified and the business rules, the flow may also involve raising an alert.

---

## Professional Interfaces

Teachers, school psychologists and clinical psychologists have interfaces focused mainly on following the students they have access to.

The planned features include:

- viewing students;
- viewing authorized information;
- viewing alerts;
- following records;
- recording notes, when permitted;
- viewing announcements.

Specific features may vary by professional profile.

---

## Administrative Interface

The administrative area must provide resources to manage the platform, including:

- users;
- students;
- professionals;
- links;
- follow-up records;
- content;
- other necessary administrative information.

---

## Interface Principles

The MKpause interface should aim for:

- clarity;
- simplicity;
- consistency;
- ease of navigation;
- accessibility;
- appropriate feedback for actions;
- fewer unnecessary steps;
- language suited to the audience;
- a clear distinction between actions and information.

Because the system handles sensitive information and follow-up situations, the interface must also avoid exposing data unnecessarily.

---

## Responsiveness

Interfaces should be planned for different screen sizes whenever this falls within the scope of the implementation.

Information should remain understandable and usable on the devices supported by the project.

---

## Accessibility

Interface decisions must take into account the accessibility requirements defined for MKpause.

Key points include:

- adequate contrast;
- readable text;
- clear visual hierarchy;
- understandable labels for controls;
- consistent navigation;
- not relying on color alone to convey information;
- feedback the user can understand.

---

## Validation

Wireframes and prototypes must be validated by the team before they are considered final versions of the documentation.

Validation should focus mainly on:

- alignment with the requirements;
- consistency with the use cases;
- clarity of the flows;
- the features available to each profile;
- ease of use;
- consistency across screens.

---

## Status

> **Under validation**

The MKpause wireframes and prototypes are subject to review by the team.

Once validated, the approved files should be added to the corresponding directories in this section.

---

## Related documents

- [Requirements](../02-requisitos/README.en.md)
- [Use Cases](../03-casos-de-uso/README.en.md)
- [Data Modeling](../04-modelagem-de-dados/README.en.md)
- [Scientific Rationale](../07-fundamentacao/README.en.md)
