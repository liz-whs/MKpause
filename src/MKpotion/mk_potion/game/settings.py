from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Optional

from . import storage
from .breathing import PRESETS

log = logging.getLogger(__name__)
DEFAULT_PATH = Path(__file__).resolve().parent.parent / "data" / "settings.json"


@dataclass
class Settings:
    sound_enabled: bool = True
    volume: float = 0.5
    reduced_motion: bool = False
    high_contrast: bool = False
    show_patterns: bool = True
    breathing_preset: int = 0

    def validate(self) -> None:
        self.volume = max(0.0, min(1.0, float(self.volume)))
        self.breathing_preset = int(self.breathing_preset) % len(PRESETS)
        for name in ("sound_enabled", "reduced_motion", "high_contrast", "show_patterns"):
            setattr(self, name, bool(getattr(self, name)))

    @property
    def breathing_rhythm(self):
        _, inhale, exhale = PRESETS[self.breathing_preset]
        return inhale, exhale

    @property
    def patterns_visible(self) -> bool:
        return self.show_patterns or self.high_contrast

    def cycle_breathing(self) -> None:
        self.breathing_preset = (self.breathing_preset + 1) % len(PRESETS)


class SettingsStore:
    def __init__(self, path: Optional[Path] = None) -> None:
        self.path = Path(path) if path else DEFAULT_PATH
        self.settings = Settings()
        self.load()

    def load(self) -> None:
        try:
            raw = json.loads(storage.read_text(self.path))
            known = {k: v for k, v in raw.items() if k in Settings.__dataclass_fields__}
            self.settings = Settings(**known)
            self.settings.validate()
        except FileNotFoundError:
            self.settings = Settings()
        except (OSError, ValueError, TypeError) as exc:
            log.warning("Configurações inválidas (%s); usando padrão.", exc)
            self.settings = Settings()

    def save(self) -> bool:
        try:
            storage.write_text(self.path, json.dumps(asdict(self.settings), indent=2))
            return True
        except OSError as exc:
            log.warning("Não foi possível salvar as configurações: %s", exc)
            return False
