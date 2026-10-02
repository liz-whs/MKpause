# Modelo Lógico

O modelo lógico do **MKpause** representa a transformação do modelo conceitual para uma estrutura compatível com bancos de dados relacionais.

Nesta etapa são definidos:

- tabelas;
- atributos;
- chaves primárias (PK);
- chaves estrangeiras (FK);
- relacionamentos;
- tabelas associativas;
- restrições estruturais.

O modelo lógico serve como base para a futura construção do modelo físico e implementação do banco de dados.

---

# Convenções

Nesta documentação são utilizadas as seguintes identificações:

| Sigla | Significado |
|---|---|
| `PK` | Primary Key — Chave Primária |
| `FK` | Foreign Key — Chave Estrangeira |
| `PK/FK` | Atributo que participa simultaneamente da chave primária e referencia outra tabela |
| `1:N` | Relacionamento um-para-muitos |
| `N:N` | Relacionamento muitos-para-muitos |

---

# Tabelas Principais

## 🎓 ESTUDANTE

Armazena os dados dos estudantes cadastrados no MKpause.

### Estrutura geral

- `id_estudante` — PK
- nome
- data de nascimento
- dados de contato
- dados de autenticação
- informações escolares
- turma
- situação do cadastro

### Relacionamentos

O estudante pode estar relacionado a:

- sessões;
- alertas;
- observações;
- ficha de acompanhamento;
- professores;
- psicólogos;
- responsáveis.

---

## 👨‍🏫 PROFESSOR

Armazena os dados dos professores cadastrados.

### Estrutura geral

- `id_professor` — PK
- nome
- dados de contato
- dados de autenticação
- informações institucionais
- situação do cadastro

### Relacionamentos

Um professor pode possuir vínculo com diferentes estudantes.

O relacionamento com estudantes é representado por uma tabela associativa.

---

## 🏫 PSICOLOGO_ESCOLAR

Armazena os dados dos psicólogos escolares.

### Estrutura geral

- `id_psicologo_escolar` — PK
- nome
- dados de contato
- dados de autenticação
- número do registro profissional
- estado do registro profissional
- informações institucionais
- situação do cadastro

---

## 🧠 PSICOLOGO_CLINICO

Armazena os dados dos psicólogos clínicos.

### Estrutura geral

- `id_psicologo_clinico` — PK
- nome
- dados de contato
- dados de autenticação
- número do registro profissional
- estado do registro profissional
- situação do cadastro

---

## 👨‍👩‍👧 RESPONSAVEL

Armazena os dados dos responsáveis vinculados aos estudantes.

### Estrutura geral

- `id_responsavel` — PK
- nome
- dados de contato
- dados necessários ao vínculo
- situação do cadastro

O vínculo entre responsável e estudante pode ser estabelecido após o cadastro inicial do estudante.

---

## ⚙️ ADMINISTRADOR

Armazena os dados dos usuários responsáveis pela administração da plataforma.

### Estrutura geral

- `id_administrador` — PK
- nome
- dados de contato
- dados de autenticação
- situação do cadastro

---

# 🧘 SESSAO

Representa uma sessão de autorregulação realizada por um estudante.

### Estrutura geral

- `id_sessao` — PK
- `id_estudante` — FK
- data da sessão
- horário de início
- horário de término
- informações relacionadas à sessão

### Relacionamento

```text id="w6qgpy"
ESTUDANTE
    1
    │
    │
    N
 SESSAO
```

Um estudante pode realizar diversas sessões.

Cada sessão pertence a um único estudante.

---

# 🙂 REGISTRO_HUMOR

Armazena os estados emocionais informados durante uma sessão.

### Estrutura geral

- `id_registro_humor` — PK
- `id_sessao` — FK
- estado registrado
- momento do registro
- data e horário

O atributo responsável pelo momento permite distinguir registros como:

- pré-sessão;
- pós-sessão.

### Relacionamento

```text id="40xigv"
SESSAO
   1
   │
   │
   N
REGISTRO_HUMOR
```

---

# 🎮 ATIVIDADE

Representa os recursos de autorregulação disponibilizados aos estudantes.

### Estrutura geral

- `id_atividade` — PK
- nome
- descrição
- tipo
- conteúdo ou referência ao recurso
- situação de disponibilidade

Uma atividade pode representar:

- jogo;
- vídeo;
- exercício;
- técnica de respiração;
- outro recurso de autorregulação.

---

# 🚨 ALERTA

Armazena os alertas relacionados aos estudantes.

### Estrutura geral

- `id_alerta` — PK
- `id_estudante` — FK
- `id_sessao` — FK, quando aplicável
- nível
- data
- horário
- situação
- informações relacionadas ao alerta

### Relacionamentos

```text id="z7occu"
ESTUDANTE 1 ───── N ALERTA
```

Um alerta pertence a um estudante.

Quando originado durante uma sessão, também pode possuir referência à sessão correspondente.

Os destinatários devem ser determinados pelos vínculos e regras de acesso da plataforma.

---

# 📝 OBSERVACAO

Armazena observações registradas sobre estudantes.

### Estrutura geral

- `id_observacao` — PK
- `id_estudante` — FK
- conteúdo
- data
- horário
- identificação do autor

O sistema deve permitir identificar se a observação foi registrada por um:

- Professor;
- Psicólogo Escolar.

A estratégia utilizada para representar diferentes tipos de autor deverá permanecer consistente com a implementação definida para o banco.

---

# 📋 FICHA_ACOMPANHAMENTO

Armazena informações utilizadas no acompanhamento do estudante.

### Estrutura geral

- `id_ficha` — PK
- `id_estudante` — FK
- informações de acompanhamento
- data de criação
- data da última atualização
- situação

### Relacionamento

A ficha está associada ao estudante correspondente.

Caso a regra do projeto determine **uma única ficha por estudante**, `id_estudante` deve possuir restrição que impeça a existência de múltiplas fichas para o mesmo estudante.

---

# 📢 AVISO

Armazena comunicados disponibilizados aos usuários.

### Estrutura geral

- `id_aviso` — PK
- título
- conteúdo
- data de publicação
- responsável pela publicação
- público destinatário
- situação

---

# Tabelas Associativas

Relacionamentos N:N identificados no modelo conceitual são transformados em tabelas associativas no modelo lógico.

---

## 🔗 PROFESSOR_ESTUDANTE

Representa o vínculo entre professores e estudantes.

```text id="afudfr"
PROFESSOR
    │
    │ 1
    │
    N
PROFESSOR_ESTUDANTE
    N
    │
    │ 1
    │
ESTUDANTE
```

### Estrutura

- `id_professor` — PK/FK
- `id_estudante` — PK/FK

A combinação dos dois identificadores pode formar a chave primária da associação.

Informações específicas do vínculo também podem ser adicionadas quando necessárias.

---

## 🔗 PSICOLOGO_ESCOLAR_ESTUDANTE

Representa os vínculos entre psicólogos escolares e estudantes.

### Estrutura

- `id_psicologo_escolar` — PK/FK
- `id_estudante` — PK/FK

---

## 🔗 PSICOLOGO_CLINICO_ESTUDANTE

Representa os vínculos entre psicólogos clínicos e estudantes.

### Estrutura

- `id_psicologo_clinico` — PK/FK
- `id_estudante` — PK/FK

Esse vínculo pode ser utilizado pelas regras de autorização para determinar quais estudantes podem ser consultados pelo profissional.

---

## 🔗 ESTUDANTE_RESPONSAVEL

Representa o relacionamento entre estudantes e responsáveis.

### Estrutura

- `id_estudante` — PK/FK
- `id_responsavel` — PK/FK
- relação ou grau de vínculo, quando necessário
- situação do vínculo

### Transformação

Modelo conceitual:

```text id="mrl7fi"
ESTUDANTE N ───── N RESPONSAVEL
```

Modelo lógico:

```text id="1bs04n"
ESTUDANTE
    │
    ▼
ESTUDANTE_RESPONSAVEL
    ▲
    │
RESPONSAVEL
```

---

## 🔗 SESSAO_ATIVIDADE

Representa quais atividades foram utilizadas em determinada sessão.

### Estrutura

- `id_sessao` — PK/FK
- `id_atividade` — PK/FK

Podem ser adicionadas informações específicas da utilização da atividade, caso sejam necessárias posteriormente.

### Transformação

Modelo conceitual:

```text id="1qihhu"
SESSAO N ───── N ATIVIDADE
```

Modelo lógico:

```text id="1x4rxc"
SESSAO
   │
   ▼
SESSAO_ATIVIDADE
   ▲
   │
ATIVIDADE
```

---

# Resumo das Relações

| Origem | Relação | Destino | Implementação |
|---|---|---|---|
| Estudante | 1:N | Sessão | FK em `SESSAO` |
| Sessão | 1:N | Registro de Humor | FK em `REGISTRO_HUMOR` |
| Estudante | 1:N | Alerta | FK em `ALERTA` |
| Estudante | 1:N | Observação | FK em `OBSERVACAO` |
| Estudante | 1:1* | Ficha | FK em `FICHA_ACOMPANHAMENTO` |
| Professor | N:N | Estudante | `PROFESSOR_ESTUDANTE` |
| Psicólogo Escolar | N:N | Estudante | `PSICOLOGO_ESCOLAR_ESTUDANTE` |
| Psicólogo Clínico | N:N | Estudante | `PSICOLOGO_CLINICO_ESTUDANTE` |
| Estudante | N:N | Responsável | `ESTUDANTE_RESPONSAVEL` |
| Sessão | N:N | Atividade | `SESSAO_ATIVIDADE` |

\* Considerando a regra atualmente prevista de uma ficha de acompanhamento por estudante.

---

# Integridade Referencial

As chaves estrangeiras devem garantir que relacionamentos inválidos não sejam criados.

Por exemplo:

- uma sessão não pode referenciar um estudante inexistente;
- um registro de humor não pode referenciar uma sessão inexistente;
- um vínculo não pode referenciar usuários inexistentes;
- uma observação não pode estar associada a um estudante inexistente.

As regras específicas para exclusão e atualização deverão ser definidas no modelo físico considerando a necessidade de preservação do histórico.

---

# Exclusões e Histórico

Registros históricos relevantes não devem ser eliminados automaticamente sem análise de suas dependências.

Por exemplo, a remoção cadastral de um estudante não deve provocar perda indiscriminada de:

- sessões anteriores;
- alertas;
- observações;
- registros de acompanhamento.

Quando necessário, poderá ser adotada uma estratégia de desativação lógica do cadastro em vez de exclusão física.

Essa decisão deve ser formalizada durante a implementação do banco de dados.

---

# Modelo Conceitual x Modelo Lógico

Exemplo de transformação:

```text id="q7xk51"
MODELO CONCEITUAL

ESTUDANTE N ───────── N PROFESSOR


            ↓ transformação


MODELO LÓGICO

ESTUDANTE
    │
    │
    ▼
PROFESSOR_ESTUDANTE
    ▲
    │
    │
PROFESSOR
```

A tabela associativa resolve o relacionamento N:N dentro do modelo relacional.

---

# Diagrama Lógico

O diagrama do modelo lógico está armazenado em:

[`diagramas/`](./diagramas/)

Quando o arquivo estiver disponível como imagem:

```md id="ad4v2y"
![Modelo Lógico do MKpause](./diagramas/modelo-logico.png)
```

Também é recomendado manter o arquivo editável utilizado na ferramenta de modelagem junto à documentação do projeto.

---

# Próxima Etapa

O modelo lógico serve como base para o **modelo físico**, no qual serão definidos aspectos específicos do SGBD escolhido, incluindo:

- tipos de dados;
- tamanhos dos campos;
- `NOT NULL`;
- `UNIQUE`;
- `DEFAULT`;
- índices;
- restrições;
- estratégias de `ON DELETE` e `ON UPDATE`;
- comandos de criação das tabelas.

---

## Documentos relacionados

- [Modelo Conceitual](./modelo-conceitual.md)
- [Requisitos de Dados](../02-requisitos/requisitos-de-dados.md)
- [Regras de Negócio](../02-requisitos/regras-de-negocio.md)
- [Casos de Uso](../03-casos-de-uso/casos-de-uso.md)