from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple

from .board import Board
from .cell import Cell, in_bounds, is_adjacent
from .hint_solver import Hint, compute_hint
from .path import Path


class MoveKind(Enum):
    STARTED = "started"
    RESUMED = "resumed"
    ADDED = "added"
    UNDONE = "undone"
    TRUNCATED = "truncated"
    COMPLETED = "completed"
    FINISHED = "finished"
    CLEARED = "cleared"
    NOOP = "noop"
    IGNORED = "ignored"
    OUT_OF_BOUNDS = "out_of_bounds"
    BLOCKED_NOT_ADJACENT = "blocked_not_adjacent"
    BLOCKED_OCCUPIED = "blocked_occupied"
    BLOCKED_DOT = "blocked_dot"


BLOCKED = {MoveKind.BLOCKED_NOT_ADJACENT, MoveKind.BLOCKED_OCCUPIED, MoveKind.BLOCKED_DOT, MoveKind.OUT_OF_BOUNDS}


@dataclass
class MoveResult:
    kind: MoveKind
    color: Optional[int] = None
    cell: Optional[Cell] = None
    replaced: bool = False

    @property
    def blocked(self) -> bool:
        return self.kind in BLOCKED


class GameSession:
    def __init__(self) -> None:
        self.level = None
        self.board: Optional[Board] = None
        self.active: Optional[int] = None
        self.hint_count = 0

    def load_level(self, level) -> None:
        """`level` precisa ter: id, size, pairs {cor: (a, b)} e (opcional) solution."""
        self.level = level
        self.board = Board(level.size, level.pairs)
        self.active = None
        self.hint_count = 0

    def reset(self) -> None:
        if self.level is not None:
            self.load_level(self.level)

    def completed_connections(self) -> List[int]:
        return self.board.completed_colors() if self.board else []

    def progress(self) -> Tuple[int, int]:
        return (len(self.completed_connections()), len(self.board.pairs)) if self.board else (0, 0)

    def is_won(self) -> bool:
        return bool(self.board) and len(self.completed_connections()) == len(self.board.pairs)

    def start_connection(self, cell: Cell) -> MoveResult:
        """Clicou em `cell`: ponto = (re)começa a conexão; célula de um caminho = retoma dali."""
        b = self.board
        if not in_bounds(cell, b.size):
            return MoveResult(MoveKind.OUT_OF_BOUNDS, cell=cell)
        dot = b.dot_color(cell)
        if dot is not None:
            replaced = dot in b.paths and len(b.paths[dot].cells) > 1
            b.clear_path(dot)
            b.set_path(Path(dot, [cell]))
            self.active = dot
            return MoveResult(MoveKind.STARTED, dot, cell, replaced)
        color = b.path_color_at(cell)
        if color is None:
            self.active = None
            return MoveResult(MoveKind.IGNORED, cell=cell)
        p = b.paths[color]
        removed = p.truncate_to(p.cells.index(cell))
        b.release(removed)
        self.active = color
        return MoveResult(MoveKind.RESUMED, color, cell)

    def add_segment(self, cell: Cell) -> MoveResult:
        """Tenta levar o caminho ativo até `cell` (precisa ser vizinha da ponta, na horizontal/vertical)."""
        b = self.board
        color = self.active
        if color is None or color not in b.paths:
            return MoveResult(MoveKind.NOOP, cell=cell)
        p = b.paths[color]
        if p.complete:
            return MoveResult(MoveKind.NOOP, color, cell)
        if not in_bounds(cell, b.size):
            return MoveResult(MoveKind.OUT_OF_BOUNDS, color, cell)
        head = p.head
        if cell == head:
            return MoveResult(MoveKind.NOOP, color, cell)
        if not is_adjacent(head, cell):
            return MoveResult(MoveKind.BLOCKED_NOT_ADJACENT, color, cell)
        if len(p.cells) >= 2 and cell == p.cells[-2]:
            removed = p.cells.pop()
            b.release([removed])
            return MoveResult(MoveKind.UNDONE, color, cell)
        if cell in p.cells:
            removed = p.truncate_to(p.cells.index(cell))
            b.release(removed)
            return MoveResult(MoveKind.TRUNCATED, color, cell)
        dot = b.dot_color(cell)
        if dot is not None and dot != color:
            return MoveResult(MoveKind.BLOCKED_DOT, color, cell)
        if dot is None and b.occupant(cell) is not None:
            return MoveResult(MoveKind.BLOCKED_OCCUPIED, color, cell)
        p.cells.append(cell)
        if dot == color:
            p.complete = True
            self.active = None
            return MoveResult(MoveKind.COMPLETED, color, cell)
        b.occupy(cell, color)
        return MoveResult(MoveKind.ADDED, color, cell)

    def drag_to(self, cells: Iterable[Cell]) -> List[MoveResult]:
        """Aplica uma sequência de células vizinhas (arraste rápido). Para na primeira que for bloqueada."""
        results: List[MoveResult] = []
        for cell in cells:
            res = self.add_segment(cell)
            results.append(res)
            if res.blocked or (res.kind == MoveKind.NOOP and self.active is None):
                break
        return results

    def follow_cells(self, cells: Iterable[Cell]) -> List[MoveResult]:
        """Arraste do mouse: aplica as células por onde o cursor passou, com segurança.

        Células ainda longe da ponta do caminho são ignoradas (o cursor pode ter saído e voltado);
        assim que chegam perto, o caminho segue. Um salto no meio do movimento, ou uma célula
        bloqueada, interrompe o movimento sem criar diagonais nem pular células.
        """
        results: List[MoveResult] = []
        moved = False
        for cell in cells:
            color = self.active
            if color is None or color not in self.board.paths:
                break
            head = self.board.paths[color].head
            if cell == head:
                continue
            if not is_adjacent(head, cell):
                if moved:
                    break
                continue
            res = self.add_segment(cell)
            results.append(res)
            if res.blocked:
                break
            moved = True
        return results

    def finish_connection(self) -> MoveResult:
        """Soltou o mouse. Um caminho incompleto fica como está (dá para continuar ou refazer)."""
        color, self.active = self.active, None
        return MoveResult(MoveKind.FINISHED, color) if color is not None else MoveResult(MoveKind.NOOP)

    def cancel_connection(self, color: Optional[int] = None) -> MoveResult:
        """Apaga o caminho (sem penalização) e libera as células dele."""
        color = self.active if color is None else color
        if color is None or color not in self.board.paths:
            return MoveResult(MoveKind.NOOP, color)
        self.board.clear_path(color)
        if self.active == color:
            self.active = None
        return MoveResult(MoveKind.CLEARED, color)

    def hint(self) -> Hint:
        self.hint_count += 1
        known = getattr(self.level, "solution", None)
        return compute_hint(self.board, known, self.hint_count - 1)

    def snapshot(self) -> Dict[str, Dict]:
        return {str(c): {"cells": p.to_list(), "complete": p.complete} for c, p in self.board.paths.items()}

    def restore(self, snap: Dict[str, Dict]) -> None:
        self.board.clear_all()
        self.active = None
        for key, data in snap.items():
            color = int(key)
            cells = [tuple(c) for c in data["cells"]]
            path = Path(color, cells, bool(data.get("complete")))
            if color in self.board.pairs and not validate_path(self.board, path):
                self.board.set_path(path)
        if validate_board(self.board):
            self.board.clear_all()


def validate_path(board: Board, path: Path) -> List[str]:
    """Lista de problemas de um caminho (vazia se estiver tudo certo)."""
    errs: List[str] = []
    cells = path.cells
    if not cells:
        return ["caminho vazio"]
    if cells[0] not in board.pairs[path.color]:
        errs.append("não começa em um ponto da própria cor")
    if len(set(cells)) != len(cells):
        errs.append("repete células")
    for a, b in zip(cells, cells[1:]):
        if not is_adjacent(a, b):
            errs.append("passo inválido %s -> %s" % (a, b))
    for cell in cells:
        if not in_bounds(cell, board.size):
            errs.append("fora da grade")
        d = board.dot_color(cell)
        if d is not None and d != path.color:
            errs.append("passa por ponto de outra cor")
    if path.complete and cells[-1] != board.other_dot(path.color, cells[0]):
        errs.append("marcado como completo sem chegar ao outro ponto")
    return errs


def validate_board(board: Board) -> List[str]:
    errs: List[str] = []
    seen: Dict[Cell, int] = {}
    for color, p in board.paths.items():
        errs += ["cor %d: %s" % (color, e) for e in validate_path(board, p)]
        for cell in p.cells:
            if cell in seen and seen[cell] != color:
                errs.append("célula %s usada por duas cores" % (cell,))
            seen[cell] = color
    if not board.is_consistent():
        errs.append("ocupação inconsistente")
    return errs
