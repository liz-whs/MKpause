# Convites ao responsável e notificações por e-mail

O fluxo está implementado localmente com a V4. Sem um provedor configurado, as mensagens ficam em uma caixa de testes; não são enviadas para endereços reais. Não foi contratado nem criado um serviço externo.

## Testar localmente

1. Inicie o backend e a interface (`npm run backend` e `npm run dev` em `src/web`). Em `backend/`, execute `php artisan mkpause:aplicar-esquema` para aplicar versões ausentes até V4.
2. Entre como administrador e abra **Vínculos**. Escolha o estudante, informe nome e e-mail do responsável e, quando necessário, o psicólogo clínico. Clique em **Enviar convite**.
3. Em **E-mails**, clique em **Processar fila de e-mails**. As mensagens são gravadas em `backend/.emails/`, pasta ignorada pelo Git. Também é possível executar `php artisan mkpause:processar-emails`.
4. No cartão do convite, **Abrir convite de teste** abre a página pública. Esse atalho só aparece com `DJANGO_DEBUG=1` e a caixa local de arquivos. A indicação de caixa local continua visível mesmo sem debug.
5. Abrir o convite não cria vínculo. O responsável precisa ler o texto, confirmar que é responsável e aceitar a autorização. A recusa não exige marcar as confirmações.
6. Ao aceitar, o sistema registra data, versão e texto da autorização e cria ou reativa os vínculos autorizados. Atualize a tela de Vínculos ou volte à aba para ver o resultado.
7. **Revogar convite ou autorização** invalida o link e retira o acesso clínico concedido por essa autorização, salvo se houver outro aceite ativo para o mesmo profissional e estudante.

## Regras do convite

- O responsável não cria conta e não recebe senha.
- O link é assinado com a chave do servidor e vale sete dias para resposta. O token não é salvo no banco nem aparece na URL enviada ao servidor: a página o lê do fragmento e o envia no corpo do pedido.
- O banco guarda o contato, o profissional autorizado, a versão e o texto apresentado, o estado e a data da resposta.
- O mecanismo registra uma declaração de responsabilidade mediante posse do link enviado ao e-mail indicado pela administração; não faz verificação documental da identidade ou do parentesco.
- Reenviar revoga os convites pendentes do mesmo estudante e profissional. Links expirados, adulterados, já respondidos, revogados ou de contatos inativos não podem criar vínculos.
- Desativar o responsável revoga suas autorizações e retira os acessos correspondentes.
- Novos vínculos clínicos e de responsável também exigem aceite nas rotas administrativas. Vínculos que já estavam ativos antes da V4 foram preservados, sem fabricar registros de consentimento retroativos.
- Escolher um novo clínico na ficha registra apenas a indicação. A autorização acontece em Vínculos.
- O acesso do responsável limita-se à página do convite. Ela mostra primeiro nome do estudante e o texto da autorização, sem expor histórico, ficha ou humores.

## Entrega real de e-mails

Será necessário escolher um provedor SMTP e configurar as variáveis descritas em `backend/.env.example`. Senhas devem ficar no `.env` local ou no painel de variáveis do serviço de hospedagem, nunca no Git.

Configure `PUBLIC_BASE_URL` com o endereço HTTPS público, `EMAIL_BACKEND=smtp`, remetente autorizado pelo provedor, host, porta, usuário, senha e TLS/SSL conforme o serviço escolhido. TLS na porta 587 e SSL na 465 são configurações diferentes: não ative os dois simultaneamente.

`EMAIL_ENVIO_AUTOMATICO=1` processa a fila logo depois de a resposta ser enviada, sem esperar o SMTP na resposta do alerta. Para recuperar pendências após reinício e repetir falhas sem depender de novos eventos, execute `php artisan mkpause:processar-emails` periodicamente no ambiente de hospedagem. A fila também pode ser processada pela administração.

Falhas ficam registradas e podem ser tentadas novamente após cinco minutos, até cinco tentativas. Processamentos interrompidos há mais de cinco minutos voltam à fila. Dois processadores concorrentes não retiram o mesmo item simultaneamente no PostgreSQL. Uma interrupção entre a aceitação pelo SMTP e a atualização do banco ainda pode produzir duplicação no reenvio; SMTP não oferece confirmação transacional conjunta com o banco.

**Enviado** significa que o backend de e-mail aceitou a mensagem. No modo local, significa que ela foi salva na caixa de testes. No SMTP, não comprova entrega final, abertura ou leitura. A leitura do alerta dentro do site é registrada separadamente e não é sobrescrita pelo envio.

## Notificações de alertas

Novos alertas geram itens de fila para os destinatários já definidos pelas regras da escola: professor e, conforme o nível, psicólogo escolar. O e-mail é genérico e pede para entrar no site; não inclui nome, humor, relato ou dados clínicos do estudante. Não há envio retroativo de alertas antigos.

Antes de enviar, o processador confere se a conta, o vínculo e o alerta continuam válidos. Alertas cancelados/resolvidos ou convites revogados/expirados não são enviados. Erros de SMTP não desfazem o alerta. Esta entrega implementa e-mail; não inclui push do navegador.

## API

- Admin: `GET/POST /api/admin/estudantes/{id}/convites-responsavel/`, `POST /api/admin/convites-responsavel/{id}/revogar/`, `GET/POST /api/admin/emails/`.
- Público, limitado por IP: `POST /api/convites-responsavel/verificar/`, `/aceitar/` e `/recusar/`. Aceitar exige `confirmo_responsabilidade=true` e `aceito_termo=true`.
- A V4 cria `convite_responsavel` e `notificacao_email`; `verificar_esquema` confere 24 tabelas no ambiente local.
