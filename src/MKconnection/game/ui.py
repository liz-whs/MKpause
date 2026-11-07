from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pygame

from .settings import CREAM, DUSTY_ROSE, PEONY
from .themes import make_theme

ASSETS_FONTS = Path(__file__).resolve().parent.parent / "assets" / "fonts"
ASSETS_IMAGES = Path(__file__).resolve().parent.parent / "assets" / "images"


class Fonts:
    """Cache de fontes por tamanho. Usa uma fonte da pasta assets/fonts se existir."""

    def __init__(self) -> None:
        self.cache: Dict[Tuple[int, bool], pygame.font.Font] = {}
        files = sorted(ASSETS_FONTS.glob("*.ttf")) + sorted(ASSETS_FONTS.glob("*.otf"))
        self.file = str(files[0]) if files else None

    def get(self, size: float, bold: bool = False) -> pygame.font.Font:
        size = max(14, int(size))
        key = (size, bold)
        if key not in self.cache:
            try:
                if self.file:
                    font = pygame.font.Font(self.file, size)
                    font.set_bold(bold)
                else:
                    font = pygame.font.SysFont(
                        "nunito,quicksand,varelaround,comfortaa,fredoka,segoeui,helveticaneue,arial,dejavusans,"
                        "liberationsans,freesans", size, bold=bold)
            except (pygame.error, OSError):
                font = pygame.font.Font(None, int(size * 1.2))
            self.cache[key] = font
        return self.cache[key]


def draw_text(surface, text: str, font, color, **anchor) -> pygame.Rect:
    """Desenha texto; `anchor` recebe um atributo de Rect (center=, midtop=, topleft=...)."""
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


def draw_paragraph(surface, text, font, color, center_x: int, top: int, max_width: int,
                   align_left: Optional[int] = None) -> int:
    """Desenha um parágrafo centralizado (ou alinhado à esquerda) e devolve o y final."""
    y = top
    for line in wrap_text(text, font, max_width):
        if align_left is None:
            draw_text(surface, line, font, color, midtop=(center_x, y))
        else:
            draw_text(surface, line, font, color, topleft=(align_left, y))
        y += int(font.get_linesize() * 1.1)
    return y


def mix(a, b, t: float) -> Tuple[int, int, int]:
    """Mistura duas cores (t=0 -> a, t=1 -> b)."""
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def luminance(c) -> float:
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


_ICON_ALIASES = {"levels": "grid", "settings": "gear", "themes": "palette", "reset": "restart", "menu": "home"}
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
                _BASE_IMAGES[(kind, name)] = pygame.image.load(
                    str(ASSETS_IMAGES / kind / (name + ".png"))).convert_alpha()
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
    """Ícone arredondado. Se o arquivo não existir, desenha um pontinho (o jogo continua funcionando)."""
    img = _tinted("icons", _ICON_ALIASES.get(name, name), int(size * 1.15), color)
    if img is None:
        pygame.draw.circle(surf, color, (int(center[0]), int(center[1])), max(2, int(size * 0.18)))
        return
    surf.blit(img, img.get_rect(center=(int(center[0]), int(center[1]))))


def draw_glyph(surf, name: str, center: Tuple[int, int], size: int, color) -> bool:
    """Símbolo (coração, círculo, triângulo, quadrado, estrela, cruz, patinha, folha). False se faltar a imagem."""
    img = _tinted("glyphs", name, size, color)
    if img is None:
        return False
    surf.blit(img, img.get_rect(center=(int(center[0]), int(center[1]))))
    return True


class Button:
    """Botão grande, de cantos arredondados, com ícone opcional e dica de acessibilidade."""

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
    """Cartão arredondado com sombra suave."""
    radius = radius or int(24 * scale)
    pygame.draw.rect(surface, tuple(int(c * 0.93) for c in theme["panel"]), rect.move(0, int(5 * scale)),
                     border_radius=radius)
    pygame.draw.rect(surface, theme["panel"], rect, border_radius=radius)
    border = theme.get("panel_border", theme["lavender"]) if theme["thick"] <= 3 else theme["outline"]
    pygame.draw.rect(surface, border, rect, width=2, border_radius=radius)


_BG_CACHE: Dict[str, object] = {}

_DECOR_TRAILS = ((0.040, 0.915, -22), (0.095, 0.845, 12), (0.055, 0.765, -18), (0.112, 0.690, 14),
                 (0.905, 0.968, 188), (0.940, 0.905, 164), (0.972, 0.842, 190),
                 (0.955, 0.080, 160), (0.915, 0.150, 196))


def _build_background(w: int, h: int, theme, calm: bool, decor: str, accent) -> pygame.Surface:
    bg = pygame.Surface((w, h))
    bg.fill(theme["bg_calm"] if calm else theme["bg"])
    deco = pygame.Surface((w, h), pygame.SRCALPHA)
    pygame.draw.circle(deco, (*theme["lavender"], 70), (int(w * 0.04), int(h * 0.1)), int(min(w, h) * 0.22))
    pygame.draw.circle(deco, (*theme["rose"], 55), (int(w * 0.98), int(h * 0.92)), int(min(w, h) * 0.26))
    pygame.draw.circle(deco, (*PEONY, 170), (int(w * 0.92), int(h * 0.06)), int(min(w, h) * 0.12))
    bg.blit(deco, (0, 0))
    size = max(16, int(min(w, h) * 0.055))
    img = _tinted("glyphs", decor, size, accent)
    if img is not None:
        for fx, fy, ang in _DECOR_TRAILS:
            rotated = pygame.transform.rotozoom(img, ang, 1.0)
            rotated.set_alpha(46)
            bg.blit(rotated, rotated.get_rect(center=(int(w * fx), int(h * fy))))
    return bg


def draw_background(surface, theme, calm: bool = False, decor: str = "paw", accent=DUSTY_ROSE) -> None:
    w, h = surface.get_size()
    if theme["thick"] > 3:
        surface.fill(theme["bg"])
        return
    key = (w, h, bool(calm), decor, tuple(accent), theme["bg"], theme["bg_calm"])
    if _BG_CACHE.get("key") != key:
        _BG_CACHE["surf"] = _build_background(w, h, theme, bool(calm), decor, accent)
        _BG_CACHE["key"] = key
    surface.blit(_BG_CACHE["surf"], (0, 0))


_MASCOT_CACHE: Dict[Tuple[str, int], Optional[pygame.Surface]] = {}


def load_mascot(name: str, height: int) -> Optional[pygame.Surface]:
    """Carrega assets/images/<nome>.png na altura pedida (com cache); None se o arquivo faltar."""
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


def draw_mascot(surface, name: str, height: int, midbottom: Tuple[int, int], shadow: bool = True):
    img = load_mascot(name, height)
    if img is None:
        return None
    rect = img.get_rect(midbottom=midbottom)
    if shadow:
        sw, sh = int(rect.width * 0.62), max(4, int(rect.height * 0.06))
        sh_surf = pygame.Surface((sw, sh), pygame.SRCALPHA)
        pygame.draw.ellipse(sh_surf, (60, 50, 55, 38), sh_surf.get_rect())
        surface.blit(sh_surf, sh_surf.get_rect(center=(midbottom[0], midbottom[1] - sh // 3)))
    surface.blit(img, rect)
    return rect


def draw_sparkle(surface, center: Tuple[int, int], radius: int, color) -> None:
    """Estrelinha de quatro pontas."""
    cx, cy = center
    r, k = max(2, radius), max(1, radius // 3)
    pts = [(cx, cy - r), (cx + k, cy - k), (cx + r, cy), (cx + k, cy + k),
           (cx, cy + r), (cx - k, cy + k), (cx - r, cy), (cx - k, cy - k)]
    pygame.draw.polygon(surface, color, pts)


def draw_heart(surface, center: Tuple[int, int], size: int, color) -> None:
    """Coraçãozinho feito de dois círculos e um triângulo."""
    cx, cy = center
    r = max(2, size // 2)
    pygame.draw.circle(surface, color, (cx - r // 2, cy - r // 3), (r * 3) // 4 + 1)
    pygame.draw.circle(surface, color, (cx + r // 2, cy - r // 3), (r * 3) // 4 + 1)
    pygame.draw.polygon(surface, color, [(cx - r - r // 8, cy - r // 6), (cx + r + r // 8, cy - r // 6),
                                         (cx, cy + r)])


def draw_bubble(surface, rect, theme, scale: float, fill=None) -> None:
    """Balão de fala arredondado (usado para as mensagens acolhedoras)."""
    radius = int(rect.height * 0.5)
    fill = fill or theme["panel"]
    pygame.draw.rect(surface, tuple(int(c * 0.93) for c in fill), rect.move(0, int(3 * scale)), border_radius=radius)
    pygame.draw.rect(surface, fill, rect, border_radius=radius)
    border = theme.get("panel_border", theme["lavender"]) if theme["thick"] <= 3 else theme["outline"]
    pygame.draw.rect(surface, border, rect, width=2, border_radius=radius)
