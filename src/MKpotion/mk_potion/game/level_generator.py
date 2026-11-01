from __future__ import annotations

import random
import time
from typing import Dict, List, Optional, Tuple

from .game_logic import State, is_complete, is_uniform, is_won
from .hint_solver import SOLVED, solve

CAPACITY = 4


LEVEL_SPECS: List[Dict] = [
    {"id": 1, "name": "Primeiros Passos", "colors": 3, "bottles": 5, "target": 6},
    {"id": 2, "name": "Mais Espaço", "colors": 3, "bottles": 5, "target": 8},
    {"id": 3, "name": "Quatro Cores", "colors": 4, "bottles": 6, "target": 11},
    {"id": 4, "name": "Com Calma", "colors": 4, "bottles": 6, "target": 15},
    {"id": 5, "name": "Cinco Cores", "colors": 5, "bottles": 7, "target": 16},
    {"id": 6, "name": "Passo a Passo", "colors": 5, "bottles": 7, "target": 20},
    {"id": 7, "name": "Jardim de Cores", "colors": 6, "bottles": 8, "target": 22},
    {"id": 8, "name": "No Seu Ritmo", "colors": 6, "bottles": 8, "target": 26},
]


def shuffled_state(colors: int, bottles: int, seed: int, capacity: int = CAPACITY) -> State:
    rng = random.Random(seed)
    units = [c for c in range(colors) for _ in range(capacity)]
    rng.shuffle(units)
    result = [tuple(units[i * capacity:(i + 1) * capacity]) for i in range(colors)]
    result += [() for _ in range(bottles - colors)]
    return tuple(result)


def _acceptable(state: State, capacity: int) -> bool:
    if any(b and is_uniform(b) for b in state):
        return False
    return not is_won(state, capacity)


def generate_level(spec: Dict, capacity: int = CAPACITY, tries: int = 60) -> Dict:
    best: Optional[Tuple[int, int, State]] = None
    base = spec["id"] * 1000
    for seed in range(base, base + tries):
        st = shuffled_state(spec["colors"], spec["bottles"], seed, capacity)
        if not _acceptable(st, capacity):
            continue
        res = solve(st, capacity, weight=1.5, max_nodes=40_000, max_seconds=10)
        if res.status != SOLVED:
            continue
        gap = abs(len(res.moves) - spec["target"])
        if best is None or gap < best[0]:
            best = (gap, seed, st)
            if gap == 0:
                break
    if best is None:
        raise RuntimeError("Nenhuma configuração solucionável encontrada para a fase %s" % spec["id"])
    _, seed, st = best
    sol = solve(st, capacity, weight=1.5)
    return {
        "id": spec["id"],
        "name": spec["name"],
        "capacity": capacity,
        "seed": seed,
        "solution_length": len(sol.moves),
        "bottles": [list(b) for b in st],
    }


def generate_all(capacity: int = CAPACITY) -> Dict:
    return {"version": 1, "levels": [generate_level(s, capacity) for s in LEVEL_SPECS]}


def _target_for(level_id: int, bottles: State, capacity: int) -> int:
    for spec in LEVEL_SPECS:
        if spec["id"] == level_id:
            return spec["target"]
    res = solve(bottles, capacity, weight=1.5, max_nodes=40_000, max_seconds=2)
    return len(res.moves) if res.status == SOLVED and res.moves else 0


def randomize_bottles(bottles: State, capacity: int, level_id: int = 0,
                      rng: Optional[random.Random] = None, avoid: Optional[State] = None,
                      tries: int = 60, max_seconds: float = 0.4) -> State:
    rng = rng or random.Random()
    colors = sorted({c for b in bottles for c in b})
    n_bottles = len(bottles)
    if not colors or len(colors) > n_bottles - 1:
        return bottles
    target = _target_for(level_id, bottles, capacity)
    start = time.monotonic()
    best: Optional[Tuple[int, State]] = None
    for attempt in range(tries * 6):

        if attempt >= tries and best is not None:
            break
        elapsed = time.monotonic() - start
        if best is not None and elapsed > max_seconds:
            break
        if elapsed > 1.5:
            break
        units = [c for c in colors for _ in range(capacity)]
        rng.shuffle(units)
        packed = [tuple(units[i * capacity:(i + 1) * capacity]) for i in range(len(colors))]
        packed += [() for _ in range(n_bottles - len(colors))]
        rng.shuffle(packed)
        st: State = tuple(packed)
        if not _acceptable(st, capacity) or (avoid is not None and st == avoid):
            continue
        res = solve(st, capacity, weight=1.5, max_nodes=40_000, max_seconds=0.3)
        if res.status != SOLVED:
            continue
        gap = abs(len(res.moves) - target)
        if best is None or gap < best[0]:
            best = (gap, st)
            if gap == 0:
                break
    return best[1] if best else bottles
