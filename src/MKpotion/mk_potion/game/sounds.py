from __future__ import annotations

import array
import logging
import math
from typing import Dict, Sequence

log = logging.getLogger(__name__)


class SoundManager:
    def __init__(self, settings) -> None:
        self.settings = settings
        self.sounds: Dict[str, object] = {}
        self.available = False
        try:
            import pygame

            if not pygame.mixer.get_init():
                pygame.mixer.init(frequency=22050, size=-16, channels=1)
            freq, size, channels = pygame.mixer.get_init()
            if size != -16:
                raise RuntimeError("formato de áudio não suportado")
            self._pygame = pygame
            self._rate, self._channels = freq, channels
            self.sounds = {
                "select": self._make([523.0], 0.09, 0.35),
                "pour": self._make([392.0, 494.0], 0.28, 0.35),
                "undo": self._make([440.0, 349.0], 0.2, 0.3),
                "win": self._make([523.0, 659.0, 784.0], 0.9, 0.4),
            }
            self.available = True
        except Exception as exc:
            log.info("Áudio indisponível: %s", exc)

    def _make(self, freqs: Sequence[float], duration: float, gain: float):
        n = int(self._rate * duration)
        data = array.array("h")
        for i in range(n):
            t = i / self._rate
            env = math.sin(math.pi * i / n) ** 2

            val = 0.0
            for k, f in enumerate(freqs):
                start = k * duration / (len(freqs) * 1.5)
                if t >= start:
                    val += math.sin(2 * math.pi * f * t)
            val = val / len(freqs) * env * gain
            sample = int(val * 32767 * 0.6)
            for _ in range(self._channels):
                data.append(sample)
        return self._pygame.mixer.Sound(buffer=data.tobytes())

    def play(self, name: str) -> None:
        if not (self.available and self.settings.sound_enabled):
            return
        snd = self.sounds.get(name)
        if snd is not None:
            try:
                snd.set_volume(max(0.0, min(1.0, self.settings.volume)))
                snd.play()
            except Exception:
                pass
