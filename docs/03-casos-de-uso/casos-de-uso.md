# Casos de Uso

Este documento descreve os principais casos de uso do **MKpause**, apresentando os atores envolvidos, objetivos, pré-condições, fluxos principais e relacionamentos entre funcionalidades.

Os casos de uso complementam o diagrama UML disponível na documentação do projeto.

---

# 🔐 UC01 — Realizar Login

**Atores:**  
Estudante, Professor, Psicólogo Escolar, Psicólogo Clínico e Administrador.

**Objetivo:**  
Permitir que um usuário cadastrado tenha acesso às funcionalidades correspondentes ao seu perfil.

**Pré-condição:**  
O usuário deve possuir cadastro ativo no sistema.

## Fluxo principal

1. O usuário acessa a página de login.
2. O usuário informa suas credenciais.
3. O sistema valida as informações fornecidas.
4. O sistema identifica o perfil do usuário.
5. O sistema inicia a sessão autenticada.
6. O usuário é direcionado para sua área correspondente.

## Fluxo alternativo

**Credenciais inválidas**

1. O sistema identifica que as credenciais não são válidas.
2. O acesso não é autorizado.
3. O sistema informa o problema ao usuário.
4. O usuário pode tentar novamente.

**Pós-condição:**  
O usuário permanece autenticado no sistema.

---

# 🧘 UC02 — Realizar Sessão de Autorregulação

**Ator principal:** Estudante

**Objetivo:**  
Permitir que o estudante realize uma sessão utilizando os recursos de autorregulação disponibilizados pelo MKpause.

**Pré-condições:**

- o estudante deve estar autenticado;
- o estudante deve possuir cadastro ativo.

## Fluxo principal

1. O estudante inicia uma sessão.
2. O sistema solicita o registro do humor inicial.
3. O estudante registra seu estado.
4. O sistema registra e avalia o estado informado.
5. O estudante acessa uma atividade de autorregulação.
6. O estudante realiza a atividade.
7. O sistema solicita o registro do humor final.
8. O estudante registra novamente seu estado.
9. O sistema registra as informações da sessão.
10. A sessão passa a compor o histórico do estudante.

**Pós-condição:**  
A sessão e seus respectivos registros permanecem armazenados no histórico do estudante.

## Relacionamentos

A realização da sessão envolve funcionalidades como:

- Registrar humor;
- Avaliar estado;
- acessar atividades de autorregulação;
- Registrar humor pós-sessão;
- registrar informações da sessão.

Dependendo do resultado da avaliação, também poderá ocorrer a emissão de um alerta.

---

# 🙂 UC03 — Registrar Humor

**Ator principal:** Estudante

**Objetivo:**  
Registrar o estado emocional informado pelo estudante durante uma sessão.

**Pré-condição:**  
O estudante deve estar realizando uma sessão de autorregulação.

## Fluxo principal

1. O sistema apresenta as opções disponíveis para registro do estado.
2. O estudante seleciona a opção correspondente.
3. O sistema registra o estado informado.
4. O registro é associado à sessão atual.
5. O sistema identifica se o registro corresponde ao momento pré ou pós-sessão.

**Pós-condição:**  
O registro de humor permanece associado à sessão.

---

# 🔎 UC04 — Avaliar Estado

**Ator relacionado:** Estudante

**Objetivo:**  
Avaliar o estado informado pelo estudante para determinar o comportamento adequado do sistema durante a sessão.

**Pré-condição:**  
Deve existir um registro de humor válido.

## Fluxo principal

1. O sistema recebe o estado registrado.
2. O sistema aplica os critérios definidos para avaliação.
3. O sistema determina a classificação correspondente.
4. O fluxo da sessão continua de acordo com o resultado.

## Fluxo alternativo

Caso a avaliação identifique uma situação prevista pelas regras de alerta, o fluxo de emissão de alerta poderá ser iniciado.

**Pós-condição:**  
O estado registrado possui uma avaliação correspondente utilizada pelo fluxo da sessão.

---

# 🚨 UC05 — Emitir Alerta

**Ator de origem:** Estudante

**Atores receptores:**  
Professor, Psicólogo Escolar e Psicólogo Clínico, conforme vínculos e permissões.

**Objetivo:**  
Registrar e comunicar uma situação que necessite atenção dos profissionais responsáveis pelo acompanhamento do estudante.

**Pré-condições:**

- o estudante deve estar identificado;
- devem existir informações suficientes para registrar o alerta.

## Fluxo principal

1. O estudante solicita auxílio ou ocorre uma condição prevista para emissão de alerta.
2. O sistema identifica a classificação da situação.
3. O sistema cria o alerta.
4. O alerta é associado ao estudante.
5. Quando aplicável, o alerta é associado à sessão.
6. O sistema identifica os profissionais destinatários de acordo com os vínculos.
7. O alerta é disponibilizado aos profissionais autorizados.

**Pós-condição:**  
O alerta permanece registrado no sistema.

## Regra relacionada

Situações classificadas nos níveis **2 e 3**, conforme as regras atuais do projeto, podem resultar na emissão de alerta.

---

# 📚 UC06 — Consultar Histórico

**Ator principal:** Estudante

**Objetivo:**  
Permitir que o estudante consulte informações sobre suas sessões anteriores.

**Pré-condição:**  
O estudante deve estar autenticado.

## Fluxo principal

1. O estudante acessa seu histórico.
2. O sistema identifica o estudante autenticado.
3. O sistema recupera os registros autorizados.
4. O sistema apresenta as sessões anteriores.
5. O estudante pode consultar as informações disponibilizadas sobre cada sessão.

**Pós-condição:**  
Nenhum dado é alterado.

---

# 👥 UC07 — Consultar Estudantes

**Atores:**  
Professor, Psicólogo Escolar e Psicólogo Clínico, conforme suas permissões.

**Objetivo:**  
Permitir que profissionais consultem estudantes vinculados ao seu acompanhamento.

**Pré-condições:**

- o profissional deve estar autenticado;
- deve existir vínculo ou autorização correspondente.

## Fluxo principal

1. O profissional acessa a área de estudantes.
2. O sistema identifica seu perfil.
3. O sistema verifica os vínculos existentes.
4. O sistema apresenta os estudantes aos quais o profissional possui acesso.
5. O profissional seleciona um estudante.
6. O sistema apresenta as informações permitidas para aquele perfil.

**Pós-condição:**  
Nenhum dado é alterado.

---

# 📝 UC08 — Registrar Observação

**Atores:**  
Professor e Psicólogo Escolar.

**Objetivo:**  
Permitir que profissionais escolares registrem observações relacionadas a um estudante.

**Pré-condições:**

- o profissional deve estar autenticado;
- deve possuir acesso autorizado ao estudante.

## Fluxo principal

1. O profissional acessa o estudante.
2. O profissional seleciona a opção de registrar observação.
3. O sistema apresenta o campo de registro.
4. O profissional informa a observação.
5. O sistema valida as informações.
6. O sistema registra a observação.
7. A observação é associada ao estudante e ao profissional responsável.

**Pós-condição:**  
A observação permanece registrada no sistema.

## Observação sobre os atores

Professor e Psicólogo Escolar podem executar este caso de uso **independentemente**.

A associação de ambos ao mesmo caso de uso não exige participação simultânea.

---

# 🚨 UC09 — Consultar Alertas

**Atores:**  
Professor, Psicólogo Escolar e Psicólogo Clínico, conforme permissões.

**Objetivo:**  
Permitir que profissionais autorizados consultem alertas relacionados aos estudantes acompanhados.

**Pré-condição:**  
O profissional deve estar autenticado e possuir acesso ao estudante relacionado ao alerta.

## Fluxo principal

1. O profissional acessa sua área de alertas.
2. O sistema identifica os alertas aos quais possui acesso.
3. O sistema apresenta os alertas disponíveis.
4. O profissional seleciona um alerta.
5. O sistema apresenta suas informações.

**Pós-condição:**  
Nenhum dado principal é alterado pela simples consulta.

---

# 📋 UC10 — Consultar Ficha de Acompanhamento

**Ator principal:** Psicólogo Clínico

**Objetivo:**  
Permitir a consulta das informações da ficha de acompanhamento de um estudante autorizado.

**Pré-condições:**

- o psicólogo deve estar autenticado;
- deve possuir acesso autorizado ao estudante.

## Fluxo principal

1. O psicólogo seleciona um estudante acompanhado.
2. O sistema verifica o vínculo e as permissões.
3. O sistema recupera a ficha correspondente.
4. O sistema apresenta as informações autorizadas.

**Pós-condição:**  
Nenhum dado é alterado.

---

# ⚙️ UC11 — Gerenciar Estudantes

**Ator principal:** Administrador

**Objetivo:**  
Permitir a administração dos cadastros de estudantes.

## Operações

O administrador pode:

- cadastrar;
- consultar;
- atualizar;
- remover, quando permitido pelas regras de integridade.

**Pré-condição:**  
O administrador deve estar autenticado.

**Pós-condição:**  
Os dados do estudante são atualizados de acordo com a operação realizada.

---

# 👨‍🏫 UC12 — Gerenciar Professores

**Ator principal:** Administrador

**Objetivo:**  
Permitir o gerenciamento dos professores cadastrados no MKpause.

## Operações

- cadastrar;
- consultar;
- atualizar;
- remover.

---

# 🧠 UC13 — Gerenciar Psicólogos

**Ator principal:** Administrador

**Objetivo:**  
Permitir o gerenciamento dos psicólogos cadastrados na plataforma.

A funcionalidade deve considerar os diferentes perfis profissionais existentes no sistema.

## Operações

- cadastrar;
- consultar;
- atualizar;
- remover.

---

# 🔗 UC14 — Gerenciar Vínculos

**Ator principal:** Administrador

**Objetivo:**  
Permitir o gerenciamento das relações necessárias entre estudantes e profissionais ou responsáveis.

## Vínculos previstos

- estudante ↔ professor;
- estudante ↔ psicólogo escolar;
- estudante ↔ psicólogo clínico;
- estudante ↔ responsável.

## Fluxo principal

1. O administrador acessa o gerenciamento de vínculos.
2. Seleciona o estudante.
3. Seleciona o usuário que deverá ser relacionado.
4. O sistema valida a possibilidade do vínculo.
5. O sistema registra a relação.

**Pós-condição:**  
O vínculo passa a ser considerado nas regras de acesso correspondentes.

---

# 📋 UC15 — Gerenciar Ficha de Acompanhamento

**Ator principal:** Administrador

**Objetivo:**  
Permitir o gerenciamento das fichas de acompanhamento relacionadas aos estudantes.

**Pré-condição:**  
O administrador deve estar autenticado.

**Pós-condição:**  
As informações da ficha permanecem associadas ao estudante correspondente.

---

# 🎮 UC16 — Gerenciar Conteúdos

**Ator principal:** Administrador

**Objetivo:**  
Permitir o gerenciamento dos recursos de autorregulação disponibilizados aos estudantes.

## Conteúdos

Podem ser gerenciados recursos como:

- jogos;
- vídeos;
- exercícios;
- atividades de autorregulação.

## Operações

- cadastrar;
- consultar;
- atualizar;
- alterar disponibilidade;
- remover quando permitido.

---

# Relações entre Casos de Uso

## `<<include>>`

Uma relação `<<include>>` indica que um comportamento é incorporado obrigatoriamente ao fluxo do caso de uso principal quando aquela relação se aplica ao modelo definido.

No fluxo de autorregulação, funcionalidades essenciais da sessão podem ser representadas como casos incluídos quando sua execução fizer parte obrigatória da realização da sessão.

Exemplo conceitual:

```text id="g6njpi"
Realizar sessão de autorregulação
            |
            | <<include>>
            ↓
      Registrar humor
```

---

## `<<extend>>`

Uma relação `<<extend>>` representa um comportamento adicional que ocorre somente sob determinadas condições.

A emissão de alerta pode ser representada dessa forma quando ocorre apenas diante das condições previstas pelas regras do sistema.

Exemplo conceitual:

```text id="7u80wm"
        Emitir alerta
              |
              | <<extend>>
              ↓
Avaliar estado / fluxo da sessão
```

A direção exata das relações deve permanecer consistente com a versão final do diagrama UML adotado pelo projeto.

---

# Resumo

| ID | Caso de Uso | Ator principal |
|---|---|---|
| UC01 | Realizar Login | Usuários do sistema |
| UC02 | Realizar Sessão de Autorregulação | Estudante |
| UC03 | Registrar Humor | Estudante |
| UC04 | Avaliar Estado | Sistema / fluxo da sessão |
| UC05 | Emitir Alerta | Estudante |
| UC06 | Consultar Histórico | Estudante |
| UC07 | Consultar Estudantes | Profissionais |
| UC08 | Registrar Observação | Professor / Psicólogo Escolar |
| UC09 | Consultar Alertas | Profissionais autorizados |
| UC10 | Consultar Ficha de Acompanhamento | Psicólogo Clínico |
| UC11 | Gerenciar Estudantes | Administrador |
| UC12 | Gerenciar Professores | Administrador |
| UC13 | Gerenciar Psicólogos | Administrador |
| UC14 | Gerenciar Vínculos | Administrador |
| UC15 | Gerenciar Ficha de Acompanhamento | Administrador |
| UC16 | Gerenciar Conteúdos | Administrador |

---

## Documentos relacionados

- [Atores](./atores.md)
- [Requisitos Funcionais](../02-requisitos/requisitos-funcionais.md)
- [Regras de Negócio](../02-requisitos/regras-de-negocio.md)
- [Modelo Conceitual](../04-modelagem-de-dados/modelo-conceitual.md)
- [Modelo Lógico](../04-modelagem-de-dados/modelo-logico.md)