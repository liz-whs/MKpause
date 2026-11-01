from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import List, Optional, Set

from . import storage

log = logging.getLogger(__name__)
DEFAULT_PATH = Path(__file__).resolve().parent.parent / "data" / "progress.json"


class ProgressStore:
    def __init__(self, path: Optional[Path] = None) -> None:
        self.path = Path(path) if path else DEFAULT_PATH
        self.completed: Set[int] = set()
        self.last_level: int = 1
        self.error: str = ""
        self.load()


    def load(self) -> None:
        self.completed, self.last_level, self.error = set(), 1, ""
        try:
            raw = json.loads(storage.read_text(self.path))
            self.completed = {int(x) for x in raw.get("completed", []) if int(x) > 0}
            self.last_level = max(1, int(raw.get("last_level", 1)))
        except FileNotFoundError:
            pass
        except (OSError, ValueError, TypeError, AttributeError) as exc:
            log.warning("Progresso ilegível (%s); começando do zero.", exc)
            self.error = "Não foi possível ler o progresso salvo."

    def save(self) -> bool:
        data = {"version": 1, "completed": sorted(self.completed), "last_level": self.last_level}
        try:
            storage.write_text(self.path, json.dumps(data, indent=2))
            self.error = ""
            return True
        except OSError as exc:
            log.warning("Não foi possível salvar o progresso: %s", exc)
            self.error = "Não foi possível salvar o progresso."
            return False


    def mark_completed(self, level_id: int) -> None:
        self.completed.add(level_id)
        self.save()

    def set_last_level(self, level_id: int) -> None:
        self.last_level = level_id
        self.save()

    def is_completed(self, level_id: int) -> bool:
        return level_id in self.completed

    def is_unlocked(self, level_id: int, all_ids: List[int]) -> bool:
        ordered = sorted(all_ids)
        if level_id not in ordered:
            return False
        i = ordered.index(level_id)
        return i == 0 or ordered[i - 1] in self.completed

    def next_to_play(self, all_ids: List[int]) -> int:
        for lid in sorted(all_ids):
            if lid not in self.completed:
                return lid
        return sorted(all_ids)[0]

    def reset(self) -> None:
        self.completed, self.last_level = set(), 1
        self.save()
