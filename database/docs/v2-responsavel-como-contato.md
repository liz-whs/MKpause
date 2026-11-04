# V2 — Responsável como contato sem login

- **Projeto:** MKpause
- **Versão:** V2
- **Migração:** [`V2__ajusta_responsavel_como_contato.sql`](../migrations/V2__ajusta_responsavel_como_contato.sql)
- **SGBD:** PostgreSQL
- **Gerenciador:** Flyway
- **Status:** aplicação local concluída, conforme validação informada pela equipe em 31/10/2026. Não indica aplicação em outros ambientes.

## 1. Objetivo

Adequar o esquema físico à decisão de projeto de que o **responsável é um contato vinculado ao estudante**, sem credenciais de autenticação nem perfil de acesso à plataforma. Na V1, `responsavel.id_usuario` exigia uma conta correspondente em `usuario`, o que contrariava essa decisão.

Esta migração modifica somente a estrutura de `responsavel`; o processo de convite e estabelecimento do vínculo continua sendo uma responsabilidade funcional a implementar.

## 2. Pré-requisitos e proteção dos dados

- A V1 deve estar aplicada e registrada no histórico do Flyway.
- Deve existir backup do banco antes da alteração.
- **A tabela `responsavel` deve estar vazia.** A V2 não realiza migração de dados existentes.
- O script utiliza `LOCK TABLE ... IN ACCESS EXCLUSIVE MODE` e verifica, antes de alterar a estrutura, se existe qualquer responsável cadastrado.
- Havendo registros, a migração lança uma exceção e não deve ser forçada; é necessário desenhar uma migração que preserve esses dados.

Na aplicação local relatada pela equipe, `responsavel` estava vazia antes da migração.

## 3. Mudanças realizadas

| Objeto | Antes (V1) | Depois (V2) |
|---|---|---|
| `responsavel.id_usuario` | `BIGINT NOT NULL UNIQUE`, FK para `usuario` | Removido |
| `responsavel.nome_completo` | Inexistente | `VARCHAR(150) NOT NULL` |
| `responsavel.email` | Inexistente | `VARCHAR(254)`, opcional |
| `responsavel.telefone` | `VARCHAR(30)`, opcional | Mantido |
| `responsavel.id_responsavel` | Chave primária | Mantido |
| `responsavel.ativo` e timestamps | Existentes | Mantidos |
| `estudante_responsavel` | FK para `responsavel.id_responsavel` | Estrutura inalterada |

Ao remover `id_usuario`, também são removidas as restrições de FK e unicidade associadas à própria coluna. Não são removidas contas da tabela `usuario`.

## 4. Consequências para a aplicação

- O responsável deixa de precisar de login para existir como contato.
- A relação entre estudante e responsável continua sendo registrada em `estudante_responsavel`, com `grau_parentesco`, `ativo` e `criado_em`.
- O backend deve validar os contatos e os vínculos, respeitando as regras de autorização e privacidade do MKpause.
- O envio de convites, a confirmação de vínculo e eventuais notificações externas **não foram implementados por esta migração**.
- A coluna `email` é opcional; não há restrição de unicidade de e-mail nesta versão.

## 5. Execução e validação

Com o `flyway.toml` configurado e a senha definida pela variável de ambiente `FLYWAY_PASSWORD`, a sequência de trabalho é:

```powershell
flyway info
flyway -ignoreMigrationPatterns="*:pending" validate
flyway migrate
flyway info
flyway validate
```

O comando `flyway` acima representa o executável instalado localmente; quando não estiver no PATH, utilizar seu caminho completo.

No pgAdmin 4, é possível conferir o estado da tabela:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'responsavel'
ORDER BY ordinal_position;
```

Verificar a presença de `nome_completo` e `email`, a ausência de `id_usuario` e a permanência do relacionamento `estudante_responsavel.id_responsavel`.

## 6. Limitações e próximas decisões

O backend já foi adaptado à V2: `Responsavel` contém os campos do contato, o cadastro não cria usuário e as operações administrativas não dependem de `id_usuario`. O comando `aplicar_esquema` reconhece a V2 pelas colunas, não a reaplica e interrompe diante de dados legados ou esquema parcial. A conferência local dos models passou, e os testes de PostgreSQL exercitam o SQL real da V2, sua repetição e as proteções contra aplicação indevida.

A V2 **não** altera os demais perfis, o registro de observações, as sessões, os alertas, nem a integração com a autenticação Django. Esses temas devem ser avaliados separadamente antes de novas migrações.

Também permanece necessário definir as validações de contato, o processo de convite, as políticas de privacidade e a estratégia de atualização de vínculos.

## 7. Fonte de verdade

O SQL versionado em [`database/migrations/V2__ajusta_responsavel_como_contato.sql`](../migrations/V2__ajusta_responsavel_como_contato.sql) é a fonte executável desta versão. Este documento registra as decisões e o comportamento esperado; não substitui testes ou a validação efetiva em cada ambiente.
