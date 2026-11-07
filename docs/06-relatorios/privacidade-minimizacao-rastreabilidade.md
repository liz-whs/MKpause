# RNF07, RNF08 e RNF33 — implementação e verificação

Alterações locais em 06/11/2026, com autorização para bloquear o acesso administrativo às sessões e humores.

## Proteção e minimização de acesso

- O administrador não pode consultar a lista ou o detalhe de sessões, os humores individuais ou o dashboard individual do estudante. O bloqueio existe nas rotas, nos controllers e na regra central de permissões. Registros clínicos continuam omitidos das fichas administrativas.
- Psicólogos escolares e clínicos vinculados continuam consultando o histórico autorizado. Professores não recebem sessões e humores pelo cache da interface.
- A consulta dos alertas escolares exige simultaneamente que o profissional tenha sido destinatário e mantenha vínculo ativo com o estudante. Isso também protege detalhe, observações, mudança de status e marcação como lido. A revogação de vínculo não apaga os registros nem os destinatários históricos.
- O estado da pausa usa `mkpause:estudante:v2:<id>`. A troca de estudante remonta o contexto, evitando reutilizar humor, apelido e aviso de saída da conta anterior. Logout e expiração limpam os estados de pausa; a sincronização mantém somente o estado da conta atual.
- O estado legado sem identificação não é migrado para uma conta. Isso inclui antigas marcações de cuidado sem dono comprovado. Os cuidados já armazenados por estudante permanecem preservados.

A administração mantém a gestão cadastral e os indicadores institucionais agregados e protegidos contra identificação individual. Isso não libera acesso aos registros individuais de sessão e humor.

## Rastreabilidade

Mantida a identificação do estudante e as datas dos registros. Humores se relacionam pela sessão; observações escolares, pelo alerta; registros clínicos, pela ficha. Novos registros clínicos possuem identificador, autor e data definidos pelo servidor. O escopo do RNF33 não inclui uma auditoria completa de todas as alterações de campos.

## Testes e resultado

- Administrador bloqueado na API e nos controllers, incluindo chamadas diretas por ID e filtros por estudante.
- Professor e psicólogo escolar acessam alertas enquanto vinculados; após revogação, não podem ler, alterar status, marcar como lido ou registrar observações. A reativação recupera o acesso autorizado.
- Sessão criada e concluída mantém estudante, datas e registros de humor PRE/POS; psicólogos vinculados consultam e profissionais sem vínculo são recusados. Os dados permanecem no banco após a revogação.
- Troca de estudante na mesma aba não reaproveita humor, apelido ou aviso de saída. Logout e expiração limpam a pausa; preferências não relacionadas permanecem preservadas.
- Resultado: 168 testes da interface e 19 testes PHP, com 130 verificações, aprovados. TypeScript e build de produção aprovados.

Os testes PHP usam SQLite em memória. Nenhum dado de produção foi alterado e nenhuma migração destrutiva foi executada. Alterações ainda locais, sem commit ou deploy.
