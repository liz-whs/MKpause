# Dados de teste dos indicadores — 07/11/2026

Carga retroativa solicitada pelo usuário e executada no banco de produção em
07/11/2026. São dados **sintéticos**, identificados nas observações das sessões
por `[MKPAUSE-TESTE-INDICADORES-2026-11-07] DADOS SINTETICOS`.

## Registros adicionados

Cada conta recebeu três sessões concluídas, com humor antes e depois:

- `ana.demo@mkpause.dev`
- `emelize@marista.com`
- `giovanna@positivo.com`
- `maicris@maicris.com`
- `otavio@lerote.com`

Datas no fuso de Brasília: 04, 05 e 06/11/2026, às 10h. Uma atividade de
respiração, um jogo e um vídeo por estudante. Total: **15 sessões e 30 registros
de humor**. Contas, senhas, turmas, vínculos, alertas e sessões anteriores foram
preservados.

## Verificação

A carga passou em sete verificações no PostgreSQL local com tabelas temporárias:
quantidades, repetição sem duplicação, cinco estudantes, consulta real dos
indicadores, remoção preservando os registros anteriores, recusa de conta inativa
e reversão integral quando falta uma atividade necessária.

Após a execução, a consulta dos indicadores no banco de produção retornou, nos
períodos de 7, 30 e 90 dias, `suficiente: true`, **33 pausas e 5 estudantes**.
A distribuição de humor foi liberada: 52% melhor, 21% igual e 27% pior.
Esses valores misturam os registros anteriores com as sessões sintéticas.

As distribuições por dia, hora, atividade, turma e nível permaneceram protegidas:
existem grupos com menos de cinco estudantes. A carga não altera essa regra de
privacidade. O vínculo clínico continua necessário para consultar cada estudante
no painel do psicólogo clínico.

## Scripts

- Carga: `database/scripts/demonstracao-indicadores-2026-11-07.sql`.
- Remoção somente deste lote: `database/scripts/remover-demonstracao-indicadores-2026-11-07.sql`.

Os scripts usam transação e uma identificação fixa do lote. A carga pode ser
repetida sem duplicar as sessões. As credenciais de produção permanecem apenas
no arquivo local ignorado pelo Git, sem inclusão neste relatório.
