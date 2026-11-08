# Backend do MKpause

API JSON em **PHP 8.2 + Laravel 12**, sobre o banco PostgreSQL criado pelo Flyway
(`database/migrations/`). Não tem HTML nem CSS: a interface (`src/web`) consome esta API.

O backend usa Laravel mantendo as rotas, os formatos de resposta e as mensagens públicas. As senhas usam PBKDF2; os códigos de cadastro e vínculo usam HMAC com a `MKPAUSE_SECRET_KEY`. A configuração anterior `DJANGO_SECRET_KEY` continua aceita para preservar os códigos existentes.

## Como rodar

Pré-requisitos: PHP 8.2+ com `pdo_pgsql`, [Composer](https://getcomposer.org) e o banco
PostgreSQL (local ou Neon).

```powershell
cd backend
copy .env.example .env                    # preencha banco e uma MKPAUSE_SECRET_KEY aleatória
composer install
php artisan mkpause:aplicar-esquema       # cria/atualiza as tabelas (V1 a V11) sem Flyway
php artisan mkpause:verificar-esquema     # confere se o backend e o banco batem
php artisan mkpause:criar-admin --email=admin@escola.br --nome="Administração" --escola="Nome da escola"
```

Para subir a API em `127.0.0.1:8000` (para onde o Vite repassa `/api`):

```powershell
cd src/web
npm run backend      # API Laravel
npm run dev          # interface, em outro terminal
```

O `npm run backend` liga as extensões do PHP que faltarem (no XAMPP, por exemplo) sem mudar o
`php.ini`. Também funciona `php artisan serve --port=8000`, se o seu PHP já tiver `pdo_pgsql`.

> **Neon no PHP do XAMPP:** o XAMPP traz uma biblioteca do PostgreSQL antiga, sem SNI, e o Neon
> recusa a conexão ("Endpoint ID is not specified"). Para desenvolver contra o Neon use um PHP
> mais novo; com o XAMPP, use o PostgreSQL local (apague ou renomeie o `.env.local` da raiz).

## Comandos

| Comando | O que faz |
|---|---|
| `php artisan mkpause:aplicar-esquema` | Aplica V1 a V11 que faltam. Usa transação e bloqueio; não reaplica o que existe; para em esquema parcial. A V2 exige `responsavel` vazia. |
| `php artisan mkpause:verificar-esquema` | Compara as colunas que o backend usa com o banco. `ERRO` quebra o backend; `AVISO` não. |
| `php artisan mkpause:criar-demo` | Requer `MKPAUSE_DEMO=true` em ambiente isolado. Contas, vínculos e atividades de demonstração (senha: `DEMO_SENHA` ou `--senha`). |
| `php artisan mkpause:sincronizar-atividades` | Acrescenta as sete atividades do catálogo, sem criar contas ou alterar senhas. Preserva atividades ocultadas e nomes personalizados. |
| `php artisan mkpause:criar-admin` | Cria um administrador (pede a senha no terminal). |
| `php artisan mkpause:processar-emails` | Processa a fila de e-mail (até 5 tentativas por mensagem). |

## Como o projeto está organizado

| Onde | O que tem |
|---|---|
| `routes/api.php` | Todas as rotas e quem pode usar cada uma |
| `app/Http/Controllers/` | Uma classe por área: `Autenticacao`, `Cadastros` (admin, vínculos, meus estudantes), `Atividades`, `Sessoes`, `Alertas`, `Acompanhamento` (ficha, avisos, painel clínico), `Codigos`, `Emails` (fila de alertas escolares) |
| `app/Http/Middleware/Autenticar.php` | Login pela sessão, CSRF e perfil exigido pela rota |
| `app/Mkpause/` | Regras e peças comuns: `Conta` (perfil do usuário), `Permissoes`, `Entrada` (validação com as mensagens da API), `Cadastros`, `Emails`, `Codigos`, `Csrf`, `Limite`, `Formato` (datas), `SenhaPbkdf2` |
| `app/Console/Commands/` | Os comandos `mkpause:*` |
| `config/mkpause.php` | Configurações do MKpause (lidas das variáveis de ambiente) |

Onde mudar uma regra:

- **Quem pode ver o quê:** tabela `ACESSO` em `app/Mkpause/Permissoes.php`.
- **Humor para nível:** `SessoesController::avaliarHumor` (critério provisório: humor 1 dá nível 3, humor 2 dá nível 2, 3 a 5 dão nível 1).
- **Quem recebe o alerta:** `AlertasController::destinatariosPara` (nível 2: professores; nível 3: professores e psicólogo escolar).

## Quando o banco mudar

O esquema pertence ao Flyway. O Laravel **não** tem migrations nem models que criam tabelas:
o backend só lê e grava (`database/migrations/` do Laravel fica vazia de propósito).

1. **Quem cuida do banco** cria a nova migração em `database/migrations/` da raiz (nunca edita as antigas) e atualiza `database/docs/`.
2. **Quem cuida do backend** roda `php artisan mkpause:verificar-esquema`, ajusta o código e a lista `COLUNAS` em `app/Console/Commands/VerificarEsquema.php`, e acrescenta a versão em `AplicarEsquema.php`.
3. Migração SQL e ajuste no backend vão no **mesmo** pull request.

## Autenticação

- A identidade é a tabela `usuario`; `senha_hash` usa o formato `pbkdf2_sha256$...`.
- O perfil é descoberto pela tabela de perfil ativa que aponta para o usuário.
- A sessão fica num cookie (`sessionid`) e dura 8 horas. Desativar a conta corta o acesso na hora.
- **CSRF:** antes de POST, PATCH ou DELETE, a interface chama `GET /api/auth/csrf/` e envia o cookie `csrftoken` no cabeçalho `X-CSRFToken`.
- Erros sempre vêm como `{"detail": "..."}` ou `{"campo": ["..."]}`, sem detalhes internos do banco.

### Códigos de cadastro e vínculo (V3)

Contrato em [`docs/codigos-de-acesso.md`](../docs/codigos-de-acesso.md). Os códigos são gerados com `random_int`, guardados só como HMAC-SHA256 e mostrados uma única vez. Verificação/cadastro: 10 tentativas por minuto por IP; resgate: 10 por minuto por usuário.

### E-mail de alertas escolares

A fila envia somente alertas aos profissionais escolares vinculados. Vínculos clínicos são gerenciados diretamente pelo administrador. Guia em [`docs/convites-e-emails.md`](../docs/convites-e-emails.md). As antigas tabelas de convites permanecem para preservar dados legados, sem rotas ativas.

## Rotas

Todas em `/api/`, com JSON. "Vinculados" quer dizer que o acesso exige vínculo ativo com o estudante.

### Conta
| Método | Rota | Quem |
|---|---|---|
| GET | `auth/csrf/` | qualquer um |
| POST | `auth/login/` `{"email", "senha"}` | qualquer um |
| POST | `auth/logout/` | logado |
| GET | `auth/eu/` | logado |
| POST | `auth/codigo-cadastro/verificar/`, `auth/cadastro/` | qualquer um (com código) |

### Estudante
| Método | Rota |
|---|---|
| GET | `atividades/` (`?tipo=JOGO`), só as disponíveis |
| POST | `sessoes/avaliar/` `{"humor": 1-5}`: nível sugerido, sem gravar |
| POST | `sessoes/` `{"id_atividade", "humor_pre"}` |
| POST | `sessoes/<id>/concluir/` `{"humor_pos", "observacoes_sessao"?}` ou `sessoes/<id>/cancelar/` |
| POST | `alertas/` `{"nivel": 2\|3, "id_sessao"?, "descricao"?}` |
| GET / PATCH | `alertas/`, `alertas/<id>/` (o estudante só pode `{"status": "CANCELADO"}`) |
| GET | `avisos/` |
| POST / GET / DELETE | `vinculos/codigos/`, `vinculos/codigos/atual/` |
| GET / POST | `vinculos/solicitacoes/`, `vinculos/solicitacoes/<id>/aceitar/` ou `/recusar/` |

### Profissionais
| Método | Rota | Quem |
|---|---|---|
| GET | `estudantes/`, `estudantes/<id>/` | professor, psi. escolar, psi. clínico |
| GET | `sessoes/?estudante=ID` (inclui os humores) | psi. escolar, psi. clínico, vinculados |
| GET | `alertas/` (`?status=ABERTO`) | professor e psi. escolar: recebidos; clínico sem acesso |
| POST | `alertas/<id>/lido/` | destinatário |
| PATCH | `alertas/<id>/` `{"status"}` | destinatário |
| GET / POST | `alertas/<id>/observacoes/` `{"conteudo"}` | professor e psi. escolar |
| GET | `estudantes/<id>/observacoes/` | profissionais vinculados, inclusive clínico (somente leitura) |
| GET | `estudantes/<id>/ficha/` | psi. escolar, psi. clínico |
| PATCH | `estudantes/<id>/ficha/` | psi. clínico |
| POST | `estudantes/<id>/registros/` `{"texto", "chave"}` | psi. clínico vinculado, ficha ativa; inclusão sem sobrescrever registros anteriores |
| GET | `estudantes/<id>/dashboard/?dias=7\|14\|30\|90` | psi. clínico vinculado |
| POST / GET | `vinculos/resgatar/`, `vinculos/enviados/` | professor e psi. escolar |

### Administrador
| Método | Rota |
|---|---|
| GET / POST / PATCH / DELETE | `admin/estudantes/`, `admin/professores/`, `admin/psicologos-escolares/`, `admin/psicologos-clinicos/` (`?ativo=true`) |
| GET / POST / DELETE | `admin/vinculos/professores/`, `admin/vinculos/psicologos-escolares/`, `admin/vinculos/psicologos-clinicos/` |
| POST / PATCH / DELETE | `atividades/`, `avisos/` |
| POST / PATCH | `estudantes/<id>/ficha/` |
| GET / POST | `admin/codigos-cadastro/`, `admin/codigos-cadastro/<id>/revogar/` |
| GET / POST | `admin/emails/` (ver a fila / processar agora) |

**DELETE não apaga:** marca `ativo = false` e mantém o histórico (RN30).
Num vínculo, o DELETE recebe o par no corpo, por exemplo `{"professor": 1, "estudante": 2}`.

## Decisões tomadas onde a documentação não fecha

| Assunto | Decisão | Onde mudar |
|---|---|---|
| Administração e histórico emocional | O administrador **não** consulta sessões, humores individuais nem registros clínicos, inclusive pela API; indicadores institucionais permanecem agregados | `app/Mkpause/Permissoes.php`, `routes/api.php` |
| Professor e histórico emocional | O professor **não** vê sessões, humores nem ficha; vê alertas e observações | `app/Mkpause/Permissoes.php` |
| Psicólogo clínico e observações | Só lê (o gatilho `trg_validar_autor_observacao` bloqueia a escrita); o registro clínico vai na ficha | migração, se mudar |
| Alerta sem profissional vinculado | Não é criado; a resposta explica e indica 192 e 188 | `AlertasController::emitir` |
| Vínculo removido e alertas antigos | Professor e psicólogo escolar precisam continuar vinculados para consultar ou atuar em alertas dos quais foram destinatários | `AlertasController::consulta` |
| `status_notificacao` | Reflete envio e falha do e-mail; a leitura no site prevalece | `app/Mkpause/Emails.php` |

## Pendências conhecidas

- **Testes automatizados em PHP:** ainda falta transformar o roteiro de pedidos HTTP em testes PHPUnit dentro do repositório.
- **Entrega externa de e-mail:** falta configurar um provedor SMTP; o padrão é a caixa local.
- **Perfil exclusivo:** o banco não impede um usuário em duas tabelas de perfil; o login escolhe pela ordem em `app/Mkpause/Conta.php`.
- Antes de publicar: `APP_DEBUG=false`, uma `MKPAUSE_SECRET_KEY` de verdade e HTTPS.


Antes de atualizar uma instalação existente, siga [Segurança e separação por escola](../docs/seguranca.md). Contas sem escola definida não acessam dados institucionais.
