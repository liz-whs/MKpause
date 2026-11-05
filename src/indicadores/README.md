# Indicadores agregados em PHP

Módulo PHP 8.2+ com PDO PostgreSQL. A administração acessa **Indicadores da escola** no menu do site. O PHP calcula os agregados diretamente no mesmo banco; o Django continua responsável por contas, sessão e permissões individuais. Não há outra senha ou login para o painel.

## Rodar localmente

Em terminais separados:

```powershell
# Na pasta backend, usando o Python do ambiente virtual:
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000

# Na pasta src/web:
npm run indicadores
npm run dev
```

O PHP fica em `127.0.0.1:8081`; o Vite repassa `/indicadores` para ele e `/api` para o Django. Entre como administrador no site e abra `/admin/indicadores`. O script Node usa a extensão `pdo_pgsql` instalada ao lado do PHP no Windows sem editar o `php.ini` global. Em Linux, instale/ative o módulo `php-pgsql` na distribuição.

Por padrão, o PHP lê `backend/.env` e depois `.env.local` na raiz sem sobrescrever valores anteriores, como o Django. Variáveis do processo prevalecem. `INDICADORES_DATABASE_URL` permite indicar uma conta PostgreSQL separada com apenas SELECT; na ausência dela, usa `DATABASE_URL` ou `DB_*`. `DJANGO_API` é o endereço interno do Django, por padrão `http://127.0.0.1:8000`; `INDICADORES_TIMEZONE` usa `America/Sao_Paulo`.

## API e proteção

- `GET /indicadores/api/resumo?dias=7|30|90`: exige cookie de sessão válido e perfil administrador, confirmado via HTTP pelo Django a cada pedido. Outros métodos retornam 405.
- `GET /indicadores/api/saude`: verifica PHP e conexão ao banco, sem dados pessoais.
- São considerados apenas dias completos até ontem. Sessões canceladas e datas fora do intervalo não entram.
- O período inteiro exige cinco estudantes distintos. Cada distribuição por dia, horário, turma, atividade, nível de alerta e resultado de humor também verifica participantes distintos.
- Se qualquer grupo tiver menos de cinco participantes, a distribuição inteira é ocultada para impedir dedução pela diferença em relação ao total. Não se somam estudantes de atividades diferentes para formar um suposto grupo maior.
- Nomes, e-mails, identificadores e relatos individuais não são devolvidos. Ausência de amostra é distinta de contagem zero; números protegidos não são mostrados como zero.
- A conexão é de leitura, as consultas usam parâmetros e cada resumo utiliza um snapshot consistente. Ainda é recomendado usar uma credencial do banco limitada a SELECT.

Essa supressão reduz o risco de identificação, mas não é uma garantia formal de anonimato ou proteção contra toda combinação com informações externas. A administração agrega o banco da instalação; este módulo não cria isolamento entre instituições, pois o modelo atual de administrador não possui uma escola associada. Não use a mesma instalação como painel de instituições independentes sem definir esse isolamento.

## Testes

```powershell
cd src/web
npm run test:indicadores
npm test
```

Os testes de integração estão em `backend/nucleo/test_indicadores_php.py`. Eles usam PostgreSQL temporário, PHP real e o servidor HTTP do Django, verificando sessão, papéis, limite de amostra, participantes repetidos, datas, cancelamento, humor e recusa de escrita. São pulados no SQLite ou quando PHP/pdo_pgsql não está disponível.

Não foi criada migração de banco: o módulo só lê tabelas existentes. Para hospedagem com Python e PHP, veja [o guia Docker](../../docs/indicadores-php.md).
