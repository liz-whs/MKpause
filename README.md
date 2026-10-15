**Português** · [English](./README.en.md)

# MKpause

O **MKpause** (*Make a Pause*) é uma plataforma de apoio à **autorregulação emocional de estudantes** no ambiente escolar. O sistema oferece ao estudante um momento curto e guiado para reconhecer como está, realizar uma atividade de autorregulação e registrar como se sente depois.

A plataforma também permite o acompanhamento por **professores, psicólogos escolares e psicólogos clínicos**, com níveis de acesso definidos para cada perfil.

> Projeto acadêmico desenvolvido no curso de **Engenharia de Software da Pontifícia Universidade Católica do Paraná (PUCPR)**.

---

## Objetivo

Oferecer um ambiente acessível e estruturado para auxiliar estudantes em momentos de sobrecarga emocional no contexto escolar.

Em cada sessão, o estudante registra como está se sentindo, realiza uma atividade de apoio e registra novamente seu estado ao final. Essas informações permitem acompanhar a evolução do estudante e identificar situações que exigem atenção dos profissionais responsáveis.

O MKpause é uma ferramenta de **apoio**: não realiza diagnóstico, não substitui o acompanhamento profissional e não é um serviço de emergência.

---

## Fundamentação científica

As principais decisões do projeto são fundamentadas em pesquisas publicadas:

| Decisão | Fonte |
|---|---|
| Respiração guiada em ritmo lento e presença de profissionais no processo | Bentley et al. (2023), revisão sistemática |
| Jogos simples, curtos e sem penalidade | Pine et al. (2020), revisão sistemática |
| Paleta clara e pouco saturada | Valdez e Mehrabian (1994) |
| Formas curvas na interface e silhueta arredondada do mascote | Bar e Neta (2006) |
| Chinchila como mascote: um animal que se estressa com facilidade, como o estudante que precisa de uma pausa | Escolha simbólica da equipe |

A análise completa está em [Fundamentação Científica](./docs/07-fundamentacao/README.md).

---

## Usuários do sistema

| Perfil | Papel |
|---|---|
| Estudante | Realiza sessões de autorregulação, registra o humor antes e depois, acessa atividades, emite alertas e consulta seu histórico |
| Professor | Acompanha os estudantes vinculados, recebe alertas e registra observações |
| Psicólogo Escolar | Acompanha os estudantes no contexto da instituição, recebe alertas e registra observações |
| Psicólogo Clínico | Consulta as informações necessárias ao acompanhamento clínico, conforme suas permissões |
| Administrador | Gerencia usuários, vínculos, fichas de acompanhamento e conteúdos |

O **Responsável** é vinculado ao estudante após o cadastro inicial, por meio de convite.

---

## Principais funcionalidades

- autenticação e controle de acesso por perfil e por vínculo;
- sessões de autorregulação com registro de humor antes e depois;
- atividades de apoio: jogos, vídeos e exercícios de respiração;
- avaliação do estado registrado e emissão de alertas;
- registro de observações por profissionais escolares;
- histórico de sessões do estudante;
- gerenciamento de usuários, vínculos, fichas e conteúdos.

---

## Sessão de autorregulação

```text
Estudante inicia uma sessão
        ↓
Registra o humor inicial
        ↓
Sistema avalia o estado registrado
        ↓
Estudante realiza uma atividade de autorregulação
        ↓
Registra o humor após a atividade
        ↓
Sistema registra os dados da sessão
        ↓
Histórico do estudante é atualizado
```

Conforme o estado identificado, o sistema pode gerar alertas para os profissionais responsáveis pelo acompanhamento.

---

## Atividades disponíveis

| Atividade | Descrição | Documentação |
|---|---|---|
| PianoPause | Jogo de teclas musicais, sem pontuação, com pausa para respiração guiada | [README do PianoPause](./src/jogos/pianopause/README.md) |

---

## Documentação

A documentação completa está organizada em [`docs/`](./docs/README.md).

| Seção | Conteúdo |
|---|---|
| [01. Visão Geral](./docs/01-visao-geral/README.md) | Contexto, problema, objetivos e escopo |
| [02. Requisitos](./docs/02-requisitos/README.md) | Requisitos funcionais, não funcionais, de dados, regras de negócio e fontes |
| [03. Casos de Uso](./docs/03-casos-de-uso/README.md) | Atores, especificação dos casos de uso e diagrama |
| [04. Modelagem de Dados](./docs/04-modelagem-de-dados/README.md) | Modelos conceitual e lógico |
| [05. Interface](./docs/05-interface/README.md) | Princípios de interface, fluxos, wireframes e protótipos |
| [06. Relatórios](./docs/06-relatorios/README.md) | Relatórios e documentos complementares |
| [07. Fundamentação Científica](./docs/07-fundamentacao/README.md) | Pesquisas que fundamentam o propósito, as atividades, a paleta, as formas e o mascote |

---

## Estrutura do repositório

```text
MKpause/
├── README.md
├── docs/
│   ├── 01-visao-geral/
│   ├── 02-requisitos/
│   ├── 03-casos-de-uso/
│   ├── 04-modelagem-de-dados/
│   ├── 05-interface/
│   ├── 06-relatorios/
│   └── 07-fundamentacao/
└── src/
    └── jogos/
        └── pianopause/
```

| Diretório | Descrição |
|---|---|
| `docs/` | Documentação de requisitos, modelagem, interface e fundamentação |
| `src/` | Código-fonte da aplicação |
| `src/jogos/` | Jogos de autorregulação, um diretório por jogo |

Todos os documentos possuem versão em português (`arquivo.md`) e em inglês (`arquivo.en.md`).

---

## Tecnologias

| Componente | Tecnologia |
|---|---|
| PianoPause | Python 3.10+ e pygame-ce |
| Plataforma | Em definição |

---

## Status do projeto

**Em desenvolvimento.**

O projeto está nas etapas de especificação de requisitos, modelagem do sistema e definição da arquitetura. O primeiro jogo, PianoPause, já está implementado e funciona de forma independente da plataforma.

---

## Contexto acadêmico

O MKpause é desenvolvido como projeto acadêmico no curso de **Engenharia de Software da PUCPR**, aplicando conceitos de Engenharia de Requisitos, Modelagem de Sistemas, Banco de Dados, Experiência do Usuário e Desenvolvimento de Software.
