"""Áudio suave do piano pause: Síntese PCM explícita e margem para sobreposição."""
import array
import math
from pathlib import Path
import sys
import wave

TAXA = 44100
DURACAO = 1.6
# Tríade de dó maior com a oitava: qualquer combinação permanece consonante.
FREQUENCIAS = (261.625565, 329.627557, 391.995436, 523.251131)
GANHO = 0.12


def amostras(frequencia):
    total = round(TAXA * DURACAO)
    valores = array.array('h')
    for i in range(total):
        t = i / TAXA
        ataque = min(1.0, t / 0.022)
        ataque = ataque * ataque * (3 - 2 * ataque)
        saida = min(1.0, (total - 1 - i) / (TAXA * 0.22))
        saida = saida * saida * (3 - 2 * saida)
        envelope = ataque * math.exp(-t / 0.55) * saida
        fase = 2 * math.pi * frequencia * t
        onda = (math.sin(fase) + 0.14 * math.sin(2 * fase) + 0.04 * math.sin(3 * fase) + 0.015 * math.sin(4 * fase)) / 1.195
        valores.append(round(32767 * GANHO * envelope * onda))
    return valores


def gerar(destino):
    destino = Path(destino) / 'audio'
    destino.mkdir(exist_ok=True)
    for indice, frequencia in enumerate(FREQUENCIAS):
        valores = amostras(frequencia)
        if sys.byteorder != 'little':
            valores.byteswap()
        with wave.open(str(destino / f'nota-{indice}.wav'), 'wb') as arquivo:
            arquivo.setparams((1, 2, TAXA, 0, 'NONE', 'not compressed'))
            arquivo.writeframes(valores.tobytes())


if __name__ == '__main__':
    gerar(sys.argv[1])
