# Revisão de segurança — 7 de novembro de 2026

## Escopo e método

Base revisada: commit `306204042cc0eec47368f140f16e592799532c28`.

Revisão de rotas, autenticação, CSRF, permissões por perfil e vínculo, senhas, cookies, códigos, registros clínicos, configurações de implantação, armazenamento no navegador e possíveis segredos versionados. Simulações de isolamento usaram SQLite em memória; verificações HTTP funcionais usaram o localhost. Em produção foram feitas requisições de leitura e login/logout com a conta de demonstração já fornecida pelo usuário. Nenhum cadastro, senha ou sessão de autorregulação de produção foi alterado.

A revisão não prova ausência de outras vulnerabilidades. Não incluiu pentest completo, teste de carga, análise de imagens Docker/SO, revisão dos acessos ao Neon/Render/GitHub, permissões efetivas de banco ou varredura integral dos conteúdos de todos os commits históricos.

## Achados prioritários

### S01 — Alta: administrador de demonstração com senha conhecida em produção

**Confirmado por HTTP em produção.** O login de `admin.demo@mkpause.dev` com a senha de teste anteriormente informada retornou 200; a mesma sessão acessou `/api/admin/estudantes/` com 200. Nenhuma senha, cookie ou dado individual foi incluído neste relatório.

Uma pessoa que conheça essa credencial pode entrar como administrador e alcançar os cadastros e operações administrativas permitidos a esse perfil. O administrador continua bloqueado nas rotas de sessões/humores, mas isso não protege os demais dados e poderes administrativos.

`deploy/start.sh` executa `mkpause:criar-demo` em cada inicialização. `backend/app/Console/Commands/CriarDemo.php` cria contas de todos os perfis, incluindo administrador; não troca senhas nem desativa contas existentes quando `DEMO_SENHA` muda. Alterar apenas essa variável não corrige uma conta já criada.

**Correção proposta:** separar ambiente público de demonstração e ambiente com dados reais; desativar/rotacionar contas de teste existentes e revogar suas sessões; retirar a criação automática de contas de demonstração do ambiente real. A sincronização do catálogo de atividades deve continuar por uma operação própria.

### S02 — Alta: logout não revoga uma cópia anterior da sessão

**Reproduzido por HTTP no localhost.** Login → cópia dos cookies em um segundo contexto → logout no primeiro → `/api/auth/eu/` no primeiro retornou 401, mas a cópia anterior retornou 200.

`backend/config/session.php` usa `cookie` por padrão e o Dockerfile define `SESSION_DRIVER=cookie`. Nesse modo, apagar/renovar os cookies do navegador não invalida outra cópia já emitida. A criptografia impede adulteração, mas não impede reutilização de um cookie autêntico.

**Impacto:** uma sessão copiada anteriormente pode continuar sendo utilizada depois de a pessoa clicar em Sair. O teste confirma reutilização, não demonstra um meio de roubar o cookie.

**Correção proposta:** sessões controladas no servidor, com armazenamento adequado à hospedagem e exclusão da sessão ao sair. Preferir banco/Redis quando for necessário sobreviver a reinícios ou atender múltiplas instâncias. Testar explicitamente que o cookie anterior passa a retornar 401.

### S03 — Alta: troca de senha não invalida sessões abertas

**Reproduzido em aplicação de teste com SQLite em memória.** Após alterar `usuario.senha_hash`, a sessão previamente autenticada continuou retornando 200 em `/api/auth/eu/`.

`Autenticar` confere o identificador e se a conta/perfil estão ativos; não confere versão de sessão, data da mudança ou fingerprint da senha. `Cadastros::atualizar` troca o hash sem revogar sessões.

**Correção proposta:** revogar todas as sessões na troca de senha e/ou verificar uma versão de autenticação por usuário em cada requisição. A solução deve valer também para o módulo de indicadores, que consulta a autenticação da API.

### S04 — Média: cabeçalho de IP pode contornar o limitador

**Reproduzido em teste isolado do backend.** Com limite global de login igual a 1, duas tentativas com o mesmo IP declarado retornaram 401 e 429; mudar somente `X-Forwarded-For` permitiu nova tentativa (401).

`backend/bootstrap/app.php` confia em todos os proxies (`trustProxies(at: '*')`); `Limite` usa `$request->ip()` como chave. A exploração pela internet depende de como o proxy de entrada trata esses cabeçalhos; isso não foi validado no Render. Não foi realizado ataque de força bruta em produção.

**Correção proposta:** aceitar cabeçalhos de encaminhamento apenas de proxies confiáveis e configurar a borda para substituir valores fornecidos pelo cliente. Usar também limites por conta que não dependam só do IP e verificar o comportamento no caminho real do Render.

## Outros riscos e condições de implantação

### S05 — Alta se houver configuração ausente: chave pública de fallback

**Confirmado por leitura do código; não confirmado como ativo em produção.** `backend/config/mkpause.php` usa uma chave conhecida quando não há segredo configurado. `backend/config/app.php` deriva a chave da aplicação desse mesmo valor quando `APP_KEY` está ausente. Há compatibilidade com `DJANGO_SECRET_KEY`.

Se os segredos necessários estiverem ausentes, a aplicação pode funcionar com chave previsível, comprometendo a proteção de cookies e de códigos. Uma chave explícita e segura em produção reduz esse risco; não foi exposta nem extraída nenhuma chave real nesta revisão.

**Correção proposta:** impedir inicialização em produção com segredo ausente, vazio ou igual ao fallback; gerar e preservar chaves fortes. Rotacionar uma chave exige planejar o impacto nos cookies e códigos existentes.

### S06 — Média, dependendo do uso: administrador global, sem isolamento por escola

**Reproduzido em SQLite.** Um administrador recebeu estudantes identificados como Escola A e Escola B. `Permissoes::estudantesVinculados` não aplica restrição institucional para administradores; o modelo não tem uma associação de escola/tenant que imponha essa separação. Os indicadores também agregam a instalação inteira.

Isso é uma limitação para uma instalação compartilhada por instituições independentes, não uma quebra da regra atual se o serviço atender uma única instituição com administrador global.

**Correção proposta se houver múltiplas escolas:** modelo explícito de escola, associação dos usuários e filtros obrigatórios em cadastros, vínculos, códigos, alertas e indicadores. Não confiar apenas no nome textual da instituição.

### S07 — Média: cuidados pessoais permanecem no navegador após sair

**Identificado no código.** `src/web/src/state/cuidados.ts` guarda datas e identificadores de cuidados em `localStorage`, associados ao ID do estudante. `api.sair` limpa as pausas de `sessionStorage`, mas não esses cuidados persistentes.

Isso não revelou senhas nem registros clínicos, mas deixa histórico de autocuidado em um aparelho compartilhado, acessível por ferramentas do navegador ou por scripts da mesma origem. O uso de chaves por estudante evita misturar a exibição comum, mas não oferece sigilo entre pessoas que usam o mesmo navegador.

**Correção proposta:** definir política de uso em aparelho compartilhado, limpar dados pessoais no logout ou persistir o histórico necessário no servidor com controle de acesso. Preferências de idioma e acessibilidade podem ter tratamento separado.

### S08 — Média: mensagens de exceção SQL podem registrar dados pessoais

**Identificado no código; não foi feita leitura de dados reais dos logs.** `backend/bootstrap/app.php` registra `$e->getMessage()` de `QueryException`; essa mensagem pode incluir SQL e valores vinculados, como conteúdo de registros e dados cadastrais. A resposta HTTP é genérica, o que é positivo, mas o log continua sendo um destino sensível.

**Correção proposta:** registrar identificador da ocorrência, SQLSTATE e contexto mínimo sem valores de campos; revisar retenção e acesso aos logs. Não há evidência aqui de senha em texto puro nos logs.

### S09 — Baixa/Média: ausência de cabeçalhos de proteção na página pública

**Confirmado por HTTP na página inicial de produção.** Não foram encontrados `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security` ou `Referrer-Policy` nessa resposta.

A ausência de proteção contra enquadramento deixa risco de clickjacking; a ausência de CSP reduz a defesa adicional contra scripts indevidos. Isso não demonstra, por si só, uma vulnerabilidade XSS. Uma CSP precisa considerar jogos embarcados, WebAssembly, vídeos e o VLibras opcional para não quebrar funcionalidades.

**Correção proposta:** política de enquadramento e cabeçalhos na borda; CSP inicialmente monitorada e depois aplicada com origens e permissões necessárias. HSTS deve ser adotado conforme a configuração HTTPS do domínio.

## Verificações que passaram

- Requisições anônimas para identidade, cadastro administrativo, ficha, sessões, alertas e indicadores retornaram 401.
- Estudante, professor e ambos os perfis de psicólogo receberam 403 ao tentar consultar a área administrativa e os indicadores agregados.
- Administrador recebeu 403 ao tentar consultar sessão, lista de sessões/humores ou dashboard clínico individual.
- Psicólogos vinculados puderam consultar o estudante autorizado e receberam 403 para sessão/ficha de outro estudante; o clínico sem vínculo recebeu lista vazia e não acessou ficha/dashboard individual.
- Listas de estudantes de professores e psicólogos ficaram limitadas aos vínculos ativos testados.
- Outro estudante não conseguiu concluir ou cancelar sessão alheia (404); o registro permaneceu inalterado.
- Enviar IDs de outro estudante, status e data falsificados ao iniciar uma sessão não mudou a autoria: o servidor manteve o estudante autenticado, o status e a data controlados pelo servidor.
- Testes existentes cobrem revogação de vínculo escolar, bloqueio de alertas antigos e suas operações, sigilo dos registros clínicos para administração/escola e autoria/data dos acompanhamentos.
- Mutações administrativas sem token CSRF ou com origem estranha retornaram 403; login sem CSRF e com senha errada é recusado nos testes.
- Respostas de login dos cinco perfis não incluíram `senha` ou `senha_hash`. O código usa PBKDF2-SHA256 com sal aleatório e comparação constante.
- Cookie de sessão em produção veio com `HttpOnly`, `Secure` e `SameSite=Lax`. O localhost HTTP usou `Secure=false`, esperado para esse ambiente.
- A busca por arquivos de credenciais no histórico acessível não encontrou os caminhos sensíveis examinados. Uma busca por padrões de chaves privadas, tokens GitHub e URLs de banco no conteúdo atual versionado só apontou URLs ilustrativas em exemplo/comentário; não identificou um segredo real nesses padrões. Isso não substitui uma varredura completa de todo o histórico e de todas as formas de segredo.
- As rotas `/.env` e `/.git/config` em produção retornaram a página da aplicação (HTTP 200), sem os marcadores de configuração examinados; 200 nesse fallback não significa exposição do arquivo.
- `npm audit` completo e de produção: zero vulnerabilidades reportadas. `composer audit`: zero avisos de segurança e zero dependências abandonadas reportadas no momento da revisão. Esses resultados não cobrem falhas no nosso código nem no sistema operacional/imagem Docker.

## Evidências e resultado da execução

- Suite existente do backend: **25 testes, 207 asserções, todos passaram**.
- Simulações adicionais: **7 testes, 48 asserções**. Parte das asserções reproduz deliberadamente falhas existentes; passar nessa suite diagnóstica não significa que os riscos foram corrigidos.
- Evidências locais, sem cookies/senhas em texto no resultado: `C:/Users/giova/mkpause-dev/logs/auditoria-seguranca-http.json`, `auditoria-seguranca-tests.log`, `security-backend-regressao.log`, `security-npm-audit.json`, `security-npm-all-audit.json`, `security-composer-audit.json` e `security-secret-scan.json`.
- Reprodutores locais fora do repositório: `C:/Users/giova/mkpause-dev/auditoria-seguranca-http.py` e `AuditoriaSegurancaTest.php`.

Esta etapa é uma auditoria: não foram alterados código funcional, credenciais, configuração de produção ou permissões para corrigir os achados. Não foi feito commit ou push deste relatório. Ordem recomendada de correção: S01, S02/S03, S04/S05 e os demais conforme o modelo de implantação.


## Correções implementadas após a auditoria

As correções foram aplicadas ao código e ao localhost, sem publicação nem alteração do banco de produção nesta etapa. As evidências anteriores permanecem acima como registro do comportamento auditado.

- **S01:** demo desligada por padrão; bloqueio na autenticação também cobre contas já existentes e sessões abertas. Deploy separa catálogo de criação de usuários demo.
- **S02/S03:** sessões no banco, payload criptografado, logout com invalidação no servidor e assinatura dependente de senha/perfil/escola. Repetição real do teste HTTP: cookie antigo agora retorna 401.
- **S04/S05:** proxies explícitos, limite de login por conta independente do IP e inicialização bloqueada com segredo fraco/ausente ou driver de sessão inseguro. Debug de produção é recusado.
- **S06:** criada a associação institucional por ID e isolamento em cadastros, vínculos, fichas, alertas, avisos, atividades, códigos, fila administrativa de e-mail e indicadores. Nenhuma escola real foi atribuída automaticamente a contas antigas. O usuário confirmou que a instalação atende escolas independentes.
- **S07:** cuidados persistidos no servidor e limpeza dos dados pessoais do aparelho no logout; preferências preservadas.
- **S08:** queries e valores retirados dos logs explícitos e do relatório automático de QueryException.
- **S09:** cabeçalhos adicionados ao Nginx; CSP de scripts/conexões mais restrita em Report-Only, aguardando validação de compatibilidade no ambiente de hospedagem.

A separação exige associar as contas reais às escolas antes do rollout. O procedimento e as limitações estão em [Segurança e separação por escola](../seguranca.md). A imagem Docker e os cabeçalhos de produção ainda precisam ser verificados após publicação; os testes locais não substituem essa verificação.


### Validação das correções

A interface passou em **187 testes** e o build foi concluído, com o aviso já existente de tamanho do bundle. A suite de segurança acrescentou **20 testes e 92 asserções**, cobrindo inclusive cadastro com escola/perfil adulterados, revogação de código alheio, vínculo entre escolas, avisos e sanitização de logs. As 25 verificações anteriores do backend foram preservadas.

As 13 verificações PHP dos indicadores passaram. A integração em PostgreSQL temporário confirmou a separação institucional dos totais e do limiar de cinco participantes, além das oito simulações anteriores. A verificação visual/funcional no navegador confirmou filtros no computador e celular, persistência de um cuidado após novo login, limpeza do cache pessoal no logout e restauração do estado local usado no teste. Nenhum dado real de produção foi alterado.

As migrações V6 a V8 estão aplicadas no localhost. O ambiente local mantém demo explicitamente habilitada para desenvolvimento; isso não representa a configuração de produção, cujo padrão agora é bloquear demo. Os cabeçalhos Nginx e o rollout do banco remoto aguardam publicação/execução no ambiente real. Os cuidados anteriores que existiam somente no navegador não são importados automaticamente como histórico retroativo.

Resultado final do backend: **45 testes e 299 asserções passaram**. O build da interface e os **187 testes** passaram. O Dockerfile evita executar scripts do Composer que exigem segredos durante o build; a descoberta de pacotes ocorre no início do container, com a configuração real disponível. A imagem completa ainda precisa de validação em ambiente com Docker.
