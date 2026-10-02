# Regras de Negócio

As regras de negócio definem condições, restrições e comportamentos que devem ser respeitados pelo **MKpause**, independentemente da tecnologia utilizada em sua implementação.

Essas regras complementam os requisitos funcionais e devem ser consideradas durante a modelagem, implementação e validação do sistema.

---

# 🔐 Autenticação e Acesso

## RN01 — Autenticação obrigatória

O usuário deve estar autenticado para acessar funcionalidades restritas do MKpause.

---

## RN02 — Acesso conforme perfil

As funcionalidades disponibilizadas devem considerar o perfil do usuário autenticado.

Os principais perfis previstos são:

- Estudante;
- Professor;
- Psicólogo Escolar;
- Psicólogo Clínico;
- Administrador.

---

## RN03 — Acesso conforme vínculo

Profissionais não devem possuir acesso automático às informações de todos os estudantes cadastrados.

O acesso deve considerar os vínculos estabelecidos entre o profissional e o estudante, além das permissões definidas para cada perfil.

---

# 🎓 Estudante

## RN04 — Acesso às próprias informações

O estudante deve consultar apenas informações relacionadas à sua própria conta, sessões e histórico.

---

## RN05 — Sessão vinculada ao estudante

Toda sessão de autorregulação deve estar associada ao estudante que a realizou.

---

# 🧘 Sessão de Autorregulação

## RN06 — Registro de humor pré-sessão

O estudante deve registrar seu estado emocional antes da realização da atividade de autorregulação prevista na sessão.

---

## RN07 — Avaliação do estado registrado

O sistema deve avaliar o estado informado pelo estudante de acordo com os critérios definidos para o processo de autorregulação.

Essa avaliação poderá determinar comportamentos posteriores do sistema, incluindo a possibilidade de emissão de alertas.

---

## RN08 — Realização da atividade

Após o registro inicial, o estudante poderá acessar os recursos de autorregulação disponibilizados pelo sistema.

Esses recursos podem incluir jogos, vídeos, exercícios ou outras atividades previstas pela plataforma.

---

## RN09 — Registro de humor pós-sessão

Ao final da atividade, o estudante deve poder registrar novamente seu estado emocional.

O registro pós-sessão deve permanecer associado à mesma sessão do registro inicial.

---

## RN10 — Histórico da sessão

As informações registradas durante uma sessão concluída devem ser armazenadas para composição do histórico do estudante.

---

# 🚨 Alertas

## RN11 — Emissão de alerta

O estudante poderá emitir um alerta quando seu estado ou situação indicar necessidade de auxílio conforme as regras previstas pelo sistema.

---

## RN12 — Níveis de alerta

Os alertas devem possuir uma classificação que permita representar diferentes níveis de necessidade de acompanhamento.

No fluxo atualmente definido para o MKpause, situações classificadas nos **níveis 2 e 3** podem resultar na emissão de alerta.

---

## RN13 — Destinatários do alerta

Os alertas devem ser direcionados aos profissionais responsáveis pelo acompanhamento do estudante de acordo com os vínculos existentes e as permissões estabelecidas.

Entre os possíveis destinatários estão:

- Professor;
- Psicólogo Escolar;
- Psicólogo Clínico.

---

## RN14 — Registro do alerta

Todo alerta emitido deve ser registrado no sistema contendo as informações necessárias para sua identificação e acompanhamento.

---

## RN15 — Associação do alerta ao estudante

Todo alerta deve estar relacionado ao estudante que originou a situação.

Quando o alerta for gerado durante uma sessão, ele também poderá permanecer associado à sessão correspondente.

---

# 📝 Observações

## RN16 — Registro de observações por profissionais escolares

Professores e psicólogos escolares podem registrar observações relacionadas aos estudantes aos quais possuem acesso autorizado.

---

## RN17 — Autor da observação

Toda observação registrada deve possuir identificação de seu autor.

---

## RN18 — Associação da observação ao estudante

Toda observação deve estar associada ao estudante sobre o qual foi registrada.

---

## RN19 — Independência entre Professor e Psicólogo Escolar

Professor e Psicólogo Escolar podem utilizar individualmente as funcionalidades disponibilizadas a ambos.

A associação dos dois atores a uma mesma funcionalidade não significa que ambos precisam executar a ação simultaneamente.

Por exemplo, um professor pode registrar uma observação independentemente da participação de um psicólogo escolar e vice-versa.

---

# 🧠 Acompanhamento

## RN20 — Acompanhamento conforme autorização

Psicólogos e demais profissionais devem consultar somente informações disponibilizadas para seu perfil e para os estudantes aos quais possuem acesso autorizado.

---

## RN21 — Histórico do estudante

Os registros das sessões realizadas devem permanecer disponíveis para composição do histórico do estudante conforme as regras de acesso do sistema.

---

## RN22 — Ficha de acompanhamento

A ficha de acompanhamento deve estar associada ao estudante correspondente.

Seu acesso deve respeitar as permissões definidas para cada perfil profissional.

---

# 👨‍👩‍👧 Responsável

## RN23 — Vínculo posterior do responsável

O responsável não participa obrigatoriamente do processo de cadastro inicial do estudante.

Seu vínculo com o estudante deve ser estabelecido posteriormente por meio do mecanismo definido pela plataforma.

---

## RN24 — Convite ao responsável

Quando aplicável, o sistema deve permitir o envio de um convite ou mecanismo equivalente para que o vínculo entre responsável e estudante seja estabelecido.

---

## RN25 — Vínculo responsável-estudante

Um responsável somente deve ser associado ao estudante após a conclusão do processo previsto para estabelecimento do vínculo.

---

# 🔗 Vínculos

## RN26 — Vínculo entre estudante e profissional

O acesso de profissionais às informações de determinado estudante deve considerar os vínculos cadastrados no sistema.

---

## RN27 — Gerenciamento de vínculos

Os vínculos entre estudantes e profissionais devem ser gerenciados por usuários com permissão administrativa.

---

## RN28 — Múltiplos vínculos

O modelo deve permitir os vínculos necessários ao acompanhamento do estudante sem pressupor que diferentes profissionais precisem atuar simultaneamente.

---

# ⚙️ Administração

## RN29 — Gerenciamento administrativo

Operações administrativas de cadastro, atualização, remoção e gerenciamento de usuários devem ser realizadas apenas por usuários autorizados.

---

## RN30 — Integridade dos vínculos

A remoção ou alteração de usuários não deve gerar vínculos inválidos ou registros inconsistentes no sistema.

As regras de tratamento desses registros devem preservar a integridade das informações históricas relevantes.

---

# 🎮 Conteúdos de Autorregulação

## RN31 — Disponibilidade dos conteúdos

Somente conteúdos definidos como disponíveis devem ser apresentados aos estudantes durante as sessões de autorregulação.

---

## RN32 — Identificação do conteúdo utilizado

Quando uma atividade, jogo, vídeo ou outro recurso for utilizado durante uma sessão, o sistema deve permitir sua associação à sessão correspondente.

---

# 🔒 Privacidade e Dados

## RN33 — Restrição de acesso às informações

Informações relacionadas aos estudantes devem ser acessadas somente por usuários autorizados.

---

## RN34 — Separação entre perfis profissionais

Possuir acesso ao sistema como profissional não implica possuir acesso irrestrito a todos os dados do estudante.

As informações disponibilizadas devem considerar:

1. o perfil do usuário;
2. o vínculo com o estudante;
3. a finalidade da informação;
4. as permissões estabelecidas pelo sistema.

---

# 🩺 Limites da Plataforma

## RN35 — Apoio, não diagnóstico

As avaliações realizadas pelo sistema possuem finalidade de apoio ao fluxo de autorregulação e acompanhamento.

O MKpause não deve apresentar essas avaliações como diagnóstico psicológico ou psiquiátrico.

---

## RN36 — Não substituição do acompanhamento profissional

O sistema não substitui o acompanhamento realizado por profissionais qualificados.

---

## RN37 — Situações de emergência

O MKpause não deve ser apresentado como serviço de atendimento emergencial.

Os alertas da plataforma são mecanismos internos de comunicação e acompanhamento e não substituem serviços apropriados para situações de emergência.

---

# Resumo

| Categoria | Regras |
|---|---|
| Autenticação e acesso | RN01–RN03 |
| Estudante | RN04–RN05 |
| Sessão de autorregulação | RN06–RN10 |
| Alertas | RN11–RN15 |
| Observações | RN16–RN19 |
| Acompanhamento | RN20–RN22 |
| Responsável | RN23–RN25 |
| Vínculos | RN26–RN28 |
| Administração | RN29–RN30 |
| Conteúdos | RN31–RN32 |
| Privacidade e dados | RN33–RN34 |
| Limites da plataforma | RN35–RN37 |

---

## Relação com os demais documentos

As regras de negócio complementam:

- [Requisitos Funcionais](./requisitos-funcionais.md)
- [Requisitos de Dados](./requisitos-de-dados.md)
- [Casos de Uso](../03-casos-de-uso/casos-de-uso.md)
- [Modelo Conceitual](../04-modelagem-de-dados/modelo-conceitual.md)
- [Modelo Lógico](../04-modelagem-de-dados/modelo-logico.md)

Caso uma regra de negócio seja alterada, os artefatos relacionados devem ser revisados para garantir a consistência da documentação.