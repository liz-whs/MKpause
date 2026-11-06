# V4 — Convites ao responsável e fila de e-mail

Migração: [`V4__convites_responsaveis_e_fila_email.sql`](../migrations/V4__convites_responsaveis_e_fila_email.sql).

Depende de V1 e V2, sem modificar SQL de versões anteriores. A V3 permanece independente do fluxo do responsável.

`convite_responsavel` registra estudante, contato responsável, clínico opcional, administrador emissor, endereço de destino, nonce, texto e versão da autorização, validade e resposta. Os estados são PENDENTE, ACEITO, RECUSADO e REVOGADO; a expiração de pendentes é calculada na leitura. O nonce identifica a versão do convite; o token enviado é gerado por assinatura com a chave do servidor e não é persistido.

`notificacao_email` registra uma origem por item: convite ou destinatário de alerta, com exclusividade e unicidade. Guarda destino, tentativas, próxima disponibilidade, início de processamento, envio e código de erro sem corpo de mensagem ou token. Estados: PENDENTE, PROCESSANDO, ENVIADA, FALHA e CANCELADA. O índice de estado/disponibilidade auxilia a retirada da fila; os processadores usam bloqueio com `SKIP LOCKED` no PostgreSQL.

O aceite cria ou reativa as relações existentes em `estudante_responsavel` e, se autorizado, `psicologo_clinico_estudante`. A migração não cria consentimentos retroativos nem desativa vínculos ativos anteriores. A revogação é aplicada pelo backend, com manutenção do histórico.

Aplicação local por `php artisan mkpause:aplicar-esquema`, seguida de `php artisan mkpause:verificar-esquema`. O comando pula V4 já presente e rejeita instalação parcial. Em ambientes geridos pelo Flyway, mantenha o gerenciamento por versões da equipe.

Configuração de SMTP, caixa local, limites do aceite e procedimentos de teste: [guia de convites e e-mails](../../docs/convites-e-emails.md).
