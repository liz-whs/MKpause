from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Optional, Sequence, Tuple

from .liquid import LiquidColor


@dataclass
class Bottle:

    capacity: int
    units: List[int]

    @classmethod
    def from_tuple(cls, units: Sequence[int], capacity: int) -> "Bottle":
        return cls(capacity, list(units))

    def to_tuple(self) -> Tuple[int, ...]:
        return tuple(self.units)

    @property
    def is_empty(self) -> bool:
        return not self.units

    @property
    def free_space(self) -> int:
        return self.capacity - len(self.units)

    @property
    def top_color(self) -> Optional[int]:
        return self.units[-1] if self.units else None

    @property
    def top_run(self) -> int:
        if not self.units:
            return 0
        n = 0
        for c in reversed(self.units):
            if c != self.units[-1]:
                break
            n += 1
        return n

    @property
    def is_uniform(self) -> bool:
        return bool(self.units) and all(c == self.units[0] for c in self.units)

    @property
    def is_complete(self) -> bool:
        return self.is_uniform and len(self.units) == self.capacity


def _darker(rgb, f=0.72):
    return tuple(max(0, int(c * f)) for c in rgb)


def _is_light(rgb) -> bool:
    return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) > 150


def draw_symbol(surface, symbol: str, center: Tuple[int, int], size: int, color) -> None:
    import pygame

    from .ui import draw_glyph

    if draw_glyph(surface, symbol, center, max(6, int(size)), color):
        return

    cx, cy = center
    r = max(3, size // 2)
    if symbol == "circle":
        pygame.draw.circle(surface, color, center, r)
    elif symbol == "square":
        pygame.draw.rect(surface, color, (cx - r, cy - r, 2 * r, 2 * r), border_radius=max(1, r // 4))
    elif symbol == "triangle":
        pygame.draw.polygon(surface, color, [(cx, cy - r), (cx - r, cy + r), (cx + r, cy + r)])
    elif symbol == "diamond":
        pygame.draw.polygon(surface, color, [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)])
    elif symbol == "star":
        pts = []
        for k in range(10):
            ang = -math.pi / 2 + k * math.pi / 5
            rad = r if k % 2 == 0 else r * 0.45
            pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
        pygame.draw.polygon(surface, color, pts)
    elif symbol == "heart":
        pygame.draw.circle(surface, color, (cx - r // 2, cy - r // 4), (r * 3) // 4 + 1)
        pygame.draw.circle(surface, color, (cx + r // 2, cy - r // 4), (r * 3) // 4 + 1)
        pygame.draw.polygon(surface, color, [(cx - r, cy - r // 8), (cx + r, cy - r // 8), (cx, cy + r)])
    elif symbol in ("cross", "plus"):
        t = max(2, r // 2)
        pygame.draw.rect(surface, color, (cx - r, cy - t // 2, 2 * r, t))
        pygame.draw.rect(surface, color, (cx - t // 2, cy - r, t, 2 * r))


def draw_bottle(
    surface,
    rect,
    units: Sequence[int],
    capacity: int,
    palette: Sequence[LiquidColor],
    theme: dict,
    *,
    show_patterns: bool = True,
    thick: int = 3,
    highlight: Optional[str] = None,
    anim: Optional[Tuple[str, int, float, int]] = None,
    scale: float = 1.0,
) -> None:
    import pygame

    w, h = rect.width, rect.height
    r_bottom = int(w * 0.42)
    r_top = int(6 * scale)


    if highlight:
        glow = {"selected": theme["rose"], "hint_from": theme["grass"], "hint_to": theme["rose"]}[highlight]
        g = max(3, int(5 * scale))
        pygame.draw.rect(
            surface, glow, rect.inflate(2 * g, 2 * g),
            border_top_left_radius=r_top + g, border_top_right_radius=r_top + g,
            border_bottom_left_radius=r_bottom + g, border_bottom_right_radius=r_bottom + g,
        )

        m_out, l_out = int(5 * scale), max(3, int(5 * scale))
        pygame.draw.rect(
            surface, glow,
            pygame.Rect(rect.x - m_out - g, rect.y - l_out - g, rect.width + 2 * (m_out + g), 2 * (l_out + g) + g),
            border_radius=l_out + g,
        )


    corners = dict(border_top_left_radius=r_top, border_top_right_radius=r_top,
                   border_bottom_left_radius=r_bottom, border_bottom_right_radius=r_bottom)
    pygame.draw.rect(surface, theme["glass"], rect, **corners)


    pad = int(thick + 3 * scale)
    rim = int(h * 0.07)
    area = pygame.Rect(rect.x + pad, rect.y + rim, w - 2 * pad, h - rim - pad)
    unit_h = area.height / capacity

    segs: List[Tuple[int, float]] = [(c, 1.0) for c in units]
    if anim:
        mode, count, t, color = anim
        if mode == "in":
            for k in range(max(0, len(segs) - count), len(segs)):
                segs[k] = (segs[k][0], t)
        elif mode == "out":
            segs.extend([(color, 1.0 - t)] * count)

    y = float(area.bottom)
    inner_r = max(2, r_bottom - pad // 2)
    for idx, (cid, sc) in enumerate(segs):
        if sc <= 0.01:
            continue
        seg_h = unit_h * sc
        seg = pygame.Rect(area.x, int(y - seg_h), area.width, int(math.ceil(seg_h)))
        rgb = palette[cid].rgb
        rad = min(inner_r, max(1, int(seg_h)))
        kw = dict(border_bottom_left_radius=rad, border_bottom_right_radius=rad) if idx == 0 else {}
        pygame.draw.rect(surface, rgb, seg, **kw)
        pygame.draw.rect(surface, _darker(rgb), seg, width=2, **kw)
        if show_patterns and seg_h > unit_h * 0.7:
            sym_color = (40, 30, 30) if _is_light(rgb) else (250, 245, 240)
            draw_symbol(surface, palette[cid].symbol, seg.center, int(min(seg.height, seg.width) * 0.62), sym_color)
        y -= seg_h


    hw, hh = max(3, int(w * 0.11)), int(area.height * 0.5)
    if thick <= 3 and hh >= 8:
        shine = pygame.Surface((hw, hh), pygame.SRCALPHA)
        pygame.draw.rect(shine, (255, 255, 255, 80), shine.get_rect(), border_radius=hw // 2)
        surface.blit(shine, (area.x + int(w * 0.09), area.y + int(area.height * 0.07)))


    pygame.draw.rect(surface, theme["outline"], rect, width=thick, **corners)
    mouth, lip = int(5 * scale), max(3, int(5 * scale))
    pygame.draw.rect(surface, theme["outline"],
                     pygame.Rect(rect.x - mouth, rect.y - lip, rect.width + 2 * mouth, 2 * lip), border_radius=lip)
