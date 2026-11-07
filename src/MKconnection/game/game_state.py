from __future__ import annotations

from enum import Enum
from typing import Optional


class Screen(Enum):
    MENU = "menu"
    DIFFICULTY = "difficulty"
    LEVELS = "levels"
    PLAYING = "playing"
    COMPLETE = "complete"
    SETTINGS = "settings"
    THEMES = "themes"


BACK_TARGET = {
    Screen.PLAYING: Screen.LEVELS,
    Screen.COMPLETE: Screen.LEVELS,
    Screen.LEVELS: Screen.DIFFICULTY,
    Screen.DIFFICULTY: Screen.MENU,
    Screen.SETTINGS: Screen.MENU,
    Screen.THEMES: Screen.MENU,
}


class AppState:
    def __init__(self) -> None:
        self.current = Screen.MENU
        self.category_key = "easy"
        self.running = True

    def go(self, screen: Screen) -> None:
        self.current = screen

    def back(self) -> Optional[Screen]:
        """Volta uma tela. Devolve a nova tela, ou None se já estiver no menu (nada acontece)."""
        target = BACK_TARGET.get(self.current)
        if target is not None:
            self.current = target
        return target

    def quit(self) -> None:
        self.running = False
