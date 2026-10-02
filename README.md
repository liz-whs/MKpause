# MKpause

O **MKpause** é uma plataforma de apoio à **autorregulação emocional de estudantes**, desenvolvida para o ambiente escolar. O sistema oferece recursos que auxiliam o estudante a reconhecer seu estado emocional, realizar atividades de autorregulação e acompanhar seu histórico ao longo do tempo.

Além da experiência do estudante, a plataforma permite o acompanhamento por profissionais responsáveis, como **professores, psicólogos escolares e psicólogos clínicos**, com diferentes níveis de acesso e funcionalidades de acordo com cada perfil.

> Projeto acadêmico desenvolvido durante o curso de **Engenharia de Software da Pontifícia Universidade Católica do Paraná (PUCPR)**.

---

## 🎯 Objetivo

O MKpause busca oferecer um ambiente acessível e estruturado para auxiliar estudantes em momentos de sobrecarga emocional dentro do contexto escolar.

Por meio de sessões de autorregulação, o estudante pode registrar como está se sentindo, acessar atividades e conteúdos de apoio e registrar novamente seu estado ao final da sessão.

As informações geradas durante esse processo permitem acompanhar a evolução do estudante e identificar situações que possam exigir atenção dos profissionais responsáveis.

---

## 👥 Usuários do sistema

O sistema contempla diferentes perfis de usuário:

### 🎓 Estudante

Utiliza os recursos de autorregulação oferecidos pela plataforma, podendo:

- realizar sessões de autorregulação;
- registrar seu humor antes e depois das sessões;
- acessar atividades e conteúdos;
- emitir alertas quando necessário;
- consultar seu histórico.

### 👨‍🏫 Professor

Participa do acompanhamento dos estudantes vinculados a ele, podendo consultar informações permitidas pelo sistema, receber alertas e registrar observações.

### 🏫 Psicólogo Escolar

Realiza o acompanhamento dos estudantes no contexto da instituição de ensino, podendo consultar estudantes vinculados, receber alertas e registrar observações.

### 🧠 Psicólogo Clínico

Possui acesso às informações necessárias para o acompanhamento clínico do estudante e aos registros disponibilizados pelo sistema de acordo com suas permissões.

### ⚙️ Administrador

Responsável pelo gerenciamento da plataforma, incluindo usuários, registros e vínculos necessários para o funcionamento do sistema.

---

## ✨ Principais funcionalidades

Entre as principais funcionalidades previstas para o MKpause estão:

- autenticação de usuários;
- gerenciamento de diferentes perfis de acesso;
- realização de sessões de autorregulação;
- registro de humor pré e pós-sessão;
- disponibilização de atividades e conteúdos;
- avaliação do estado registrado pelo estudante;
- emissão e recebimento de alertas;
- registro de observações;
- consulta ao histórico do estudante;
- acompanhamento por profissionais;
- gerenciamento de estudantes;
- gerenciamento de professores;
- gerenciamento de psicólogos;
- gerenciamento de fichas de acompanhamento;
- gerenciamento dos vínculos entre estudantes e profissionais.

---

## 🔄 Sessão de autorregulação

A sessão de autorregulação representa um dos principais fluxos do MKpause.

De forma simplificada:

```text
Estudante inicia uma sessão
        ↓
Registra o humor inicial
        ↓
Sistema avalia o estado registrado
        ↓
Estudante acessa atividades de autorregulação
        ↓
Registra o humor após a atividade
        ↓
Sistema registra os dados da sessão
        ↓
Histórico do estudante é atualizado
```

Dependendo do estado identificado durante o processo, o sistema também pode permitir a geração de alertas para os profissionais responsáveis pelo acompanhamento.

---

## 📚 Documentação

A documentação completa está organizada na pasta [`docs`](./docs).

### Visão geral

- [Contexto](./docs/01-visao-geral/contexto.md)
- [Problema](./docs/01-visao-geral/problema.md)
- [Objetivos](./docs/01-visao-geral/objetivos.md)
- [Escopo](./docs/01-visao-geral/escopo.md)

### Requisitos

- [Requisitos Funcionais](./docs/02-requisitos/requisitos-funcionais.md)
- [Requisitos Não Funcionais](./docs/02-requisitos/requisitos-nao-funcionais.md)
- [Requisitos de Dados](./docs/02-requisitos/requisitos-de-dados.md)
- [Regras de Negócio](./docs/02-requisitos/regras-de-negocio.md)
- [Fontes de Informação](./docs/02-requisitos/fontes-de-informacao.md)

### Casos de uso

- [Atores](./docs/03-casos-de-uso/atores.md)
- [Casos de Uso](./docs/03-casos-de-uso/casos-de-uso.md)
- [Diagrama de Casos de Uso](./docs/03-casos-de-uso/README.md)

### Modelagem de dados

- [Modelo Conceitual](./docs/04-modelagem-de-dados/modelo-conceitual.md)
- [Modelo Lógico](./docs/04-modelagem-de-dados/modelo-logico.md)

### Interface

- [Interface e Protótipos](./docs/05-interface/README.md)

---

## 📁 Estrutura do repositório

```text
MKpause/
│
├── README.md
│
├── docs/
│   ├── 01-visao-geral/
│   ├── 02-requisitos/
│   ├── 03-casos-de-uso/
│   ├── 04-modelagem-de-dados/
│   ├── 05-interface/
│   └── 06-relatorios/
│
├── src/
│
└── assets/
    ├── images/
    └── logo/
```

| Diretório | Descrição |
|---|---|
| `docs/` | Documentação técnica e de requisitos |
| `docs/01-visao-geral/` | Contexto, problema, objetivos e escopo |
| `docs/02-requisitos/` | Requisitos e regras do sistema |
| `docs/03-casos-de-uso/` | Atores, casos de uso e diagramas |
| `docs/04-modelagem-de-dados/` | Modelos conceitual e lógico |
| `docs/05-interface/` | Wireframes e protótipos |
| `docs/06-relatorios/` | Relatórios e documentos complementares |
| `src/` | Código-fonte da aplicação |
| `assets/` | Imagens, logos e outros recursos visuais |

---

## 🛠️ Tecnologias

As tecnologias utilizadas na implementação serão documentadas conforme o desenvolvimento da aplicação avançar.

---

## 🚧 Status do projeto

**Em desenvolvimento.**

Atualmente, o projeto encontra-se nas etapas de **levantamento e especificação de requisitos, modelagem do sistema e definição da arquitetura da solução**.

---

## 🎓 Contexto acadêmico

O MKpause é desenvolvido como projeto acadêmico no curso de **Engenharia de Software da PUCPR**, aplicando conceitos de Engenharia de Requisitos, Modelagem de Sistemas, Banco de Dados, Experiência do Usuário e Desenvolvimento de Software.