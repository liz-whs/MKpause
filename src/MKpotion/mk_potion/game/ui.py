from __future__ import annotations

import math
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pygame

from . import storage
from .liquid import hex_to_rgb, PALETTE

ASSETS_FONTS = Path(__file__).resolve().parent.parent / "assets" / "fonts"
ASSETS_IMAGES = Path(__file__).resolve().parent.parent / "assets" / "images"

ASSETS_FONTS_WEB = Path(__file__).resolve().parent.parent / "assets" / "fonts_web"
# Fontes do site MKpause: Lexend no texto e Fraunces (SOFT 100) nos títulos.
ASSETS_FONTS_MKPAUSE = Path(__file__).resolve().parent.parent / "assets" / "fonts_mkpause"

# Cores do MKpause (src/web/src/styles/tokens.css)
MK_BG = (0xF6, 0xEF, 0xE4)        # --color-bg
MK_SURFACE = (0xFF, 0xFA, 0xF7)   # --color-surface
MK_INK = (0x59, 0x41, 0x31)       # --color-ink (Cacao)
MK_MUTED = (0x6E, 0x54, 0x42)     # --color-muted
MK_DARK = (0x3E, 0x2B, 0x20)      # --color-dark
MK_LINE = (0xE6, 0xD8, 0xC6)      # --color-line
MK_PEONY = (0xF7, 0xDD, 0xD5)     # --color-peony
MK_DISABLED = (0xEA, 0xDB, 0xD3)  # --color-disabled

PLUM = MK_INK
TAIL = MK_MUTED
EAR = (191, 160, 150)
EAR_SOFT = (222, 188, 183)
BELLY = (234, 222, 214)


def _c(name: str):
    return hex_to_rgb(PALETTE[name])


def make_theme(high_contrast: bool = False) -> Dict:
    theme = {
        "bg": MK_BG,
        "bg_calm": (241, 234, 236),
        "panel": MK_SURFACE,
        "panel_border": MK_LINE,
        "glass": MK_SURFACE,
        "text": PLUM,
        "text_soft": TAIL,
        "outline": MK_MUTED,
        "rose": _c("Dusty Rose"),
        "grass": _c("Grass"),
        "leaf": _c("Leaf"),
        "sky": _c("Sky"),
        "lavender": _c("Lavender"),
        "peony": _c("Peony"),
        "cacao": PLUM,
        "jungle": TAIL,
        "focus": PLUM,
        "thick": 3,

        "btn_primary": (MK_INK, MK_SURFACE),
        "btn_secondary": (MK_PEONY, MK_INK),
        "btn_soft": (_c("Lavender"), MK_INK),
        "btn_rose": (_c("Dusty Rose"), MK_DARK),
        "btn_disabled": (MK_DISABLED, MK_MUTED),
    }
    if high_contrast:
        theme.update({
            "bg": (255, 255, 255), "panel": (255, 255, 255), "glass": (255, 255, 255),
            "text": (20, 10, 10), "text_soft": (40, 30, 20), "outline": (20, 10, 10),
            "thick": 5, "focus": (0, 0, 0),
            "btn_primary": ((40, 30, 20), (255, 255, 255)),
            "btn_secondary": ((255, 255, 255), (20, 10, 10)),
            "btn_soft": ((225, 232, 245), (20, 10, 10)),
            "btn_rose": ((250, 215, 225), (20, 10, 10)),
        })
    return theme


class Fonts:

    def __init__(self) -> None:
        self.cache: Dict[Tuple[int, bool], pygame.font.Font] = {}
        files = sorted(ASSETS_FONTS.glob("*.ttf")) + sorted(ASSETS_FONTS.glob("*.otf"))
        self.file = str(files[0]) if files else None
        self.web_files = {}
        # Fontes do MKpause (no desktop e no navegador): Lexend 400/600 e Fraunces 600 nos títulos.
        mk = {False: ASSETS_FONTS_MKPAUSE / "Lexend-Regular.ttf", True: ASSETS_FONTS_MKPAUSE / "Lexend-SemiBold.ttf"}
        self.display_file = ASSETS_FONTS_MKPAUSE / "Fraunces-SemiBold.ttf"
        if not self.file and all(f.exists() for f in mk.values()):
            self.web_files = {k: str(v) for k, v in mk.items()}
        if storage.IS_WEB and not self.file and not self.web_files:
            regular, bold = ASSETS_FONTS_WEB / "LiberationSans-Regular.ttf", ASSETS_FONTS_WEB / "LiberationSans-Bold.ttf"
            if regular.exists():
                self.web_files = {False: str(regular), True: str(bold if bold.exists() else regular)}

    def titulo(self, size: float) -> pygame.font.Font:
        """Fonte dos títulos: Fraunces, como no site (cai para a de texto se faltar)."""
        size = max(14, int(size))
        key = (size, "titulo")
        if key not in self.cache:
            try:
                self.cache[key] = pygame.font.Font(str(self.display_file), size)
            except (pygame.error, OSError, FileNotFoundError):
                self.cache[key] = self.get(size, True)
        return self.cache[key]

    def get(self, size: float, bold: bool = False) -> pygame.font.Font:
        size = max(14, int(size))
        key = (size, bold)
        if key not in self.cache:
            try:
                if self.file:
                    font = pygame.font.Font(self.file, size)
                    font.set_bold(bold)
                elif self.web_files:
                    font = pygame.font.Font(self.web_files[bold], size)
                else:
                    font = pygame.font.SysFont("nunito,quicksand,varelaround,comfortaa,fredoka,segoeui,helveticaneue,arial,dejavusans,liberationsans,freesans",
                                               size, bold=bold)
            except (pygame.error, OSError):
                font = pygame.font.Font(None, int(size * 1.2))
            self.cache[key] = font
        return self.cache[key]


def draw_text(surface, text: str, font, color, **anchor) -> pygame.Rect:
    img = font.render(text, True, color)
    rect = img.get_rect(**anchor)
    surface.blit(img, rect)
    return rect


def wrap_text(text: str, font, max_width: int) -> List[str]:
    lines: List[str] = []
    for paragraph in text.split("\n"):
        words, line = paragraph.split(), ""
        for word in words:
            test = (line + " " + word).strip()
            if font.size(test)[0] <= max_width or not line:
                line = test
            else:
                lines.append(line)
                line = word
        lines.append(line)
    return lines


def draw_paragraph(surface, text, font, color, center_x: int, top: int, max_width: int, align_left: Optional[int] = None) -> int:
    y = top
    for line in wrap_text(text, font, max_width):
        if align_left is None:
            draw_text(surface, line, font, color, midtop=(center_x, y))
        else:
            draw_text(surface, line, font, color, topleft=(align_left, y))
        y += int(font.get_linesize() * 1.1)
    return y


def _arc_points(cx, cy, r, a0, a1, n=24):
    return [(cx + r * math.cos(a0 + (a1 - a0) * i / n), cy - r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


def _circle_arrow(surf, color, cx, cy, r, lw, clockwise):
    a0, a1 = 0.8, 5.6
    pts = _arc_points(cx, cy, r, a0, a1)
    if clockwise:
        pts = [(2 * cx - x, y) for x, y in pts]
    pygame.draw.lines(surf, color, False, pts, lw)

    ex, ey = pts[-1]
    px, py = pts[-3]
    ang = math.atan2(ey - py, ex - px)
    size = lw * 3
    tip = (ex + math.cos(ang) * size, ey + math.sin(ang) * size)
    left = (ex + math.cos(ang + 2.3) * size, ey + math.sin(ang + 2.3) * size)
    right = (ex + math.cos(ang - 2.3) * size, ey + math.sin(ang - 2.3) * size)
    pygame.draw.polygon(surf, color, [tip, left, right])


def _draw_icon_vector(surf, name: str, center: Tuple[int, int], size: int, color) -> None:
    cx, cy = center
    r = size // 2
    lw = max(2, size // 8)
    if name == "home":
        pygame.draw.polygon(surf, color, [(cx - r, cy), (cx, cy - r), (cx + r, cy)])
        pygame.draw.rect(surf, color, (cx - int(r * 0.7), cy, int(r * 1.4), int(r * 0.95)))
    elif name == "restart":
        _circle_arrow(surf, color, cx, cy, int(r * 0.75), lw, clockwise=False)
    elif name == "undo":
        _circle_arrow(surf, color, cx, cy, int(r * 0.75), lw, clockwise=True)
    elif name == "hint":
        pygame.draw.circle(surf, color, (cx, cy - int(r * 0.2)), int(r * 0.65))
        pygame.draw.rect(surf, color, (cx - int(r * 0.32), cy + int(r * 0.5), int(r * 0.64), int(r * 0.45)), border_radius=2)
    elif name == "breathe":
        pygame.draw.circle(surf, color, (cx, cy), r, lw)
        pygame.draw.circle(surf, color, (cx, cy), int(r * 0.4))
    elif name == "pause":
        pygame.draw.rect(surf, color, (cx - int(r * 0.6), cy - int(r * 0.7), int(r * 0.45), int(r * 1.4)), border_radius=2)
        pygame.draw.rect(surf, color, (cx + int(r * 0.15), cy - int(r * 0.7), int(r * 0.45), int(r * 1.4)), border_radius=2)
    elif name == "play":
        pygame.draw.polygon(surf, color, [(cx - int(r * 0.5), cy - int(r * 0.7)), (cx - int(r * 0.5), cy + int(r * 0.7)), (cx + int(r * 0.7), cy)])
    elif name == "stop":
        pygame.draw.rect(surf, color, (cx - int(r * 0.6), cy - int(r * 0.6), int(r * 1.2), int(r * 1.2)), border_radius=3)
    elif name == "check":
        pygame.draw.lines(surf, color, False, [(cx - r * 0.7, cy), (cx - r * 0.2, cy + r * 0.55), (cx + r * 0.75, cy - r * 0.6)], lw + 1)
    elif name == "lock":
        pygame.draw.rect(surf, color, (cx - int(r * 0.7), cy - int(r * 0.1), int(r * 1.4), int(r * 1.0)), border_radius=3)
        pygame.draw.rect(surf, color, (cx - int(r * 0.45), cy - int(r * 0.9), int(r * 0.9), int(r * 1.1)), width=lw,
                         border_top_left_radius=int(r * 0.45), border_top_right_radius=int(r * 0.45))
    elif name == "gear":
        for k in range(8):
            a = k * math.pi / 4
            pygame.draw.line(surf, color, (cx + r * 0.55 * math.cos(a), cy + r * 0.55 * math.sin(a)),
                             (cx + r * math.cos(a), cy + r * math.sin(a)), lw + 1)
        pygame.draw.circle(surf, color, (cx, cy), int(r * 0.65), lw + 1)
    elif name == "back":
        pygame.draw.lines(surf, color, False, [(cx + r * 0.3, cy - r * 0.7), (cx - r * 0.5, cy), (cx + r * 0.3, cy + r * 0.7)], lw + 1)
    elif name == "next":
        pygame.draw.lines(surf, color, False, [(cx - r * 0.3, cy - r * 0.7), (cx + r * 0.5, cy), (cx - r * 0.3, cy + r * 0.7)], lw + 1)
    elif name == "help":
        pygame.draw.circle(surf, color, (cx, cy), r, lw)
        pygame.draw.circle(surf, color, (cx, cy + int(r * 0.45)), max(2, lw // 2 + 1))
        pygame.draw.lines(surf, color, False, _arc_points(cx, cy - r * 0.2, r * 0.3, math.pi, -0.6 + 0.0, 10)[:8], lw)
    elif name == "play_game":
        pygame.draw.polygon(surf, color, [(cx - int(r * 0.5), cy - int(r * 0.7)), (cx - int(r * 0.5), cy + int(r * 0.7)), (cx + int(r * 0.7), cy)])
    elif name == "grid":
        for gx in (-1, 1):
            for gy in (-1, 1):
                pygame.draw.rect(surf, color, (cx + gx * int(r * 0.55) - int(r * 0.35), cy + gy * int(r * 0.55) - int(r * 0.35), int(r * 0.7), int(r * 0.7)), border_radius=2)


_ICON_ALIASES = {"levels": "grid", "settings": "gear", "howto": "help", "reset": "restart", "menu": "home"}
_BASE_IMAGES: Dict[Tuple[str, str], Optional[pygame.Surface]] = {}
_TINTED: Dict[Tuple[str, str, int, Tuple[int, int, int]], Optional[pygame.Surface]] = {}


def _tinted(kind: str, name: str, size: int, color) -> Optional[pygame.Surface]:
    size = max(4, int(size))
    col = tuple(int(c) for c in color[:3])
    key = (kind, name, size, col)
    if key in _TINTED:
        return _TINTED[key]
    img = None
    try:
        if (kind, name) not in _BASE_IMAGES:
            try:
                _BASE_IMAGES[(kind, name)] = pygame.image.load(str(ASSETS_IMAGES / kind / (name + ".png"))).convert_alpha()
            except (pygame.error, FileNotFoundError, OSError):
                _BASE_IMAGES[(kind, name)] = None
        base = _BASE_IMAGES[(kind, name)]
        if base is not None:
            img = pygame.transform.smoothscale(base, (size, size))
            img.fill((col[0], col[1], col[2], 255), special_flags=pygame.BLEND_RGBA_MULT)
    except (pygame.error, ValueError, OSError):
        img = None
    _TINTED[key] = img
    return img


def draw_icon(surf, name: str, center: Tuple[int, int], size: int, color) -> None:
    img = _tinted("icons", _ICON_ALIASES.get(name, name), int(size * 1.15), color)
    if img is None:
        _draw_icon_vector(surf, name, center, size, color)
        return
    surf.blit(img, img.get_rect(center=(int(center[0]), int(center[1]))))


def draw_glyph(surf, name: str, center: Tuple[int, int], size: int, color) -> bool:
    img = _tinted("glyphs", name, size, color)
    if img is None:
        return False
    surf.blit(img, img.get_rect(center=(int(center[0]), int(center[1]))))
    return True


class Button:

    def __init__(self, key: str, label: str, rect: pygame.Rect, icon: Optional[str] = None,
                 style: str = "primary", tooltip: str = "", enabled: bool = True) -> None:
        self.key, self.label, self.rect = key, label, rect
        self.icon, self.style, self.tooltip, self.enabled = icon, style, tooltip, enabled

    def draw(self, surface, theme, fonts: Fonts, scale: float, hovered: bool, focused: bool) -> None:
        bg, fg = theme["btn_" + self.style] if self.enabled else theme["btn_disabled"]
        if hovered and self.enabled:
            bg = tuple(min(255, int(c * 1.06) + 4) for c in bg)
        radius = int(self.rect.height * 0.42)
        shadow = self.rect.move(0, int(4 * scale))
        pygame.draw.rect(surface, tuple(int(c * 0.82) for c in bg), shadow, border_radius=radius)
        pygame.draw.rect(surface, bg, self.rect, border_radius=radius)
        if theme["thick"] > 3:
            pygame.draw.rect(surface, theme["outline"], self.rect, width=2, border_radius=radius)
        font = fonts.get(self.rect.height * 0.38, bold=True)
        icon_size = int(self.rect.height * 0.46)
        if self.label:
            text_w = font.size(self.label)[0]
            total = text_w + (icon_size + int(10 * scale) if self.icon else 0)
            x = self.rect.centerx - total // 2
            if self.icon:
                draw_icon(surface, self.icon, (x + icon_size // 2, self.rect.centery), icon_size, fg)
                x += icon_size + int(10 * scale)
            draw_text(surface, self.label, font, fg, midleft=(x, self.rect.centery))
        elif self.icon:
            draw_icon(surface, self.icon, self.rect.center, icon_size, fg)
        if focused:
            pygame.draw.rect(surface, theme["focus"], self.rect.inflate(int(10 * scale), int(10 * scale)),
                             width=max(2, int(3 * scale)), border_radius=radius + int(4 * scale))


def draw_panel(surface, rect, theme, scale: float, radius: Optional[int] = None) -> None:
    radius = radius or int(24 * scale)
    pygame.draw.rect(surface, tuple(int(c * 0.93) for c in theme["panel"]), rect.move(0, int(5 * scale)), border_radius=radius)
    pygame.draw.rect(surface, theme["panel"], rect, border_radius=radius)
    pygame.draw.rect(surface, theme.get("panel_border", theme["lavender"]) if theme["thick"] <= 3 else theme["outline"], rect, width=2, border_radius=radius)


_BG_CACHE: Dict[str, object] = {}


_PAW_TRAILS = ((0.040, 0.915, -22), (0.095, 0.845, 12), (0.055, 0.765, -18), (0.112, 0.690, 14),
               (0.905, 0.968, 188), (0.940, 0.905, 164), (0.972, 0.842, 190))


def _build_background(w: int, h: int, theme, calm: bool) -> pygame.Surface:
    bg = pygame.Surface((w, h))
    bg.fill(theme["bg_calm"] if calm else theme["bg"])
    deco = pygame.Surface((w, h), pygame.SRCALPHA)
    pygame.draw.circle(deco, (*theme["lavender"], 70), (int(w * 0.04), int(h * 0.1)), int(min(w, h) * 0.22))
    pygame.draw.circle(deco, (*theme["rose"], 55), (int(w * 0.98), int(h * 0.92)), int(min(w, h) * 0.26))
    pygame.draw.circle(deco, (*EAR_SOFT, 60), (int(w * 0.92), int(h * 0.06)), int(min(w, h) * 0.12))
    bg.blit(deco, (0, 0))
    paw_size = max(16, int(min(w, h) * 0.055))
    paw = _tinted("glyphs", "paw", paw_size, EAR)
    if paw is not None:
        for fx, fy, ang in _PAW_TRAILS:
            rotated = pygame.transform.rotozoom(paw, ang, 1.0)
            rotated.set_alpha(46)
            bg.blit(rotated, rotated.get_rect(center=(int(w * fx), int(h * fy))))
    return bg


def draw_background(surface, theme, calm: bool = False) -> None:
    w, h = surface.get_size()
    calm_on = bool(calm and theme["thick"] <= 3)
    if theme["thick"] > 3:
        surface.fill(theme["bg"])
        return
    key = (w, h, calm_on, theme["bg"], theme["bg_calm"])
    if _BG_CACHE.get("key") != key:
        _BG_CACHE["surf"] = _build_background(w, h, theme, calm_on)
        _BG_CACHE["key"] = key
    surface.blit(_BG_CACHE["surf"], (0, 0))


_MASCOT_CACHE: Dict[Tuple[str, int], Optional[pygame.Surface]] = {}


def load_mascot(name: str, height: int) -> Optional[pygame.Surface]:
    height = max(8, int(height))
    key = (name, height)
    if key not in _MASCOT_CACHE:
        img = None
        try:
            src = pygame.image.load(str(ASSETS_IMAGES / (name + ".png"))).convert_alpha()
            width = max(1, round(src.get_width() * height / src.get_height()))
            img = pygame.transform.smoothscale(src, (width, height))
        except (pygame.error, FileNotFoundError, OSError):
            img = None
        _MASCOT_CACHE[key] = img
    return _MASCOT_CACHE[key]


def draw_mascot(surface, name: str, height: int, midbottom: Tuple[int, int]) -> Optional[pygame.Rect]:
    img = load_mascot(name, height)
    if img is None:
        return None
    rect = img.get_rect(midbottom=midbottom)
    sw, sh = int(rect.width * 0.62), max(4, int(rect.height * 0.06))
    shadow = pygame.Surface((sw, sh), pygame.SRCALPHA)
    pygame.draw.ellipse(shadow, (60, 50, 55, 38), shadow.get_rect())
    surface.blit(shadow, shadow.get_rect(center=(midbottom[0], midbottom[1] - sh // 3)))
    surface.blit(img, rect)
    return rect


def draw_sparkle(surface, center: Tuple[int, int], radius: int, color) -> None:
    cx, cy = center
    r, k = max(2, radius), max(1, radius // 3)
    pts = [(cx, cy - r), (cx + k, cy - k), (cx + r, cy), (cx + k, cy + k),
           (cx, cy + r), (cx - k, cy + k), (cx - r, cy), (cx - k, cy - k)]
    pygame.draw.polygon(surface, color, pts)


def draw_heart(surface, center: Tuple[int, int], size: int, color) -> None:
    cx, cy = center
    r = max(2, size // 2)
    pygame.draw.circle(surface, color, (cx - r // 2, cy - r // 3), (r * 3) // 4 + 1)
    pygame.draw.circle(surface, color, (cx + r // 2, cy - r // 3), (r * 3) // 4 + 1)
    pygame.draw.polygon(surface, color, [(cx - r - r // 8, cy - r // 6), (cx + r + r // 8, cy - r // 6), (cx, cy + r)])
