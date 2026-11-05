# Integração da API V5 — 5 de novembro de 2026

O endpoint recebido na `main` está conectado à página **Psicólogo clínico → Acompanhados → estudante → Histórico e humor**. Não foi necessária nova migração de banco.

## Comportamento

- Resumo numérico da V5, com quantidade de sessões, aumento, manutenção, diminuição e percentual de aumento. A comparação não é apresentada como efeito terapêutico.
- Filtro de 7/14/30/90 dias, inicialmente 14; cada troca consulta o servidor.
- Evolução com um ponto por sessão, incluindo várias sessões no mesmo dia; tabela com valores individuais, distribuição antes/depois e sessões por tipo de atividade.
- Ausência de dados mostra mensagem e percentual “—”; zero real permanece “0%”.
- Histórico, observações e acesso à ficha preservados. O filtro de período vale para os gráficos, sem reduzir o histórico já disponível na interface.
- Carregamento e erro explícitos, sem preenchimento com mocks. A página de histórico oculta dados privados enquanto a consulta não confirmar acesso ou quando houver erro.
- Cancelamento e descarte de respostas atrasadas. Atualização manual, ao recuperar foco/visibilidade e a cada 30 segundos com a página visível; a revogação é detectada na próxima consulta, não por notificação instantânea.
- Traduções PT/EN/ES e gráfico com formatos distintos para antes/depois, além da tabela acessível.

## Validação executada

| Verificação | Resultado |
|---|---|
| Interface completa (`npm test`) | 132 testes passaram, incluindo 13 novos testes V5 |
| Build de produção (`npm run build`) | Passou; permanece o aviso de bundle acima de 500 kB |
| Backend completo em PostgreSQL temporário | 79 testes passaram, sem testes pulados |
| Simulação HTTP V5 | Login com cookies, quatro períodos, contagens, sessões individuais, 401/403, filtro inválido e revogação após acesso válido |
| Interface V5 | Carregamento, quatro períodos, resposta atrasada, 403 após sucesso, falha de rede e nova tentativa, ausência de vínculo, percentual nulo/zero e múltiplas sessões no mesmo dia |
| Acessibilidade automatizada | Axe sem violações na página com dados e tabela aberta; contraste não é avaliado no jsdom |

As simulações HTTP usam servidor real de teste Django e banco temporário PostgreSQL, sem inserir registros no banco principal. Os testes React usam respostas controladas para exercitar os estados da interface. A inspeção visual manual no navegador não foi realizada nesta etapa.

Não houve push nem deploy nesta etapa. A integração usa o serviço Django existente; os indicadores agregados administrativos em PHP continuam sendo outra funcionalidade.

Na checagem do localhost, a interface respondeu 200, mas o Django em `127.0.0.1:8000` ainda estava com o código antigo carregado (`runserver --noreload`) e respondeu 404 para a rota V5. A tentativa de reiniciar esse processo foi bloqueada pela política automática. É necessário reiniciar o backend manualmente antes de experimentar o painel no localhost; a nova rota foi validada no servidor temporário dos testes HTTP.

## Verificação após reinício

Em 05/11/2026, após solicitação explícita do usuário, o Django foi reiniciado com o código atualizado em `127.0.0.1:8000`. A rota V5 passou a responder **401 sem autenticação**, conforme o contrato, e a interface em `http://localhost:5173/` respondeu **200**. A pendência de reinício local está resolvida. O usuário também autorizou o envio dos commits para a `main`; essa autorização não equivale à confirmação de um deploy no Render.
