from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Tuple

from .settings import CACAO, CREAM, DUSTY_ROSE, JUNGLE, LAVENDER, LEAF, PALETTE, PEONY, SKY

RGB = Tuple[int, int, int]


@dataclass(frozen=True)
class BoardTheme:
    key: str
    label: str
    description: str
    board_bg: RGB
    board_line: RGB
    board_border: RGB
    accent: RGB
    decor: str


THEMES: Tuple[BoardTheme, ...] = (
    BoardTheme("chinchila", "Chinchila", "Lavanda suave, com patinhas", (64, 54, 82), (88, 77, 108),
               (47, 40, 62), DUSTY_ROSE, "paw"),
    BoardTheme("jardim", "Jardim", "Verde-oliva, com folhinhas", (58, 56, 38), (82, 80, 56),
               (42, 40, 27), LEAF, "leaf"),
    BoardTheme("noite", "Noite", "Azul arroxeado, com estrelas", (48, 57, 90), (72, 82, 116),
               (35, 42, 68), SKY, "star"),
)


def get_theme(key: str) -> BoardTheme:
    for t in THEMES:
        if t.key == key:
            return t
    return THEMES[0]


def make_theme(high_contrast: bool = False) -> Dict:
    """Cores da interface (fundo, texto, botões). Tudo vem da paleta MKpause ou de tons derivados dela."""
    theme = {
        "bg": CREAM,
        "bg_calm": (241, 236, 244),
        "panel": (255, 252, 250),
        "panel_border": (240, 214, 207),
        "text": CACAO,
        "text_soft": JUNGLE,
        "outline": (140, 96, 90),
        "rose": DUSTY_ROSE,
        "grass": PALETTE["Grass"],
        "leaf": LEAF,
        "sky": SKY,
        "lavender": LAVENDER,
        "peony": PEONY,
        "cacao": CACAO,
        "jungle": JUNGLE,
        "focus": CACAO,
        "thick": 3,
        "btn_primary": (CACAO, CREAM),
        "btn_secondary": (PEONY, CACAO),
        "btn_soft": (LAVENDER, CACAO),
        "btn_rose": (DUSTY_ROSE, CACAO),
        "btn_sky": (SKY, CACAO),
        "btn_leaf": (LEAF, CACAO),
        "btn_disabled": ((234, 228, 228), (150, 134, 132)),
    }
    if high_contrast:
        theme.update({
            "bg": (255, 255, 255), "bg_calm": (255, 255, 255), "panel": (255, 255, 255),
            "text": (20, 12, 12), "text_soft": (45, 35, 35), "outline": (20, 12, 12),
            "cacao": (20, 12, 12), "jungle": (20, 12, 12), "focus": (0, 90, 200), "thick": 5,
            "btn_primary": ((70, 30, 28), (255, 255, 255)),
            "btn_secondary": ((255, 255, 255), (20, 12, 12)),
            "btn_soft": ((225, 232, 250), (20, 12, 12)),
            "btn_rose": ((255, 225, 235), (20, 12, 12)),
            "btn_sky": ((220, 232, 255), (20, 12, 12)),
            "btn_leaf": ((240, 240, 190), (20, 12, 12)),
            "btn_disabled": ((235, 235, 235), (90, 90, 90)),
        })
    return theme
