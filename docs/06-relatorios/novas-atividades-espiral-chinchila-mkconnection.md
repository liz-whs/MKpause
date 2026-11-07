# Novas atividades — espiral, chinchila e MKconnection

Integração local dos arquivos fornecidos em 06/11/2026.

## Atividades

| Nome | Tipo | Caminho da pausa |
|---|---|---|
| Respiração em espiral | Vídeo | `/estudante/pausa/espiral` |
| Respiração com a chinchila | Vídeo | `/estudante/pausa/chinchila` |
| MKconnection | Jogo | `/estudante/pausa/mkconnection` |

Os vídeos aparecem no filtro **Vídeos**, e o MKconnection aparece em **Jogos**. As três atividades participam da escolha de humor anterior à pausa, da gestão de conteúdos e dos nomes exibidos aos profissionais. Jogos e vídeos são diferenciados pela referência da atividade, preservando os anteriores.

## Vídeos

Scripts e folha original em `src/atividades/videos/`. Versões vertical e horizontal em alta resolução, com capas e legendas PT/EN/ES. A espiral usa 30 fps. A chinchila foi posteriormente restaurada e animada diretamente a partir da PNG aprovada, a 60 fps nos dois formatos; veja [a atualização da chinchila](chinchila-alta-resolucao.md). A primeira versão usava recortes ampliados da folha de 1600 × 533 recebida pelo WhatsApp, substituídos por essa reconstrução.

O player reutiliza o comportamento do MK Breath: ocupa a janela, preserva a composição, repete o ciclo, não exibe duração e permite play/pausa pelo controle central. Geração: `npm run build:videos` em `src/web`.

## MKconnection

Fontes originais do ZIP em `src/MKconnection/`. `npm run build:mkconnection` compila uma cópia temporária com pygbag 0.9.3, acrescentando execução assíncrona, importação explícita de pygame, canvas adaptável à área do iframe e persistência no navegador separada pelo estudante. A versão desktop permanece preservada.

O jogo abre dentro da pausa. O botão externo **Terminei** segue para o humor final. Não há encerramento por tempo. As dependências web do pygbag são carregadas de seu CDN, assim como nos jogos anteriores.

## Catálogo

`php artisan mkpause:sincronizar-atividades` acrescenta as atividades sem criar contas ou alterar senhas. O comando preserva nomes personalizados e escolhas administrativas de disponibilidade. `mkpause:criar-demo` reutiliza o mesmo catálogo, agora com sete atividades.

## Verificações

- Interface: filtros, escolha de humor, rotas, iframe, vídeos em loop e identificação correta das referências da API.
- Backend: catálogo idempotente, preservação de atividades ocultadas, nomes personalizados e ausência de criação de usuários no comando de sincronização.
- MKconnection: 121 testes Python aprovados, sem testes ignorados. Jogo iniciado e redimensionado em Chrome de teste, com inspeção do menu e da primeira fase no computador e celular. A fase 1 foi concluída por arraste dos pares no navegador em viewport 390 × 844; o progresso foi confirmado no armazenamento separado do estudante de teste.
- Resultado automatizado: 179 testes da interface aprovados (178 na suíte e um teste adicional do mapeamento das atividades), 22 testes PHP e 179 verificações aprovados. TypeScript e build de produção aprovados.
- Os quatro arquivos finais de vídeo foram reproduzidos em Chrome de teste: 2880 × 3840 no celular e 3840 × 2160 no computador. Foi verificado que a reprodução avança e retorna ao começo ao alcançar o fim.
- Catálogo local sincronizado e consultado: sete atividades disponíveis, incluindo as três novas. A sincronização não criou contas nem alterou senhas.

Nenhuma alteração foi publicada no GitHub nesta entrega.
