from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Optional, Tuple

log = logging.getLogger(__name__)
DEFAULT_PATH = Path(__file__).resolve().parent.parent / "data" / "settings.json"

DESIGN_SIZE = (1000, 800)
WINDOW_SIZE = (900, 640)
SCREEN_FRACTION = 0.8
MIN_WINDOW = (640, 560)

PALETTE_HEX = {
    "Lavender": "#CCC3D1", "Leaf": "#C1BC77", "Grass": "#8D8B4C", "Jungle": "#65613F",
    "Sky": "#AFB8CD", "Cacao": "#6B403B", "Peony": "#F7DDD5", "Dusty Rose": "#D8A4AF",
}


def hex_to_rgb(code: str) -> Tuple[int, int, int]:
    code = code.lstrip("#")
    return int(code[0:2], 16), int(code[2:4], 16), int(code[4:6], 16)


PALETTE = {name: hex_to_rgb(code) for name, code in PALETTE_HEX.items()}

LAVENDER = PALETTE["Lavender"]
LEAF = PALETTE["Leaf"]
GRASS = PALETTE["Grass"]
JUNGLE = PALETTE["Jungle"]
SKY = PALETTE["Sky"]
CACAO = PALETTE["Cacao"]
PEONY = PALETTE["Peony"]
DUSTY_ROSE = PALETTE["Dusty Rose"]

CREAM = (251, 244, 240)
INK = (62, 38, 36)


@dataclass(frozen=True)
class PathColor:
    id: int
    name: str
    rgb: Tuple[int, int, int]
    symbol: str


LILAC = (203, 171, 213)
CACAO_LIGHT = (173, 121, 107)
PATH_COLORS: Tuple[PathColor, ...] = (
    PathColor(0, "Rosa", DUSTY_ROSE, "heart"),
    PathColor(1, "Azul", SKY, "circle"),
    PathColor(2, "Folha", LEAF, "triangle"),
    PathColor(3, "Pêssego", PEONY, "square"),
    PathColor(4, "Grama", GRASS, "star"),
    PathColor(5, "Lilás", LILAC, "plus"),
    PathColor(6, "Cacau", CACAO_LIGHT, "paw"),
)

HC_PATH_COLORS: Tuple[PathColor, ...] = (
    PathColor(0, "Rosa", (255, 64, 129), "heart"),
    PathColor(1, "Azul", (92, 160, 255), "circle"),
    PathColor(2, "Amarelo", (255, 214, 0), "triangle"),
    PathColor(3, "Laranja", (255, 127, 0), "square"),
    PathColor(4, "Verde", (0, 200, 83), "star"),
    PathColor(5, "Roxo", (192, 128, 255), "plus"),
    PathColor(6, "Branco", (240, 240, 240), "paw"),
)


@dataclass
class Settings:
    sound_enabled: bool = True
    volume: float = 0.5
    reduced_motion: bool = False
    high_contrast: bool = False
    show_symbols: bool = True

    def validate(self) -> None:
        self.volume = max(0.0, min(1.0, float(self.volume)))
        for name in ("sound_enabled", "reduced_motion", "high_contrast", "show_symbols"):
            setattr(self, name, bool(getattr(self, name)))

    @property
    def symbols_visible(self) -> bool:
        return self.show_symbols or self.high_contrast


class SettingsStore:
    def __init__(self, path: Optional[Path] = None) -> None:
        self.path = Path(path) if path else DEFAULT_PATH
        self.settings = Settings()
        self.load()

    def load(self) -> None:
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
            known = {k: v for k, v in raw.items() if k in Settings.__dataclass_fields__}
            self.settings = Settings(**known)
            self.settings.validate()
        except FileNotFoundError:
            self.settings = Settings()
        except (OSError, ValueError, TypeError) as exc:
            log.warning("Configurações inválidas (%s); usando padrão.", exc)
            self.settings = Settings()

    def save(self) -> bool:
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            self.path.write_text(json.dumps(asdict(self.settings), indent=2), encoding="utf-8")
            return True
        except OSError as exc:
            log.warning("Não foi possível salvar as configurações: %s", exc)
            return False


def _luminance(rgb) -> float:
    def lin(c: int) -> float:
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2])


def contrast_ratio(a, b) -> float:
    """Razão de contraste da WCAG entre duas cores (1 a 21)."""
    la, lb = _luminance(a), _luminance(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def symbol_ink(rgb: Tuple[int, int, int]) -> Tuple[int, int, int]:
    """Cor do símbolo dentro de um ponto: a (escura ou clara) que dá o MAIOR contraste com a cor do ponto."""
    return INK if contrast_ratio(rgb, INK) >= contrast_ratio(rgb, CREAM) else CREAM
