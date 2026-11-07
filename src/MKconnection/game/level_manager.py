from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .cell import Cell
from .level_generator import generate_all_fast
from .level_validator import pairs_of, validate_level

log = logging.getLogger(__name__)
DEFAULT_PATH = Path(__file__).resolve().parent.parent / "data" / "levels.json"


@dataclass(frozen=True)
class Level:
    id: int
    category: str
    size: int
    pairs: Dict[int, Tuple[Cell, Cell]]
    solution: Dict[int, List[Cell]]
    seed: int = 0

    @property
    def name(self) -> str:
        return "Nível %d" % self.id


@dataclass(frozen=True)
class Category:
    key: str
    label: str
    size: int
    level_ids: Tuple[int, ...]


CATEGORIES: Tuple[Category, ...] = (
    Category("easy", "Fácil", 6, (1, 2, 3)),
    Category("medium", "Médio", 8, (4, 5, 6)),
    Category("hard", "Difícil", 10, (7, 8, 9)),
)


def category_by_key(key: str) -> Category:
    return next(c for c in CATEGORIES if c.key == key)


def category_of_level(level_id: int) -> Category:
    return next(c for c in CATEGORIES if level_id in c.level_ids)


def level_from_dict(d: dict) -> Level:
    return Level(
        id=int(d["id"]), category=str(d.get("category", "")), size=int(d["size"]), pairs=pairs_of(d),
        solution={int(k): [tuple(c) for c in v] for k, v in (d.get("solution") or {}).items()},
        seed=int(d.get("seed", 0)),
    )


class LevelManager:
    """Carrega as fases do JSON e só disponibiliza as que passam na validação."""

    def __init__(self, path: Optional[Path] = None) -> None:
        self.path = Path(path) if path else DEFAULT_PATH
        self.warning = ""
        self.levels: List[Level] = []
        self._load()

    def _load(self) -> None:
        raw: List[dict] = []
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))["levels"]
        except (OSError, ValueError, KeyError, TypeError) as exc:
            log.warning("Não foi possível carregar %s (%s); usando as fases padrão.", self.path, exc)
            self.warning = "Arquivo de fases indisponível; usando as fases padrão."
        levels: List[Level] = []
        for d in raw:
            errs = validate_level(d)
            if errs:
                log.warning("Fase %s ignorada: %s", d.get("id"), "; ".join(errs))
                self.warning = "Alguma fase estava inválida e foi ignorada."
                continue
            levels.append(level_from_dict(d))
        if not levels:
            levels = [level_from_dict(d) for d in generate_all_fast()]
            if not self.warning:
                self.warning = "Arquivo de fases vazio; usando as fases padrão."
        self.levels = sorted(levels, key=lambda lv: lv.id)

    @property
    def count(self) -> int:
        return len(self.levels)

    def ids(self) -> List[int]:
        return [lv.id for lv in self.levels]

    def get(self, level_id: int) -> Level:
        for lv in self.levels:
            if lv.id == level_id:
                return lv
        raise KeyError(level_id)

    def has(self, level_id: int) -> bool:
        return any(lv.id == level_id for lv in self.levels)

    def levels_in(self, category: Category) -> List[Level]:
        return [lv for lv in self.levels if lv.id in category.level_ids]

    def next_id(self, level_id: int) -> Optional[int]:
        ids = self.ids()
        later = [i for i in ids if i > level_id]
        return later[0] if later else None
