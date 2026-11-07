from __future__ import annotations

import math
from typing import Dict, List, Optional, Sequence, Tuple

import pygame

from .cell import Cell
from .settings import CREAM, symbol_ink
from .themes import BoardTheme
from .ui import _tinted, draw_glyph, mix



class BoardView:
    def __init__(self) -> None:
        self.size = 0
        self.cell = 0
        self.origin: Tuple[int, int] = (0, 0)
        self.rect = pygame.Rect(0, 0, 0, 0)
        self.frame = pygame.Rect(0, 0, 0, 0)

    def layout(self, area: pygame.Rect, size: int) -> None:
        """Centraliza o maior quadrado possível dentro de `area`, com células de tamanho inteiro."""
        self.size = size
        avail = min(area.width, area.height)
        self.cell = max(12, int(avail / (size + 0.45)))
        board_px = self.cell * size
        self.origin = (area.centerx - board_px // 2, area.centery - board_px // 2)
        self.rect = pygame.Rect(self.origin[0], self.origin[1], board_px, board_px)
        pad = max(6, int(self.cell * 0.16))
        self.frame = self.rect.inflate(2 * pad, 2 * pad)

    def cell_at(self, pos: Tuple[float, float]) -> Optional[Cell]:
        """Célula sob o ponto da tela (None se estiver fora das células)."""
        x, y = pos[0] - self.origin[0], pos[1] - self.origin[1]
        if x < 0 or y < 0:
            return None
        c, r = int(x // self.cell), int(y // self.cell)
        return (r, c) if 0 <= r < self.size and 0 <= c < self.size else None

    def center(self, cell: Cell) -> Tuple[int, int]:
        return (int(self.origin[0] + (cell[1] + 0.5) * self.cell), int(self.origin[1] + (cell[0] + 0.5) * self.cell))

    def cell_rect(self, cell: Cell) -> pygame.Rect:
        return pygame.Rect(self.origin[0] + cell[1] * self.cell, self.origin[1] + cell[0] * self.cell,
                           self.cell, self.cell)

    def draw(self, surface, session, bt: BoardTheme, palette: Sequence, show_symbols: bool, high_contrast: bool,
             scale: float, t: float = 0.0, hint=None, reduced_motion: bool = False) -> None:
        board = session.board
        cs = self.cell
        pad = self.frame.width - self.rect.width
        pygame.draw.rect(surface, tuple(int(c * 0.8) for c in bt.board_border), self.frame.move(0, int(5 * scale)),
                         border_radius=int(cs * 0.34))
        pygame.draw.rect(surface, bt.board_border, self.frame, border_radius=int(cs * 0.34))
        pygame.draw.rect(surface, bt.board_bg, self.rect, border_radius=int(cs * 0.18))

        lw = 2 if high_contrast else 1
        for i in range(1, self.size):
            x = self.origin[0] + i * cs
            y = self.origin[1] + i * cs
            pygame.draw.line(surface, bt.board_line, (x, self.rect.top + 2), (x, self.rect.bottom - 3), lw)
            pygame.draw.line(surface, bt.board_line, (self.rect.left + 2, y), (self.rect.right - 3, y), lw)

        for color, p in board.paths.items():
            if p.complete:
                tint = mix(bt.board_bg, palette[color].rgb, 0.24)
                for cell in p.cells:
                    pygame.draw.rect(surface, tint, self.cell_rect(cell).inflate(-2, -2), border_radius=int(cs * 0.12))

        r = max(4, int(cs * 0.27))
        for color, p in board.paths.items():
            if len(p.cells) < 2:
                continue
            col = palette[color].rgb
            if color == session.active:
                self._draw_path(surface, p.cells, mix(bt.board_bg, col, 0.4), int(r * 1.6))
            self._draw_path(surface, p.cells, col, r)
        if session.active is not None and session.active in board.paths:
            head = self.center(board.paths[session.active].head)
            ring = symbol_ink(palette[session.active].rgb)
            pygame.draw.circle(surface, ring, head, int(r * 0.62), width=max(2, int(cs * 0.06)))

        dr = int(cs * 0.36)
        for color, (a, b) in board.pairs.items():
            pc = palette[color]
            for cell in (a, b):
                self._draw_dot(surface, self.center(cell), dr, pc, show_symbols, high_contrast, cs)

        if hint is not None and hint.cells:
            pulse = 0.0 if reduced_motion else math.sin(t * 2.0) * 0.04
            for i, cell in enumerate(hint.cells):
                c = self.center(cell)
                if cell in board.dots:
                    pygame.draw.circle(surface, CREAM, c, int(cs * (0.47 + pulse)), width=max(3, int(cs * 0.07)))
                else:
                    pygame.draw.circle(surface, CREAM, c, int(cs * (0.30 + pulse)), width=max(3, int(cs * 0.06)))
                    pygame.draw.circle(surface, CREAM, c, max(2, int(cs * 0.07)))

        self._draw_corners(surface, bt, pad, cs)

    def _draw_path(self, surface, cells: List[Cell], color, r: int) -> None:
        centers = [self.center(c) for c in cells]
        for (x0, y0), (x1, y1) in zip(centers, centers[1:]):
            if y0 == y1:
                rect = pygame.Rect(min(x0, x1), y0 - r, abs(x1 - x0), 2 * r)
            else:
                rect = pygame.Rect(x0 - r, min(y0, y1), 2 * r, abs(y1 - y0))
            pygame.draw.rect(surface, color, rect)
        for c in centers:
            pygame.draw.circle(surface, color, c, r)

    def _draw_dot(self, surface, center, dr, pc, show_symbols: bool, high_contrast: bool, cs: int) -> None:
        if high_contrast:
            pygame.draw.circle(surface, (0, 0, 0), center, dr + max(3, int(cs * 0.07)))
        pygame.draw.circle(surface, CREAM, center, dr + max(1, int(cs * 0.035)))
        pygame.draw.circle(surface, pc.rgb, center, max(2, dr - max(2, int(cs * 0.04))))
        if show_symbols:
            fg = symbol_ink(pc.rgb)
            draw_glyph(surface, pc.symbol, center, int(cs * 0.40), fg)

    _corner_cache: Dict[Tuple[str, int, Tuple[int, int, int], int], Optional[pygame.Surface]] = {}

    def _draw_corners(self, surface, bt: BoardTheme, pad: int, cs: int) -> None:
        size = max(10, int(cs * 0.42))
        f = self.frame
        for (x, y), ang in (((f.left, f.top), 20), ((f.right, f.top), 110), ((f.right, f.bottom), 200), ((f.left, f.bottom), 290)):
            key = (bt.decor, size, tuple(bt.accent), ang)
            if key not in BoardView._corner_cache:
                img = _tinted("glyphs", bt.decor, size, bt.accent)
                if img is None:
                    BoardView._corner_cache[key] = None
                else:
                    rot = pygame.transform.rotozoom(img, ang, 1.0)
                    rot.set_alpha(120)
                    BoardView._corner_cache[key] = rot
            rot = BoardView._corner_cache[key]
            if rot is not None:
                surface.blit(rot, rot.get_rect(center=(x, y)))
