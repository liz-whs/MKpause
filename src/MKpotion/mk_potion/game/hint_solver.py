from __future__ import annotations

import heapq
import time
from dataclasses import dataclass
from typing import List, Optional, Tuple

from .game_logic import HintResult, State, apply_move, is_won, legal_moves

SOLVED = "solved"
UNSOLVABLE = "unsolvable"
UNKNOWN = "unknown"


@dataclass
class SolveResult:
    status: str
    moves: Optional[List[Tuple[int, int]]] = None
    nodes: int = 0


def _canonical(state: State) -> Tuple:
    return tuple(sorted(state))


def heuristic(state: State) -> int:
    segments = 0
    colors = set()
    for bottle in state:
        prev = None
        for c in bottle:
            colors.add(c)
            if c != prev:
                segments += 1
                prev = c
    return segments - len(colors)


def solve(state: State, capacity: int, weight: float = 2.0, max_nodes: int = 200_000,
          max_seconds: float = 20.0) -> SolveResult:
    if is_won(state, capacity):
        return SolveResult(SOLVED, [], 0)

    start = time.monotonic()
    counter = 0
    nodes = [(state, -1, None)]
    best_g = {_canonical(state): 0}
    heap = [(weight * heuristic(state), 0, 0, 0)]
    expanded = 0

    while heap:
        _, _, g, idx = heapq.heappop(heap)
        cur = nodes[idx][0]
        if best_g.get(_canonical(cur), 1 << 30) < g:
            continue
        if is_won(cur, capacity):
            path = []
            while idx > 0:
                path.append(nodes[idx][2])
                idx = nodes[idx][1]
            path.reverse()
            return SolveResult(SOLVED, path, expanded)
        expanded += 1
        if expanded > max_nodes or (expanded % 500 == 0 and time.monotonic() - start > max_seconds):
            return SolveResult(UNKNOWN, None, expanded)
        for s, d in legal_moves(cur, capacity):
            nxt, _ = apply_move(cur, s, d, capacity)
            key = _canonical(nxt)
            ng = g + 1
            if best_g.get(key, 1 << 30) <= ng:
                continue
            best_g[key] = ng
            nodes.append((nxt, idx, (s, d)))
            counter += 1
            heapq.heappush(heap, (ng + weight * heuristic(nxt), counter, ng, len(nodes) - 1))
    return SolveResult(UNSOLVABLE, None, expanded)


def is_solvable(state: State, capacity: int) -> bool:
    return solve(state, capacity).status == SOLVED


def find_hint(state: State, capacity: int) -> HintResult:
    if is_won(state, capacity):
        return HintResult("solved", None, "Tudo organizado! Você já resolveu esta fase.")
    result = solve(state, capacity, weight=2.0, max_nodes=60_000, max_seconds=4.0)
    if result.status == SOLVED and result.moves:
        return HintResult("ok", result.moves[0], "Tente passar o líquido da garrafa destacada para a outra.")
    if result.status == UNSOLVABLE:
        return HintResult("unsolvable", None,
                          "A partir daqui não encontrei um caminho. Sem problema: que tal reiniciar a fase?")
    return HintResult("unknown", None,
                      "Não consegui encontrar uma dica agora. Você pode desfazer algumas jogadas ou reiniciar.")
