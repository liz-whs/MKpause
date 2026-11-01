from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .game_logic import State, normalize

log = logging.getLogger(__name__)

DEFAULT_PATH = Path(__file__).resolve().parent.parent / "data" / "levels.json"
MAX_COLORS = 6


@dataclass(frozen=True)
class Level:
    id: int
    name: str
    capacity: int
    bottles: State


class LevelError(ValueError):
    pass


def parse_level(raw: Dict) -> Level:
    try:
        capacity = int(raw["capacity"])
        bottles = normalize(raw["bottles"])
        level = Level(int(raw["id"]), str(raw.get("name", "Fase %s" % raw["id"])), capacity, bottles)
    except (KeyError, TypeError, ValueError) as exc:
        raise LevelError("fase malformada: %s" % exc) from exc
    if capacity < 1 or len(bottles) < 2:
        raise LevelError("capacidade ou número de garrafas inválido na fase %d" % level.id)
    counts: Dict[int, int] = {}
    for b in bottles:
        if len(b) > capacity:
            raise LevelError("garrafa acima da capacidade na fase %d" % level.id)
        for c in b:
            if not (0 <= c < MAX_COLORS):
                raise LevelError("cor inexistente (%d) na fase %d" % (c, level.id))
            counts[c] = counts.get(c, 0) + 1
    if any(n != capacity for n in counts.values()):
        raise LevelError("cada cor deve ter exatamente %d unidades (fase %d)" % (capacity, level.id))
    if not any(len(b) < capacity for b in bottles):
        raise LevelError("a fase %d não tem espaço livre" % level.id)
    return level


class LevelManager:
    def __init__(self, path: Optional[Path] = None) -> None:
        self.path = Path(path) if path else DEFAULT_PATH
        self.levels: List[Level] = []
        self.warning: str = ""
        self.load()

    def load(self) -> None:
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            levels = sorted((parse_level(r) for r in data["levels"]), key=lambda l: l.id)
            if not levels:
                raise LevelError("lista de fases vazia")
            self.levels = levels
            self.warning = ""
        except (OSError, ValueError, KeyError, TypeError) as exc:
            log.warning("Não foi possível carregar %s (%s); gerando fases padrão.", self.path, exc)
            self.warning = "Arquivo de fases indisponível; usando fases geradas."
            from .level_generator import generate_all

            self.levels = [parse_level(r) for r in generate_all()["levels"]]

    @property
    def count(self) -> int:
        return len(self.levels)

    def get(self, level_id: int) -> Optional[Level]:
        for lv in self.levels:
            if lv.id == level_id:
                return lv
        return None

    def next_id(self, level_id: int) -> Optional[int]:
        later = [lv.id for lv in self.levels if lv.id > level_id]
        return min(later) if later else None

    def ids(self) -> List[int]:
        return [lv.id for lv in self.levels]
