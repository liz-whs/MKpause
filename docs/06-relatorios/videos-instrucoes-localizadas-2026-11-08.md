# Instruções dos vídeos no idioma escolhido — 08/11/2026

## Comportamento

`mk breath`, `spiral pause` e `chinchilla pause` exibem uma única instrução de respiração, diretamente na área do vídeo e no idioma das preferências (português, inglês ou espanhol). Não há uma segunda tradução em legenda. A instrução usa a fonte do sistema e acompanha o tamanho do vídeo nas orientações de computador e celular.

O texto acompanha o relógio da mídia: inspiração/expiração de 5/5 segundos no mk breath, 5/7,5 na espiral e 4/6 na chinchila. Ao repetir o vídeo ou mudar sua posição, a fase do texto acompanha a mídia. Trocar o idioma não remonta o player nem reinicia a reprodução; a chave de conta continua separando os usuários.

## Arquivos

- O player `src/web/src/features/session/VideoRespiracao.tsx` desenha a instrução traduzida e não carrega faixas de legenda.
- Os seis MP4s e suas capas não contêm mais a frase em português gravada. Foram preservadas as resoluções, durações e cadências dos vídeos. A faixa removida fica abaixo da animação.
- O utilitário `src/web/scripts/remover-textos-videos.mjs` realiza essa migração com cópias obrigatórias fora do repositório e impede repetir a operação sobre um backup existente.
- Os geradores de vídeo também deixam o texto para o player nas renderizações futuras.
- As URLs dos assets usam novas versões para invalidar o cache anterior.

## Verificação

Os 224 testes da interface passaram. Os casos novos cobrem as três atividades, idioma, troca de fase, repetição e ausência de legenda duplicada. O teste da troca de idioma percorre o roteador real e confirma que o relógio do vídeo é preservado. A conferência em Chrome local verificou as 18 combinações de três atividades, três idiomas e duas orientações: instrução dentro da área visível, ausência de faixas de legenda e nenhum erro JavaScript. O build final passou com os seis arquivos atualizados.

A verificação dos seis MP4s confirmou resolução, cadência e número de quadros iguais aos originais. Uma amostra de cada vídeo não apresentou pixels de texto na faixa removida. A diferença média na região animada ficou entre 0,006 e 0,024 nível por canal RGB (escala 0–255), compatível com a recompressão. Os 12 testes de fidelidade da chinchila também passaram.

As alterações são locais, sem commit ou publicação.
