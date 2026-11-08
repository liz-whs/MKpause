# Onboarding e abertura — 08/11/2026

## Alterações realizadas

A primeira visita na aba apresenta Make a Pause em destaque. As letras se contraem para MK Pause enquanto a composição se desloca à esquerda, e a chinchila original aparece ao lado. A sequência dura aproximadamente 6 segundos, sem áudio, e abre as boas-vindas existentes. Há opção de pular e acesso direto ao login durante a abertura. A sequência não se repete ao navegar de volta na mesma página carregada, mas reaparece ao recarregar a página inicial. O marcador do sessionStorage usa a origem temporal do documento; o antigo marcador fixo não impede a nova abertura. Há também o botão Rever abertura nas boas-vindas.

A preferência Menos movimento, tanto do sistema operacional quanto do MKpause, dispensa a abertura automática. Rever abertura permite ver Make a Pause e a chinchila de forma estática, com avanço manual pelo botão Continuar. Não há necessidade de aguardar a animação para continuar. A apresentação não altera login, cadastro, permissões ou destinos das etapas.

O cabeçalho compartilhado das boas-vindas, apresentação, login, primeiro acesso e cadastro mostra símbolo e nome da marca à esquerda e somente o símbolo de acessibilidade à direita, preservando seu nome para leitores de tela. Durante a abertura, a marca grande ocupa o palco; a marca do cabeçalho aparece nas telas seguintes. Os botões duplicados de preferências nas barras das etapas foram retirados.

## Análise do fluxo atual

### Pontos fortes

- Três etapas curtas, com progresso textual e visual.
- Navegação de volta e opção de pular a apresentação.
- Identidade consistente com a mascote e linguagem simples.
- Preferências disponíveis antes da autenticação, sem exigir conta.
- Entrada direta para quem já tem conta.

### Melhorias recomendadas de conteúdo e orientação

As seis recomendações abaixo foram implementadas nesta revisão, conforme detalhado em seguida.

1. Explicar o uso atual: Início conduz avaliação inicial, atividade e avaliação final; Atividades permite exploração livre; Cuidados registra ações do cotidiano. O onboarding atual explica os níveis, mas não essa diferença, que foi alterada no sistema.
2. Precisar o destinatário dos avisos: profissionais vinculados e autorizados a recebê-los. Expressões como a escola é avisada são genéricas e não descrevem as regras atuais. Também é útil esclarecer que o nível 3 não permite cancelar o aviso e não representa garantia de resposta imediata.
3. Rever a explicação de privacidade por papel. Quem acompanha você não significa que todos os perfis recebem alertas ou consultam os mesmos registros. O clínico, o profissional escolar e o administrador têm escopos distintos; o administrador consulta indicadores agregados, não sessões e humores individuais.
4. Diferenciar a orientação de estudantes e profissionais. As três etapas atuais descrevem principalmente a jornada do estudante. Professores e psicólogos poderiam receber uma explicação breve dos próprios menus depois de entrar.
5. Explicar o cadastro com código antes de levar uma pessoa sem conta à tela de entrada. A interface deve informar quem fornece o código e como continuar quando ele já existe, sem acrescentar uma escolha de perfil que permita obter permissões por conta própria.
6. Reduzir expectativas de resultado emocional: frases como voltar mais leve e o desenho ansioso → calmo podem sugerir um efeito garantido. Uma alternativa editorial é enfatizar uma pausa no próprio ritmo e a possibilidade de continuar precisando de apoio.

Prioridade sugerida: informações sobre o fluxo real e destinatários/permissões, depois orientação específica por perfil e refinamento editorial.

## Verificação

- 238 testes da interface passaram, incluindo abertura, pular, não repetição, preferências de movimento e tradução da tela seguinte.
- Build concluído.
- Chrome em 1440, 390 e 320 pixels: contração, mascote, cabeçalho, navegação e retorno sem repetir a abertura conferidos, sem erros JavaScript.
- Conferência adicional de 320 pixels com texto a 150%, sem cortes da marca ou transbordamento horizontal.
- Preferência do sistema por menos movimento abre as boas-vindas sem animação nem espera.

Alterações locais, sem commit nem publicação em produção.


## Implementação das sugestões

- As boas-vindas passaram a usar Uma pausa no seu ritmo, sem prometer um resultado emocional. A etapa 1 explica Início (humor antes e depois), Atividades (exploração livre) e Cuidados (ações cotidianas, incluindo mais ideias), substituindo a imagem de transformação ansioso → calmo.
- A etapa 2 informa que os avisos e alertas chegam aos profissionais vinculados autorizados. Explica que o alerta do nível 3 não pode ser cancelado e que seu envio não garante resposta imediata.
- A etapa 3 diferencia profissionais escolares, clínico e administração, inclusive o limite de acesso a sessões e humores individuais. Não apresenta os colegas como destinatários dos registros. A mesma lista de privacidade usada no perfil do estudante foi atualizada.
- Há acesso ao cadastro com código nas boas-vindas e na última etapa, com explicação sobre quem fornece o código e sobre as permissões definidas por ele. A validação do cadastro continua no backend; nenhuma escolha de permissões foi acrescentada.
- Professor e psicólogo escolar, clínico e administração recebem orientação correspondente aos próprios menus em Conheça seu painel. O guia pode ser recolhido e reaberto; o fechamento é lembrado por conta e área durante a visita, sem bloquear navegação ou autenticação.
- Inglês e espanhol acompanham os novos textos. Preferências continuam acessíveis por um único símbolo no cabeçalho.

Verificação desta revisão: 243 testes da interface passaram; Chrome em computador e celulares confirmou reapresentação ao recarregar, revisão manual, navegação das três etapas, acesso ao cadastro e apresentação estática com menos movimento. A revisão não grava sessões clínicas nem modifica permissões.


## Correção da composição e da desaceleração

A abertura compartilhava duas classes conflitantes de largura máxima com a coluna do onboarding; a restrição podia permanecer ativa e cortar a mascote posicionada fora da composição. A abertura agora recebe somente largura livre, e a mascote participa do fluxo flexível com espaço próprio. As partes retiradas do nome recebem largura medida pela fonte efetivamente usada, evitando a contração por tamanho intrínseco da grade.

Contração, deslocamento e reserva do espaço da mascote usam duração sincronizada de 1,35 s, após 0,8 s de apresentação, e curva cubic-bezier(.1,.9,.2,1). A entrada da mascote acompanha a aproximação do repouso. A leitura no Chrome verificou cerca de 71,3% do deslocamento nos primeiros 15% do movimento e apenas 0,3% nos últimos 20%, confirmando saída rápida e desaceleração progressiva.

Verificados sete instantes da animação em cinco combinações de janela e tamanho de texto (incluindo 320 px e texto a 150%), sem corte ou sobreposição da mascote. Vinte testes de abertura/preferências e build passaram.


## Referência slide left

Referência indicada pelo usuário: https://vt.tiktok.com/ZSpSQb9KH/ (studioznak, vídeo 7641630784293539104). O trecho Slide Left foi observado no player público e conferido em quadros próximos de 4,08 a 4,88 segundos: entrada horizontal da direita, opacidade/desfoque breves e desaceleração no assentamento.

A abertura aplica esse movimento à entrada das expressões e à substituição de Make a por MK. Make a permanece um texto contínuo, mantendo o desenho e o espaçamento das palavras; Pause se desloca com a contração do espaço. A largura inicial e a final são medidas na fonte renderizada. A máscara da troca é limitada ao prefixo, e a mascote continua com espaço próprio no layout. Menos movimento mantém a alternativa estática.

Foram conferidos oito instantes por combinação em cinco formatos de janela/tamanho de texto, incluindo 320 px e texto a 150%, sem corte da composição nem sobreposição da mascote. Vinte testes de abertura/preferências passaram; build concluído. O vídeo de referência não foi incorporado ao produto.


## Slide left limitado à contração

A pedido do usuário, Make a Pause aparece inicialmente completo, sem entrada deslizante. Somente a troca de Make a por MK recebe slide left, com a desaceleração já ajustada. Pause não tem animação própria de entrada, desfoque ou opacidade; apenas acompanha a reorganização natural do espaço. A composição inteira não recebe mais translateX. A chinchila aparece por opacidade depois da contração, sem deslocamento nem desfoque.

Verificados os estilos e quadros em cinco combinações de janela/texto, incluindo 320 px a 150%, sem cortes ou sobreposição. Vinte testes de abertura/preferências e build aprovados.


## Grafia da abertura

O texto visível e o título acessível da abertura usam minúsculas: make a pause → mk pause. A medição das larguras considera a nova grafia.


## Contração sequencial sem blur

A troca por palavras foi substituída pela remoção dos caracteres de make a, um por vez: último a, espaço, e e a entre m e k. A sequência visível é make a → make → mak → mk. As letras m e k permanecem no desenho; os caracteres removidos deslizam um pouco à esquerda enquanto seu espaço se contrai. Há 190 ms entre os inícios das remoções, com 280 ms de contração de espaço por caractere. Não há propriedade de desfoque na animação.

O avanço de cada caractere é medido com Range no texto contínuo, preservando o espaçamento da fonte. Pause acompanha o espaço disponível sem entrada própria. A mascote aparece depois da contração, sem deslizar. A alternativa estática e o controle de revisão permanecem.

Chrome conferiu a ordem dos caracteres e ausência de blur em cinco combinações de janela/texto, incluindo 320 px a 150%. Oito instantes por combinação foram verificados contra cortes e sobreposições. Vinte testes de abertura/preferências e build passaram.


## Ritmo contínuo e permanência final

O intervalo entre as letras caiu de 190 ms para 45 ms. Cada espaço se contrai em 200 ms e cada letra sai em 90 ms, com sobreposição entre as etapas; a contração completa leva aproximadamente 335 ms, sem espera entre palavras intermediárias. A reserva de espaço acompanha o mesmo intervalo total, e a mascote aparece após a contração.

A abertura agora termina em 5,6 s. Depois de a mascote ficar totalmente visível, a composição mk pause permanece cerca de 3,85 s em tela. Pular e a alternativa de menos movimento continuam disponíveis. O teste de duração confirma que a abertura ainda está visível em 4,1 s e termina em 5,6 s. Vinte testes e a conferência visual em cinco formatos passaram.


## Contração com elasticidade suave

A saída seca foi refinada com uma pequena mola no espaço das letras removidas. O espaço se contrai rapidamente, ultrapassa o destino em 0,045 em e retorna com amplitudes de 0,016 em e 0,005 em antes de estabilizar. A letra já está invisível no retorno, sem reintroduzir caracteres. A fonte não recebe deformação nem blur. Há 30 ms entre as letras e 650 ms de acomodação por espaço; a sequência inteira se estabiliza em aproximadamente 740 ms, com etapas sobrepostas.

A mascote aparece após o assentamento. A abertura dura 6 s e preserva aproximadamente 3,9 s de leitura da composição final. Vinte testes de abertura/preferências e build passaram. Chrome verificou o ultrapasse, o retorno amortecido e a estabilização final, além de ausência de blur/cortes/sobreposição em cinco combinações de janela e texto.


## Espaço entre mk e pause sem rebote

As letras depois de k (e, espaço e a) agora fecham seu espaço de forma monotônica, sem margens de ultrapasse. Somente o a interno entre m e k conserva um impulso inicial com retorno único, sem as oscilações secundárias. O intervalo visual entre o k e o p não volta a abrir depois de se fechar.

Chrome verificou a distância entre k e pause a cada 10 ms: fechamento sem rebote e estabilidade após a contração em cinco combinações de janela/texto. O impulso interno e seu retorno único também foram verificados. Build concluído; duração e permanência final preservadas.


## Ações das boas-vindas

Removidos da tela de boas-vindas os atalhos Tenho um código de cadastro e Rever abertura, a pedido do usuário. Permanecem Começar e Já tenho conta · Entrar. O acesso ao cadastro continua disponível na entrada e na etapa que explica o código. A abertura pode ser vista recarregando a página inicial, respeitando menos movimento.


## Simplificação da última etapa

Removidos o bloco Ainda não tem conta? com orientação/atalho de código e a linha de emergência da terceira etapa, conforme a imagem indicada pelo usuário. A explicação de privacidade por perfil permanece; o cadastro continua acessível na tela de entrada.


## Etapas com altura uniforme

Boas-vindas e apresentação usam a altura da janela. Nas três etapas, navegação superior e rodapé ocupam as mesmas posições; o conteúdo se distribui no espaço intermediário. No computador, título e descrição ficam ao lado dos cards, com largura maior. A ilustração da terceira etapa passou a um símbolo compacto. No celular, espaçamentos, ícones e textos dos cards foram ajustados, preservando números dos níveis e as informações essenciais.

A explicação resumida de privacidade é usada somente no onboarding; o perfil do estudante mantém a versão detalhada. Aviso de nível 3 continua informando impossibilidade de cancelamento e ausência de garantia de resposta imediata. Inglês e espanhol acompanham os textos compactos. Login e formulários de cadastro não recebem essa limitação de altura.

Chrome conferiu boas-vindas e três etapas em nove combinações de janela/texto. Não houve rolagem da página nem rodapé fora da janela. Em 1440×900, 1366×768, 1280×720, 390×844 e 320×740, com texto padrão, todas cabem sem rolagem interna. Também couberam em 1920×1080 com texto a 150%. Em 320×568 e nos celulares com texto a 150%, o conteúdo central admite rolagem interna para não ser cortado; os controles de avanço permanecem visíveis. As três etapas mantiveram a mesma altura de rodapé.

Os 243 testes da interface passaram. Uma execução concorrente com build excedeu o tempo de um teste de cadastro; a execução isolada completa passou, sem mudança nesse cadastro. Build concluído. Alterações locais.


## Ícones nas três etapas

As três páginas usam círculos com cores distintas da paleta: atividades com lavanda na primeira, pausa com rosa na segunda e escudo com azul na terceira. No celular, a versão compacta fica junto do indicador da etapa; no computador, acima dele. Mantidas a altura comum das telas e a posição do rodapé.


## Linguagem acolhedora no pedido de apoio

O aviso da segunda etapa passou a dizer: Seu pedido de apoio fica registrado. A resposta pode levar um pouco. Se precisar de ajuda agora, chame um adulto em quem confia. A mensagem explica a permanência do registro e a possibilidade de espera sem usar linguagem punitiva ou prometer atendimento imediato. As regras de envio e de impossibilidade de cancelamento do nível 3 não foram alteradas. Traduções em inglês e espanhol atualizadas.


## Boas-vindas com mascote maior e ações próximas

A tela inicial passou a centralizar o conjunto mascote, título, descrição e botões, com espaçamento contínuo. Foi retirado o preenchimento elástico da primeira linha da grade, que afastava a imagem do texto e empurrava as ações para o rodapé. A mascote pode chegar a 380 px, conforme a janela; em telas menores, encolhe preservando a proporção circular e a leitura das ações.

Chrome verificou sete combinações, de 320×568 a 1920×1080, incluindo texto a 150%. Não houve cortes, distorção da proporção ou rolagem da página. Em 1660×900, a mascote passou a 360 px e os botões terminam aproximadamente em y=783, com espaço abaixo, em vez de ficarem encostados na base. Os rodapés das três etapas seguintes não foram alterados.


## Altura comum dos ícones

O conteúdo das etapas passou a usar uma âncora vertical comum, sem centralizar separadamente cada bloco pelo próprio tamanho. Os três ícones ficam na mesma coordenada vertical ao trocar de etapa. Chrome confirmou alinhamento com diferença inferior a um pixel em nove combinações de janela e tamanho de texto, preservando os rodapés e as condições de rolagem já descritas. Build concluído.


## Configuração somente no primeiro acesso da conta

A tela “Que bom ter você aqui!” não é mais o destino de todo login de estudante. A conclusão fica registrada no banco por conta, inclusive quando a pessoa escolhe “Pular por agora”. Nos acessos seguintes, e ao tentar abrir diretamente `/primeiro-acesso`, o estudante segue para o início. O rótulo “Primeiro acesso” foi retirado do canto superior.

A migração V11 acrescenta `estudante.primeiro_acesso_concluido`: contas existentes ficam concluídas, e novos cadastros começam pendentes. O endpoint de conclusão exige autenticação, CSRF e perfil estudante; atualiza somente a própria conta e pode ser chamado novamente sem efeitos adicionais. A conclusão não depende de armazenamento do navegador. Apelido e preferências continuam com seu mecanismo anterior.

V11 aplicada somente ao PostgreSQL local, após verificar endereço e porta da conexão. Nenhuma alteração em produção. Verificação: 248 testes da interface, 54 testes do backend (395 asserções) e build passaram. Chrome confirmou o redirecionamento da conta existente e, com respostas de nova conta simuladas, a configuração sem rótulo, a conclusão por “Pular por agora” e a ausência de repetição após recarregar. Os testes do backend verificam a persistência real e o isolamento entre contas; a simulação no navegador não gravou dados na conta real.
