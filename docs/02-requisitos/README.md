# Requisitos do MKpause

Esta seção reúne os requisitos definidos para o **MKpause**, descrevendo as funcionalidades oferecidas pelo sistema, suas restrições, os dados necessários para seu funcionamento e as principais regras de negócio.

A documentação de requisitos serve como referência para as etapas de modelagem, desenvolvimento e validação da plataforma.

---

## Documentos

### Requisitos Funcionais

📄 [Requisitos Funcionais](./requisitos-funcionais.md)

Descrevem as funcionalidades e os comportamentos que o sistema deve oferecer aos diferentes usuários.

---

### Requisitos Não Funcionais

📄 [Requisitos Não Funcionais](./requisitos-nao-funcionais.md)

Definem características de qualidade e restrições relacionadas ao funcionamento da plataforma, incluindo aspectos como segurança, usabilidade, desempenho e acessibilidade.

---

### Requisitos de Dados

📄 [Requisitos de Dados](./requisitos-de-dados.md)

Documentam as informações que precisam ser armazenadas e manipuladas pelo sistema, servindo como apoio para a modelagem conceitual e lógica do banco de dados.

---

### Regras de Negócio

📄 [Regras de Negócio](./regras-de-negocio.md)

Apresentam regras que determinam como determinados processos e funcionalidades do MKpause devem funcionar.

---

### Fontes de Informação

📄 [Fontes de Informação](./fontes-de-informacao.md)

Registra as fontes utilizadas durante o levantamento e definição dos requisitos do projeto.

---

## Organização

Os requisitos funcionais utilizam a identificação:

`RFXX`

Exemplo:

`RF01 — Realizar login`

Os requisitos não funcionais utilizam:

`RNFXX`

Exemplo:

`RNF01 — Controle de acesso`

As regras de negócio utilizam:

`RNXX`

Exemplo:

`RN01 — Acesso conforme perfil`

Essa identificação permite relacionar requisitos, casos de uso, modelagem e implementação durante a evolução do projeto.

---

## Rastreabilidade

Sempre que possível, os requisitos documentados nesta seção devem permanecer consistentes com:

- os atores do sistema;
- os casos de uso;
- o diagrama de casos de uso;
- o modelo conceitual;
- o modelo lógico;
- os protótipos;
- a implementação.

Alterações significativas em um requisito devem ser verificadas nos demais artefatos relacionados.