from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Sequence, Tuple

RGB = Tuple[int, int, int]


def hex_to_rgb(code: str) -> RGB:
    code = code.lstrip("#")
    return int(code[0:2], 16), int(code[2:4], 16), int(code[4:6], 16)


PALETTE: Dict[str, str] = {
    "Lavender": "#CCC3D1",
    "Leaf": "#C1BC77",
    "Grass": "#8D8B4C",
    "Jungle": "#65613F",
    "Sky": "#AFB8CD",
    "Cacao": "#6B403B",
    "Peony": "#F7DDD5",
    "Dusty Rose": "#D8A4AF",
}


@dataclass(frozen=True)
class LiquidColor:

    id: int
    name: str
    hex: str
    symbol: str

    @property
    def rgb(self) -> RGB:
        return hex_to_rgb(self.hex)


LIQUID_COLORS: List[LiquidColor] = [
    LiquidColor(0, "Rosa", PALETTE["Dusty Rose"], "heart"),
    LiquidColor(1, "Azul", PALETTE["Sky"], "circle"),
    LiquidColor(2, "Amarelo-esverdeado", PALETTE["Leaf"], "triangle"),
    LiquidColor(3, "Marrom", PALETTE["Cacao"], "square"),
    LiquidColor(4, "Verde", PALETTE["Grass"], "star"),
    LiquidColor(5, "Pêssego", PALETTE["Peony"], "plus"),
]


HIGH_CONTRAST_COLORS: List[LiquidColor] = [
    LiquidColor(0, "Rosa", "#D6336C", "heart"),
    LiquidColor(1, "Azul", "#1C6DD0", "circle"),
    LiquidColor(2, "Amarelo", "#F0C000", "triangle"),
    LiquidColor(3, "Marrom", "#4A2A26", "square"),
    LiquidColor(4, "Verde", "#2E8B3E", "star"),
    LiquidColor(5, "Roxo", "#7E3FB8", "plus"),
]


MIN_COLOR_DISTANCE = 80.0


def color_distance(a: RGB, b: RGB) -> float:
    r_mean = (a[0] + b[0]) / 2
    dr, dg, db = (a[0] - b[0], a[1] - b[1], a[2] - b[2])
    return ((2 + r_mean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - r_mean) / 256) * db * db) ** 0.5


def min_pairwise_distance(colors: Sequence[LiquidColor]) -> float:
    best = float("inf")
    for i in range(len(colors)):
        for j in range(i + 1, len(colors)):
            best = min(best, color_distance(colors[i].rgb, colors[j].rgb))
    return best


def _shift_lightness(rgb: RGB, amount: float) -> RGB:
    if amount >= 0:
        return tuple(int(c + (255 - c) * amount) for c in rgb)
    return tuple(int(c * (1 + amount)) for c in rgb)


def ensure_distinct(colors: Sequence[LiquidColor], min_distance: float = MIN_COLOR_DISTANCE) -> List[LiquidColor]:
    result = list(colors)
    for j in range(1, len(result)):
        for i in range(j):
            for _ in range(12):
                if color_distance(result[i].rgb, result[j].rgb) >= min_distance:
                    break
                lum = sum(result[j].rgb) / 3
                amount = 0.06 if lum < 140 else -0.06
                new_rgb = _shift_lightness(result[j].rgb, amount)
                result[j] = LiquidColor(result[j].id, result[j].name, "#%02X%02X%02X" % new_rgb, result[j].symbol)
    return result


def get_palette(high_contrast: bool = False) -> List[LiquidColor]:
    return ensure_distinct(HIGH_CONTRAST_COLORS if high_contrast else LIQUID_COLORS)
