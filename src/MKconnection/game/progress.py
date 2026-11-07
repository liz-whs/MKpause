from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import List, Optional, Set, Tuple

log = logging.getLogger(__name__)
DEFAULT_PATH = Path(__file__).resolve().parent.parent / "data" / "progress.json"


class ProgressStore:
    def __init__(self, path: Optional[Path] = None) -> None:
        self.path = Path(path) if path else DEFAULT_PATH
        self.completed: Set[int] = set()
        self.last_level: int = 1
        self.theme: str = "chinchila"
        self.error: str = ""
        self.load()

    def load(self) -> None:
        self.completed, self.last_level, self.theme, self.error = set(), 1, "chinchila", ""
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
            self.completed = {int(x) for x in raw.get("completed", []) if int(x) > 0}
            self.last_level = max(1, int(raw.get("last_level", 1)))
            self.theme = str(raw.get("theme", "chinchila"))
        except FileNotFoundError:
            pass
        except (OSError, ValueError, TypeError, AttributeError) as exc:
            log.warning("Progresso ilegível (%s); começando do zero.", exc)
            self.error = "Não foi possível ler o progresso salvo."

    def save(self) -> bool:
        data = {"version": 1, "completed": sorted(self.completed), "last_level": self.last_level, "theme": self.theme}
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            tmp = self.path.with_suffix(".tmp")
            tmp.write_text(json.dumps(data, indent=2), encoding="utf-8")
            os.replace(tmp, self.path)
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
        if level_id != self.last_level:
            self.last_level = level_id
            self.save()

    def set_theme(self, name: str) -> None:
        if name != self.theme:
            self.theme = name
            self.save()

    def reset(self) -> None:
        self.completed, self.last_level = set(), 1
        self.save()

    def is_completed(self, level_id: int) -> bool:
        return level_id in self.completed

    def is_level_unlocked(self, level_id: int, all_ids: List[int]) -> bool:
        """A primeira fase está sempre liberada; as demais, depois que a anterior for concluída."""
        ids = sorted(all_ids)
        if level_id not in ids:
            return False
        i = ids.index(level_id)
        return i == 0 or ids[i - 1] in self.completed

    def is_category_unlocked(self, category, all_ids: List[int]) -> bool:
        """Médio libera após as 3 fáceis; Difícil após as 3 médias (= a 1ª fase da categoria liberada)."""
        return self.is_level_unlocked(category.level_ids[0], all_ids)

    def category_progress(self, category) -> Tuple[int, int]:
        done = sum(1 for i in category.level_ids if i in self.completed)
        return done, len(category.level_ids)

    def next_to_play(self, all_ids: List[int]) -> int:
        """Primeira fase ainda não concluída; se tudo estiver concluído, a primeira."""
        ids = sorted(all_ids)
        for lid in ids:
            if lid not in self.completed:
                return lid
        return ids[0]
