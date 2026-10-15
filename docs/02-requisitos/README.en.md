[Português](./README.md) · **English**

# MKpause Requirements

This section contains the requirements defined for **MKpause**, describing the features the system offers, its constraints, the data it needs to operate and its main business rules.

The requirements documentation serves as a reference for the modeling, development and validation stages of the platform.

---

## Documents

### Functional Requirements

[Functional Requirements](./requisitos-funcionais.en.md)

Describe the features and behaviors the system must offer to its different users.

---

### Non-Functional Requirements

[Non-Functional Requirements](./requisitos-nao-funcionais.en.md)

Define quality attributes and constraints on how the platform operates, including security, usability, performance and accessibility.

---

### Data Requirements

[Data Requirements](./requisitos-de-dados.en.md)

Document the information the system must store and handle, supporting the conceptual and logical database models.

---

### Business Rules

[Business Rules](./regras-de-negocio.en.md)

Set out the rules that determine how specific MKpause processes and features must work.

---

### Information Sources

[Information Sources](./fontes-de-informacao.en.md)

Records the sources used to gather and define the project's requirements.

---

## Organization

Identifiers keep their original Portuguese prefixes, so the same ID is used in both language versions.

Functional requirements (*Requisitos Funcionais*) use the identifier:

`RFXX`

Example:

`RF01 — Sign in`

Non-functional requirements (*Requisitos Não Funcionais*) use:

`RNFXX`

Example:

`RNF01 — Authentication`

Business rules (*Regras de Negócio*) use:

`RNXX`

Example:

`RN01 — Mandatory authentication`

These identifiers make it possible to relate requirements, use cases, modeling and implementation as the project evolves.

---

## Traceability

Whenever possible, the requirements documented in this section should remain consistent with:

- the system's actors;
- the use cases;
- the use case diagram;
- the conceptual model;
- the logical model;
- the prototypes;
- the implementation.

Significant changes to a requirement should be checked against the other related artifacts.
