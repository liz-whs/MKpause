#!/usr/bin/env python3
"""
MKpause · Respiração em espiral — anima o storyboard (inspirar 5 s · expirar 7,5 s) e gera MP4.

O ponto percorre a espiral: na inspiração ele entra, da ponta externa até o centro, e o traço vai
ficando mais grosso e escuro atrás dele; a espiral também se abre um pouco. Na expiração o ponto
sai do centro de volta à ponta, o traço afina e a espiral se recolhe. O ciclo fecha sem emenda.

Uso:   python3 gerar_video_espiral.py --out espiral.mp4
Opções: --scale 1.5 (1.0 = 720x960 · 1.5 = 1080x1440) · --cycles 3 · --fps 30 · --font caminho.ttf
        --turns 2.5 (voltas da espiral) · --frames N (teste)
Requer: python3, opencv-python, numpy, pillow e ffmpeg.
"""
import argparse, math, subprocess
import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument('--out', default='espiral-respiracao.mp4'); ap.add_argument('--scale', type=float, default=1.5)
ap.add_argument('--cycles', type=int, default=3); ap.add_argument('--fps', type=int, default=30)
ap.add_argument('--inhale', type=float, default=5); ap.add_argument('--exhale', type=float, default=7.5)
ap.add_argument('--turns', type=float, default=2.5); ap.add_argument('--font', default=None)
ap.add_argument('--frames', type=int, default=0)
A = ap.parse_args()

K = A.scale; OW, OH = round(720 * K), round(960 * K)
IN, EX, FPS = A.inhale, A.exhale, A.fps; T = IN + EX
# cores do manual (BGR)
CREME = (228, 239, 246); CACAO = (49, 65, 89); LEAF = (119, 188, 193); GRASS = (76, 139, 141); JUNGLE = (63, 97, 101)

# ---------- geometria da espiral (unidades da base 720x960) ----------
CX, CY = 360 * K, 405 * K          # centro
R_OUT, R_IN = 290 * K, 12 * K      # raio da ponta externa e do miolo
N = 4200                           # amostras ao longo do traço
s = np.linspace(0, 1, N)           # 0 = ponta externa (embaixo) · 1 = centro
ang = math.pi / 2 + 2 * math.pi * A.turns * s       # sentido horário na tela, começando embaixo
rad = R_IN + (R_OUT - R_IN) * (1 - s)
W_MIN, W_MAX = 5 * K, 20 * K       # espessura do traço: fino/pálido → grosso/escuro
SS = 2                             # supersampling do traço

def sstep(x): x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)
ease = lambda x: (1 - math.cos(math.pi * x)) / 2

def render_spiral(sd, e):
    """sd = posição do ponto (0..1) · e = respiração (0 = expirado, 1 = inspirado). Devolve (RGB premult, alfa)."""
    sc = 0.84 + 0.16 * e                                    # a espiral se abre ao inspirar
    x = CX + sc * rad * np.cos(ang); y = CY + sc * rad * np.sin(ang)
    trail = 1 - sstep((s - sd) / 0.08 + 0.5)                # grosso/escuro atrás do ponto (s <= sd)
    w = (W_MIN + (W_MAX - W_MIN) * trail) * (0.9 + 0.1 * e) * sc
    pale = np.array(CREME, float) * 0.40 + np.array(LEAF, float) * 0.60
    col = pale[None] * (1 - trail[:, None]) + (np.array(LEAF, float) * (1 - e) + np.array(GRASS, float) * e)[None] * trail[:, None] * 0 \
          + (np.array(LEAF, float) * 0.35 + np.array(GRASS, float) * 0.65)[None] * trail[:, None]
    pad = 40 * K; x0, y0 = int(CX - R_OUT - pad), int(CY - R_OUT - pad); bw = int(2 * (R_OUT + pad)); bh = bw
    img = np.zeros((bh * SS, bw * SS, 3), np.uint8)
    for i in range(N):
        cv2.circle(img, (round((x[i] - x0) * SS * 16), round((y[i] - y0) * SS * 16)), round(w[i] / 2 * SS * 16),
                   (float(col[i, 0]), float(col[i, 1]), float(col[i, 2])), -1, cv2.LINE_AA, 4)
    # o alfa vem de um segundo desenho do mesmo traço em branco
    m = np.zeros((bh * SS, bw * SS), np.uint8)
    for i in range(N):
        cv2.circle(m, (round((x[i] - x0) * SS * 16), round((y[i] - y0) * SS * 16)), round(w[i] / 2 * SS * 16), 255, -1, cv2.LINE_AA, 4)
    img = cv2.resize(img, (bw, bh), interpolation=cv2.INTER_AREA); m = cv2.resize(m, (bw, bh), interpolation=cv2.INTER_AREA)
    pos = (x0, y0)
    k = int(np.clip(round(sd * (N - 1)), 0, N - 1))
    return img, m, pos, (x[k], y[k]), sc

def paste_disc(bg, cx, cy, r, color, alpha):
    n = int(r * 2 + 6); x0, y0 = int(cx - n / 2), int(cy - n / 2)
    p = np.zeros((n, n), np.float32)
    cv2.circle(p, (round((cx - x0) * 16), round((cy - y0) * 16)), round(r * 16), 1.0, -1, cv2.LINE_AA, 4)
    xa, ya, xb, yb = max(x0, 0), max(y0, 0), min(x0 + n, OW), min(y0 + n, OH)
    mm = (p[ya - y0:yb - y0, xa - x0:xb - x0] * alpha)[..., None]
    reg = bg[ya:yb, xa:xb]; reg[:] = reg * (1 - mm) + np.array(color, np.float32) * mm

def font_path():
    if A.font: return A.font
    try: return subprocess.run(['fc-match', '-f', '%{file}', 'serif:bold'], capture_output=True, text=True).stdout
    except Exception: return None
FONT = ImageFont.truetype(font_path(), round(40 * K))
def label(txt):
    im = Image.new('RGBA', (OW, round(80 * K)), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.text(((OW - d.textlength(txt, font=FONT)) / 2, 16 * K), txt, font=FONT, fill=CACAO[::-1] + (255,)); return im
LABEL = {'in': label('Inspire devagar'), 'ex': label('Solte o ar devagar')}

total = A.frames or round(FPS * T * A.cycles)
ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{OW}x{OH}', '-r', str(FPS), '-i', '-',
                       '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', A.out], stdin=subprocess.PIPE)
for k in range(total):
    t = (k / FPS) % T
    if t < IN: sd = ease(t / IN)                 # inspirar: ponta → centro
    else:      sd = 1 - ease((t - IN) / EX)      # expirar: centro → ponta
    e = sd                                       # a respiração acompanha o ponto
    img, m, (x0, y0), (dx, dy), sc = render_spiral(sd, e)
    bg = np.empty((OH, OW, 3), np.float32); bg[:] = CREME
    h, w_ = m.shape; xa, ya, xb, yb = max(x0, 0), max(y0, 0), min(x0 + w_, OW), min(y0 + h, OH)
    a = (m[ya - y0:yb - y0, xa - x0:xb - x0].astype(np.float32) / 255)[..., None]
    reg = bg[ya:yb, xa:xb]; reg[:] = reg * (1 - a) + img[ya - y0:yb - y0, xa - x0:xb - x0].astype(np.float32) * a / np.maximum(a, 1e-3) * (a > 0)
    # ponto guia (some suavemente ao chegar ao miolo)
    vis = 1 - sstep((sd - 0.90) / 0.08)
    r = (13 + 3 * e) * K
    paste_disc(bg, dx, dy, r * 2.0, LEAF, 0.22 * vis)           # halo fixo e suave (sem brilho piscante)
    paste_disc(bg, dx, dy, r, GRASS, 0.9 * vis)
    paste_disc(bg, dx, dy, r * 0.82, LEAF, 1.0 * vis)
    im = Image.fromarray(np.clip(bg, 0, 255).astype(np.uint8)[:, :, ::-1])
    # O player desenha a instrução localizada; o vídeo contém só a animação.
    ff.stdin.write(np.array(im)[:, :, ::-1].tobytes())
ff.stdin.close(); ff.wait(); print('ok →', A.out, f'({OW}x{OH}, {total} quadros)')
