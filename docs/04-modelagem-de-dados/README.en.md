[Português](./README.md) · **English**

# MKpause Data Modeling

This section presents the **MKpause** data model, which represents the information the platform needs to operate and the relationships between that information.

The model was developed from the functional requirements, data requirements, business rules and use cases defined for the system.

---

## Documentation

- [Conceptual Model](./modelo-conceitual.en.md)
- [Logical Model](./modelo-logico.en.md)
- [Data Requirements](../02-requisitos/requisitos-de-dados.en.md)
- [Business Rules](../02-requisitos/regras-de-negocio.en.md)

---

## Conceptual Model

The conceptual model represents the main entities in the domain and their relationships, without defining database implementation details.

Its main purpose is to answer:

> What information exists in the MKpause domain, and how is it related?

The elements represented include:

- students;
- teachers;
- psychologists;
- guardians;
- sessions;
- mood records;
- alerts;
- notes;
- follow-up records;
- activities;
- links between users.

The conceptual model is detailed in:

[Conceptual Model](./modelo-conceitual.en.md)

---

## Logical Model

The logical model turns the conceptual structure into an organization compatible with relational databases.

This stage defines elements such as:

- tables;
- attributes;
- primary keys;
- foreign keys;
- relationships;
- associative tables;
- structural constraints.

Many-to-many relationships identified in the conceptual model become associative structures in the logical model.

The logical model is detailed in:

[Logical Model](./modelo-logico.en.md)

---

## How the Model Evolves

```text
Data Requirements
        ↓
Conceptual Model
        ↓
Entities and Relationships
        ↓
Logical Model
        ↓
Tables, PKs and FKs
        ↓
Physical Model
        ↓
Database
```

Each stage adds more detail to the data structure.

---

## Diagrams

The modeling diagrams are stored in:

- [Conceptual Model (PDF)](./diagramas/modelo-conceitual.pdf)
- [Logical Model (PDF)](./diagramas/modelo-logico.pdf)

The diagrams are in Portuguese. Whenever the data requirements change significantly, the model must be reviewed for possible impacts on entities, attributes, relationships and cardinalities.

---

## Traceability

The model must remain consistent with:

- [Functional Requirements](../02-requisitos/requisitos-funcionais.en.md)
- [Data Requirements](../02-requisitos/requisitos-de-dados.en.md)
- [Business Rules](../02-requisitos/regras-de-negocio.en.md)
- [Use Cases](../03-casos-de-uso/casos-de-uso.en.md)

Changes to the data structure must also be reviewed against the system's implementation and tests.
