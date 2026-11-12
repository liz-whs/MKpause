"""Gera os efeitos suaves do mk potion apenas durante a compilação."""
import array
import math
from pathlib import Path
import sys
import wave

TAXA = 48000  # taxa do áudio do navegador (celular e computador): evita conversão ao tocar
GANHO = 0.10
DO, MI, SOL, DO_AGUDO = 261.625565, 329.627557, 391.995436, 523.251131
EFEITOS = {
    'select': (0.32, [(DO_AGUDO, 0)]),
    'pour': (0.62, [(MI, 0), (SOL, 0.08), (DO_AGUDO, 0.16)]),
    'undo': (0.56, [(SOL, 0), (MI, 0.07), (DO, 0.14)]),
    'win': (1.05, [(DO, 0), (MI, 0.10), (SOL, 0.20), (DO_AGUDO, 0.30)]),
}


def suavizar(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def amostras(duracao, notas):
    total = round(duracao * TAXA)
    dados = array.array('h')
    for i in range(total):
        tempo = i / TAXA
        onda = 0.0
        for frequencia, inicio in notas:
            t = tempo - inicio
            if t < 0:
                continue
            restante = (total - 1 - i) / TAXA
            envelope = suavizar(t / 0.018) * suavizar(restante / 0.11) * math.exp(-t / 0.30)
            fase = 2 * math.pi * frequencia * t
            parcial = (math.sin(fase) + 0.10 * math.sin(2 * fase) + 0.04 * math.sin(3 * fase)) / 1.14
            onda += parcial * envelope
        dados.append(round(32767 * GANHO * onda / len(notas)))
    return dados


def gerar(projeto):
    destino = Path(projeto) / 'assets' / 'audio'
    destino.mkdir(exist_ok=True)
    for nome, (duracao, notas) in EFEITOS.items():
        dados = amostras(duracao, notas)
        if sys.byteorder != 'little':
            dados.byteswap()
        with wave.open(str(destino / f'{nome}.wav'), 'wb') as arquivo:
            arquivo.setparams((1, 2, TAXA, 0, 'NONE', 'not compressed'))
            arquivo.writeframes(dados.tobytes())


if __name__ == '__main__':
    gerar(sys.argv[1])
