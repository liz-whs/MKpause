# V3 — Códigos de cadastro e de vínculo

- **Projeto:** MKpause
- **Migração:** [`V3__codigos_de_cadastro_e_vinculo.sql`](../migrations/V3__codigos_de_cadastro_e_vinculo.sql)
- **Banco:** PostgreSQL · **Gerenciamento:** Flyway
- **Status:** proposta para revisão; a execução em PostgreSQL não foi confirmada.

## 1. Objetivo

Preparar o banco para dois processos previstos na especificação do backend:

1. **Cadastro por convite:** o administrador cria um código para um perfil (`ESTUDANTE`, `PROFESSOR`, `PSICOLOGO_ESCOLAR` ou `PSICOLOGO_CLINICO`); a pessoa só consegue se cadastrar com um código válido. O convite pode permitir de 1 a 200 usos.
2. **Vínculo mediante aceite:** o estudante gera um código temporário, o professor ou psicólogo escolar solicita o acompanhamento, e o estudante aceita ou recusa antes de existir vínculo efetivo.

O administrador permanece autorizado a cadastrar usuários e administrar vínculos diretamente. O vínculo do psicólogo clínico continua pelo fluxo administrativo e pelo consentimento do responsável previsto na RN24; ele não usa código de vínculo.

## 2. Alterações no esquema

A V3 cria **três tabelas e dois índices**, sem alterar as tabelas existentes. Ela depende das tabelas criadas pela V1, mas **não depende da V2**.

### `codigo_cadastro`

| Campo | Finalidade |
|---|---|
| `id_codigo_cadastro` | Chave primária identity. |
| `codigo_hash` | HMAC-SHA256 hexadecimal, `CHAR(64)`, único; não se armazena o texto do código. |
| `sufixo` | Últimos três caracteres para identificação administrativa. |
| `perfil` | Tipo de conta autorizado, limitado aos quatro perfis citados. |
| `id_administrador` | FK para o administrador emissor. |
| `turma`, `instituicao_ensino` | Pré-preenchimento opcional destinado a estudantes. |
| `usos_maximos`, `usos` | Limite de consumo e total já utilizado. |
| `expira_em`, `revogado_em`, `criado_em` | Controle da validade e emissão. |

As constraints restringem o perfil, exigem `usos_maximos` entre 1 e 200, `usos` entre zero e o limite e `expira_em > criado_em`. O backend deve verificar se o convite já expirou, foi revogado ou está esgotado e impedir turma/escola para perfis não estudantes.

### `uso_codigo_cadastro`

Tabela de auditoria de utilização de convites:

- `id_codigo_cadastro`: FK para o convite, parte da chave primária composta.
- `id_usuario`: FK para a conta, parte da chave primária composta e com `UNIQUE`; cada conta registra no máximo um código usado.
- `usado_em`: instante do consumo.

Um convite pode ter vários usos. Criar `usuario` e perfil, incrementar `usos` e registrar `uso_codigo_cadastro` deve ocorrer na mesma transação no Django.

### `codigo_vinculo`

A mesma tabela representa o código e a solicitação posterior; **não se cria uma tabela `solicitacao_vinculo` independente**.

| Campo | Finalidade |
|---|---|
| `id_codigo_vinculo` | Chave primária identity. |
| `codigo_hash` | HMAC-SHA256 hexadecimal único. |
| `id_estudante` | FK para estudante emissor. |
| `expira_em`, `revogado_em`, `criado_em` | Controle temporal e revogação. |
| `id_professor`, `id_psicologo_escolar` | FKs opcionais; no máximo um tipo de profissional por código. |
| `resgatado_em` | Instante da solicitação do profissional. |
| `status` | `ABERTO`, `AGUARDANDO_ESTUDANTE`, `ACEITO`, `RECUSADO`, `REVOGADO`. |
| `respondido_em` | Instante do aceite ou recusa. |

As constraints impedem dois profissionais simultâneos, verificam a data de expiração inicial e garantem coerência parcial entre `ABERTO` e `resgatado_em`. As transições de estado e as permissões precisam ser verificadas pelo backend.

### Índices

- `ix_codigo_vinculo_estudante`: `(id_estudante, status)`.
- `ix_codigo_cadastro_admin`: `(id_administrador, criado_em DESC)`.

Todas as FKs novas utilizam `ON DELETE RESTRICT`.

## 3. Regras e segurança a implementar no backend

**Cadastro:** gerar códigos com `secrets` (dez caracteres, apresentação `XXXXX-XXXXX`); armazenar apenas HMAC-SHA256 calculado a partir da chave do servidor e o sufixo; exibir código completo somente na criação. O administrador define perfil, validade de 1–30 dias (padrão 7), usos de 1–200 (padrão 1) e, para estudante, turma/escola. Os valores de turma/escola do código prevalecem sobre os do formulário. Na verificação e no cadastro, códigos inválidos, vencidos, revogados ou esgotados devem produzir mensagem genérica. A criação da conta utiliza `transaction.atomic` e `select_for_update()` para evitar uso além do limite.

**Vínculo:** gerar com `secrets` seis caracteres (`XXX-XXX`), válidos por 24 horas, de uso único. Gerar outro revoga o código `ABERTO` anterior. O backend deve garantir no máximo um código aberto por estudante, pois a V3 não implementa índice único parcial. O profissional precisa ser professor ou psicólogo escolar ativo; resgatar muda `ABERTO` para `AGUARDANDO_ESTUDANTE` e registra o profissional. O aceite cria ou reativa uma linha em `professor_estudante` ou `psicologo_escolar_estudante`; recusa não cria vínculo. Um profissional já vinculado recebe conflito e não consome o código. Antes do aceite, pode ver apenas primeiro nome e turma do estudante.

**Proteções:** limites de tentativas (`10/min` por IP para cadastro; `10/min` por usuário para resgate), permissões por perfil, CSRF conforme autenticação por sessão e ausência de vazamento de código em logs. A situação “expirado” é calculada por `expira_em <= now()`, não armazenada como status persistido.

**Importante:** a migração cria a estrutura, **não** implementa essas regras, os endpoints ou a geração dos hashes.

## 4. Compatibilidade

- Não modifica `usuario`, perfis nem `professor_estudante`/`psicologo_escolar_estudante` criados na V1.
- Não modifica o responsável como contato sem login definido na V2.
- Solicitações pendentes não geram vínculo ativo e não devem liberar acesso a dados ou alertas.
- Não alterar migrações V1 e V2 já versionadas.
- O administrador continua podendo criar e remover vínculos diretamente.

## 5. Rotas previstas (não implementadas por este PR)

- **Admin:** `POST/GET /api/admin/codigos-cadastro/`; `POST /api/admin/codigos-cadastro/{id}/revogar/`.
- **Público:** `POST /api/auth/codigo-cadastro/verificar/`; `POST /api/auth/cadastro/`.
- **Estudante:** `POST /api/vinculos/codigos/`; `GET/DELETE /api/vinculos/codigos/atual/`; `GET /api/vinculos/solicitacoes/`; `POST /api/vinculos/solicitacoes/{id}/aceitar/` e `/recusar/`.
- **Profissional:** `POST /api/vinculos/resgatar/`; opcionalmente `GET /api/vinculos/enviados/`.

Os formatos de requisição e resposta, validações e testes estão definidos no documento *Códigos de cadastro e de vínculo: especificação para o backend* fornecido pela equipe.

## 6. Execução e validação

Com banco de desenvolvimento, backup e `flyway.toml` configurados:

```powershell
flyway info
flyway validate
flyway migrate
flyway info
```

Para conferir as novas tabelas e restrições:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('codigo_cadastro', 'uso_codigo_cadastro', 'codigo_vinculo')
ORDER BY table_name;

SELECT conrelid::regclass AS tabela, conname AS restricao
FROM pg_constraint
WHERE conrelid IN (
    'public.codigo_cadastro'::regclass,
    'public.uso_codigo_cadastro'::regclass,
    'public.codigo_vinculo'::regclass
)
ORDER BY tabela, restricao;
```

Validar também uso concorrente, expiração, revogação, limites de uso, aceite/recusa, reativação de vínculo, autorização e ausência de acesso antes do aceite. Executar `python manage.py verificar_esquema` após atualização dos models.

## 7. Pendências

- Models Django (`CodigoCadastro`, `UsoCodigoCadastro`, `CodigoVinculo`), helpers HMAC, serializers, endpoints, throttling e testes ainda precisam ser implementados.
- O fluxo de deploy `aplicar_esquema` precisa conseguir aplicar V3 em bancos que já contenham V1 (incluindo Neon), sem recriar o banco.
- A divergência preexistente entre o model `Responsavel` e a V2 precisa ser resolvida para o `verificar_esquema` passar.
- Requisitos, regras de negócio e modelos de dados gerais devem ser revisados à luz dos novos fluxos.
- **Não houve execução/validação desta V3 em um servidor PostgreSQL nesta entrega.**

## 8. Fonte de verdade

O SQL em `database/migrations/` é a fonte executável do esquema. A especificação de backend é a referência dos fluxos e contratos da API.
