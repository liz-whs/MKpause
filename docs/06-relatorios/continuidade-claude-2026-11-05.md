# Continuidade do trabalho do Claude — 5 de novembro de 2026

## Estado incorporado

A `main` foi atualizada até `08cc91b`, preservando as alterações locais. O dashboard individual do psicólogo clínico recebido da equipe é uma API Django separada dos indicadores agregados administrativos em PHP.

Foram preservadas as adaptações do MK Potion: tamanho do canvas e densidade no navegador, modo embutido `?mkpause=1`, fontes Fraunces/Lexend com licenças, cores e remoção de controles redundantes. O APK compilado foi comparado aos quatro arquivos alterados (`web.py`, `screens.py`, `ui.py`, `liquid.py`) e confere byte a byte com esses fontes.

O vídeo de respiração está integrado à pausa, com MP4 de 30 segundos em 1280 × 720 e 1080 × 1920, capas e legendas PT/EN/ES. O gerador passou a reproduzir também capas e legendas e a indicar falha se o ffmpeg não concluir.

## PHP concluído localmente

- Painel **Administração → Indicadores da escola**, com períodos de 7/30/90 dias completos, contagens e distribuições.
- API PHP, consulta PostgreSQL somente leitura e autorização por sessão confirmada no Django.
- Correção do agrupamento que somava participantes repetidos de atividades distintas. Uma distribuição com qualquer grupo de menos de cinco estudantes é ocultada integralmente, inclusive para dias, horários, níveis de alerta e resultado de humor.
- Dados abaixo do mínimo são apresentados como insuficientes/protegidos, sem trocar valores ocultos por zero. Nenhum nome, e-mail, identificador de estudante ou relato é devolvido.
- Script de execução local que ativa `pdo_pgsql` no processo sem mudar a instalação global do PHP; proxy Vite e traduções EN/ES.

## Verificações

| Verificação | Resultado |
|---|---|
| Interface | 119 testes passaram, incluindo painel e acessibilidade |
| Build da interface | Passou; permanece o aviso de tamanho do bundle |
| PHP isolado | 13 verificações passaram |
| Backend completo no PostgreSQL temporário | 78 testes passaram, sem testes pulados |
| Integração PHP/Django/PostgreSQL | Sessão, permissões, datas, amostras pequenas, supressão por grupo e recusa de escrita verificadas |
| MK Potion | 60 testes passaram |
| Vídeos | Dimensões e duração verificadas com ffprobe |
| Execução local | Site e saúde do PHP retornaram 200; resumo anônimo retornou 401 |

O banco dos testes foi removido pelo executor; não foram inseridos dados de demonstração no banco principal para fabricar indicadores.

## Hospedagem e limites

A opção `render.indicadores.yaml` e o Dockerfile foram preparados para Python + PHP-FPM + Nginx. O `render.yaml` Python atual não foi substituído. Como Docker não está instalado neste ambiente, a imagem completa ainda precisa de build e execução antes do deploy. Não houve publicação ou push nesta rodada.

A supressão reduz riscos, mas não representa garantia formal de anonimato. O painel agrega a instalação atual; isolamento entre instituições independentes depende de definição de um modelo de escola/administração. A inspeção visual manual no navegador não foi refeita nesta rodada.

Guias: [PHP local](../../src/indicadores/README.md) e [hospedagem](../indicadores-php.md).
