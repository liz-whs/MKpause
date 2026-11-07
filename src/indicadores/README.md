# Indicadores agregados em PHP

Módulo PHP 8.2+ com PDO PostgreSQL. A administração acessa **Indicadores da escola** no menu do site. O PHP calcula os agregados diretamente no mesmo banco; a API Laravel continua responsável por contas, sessão e permissões individuais. Não há outra senha ou login para o painel.

## Rodar localmente

Em terminais separados:

```powershell
# Na pasta src/web, cada um num terminal:
npm run backend
npm run indicadores
npm run dev
```

O PHP fica em `127.0.0.1:8081`; o Vite repassa `/indicadores` para ele e `/api` para o backend Laravel. Entre como administrador no site e abra `/admin/indicadores`. O script Node usa a extensão `pdo_pgsql` instalada ao lado do PHP no Windows sem editar o `php.ini` global. Em Linux, instale/ative o módulo `php-pgsql` na distribuição.

Por padrão, o PHP lê `backend/.env` e depois `.env.local` na raiz sem sobrescrever valores anteriores. Variáveis do processo prevalecem. `INDICADORES_DATABASE_URL` permite indicar uma conta PostgreSQL separada com apenas SELECT; na ausência dela, usa `DATABASE_URL` ou `DB_*`. `MKPAUSE_API_URL` é o endereço interno da API, por padrão `http://127.0.0.1:8000`; `INDICADORES_TIMEZONE` usa `America/Sao_Paulo`.

## API e proteção

- `GET /indicadores/api/resumo?dias=7|30|90`: exige cookie de sessão válido e perfil administrador, confirmado via HTTP pela API a cada pedido. Outros métodos retornam 405.
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

Os testes de integração precisam ser refeitos para o backend Laravel. Os testes do próprio módulo (`npm run test:indicadores`) continuam.

Não foi criada migração de banco: o módulo só lê tabelas existentes. Para hospedagem, veja [o guia](../../docs/hospedagem.md).
