"""Renderiza respiração em 4K/60 fps, com movimento periódico e loop de 30 s.

Uso: python scripts/video-respiracao.py computador|celular
Saídas: 3840 x 2160 ou 2160 x 3840, H.264, capas JPEG e legendas PT/EN/ES.
Requer Pillow, ffmpeg no PATH e as fontes do PianoPause.
"""
import argparse
import math
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
FONTES = RAIZ.parent / "jogos" / "pianopause" / "fontes"
BG = (246, 239, 228)
INK = (89, 65, 49)
LAV = (204, 195, 209)
SKY = (175, 184, 205)
GRASS = (141, 139, 76)
FPS = 60
CICLO = 10
CICLOS = 3


def mix(a, b, t):
    return tuple(round(x * t + y * (1 - t)) for x, y in zip(a, b))


def onda(fase):
    """Periódica em valor e velocidade, inclusive no reencontro do loop."""
    return (1 - math.cos(2 * math.pi * fase)) / 2


class Cena:
    def __init__(self, formato):
        self.w, self.h = (3840, 2160) if formato == "computador" else (2160, 3840)
        self.escala = self.w / (1280 if formato == "computador" else 1080)
        self.horizontal = formato == "computador"
        self.x0, self.x1 = self.w * .08, self.w * .92
        self.topo = self.h * (.24 if self.horizontal else .30)
        self.base = self.h * (.63 if self.horizontal else .60)
        self.cx = self.w / 2
        self.largura_onda = (self.x1 - self.x0) / 3
        self.y_fase = self.h * (.79 if self.horizontal else .76)
        tamanho = round(self.w * (.055 if self.horizontal else .105))
        self.fonte = ImageFont.truetype(str(FONTES / "Fraunces-SemiBold.ttf"), tamanho)
        self.fundo = Image.new("RGB", (self.w, self.h), BG)
        self.trilha = mix(INK, BG, .3)
        self.halo = mix(LAV, BG, .6)

    def posicao(self, x, fase):
        return self.base - (self.base - self.topo) * onda(fase + (x - self.cx) / self.largura_onda)

    def quadro(self, tempo):
        # O marcador fica no centro; a onda passa continuamente por ele.
        # Nada acumula progresso nem salta da borda direita para a esquerda.
        fase = (tempo % CICLO) / CICLO
        im = self.fundo.copy()
        d = ImageDraw.Draw(im)
        passo = max(1, round(2 * self.escala))
        pontos = [(x, self.posicao(x, fase)) for x in range(round(self.x0), round(self.cx) + 1, passo)]
        pontos.append((self.cx, self.posicao(self.cx, fase)))
        d.line(pontos, fill=GRASS, width=round(4 * self.escala), joint="curve")
        raio = 2.5 * self.escala
        for x in range(round(self.cx), round(self.x1), round(14 * self.escala)):
            y = self.posicao(x, fase)
            d.ellipse((x - raio, y - raio, x + raio, y + raio), fill=self.trilha)
        s = onda(fase)
        cy = self.posicao(self.cx, fase)
        for raio, cor in ((34 + 16 * s, self.halo), (22 + 9 * s, LAV), (14 + 6 * s, SKY)):
            r = raio * self.escala
            d.ellipse((self.cx - r, cy - r, self.cx + r, cy + r), fill=cor)
        tc = tempo % CICLO
        inspirando = tc < 5
        dentro_fase = tc % 5
        # Desvanece o texto nas mudanças de fase, inclusive no encontro 30 s -> 0 s.
        opacidade = min(1., dentro_fase / .22, (5 - dentro_fase) / .22)
        cor = mix(INK, BG, opacidade)
        # A instrução é desenhada pelo player, no idioma escolhido pelo usuário.
        return im


def renderizar(formato):
    cena = Cena(formato)
    saida = RAIZ / "public" / "videos" / f"respiracao-{formato}.mp4"
    saida.parent.mkdir(parents=True, exist_ok=True)
    # Renderiza um ciclo exato de 600 quadros e repete o stream três vezes.
    with tempfile.TemporaryDirectory(prefix="mkpause-video-") as temporario:
        unidade = Path(temporario) / "ciclo.mp4"
        processo = subprocess.Popen([
            "ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
            "-s", f"{cena.w}x{cena.h}", "-r", str(FPS), "-i", "-", "-an",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "15", "-preset", "medium",
            "-tune", "animation", "-g", str(FPS), "-movflags", "+faststart", str(unidade),
        ], stdin=subprocess.PIPE)
        try:
            for quadro in range(CICLO * FPS):
                processo.stdin.write(cena.quadro(quadro / FPS).tobytes())
                if quadro % FPS == 0:
                    print(f"{formato}: {quadro // FPS}/{CICLO} s renderizados", flush=True)
        finally:
            processo.stdin.close()
            codigo = processo.wait()
        if codigo:
            raise subprocess.CalledProcessError(codigo, processo.args)
        # Celulares não decodificam H.264 acima de 4K: a versão de celular sai em 1080 x 1920, nível 4.1.
        codificacao = ["-c", "copy"] if formato == "computador" else [
            "-vf", "scale=1080:1920:flags=lanczos", "-c:v", "libx264", "-profile:v", "high", "-level", "4.1",
            "-preset", "slow", "-crf", "18", "-tune", "animation", "-pix_fmt", "yuv420p"]
        subprocess.run([
            "ffmpeg", "-y", "-loglevel", "error", "-stream_loop", str(CICLOS - 1),
            "-i", str(unidade), *codificacao, "-movflags", "+faststart", str(saida),
        ], check=True)
    # Capa na resolução nativa, sem extrair um quadro já comprimido do MP4.
    capa = cena.quadro(.5)
    if formato == "celular":
        capa = capa.resize((1080, 1920), Image.LANCZOS)
    capa.save(saida.with_suffix('.jpg'), quality=98, subsampling=0)
    for idioma, frases in {'pt-BR': ('Inspire', 'Solte o ar'), 'en': ('Breathe in', 'Breathe out'), 'es': ('Inhala', 'Exhala')}.items():
        trechos = ['WEBVTT\n']
        for i in range(CICLOS * 2):
            inicio, fim = i * 5, (i + 1) * 5
            trechos.append(f'{i+1}\n00:00:{inicio:02}.000 --> 00:00:{fim:02}.000\n{frases[i%2]}\n')
        (saida.parent / f'respiracao.{idioma}.vtt').write_text('\n'.join(trechos), encoding='utf-8')
    print(f"ok: {saida} ({cena.w} x {cena.h}, {FPS} fps)", flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('formato', choices=('computador', 'celular'))
    renderizar(parser.parse_args().formato)
