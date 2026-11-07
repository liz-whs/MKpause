from __future__ import annotations

from typing import Dict, Iterable, List, Optional, Tuple

from .cell import Cell, in_bounds
from .path import Path


class Board:
    def __init__(self, size: int, pairs: Dict[int, Tuple[Cell, Cell]]) -> None:
        self.size = size
        self.pairs: Dict[int, Tuple[Cell, Cell]] = {int(k): (tuple(a), tuple(b)) for k, (a, b) in pairs.items()}
        self.dots: Dict[Cell, int] = {}
        for color, (a, b) in self.pairs.items():
            self.dots[a] = color
            self.dots[b] = color
        self.paths: Dict[int, Path] = {}
        self._occupant: Dict[Cell, int] = {}

    @property
    def colors(self) -> List[int]:
        return sorted(self.pairs)

    def dot_color(self, cell: Cell) -> Optional[int]:
        return self.dots.get(cell)

    def other_dot(self, color: int, cell: Cell) -> Cell:
        a, b = self.pairs[color]
        return b if cell == a else a

    def occupant(self, cell: Cell) -> Optional[int]:
        """Cor que ocupa a célula: o ponto que está nela ou o caminho que passa por ela."""
        if cell in self.dots:
            return self.dots[cell]
        return self._occupant.get(cell)

    def path_color_at(self, cell: Cell) -> Optional[int]:
        """Cor do caminho que passa pela célula (inclui as pontas dos caminhos), ou None."""
        for color, p in self.paths.items():
            if cell in p.cells:
                return color
        return None

    def is_free(self, cell: Cell) -> bool:
        return in_bounds(cell, self.size) and cell not in self.dots and cell not in self._occupant

    def free_cells(self) -> List[Cell]:
        return [(r, c) for r in range(self.size) for c in range(self.size) if self.is_free((r, c))]

    def completed_colors(self) -> List[int]:
        return sorted(c for c, p in self.paths.items() if p.complete)

    def set_path(self, path: Path) -> None:
        self.clear_path(path.color)
        self.paths[path.color] = path
        for cell in path.cells:
            if cell not in self.dots:
                self._occupant[cell] = path.color

    def release(self, cells: Iterable[Cell]) -> None:
        for cell in cells:
            self._occupant.pop(cell, None)

    def occupy(self, cell: Cell, color: int) -> None:
        if cell not in self.dots:
            self._occupant[cell] = color

    def clear_path(self, color: int) -> None:
        p = self.paths.pop(color, None)
        if p:
            self.release(p.cells)

    def clear_all(self) -> None:
        self.paths.clear()
        self._occupant.clear()

    def is_consistent(self) -> bool:
        """A ocupação guardada coincide exatamente com as células dos caminhos?"""
        expected: Dict[Cell, int] = {}
        for color, p in self.paths.items():
            for cell in p.cells:
                if cell in self.dots:
                    continue
                if cell in expected:
                    return False
                expected[cell] = color
        return expected == self._occupant
