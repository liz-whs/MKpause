# Chinchila: restauração e renderização em alta resolução

## Alteração

A folha enviada tem apenas 1600 × 533 pixels para doze personagens. A versão anterior ampliava os recortes e interpolava imagens por fluxo óptico: o arquivo era 4K, mas a personagem conservava a baixa definição da origem.

A personagem foi restaurada com a ferramenta integrada **image_gen**, usando o recorte original e a folha de poses como referência. A restauração mantém o estilo e as características da chinchila; há reconstrução e limpeza dos traços, portanto não se trata de identidade pixel a pixel com a fotografia comprimida.

## Correção de fidelidade — 07/11/2026

A primeira tentativa de animação converteu a restauração em curvas, trocou seus tons por cores chapadas e desenhou patinhas extras. Isso causou as diferenças de cor e as sobreposições relatadas pelo usuário. Essa abordagem foi retirada do gerador.

Agora o vídeo usa diretamente os pixels de `chinchila-restaurada.png`, com os tons, gradientes, braços, mãos e pés da imagem aprovada. Uma única deformação de pequena amplitude acompanha a respiração, concentrada no tronco. Rosto, orelhas e pés permanecem fixos. Não há recortes de membros sobrepostos nem interpolação entre desenhos distintos. O tratamento do alfa elimina resíduos transparentes externos e evita bordas escuras sem substituir o RGB da personagem.

As orientações continuam em 2880 × 3840 para celular e 3840 × 2160 para computador, a 60 fps. A fonte original possui 1217 × 1292 pixels: o vídeo não acrescenta detalhes ausentes nessa imagem. A prioridade desta correção é conservar a ilustração aprovada e a coerência dos movimentos.

O player usa a versão `v=3`, com novas capas. A conversão para vídeo passa a identificar explicitamente o perfil de cores, evitando que o navegador interprete os tons com uma matriz incorreta. Os testes verificam explicitamente a preservação das cores da PNG e a ausência de deformação no rosto, orelhas e pés, além da continuidade do loop.

A PNG usada pelo gerador mantém o mesmo SHA-256 da imagem gerada aprovada. Na comparação de seis amostras do primeiro quadro do MP4 de computador decodificado pelo Chrome com a composição de referência, na versão v=4, a diferença máxima observada foi de 2 níveis por canal em uma escala de 0 a 255. Isso é uma verificação por amostras, não uma garantia de igualdade de todos os pixels de um vídeo com compressão.

## Expansão da barriga e do contorno — 07/11/2026

A amplitude da respiração foi aumentada na versão `v=4`. A mesma deformação atua na barriga clara e nas laterais do tronco: a região clara cresce progressivamente durante a inspiração, junto com a silhueta, e diminui durante a expiração. Rosto e orelhas permanecem fora dessa faixa de movimento, e o apoio dos pés continua estável.

Na imagem antes de comprimir o vídeo, a região clara passou de 87.599 para 121.185 pixels no pico, aproximadamente 38% de aumento em área. A largura medida passou de 409 para 494 pixels, e a altura de 269 para 311 pixels. A imagem original, suas cores e seus traços continuam sendo a única base da animação.

Um teste de regressão verifica que a barriga clara e a silhueta crescem juntas, diminuem na expiração e retornam às áreas iniciais ao completar o ciclo. Nos MP4s finais, a medição da região clara confirmou aumento de 38,2% na versão de computador e 38,0% na de celular. O último quadro voltou à área inicial com diferença inferior a 0,2%, dentro da variação da compressão. Os sete testes da animação e os onze testes do player passaram, assim como o build. As duas versões reproduziram em loop no Chrome.

## Correção da forma circular — 07/11/2026

A versão `v=5` substitui o estiramento por faixas da v=4 por uma transformação radial. A borda da região clara é medida na PNG aprovada e, no pico da inspiração, todos os ângulos têm um raio de destino igual. Uma borda externa fixa ancora o rosto e o apoio dos pés; a pele entre essa borda e a barriga acompanha o movimento. As cores continuam vindo da mesma PNG, sem repintar partes da personagem.

A forma intermediária evolui gradualmente da elipse original para um círculo, sem a ponta lateral da v=4. Os testes agora medem a proporção entre os eixos, a centralização e o desvio do contorno em relação a um círculo no pico. Também verificam que a malha não se dobra durante a transformação, para impedir sobreposições. A conferência dos MP4s finais mediu proporção entre eixos de 0,9940 no computador e 0,9944 no celular: diferença inferior a 1% entre altura e largura. O desvio radial relativo ficou em 0,55% e 0,47%, respectivamente. A área cresce na inspiração e retorna no fim do ciclo. As duas versões reproduziram em loop no Chrome; os nove testes da animação, onze do player e o build final passaram. A comparação de seis amostras de cores no Chrome ficou com diferença máxima de 1 nível por canal nesta versão.

## Forma original e patinhas na frente — 07/11/2026

Após a orientação do usuário, a versão `v=6` retira a normalização circular da v=5. A barriga conserva a forma oval e os recortes originais. Uma expansão proporcional é aplicada à mesma imagem do tronco e das mãos, mantendo a relação de sobreposição da PNG aprovada: as mãos ficam à frente da área clara.

As patas apoiadas têm regiões protegidas na transformação, preservando a imagem dessas regiões durante toda a respiração. A imagem não recebe membros novos, máscaras de barriga pintadas sobre as mãos ou uma circunferência imposta. A expansão é moderada: a região clara cresce cerca de 23% em área no pico da inspiração e retorna ao início no fim do ciclo.

Os testes da tentativa circular foram substituídos por verificações da proporção e do contorno originais. Novas verificações acompanham pontos das mãos em primeiro plano e da região clara logo abaixo, além de comparar todos os pixels opacos das regiões protegidas das patas. A proporção da região clara fica próxima da original e a sobreposição não é invertida. Na conferência dos MP4s finais, a proporção dos eixos passou de 0,6718 para 0,6828 no computador e de 0,6743 para 0,6859 no celular. Os contornos normalizados conservaram aproximadamente 97% de sobreposição com a forma inicial. Os pontos das mãos e os pontos claros abaixo delas passaram na verificação em primeiro plano, e as duas versões repetiram o ciclo no Chrome. Os dez testes da animação, os onze do player e o build final passaram.

## Contorno anterior com barriga atual — 07/11/2026

A versão `v=7` mantém a transformação aprovada da barriga da v=6. Uma correção independente do contorno lateral externo segue o perfil arredondado da v=5, preservado em `silhueta-referencia.json`. Esse arquivo contém somente a geometria da silhueta, extraída da imagem do vídeo anterior; a região clara circular daquela versão não é reutilizada.

A região clara, as mãos e as patas recebem uma área de proteção que acompanha os mapas da v=6. A correção externa começa fora dessa área. Os testes comparam os pixels protegidos com a renderização da v=6 em quatro fases: eles devem permanecer idênticos antes da compressão. Outro teste compara o contorno externo com a referência arredondada anterior, enquanto os testes de malha e de sobreposição das mãos continuam ativos. A comparação dos MP4s com a v=6 confirmou sobreposição mínima de 99,77% da região clara no computador e 99,81% no celular; a pequena diferença é compatível com a nova compressão. O erro do contorno em relação à referência anterior ficou abaixo de 0,4 pixel na faixa lateral medida. As mãos permaneceram à frente, os dois vídeos repetiram o ciclo no Chrome e os doze testes da animação, onze do player e o build final passaram.

## Curvas aprovadas dos dois lados — 07/11/2026

Após a aprovação das prévias, a versão `v=10` aplica as curvas contínuas dos dois lados. A lateral direita aprovada foi preservada durante a correção da esquerda. A transição da cauda foi afastada do traço esquerdo, e as patas acompanham o corpo sem regiões congeladas que quebrem as linhas. A barriga clara conserva seu movimento e sua forma; sua área cresce cerca de 25% no pico da inspiração.

Antes de alterar o gerador, cinco poses da prévia aprovada foram preservadas fora do repositório. O gerador integrado reproduziu essas cinco imagens pixel a pixel. `geometria-aprovada-v10.json` registra pontos dos ombros, mãos e patas para a regressão. O gerador não depende das pastas de prévias nem do antigo perfil `silhueta-referencia.json`. A dependência `scipy`, usada para suavizar o contorno inicial, está em `src/atividades/videos/requirements.txt`.

Os dois vídeos e as capas foram regenerados: computador em 3840 × 2160 e celular em 2880 × 3840, ambos com 600 quadros a 60 fps. A versão da URL foi alterada para impedir o reaproveitamento do vídeo antigo pelo cache. Os 12 testes da animação, 11 testes do player/atividades e o build passaram. FFmpeg decodificou os dois arquivos completos sem erros.

No localhost, a atividade foi aberta como estudante pelo fluxo Atividades → Vídeos → Respiração com a chinchila → humor inicial. O Chrome carregou os arquivos `?v=10` nas duas orientações; loop, play, pausa e troca de formato funcionaram. O teste não registrou sessões no banco. Essa conferência inclui uma janela de celular no computador, sem equivaler a um teste em aparelho físico. A alteração continua local, sem commit ou publicação.

## Arquivos atuais

- Imagem aprovada, preservada: `src/atividades/videos/chinchila-restaurada.png`.
- Animação: `src/atividades/videos/gerar_video_chinchila.py`.
- Testes de fidelidade e continuidade: `src/atividades/videos/test_chinchila.py`.
- Vídeos: `src/web/public/videos/chinchila-celular.mp4` e `chinchila-computador.mp4`.
- Os arquivos de vetorização da tentativa anterior não são usados pelo vídeo atual.

## Prompt da restauração

Modo usado: ferramenta integrada `image_gen`, com fundo transparente. Referências: recorte da primeira pose e folha original completa. A imagem gerada é a própria base visual da animação atual; suas cores e seus traços são conservados.

```text
Use case: identity-preserve restoration of an existing flat cartoon mascot. Create ONE ultra clean high resolution vector-style illustration of the EXACT chinchilla character from image 1, in its exact same resting/exhaled pose. Image 1 is the edit target, image 2 is the same character's reference breathing storyboard. Preserve the original character identity and proportions, not a new design: deep warm cocoa brown round head and body, two tall large rounded ears with dusty pink interiors and pale pink lower ear patches, two tiny closed smiling cream eyes, exactly two thin whiskers on each cheek, large curved brown fluffy tail on the viewer's left, a small pale cream round belly at the bottom with two small brown paws resting on its UPPER LEFT and UPPER RIGHT corners, and two short flat rounded brown feet resting on the ground. Faithfully restore image 1 as smoothly drawn cubic curves with excellent edge quality. Keep the head large and visibly ROUND, ears identical to original, brown hands visible separately in front of body surrounding the small cream belly. Preserve body outline, tail proportions, placement of face and feet from image 1. Flat vector illustration with subtle brown strokes separating arms and feet; no texture, no paper grain, no JPEG artifacts, no blur, no watercolor. Smooth broad curves without tiny bumps. No black outline. The character must occupy nearly all a square-ish portrait canvas with minimal transparent padding. Fully transparent background, no shadow or circle behind character, no text, no numbers, no other objects, no diagram, only this one complete chinchilla.
```

## Verificação

Os doze testes em `test_chinchila.py` passaram: verificam a periodicidade dos quadros, a continuidade da posição e da velocidade nas trocas de fase, a pequena variação entre o último e o primeiro quadro a 60 fps, as dimensões dos dois formatos, a preservação do RGB original e a estabilidade do rosto e das orelhas, a continuidade da malha e a geometria aprovada dos ombros e patas.

Também passaram os 11 testes do player e das novas atividades e o build da interface. FFprobe confirmou 600 quadros a 60 fps em ambos os formatos; FFmpeg decodificou os arquivos completos sem erros. No Chrome, ambos reproduziram e voltaram ao início após a passagem pelo fim do ciclo, em janelas de 390 × 844 e 1280 × 720. Essa conferência usa Chrome no computador, incluindo uma janela com largura de celular; não equivale a teste em um aparelho móvel físico.

As alterações permanecem locais, disponíveis pelo localhost, sem commit ou publicação nesta etapa.
