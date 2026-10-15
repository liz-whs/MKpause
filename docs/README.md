**Português** · [English](./README.en.md)

# Documentação do MKpause

Este diretório reúne a documentação do MKpause, organizada na ordem em que os artefatos são produzidos: do entendimento do problema até a fundamentação das decisões de design.

---

## Seções

| Seção | Conteúdo | Documentos principais |
|---|---|---|
| [01. Visão Geral](./01-visao-geral/README.md) | O contexto, o problema e o que o sistema se propõe a fazer | [Contexto](./01-visao-geral/contexto.md), [Problema](./01-visao-geral/problema.md), [Objetivos](./01-visao-geral/objetivos.md), [Escopo](./01-visao-geral/escopo.md) |
| [02. Requisitos](./02-requisitos/README.md) | O que o sistema deve fazer e sob quais regras | [Funcionais](./02-requisitos/requisitos-funcionais.md), [Não Funcionais](./02-requisitos/requisitos-nao-funcionais.md), [Dados](./02-requisitos/requisitos-de-dados.md), [Regras de Negócio](./02-requisitos/regras-de-negocio.md), [Fontes](./02-requisitos/fontes-de-informacao.md) |
| [03. Casos de Uso](./03-casos-de-uso/README.md) | Quem interage com o sistema e como | [Atores](./03-casos-de-uso/atores.md), [Casos de Uso](./03-casos-de-uso/casos-de-uso.md) |
| [04. Modelagem de Dados](./04-modelagem-de-dados/README.md) | Como as informações são estruturadas | [Modelo Conceitual](./04-modelagem-de-dados/modelo-conceitual.md), [Modelo Lógico](./04-modelagem-de-dados/modelo-logico.md) |
| [05. Interface](./05-interface/README.md) | Princípios, fluxos e protótipos das telas | [Interface](./05-interface/README.md) |
| [06. Relatórios](./06-relatorios/README.md) | Relatórios e documentos complementares | [Relatórios](./06-relatorios/README.md) |
| [07. Fundamentação Científica](./07-fundamentacao/README.md) | Por que o sistema tem a forma atual | [Propósito](./07-fundamentacao/proposito.md), [Atividades](./07-fundamentacao/atividades-de-autorregulacao.md), [Paleta](./07-fundamentacao/paleta-de-cores.md), [Formas e Mascote](./07-fundamentacao/formas-e-mascote.md), [Referências](./07-fundamentacao/referencias.md) |

---

## Ordem de leitura sugerida

Para quem está conhecendo o projeto:

1. [Visão Geral](./01-visao-geral/README.md), para entender o problema;
2. [Propósito do Sistema](./07-fundamentacao/proposito.md), para entender a proposta e sua fundamentação;
3. [Requisitos Funcionais](./02-requisitos/requisitos-funcionais.md) e [Casos de Uso](./03-casos-de-uso/casos-de-uso.md), para entender o funcionamento;
4. [Modelagem de Dados](./04-modelagem-de-dados/README.md), para entender a estrutura das informações.

---

## Rastreabilidade

Os artefatos estão relacionados entre si:

```text
Fontes de Informação e Fundamentação Científica
        ↓
Requisitos e Regras de Negócio
        ↓
Casos de Uso
        ↓
Modelagem de Dados
        ↓
Interface e Implementação
        ↓
Testes
```

Requisitos, regras e casos de uso usam identificadores (`RFXX`, `RNFXX`, `RNXX`, `UCXX`) que permitem relacionar um documento a outro.

---

## Convenções

- Cada documento possui versão em português (`arquivo.md`) e em inglês (`arquivo.en.md`). O português é a versão de referência.
- Alterações em um artefato devem ser verificadas nos documentos relacionados.
- Diagramas ficam no subdiretório `diagramas/` da seção correspondente.
