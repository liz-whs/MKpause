# Modelagem de Dados — MKpause

Esta seção apresenta a modelagem de dados do **MKpause**, responsável por representar as informações necessárias ao funcionamento da plataforma e os relacionamentos existentes entre elas.

A modelagem foi desenvolvida a partir dos requisitos funcionais, requisitos de dados, regras de negócio e casos de uso definidos para o sistema.

---

## 📌 Documentação

- [Modelo Conceitual](./modelo-conceitual.md)
- [Modelo Lógico](./modelo-logico.md)
- [Requisitos de Dados](../02-requisitos/requisitos-de-dados.md)
- [Regras de Negócio](../02-requisitos/regras-de-negocio.md)

---

# Modelo Conceitual

O modelo conceitual representa as principais entidades do domínio e seus relacionamentos sem definir detalhes específicos de implementação do banco de dados.

Seu objetivo é responder principalmente:

> Quais informações existem no domínio do MKpause e como elas se relacionam?

Entre os elementos representados estão:

- estudantes;
- professores;
- psicólogos;
- responsáveis;
- sessões;
- registros de humor;
- alertas;
- observações;
- fichas de acompanhamento;
- atividades;
- vínculos entre usuários.

O modelo conceitual está detalhado em:

➡️ [Modelo Conceitual](./modelo-conceitual.md)

---

# Modelo Lógico

O modelo lógico transforma a estrutura conceitual em uma organização compatível com bancos de dados relacionais.

Nesta etapa são definidos elementos como:

- tabelas;
- atributos;
- chaves primárias;
- chaves estrangeiras;
- relacionamentos;
- tabelas associativas;
- restrições estruturais.

Relacionamentos muitos-para-muitos identificados no modelo conceitual são transformados em estruturas associativas no modelo lógico.

O modelo lógico está detalhado em:

➡️ [Modelo Lógico](./modelo-logico.md)

---

# Evolução da Modelagem

```text
Requisitos de Dados
        ↓
Modelo Conceitual
        ↓
Entidades e Relacionamentos
        ↓
Modelo Lógico
        ↓
Tabelas, PKs e FKs
        ↓
Modelo Físico
        ↓
Banco de Dados
```

Cada etapa adiciona maior nível de detalhe à estrutura dos dados.

---

# Diagramas

Os diagramas relacionados à modelagem estão armazenados em:

[`diagramas/`](./diagramas/)

Sempre que houver alterações relevantes nos requisitos de dados, a modelagem deve ser revisada para verificar possíveis impactos em entidades, atributos, relacionamentos e cardinalidades.

---

# Rastreabilidade

A modelagem deve permanecer consistente com:

- [Requisitos Funcionais](../02-requisitos/requisitos-funcionais.md)
- [Requisitos de Dados](../02-requisitos/requisitos-de-dados.md)
- [Regras de Negócio](../02-requisitos/regras-de-negocio.md)
- [Casos de Uso](../03-casos-de-uso/casos-de-uso.md)

Alterações na estrutura de dados também devem ser analisadas em relação à implementação e aos testes do sistema.