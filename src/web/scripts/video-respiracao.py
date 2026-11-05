"""
Gera o vídeo de respiração guiada do MKpause (atividade "Vídeo").

Uso:  python scripts/video-respiracao.py computador   -> public/videos/respiracao-computador.mp4 (1280 x 720)
      python scripts/video-respiracao.py celular      -> public/videos/respiracao-celular.mp4    (1080 x 1920)

Precisa de Pillow e do ffmpeg no PATH. Cores de src/styles/tokens.css e fontes do site
(Fraunces e Lexend, em src/jogos/pianopause/fontes). Ritmo: 5 s inspirando, 5 s soltando, 3 ciclos.
A legenda (public/videos/respiracao.*.vtt) repete o texto da tela em português, inglês e espanhol.
"""
import math
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FORMATO = sys.argv[1] if len(sys.argv) > 1 else "computador"
if FORMATO not in ("computador", "celular"):
    sys.exit("Use: video-respiracao.py computador|celular")

RAIZ = Path(__file__).resolve().parent.parent          # src/web
FONTES = RAIZ.parent / "jogos" / "pianopause" / "fontes"
SAIDA = RAIZ / "public" / "videos" / f"respiracao-{FORMATO}.mp4"

# Cores do MKpause (tokens.css)
BG = (0xF6, 0xEF, 0xE4)      # --color-bg
INK = (0x59, 0x41, 0x31)     # --color-ink (Cacao)
LAV = (0xCC, 0xC3, 0xD1)     # --color-lavender
SKY = (0xAF, 0xB8, 0xCD)     # --color-sky
GRASS = (0x8D, 0x8B, 0x4C)   # --color-grass


def mix(a, b, t):
    return tuple(round(a[i] * t + b[i] * (1 - t)) for i in range(3))


TRACK = mix(INK, BG, 0.3)
HALO = mix(LAV, BG, 0.6)
CINZA = mix(INK, BG, 0.75)

FPS, SS = 30, 2
IN, OUT = 5, 5
CYC = IN + OUT
CYCLES = 3
TOTAL = CYC * CYCLES
X0, X1, TOP, BOT, N = 40, 960, 70, 330, 720

if FORMATO == "computador":
    W, H, K = 1280, 720, 1.2
    vx = lambda x: (40 + x * K) * SS
    vy = lambda y: (80 + y * K) * SS
    TAM_FASE, TAM_SEG, Y_FASE, Y_SEG, PASSO, PONTO = 66, 28, 560, 625, 13, 2.6
else:
    W, H, K = 1080, 1920, 1.9
    vx = lambda x: (90 + (x - 40) / 920 * (W - 180)) * SS
    vy = lambda y: (560 + (y - TOP) / (BOT - TOP) * 600) * SS
    TAM_FASE, TAM_SEG, Y_FASE, Y_SEG, PASSO, PONTO = 130, 54, 1450, 1565, 25, 5


def yat(tc):
    if tc < IN:
        return BOT - (BOT - TOP) * (1 - math.cos(math.pi * tc / IN)) / 2
    return TOP + (BOT - TOP) * (1 - math.cos(math.pi * (tc - IN) / OUT)) / 2


pts = [(vx(X0 + (X1 - X0) * k / N), vy(yat((TOTAL * k / N) % CYC))) for k in range(N + 1)]

fonte_fase = ImageFont.truetype(str(FONTES / "Fraunces-SemiBold.ttf"), TAM_FASE * SS)
fonte_seg = ImageFont.truetype(str(FONTES / "Lexend-SemiBold.ttf"), TAM_SEG * SS)


def circ(d, x, y, r, c):
    d.ellipse((x - r, y - r, x + r, y + r), fill=c)


# Camada fixa: trilha pontilhada
base = Image.new("RGB", (W * SS, H * SS), BG)
d = ImageDraw.Draw(base)
acc, passo = 0.0, PASSO * SS
for i in range(1, len(pts)):
    seg = math.dist(pts[i - 1], pts[i])
    acc += seg
    while acc >= passo:
        acc -= passo
        f = 1 - acc / seg
        circ(d, pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f, PONTO * SS, TRACK)

SAIDA.parent.mkdir(parents=True, exist_ok=True)
cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
       "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "slow", "-movflags", "+faststart", str(SAIDA)]
p = subprocess.Popen(cmd, stdin=subprocess.PIPE)

for fr in range(TOTAL * FPS):
    t = fr / FPS
    tc = t % CYC
    y = yat(tc)
    x = X0 + (X1 - X0) * t / TOTAL
    s = (BOT - y) / (BOT - TOP)
    e = 0.75 + 0.4 * s
    im = base.copy()
    d = ImageDraw.Draw(im)
    k = round(t / TOTAL * N) + 1
    if k > 1:
        d.line(pts[:k], fill=GRASS, width=int(4 * K * SS), joint="curve")
        for q in (pts[0], pts[k - 1]):
            circ(d, q[0], q[1], 2 * K * SS, GRASS)
    cx, cy = vx(x), vy(y)
    circ(d, cx, cy, (22 * e + 6 + 10 * s) * K * SS, HALO)
    circ(d, cx, cy, 22 * e * K * SS, LAV)
    circ(d, cx, cy, 14 * e * K * SS, SKY)
    inspirando = tc < IN
    d.text((W * SS / 2, Y_FASE * SS), "Inspire" if inspirando else "Solte o ar", font=fonte_fase, fill=INK, anchor="mm")
    falta = math.ceil(IN - tc if inspirando else CYC - tc)
    d.text((W * SS / 2, Y_SEG * SS), f"{falta} s", font=fonte_seg, fill=CINZA, anchor="mm")
    p.stdin.write(im.resize((W, H), Image.LANCZOS).tobytes())

p.stdin.close()
p.wait()
if p.returncode != 0:
    sys.exit(p.returncode)

# Mantém capas e legendas reproduzíveis junto com o MP4.
poster = SAIDA.with_suffix('.jpg')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '0.5', '-i', str(SAIDA),
                '-frames:v', '1', '-q:v', '4', str(poster)], check=True)
for idioma, frases in {'pt-BR': ('Inspire', 'Solte o ar'), 'en': ('Breathe in', 'Breathe out'),
                       'es': ('Inhala', 'Exhala')}.items():
    trechos = ['WEBVTT\n']
    for i in range(CYCLES * 2):
        inicio, fim = i * 5, (i + 1) * 5
        trechos.append(f'{i+1}\n00:00:{inicio:02}.000 --> 00:00:{fim:02}.000\n{frases[i%2]}\n')
    (SAIDA.parent / f'respiracao.{idioma}.vtt').write_text('\n'.join(trechos), encoding='utf-8')
print('ok', SAIDA)
