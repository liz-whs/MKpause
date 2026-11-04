# Simulações de cadastro e vínculo por código

Validação local em 3 de novembro de 2026. Contas fictícias e bancos temporários; os dados de demonstração não foram alterados nesta rodada.

## Cenários verificados

| Cenário | Resultado esperado e confirmado |
|---|---|
| Cadastro com convite | Cria usuário e perfil, registra consumo e abre sessão automaticamente. |
| Turma/escola do convite | Prevalecem sobre os valores enviados pelo formulário. |
| Convite esgotado ou e-mail repetido | Bloqueia criação; uma tentativa inválida não consome um uso. |
| Código inválido, expirado ou revogado | Resposta genérica, sem revelar o motivo ou os dados do titular. |
| Listagem administrativa | Mostra sufixo e usos; não revela código completo ou hash. |
| Geração de outro código | Revoga o anterior. |
| Resgate pelo profissional | Mostra somente primeiro nome e turma, sem liberar acesso ao estudante. |
| Aceite pelo estudante | Cria ou reativa o vínculo e libera acesso aos dados autorizados e aos alertas. |
| Recusa | Não cria vínculo nem libera acesso. |
| Pedido expirado | Some das listas pendentes e não pode ser respondido. |
| Outro estudante tenta responder | Retorna 404 e não cria vínculo. |
| Resgate ou resposta repetidos | Recusa o uso repetido. |
| Profissional já vinculado | Retorna 409 e mantém o código aberto. |
| Perfil sem permissão ou conta inativa | Bloqueia a operação. |
| Requisição autenticada sem CSRF | Retorna 403. |
| Logout | Encerra a sessão; consulta posterior retorna 401. |
| Limite de tentativas | Retorna 429 ao ultrapassar o limite por IP ou usuário. |
| Duas gerações simultâneas | Deixa somente um código aberto. |
| Dois resgates simultâneos | Somente um profissional consome o código. |
| Disputa pelo último uso de convite | Cria somente uma conta e um registro de consumo. |

## Correção encontrada durante as simulações

A simulação em memória da interface permitia responder a um pedido expirado por chamada direta à camada de dados. A API já bloqueava essa situação. A simulação passou a conferir expiração e revogação antes de aceitar ou recusar. Um teste com relógio controlado reproduziu a falha antes da correção e passou depois dela.

O teste dos convites inválidos também foi ajustado para testar expiração, revogação e esgotamento em convites independentes, sem uma condição anterior esconder as seguintes.

## Verificação

- Interface: `npm test` — 108 testes passaram, incluindo telas, acessibilidade, contrato da API e simulações de expiração.
- Build: `npm run build` — passou; permanece o aviso de tamanho do pacote JavaScript.
- Backend: `python manage.py test contas sessoes alertas atividades acompanhamento nucleo` — 40 testes passaram; 3 de concorrência são pulados no SQLite.
- PostgreSQL: 20 testes de códigos, concorrência e HTTP real passaram, sem testes pulados, no banco temporário `test_mkpause_tokens`. O banco temporário foi removido pelo executor após a execução.
- As quatro simulações em `backend/contas/test_simulacoes_http.py` usam um servidor HTTP real e cookies separados por pessoa, sem simular as respostas da API.

## Limites desta validação

O serviço de automação do navegador estava indisponível. As telas foram verificadas pelos testes automatizados de interface; não houve inspeção visual manual nesta rodada.

O banco temporário dos testes é criado a partir dos models pelo executor do Django. Na rodada acima, a divergência entre o model `Responsavel` e a V2 ainda estava pendente. Ela foi resolvida posteriormente: cadastro, edição, listagem e desativação agora usam o contato sem login, e `verificar_esquema` passou com 22 tabelas no banco local.

Na atualização da V2, 46 testes passaram em SQLite (6 específicos de PostgreSQL foram pulados) e 9 testes de responsáveis e migração passaram no PostgreSQL temporário, incluindo execução do SQL real da V2, repetição do comando e proteção contra dados legados ou esquema parcial. O convite ao responsável permanece pendente. Não houve push, deploy ou alteração no Neon.
