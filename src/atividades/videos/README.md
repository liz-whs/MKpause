# Vídeos de respiração

Referências recebidas: os scripts de espiral e chinchila e a folha `Ciclo_de_Respiracao.jpeg` com 12 poses.

## Chinchila: nova renderização

A versão atual anima diretamente `chinchila-restaurada.png`, a imagem aprovada. A tentativa de convertê-la em curvas foi descartada porque mudou as cores e duplicou traços nas patinhas. O gerador não consulta o JSON vetorial, não aplica uma paleta nova e não redesenha partes da personagem.

A barriga mantém seu contorno original, sem ser transformada em círculo. A expansão proporcional move a região clara e as mãos juntas, conservando as mãos à frente da barriga. Os ombros seguem curvas arredondadas contínuas dos dois lados. As patas acompanham o corpo, sem máscaras fixas que interrompam seus traços. A transição para a cauda fica fora do traço esquerdo. A geometria corresponde à prévia v10 aprovada pelo usuário e é conferida por `geometria-aprovada-v10.json`. O perfil antigo `silhueta-referencia.json` não participa mais da renderização.

Cada ciclo tem 4 segundos de inspiração e 6 de expiração, sem cronômetro na interface. A trajetória tem velocidade zero nas trocas de fase e é periódica. A área clara aumenta aproximadamente 25% no pico, com proporções próximas às da PNG inicial, e retorna à forma original na expiração. O perfil de cores é identificado no MP4 para conservar os tons no navegador.

O histórico da restauração e o prompt estão em `docs/06-relatorios/chinchila-alta-resolucao.md`. Os arquivos de vetorização e as tentativas de normalizar a barriga para um círculo não são usados na animação atual.

## Gerar os vídeos

Requisitos: Python com `opencv-python`, `numpy`, `Pillow`, `aggdraw` e `scipy`; FFmpeg e FFprobe no PATH. A espiral usa OpenCV/numpy. A chinchila usa a PNG original com Pillow, numpy e OpenCV; aggdraw desenha somente o fundo. `scipy` ajusta uma curva suave ao contorno original uma vez no início da renderização, evitando degraus causados pela leitura de pixels em cada quadro.

Instale as dependências com `python -m pip install -r src/atividades/videos/requirements.txt`.

Em `src/web`:

```powershell
npm run build:videos
npm run build:videos -- --only=chinchila
```

A fonte padrão é Fraunces SemiBold, já incluída no projeto. Para escolher outra fonte, defina `VIDEO_FONT`. `PYTHON`, `FFMPEG` e `FFPROBE` também podem ser definidos para o build.

- `--only=espiral` ou `--only=chinchila`: gerar apenas uma atividade.
- `--reuse`: reaproveitar os vídeos renderizados e atualizar capas e legendas. Para a espiral, também refaz a versão horizontal a partir da vertical.

Os novos vídeos são gerados em uma pasta temporária antes de substituir os arquivos públicos.

## Resultado

Arquivos em `src/web/public/videos/`:

- Chinchila: celular em 2880 × 3840 e computador em 3840 × 2160, **60 fps**, um ciclo de 600 quadros. Cada orientação tem uma composição renderizada diretamente em sua resolução final.
- Espiral: celular em 2880 × 3840 e computador em 3840 × 2160, 30 fps.
- Capas e legendas em português, inglês e espanhol.

O player repete o vídeo até o estudante pausar: play central, ícone oculto durante a reprodução e clique central para pausar. Não há duração ou cronômetro visível.

Os testes verificam também a preservação das cores RGB da PNG e a estabilidade do rosto e das orelhas, a continuidade da malha e a geometria aprovada dos ombros e patas:

```powershell
python -m unittest discover -s src/atividades/videos -p test_chinchila.py
```
