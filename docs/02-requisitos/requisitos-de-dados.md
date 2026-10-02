# Requisitos de Dados

Os requisitos de dados definem as informações que o **MKpause** precisa armazenar, consultar e relacionar para permitir o funcionamento das funcionalidades previstas.

Este documento descreve os dados em nível de negócio. A definição de chaves primárias, chaves estrangeiras, tipos de dados e demais detalhes técnicos é apresentada na documentação de modelagem do banco de dados.

---

# 🎓 Estudante

O sistema deve manter as informações necessárias para identificar o estudante, permitir seu acesso à plataforma e realizar seu acompanhamento.

## Dados necessários

- identificador do estudante;
- nome;
- data de nascimento;
- informações de contato;
- informações necessárias para autenticação;
- informações relacionadas à instituição de ensino;
- turma;
- informações necessárias ao acompanhamento do estudante;
- situação do cadastro.

## Relacionamentos

O estudante poderá estar relacionado a:

- sessões de autorregulação;
- registros de humor;
- alertas;
- observações;
- ficha de acompanhamento;
- professores;
- psicólogo escolar;
- psicólogo clínico;
- responsáveis.

---

# 👨‍🏫 Professor

O sistema deve armazenar informações dos professores responsáveis pelo acompanhamento de estudantes no ambiente escolar.

## Dados necessários

- identificador do professor;
- nome;
- informações de contato;
- informações necessárias para autenticação;
- informações relacionadas à instituição;
- situação do cadastro.

## Relacionamentos

O professor poderá estar relacionado a:

- estudantes vinculados;
- alertas;
- observações registradas.

---

# 🏫 Psicólogo Escolar

O sistema deve armazenar informações dos psicólogos que realizam o acompanhamento dos estudantes dentro do ambiente escolar.

## Dados necessários

- identificador do psicólogo escolar;
- nome;
- informações de contato;
- informações necessárias para autenticação;
- número de registro profissional;
- estado do registro profissional;
- informações relacionadas à instituição;
- situação do cadastro.

## Relacionamentos

O psicólogo escolar poderá estar relacionado a:

- estudantes vinculados;
- alertas;
- observações registradas.

---

# 🧠 Psicólogo Clínico

O sistema deve armazenar informações dos psicólogos clínicos vinculados ao acompanhamento dos estudantes.

## Dados necessários

- identificador do psicólogo clínico;
- nome;
- informações de contato;
- informações necessárias para autenticação;
- número de registro profissional;
- estado do registro profissional;
- situação do cadastro.

## Relacionamentos

O psicólogo clínico poderá estar relacionado a:

- estudantes acompanhados;
- fichas de acompanhamento;
- histórico dos estudantes;
- alertas;
- registros disponibilizados para acompanhamento.

---

# 👨‍👩‍👧 Responsável

O sistema deve manter os dados necessários para identificar e estabelecer o vínculo entre um responsável e um estudante.

## Dados necessários

- identificador do responsável;
- nome;
- informações de contato;
- relação com o estudante;
- informações necessárias para estabelecimento do vínculo;
- situação do vínculo ou cadastro.

## Relacionamentos

O responsável poderá estar relacionado a um ou mais estudantes conforme as regras definidas pelo sistema.

O vínculo do responsável não é criado obrigatoriamente durante o cadastro inicial do estudante. O processo poderá ocorrer posteriormente por meio de convite ou mecanismo equivalente.

---

# ⚙️ Administrador

O sistema deve manter informações necessárias para identificar e autenticar os usuários responsáveis pela administração da plataforma.

## Dados necessários

- identificador do administrador;
- nome;
- informações necessárias para autenticação;
- informações de contato;
- situação do cadastro.

O administrador possui funções relacionadas ao gerenciamento dos usuários, fichas, conteúdos e vínculos existentes no sistema.

---

# 🧘 Sessão de Autorregulação

Cada utilização dos recursos de autorregulação pelo estudante deve gerar um registro de sessão.

## Dados necessários

- identificador da sessão;
- estudante responsável pela sessão;
- data da sessão;
- horário de início;
- horário de término;
- estado emocional registrado antes da atividade;
- estado emocional registrado após a atividade;
- recursos ou atividades utilizados;
- informações ou observações relacionadas à sessão.

## Relacionamentos

Uma sessão está relacionada a:

- um estudante;
- registros de humor;
- uma ou mais atividades ou conteúdos;
- possíveis alertas gerados durante o processo.

---

# 🙂 Registro de Humor

O sistema deve registrar o estado emocional informado pelo estudante durante uma sessão.

## Dados necessários

- identificador do registro;
- estudante;
- sessão relacionada;
- estado emocional informado;
- momento do registro;
- data e horário do registro.

O momento do registro deve permitir diferenciar, no mínimo:

- humor pré-sessão;
- humor pós-sessão.

Esses registros permitem comparar o estado informado pelo estudante antes e depois da realização da atividade de autorregulação.

---

# 🎮 Atividade de Autorregulação

O sistema deve armazenar os recursos disponibilizados aos estudantes durante as sessões.

## Dados necessários

- identificador da atividade;
- nome;
- descrição;
- tipo;
- conteúdo ou recurso associado;
- situação de disponibilidade.

## Tipos de conteúdo

As atividades poderão incluir:

- jogos;
- vídeos;
- exercícios;
- técnicas de respiração;
- outros recursos de autorregulação previstos pela plataforma.

---

# 🚨 Alerta

O sistema deve armazenar os alertas emitidos durante a utilização da plataforma.

## Dados necessários

- identificador do alerta;
- estudante relacionado;
- sessão relacionada, quando aplicável;
- nível ou classificação do alerta;
- data;
- horário;
- situação do alerta;
- profissionais destinatários;
- informações necessárias para contextualização do alerta.

## Relacionamentos

Um alerta poderá estar relacionado a:

- estudante;
- sessão;
- professor;
- psicólogo escolar;
- psicólogo clínico.

Os destinatários dependem dos vínculos existentes e das regras de negócio definidas para cada tipo de alerta.

---

# 📝 Observação

O sistema deve permitir o armazenamento de observações relacionadas ao acompanhamento do estudante.

## Dados necessários

- identificador da observação;
- estudante relacionado;
- autor da observação;
- conteúdo da observação;
- data;
- horário;
- tipo ou origem da observação, quando necessário.

## Autores

De acordo com as permissões atualmente previstas, observações de acompanhamento poderão ser registradas por:

- professor;
- psicólogo escolar.

Outros registros relacionados à sessão ou ao acompanhamento clínico devem ser tratados de acordo com suas respectivas funcionalidades e permissões.

---

# 📋 Ficha de Acompanhamento

O sistema deve manter uma ficha contendo informações utilizadas no acompanhamento do estudante.

## Dados necessários

- identificador da ficha;
- estudante relacionado;
- informações de acompanhamento;
- data de criação;
- data da última atualização;
- situação da ficha.

A ficha deve estar associada ao estudante e possuir acesso controlado conforme o perfil do usuário.

---

# 📢 Aviso

O sistema deve armazenar avisos disponibilizados aos usuários da plataforma.

## Dados necessários

- identificador do aviso;
- título;
- conteúdo;
- data de publicação;
- autor ou responsável pela publicação;
- público destinatário;
- situação do aviso.

---

# 🔗 Vínculos

O MKpause deve armazenar os relacionamentos necessários entre estudantes e as pessoas responsáveis por seu acompanhamento.

Entre os vínculos previstos estão:

- estudante ↔ professor;
- estudante ↔ psicólogo escolar;
- estudante ↔ psicólogo clínico;
- estudante ↔ responsável.

Esses vínculos são utilizados para determinar quais profissionais podem consultar informações ou receber alertas relacionados a determinado estudante.

---

# 🔐 Controle de Acesso aos Dados

O acesso às informações armazenadas deve considerar o perfil do usuário autenticado e seus vínculos.

Um usuário não deve obter acesso automaticamente a todos os registros existentes no sistema apenas por possuir determinado tipo de perfil.

Por exemplo, profissionais que acompanham estudantes devem visualizar apenas as informações disponibilizadas pelo sistema e relacionadas aos estudantes aos quais possuem acesso autorizado.

---

# Resumo das principais entidades de dados

| Entidade | Finalidade |
|---|---|
| Estudante | Identificar e manter informações do estudante |
| Professor | Representar professores vinculados aos estudantes |
| Psicólogo Escolar | Representar o acompanhamento psicológico escolar |
| Psicólogo Clínico | Representar profissionais de acompanhamento clínico |
| Responsável | Representar responsáveis vinculados ao estudante |
| Administrador | Representar usuários administrativos |
| Sessão | Registrar sessões de autorregulação |
| Registro de Humor | Armazenar estados emocionais registrados |
| Atividade | Representar recursos de autorregulação |
| Alerta | Registrar situações que demandam atenção |
| Observação | Armazenar observações de acompanhamento |
| Ficha de Acompanhamento | Centralizar informações de acompanhamento |
| Aviso | Armazenar comunicados disponibilizados na plataforma |
| Vínculo | Representar relações entre estudantes e seus responsáveis/profissionais |

---

## Relação com a Modelagem

Estes requisitos servem como base para:

- [Modelo Conceitual](../04-modelagem-de-dados/modelo-conceitual.md)
- [Modelo Lógico](../04-modelagem-de-dados/modelo-logico.md)

Os requisitos de dados descrevem **quais informações são necessárias**, enquanto os modelos de dados definem **como essas informações serão estruturadas e relacionadas no banco de dados**.