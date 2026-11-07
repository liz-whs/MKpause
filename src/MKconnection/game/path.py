from __future__ import annotations

from dataclasses import dataclass, field
from typing import List

from .cell import Cell


@dataclass
class Path:
    color: int
    cells: List[Cell] = field(default_factory=list)
    complete: bool = False

    @property
    def origin(self) -> Cell:
        return self.cells[0]

    @property
    def head(self) -> Cell:
        return self.cells[-1]

    def __len__(self) -> int:
        return len(self.cells)

    def truncate_to(self, index: int) -> List[Cell]:
        """Mantém as células até `index` (inclusive) e devolve as removidas."""
        removed = self.cells[index + 1:]
        self.cells = self.cells[:index + 1]
        self.complete = False
        return removed

    def to_list(self) -> List[List[int]]:
        return [[r, c] for r, c in self.cells]
