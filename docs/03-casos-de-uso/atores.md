# Atores do Sistema

Os atores representam usuários ou elementos externos que interagem diretamente com as funcionalidades do **MKpause**.

Um ator em um diagrama de casos de uso representa um **papel desempenhado durante a interação com o sistema**, e não necessariamente uma entidade ou tabela do banco de dados.

---

# 🎓 Estudante

O **Estudante** é o principal usuário das funcionalidades de autorregulação do MKpause.

Ele utiliza a plataforma para acessar recursos de apoio, registrar seu estado emocional e manter um histórico das sessões realizadas.

## Principais interações

O estudante pode:

- realizar login;
- iniciar uma sessão de autorregulação;
- registrar o humor antes da sessão;
- acessar atividades, jogos e vídeos;
- registrar o humor após a atividade;
- solicitar auxílio;
- emitir alertas nas situações previstas;
- consultar seu histórico.

## Papel no sistema

O estudante é o ator central do fluxo:

```text
Realizar sessão de autorregulação
```

Durante esse processo, outras funcionalidades são executadas ou disponibilizadas de acordo com o estado registrado e as regras do sistema.

---

# 👨‍🏫 Professor

O **Professor** participa do acompanhamento dos estudantes no ambiente escolar.

Seu acesso é limitado aos estudantes e informações para os quais possui autorização.

## Principais interações

O professor pode:

- realizar login;
- consultar estudantes vinculados;
- receber alertas;
- consultar alertas;
- registrar observações;
- consultar informações permitidas pelo sistema;
- consultar avisos.

## Papel no sistema

O professor atua principalmente no acompanhamento de situações ocorridas no contexto escolar.

Ele não precisa atuar simultaneamente com o Psicólogo Escolar para utilizar funcionalidades que estejam associadas aos dois atores.

---

# 🏫 Psicólogo Escolar

O **Psicólogo Escolar** acompanha estudantes dentro do contexto da instituição de ensino.

## Principais interações

O psicólogo escolar pode:

- realizar login;
- consultar estudantes vinculados;
- receber alertas;
- consultar alertas;
- registrar observações;
- consultar informações autorizadas;
- consultar avisos.

## Papel no sistema

Professor e Psicólogo Escolar podem possuir acesso a algumas funcionalidades em comum, porém representam **papéis distintos** dentro do sistema.

A existência dessas funcionalidades compartilhadas não representa uma generalização obrigatória entre os atores.

---

# 🧠 Psicólogo Clínico

O **Psicólogo Clínico** representa o profissional responsável pelo acompanhamento clínico do estudante quando existir vínculo correspondente no sistema.

## Principais interações

O psicólogo clínico pode:

- realizar login;
- consultar estudantes acompanhados;
- consultar histórico;
- consultar registros disponibilizados;
- consultar ficha de acompanhamento;
- receber alertas;
- consultar avisos;
- acessar informações necessárias ao acompanhamento conforme suas permissões.

## Papel no sistema

O acesso do psicólogo clínico depende dos vínculos e permissões estabelecidos para o estudante.

O perfil profissional não concede acesso automático às informações de todos os estudantes cadastrados.

---

# ⚙️ Administrador

O **Administrador** é responsável pela manutenção das informações necessárias para o funcionamento da plataforma.

## Principais interações

O administrador pode:

- realizar login;
- gerenciar estudantes;
- gerenciar professores;
- gerenciar psicólogos escolares;
- gerenciar psicólogos clínicos;
- gerenciar fichas de acompanhamento;
- gerenciar vínculos;
- gerenciar conteúdos disponibilizados na plataforma.

## Papel no sistema

O administrador possui responsabilidades relacionadas à gestão da plataforma e não ao processo de autorregulação realizado pelo estudante.

---

# 👨‍👩‍👧 Responsável

O **Responsável** está relacionado ao estudante e pode participar de processos específicos previstos pelo MKpause.

Entretanto, sua existência no domínio do sistema não significa que ele necessariamente apareça como ator em todos os diagramas de casos de uso.

## Cadastro e vínculo

O responsável **não participa diretamente do cadastro inicial do estudante**.

O vínculo é estabelecido posteriormente por meio de convite, e-mail ou outro mecanismo definido pela plataforma.

Por esse motivo, o Responsável não deve ser conectado ao caso de uso de cadastro apenas para representar sua existência no banco de dados.

---

# Relações entre atores

## Professor e Psicólogo Escolar

Professor e Psicólogo Escolar possuem algumas funcionalidades semelhantes, como:

- consultar estudantes;
- receber alertas;
- registrar observações.

Isso não significa que uma ação dependa da presença dos dois profissionais.

Por exemplo:

```text
Professor ─────────────── Registrar observação

Psicólogo Escolar ─────── Registrar observação
```

Cada ator pode executar o caso de uso independentemente.

---

## Ausência de generalização

Apesar de Professor e Psicólogo Escolar compartilharem algumas funcionalidades, eles possuem responsabilidades e permissões próprias.

Por isso, no modelo atual do MKpause, não é utilizada uma generalização entre esses atores apenas para eliminar associações repetidas.

---

# Ator x Entidade

É importante diferenciar os conceitos utilizados nos diferentes modelos.

### Caso de Uso

Representa quem **interage com o sistema**.

Exemplo:

```text
Professor → Registrar observação
```

### Modelo de Dados

Representa quais informações o sistema **precisa armazenar**.

Exemplo:

```text
PROFESSOR
- id
- nome
- email
...
```

Uma entidade existente no banco de dados não precisa necessariamente aparecer como ator em determinado diagrama de casos de uso.

Da mesma forma, a presença de um ator indica interação com o sistema e não determina automaticamente como os dados serão estruturados no banco.

---

# Resumo dos atores

| Ator | Papel principal |
|---|---|
| Estudante | Realizar sessões e utilizar recursos de autorregulação |
| Professor | Acompanhar estudantes no contexto escolar |
| Psicólogo Escolar | Realizar acompanhamento no ambiente escolar |
| Psicólogo Clínico | Consultar informações necessárias ao acompanhamento clínico |
| Administrador | Gerenciar usuários, vínculos e recursos da plataforma |
| Responsável | Participar de processos específicos após estabelecimento do vínculo |

---

## Documentos relacionados

- [Casos de Uso](./casos-de-uso.md)
- [Requisitos Funcionais](../02-requisitos/requisitos-funcionais.md)
- [Regras de Negócio](../02-requisitos/regras-de-negocio.md)