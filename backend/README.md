# Backend do MKpause

API JSON em Django + Django REST Framework, sobre o banco PostgreSQL criado
pelo Flyway (`database/migrations/V1__criacao_do_esquema_inicial.sql`).
Não tem HTML nem CSS: a interface é feita à parte e consome esta API.

Sugestão de lugar no repositório: `src/backend/`.

## Como rodar

Pré-requisitos: Python 3.12+ e o banco `mkpause` já criado pelo Flyway (`flyway migrate`).

```powershell
cd src/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env                # e preencha a senha do banco
python manage.py verificar_esquema    # confere se os models batem com o banco
python manage.py criar_admin --email admin@escola.br --nome "Administração"
python manage.py runserver
```

Testes (não precisam de PostgreSQL, rodam em SQLite em memória):

```powershell
python manage.py test
```

## Como o projeto está organizado

| Pasta | O que tem | Tabelas |
|---|---|---|
| `mkpause/` | settings e rotas (`urls.py`) | |
| `nucleo/` | base dos models, erros, executor de testes, comando `verificar_esquema` | |
| `contas/` | login, perfis, **regras de acesso** (`permissoes.py`), cadastros e vínculos | `usuario`, perfis, vínculos |
| `atividades/` | catálogo de jogos, vídeos e exercícios | `atividade` |
| `sessoes/` | sessão de autorregulação e humor; critério de avaliação em `regras.py` | `sessao`, `registro_humor` |
| `alertas/` | alertas, destinatários e observações; regra de destinatários em `regras.py` | `alerta`, `destinatario_alerta`, `observacao` |
| `acompanhamento/` | ficha de acompanhamento e avisos | `ficha_acompanhamento`, `aviso` |

Onde mudar uma regra, sem mexer nas views:

- **Quem pode ver o quê:** tabela `ACESSO` em `contas/permissoes.py`.
- **Humor para nível:** `sessoes/regras.py` (critério provisório: humor 1 dá nível 3, humor 2 dá nível 2, 3 a 5 dão nível 1).
- **Quem recebe o alerta:** `alertas/regras.py` (nível 2: professores; nível 3: professores e psicólogo escolar).

## Quando o banco mudar (trabalho com quem cuida do banco)

O esquema pertence ao Flyway. O Django **nunca** cria nem altera tabelas: todos os
models têm `managed = False` e as migrações do Django estão desligadas. Por isso
não existe pasta `migrations/` nos apps. **Não rode `makemigrations`.**

Cada model diz qual tabela espelha (`db_table`) e cada campo, qual coluna (`db_column`).
Os comentários `# CHECK ...` apontam a restrição correspondente no SQL.

Fluxo para uma mudança, por exemplo `V2__ajusta_responsavel_como_contato.sql`:

1. **Quem cuida do banco** cria a nova migração em `database/migrations/` (nunca edita a V1),
   roda `flyway migrate` e atualiza `database/docs/`.
2. **Quem cuida do backend** roda:
   ```powershell
   python manage.py verificar_esquema
   ```
   O comando compara cada model com o banco e lista:
   - `ERRO`: tabela ou coluna que o model usa e sumiu, ou coluna nova obrigatória (NOT NULL sem padrão). O backend quebra até ajustar.
   - `AVISO`: tabela ou coluna nova ainda não usada, ou diferença de nulo. O backend continua funcionando.
3. Ajuste o `models.py` do app correspondente (e o serializer, se o campo deve aparecer na API).
4. Rode `verificar_esquema` de novo até ficar sem `ERRO`, e depois `python manage.py test`.
5. Suba a migração SQL e o ajuste no backend no **mesmo** pull request.

Dica: `python manage.py inspectdb nome_da_tabela` gera um rascunho do model de uma tabela nova.

## Autenticação

### Códigos de cadastro e vínculo (V3)

A V3 da Liz (`22dd578`) está integrada aos models e à API. O contrato completo está em [`docs/codigos-de-acesso.md`](../docs/codigos-de-acesso.md).

- Admin: `GET/POST /api/admin/codigos-cadastro/` e `POST /api/admin/codigos-cadastro/{id}/revogar/`.
- Público: `POST /api/auth/codigo-cadastro/verificar/` e `POST /api/auth/cadastro/`. O cadastro já abre a sessão da conta nova.
- Estudante: `POST /api/vinculos/codigos/`, `GET/DELETE /api/vinculos/codigos/atual/`, `GET /api/vinculos/solicitacoes/` e `POST /api/vinculos/solicitacoes/{id}/aceitar/` ou `/recusar/`.
- Professor e psicólogo escolar: `POST /api/vinculos/resgatar/` e `GET /api/vinculos/enviados/`.

Os códigos são gerados com `secrets`, guardados apenas como HMAC-SHA256 e revelados uma única vez. Convites permitem 1–200 usos e validade de 1–30 dias; códigos de vínculo valem 24 horas e são de uso único. O profissional só recebe primeiro nome e turma antes do aceite. As operações usam transações e bloqueios de linha para impedir consumo duplicado e geração simultânea de dois códigos abertos. Verificação/cadastro têm limite conjunto de 10 tentativas/minuto por IP; resgate tem 10/minuto por usuário.

`python manage.py aplicar_esquema` aplica V1 e V3 ausentes, inclusive em bancos existentes. O comando usa uma transação e um bloqueio no PostgreSQL, não reaplica versões presentes e interrompe se encontrar apenas parte das tabelas da V3. A V2 continua separada até a atualização do model `Responsavel`; em bancos que já receberam V2, a divergência preexistente desse model ainda aparece no `verificar_esquema`.

Os testes de `contas/test_codigos.py` cobrem permissões, limites, expiração, revogação, cadastro, aceite/recusa, reativação, CSRF e concorrência. Os três testes de concorrência requerem PostgreSQL e são pulados no SQLite. Para a suíte dos módulos, use `python manage.py test contas sessoes alertas atividades acompanhamento nucleo` (o script manual `testar_api.py` é executado separadamente).

### Sessão

- A identidade é a tabela `usuario` (`senha_hash` guarda o hash do Django, PBKDF2).
  O `django.contrib.auth` não é usado, para não haver duas fontes de usuários.
- O perfil é descoberto pela tabela de perfil ativa que aponta para o usuário.
- A sessão fica num cookie assinado e dura 8 horas. Desativar a conta corta o acesso na hora.
- **CSRF:** antes de POST, PATCH ou DELETE, o frontend chama `GET /api/auth/csrf/` e envia o valor no cabeçalho `X-CSRFToken`.
- Erros sempre vêm como `{"detail": "..."}` ou `{"campo": ["..."]}`, sem detalhes internos do banco.

## Rotas

Todas em `/api/`, com JSON. "Vinculados" quer dizer que o acesso exige vínculo ativo com o estudante.

### Conta
| Método | Rota | Quem | Requisito |
|---|---|---|---|
| GET | `auth/csrf/` | qualquer um | |
| POST | `auth/login/` `{"email", "senha"}` | qualquer um | RF01, RF10, RF19, RF26 |
| POST | `auth/logout/` | logado | |
| GET | `auth/eu/` | logado | |

### Estudante
| Método | Rota | Requisito |
|---|---|---|
| GET | `atividades/` (`?tipo=JOGO`), só as disponíveis | RF02, RF03, RN31 |
| POST | `sessoes/avaliar/` `{"humor": 1-5}`: nível sugerido, sem gravar | RN07 |
| POST | `sessoes/` `{"id_atividade", "humor_pre"}` | RF04, RF05 |
| POST | `sessoes/<id>/concluir/` `{"humor_pos", "observacoes_sessao"?}` | RF06, RF07 |
| POST | `sessoes/<id>/cancelar/` | |
| GET | `sessoes/`, `sessoes/<id>/` | RF09 |
| POST | `alertas/` `{"nivel": 2\|3, "id_sessao"?, "descricao"?}` | RF08 |
| GET / PATCH | `alertas/`, `alertas/<id>/` (o estudante só pode `{"status": "CANCELADO"}`) | |
| GET | `avisos/` | |

### Profissionais
| Método | Rota | Quem | Requisito |
|---|---|---|---|
| GET | `estudantes/`, `estudantes/<id>/` | professor, psi. escolar, psi. clínico | RF11, RF20 |
| GET | `sessoes/?estudante=ID` (inclui os humores) | psi. escolar, psi. clínico, vinculados | RF12, RF13 |
| GET | `alertas/` (`?status=ABERTO`) | professor e psi. escolar: recebidos; clínico: dos vinculados | RF15, RF21, RF22 |
| POST | `alertas/<id>/lido/` | destinatário | |
| PATCH | `alertas/<id>/` `{"status"}` | destinatário | RF22 |
| GET / POST | `alertas/<id>/observacoes/` `{"conteudo"}` | POST: professor e psi. escolar; GET: também o clínico | RF14, RF23 |
| GET | `estudantes/<id>/ficha/` | psi. escolar, psi. clínico | RF16 |
| PATCH | `estudantes/<id>/ficha/` | psi. clínico | RF17 |
| GET | `avisos/` | todos | RF18, RF25 |

### Administrador
| Método | Rota | Requisito |
|---|---|---|
| GET / POST / PATCH / DELETE | `admin/estudantes/`, `admin/professores/`, `admin/psicologos-escolares/`, `admin/psicologos-clinicos/`, `admin/responsaveis/` (`?ativo=true`) | RF27–RF30 |
| GET / POST / DELETE | `admin/vinculos/professores/`, `admin/vinculos/psicologos-escolares/`, `admin/vinculos/psicologos-clinicos/`, `admin/vinculos/responsaveis/` | RF32–RF34 |
| POST / PATCH / DELETE | `atividades/` | RF35 |
| POST / PATCH | `estudantes/<id>/ficha/` | RF31 |
| POST / PATCH / DELETE | `avisos/` | |

Os cadastros recebem os campos de `usuario` junto com os do perfil, por exemplo:
`{"nome_completo", "email", "senha", "turma", ...}`.
**DELETE não apaga:** marca `ativo = false` e mantém o histórico (RN30).
Num vínculo, o DELETE recebe o par no corpo, por exemplo `{"professor": 1, "estudante": 2}`.

## Decisões tomadas onde a documentação não fecha

| Assunto | Decisão | Onde mudar |
|---|---|---|
| Professor e histórico emocional | O professor **não** vê sessões, humores nem ficha; vê alertas e observações | `contas/permissoes.py` |
| Psicólogo clínico e alertas (RF15) | A V1 não aceita o clínico como destinatário; ele consulta os alertas dos vinculados | `alertas/regras.py`, depois migração |
| Psicólogo clínico e observações | Só lê. O gatilho `trg_validar_autor_observacao` bloqueia a escrita; o registro clínico (RF17) vai na ficha | migração, se mudar |
| Alerta sem profissional vinculado | Não é criado; a resposta explica e indica 192 e 188 | `alertas/views.py` |
| `status_notificacao` | Fica `PENDENTE` até o destinatário marcar como lido; não existe envio externo ainda | `alertas/views.py` |
| Atividade da sessão | Escolhida no início (a V1 tem uma FK `id_atividade` NOT NULL) | |

## Pendências conhecidas (vêm do banco V1)

- **Responsável sem login:** a V1 ainda exige `responsavel.id_usuario`. Até a V2, o
  cadastro cria um `usuario` com senha inutilizável. Convite ao responsável (RN24) não implementado.
- **Perfil exclusivo:** a V1 não impede que um usuário esteja em duas tabelas de perfil.
  O login escolhe pela ordem em `contas/perfis.py`.
- **Humor PRE/POS obrigatórios:** garantidos pelo backend (a sessão já nasce com o PRE; concluir exige o POS).
- Antes de publicar: `DJANGO_DEBUG=0`, uma `DJANGO_SECRET_KEY` de verdade e HTTPS.
