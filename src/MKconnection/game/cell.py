from __future__ import annotations

from typing import List, Optional, Tuple

Cell = Tuple[int, int]

DIRECTIONS: Tuple[Cell, ...] = ((-1, 0), (1, 0), (0, -1), (0, 1))


def in_bounds(cell: Cell, size: int) -> bool:
    return 0 <= cell[0] < size and 0 <= cell[1] < size


def is_adjacent(a: Cell, b: Cell) -> bool:
    """Vizinhas na horizontal ou na vertical (diagonal NÃO conta)."""
    return abs(a[0] - b[0]) + abs(a[1] - b[1]) == 1


def neighbors(cell: Cell, size: int) -> List[Cell]:
    out = []
    for dr, dc in DIRECTIONS:
        n = (cell[0] + dr, cell[1] + dc)
        if in_bounds(n, size):
            out.append(n)
    return out


def manhattan(a: Cell, b: Cell) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def direction_name(a: Cell, b: Cell) -> str:
    """Palavra em português para o passo de `a` até `b` (células vizinhas)."""
    d = (b[0] - a[0], b[1] - a[1])
    return {(-1, 0): "cima", (1, 0): "baixo", (0, -1): "esquerda", (0, 1): "direita"}.get(d, "")


def straight_cells(a: Cell, b: Cell) -> Optional[List[Cell]]:
    """Células de `a` (exclusive) até `b` (inclusive) quando estão na mesma linha ou coluna.

    Devolve None se não estiverem alinhadas (ou se forem a mesma célula).
    """
    if a == b:
        return None
    if a[0] == b[0]:
        step = 1 if b[1] > a[1] else -1
        return [(a[0], c) for c in range(a[1] + step, b[1] + step, step)]
    if a[1] == b[1]:
        step = 1 if b[0] > a[0] else -1
        return [(r, a[1]) for r in range(a[0] + step, b[0] + step, step)]
    return None


def cells_along_segment(p0: Tuple[float, float], p1: Tuple[float, float], origin: Tuple[float, float],
                        cell_size: float, size: int) -> Optional[List[Cell]]:
    """Células atravessadas por um movimento do mouse de p0 até p1 (coordenadas de tela).

    Usado no arraste rápido: se o cursor "pula" várias células, devolve a sequência de células
    vizinhas por onde a linha passou, na ordem. Se a linha passar exatamente por um canto (o que
    obrigaria a escolher entre dois caminhos, ou a andar na diagonal), o movimento é ambíguo:
    devolve None e o chamador deve ignorá-lo. Também devolve None se sair da grade.
    """
    def to_cell(p: Tuple[float, float]) -> Cell:
        return (int((p[1] - origin[1]) // cell_size), int((p[0] - origin[0]) // cell_size))

    dist = max(abs(p1[0] - p0[0]), abs(p1[1] - p0[1]))
    steps = max(1, int(dist / max(1.0, cell_size / 8.0)) + 1)
    seq: List[Cell] = []
    for i in range(steps + 1):
        t = i / steps
        c = to_cell((p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t))
        if not seq or seq[-1] != c:
            seq.append(c)
    if not all(in_bounds(c, size) for c in seq):
        return None
    for a, b in zip(seq, seq[1:]):
        if not is_adjacent(a, b):
            return None
    return seq
