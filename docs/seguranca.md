# Segurança e separação por escola

## Configuração

O padrão de produção é `APP_ENV=production`, `APP_DEBUG=false`, `SESSION_DRIVER=database`, `SESSION_ENCRYPT=true` e `MKPAUSE_DEMO=false`. `MKPAUSE_SECRET_KEY` precisa conter pelo menos 32 caracteres aleatórios; a chave antiga `DJANGO_SECRET_KEY` continua aceita como fallback de compatibilidade. Não usar o valor público de desenvolvimento. Segredos ausentes/fracos, modo debug de produção e sessões não revogáveis impedem a inicialização.

Os cookies de sessão permanecem criptografados e HttpOnly. O conteúdo da sessão também é criptografado no banco por padrão. Depois da mudança de driver, todos precisam fazer login novamente. Sair destrói a sessão no servidor. Trocar senha, perfil ou escola invalida a assinatura de autenticação da sessão antiga.

`TRUSTED_PROXIES` fica vazio por padrão: cabeçalhos do cliente não definem seu IP. Se houver proxy, preencher apenas endereços/CIDRs efetivamente controlados e verificar o caminho real até o PHP. O curinga `*` é recusado. O limite menor de login é por conta, independentemente do IP. Em múltiplas instâncias, configurar um cache compartilhado compatível com locks, como Redis; o cache em arquivo padrão compartilha limites somente dentro da mesma instância.

Contas `*.demo@mkpause.dev` são bloqueadas por padrão, inclusive quando já existem no banco. `MKPAUSE_DEMO=true` é apenas para instalação isolada e sem dados reais. O deploy sincroniza o catálogo, mas não cria contas demo, a menos que essa opção tenha sido habilitada explicitamente. A mudança não apaga as contas antigas nem altera suas senhas: impede sua autenticação no modo real.

## Preparar uma instalação existente

1. Fazer backup e executar `php artisan mkpause:aplicar-esquema` para aplicar V6 (autenticação), V7 (escolas) e V8 (cuidados).
2. Criar ou associar uma conta administrativa real à instituição correta antes de abrir o serviço aos usuários. O comando abaixo pede a senha de forma oculta; não usar `--senha` em produção:

   ```sh
   php artisan mkpause:criar-admin --email="admin@sua-escola.br" --nome="Administração" --escola="Nome da escola"
   ```

3. Para contas existentes, associar explicitamente cada administrador, estudante e profissional à escola correta:

   ```sh
   php artisan mkpause:associar-escola "pessoa@sua-escola.br" "Nome da escola"
   ```

   Esse comando exige acesso administrativo ao servidor, não fica exposto na API e não permite transferir uma conta já associada para outra escola. O nome identifica a instituição cadastrada; revisar nomes para evitar duplicar uma escola com grafias diferentes. Não deduzir a autorização pelo domínio do e-mail ou pelo campo textual de instituição autodeclarado.

4. Contas antigas sem escola não recebem dados institucionais. A API informa que é necessário definir a escola. Códigos de cadastro legados sem escola são recusados: o administrador deverá emitir novos códigos. Não transformar códigos antigos em códigos globais.
5. Cada escola recebe seu próprio catálogo de atividades padrão, sem alterar os IDs das atividades antigas usadas no histórico. Conteúdos personalizados antigos continuam preservados, mas precisam de atribuição institucional revisada antes de serem disponibilizados. Não copiar conteúdos privados para todas as escolas.
6. Conferir as permissões com pelo menos duas instituições, incluindo as rotas de indicadores. O ID da escola sempre vem da conta autenticada, não de parâmetros enviados pelo navegador.

O modelo atual associa cada conta a uma escola. Profissionais que precisem trabalhar em várias instituições exigem uma decisão explícita sobre associação múltipla; isso não deve ser simulado concedendo acesso global.

## Dados pessoais no navegador

Os cuidados novos são gravados no servidor, restritos ao próprio estudante. O cache do aparelho é limpo ao sair, expirar a sessão ou mudar de conta; preferências de acessibilidade e idioma são preservadas. O histórico confirmado no servidor reaparece no próximo login. Dados de cuidados que existiam somente no armazenamento local antes desta migração não são importados automaticamente nem convertidos em registros retroativos do servidor.

O servidor controla a data de marcação e rejeita gravações pendentes que apontem para outra conta. Falhas de sincronização são mostradas na interface.

## Logs e cabeçalhos

Erros SQL recebem respostas genéricas e logs com SQLSTATE, sem registrar a query ou seus valores. Esses erros também foram retirados do relatório automático de exceções do framework para evitar um segundo log não sanitizado.

O Nginx entrega proteção contra enquadramento externo, `nosniff`, política de referrer e HSTS. A CSP aplicada restringe enquadramento, objetos e base URL. A política mais restrita de scripts/conexões está em `Report-Only` para identificar necessidades de jogos, WebAssembly e VLibras antes de bloqueá-las. Não afirmar que há uma CSP completa de scripts já aplicada. Ainda é necessário testar a imagem Docker e esses cabeçalhos no ambiente de hospedagem.

## Validação

Testes de backend cobrem revogação de sessão/senha/escola, demo bloqueada, tentativas com cabeçalhos falsos, acesso entre estudantes e escolas, códigos de cadastro, cuidados e sanitização de logs. A verificação HTTP local também reutiliza a cópia de cookie emitida antes do logout e exige 401. A integração dos indicadores foi exercitada com tabelas temporárias PostgreSQL, incluindo uma escola sem participantes e grupos abaixo do mínimo.
