# Modelo Conceitual

O modelo conceitual do **MKpause** representa as principais entidades existentes no domínio da aplicação e os relacionamentos entre elas.

Nesta etapa, o foco está na representação das informações do negócio, sem considerar detalhes específicos de implementação em um Sistema Gerenciador de Banco de Dados.

---

# Objetivo

O modelo conceitual busca representar:

- quais informações precisam existir;
- quais entidades participam do sistema;
- quais características pertencem a cada entidade;
- como essas entidades se relacionam;
- quais cardinalidades existem entre os relacionamentos.

---

# Principais Entidades

## 🎓 Estudante

Representa o estudante que utiliza os recursos de autorregulação da plataforma.

O estudante está relacionado a elementos como:

- sessões;
- registros de humor;
- alertas;
- observações;
- ficha de acompanhamento;
- professores;
- psicólogos;
- responsáveis.

O estudante ocupa uma posição central na modelagem do MKpause, pois grande parte dos registros de acompanhamento está relacionada a ele.

---

## 👨‍🏫 Professor

Representa professores responsáveis pelo acompanhamento de estudantes no contexto escolar.

Um professor pode possuir vínculo com diferentes estudantes e registrar observações relacionadas aos estudantes aos quais possui acesso.

---

## 🏫 Psicólogo Escolar

Representa o profissional de psicologia que realiza acompanhamento dentro do contexto da instituição de ensino.

O psicólogo escolar pode estar vinculado a estudantes, receber alertas e registrar observações de acompanhamento.

---

## 🧠 Psicólogo Clínico

Representa o profissional responsável pelo acompanhamento clínico do estudante quando existir vínculo correspondente.

O psicólogo clínico pode consultar informações disponibilizadas pelo sistema conforme suas permissões e os vínculos estabelecidos.

---

## 👨‍👩‍👧 Responsável

Representa a pessoa responsável pelo estudante.

O responsável pode ser vinculado ao estudante posteriormente ao cadastro inicial por meio do processo definido pela plataforma.

---

## 🧘 Sessão

Representa uma sessão de autorregulação realizada por um estudante.

Uma sessão registra informações relacionadas ao processo realizado, incluindo:

- estudante;
- momento da realização;
- registros de humor;
- atividades utilizadas;
- possíveis alertas relacionados.

Um estudante pode realizar diversas sessões ao longo do tempo.

---

## 🙂 Registro de Humor

Representa o estado emocional informado pelo estudante durante uma sessão.

Os registros permitem diferenciar momentos como:

- pré-sessão;
- pós-sessão.

Dessa forma, uma mesma sessão pode possuir mais de um registro de humor.

---

## 🎮 Atividade

Representa um recurso de autorregulação disponibilizado pela plataforma.

Uma atividade pode representar:

- jogo;
- vídeo;
- exercício;
- técnica de respiração;
- outro recurso de autorregulação.

Uma sessão pode utilizar uma ou mais atividades.

Uma mesma atividade também pode ser utilizada em diferentes sessões.

---

## 🚨 Alerta

Representa uma situação registrada pelo sistema que necessita ser comunicada aos profissionais responsáveis pelo acompanhamento.

Um alerta está relacionado a um estudante e pode estar relacionado à sessão em que foi originado.

Dependendo das regras do sistema, profissionais vinculados ao estudante podem receber o alerta.

---

## 📝 Observação

Representa um registro realizado por um profissional sobre determinado estudante.

No modelo atual, observações podem ser registradas por:

- Professor;
- Psicólogo Escolar.

Toda observação deve permitir identificar o estudante relacionado e seu autor.

---

## 📋 Ficha de Acompanhamento

Representa o conjunto de informações utilizadas para acompanhamento do estudante.

A ficha permanece associada ao estudante e seu acesso depende das permissões estabelecidas para cada perfil.

---

## 📢 Aviso

Representa comunicados disponibilizados aos usuários da plataforma.

Um aviso pode possuir informações como título, conteúdo, data de publicação e público ao qual se destina.

---

# Principais Relacionamentos

## Estudante — Sessão

```text
ESTUDANTE 1 ───────── N SESSÃO
```

Um estudante pode realizar diversas sessões.

Cada sessão pertence a um estudante.

---

## Sessão — Registro de Humor

```text
SESSÃO 1 ───────── N REGISTRO_HUMOR
```

Uma sessão pode possuir diferentes registros de humor.

Cada registro pertence a uma sessão específica.

---

## Estudante — Professor

```text
ESTUDANTE N ───────── N PROFESSOR
```

Um estudante pode estar relacionado a diferentes professores e um professor pode acompanhar diferentes estudantes.

Esse relacionamento muitos-para-muitos será convertido em uma estrutura associativa no modelo lógico.

---

## Estudante — Psicólogo Escolar

O relacionamento permite representar os profissionais responsáveis pelo acompanhamento escolar do estudante.

Dependendo das regras definidas para a instituição, um profissional pode acompanhar diferentes estudantes.

---

## Estudante — Psicólogo Clínico

Representa o vínculo necessário para permitir o acompanhamento clínico previsto pela plataforma.

---

## Estudante — Responsável

```text
ESTUDANTE N ───────── N RESPONSÁVEL
```

O modelo permite representar situações em que um estudante possui mais de um responsável e um responsável está relacionado a mais de um estudante.

Esse relacionamento também pode exigir uma entidade associativa no modelo lógico.

---

## Estudante — Observação

```text
ESTUDANTE 1 ───────── N OBSERVAÇÃO
```

Um estudante pode possuir diversas observações ao longo do tempo.

Cada observação está relacionada a um estudante.

---

## Sessão — Atividade

```text
SESSÃO N ───────── N ATIVIDADE
```

Uma sessão pode utilizar diferentes atividades.

Uma atividade pode ser utilizada em diversas sessões.

Esse relacionamento é transformado em uma tabela associativa no modelo lógico.

---

## Estudante — Alerta

```text
ESTUDANTE 1 ───────── N ALERTA
```

Um estudante pode possuir diferentes alertas ao longo do tempo.

Cada alerta possui um estudante de origem.

---

## Estudante — Ficha de Acompanhamento

A ficha de acompanhamento está diretamente relacionada ao estudante.

A cardinalidade deve refletir a regra definida pelo projeto para existência e manutenção da ficha de cada estudante.

---

# Relacionamentos Muitos-para-Muitos

Relacionamentos **N:N** são permitidos no modelo conceitual.

Eles representam situações reais do domínio sem preocupação imediata com sua implementação em tabelas.

Exemplos existentes ou previstos no MKpause incluem:

```text
ESTUDANTE N ───── N PROFESSOR

ESTUDANTE N ───── N RESPONSÁVEL

SESSÃO N ───── N ATIVIDADE
```

No modelo lógico, esses relacionamentos são transformados em tabelas associativas.

---

# Conceitual x Lógico

Um ponto importante é que o modelo conceitual não precisa apresentar tabelas criadas exclusivamente para resolver relacionamentos N:N.

Por exemplo:

### Modelo Conceitual

```text
ESTUDANTE N ───────── N PROFESSOR
```

### Modelo Lógico

```text
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

A tabela associativa surge durante a transformação para o modelo relacional.

---

# Diagrama

O diagrama conceitual deve ser armazenado no diretório:

[`diagramas/`](./diagramas/)

Quando disponível como imagem, ele também pode ser exibido diretamente nesta documentação:

```md
![Modelo Conceitual do MKpause](./diagramas/modelo-conceitual.png)
```

---

## Documentos relacionados

- [Modelo Lógico](./modelo-logico.md)
- [Requisitos de Dados](../02-requisitos/requisitos-de-dados.md)
- [Regras de Negócio](../02-requisitos/regras-de-negocio.md)