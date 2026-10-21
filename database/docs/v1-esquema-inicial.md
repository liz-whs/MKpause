# V1 — Esquema inicial do banco de dados

- **Projeto:** MKpause
- **Versão:** V1
- **Arquivo de migração:** `database/migrations/V1__criacao_do_esquema_inicial.sql`
- **SGBD:** PostgreSQL
- **Gerenciador de migrações:** Flyway
- **Status:** aplicada localmente; alterações futuras devem ser feitas em novas migrações.

## 1. Objetivo

A V1 cria a estrutura relacional inicial do MKpause para dar suporte aos usuários e perfis, atividades, sessões de autorregulação emocional, registros de humor, alertas, destinatários, observações, acompanhamento e relacionamentos entre estudantes e profissionais.

Esta documentação descreve o SQL da V1. Ela não significa que todas as funcionalidades da aplicação ou do backend já estejam implementadas.

## 2. Convenções e decisões técnicas

- Os identificadores são, em geral, `BIGINT GENERATED ALWAYS AS IDENTITY`.
- Os nomes físicos usam `snake_case`, em minúsculas.
- Datas e horários de eventos usam `TIMESTAMPTZ`; datas de nascimento usam `DATE`.
- Muitos registros possuem `ativo` ou `disponivel` para permitir desativação lógica.
- As chaves estrangeiras usam `ON DELETE RESTRICT`, impedindo exclusões que deixariam referências inválidas.
- A tabela `usuario` centraliza nome, e-mail, hash de senha e estado da conta.
- A estratégia de integração entre `usuario` e a autenticação do Django ainda precisa ser definida no backend.
- A V1 foi aplicada pelo Flyway. **Não editar esta migração depois de aplicada**; mudanças devem ser representadas por novas migrações versionadas.

## 3. Tabelas criadas

A V1 cria 19 tabelas de domínio. O Flyway também mantém sua tabela técnica `flyway_schema_history`.

| Tabela | Finalidade |
|---|---|
| `usuario` | Identidade central, e-mail, hash de senha e estado da conta. |
| `estudante` | Perfil do estudante e dados escolares básicos. |
| `professor` | Perfil do professor. |
| `psicologo_escolar` | Perfil do psicólogo escolar e registro profissional. |
| `psicologo_clinico` | Perfil do psicólogo clínico e registro profissional. |
| `responsavel` | Na V1, está modelado como perfil ligado a `usuario`. **Isso diverge da decisão posterior de que responsável será somente um contato, sem login; requer migração futura.** |
| `administrador` | Perfil administrativo ligado a `usuario`. |
| `atividade` | Catálogo de jogos, vídeos, exercícios e atividades de respiração. |
| `sessao` | Execução de uma atividade por um estudante, com nível, horários, duração e status. |
| `registro_humor` | Registro de humor antes ou depois de uma sessão. |
| `alerta` | Alerta associado a um estudante e, opcionalmente, a uma sessão. |
| `destinatario_alerta` | Destinatários individuais de um alerta e o estado da notificação para cada destinatário. |
| `observacao` | Observações associadas a um alerta e atribuídas a um autor. |
| `ficha_acompanhamento` | Informações de acompanhamento associadas a um estudante. |
| `aviso` | Comunicados publicados por um usuário para um público definido. |
| `professor_estudante` | Vínculo entre professores e estudantes. |
| `psicologo_escolar_estudante` | Vínculo entre psicólogos escolares e estudantes. |
| `psicologo_clinico_estudante` | Vínculo entre psicólogos clínicos e estudantes acompanhados. |
| `estudante_responsavel` | Vínculo entre estudante e responsável, incluindo grau de parentesco. Na V1, aponta para a tabela `responsavel`. |

## 4. Estrutura e campos relevantes

A relação abaixo resume os campos principais. Para tipos, valores padrão, restrições e definições exatas, a fonte de verdade é o arquivo SQL da migração.

### 4.1 Usuários e perfis

- **`usuario`**: `id_usuario`, `nome_completo`, `email`, `senha_hash`, `ativo`, `criado_em`, `atualizado_em`.
- **`estudante`**: `id_estudante`, `id_usuario`, `data_nascimento`, `telefone`, `instituicao_ensino`, `turma`, `ativo` e timestamps.
- **`professor`**: `id_professor`, `id_usuario`, `telefone`, `instituicao_ensino`, `cargo`, `ativo` e timestamps.
- **`psicologo_escolar`**: `id_psicologo_escolar`, `id_usuario`, `telefone`, `registro_profissional`, `estado_registro`, `instituicao_ensino`, `ativo` e timestamps.
- **`psicologo_clinico`**: `id_psicologo_clinico`, `id_usuario`, `telefone`, `registro_profissional`, `estado_registro`, `ativo` e timestamps.
- **`administrador`**: `id_administrador`, `id_usuario`, `ativo` e timestamps.
- **`responsavel`**: na V1, `id_responsavel`, `id_usuario`, `telefone`, `ativo` e timestamps. A forma definitiva deve ser corrigida em migração posterior para corresponder à decisão de contato sem login.

Cada tabela de perfil possui sua própria chave primária e uma coluna `id_usuario` única com chave estrangeira para `usuario`. Essa unicidade é individual por tabela: a V1 **não** garante, por si só, que um mesmo usuário não apareça em mais de uma tabela de perfil.

### 4.2 Atividades e sessões

- **`atividade`**: nome, descrição, tipo, referência/conteúdo, disponibilidade e timestamps. O tipo deve ser um de `JOGO`, `VIDEO`, `EXERCICIO`, `RESPIRACAO` ou `OUTRO`.
- **`sessao`**: estudante, atividade, início, término, nível avaliado, duração, observações e status. O status pode ser `EM_ANDAMENTO`, `CONCLUIDA` ou `CANCELADA`.

Cada sessão aponta para um estudante e uma atividade. A estrutura da V1 permite associar **uma atividade por sessão**, pois `sessao` contém uma única FK `id_atividade`; não existe tabela associativa `sessao_atividade`.

Restrições de sessão:
- O nível é nulo ou está entre 1 e 3.
- A duração é nula ou não negativa.
- O término, quando informado, não pode ser anterior ao início.
- O status deve pertencer aos valores permitidos.
- Existe uma restrição única composta em `(id_sessao, id_estudante)`, usada pela chave estrangeira composta de `alerta`.

### 4.3 Registros de humor

`registro_humor` armazena sessão, estado, momento e instante do registro.

- `estado` deve estar entre 1 e 5.
- `momento` deve ser `PRE` ou `POS`.
- Existe unicidade em `(id_sessao, momento)`: a V1 permite no máximo um registro PRE e um POS por sessão.

A V1 não exige por uma restrição declarativa que toda sessão tenha os dois registros. A obrigatoriedade do humor PRE antes do início e as regras de conclusão com humor POS precisam ser garantidas pelo backend ou por uma migração futura, após definição do fluxo transacional.

### 4.4 Alertas e destinatários

- **`alerta`**: estudante, sessão opcional, nível, data de criação, status e descrição.
- **`destinatario_alerta`**: alerta, usuário destinatário, tipo de destinatário, estado da notificação e timestamps de envio/leitura.

O nível do alerta deve ser 2 ou 3. Os estados permitidos são `ABERTO`, `EM_ACOMPANHAMENTO`, `RESOLVIDO` e `CANCELADO`.

O tipo de destinatário deve ser `PROFESSOR` ou `PSICOLOGO_ESCOLAR`; o status de notificação deve ser `PENDENTE`, `ENVIADA`, `LIDA` ou `FALHA`. A combinação `(id_alerta, id_usuario)` é única, evitando cadastrar o mesmo usuário duas vezes como destinatário do mesmo alerta.

A chave estrangeira composta `(id_sessao, id_estudante)` garante que, quando o alerta estiver associado a uma sessão, essa sessão pertença ao estudante informado. Como `id_sessao` é opcional, a V1 também permite alerta sem sessão associada.

A tabela de destinatários registra o status individual de cada notificação; o status geral do alerta é independente do status da notificação.

### 4.5 Observações e acompanhamento

- **`observacao`**: alerta, autor, conteúdo e timestamps. O conteúdo não pode ser vazio ou conter somente espaços.
- **`ficha_acompanhamento`**: associação única com estudante, informações de acompanhamento, timestamps e estado ativo.
- **`aviso`**: título, conteúdo, data de publicação, autor, público destinatário e estado ativo.

Os públicos permitidos em `aviso` na V1 são `TODOS`, `ESTUDANTES`, `PROFESSORES`, `PSICOLOGOS_ESCOLARES`, `PSICOLOGOS_CLINICOS` e `RESPONSAVEIS`. A opção `RESPONSAVEIS` deve ser revista após a decisão de que responsáveis não terão login; sua presença no CHECK não implementa, por si só, envio de mensagens externas.

### 4.6 Relacionamentos entre pessoas

As tabelas associativas são:
- `professor_estudante`;
- `psicologo_escolar_estudante`;
- `psicologo_clinico_estudante`;
- `estudante_responsavel`.

As três primeiras associam o perfil profissional ao estudante. `estudante_responsavel` contém também `grau_parentesco`. Todas usam chave primária composta pelo par de identificadores, `ativo` e `criado_em`.

A decisão atual do projeto é que o responsável seja apenas um contato, sem conta de usuário. Por isso, o relacionamento e os campos de contato devem ser ajustados em uma migração posterior, sem alterar a V1 já aplicada.

## 5. Restrições, índices e integridade

### 5.1 Restrições relevantes

A V1 define:
- chaves primárias para as tabelas;
- chaves estrangeiras para preservar a integridade referencial;
- unicidade de e-mail em `usuario`;
- unicidade de `id_usuario` em cada perfil;
- verificações de tipos, estados, níveis, duração, UF do registro profissional e conteúdo de observações;
- unicidade de humor por sessão e momento;
- unicidade de destinatário por alerta e usuário;
- chaves primárias compostas nas tabelas de associação.

As FKs com `ON DELETE RESTRICT` impedem exclusões físicas quando existem registros relacionados. O uso de desativação lógica é coerente com a preservação do histórico.

### 5.2 Índices criados explicitamente

- `idx_sessao_estudante_iniciada`: sessões por estudante e início decrescente.
- `idx_registro_humor_sessao`: registros de humor por sessão.
- `idx_alerta_estudante_criado`: alertas por estudante e criação decrescente.
- `idx_alerta_sessao`: alertas por sessão.
- `idx_destinatario_alerta_usuario_status`: destinatários por usuário e status da notificação.
- `idx_observacao_alerta_criado`: observações por alerta e criação decrescente.
- `idx_professor_estudante_estudante`: busca de professores por estudante.
- `idx_psicologo_escolar_estudante_estudante`: busca de psicólogos escolares por estudante.
- `idx_psicologo_clinico_estudante_estudante`: busca de psicólogos clínicos por estudante.
- `idx_estudante_responsavel_responsavel`: busca de vínculos pelo responsável.

O PostgreSQL também cria índices para chaves primárias e restrições únicas. Não confundir índice com regra de autorização.

## 6. Funções e gatilhos

### `fn_validar_destinatario_alerta` / `trg_validar_destinatario_alerta`

Antes de inserir ou alterar `id_usuario`/`tipo_destinatario` em `destinatario_alerta`, a função verifica que:
1. o usuário existe e está ativo;
2. se o tipo é `PROFESSOR`, existe perfil ativo de professor para esse usuário;
3. se o tipo é `PSICOLOGO_ESCOLAR`, existe perfil ativo de psicólogo escolar.

A função rejeita a operação com exceção caso as condições não sejam atendidas.

**Limite:** o gatilho é executado em inserção ou alteração das colunas indicadas. Ele não substitui a autorização do backend nem verifica todas as regras de atribuição de estudantes a profissionais.

### `fn_validar_autor_observacao` / `trg_validar_autor_observacao`

Antes de inserir ou alterar `id_autor` em `observacao`, a função verifica que:
1. o usuário existe e está ativo;
2. o usuário possui perfil ativo de estudante, professor ou psicólogo escolar.

O psicólogo clínico não é aceito como autor por essa regra da V1. Se essa decisão mudar, será necessária alteração explícita e testada em nova migração.

**Limite:** a função valida o perfil do autor, mas não decide se ele tem permissão para acessar aquele alerta específico. Essa autorização precisa ser verificada no backend.

## 7. O que o backend deve implementar

A existência de uma tabela, FK ou gatilho não significa que uma API já exista. O backend Django/DRF deve, no mínimo:

1. **Autenticação:** definir como a autenticação do Django será integrada à tabela `usuario`. A V1 contém `senha_hash`, mas a estratégia de armazenamento/verificação de senha e o relacionamento com `django.contrib.auth` ainda precisam ser definidos. Não armazenar senhas em texto puro.
2. **Autorização:** validar, em cada endpoint, se o usuário autenticado pode consultar ou modificar o estudante, a sessão, o alerta, a observação ou a ficha solicitados.
3. **Privacidade:** limitar dados emocionais e pessoais ao escopo autorizado e evitar exposição em respostas, logs e mensagens de erro.
4. **Fluxo de sessão:** validar o humor PRE, iniciar a atividade, registrar o humor POS ao fim e calcular/registrar duração e status de forma consistente com as regras aprovadas.
5. **Alertas:** aplicar a regra de negócio acordada — nível 1 sem alerta; nível 2 para professor; nível 3 para professor e psicólogo escolar — e criar destinatários individuais sem duplicação.
6. **Notificações:** atualizar `status_notificacao`, `enviado_em` e `lido_em` de acordo com eventos reais; não marcar uma notificação como enviada ou lida apenas porque uma tentativa foi iniciada.
7. **Transações:** agrupar operações relacionadas, como conclusão de sessão, humor POS e geração de alertas, em transações para evitar estados parciais.
8. **Validação e erros:** validar entradas na API e tratar violações de restrições de forma segura e compreensível, sem expor detalhes internos do banco.
9. **Histórico:** preferir desativação a exclusão física e preservar os registros históricos.
10. **Responsáveis:** após a migração corretiva, tratá-los como contatos vinculados a estudantes, sem autenticação, senha ou perfil de login.

A V1 **não** implementa sozinha as regras de autorização por relacionamento, a lógica de envio de notificações, a criação automática de alertas conforme nível, nem o fluxo completo de sessão.

## 8. Decisões e pontos para migrações futuras

| Tema | Situação após a V1 |
|---|---|
| Responsável sem login | Decisão aprovada; V1 ainda contém `responsavel.id_usuario`. Corrigir em nova migração. |
| Público `RESPONSAVEIS` em `aviso` | Revisar após decidir se contatos receberão comunicados por algum canal externo. |
| Autenticação Django e `usuario` | Definir integração sem criar duas fontes inconsistentes de identidade. |
| Exclusividade de perfil | O projeto prevê perfil exclusivo, mas a V1 não impede o mesmo `id_usuario` em tabelas de perfil diferentes. |
| Humores PRE/POS obrigatórios | A V1 garante no máximo um de cada por sessão, não a obrigatoriedade de ambos. |
| Regras de acesso | Implementar e testar no backend; as FKs não garantem autorização. |
| Regras de instituição e vínculos | Revisar conforme os requisitos e decisões de modelagem do projeto. |

Cada mudança aprovada deve ser implementada numa nova migração versionada, por exemplo `V2__ajusta_responsavel_como_contato.sql`. O nome é uma proposta; usar o nome definitivo ao criar o arquivo.

## 9. Como validar a estrutura

Na raiz do repositório, com a configuração local do Flyway disponível:

```powershell
& "C:\Users\lizze\Downloads\flyway-commandline-13.11.0-windows-x64\flyway-13.11.0\flyway.cmd" info
& "C:\Users\lizze\Downloads\flyway-commandline-13.11.0-windows-x64\flyway-13.11.0\flyway.cmd" validate
```

Depois de criar uma migração nova, revisar o SQL, executar `info`, aplicar `migrate` no banco de desenvolvimento e executar `validate` novamente. Não executar migrações destrutivas em banco com dados importantes sem backup e plano de reversão.

## 10. Fonte de verdade

- Migração executável: [`../migrations/V1__criacao_do_esquema_inicial.sql`](../migrations/V1__criacao_do_esquema_inicial.sql)
- Esta documentação descreve a intenção e o comportamento observado no SQL da V1. Em caso de divergência, verificar o SQL e registrar a correção em documentação e/ou nova migração.
