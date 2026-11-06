# Códigos de cadastro e de vínculo: especificação para o backend

**Para:** Otávio (backend Laravel e banco)
**De:** Giovanna (interface web)
**Branch base:** `main`. O deploy no Render segue a branch configurada no Render.

**Implementação local:** a migração V3 da Liz (`22dd578`) foi incorporada, e os models, helpers, endpoints, limites de tentativas e testes foram implementados conforme este contrato. A interface usa a API real; a simulação fica apenas nos testes. `aplicar_esquema` aplica V1 a V4 ausentes. A V2 foi concluída (seção 10), e a V4 implementa o [convite ao responsável e a fila de e-mail](convites-e-emails.md).

Este documento descreve tudo o que o backend precisa ter para a nova forma de entrada no MKpause:

- o banco (migração V3);
- os models;
- as rotas da API, com os formatos de pedido e de resposta;
- as regras de segurança;
- os testes;
- o deploy.

A interface web fica comigo e vai seguir exatamente o contrato da seção 5. Se precisar mudar algum nome de campo ou rota, me avisa antes, para os dois lados continuarem batendo.

---

## 1. O que muda, em uma frase cada

1. **Sai o login com Google.** O botão some da interface. No backend não há nada a fazer, porque ele nunca existiu lá.
2. **Código de cadastro (gerado pelo admin).** Ninguém cria conta sozinho. O admin gera um código para um perfil (estudante, professor, psicólogo escolar ou psicólogo clínico), e a pessoa usa esse código para se cadastrar.
3. **Código de vínculo (gerado pelo estudante).** O estudante gera um código curto e passa para o professor ou psicólogo escolar que vai acompanhá-lo. O profissional digita o código, o estudante confirma, e o vínculo é criado.
4. **O admin continua no controle.** Ele vê e remove qualquer vínculo e ainda pode vincular direto pelas rotas atuais (`/api/admin/vinculos/...`). Isso mantém a RN28: os vínculos são gerenciados por quem tem permissão administrativa.
5. **O psicólogo clínico não usa código de vínculo.** O vínculo dele continua pelo admin, com o convite ao responsável (RN24). Os dados clínicos são os mais sensíveis, e para um menor o responsável precisa consentir.

## 2. Fluxos

### 2.1 Cadastro com código

1. **Admin** → Usuários → "Gerar código de cadastro". Ele escolhe o perfil e, se quiser, a turma e a escola (só para estudante), a validade e o número de usos.
2. O sistema mostra o código **uma única vez**, por exemplo `K7QM2-9XHPA`. O admin copia e entrega à pessoa.
3. **Pessoa** → tela Entrar → "Tenho um código de cadastro" → digita o código.
4. A interface chama `verificar`. Se o código é válido, mostra o formulário do perfil certo.
5. A pessoa preenche nome, e-mail, senha e os campos do perfil, e envia.
6. O backend cria o `usuario` e o perfil numa transação, consome um uso do código e **já entra na conta** (a mesma sessão do login).

### 2.2 Vínculo com código (estudante → professor ou psicólogo escolar)

1. **Estudante** → Perfil → "Compartilhar com quem me acompanha" → o sistema gera um código curto, por exemplo `7HQ-K2M`, válido por 24 horas.
2. O estudante passa o código ao profissional, pessoalmente ou pela escola.
3. **Profissional** (professor ou psicólogo escolar) → Estudantes → "Adicionar estudante com código" → digita o código.
4. O backend cria uma **solicitação pendente** e mostra ao profissional só o primeiro nome e a turma do estudante.
5. **Estudante** → vê "Marcos Prado (Professor) quer te acompanhar" → **Aceitar** ou **Recusar**.
6. Ao aceitar, o backend cria a linha em `professor_estudante` ou em `psicologo_escolar_estudante`, ou reativa a linha se ela já existia inativa.

Regras do código de vínculo:
- Vale uma vez só.
- Expira em 24 horas.
- Cada estudante tem **no máximo um código aberto**: gerar um novo revoga o anterior.

## 3. Banco: migração `V3__codigos_de_cadastro_e_vinculo.sql`

O arquivo fica em `database/migrations/`, com o mesmo padrão da V1: `BIGINT GENERATED ALWAYS AS IDENTITY`, `TIMESTAMPTZ`, `ON DELETE RESTRICT`, constraints nomeadas e comentários em português.

A V3 não depende da V2.

```sql
-- MKpause - V3: códigos de cadastro (gerados pelo admin) e de vínculo (gerados pelo estudante).
-- Os códigos nunca são guardados em texto: só o HMAC-SHA256 (codigo_hash) e os 3 últimos
-- caracteres (sufixo), para o admin reconhecer o código na lista.

CREATE TABLE codigo_cadastro (
    id_codigo_cadastro BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_hash CHAR(64) NOT NULL UNIQUE,
    sufixo VARCHAR(3) NOT NULL,
    perfil VARCHAR(20) NOT NULL,
    id_administrador BIGINT NOT NULL
        REFERENCES administrador(id_administrador) ON DELETE RESTRICT,
    -- Pré-preenchimento opcional (só faz sentido para estudante)
    turma VARCHAR(80),
    instituicao_ensino VARCHAR(160),
    usos_maximos INTEGER NOT NULL DEFAULT 1,
    usos INTEGER NOT NULL DEFAULT 0,
    expira_em TIMESTAMPTZ NOT NULL,
    revogado_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_codigo_cadastro_perfil CHECK (
        perfil IN ('ESTUDANTE', 'PROFESSOR', 'PSICOLOGO_ESCOLAR', 'PSICOLOGO_CLINICO')),
    CONSTRAINT ck_codigo_cadastro_usos CHECK (usos_maximos BETWEEN 1 AND 200 AND usos BETWEEN 0 AND usos_maximos),
    CONSTRAINT ck_codigo_cadastro_validade CHECK (expira_em > criado_em)
);

-- Quem usou cada código de cadastro (auditoria; um código pode ter vários usos).
CREATE TABLE uso_codigo_cadastro (
    id_codigo_cadastro BIGINT NOT NULL
        REFERENCES codigo_cadastro(id_codigo_cadastro) ON DELETE RESTRICT,
    id_usuario BIGINT NOT NULL UNIQUE
        REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    usado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_codigo_cadastro, id_usuario)
);

-- Código gerado pelo estudante; quando um profissional o usa, vira uma solicitação.
CREATE TABLE codigo_vinculo (
    id_codigo_vinculo BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_hash CHAR(64) NOT NULL UNIQUE,
    id_estudante BIGINT NOT NULL
        REFERENCES estudante(id_estudante) ON DELETE RESTRICT,
    expira_em TIMESTAMPTZ NOT NULL,
    revogado_em TIMESTAMPTZ,
    -- Preenchidos quando um profissional usa o código (no máximo um dos dois)
    id_professor BIGINT REFERENCES professor(id_professor) ON DELETE RESTRICT,
    id_psicologo_escolar BIGINT REFERENCES psicologo_escolar(id_psicologo_escolar) ON DELETE RESTRICT,
    resgatado_em TIMESTAMPTZ,
    -- Resposta do estudante
    status VARCHAR(25) NOT NULL DEFAULT 'ABERTO',
    respondido_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_codigo_vinculo_status CHECK (
        status IN ('ABERTO', 'AGUARDANDO_ESTUDANTE', 'ACEITO', 'RECUSADO', 'REVOGADO')),
    CONSTRAINT ck_codigo_vinculo_um_profissional CHECK (
        NOT (id_professor IS NOT NULL AND id_psicologo_escolar IS NOT NULL)),
    CONSTRAINT ck_codigo_vinculo_resgate CHECK (
        (status = 'ABERTO') = (resgatado_em IS NULL)
        OR status = 'REVOGADO'),
    CONSTRAINT ck_codigo_vinculo_validade CHECK (expira_em > criado_em)
);

CREATE INDEX ix_codigo_vinculo_estudante ON codigo_vinculo (id_estudante, status);
CREATE INDEX ix_codigo_cadastro_admin ON codigo_cadastro (id_administrador, criado_em DESC);
```

Observações:
- **Vínculos:** não mexer em `professor_estudante` nem em `psicologo_escolar_estudante`. O aceite só insere ou reativa linhas nelas.
- **Validade:** "expirado" não é um status gravado. É `expira_em <= now()`, calculado na hora da leitura. Assim não precisa de rotina agendada.
- **Revogação:** um código revogado guarda `revogado_em`. No código de vínculo, o status também vira `REVOGADO`.

## 4. Models e helpers (`backend/contas/`)

- **Models:** `CodigoCadastro`, `UsoCodigoCadastro` e `CodigoVinculo` em `contas/models.py`, com `managed = False` (herdando `TabelaDoFlyway`), como os outros. `UsoCodigoCadastro` usa `models.CompositePrimaryKey`, igual aos vínculos.
- **Helpers:** um arquivo novo, `contas/codigos.py`:
  - `ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"` (sem `0/O`, `1/I/L`, que se confundem);
  - `gerar(tamanho)` com `secrets.choice`. O código de cadastro tem 10 caracteres e aparece como `XXXXX-XXXXX`; o de vínculo tem 6 e aparece como `XXX-XXX`;
  - `normalizar(texto)`: maiúsculas, remove espaços e hífens;
  - `hash_codigo(texto) = hmac.new(settings.SECRET_KEY.encode(), normalizar(texto).encode(), "sha256").hexdigest()`.
- **`perfis.py`:** mapear `perfil` (`ESTUDANTE`, …) para o model e o serializer de criação certos.
- **`verificar_esquema`:** precisa passar com as tabelas novas.

## 5. API (contrato com a interface)

Tudo em JSON. Os erros seguem o padrão atual (`{"detail": "..."}` ou erros de campo do DRF). As mensagens são em português, curtas e sem detalhes internos.

### 5.1 Admin: códigos de cadastro (`SomenteAdministrador`)

**`POST /api/admin/codigos-cadastro/`**
```json
// pedido
{ "perfil": "ESTUDANTE", "usos_maximos": 1, "validade_dias": 7, "turma": "8º A", "instituicao_ensino": "Escola Modelo" }
// 201: "codigo" só aparece nesta resposta
{ "id_codigo_cadastro": 12, "codigo": "K7QM2-9XHPA", "sufixo": "HPA", "perfil": "ESTUDANTE",
  "turma": "8º A", "instituicao_ensino": "Escola Modelo", "usos_maximos": 1, "usos": 0,
  "expira_em": "2026-11-10T14:00:00-03:00", "revogado_em": null, "situacao": "ATIVO",
  "criado_em": "2026-11-03T14:00:00-03:00" }
```
- `usos_maximos`: de 1 a 200, padrão 1. Mais de 1 serve, por exemplo, para um código de turma.
- `validade_dias`: de 1 a 30, padrão 7.
- `turma` e `instituicao_ensino` só são aceitos quando o perfil é `ESTUDANTE`. Nos outros perfis, devolver 400.

**`GET /api/admin/codigos-cadastro/`** → lista do mais novo para o mais antigo, **sem** o campo `codigo`.
- `situacao` é calculada: `ATIVO`, `ESGOTADO` (`usos = usos_maximos`), `EXPIRADO` ou `REVOGADO`.
- Cada item inclui `usado_por`: `[{ "id_usuario", "nome_completo", "email", "usado_em" }]`.

**`POST /api/admin/codigos-cadastro/{id}/revogar/`** → 200 com o item atualizado. Se já estava revogado, também devolve 200.

### 5.2 Público: cadastro com código (sem login, com limite de tentativas)

**`POST /api/auth/codigo-cadastro/verificar/`**
```json
{ "codigo": "k7qm2 9xhpa" }
// 200
{ "perfil": "ESTUDANTE", "turma": "8º A", "instituicao_ensino": "Escola Modelo" }
// 400, para qualquer motivo (inexistente, expirado, esgotado, revogado):
{ "detail": "Código inválido ou expirado. Peça um novo à escola." }
```
Use a mesma mensagem para todos os motivos, para o endpoint não servir de oráculo.

**`POST /api/auth/cadastro/`**
```json
{ "codigo": "K7QM2-9XHPA", "nome_completo": "Ana Lima", "email": "ana@escola.br", "senha": "********",
  // por perfil:
  // ESTUDANTE:          "turma"?, "instituicao_ensino"?, "data_nascimento"? (AAAA-MM-DD)
  // PROFESSOR:          "cargo"?, "instituicao_ensino"?, "telefone"?
  // PSICOLOGO_ESCOLAR:  "registro_profissional", "estado_registro" (UF), "instituicao_ensino"?, "telefone"?
  // PSICOLOGO_CLINICO:  "registro_profissional", "estado_registro" (UF), "telefone"?
}
// 201: mesma resposta do POST /api/auth/login/ (já entra na conta)
{ "id_usuario": 41, "nome_completo": "Ana Lima", "email": "ana@escola.br", "perfil": "estudante", "id_perfil": 9 }
```
- **Transação única** (`transaction.atomic`):
  1. `select_for_update()` no código;
  2. confere a validade (não revogado, não expirado, `usos < usos_maximos`);
  3. cria o `usuario` (e-mail em minúsculas, senha com `definir_senha`, mínimo `SENHA_TAMANHO_MINIMO`);
  4. cria o perfil do tipo do código;
  5. `usos += 1`;
  6. grava em `uso_codigo_cadastro`.
- **Turma e escola:** se o código já tiver `turma` ou `instituicao_ensino`, esses valores **vencem** o que veio no corpo.
- **E-mail repetido:** 400 em `email` (`"Já existe uma conta com este e-mail."`). O código **não** é consumido.
- **Código inválido:** 400 com a mesma mensagem genérica de `verificar`.
- **Depois do cadastro:** chama `entrar(request, usuario)` (`contas/autenticacao.py`) e devolve `_dados_da_conta(usuario)`.
- **Senha:** nunca aparece na resposta.

### 5.3 Estudante: código de vínculo (`somente(p.ESTUDANTE)`)

**`POST /api/vinculos/codigos/`** (sem corpo)
```json
// 201: revoga o código ABERTO anterior do estudante, se houver
{ "id_codigo_vinculo": 3, "codigo": "7HQ-K2M", "expira_em": "2026-11-04T14:00:00-03:00" }
```

**`GET /api/vinculos/codigos/atual/`** → `{ "id_codigo_vinculo", "expira_em", "status" }` do código ABERTO e não expirado, ou **204** se não houver nenhum.
- Por causa do hash, o código em texto não volta. A interface mostra que existe um código ativo e oferece "Gerar outro".

**`DELETE /api/vinculos/codigos/atual/`** → revoga o código aberto. Responde 204.

**`GET /api/vinculos/solicitacoes/`** → só as que estão aguardando, ou seja, status `AGUARDANDO_ESTUDANTE` e não expiradas:
```json
[ { "id_codigo_vinculo": 3, "profissional": { "nome_completo": "Marcos Prado", "perfil": "professor",
    "detalhe": "Matemática · Escola Modelo" }, "resgatado_em": "2026-11-03T15:10:00-03:00" } ]
```
`detalhe` é o `cargo`/escola para professor, e `CRP {registro}/{UF}`/escola para psicólogo escolar.

**`POST /api/vinculos/solicitacoes/{id}/aceitar/`**
- Na transação: `select_for_update`, confere que é do próprio estudante e que está `AGUARDANDO_ESTUDANTE` e válida.
- Muda o status para `ACEITO` e grava `respondido_em`.
- Cria ou reativa a linha do vínculo.
- Responde 200 com `{ "status": "ACEITO" }`.

**`POST /api/vinculos/solicitacoes/{id}/recusar/`** → muda o status para `RECUSADO` e grava `respondido_em`. Responde 200.

### 5.4 Profissional: usar o código (`somente(p.PROFESSOR, p.PSICOLOGO_ESCOLAR)`)

**`POST /api/vinculos/resgatar/`**
```json
{ "codigo": "7hq k2m" }
// 200
{ "status": "AGUARDANDO_ESTUDANTE", "estudante": { "primeiro_nome": "Ana", "turma": "8º A" } }
```
- Na transação: `select_for_update`, confere que o status é `ABERTO`, que não expirou e que não foi revogado.
- Preenche `id_professor` ou `id_psicologo_escolar` (o do usuário logado) e `resgatado_em`.
- Muda o status para `AGUARDANDO_ESTUDANTE`.
- Se o profissional **já tem vínculo ativo** com esse estudante: responde 409 `{"detail": "Você já acompanha este estudante."}` e o código **continua aberto**.
- Código inválido por qualquer motivo: 400 `{"detail": "Código inválido ou expirado. Peça um novo ao estudante."}`.
- Antes do aceite, o profissional só vê o **primeiro nome e a turma**, nada além.

**`GET /api/vinculos/enviados/`** (opcional, mas útil) → as solicitações que o profissional fez e ainda aguardam resposta: `[{ "id_codigo_vinculo", "estudante": {"primeiro_nome", "turma"}, "resgatado_em" }]`.

### 5.5 O que **não** muda

- `POST /api/auth/login/`, `logout/` e `eu/`.
- As rotas `/api/admin/vinculos/...`: o admin continua vendo, criando e removendo vínculos.
- `POST /api/admin/estudantes/` etc.: o admin continua podendo cadastrar direto.
- `criar_admin`: o primeiro admin continua sendo criado pelo terminal.

## 6. Segurança (obrigatório)

1. **Geração:** sempre `secrets`, nunca `random`.
2. **Armazenamento:** só o HMAC (`codigo_hash`). O texto do código aparece só na resposta de criação e nunca em logs.
3. **Limite de tentativas** (DRF `ScopedRateThrottle`, em `REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]`):
   - `cadastro` (verificar e cadastro): `10/min` por IP;
   - `vinculo` (resgatar): `10/min` por usuário.

   Isso importa principalmente para o código de vínculo, que é curto: 6 caracteres de um alfabeto de 31 dão cerca de 887 milhões de combinações. Com o limite e a validade de 24 horas, não dá para adivinhar.
4. **Concorrência:** `select_for_update()` em todo uso de código, para dois pedidos simultâneos não usarem o mesmo código duas vezes.
5. **Mensagem única:** a mesma mensagem para código inexistente, expirado, esgotado ou revogado.
6. **Contas ativas:** o estudante e o profissional precisam estar com `ativo = TRUE`, no perfil e no `usuario`.
7. **CSRF:** as rotas públicas (`verificar`, `cadastro`) seguem como o `LoginView`: `authentication_classes = []`. As outras usam a autenticação por sessão atual, com CSRF.
8. **Acesso:** o profissional não acessa nada do estudante antes do aceite. `estudantes_vinculados()` continua olhando só as tabelas de vínculo, então isso já vale sem mudar `permissoes.py`.

## 7. Testes (`backend/contas/tests.py`, usando `CasoMKpause`)

Cadastro:
- O admin gera um código e o `codigo` aparece só na criação. No `GET`, ele não aparece e o `sufixo` aparece.
- Não-admin recebe 403 ao gerar ou listar.
- `verificar` responde 200 com o perfil certo, e 400 com a mesma mensagem para código inexistente, expirado, revogado ou esgotado.
- `cadastro` cria `usuario` e perfil, consome um uso, grava em `uso_codigo_cadastro` e já devolve a sessão (`/api/auth/eu/` responde 200 em seguida).
- `turma` e `instituicao_ensino` do código vencem os do corpo.
- E-mail repetido dá 400 e o código não é consumido.
- Com `usos_maximos = 2`: o terceiro uso falha.
- Psicólogo sem `registro_profissional` ou com UF inválida dá 400.

Vínculo:
- O estudante gera um código. Gerar outro revoga o anterior.
- O professor resgata e o status vira `AGUARDANDO_ESTUDANTE`. Antes do aceite, `GET /api/estudantes/{id}/` dá 404 para ele.
- O estudante aceita: aparece a linha em `professor_estudante`, e o professor passa a ver o estudante e a receber alertas.
- O estudante recusa: nenhum vínculo é criado.
- Código expirado (mude `expira_em` no teste) ou já usado dá 400.
- Professor já vinculado dá 409, e o código continua `ABERTO`.
- Psicólogo clínico e admin recebem 403 em `resgatar`.
- Outro estudante não consegue aceitar uma solicitação que não é dele (404).
- O vínculo inativo é reativado no aceite, sem criar linha duplicada.

Rodar também `php artisan mkpause:verificar-esquema` contra um banco com a V3.

## 8. Deploy (Render + Neon)

- **`aplicar_esquema` (implementado):** aplica V1 a V4 ausentes, inclusive em bancos existentes. Verifica tabelas e colunas da V2. A V2 só é aplicada se a tabela antiga de responsáveis estiver vazia; com registros legados, o comando interrompe sem apagá-los.
- **Throttling:** se não houver cache configurado, o DRF usa o `LocMemCache` padrão. Com `--workers 1 --threads 8`, isso funciona no Render grátis.
- **`criar_demo`** (opcional): um código de cadastro de estudante de demonstração, impresso no log, para testes.

## 9. Documentação a atualizar

- `docs/02-requisitos/requisitos-funcionais.md`: novos RFs para gerar e revogar código de cadastro (admin), cadastrar-se com código, gerar código de vínculo (estudante), usar o código (profissional) e aceitar ou recusar (estudante).
- `docs/02-requisitos/regras-de-negocio.md`: regra do código (uso único ou limitado, validade, só o hash guardado) e regra de que o vínculo exige o aceite do estudante, mantendo a supervisão do admin (RN28).
- `docs/04-modelagem-de-dados/`: as tabelas da V3.
- `backend/README.md`: as rotas novas.

## 10. Compatibilidade com a V2 (concluída localmente)

O model `Responsavel`, o serializer e as views administrativas tratam o responsável como contato sem login: nome obrigatório, e-mail e telefone opcionais no cadastro. Para enviar convite é necessário um e-mail. Não há criação nem alteração de `usuario`. Os vínculos usam `id_responsavel` e preservam o histórico. O convite/aceite foi implementado na V4; `verificar_esquema` confere 24 tabelas no PostgreSQL local.

## 11. O que eu (interface web) vou fazer em paralelo

- **Login:** tirar o botão do Google e colocar "Tenho um código de cadastro", com o formulário que muda conforme o perfil que `verificar` devolver.
- **Admin:** em Usuários, "Gerar código de cadastro", com o código mostrado uma vez e um botão Copiar, e a lista com situação, usos e quem usou.
- **Estudante:** no Perfil, "Compartilhar com quem me acompanha" (gerar, ver validade, gerar outro, cancelar) e o aviso de solicitações pendentes com Aceitar e Recusar.
- **Professor e psicólogo escolar:** em Estudantes, "Adicionar estudante com código" e a lista de pedidos aguardando.
- **Testes:** usando a camada de dados de exemplo, com o mesmo contrato acima.
