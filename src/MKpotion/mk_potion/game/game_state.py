from __future__ import annotations

from enum import Enum
from typing import Optional


class Screen(Enum):
    MENU = "menu"
    HOWTO = "howto"
    LEVELS = "levels"
    PLAYING = "playing"
    PAUSED = "paused"
    COMPLETE = "complete"
    BREATHING = "breathing"
    SETTINGS = "settings"


class AppState:

    def __init__(self) -> None:
        self.current = Screen.MENU
        self.previous: Optional[Screen] = None
        self.running = True

    def go(self, screen: Screen) -> None:
        self.previous = self.current
        self.current = screen

    def quit(self) -> None:
        self.running = False
