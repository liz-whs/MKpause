import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

S = 1024
OUT = 256
W = 88
ROOT = Path(__file__).resolve().parent.parent / "assets" / "images"


def canvas():
    img = Image.new("L", (S, S), 0)
    return img, ImageDraw.Draw(img)


def dot(d, c, r, fill=255):
    d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], fill=fill)


def line(d, pts, w=W, fill=255):
    d.line(pts, fill=fill, width=int(w), joint="curve")
    for p in pts:
        dot(d, p, w / 2, fill)


def arc(d, c, r, a0, a1, w=W, fill=255):
    d.arc([c[0] - r, c[1] - r, c[0] + r, c[1] + r], a0, a1, fill=fill, width=int(w))
    for a in (a0, a1):
        dot(d, (c[0] + (r - w / 2) * math.cos(math.radians(a)), c[1] + (r - w / 2) * math.sin(math.radians(a))), w / 2, fill)


def rounded(img, r=18):
    """Arredonda os cantos de uma forma sólida (borra e recorta)."""
    return img.filter(ImageFilter.GaussianBlur(r)).point(lambda v: 255 if v > 128 else 0)


def pt(c, r, deg):
    return (c[0] + r * math.cos(math.radians(deg)), c[1] + r * math.sin(math.radians(deg)))


def arrow_head(d, tip, direction, length=150, half=105, w_round=26):
    """Ponta de seta triangular arredondada. direction em graus."""
    img = Image.new("L", (S, S), 0)
    dd = ImageDraw.Draw(img)
    ux, uy = math.cos(math.radians(direction)), math.sin(math.radians(direction))
    nx, ny = -uy, ux
    bx, by = tip[0] - ux * length, tip[1] - uy * length
    dd.polygon([tip, (bx + nx * half, by + ny * half), (bx - nx * half, by - ny * half)], fill=255)
    return rounded(img, w_round)


def finish(img, folder, name):
    small = img.resize((OUT, OUT), Image.LANCZOS)
    out = Image.new("RGBA", (OUT, OUT), (255, 255, 255, 0))
    out.putalpha(small)
    path = ROOT / folder
    path.mkdir(parents=True, exist_ok=True)
    out.save(path / (name + ".png"), optimize=True)
    return out


def icon_restart():
    """Seta circular (sentido anti-horário): arco aberto no alto com ponta triangular arredondada."""
    img, d = canvas()
    c, rc = (512, 540), 270
    arc(d, c, rc + W / 2, 20, 300)
    p = pt(c, rc, 300)
    tangent = 300 + 90
    ux, uy = math.cos(math.radians(tangent)), math.sin(math.radians(tangent))
    tip = (p[0] + ux * 150, p[1] + uy * 150)
    img = ImageChops.lighter(img, arrow_head(d, tip, tangent, length=210, half=130, w_round=24))
    return img.transpose(Image.FLIP_LEFT_RIGHT)


def icon_undo():
    img, d = canvas()
    line(d, [(430, 225), (255, 400), (430, 575)])
    line(d, [(255, 400), (640, 400)])
    arc(d, (640, 620), 220 + W / 2, -90, 90)
    line(d, [(640, 840), (440, 840)])
    return img


def icon_hint():
    img, d = canvas()
    c = (512, 430)
    arc(d, c, 260, 128, 412)
    line(d, [pt(c, 260 - W / 2, 52), (590, 735)])
    line(d, [pt(c, 260 - W / 2, 128), (434, 735)])
    line(d, [(410, 835), (614, 835)])
    line(d, [(455, 925), (569, 925)])
    arc(d, c, 120, 215, 285, 60)
    return img


def icon_breathe():
    """Três linhas de vento, duas com a pontinha enrolada."""
    img, d = canvas()
    rc = 105
    line(d, [(120, 300), (610, 300)])
    arc(d, (610, 300 - rc), rc + 40, 180, 90, 80)
    line(d, [(90, 512), (820, 512)])
    line(d, [(200, 724), (560, 724)])
    arc(d, (560, 724 + rc), rc + 40, 270, 180, 80)
    return img


def icon_pause():
    img, d = canvas()
    d.rounded_rectangle([290, 230, 448, 794], 76, fill=255)
    d.rounded_rectangle([576, 230, 734, 794], 76, fill=255)
    return img


def icon_play():
    img, d = canvas()
    d.polygon([(330, 220), (330, 804), (830, 512)], fill=255)
    return rounded(img, 34)


def icon_stop():
    img, d = canvas()
    d.rounded_rectangle([250, 250, 774, 774], 120, fill=255)
    return img


def icon_check():
    img, d = canvas()
    line(d, [(230, 540), (430, 740), (800, 300)], 120)
    return img


def icon_lock():
    img, d = canvas()
    arc(d, (512, 440), 175, 180, 360, 90)
    d.rounded_rectangle([220, 450, 804, 880], 120, fill=255)
    dot(d, (512, 635), 62, 0)
    d.rounded_rectangle([488, 650, 536, 760], 24, fill=0)
    return img


def icon_gear():
    img, d = canvas()
    c, n = (512, 512), 8
    pts = []
    for k in range(n):
        a = 2 * math.pi * k / n
        for da, rr in ((-0.20, 335), (-0.115, 440), (0.115, 440), (0.20, 335)):
            pts.append((c[0] + rr * math.cos(a + da), c[1] + rr * math.sin(a + da)))
    d.polygon(pts, fill=255)
    dot(d, c, 345)
    img = rounded(img, 20)
    d2 = ImageDraw.Draw(img)
    dot(d2, c, 150, 0)
    return img


def icon_back():
    img, d = canvas()
    line(d, [(250, 512), (790, 512)], 96)
    line(d, [(500, 262), (250, 512), (500, 762)], 96)
    return img


def icon_help():
    img, d = canvas()
    d.ellipse([92, 92, 932, 932], outline=255, width=W)
    c = (512, 420)
    arc(d, c, 128, 190, 90, 80)
    line(d, [(512, 548), (512, 610)], 80)
    dot(d, (512, 735), 54)
    return img


def paw_shape():
    """Patinha: almofada grande + quatro dedinhos bem separados."""
    img, d = canvas()
    for cx, cy in ((190, 520), (385, 330), (639, 330), (834, 520)):
        d.ellipse([cx - 82, cy - 108, cx + 82, cy + 108], fill=255)
    d.ellipse([250, 540, 774, 940], fill=255)
    d.ellipse([310, 515, 714, 780], fill=255)
    return rounded(img, 20)


def icon_grid():
    img, d = canvas()
    for x0, y0 in ((160, 160), (556, 160), (160, 556), (556, 556)):
        d.rounded_rectangle([x0, y0, x0 + 308, y0 + 308], 90, fill=255)
    return img


def icon_home():
    img, d = canvas()
    line(d, [(120, 520), (512, 170), (904, 520)], 96)
    line(d, [(230, 470), (230, 860), (794, 860), (794, 470)], 96)
    line(d, [(430, 860), (430, 640), (594, 640), (594, 860)], 80)
    return img


def glyph_circle():
    img, d = canvas()
    d.ellipse([104, 104, 920, 920], fill=255)
    return img


def glyph_square():
    img, d = canvas()
    d.rounded_rectangle([130, 130, 894, 894], 150, fill=255)
    return img


def glyph_triangle():
    img, d = canvas()
    d.polygon([(512, 96), (950, 880), (74, 880)], fill=255)
    return rounded(img, 46)


def glyph_plus():
    img, d = canvas()
    d.rounded_rectangle([356, 90, 668, 934], 120, fill=255)
    d.rounded_rectangle([90, 356, 934, 668], 120, fill=255)
    return img


def glyph_heart():
    img, d = canvas()
    pts = []
    for i in range(360):
        t = math.radians(i)
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((512 + x * 31, 470 - y * 31))
    d.polygon(pts, fill=255)
    return rounded(img, 16)


def glyph_star():
    img, d = canvas()
    pts = []
    for k in range(10):
        ang = -math.pi / 2 + k * math.pi / 5
        rad = 490 if k % 2 == 0 else 235
        pts.append((512 + rad * math.cos(ang), 540 + rad * math.sin(ang)))
    d.polygon(pts, fill=255)
    return rounded(img, 40)


def icon_palette():
    """Paleta de pintura: corpo arredondado com furo para o dedão e quatro bolinhas de tinta."""
    img, d = canvas()
    d.ellipse([90, 130, 934, 890], fill=255)
    d.ellipse([640, 600, 860, 820], fill=0)
    d = ImageDraw.Draw(img)
    for c in ((300, 420), (470, 300), (660, 330), (790, 470), (300, 620)):
        dot(d, c, 62, 0)
    return img


def glyph_leaf():
    """Folhinha (decoração): lente apontando para cima-direita, com nervura e cabinho."""
    a = Image.new("L", (S, S), 0)
    b = Image.new("L", (S, S), 0)
    R, off = 560, 345
    ImageDraw.Draw(a).ellipse([512 - R, 512 + off - R, 512 + R, 512 + off + R], fill=255)
    ImageDraw.Draw(b).ellipse([512 - R, 512 - off - R, 512 + R, 512 - off + R], fill=255)
    lens = ImageChops.multiply(a, b).rotate(-45, resample=Image.BICUBIC)
    img = rounded(lens, 14)
    d = ImageDraw.Draw(img)
    line(d, [(330, 694), (650, 374)], 44, 0)
    line(d, [(250, 774), (345, 679)], 62, 255)
    return img


def main():
    icons = {"restart": icon_restart(), "undo": icon_undo(), "hint": icon_hint(), "breathe": icon_breathe(),
             "pause": icon_pause(), "play": icon_play(), "stop": icon_stop(), "check": icon_check(),
             "lock": icon_lock(), "gear": icon_gear(), "back": icon_back(), "help": icon_help(),
             "play_game": paw_shape(), "grid": icon_grid(), "home": icon_home(), "palette": icon_palette()}
    icons["next"] = icons["back"].transpose(Image.FLIP_LEFT_RIGHT)
    for name, img in icons.items():
        finish(img, "icons", name)
    glyphs = {"heart": glyph_heart(), "circle": glyph_circle(), "triangle": glyph_triangle(),
              "square": glyph_square(), "star": glyph_star(), "plus": glyph_plus(),
              "paw": paw_shape(), "leaf": glyph_leaf()}
    for name, img in glyphs.items():
        finish(img, "glyphs", name)
    print("ícones:", len(icons), "| símbolos:", len(glyphs))


if __name__ == "__main__":
    main()
