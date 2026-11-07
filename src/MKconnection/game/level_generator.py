from __future__ import annotations

import random
from collections import deque
from typing import Dict, List, Optional, Set, Tuple

from .cell import DIRECTIONS, Cell, in_bounds, manhattan
from .level_validator import CATEGORY_OF, validate_level

NUM_COLORS = 7

LEVEL_SPECS: List[dict] = [
    {"id": 1, "size": 6, "pairs": 3, "length": (4, 7), "min_dist": 3, "min_turns": 2, "fail": (0.0, 0.35)},
    {"id": 2, "size": 6, "pairs": 3, "length": (6, 9), "min_dist": 3, "min_turns": 6, "fail": (0.0, 0.6)},
    {"id": 3, "size": 6, "pairs": 4, "length": (5, 8), "min_dist": 3, "min_turns": 8, "fail": (0.3, 0.95)},
    {"id": 4, "size": 8, "pairs": 4, "length": (7, 11), "min_dist": 4, "min_turns": 8, "fail": (0.2, 0.9)},
    {"id": 5, "size": 8, "pairs": 5, "length": (7, 11), "min_dist": 4, "min_turns": 14, "fail": (0.4, 0.95)},
    {"id": 6, "size": 8, "pairs": 5, "length": (8, 12), "min_dist": 4, "min_turns": 16, "fail": (0.6, 1.0)},
    {"id": 7, "size": 10, "pairs": 6, "length": (9, 13), "min_dist": 5, "min_turns": 18, "fail": (0.6, 1.0)},
    {"id": 8, "size": 10, "pairs": 6, "length": (11, 16), "min_dist": 5, "min_turns": 22, "fail": (0.7, 1.0)},
    {"id": 9, "size": 10, "pairs": 7, "length": (9, 13), "min_dist": 5, "min_turns": 24, "fail": (0.7, 1.0)},
]


def count_turns(cells: List[Cell]) -> int:
    t = 0
    for a, b, c in zip(cells, cells[1:], cells[2:]):
        if (b[0] - a[0], b[1] - a[1]) != (c[0] - b[0], c[1] - b[1]):
            t += 1
    return t


def _random_path(size: int, occupied: Set[Cell], length: int, rng: random.Random) -> Optional[List[Cell]]:
    """Caminho simples (sem repetir células) com `length` células, incentivando curvas."""
    free = [(r, c) for r in range(size) for c in range(size) if (r, c) not in occupied]
    if not free:
        return None
    for _ in range(30):
        start = rng.choice(free)
        path = [start]
        on = {start}
        stuck = 0
        while len(path) < length and stuck < 60:
            r, c = path[-1]
            opts = [(r + dr, c + dc) for dr, dc in DIRECTIONS
                    if in_bounds((r + dr, c + dc), size) and (r + dr, c + dc) not in occupied
                    and (r + dr, c + dc) not in on]
            if not opts:
                for _ in range(min(3, len(path) - 1)):
                    on.discard(path.pop())
                stuck += 1
                continue
            if len(path) >= 2:
                prev = (path[-1][0] - path[-2][0], path[-1][1] - path[-2][1])
                turning = [o for o in opts if (o[0] - r, o[1] - c) != prev]
                if turning and rng.random() < 0.6:
                    opts = turning
            nxt = rng.choice(opts)
            path.append(nxt)
            on.add(nxt)
        if len(path) == length:
            return path
    return None


def _bfs_path(size: int, a: Cell, b: Cell, blocked: Set[Cell]) -> Optional[List[Cell]]:
    prev: Dict[Cell, Optional[Cell]] = {a: None}
    q = deque([a])
    while q:
        cur = q.popleft()
        if cur == b:
            out = []
            while cur is not None:
                out.append(cur)
                cur = prev[cur]
            return out[::-1]
        for dr, dc in DIRECTIONS:
            n = (cur[0] + dr, cur[1] + dc)
            if in_bounds(n, size) and n not in prev and (n not in blocked or n == b):
                prev[n] = cur
                q.append(n)
    return None


def greedy_fail_rate(size: int, pairs: Dict[int, Tuple[Cell, Cell]], rng: random.Random, trials: int = 16) -> float:
    """Fração de ordens em que ligar cada cor pelo caminho mais curto (sem planejar) dá errado."""
    dots = {cell: c for c, (a, b) in pairs.items() for cell in (a, b)}
    fails = 0
    for _ in range(trials):
        order = list(pairs)
        rng.shuffle(order)
        occupied: Set[Cell] = set()
        ok = True
        for c in order:
            a, b = pairs[c]
            blocked = occupied | {d for d, col in dots.items() if col != c}
            p = _bfs_path(size, a, b, blocked)
            if p is None:
                ok = False
                break
            occupied |= set(p)
        fails += 0 if ok else 1
    return fails / trials


def build_level(spec: dict, seed: int) -> Optional[dict]:
    """Tenta montar a fase com esta semente; devolve None se não atingir os critérios."""
    rng = random.Random(seed)
    size, k = spec["size"], spec["pairs"]
    occupied: Set[Cell] = set()
    paths: List[List[Cell]] = []
    for _ in range(k):
        p = _random_path(size, occupied, rng.randint(*spec["length"]), rng)
        if p is None:
            return None
        if manhattan(p[0], p[-1]) < spec["min_dist"]:
            return None
        paths.append(p)
        occupied |= set(p)
    if sum(count_turns(p) for p in paths) < spec["min_turns"]:
        return None
    colors = rng.sample(range(NUM_COLORS), k)
    pairs = {colors[i]: (paths[i][0], paths[i][-1]) for i in range(k)}
    rate = greedy_fail_rate(size, pairs, random.Random(seed + 7), trials=80)
    if not (spec["fail"][0] <= rate <= spec["fail"][1]):
        return None
    level = {
        "id": spec["id"], "category": CATEGORY_OF[spec["id"]], "size": size, "seed": seed,
        "pairs": [{"color": c, "a": list(pairs[c][0]), "b": list(pairs[c][1])} for c in sorted(pairs)],
        "solution": {str(colors[i]): [list(c) for c in paths[i]] for i in range(k)},
    }
    return level


def generate_level(spec: dict, max_attempts: int = 20000) -> dict:
    base = spec["id"] * 100000
    for attempt in range(max_attempts):
        lv = build_level(spec, base + attempt)
        if lv and not validate_level(lv, check_solver=True):
            return lv
    raise RuntimeError("não foi possível gerar a fase %d" % spec["id"])


def generate_all() -> List[dict]:
    return [generate_level(s) for s in LEVEL_SPECS]


KNOWN_SEEDS = {1: 100003, 2: 200000, 3: 300020, 4: 400261, 5: 500004, 6: 600246, 7: 700484, 8: 802584, 9: 901743}


def generate_all_fast() -> List[dict]:
    """Reconstrói as nove fases oficiais a partir das sementes (instantâneo)."""
    out = []
    for spec in LEVEL_SPECS:
        lv = build_level(spec, KNOWN_SEEDS[spec["id"]])
        if lv is None:
            return generate_all()
        out.append(lv)
    return out
