# E-mail de alertas escolares

A fila envia avisos de alertas aos professores e psicólogos escolares destinatários, conforme os vínculos e as regras de nível do sistema. O psicólogo clínico não recebe nem consulta alertas.

O administrador consulta a fila em **E-mails** e pode processá-la por `POST /api/admin/emails/`. A consulta usa `GET /api/admin/emails/`.

O envio externo exige configuração SMTP. Sem provedor, use a caixa local de desenvolvimento; mensagens locais não chegam à internet. Consulte as opções de configuração no [backend](../backend/README.md).

O processador revalida destinatários e alertas antes de enviar. Erros de entrega não desfazem os registros escolares.

## Compatibilidade com dados antigos

O fluxo de convite ao responsável foi retirado do produto e da API. As tabelas antigas permanecem para preservar dados existentes. Mensagens de convite pendentes não são enviadas; o processador as cancela. Vínculos com psicólogos clínicos são gerenciados diretamente pelo administrador.

O nome deste arquivo foi preservado para manter links existentes.
