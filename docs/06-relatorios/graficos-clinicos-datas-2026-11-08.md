# Datas e gráficos clínicos — 08/11/2026

As datas numéricas da interface usam DD/MM/AAAA, inclusive com outro idioma selecionado. A formatação compartilhada preserva datas sem horário como datas de calendário, evitando deslocamento pelo fuso. Hoje e Ontem continuam disponíveis nos resumos relativos. Foram ajustados períodos, registros por sessão, indicadores por dia, início do acompanhamento, edição da ficha e validade do código de vínculo. O formato de armazenamento e os contratos da API permanecem iguais.

O painel clínico apresenta primeiro os gráficos. A distribuição das emoções usa barras pareadas com escala comum, contagem explícita, mascote de cada emoção e diferença calculada como depois menos antes. Os controles Comparar, Antes e Depois mudam apenas a visualização. A diferença não representa intensidade emocional nem melhora clínica. Os tipos de atividade também possuem barras proporcionais.

Evolução por sessão e Sessões e registros de humor podem ser recolhidos pelos respectivos títulos, com quantidade de registros indicada. As listas abertas têm altura limitada e rolagem interna. Recolher não remove registros nem altera o período consultado.

## Validação

- 230 testes da interface passaram, incluindo datas, alternância da comparação, recolhimento e verificação de acessibilidade.
- Build concluído.
- Chrome em tamanhos de computador e celular: controles, recolhimento, datas brasileiras e ausência de transbordamento lateral conferidos.
- A conferência visual usou resposta simulada de dashboard interceptada somente no navegador, sem gravar sessões no banco.

Alterações locais em http://localhost:5173, sem commit ou publicação em produção.


## Gráfico de linhas interativo

O painel também apresenta linhas com pontos conectados para as contagens diárias, com seleção entre as seis emoções. As séries Antes e Depois usam a mesma escala numérica e traços distintos (contínuo e tracejado). Passar o mouse, tocar, focar um ponto ou mover o controle de dia mostra a data completa e os dois totais. Dias sem registros da emoção têm contagem zero; isso não atribui humor a um dia sem respostas. A agregação conta separadamente todas as sessões do mesmo dia.

SVG mantém a nitidez; em telas estreitas, o gráfico admite rolagem horizontal sem alargar a página. O componente respeita teclado e inclui rótulos para leitores de tela. Os gráficos de barras complementares permanecem disponíveis.

Foram aprovados os 20 testes dos gráficos e do dashboard, incluindo agregação diária, virada de mês, período com um dia, filtros, teclado e acessibilidade. Build concluído. Chrome em computador e celular confirmou seleção de emoção e dia, duas linhas e ausência de transbordamento da página, com dados simulados apenas na resposta interceptada no navegador.


## Espaço vazio após o histórico

Os rótulos invisíveis “Antes” e “Depois”, destinados a leitores de tela, estavam posicionados fora do contexto de cada registro. Mesmo dentro da lista com rolagem, aumentavam a área rolável da página. O componente compartilhado `EmocaoAntesDepois` agora posiciona esses rótulos em relação ao próprio registro, preservando a leitura acessível e a rolagem interna. No Chrome a página de teste passou de 4.774 px para os 3.975 px reais do layout. Os 53 testes das áreas profissionais e do dashboard passaram.


## Gráfico compacto e filtro proporcional

O botão “Atualizar gráficos” usa altura mínima de 48 px e texto de corpo, acompanhando o seletor de período. O card de linhas tem largura máxima de 1.024 px, espaçamentos menores e desenho vetorial limitado a 736 px de largura, preservando proporções e nitidez sem crescer indefinidamente em monitores grandes. No Chrome, o card completo mediu 643 px de altura em 1366×768, 1440×900 e 1920×1080; em 390×844, mediu 765 px. Botão e seletor mediram 48 px nas quatro janelas. Não houve overflow horizontal da página. Os 20 testes do gráfico e dashboard passaram.


## Hierarquia visual dos gráficos

Removido o controle deslizante “Dia do gráfico”. A seleção do dia continua pelos próprios pontos, com mouse, toque ou teclado, e os valores aparecem abaixo do desenho. Em telas amplas, a evolução diária ocupa aproximadamente dois terços da linha, e as sessões por atividade ficam em um card menor ao lado. A distribuição de emoções vem abaixo, com comparações em duas ou três colunas conforme o espaço disponível, em vez de seis blocos verticais. Em telas estreitas, a composição passa para uma coluna.

Chrome verificou 1366×768, 1440×900, 1920×1080 e 390×844, sem overflow horizontal da página. Os 20 testes de gráfico/dashboard e o build passaram; o teste de interação agora confirma a ausência do slider e a seleção pelos pontos.
