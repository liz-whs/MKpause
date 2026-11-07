# Retirada de requisitos — 06/11/2026

Os identificadores retirados não foram reutilizados nem houve renumeração dos demais requisitos. O catálogo passa a ter 32 requisitos funcionais e 33 não funcionais.

| Requisito retirado | Alteração |
|---|---|
| RF09 — Visualizar histórico | Estudantes não podem consultar a listagem nem os detalhes do histórico pela API. O registro das sessões e a consulta por profissionais autorizados continuam disponíveis. |
| RF15 — Receber alertas | Removidos a página, os indicadores e o acesso a alertas pelo psicólogo clínico. Os alertas escolares continuam funcionando. As observações do RF14 são consultadas por estudante, com verificação de vínculo e sem metadados do alerta. |
| RF34 — Vínculo com responsável | Removidos cadastro, gestão, convite e aceite pela interface e API. O administrador gerencia diretamente os vínculos clínicos. A fila de e-mail escolar continua ativa; convites legados pendentes não são enviados. |
| RNF15 — Navegação por teclado | Retirado do catálogo formal. O comportamento nativo de botões, links e campos foi preservado. |

A documentação em português e inglês foi ajustada, incluindo escopo, atores, casos de uso, regras e modelos. As tabelas e migrações antigas permanecem para preservar dados existentes. PDFs, JPEGs e relatórios históricos não definem o escopo atual.

## Verificação

- Testes da interface: 155 testes aprovados (154 na suíte e 1 teste adicional de integração da carga clínica), cobrindo remoção do menu clínico de alertas, redirecionamento da rota antiga, vínculo clínico direto, continuidade dos alertas escolares e leitura de observações sem consultar alertas.
- Testes PHP: 8 testes e 33 verificações aprovados, incluindo bloqueio do histórico do estudante; bloqueio de alertas clínicos; observações restritas a vínculo ativo; criação de vínculo clínico sem tabelas de responsável; antigas rotas de responsável/convite retornam 404; convite legado não produz e-mail.
- TypeScript e build de produção.

Nenhuma migração destrutiva ou exclusão de dados foi executada. A alteração permanece local até publicação.
