from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Set, Tuple

from .cell import Cell, direction_name, manhattan, neighbors

SOLVED, UNSOLVABLE, UNKNOWN = "solved", "unsolvable", "unknown"


class _Budget(Exception):
    """Estourou o limite de nós ou de tempo."""


@dataclass
class SolveResult:
    status: str
    paths: Dict[int, List[Cell]] = field(default_factory=dict)
    nodes: int = 0


class _Solver:
    def __init__(self, size: int, endpoints: Dict[int, Tuple[Cell, Cell]], fixed: Dict[int, Sequence[Cell]],
                 colors: Sequence[int], node_limit: int, deadline: float, slack: Optional[int] = None,
                 reserved: Optional[Dict[Cell, int]] = None) -> None:
        self.size = size
        self.endpoints = endpoints
        self.occupied: Set[Cell] = set()
        for cells in fixed.values():
            self.occupied.update(cells)
        self.reserved = reserved or {}
        self.dots: Dict[Cell, int] = {}
        for color, (a, b) in endpoints.items():
            self.dots[a] = color
            self.dots[b] = color
        self.colors = list(colors)
        self.nodes = 0
        self.node_limit = node_limit
        self.deadline = deadline
        self.slack = slack
        self.result: Dict[int, List[Cell]] = {}

    def _tick(self) -> None:
        self.nodes += 1
        if self.nodes > self.node_limit or (self.nodes & 255 == 0 and time.monotonic() > self.deadline):
            raise _Budget()

    def _open(self, cell: Cell, color: int) -> bool:
        if cell in self.occupied:
            return False
        r = self.reserved.get(cell)
        if r is not None and r != color:
            return False
        d = self.dots.get(cell)
        return d is None or d == color

    def _dist(self, color: int) -> Optional[int]:
        a, b = self.endpoints[color]
        q = deque([(a, 0)])
        seen = {a}
        while q:
            cell, d = q.popleft()
            if cell == b:
                return d
            for n in neighbors(cell, self.size):
                if n not in seen and self._open(n, color):
                    seen.add(n)
                    q.append((n, d + 1))
        return None

    def _paths(self, color: int, shortest: int):
        """Gera caminhos de a até b, tentando primeiro os que andam em direção ao destino.

        Com `slack`, só gera caminhos com no máximo `shortest + slack` passos (busca compacta).
        """
        a, b = self.endpoints[color]
        path = [a]
        on = {a}
        limit = None if self.slack is None else shortest + self.slack

        def dfs(cell: Cell):
            self._tick()
            if cell == b:
                yield list(path)
                return
            nbrs = [n for n in neighbors(cell, self.size) if n not in on and self._open(n, color)]
            if limit is not None:
                nbrs = [n for n in nbrs if len(path) + manhattan(n, b) <= limit]
            nbrs.sort(key=lambda n: manhattan(n, b))
            for n in nbrs:
                path.append(n)
                on.add(n)
                yield from dfs(n)
                path.pop()
                on.discard(n)

        yield from dfs(a)

    def solve(self, remaining: List[int]) -> bool:
        if not remaining:
            return True
        best, best_key, best_d = None, None, 0
        for c in remaining:
            d = self._dist(c)
            if d is None:
                return False
            lib = sum(1 for e in self.endpoints[c] for n in neighbors(e, self.size) if self._open(n, c))
            key = (lib, d)
            if best_key is None or key < best_key:
                best, best_key, best_d = c, key, d
        color = best
        rest = [c for c in remaining if c != color]
        for path in self._paths(color, best_d):
            self.occupied.update(path)
            self.result[color] = path
            if self.solve(rest):
                return True
            self.occupied.difference_update(path)
            del self.result[color]
            self._tick()
        return False


def solve(size: int, endpoints: Dict[int, Tuple[Cell, Cell]], fixed: Optional[Dict[int, Sequence[Cell]]] = None,
          colors: Optional[Sequence[int]] = None, node_limit: int = 60000, time_limit: float = 0.4,
          reserved: Optional[Dict[Cell, int]] = None) -> SolveResult:
    """Procura caminhos para `colors` (por padrão, todas as cores que não estão em `fixed`).

    Primeiro tenta soluções com caminhos compactos (rápido); a última rodada não tem restrição de
    tamanho e, se terminar sem achar nada, prova que NÃO há solução (status "unsolvable").
    """
    fixed = fixed or {}
    if colors is None:
        colors = [c for c in endpoints if c not in fixed]
    deadline = time.monotonic() + time_limit
    nodes_used = 0
    phases = (2, 6, 14, None)
    for i, slack in enumerate(phases):
        last = i == len(phases) - 1
        budget = node_limit - nodes_used if last else max(1, node_limit // 6)
        s = _Solver(size, endpoints, fixed, colors, budget, deadline, slack, reserved)
        try:
            ok = s.solve(list(colors))
        except _Budget:
            nodes_used += s.nodes
            if time.monotonic() > deadline or last:
                return SolveResult(UNKNOWN, nodes=nodes_used)
            continue
        nodes_used += s.nodes
        if ok:
            return SolveResult(SOLVED, dict(s.result), nodes_used)
        if last:
            return SolveResult(UNSOLVABLE, nodes=nodes_used)
    return SolveResult(UNKNOWN, nodes=nodes_used)


@dataclass
class Hint:
    kind: str
    message: str
    color: Optional[int] = None
    cells: List[Cell] = field(default_factory=list)
    blocker: Optional[int] = None


def _orient(path: Sequence[Cell], start: Cell) -> List[Cell]:
    return list(path) if path[0] == start else list(reversed(path))


HINT_TIME_BUDGET = 0.45


def compute_hint(board, known_solution: Optional[Dict[int, Sequence[Cell]]] = None, counter: int = 0) -> Hint:
    """Dica baseada no estado REAL do tabuleiro; nunca altera nada.

    - Caminhos concluídos ficam fixos; caminhos incompletos são tratados como ocupados para as outras
      cores (a dica nunca sugere uma célula que o jogo bloquearia).
    - `known_solution` (a solução guardada da fase) só é usada se não entrar em conflito com o
      tabuleiro atual; caso contrário a solução é recalculada a partir do estado atual.
    - Se o tempo acabar antes de decidir, devolve uma orientação calma, sem sugerir movimento.
    """
    t0 = time.monotonic()

    def run(fixed, colors, reserved, cap):
        left = HINT_TIME_BUDGET - (time.monotonic() - t0)
        if left < 0.03:
            return SolveResult(UNKNOWN)
        return solve(size, endpoints, fixed=fixed, colors=colors, reserved=reserved,
                     node_limit=10 ** 7, time_limit=min(cap, left))

    size = board.size
    endpoints = board.pairs
    completed = {c: list(board.paths[c].cells) for c in board.completed_colors()}
    remaining = [c for c in board.colors if c not in completed]
    if not remaining:
        return Hint("done", "Todos os caminhos já estão conectados! Muito bem!")

    partial = {c: board.paths[c] for c in remaining if c in board.paths and len(board.paths[c].cells) > 1}
    reserved = {cell: c for c, p in partial.items() for cell in p.cells if cell not in board.dots}
    fixed_cells: Set[Cell] = set()
    for cells in completed.values():
        fixed_cells.update(cells)

    sol: Optional[Dict[int, List[Cell]]] = None
    status = UNKNOWN
    if known_solution:
        stored = {c: list(known_solution[c]) for c in remaining if c in known_solution}
        if len(stored) == len(remaining) and all(
                not (set(p) & fixed_cells) and
                all(reserved.get(cell, c) == c for cell in p) for c, p in stored.items()):
            sol, status = stored, SOLVED
    if sol is None:
        res = run(completed, remaining, reserved, 0.25)
        status, sol = res.status, res.paths

    if status == SOLVED and sol:
        return _hint_from_solution(board, sol, remaining, counter)

    if partial and status == UNSOLVABLE:
        if run(completed, remaining, None, 0.12).status == SOLVED:
            for k in sorted(partial, key=lambda c: -len(partial[c].cells)):
                res_k = {cell: c for cell, c in reserved.items() if c != k}
                if run(completed, remaining, res_k, 0.08).status == SOLVED:
                    return Hint("blocked", "Este caminho ainda não terminou e está ocupando um espaço importante. "
                                           "Que tal refazê-lo?", color=k, cells=list(partial[k].cells), blocker=k)
            return Hint("look", "Experimente refazer um dos caminhos com calma. Não há pressa.")

    if status == UNSOLVABLE and completed:
        for k in sorted(completed, key=lambda c: -len(completed[c])):
            fixed2 = {c: v for c, v in completed.items() if c != k}
            rem2 = [c for c in board.colors if c not in fixed2]
            if run(fixed2, rem2, None, 0.08).status == SOLVED:
                return Hint("blocked", "Parece que um caminho está ocupando um espaço importante. "
                                       "Tente ajustar este caminho.", color=k, cells=list(completed[k]), blocker=k)
        return Hint("look", "Experimente refazer um dos caminhos com calma. Não há pressa.")

    c = min(remaining, key=lambda k: manhattan(*endpoints[k]))
    return Hint("look", "Vá no seu ritmo. Observe o espaço livre ao redor desta cor.", color=c,
                cells=list(endpoints[c]))


def _hint_from_solution(board, sol: Dict[int, List[Cell]], remaining: List[int], counter: int) -> Hint:
    best = None
    for c in remaining:
        p = board.paths.get(c)
        if not p or len(p.cells) < 2:
            continue
        s = _orient(sol[c], p.origin)
        if s[:len(p.cells)] == p.cells and len(s) > len(p.cells):
            if best is None or len(p.cells) > best[0]:
                best = (len(p.cells), c, s)
    if best:
        n, c, s = best
        nxt = s[n:n + 3]
        word = direction_name(s[n - 1], s[n])
        return Hint("continue", "Tente seguir pelo lado %s." % _lado(word), color=c, cells=nxt)

    c = min(remaining, key=lambda k: (len(sol[k]), k))
    p = board.paths.get(c)
    start = board.pairs[c][0]
    s = _orient(sol[c], start)
    cells = s[:3]
    if p and len(p.cells) >= 2:
        return Hint("start", "Experimente refazer esta conexão a partir deste ponto.", color=c, cells=cells)
    word = direction_name(s[0], s[1])
    msgs = ["Experimente começar por este ponto.",
            "Observe o espaço livre ao redor desta cor.",
            "Tente seguir pelo lado %s." % _lado(word)]
    return Hint("start", msgs[counter % len(msgs)], color=c, cells=cells)


def _lado(word: str) -> str:
    return {"cima": "de cima", "baixo": "de baixo", "esquerda": "da esquerda", "direita": "da direita"}.get(word, word)
