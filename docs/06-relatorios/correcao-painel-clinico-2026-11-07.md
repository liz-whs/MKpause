# Correção do painel clínico — 07/11/2026

## Diagnóstico

Consulta autenticada à API de produção confirmou que o histórico contém sessões concluídas com emoções explícitas na marca de compatibilidade `[mkpause antes=... depois=...]`, enquanto os respectivos campos `registro_humor.emocao` estão nulos. A interface do histórico já reconhece essa marca; o endpoint de gráficos aceitava apenas o campo novo e, por isso, retornava zero. Não se tratava de falha de renderização do gráfico.

O hook `useDashboardClinico` também consultava a API em três situações: foco da janela, retorno à aba e intervalo de 30 segundos. Cada consulta invalidava os dados exibidos, substituindo o painel pela mensagem de carregamento. Foco e mudança de visibilidade podiam provocar consultas consecutivas e cancelar a anterior. A latência de hospedagem pode tornar a espera mais perceptível, mas não explica esses gatilhos no código.

## Alterações locais

- O cálculo dos gráficos reconhece as emoções explícitas da marca legada quando os campos novos são nulos. Os campos categóricos atuais têm prioridade.
- Nenhuma emoção é inferida a partir da antiga escala numérica. Sessões incompletas, canceladas ou fora do período continuam excluídas. A leitura não altera o banco.
- Removido o intervalo de 30 segundos. O botão de atualização e a mudança do período continuam disponíveis.
- Ao voltar para a aba, a revalidação acontece se a consulta anterior tiver começado há pelo menos 30 segundos e não houver outra em andamento. Os eventos de foco e visibilidade são deduplicados.
- Uma atualização do mesmo estudante e período preserva os gráficos e o histórico enquanto aguarda resposta. A primeira consulta e a mudança de período mantêm o carregamento inicial.
- Uma resposta de erro remove os dados; as recusas de acesso continuam ocultando informações privadas. Respostas atrasadas de consultas canceladas são ignoradas.

## Verificação

- API de produção consultada com conta clínica autorizada, sem alterações nos registros de estudantes.
- Testes de regressão cobrem dados legados e novos, prioridade dos campos atuais, exclusão de registros inadequados e acesso sem vínculo.
- Testes de interface cobrem atualização lenta sem ocultar o painel, alternância de abas sem duplicação, ausência de consultas periódicas e remoção dos dados após recusa de acesso.
- Alterações ainda locais; os ajustes precisam ser publicados para surtir efeito no Render.
