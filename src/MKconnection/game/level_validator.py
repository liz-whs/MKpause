from __future__ import annotations

from typing import Dict, List, Tuple

from .cell import Cell, in_bounds, is_adjacent
from .hint_solver import SOLVED, solve

LEVEL_RULES: Dict[int, Tuple[int, int, int]] = {
    1: (6, 3, 3), 2: (6, 3, 3), 3: (6, 4, 4),
    4: (8, 4, 4), 5: (8, 5, 5), 6: (8, 5, 5),
    7: (10, 6, 6), 8: (10, 6, 7), 9: (10, 7, 7),
}
CATEGORY_OF = {1: "easy", 2: "easy", 3: "easy", 4: "medium", 5: "medium", 6: "medium",
               7: "hard", 8: "hard", 9: "hard"}


def pairs_of(level: dict) -> Dict[int, Tuple[Cell, Cell]]:
    return {int(p["color"]): (tuple(p["a"]), tuple(p["b"])) for p in level.get("pairs", [])}


def validate_structure(level: dict, check_project_rules: bool = True) -> List[str]:
    errs: List[str] = []
    try:
        size = int(level["size"])
        lid = int(level["id"])
        raw_pairs = level["pairs"]
    except (KeyError, TypeError, ValueError):
        return ["campos obrigatórios ausentes (id, size, pairs)"]
    if size < 2:
        errs.append("tamanho inválido")
    colors = []
    used: Dict[Cell, int] = {}
    for p in raw_pairs:
        try:
            color = int(p["color"])
            a, b = tuple(p["a"]), tuple(p["b"])
            assert len(a) == 2 and len(b) == 2
        except Exception:
            errs.append("par malformado: %r" % (p,))
            continue
        colors.append(color)
        if a == b:
            errs.append("cor %d: os dois pontos estão na mesma célula" % color)
        for cell in (a, b):
            if not in_bounds(cell, size):
                errs.append("cor %d: ponto %s fora da grade" % (color, cell))
            if cell in used and used[cell] != color:
                errs.append("célula %s usada como ponto por duas cores" % (cell,))
            used[cell] = color
    if len(colors) != len(set(colors)):
        errs.append("cores repetidas (cada cor precisa de exatamente dois pontos)")
    if not colors:
        errs.append("a fase não tem pares")
    if check_project_rules:
        rule = LEVEL_RULES.get(lid)
        if rule is None:
            errs.append("id %d fora das fases previstas" % lid)
        else:
            if size != rule[0]:
                errs.append("tamanho %d, esperado %d" % (size, rule[0]))
            if not (rule[1] <= len(colors) <= rule[2]):
                errs.append("%d pares, esperado entre %d e %d" % (len(colors), rule[1], rule[2]))
    return errs


def validate_solution(level: dict) -> List[str]:
    """A solução guardada conecta todos os pares, sem cruzar, sem diagonais e sem pular células?"""
    errs: List[str] = []
    size = int(level["size"])
    pairs = pairs_of(level)
    sol = level.get("solution")
    if not sol:
        return ["a fase não tem solução guardada"]
    dots = {cell: color for color, (a, b) in pairs.items() for cell in (a, b)}
    seen: Dict[Cell, int] = {}
    for color, (a, b) in pairs.items():
        raw = sol.get(str(color), sol.get(color))
        if raw is None:
            errs.append("cor %d sem caminho na solução" % color)
            continue
        cells = [tuple(c) for c in raw]
        if not cells or {cells[0], cells[-1]} != {a, b}:
            errs.append("cor %d: o caminho não liga os dois pontos" % color)
        if len(set(cells)) != len(cells):
            errs.append("cor %d: o caminho repete células" % color)
        for x, y in zip(cells, cells[1:]):
            if not is_adjacent(x, y):
                errs.append("cor %d: passo inválido %s -> %s" % (color, x, y))
        for cell in cells:
            if not in_bounds(cell, size):
                errs.append("cor %d: célula %s fora da grade" % (color, cell))
            if cell in dots and dots[cell] != color:
                errs.append("cor %d passa por ponto de outra cor em %s" % (color, cell))
            if cell in seen and seen[cell] != color:
                errs.append("cor %d cruza a cor %d em %s" % (color, seen[cell], cell))
            seen[cell] = color
    return errs


def is_solvable(level: dict, node_limit: int = 200000, time_limit: float = 3.0) -> bool:
    """Confirma, com o solucionador (independente da solução guardada), que existe solução."""
    res = solve(int(level["size"]), pairs_of(level), node_limit=node_limit, time_limit=time_limit)
    return res.status == SOLVED


def validate_level(level: dict, check_solver: bool = False, check_project_rules: bool = True) -> List[str]:
    errs = validate_structure(level, check_project_rules)
    if errs:
        return errs
    errs += validate_solution(level)
    if not errs and check_solver and not is_solvable(level):
        errs.append("o solucionador não encontrou solução")
    return errs


def validate_all(levels: List[dict], check_solver: bool = False) -> Dict[int, List[str]]:
    """Devolve {id: lista de problemas} apenas para as fases com problema (vazio = tudo certo)."""
    out: Dict[int, List[str]] = {}
    seen_ids = set()
    for lv in levels:
        errs = validate_level(lv, check_solver)
        lid = lv.get("id")
        if lid in seen_ids:
            errs.append("id repetido")
        seen_ids.add(lid)
        if errs:
            out[lid] = errs
    return out
