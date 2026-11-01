from __future__ import annotations

from typing import Optional, Tuple

IDLE = "idle"
RUNNING = "running"
PAUSED = "paused"
FINISHED = "finished"

INHALE = "inhale"
EXHALE = "exhale"


PRESETS = [
    ("Padrão (3s / 4s)", 3.0, 4.0),
    ("Mais lento (4s / 6s)", 4.0, 6.0),
    ("Curto (3s / 3s)", 3.0, 3.0),
]

MESSAGE = "Respire no seu ritmo. Se preferir, pode apenas observar o círculo."
DISCLAIMER = "Este exercício é só um momento de pausa e não substitui acompanhamento profissional."


def _smooth(x: float) -> float:
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


class BreathingExercise:
    def __init__(self, inhale: float = 3.0, exhale: float = 4.0, cycles: int = 6) -> None:
        self.cycles = max(1, cycles)
        self.state = IDLE
        self.elapsed = 0.0
        self.set_rhythm(inhale, exhale)

    def set_rhythm(self, inhale: float, exhale: float) -> None:
        self.inhale = max(1.0, float(inhale))
        self.exhale = max(1.0, float(exhale))

    @property
    def cycle_length(self) -> float:
        return self.inhale + self.exhale

    @property
    def total_duration(self) -> float:
        return self.cycle_length * self.cycles


    def start(self) -> None:
        self.elapsed = 0.0
        self.state = RUNNING

    def pause(self) -> None:
        if self.state == RUNNING:
            self.state = PAUSED

    def resume(self) -> None:
        if self.state == PAUSED:
            self.state = RUNNING

    def stop(self) -> None:
        self.state = IDLE
        self.elapsed = 0.0

    def extend(self, cycles: Optional[int] = None) -> None:
        if cycles:
            self.cycles = cycles
        self.start()

    def update(self, dt: float) -> None:
        if self.state != RUNNING:
            return
        self.elapsed += max(0.0, dt)
        if self.elapsed >= self.total_duration:
            self.elapsed = self.total_duration
            self.state = FINISHED


    def _phase_info(self) -> Tuple[str, float]:
        t = self.elapsed % self.cycle_length if self.elapsed < self.total_duration else 0.0
        if self.state == FINISHED:
            return EXHALE, 1.0
        if t < self.inhale:
            return INHALE, t / self.inhale
        return EXHALE, (t - self.inhale) / self.exhale

    @property
    def phase(self) -> str:
        return self._phase_info()[0]

    @property
    def label(self) -> str:
        if self.state == IDLE:
            return "Pronto?"
        if self.state == FINISHED:
            return "Muito bem"
        return "Inspire" if self.phase == INHALE else "Expire"

    def circle_scale(self, min_scale: float = 0.45, max_scale: float = 1.0) -> float:
        if self.state == IDLE:
            return min_scale
        phase, p = self._phase_info()
        k = _smooth(p) if phase == INHALE else 1.0 - _smooth(p)
        return min_scale + (max_scale - min_scale) * k

    @property
    def remaining(self) -> float:
        return max(0.0, self.total_duration - self.elapsed)
