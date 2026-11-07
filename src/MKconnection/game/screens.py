from __future__ import annotations

import logging
import math
import platform
import sys
import time as _time
import traceback
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Dict, List, Optional, Tuple

import pygame

from .board import Board
from .board_view import BoardView
from .cell import cells_along_segment
from .game_logic import GameSession, MoveKind
from .game_state import AppState, Screen
from .level_manager import CATEGORIES, Category, LevelManager, category_by_key, category_of_level
from .path import Path as GamePath
from .progress import ProgressStore
from .settings import CREAM, DESIGN_SIZE, HC_PATH_COLORS, PATH_COLORS, SCREEN_FRACTION, WINDOW_SIZE, MIN_WINDOW, SettingsStore
from .sounds import SoundManager
from .themes import THEMES, BoardTheme, get_theme, make_theme
from .ui import (Button, Fonts, draw_background, draw_bubble, draw_heart, draw_icon, draw_mascot, draw_panel,
                 draw_paragraph, draw_sparkle, draw_text, load_mascot, mix)

log = logging.getLogger(__name__)


class DemoSession:
    """Só o que o BoardView precisa para desenhar: um tabuleiro e 'nenhum caminho ativo'."""

    def __init__(self) -> None:
        pairs = {0: ((0, 0), (3, 2)), 1: ((0, 1), (2, 4)), 4: ((1, 1), (4, 3))}
        self.board = Board(5, pairs)
        self.active = None
        routes = {
            0: [(0, 0), (1, 0), (2, 0), (3, 0), (3, 1), (3, 2)],
            1: [(0, 1), (0, 2), (0, 3), (0, 4), (1, 4), (2, 4)],
            4: [(1, 1), (1, 2), (1, 3), (2, 3), (3, 3), (4, 3)],
        }
        for color, cells in routes.items():
            self.board.set_path(GamePath(color, list(cells), complete=True))


class Card(Button):
    def __init__(self, key: str, rect: pygame.Rect, draw_fn: Callable, enabled: bool = True, tooltip: str = "") -> None:
        super().__init__(key, "", rect, None, "soft", tooltip, enabled)
        self.draw_fn = draw_fn

    def draw(self, surface, theme, fonts, scale, hovered, focused) -> None:
        self.draw_fn(surface, self.rect, hovered, self.enabled)
        if focused:
            pygame.draw.rect(surface, theme["focus"], self.rect.inflate(int(10 * scale), int(10 * scale)),
                             width=max(2, int(3 * scale)), border_radius=int(28 * scale))


class BaseScreen:
    calm = False

    def __init__(self, app: "App") -> None:
        self.app = app
        self.buttons: List[Button] = []
        self.focus = -1

    def on_enter(self) -> None:
        self.focus = -1
        self.relayout()

    def relayout(self) -> None:
        w, h = self.app.window.get_size()
        self.buttons = self.build_buttons(w, h)
        self.focus = min(self.focus, len(self.buttons) - 1)

    def build_buttons(self, w: int, h: int) -> List[Button]:
        return []

    def btn(self, key, label, x, y, w, h, **kw) -> Button:
        return Button(key, label, pygame.Rect(int(x), int(y), int(w), int(h)), **kw)

    def back_button(self, w: int, h: int) -> Button:
        s = self.app.scale
        return self.btn("back", "Voltar", 24 * s, 18 * s, 150 * s, 54 * s, icon="back", style="secondary",
                        tooltip="Voltar (tecla Esc)")

    def on_button(self, key: str) -> None:
        if key == "back":
            self.app.back()

    def handle_event(self, ev) -> bool:
        if ev.type == pygame.MOUSEBUTTONDOWN and ev.button == 1:
            for b in self.buttons:
                if b.enabled and b.rect.collidepoint(ev.pos):
                    self.app.sounds.play("select")
                    self.on_button(b.key)
                    return True
        elif ev.type == pygame.KEYDOWN:
            if ev.key == pygame.K_ESCAPE:
                self.on_escape()
                return True
            if ev.key == pygame.K_TAB and self.buttons:
                step = -1 if ev.mod & pygame.KMOD_SHIFT else 1
                self.focus = (self.focus + step) % len(self.buttons)
                return True
            if ev.key in (pygame.K_RETURN, pygame.K_KP_ENTER, pygame.K_SPACE) and 0 <= self.focus < len(self.buttons):
                b = self.buttons[self.focus]
                if b.enabled:
                    self.on_button(b.key)
                return True
        return False

    def on_escape(self) -> None:
        self.app.back()

    def update(self, dt: float) -> None:
        pass

    def draw_background(self, surface) -> None:
        bt = self.app.board_theme
        draw_background(surface, self.app.theme, self.calm, bt.decor, bt.accent)

    def draw(self, surface) -> None:
        self.draw_background(surface)
        self.draw_buttons(surface)

    def draw_buttons(self, surface) -> None:
        a = self.app
        pos = pygame.mouse.get_pos()
        for i, b in enumerate(self.buttons):
            b.draw(surface, a.theme, a.fonts, a.scale, b.enabled and b.rect.collidepoint(pos), i == self.focus)

    def tooltip_text(self) -> str:
        pos = pygame.mouse.get_pos()
        for b in self.buttons:
            if b.tooltip and b.rect.collidepoint(pos):
                return b.tooltip
        if 0 <= self.focus < len(self.buttons):
            return self.buttons[self.focus].tooltip
        return ""

    def draw_header(self, surface, title: str, icon: Optional[str] = None, subtitle: str = "") -> None:
        a, s = self.app, self.app.scale
        w, h = surface.get_size()
        rect = draw_text(surface, title, a.fonts.get(48 * s, True), a.theme["cacao"], center=(w // 2, int(h * 0.095)))
        if icon:
            draw_icon(surface, icon, (rect.left - int(40 * s), rect.centery), int(44 * s), a.theme["rose"])
        if subtitle:
            draw_text(surface, subtitle, a.fonts.get(22 * s), a.theme["text_soft"], center=(w // 2, int(h * 0.095) + int(46 * s)))

    def draw_tooltip(self, surface) -> None:
        text = self.tooltip_text()
        if text:
            a, s = self.app, self.app.scale
            w, h = surface.get_size()
            draw_text(surface, text, a.fonts.get(20 * s), a.theme["text_soft"], center=(w // 2, h - int(30 * s)))


def draw_dots(surface, theme, center_x: int, y: int, done: int, total: int, r: int, gap: int) -> None:
    """Indicador de progresso: bolinhas cheias (concluídas) e vazias."""
    x0 = center_x - ((total - 1) * gap) // 2
    for i in range(total):
        c = (x0 + i * gap, y)
        if i < done:
            pygame.draw.circle(surface, theme["focus"], c, r)
        else:
            pygame.draw.circle(surface, theme["lavender"], c, r)
            pygame.draw.circle(surface, theme["jungle"], c, r, width=max(1, r // 4))


class MenuScreen(BaseScreen):
    def __init__(self, app) -> None:
        super().__init__(app)
        self.demo = DemoSession()
        self.view = BoardView()

    def build_buttons(self, w, h):
        s = self.app.scale
        bw, bh = 340 * s, 68 * s
        x, y = w * 0.74 - bw / 2, h * 0.40
        gap = 14 * s
        out = [
            self.btn("play", "Jogar", x, y, bw, bh, icon="play_game", style="primary", tooltip="Começar a próxima fase"),
            self.btn("levels", "Fases", x, y + (bh + gap), bw, bh, icon="grid", style="sky",
                     tooltip="Escolher a dificuldade e a fase"),
            self.btn("themes", "Temas", x, y + 2 * (bh + gap), bw, bh, icon="palette", style="soft",
                     tooltip="Mudar a aparência do tabuleiro"),
            self.btn("settings", "Configurações", x, y + 3 * (bh + gap), bw, bh, icon="gear", style="secondary",
                     tooltip="Som, animações e contraste"),
        ]
        return out

    def on_button(self, key):
        a = self.app
        if key == "play":
            a.start_level(a.progress.next_to_play(a.levels.ids()))
        elif key == "levels":
            a.go(Screen.DIFFICULTY)
        elif key == "themes":
            a.go(Screen.THEMES)
        elif key == "settings":
            a.go(Screen.SETTINGS)

    def on_escape(self) -> None:
        pass

    def draw(self, surface):
        a, s = self.app, self.app.scale
        w, h = surface.get_size()
        self.draw_background(surface)
        hop = 0 if a.settings.reduced_motion else abs(math.sin(a.time * 1.6)) * 6 * s
        draw_mascot(surface, "mascot_front", int(h * 0.2), (int(w * 0.27), int(h * 0.25 - hop)))
        area = pygame.Rect(int(w * 0.06), int(h * 0.27), int(w * 0.42), int(h * 0.50))
        self.view.layout(area, 5)
        self.view.draw(surface, self.demo, a.board_theme, a.palette, True, a.settings.high_contrast, s, a.time)
        draw_text(surface, "Sem pressa: um caminho de cada vez.", a.fonts.get(22 * s), a.theme["text_soft"],
                  center=(int(w * 0.27), int(h * 0.86)))
        draw_text(surface, "MKconnection", a.fonts.get(60 * s, True), a.theme["cacao"], center=(int(w * 0.74), int(h * 0.15)))
        draw_paragraph(surface, "Conecte as cores no seu ritmo.", a.fonts.get(26 * s), a.theme["text"],
                       int(w * 0.74), int(h * 0.215), int(w * 0.40))
        self.draw_buttons(surface)
        if a.notice:
            draw_paragraph(surface, a.notice, a.fonts.get(18 * s), a.theme["text_soft"], w // 2, h - int(90 * s), int(w * 0.9))
        elif a.progress.error or a.levels.warning:
            draw_text(surface, a.progress.error or a.levels.warning, a.fonts.get(18 * s), a.theme["text_soft"],
                      midbottom=(w // 2, h - int(44 * s)))
        self.draw_tooltip(surface)


class DifficultyScreen(BaseScreen):
    def build_buttons(self, w, h):
        a, s = self.app, self.app.scale
        out = [self.back_button(w, h)]
        cw, ch = min(w - 60 * s, 700 * s), 0.17 * h
        x = w / 2 - cw / 2
        y = h * 0.20
        for i, cat in enumerate(CATEGORIES):
            unlocked = a.progress.is_category_unlocked(cat, a.levels.ids())
            rect = pygame.Rect(int(x), int(y + i * (ch + 22 * s)), int(cw), int(ch))
            out.append(Card("cat:" + cat.key, rect, self._card_drawer(cat, unlocked), enabled=unlocked,
                            tooltip="Abrir as fases %s" % cat.label.lower() if unlocked else
                            "Conclua a dificuldade anterior para liberar"))
        return out

    def _card_drawer(self, cat: Category, unlocked: bool):
        a = self.app

        def draw(surface, rect, hovered, enabled):
            s = a.scale
            th = a.theme
            r = rect.move(0, -int(3 * s)) if hovered else rect
            draw_panel(surface, r, th, s)
            done, total = a.progress.category_progress(cat)
            d = int(r.height * 0.62)
            c = (r.x + int(24 * s) + d // 2, r.centery)
            tone = {"easy": th["peony"], "medium": th["lavender"], "hard": th["sky"]}[cat.key] if enabled else (226, 221, 218)
            pygame.draw.circle(surface, tone, c, d // 2)
            if enabled:
                n = {"easy": 3, "medium": 4, "hard": 5}[cat.key]
                cell = int(d * 0.50 / n)
                gx, gy = c[0] - (n * cell) // 2, c[1] - (n * cell) // 2
                for i in range(n):
                    for j in range(n):
                        pygame.draw.rect(surface, th["text"], pygame.Rect(gx + j * cell + 1, gy + i * cell + 1, cell - 2, cell - 2),
                                         border_radius=max(1, cell // 4))
            else:
                draw_icon(surface, "lock", c, int(d * 0.5), th["text_soft"])
            x = c[0] + d // 2 + int(22 * s)
            col = th["text"] if enabled else th["text_soft"]
            draw_text(surface, cat.label, a.fonts.get(r.height * 0.30, True), col, midleft=(x, r.centery - int(r.height * 0.14)))
            sub = "Tabuleiro %d × %d" % (cat.size, cat.size) if enabled else "Conclua a dificuldade anterior"
            draw_text(surface, sub, a.fonts.get(r.height * 0.20), th["text_soft"], midleft=(x, r.centery + int(r.height * 0.2)))
            if enabled:
                draw_dots(surface, th, r.right - int(110 * s), r.centery - int(8 * s), done, total, int(9 * s), int(26 * s))
                draw_text(surface, "%d de %d" % (done, total), a.fonts.get(r.height * 0.18), th["text_soft"],
                          center=(r.right - int(110 * s), r.centery + int(r.height * 0.24)))
        return draw

    def on_button(self, key):
        if key.startswith("cat:"):
            self.app.state.category_key = key[4:]
            self.app.go(Screen.LEVELS)
        else:
            super().on_button(key)

    def draw(self, surface):
        self.draw_background(surface)
        self.draw_header(surface, "Dificuldade", "grid")
        self.draw_buttons(surface)
        self.draw_tooltip(surface)


class LevelsScreen(BaseScreen):
    def build_buttons(self, w, h):
        a, s = self.app, self.app.scale
        cat = category_by_key(a.state.category_key)
        out = [self.back_button(w, h)]
        cw = min((w - 80 * s - 2 * 24 * s) / 3, 240 * s)
        ch = cw * 1.15
        total = 3 * cw + 2 * 24 * s
        x0, y = w / 2 - total / 2, h * 0.34
        ids = a.levels.ids()
        for i, lid in enumerate(cat.level_ids):
            if not a.levels.has(lid):
                continue
            unlocked = a.progress.is_level_unlocked(lid, ids)
            rect = pygame.Rect(int(x0 + i * (cw + 24 * s)), int(y), int(cw), int(ch))
            out.append(Card("lvl:%d" % lid, rect, self._card_drawer(lid, unlocked), enabled=unlocked,
                            tooltip="Jogar o nível %d" % lid if unlocked else "Conclua o nível anterior para liberar"))
        return out

    def _card_drawer(self, lid: int, unlocked: bool):
        a = self.app

        def draw(surface, rect, hovered, enabled):
            s, th = a.scale, a.theme
            r = rect.move(0, -int(3 * s)) if hovered else rect
            draw_panel(surface, r, th, s)
            done = a.progress.is_completed(lid)
            tone = th["peony"] if done else (th["lavender"] if enabled else (226, 221, 218))
            c = (r.centerx, r.y + int(r.height * 0.36))
            pygame.draw.circle(surface, tone, c, int(r.width * 0.26))
            icon = "check" if done else ("play_game" if enabled else "lock")
            draw_icon(surface, icon, c, int(r.width * 0.28), th["text"] if enabled else th["text_soft"])
            draw_text(surface, "Nível %d" % lid, a.fonts.get(r.width * 0.15, True),
                      th["text"] if enabled else th["text_soft"], center=(r.centerx, r.y + int(r.height * 0.70)))
            label = "Concluído" if done else ("Disponível" if enabled else "Bloqueado")
            draw_text(surface, label, a.fonts.get(r.width * 0.095), th["text_soft"], center=(r.centerx, r.y + int(r.height * 0.84)))
        return draw

    def on_button(self, key):
        if key.startswith("lvl:"):
            self.app.start_level(int(key[4:]))
        else:
            super().on_button(key)

    def draw(self, surface):
        a = self.app
        cat = category_by_key(a.state.category_key)
        done, total = a.progress.category_progress(cat)
        self.draw_background(surface)
        self.draw_header(surface, cat.label, "grid", "Tabuleiro %d × %d" % (cat.size, cat.size))
        w, h = surface.get_size()
        draw_dots(surface, a.theme, w // 2, int(h * 0.255), done, total, int(9 * a.scale), int(26 * a.scale))
        self.draw_buttons(surface)
        self.draw_tooltip(surface)


class SettingsScreen(BaseScreen):
    ROWS = [("sound", "Efeitos sonoros"), ("volume", "Volume"), ("motion", "Animações"),
            ("contrast", "Contraste"), ("symbols", "Símbolos nos pontos")]

    def build_buttons(self, w, h):
        a, s = self.app, self.app.scale
        st = a.settings
        out = [self.back_button(w, h)]
        bx, bw, bh = w * 0.56, 300 * s, 54 * s
        y0, step = h * 0.22, 0.105 * h
        for i, (key, _) in enumerate(self.ROWS):
            y = y0 + i * step
            if key == "sound":
                out.append(self.btn("sound", "Ligados" if st.sound_enabled else "Desligados", bx, y, bw, bh, style="secondary"))
            elif key == "volume":
                out.append(self.btn("vol_down", "−", bx, y, bh, bh, style="secondary", tooltip="Diminuir o volume"))
                out.append(self.btn("vol_up", "+", bx + bw - bh, y, bh, bh, style="secondary", tooltip="Aumentar o volume"))
            elif key == "motion":
                out.append(self.btn("motion", "Reduzidas" if st.reduced_motion else "Normais", bx, y, bw, bh, style="secondary"))
            elif key == "contrast":
                out.append(self.btn("contrast", "Alto" if st.high_contrast else "Normal", bx, y, bw, bh, style="secondary"))
            elif key == "symbols":
                out.append(self.btn("symbols", "Mostrar" if st.show_symbols else "Ocultar", bx, y, bw, bh, style="secondary",
                                    tooltip="Símbolos dentro dos pontos ajudam a diferenciar as cores"))
        return out

    def on_button(self, key):
        a, st = self.app, self.app.settings
        if key == "sound":
            st.sound_enabled = not st.sound_enabled
        elif key == "vol_down":
            st.volume = max(0.0, round(st.volume - 0.1, 2))
        elif key == "vol_up":
            st.volume = min(1.0, round(st.volume + 0.1, 2))
        elif key == "motion":
            st.reduced_motion = not st.reduced_motion
        elif key == "contrast":
            st.high_contrast = not st.high_contrast
        elif key == "symbols":
            st.show_symbols = not st.show_symbols
        else:
            super().on_button(key)
            return
        a.apply_settings()
        a.settings_store.save()
        self.relayout()

    def draw(self, surface):
        a, s = self.app, self.app.scale
        w, h = surface.get_size()
        self.draw_background(surface)
        self.draw_header(surface, "Configurações", "gear")
        y0, step = h * 0.22, 0.105 * h
        for i, (key, label) in enumerate(self.ROWS):
            y = y0 + i * step + 27 * s
            draw_text(surface, label, a.fonts.get(26 * s), a.theme["text"], midleft=(int(w * 0.10), int(y)))
            if key == "volume":
                draw_text(surface, "%d%%" % round(a.settings.volume * 100), a.fonts.get(26 * s, True), a.theme["text"],
                          center=(int(w * 0.56 + 150 * s), int(y)))
        self.draw_buttons(surface)
        self.draw_tooltip(surface)


class ThemesScreen(BaseScreen):
    def __init__(self, app) -> None:
        super().__init__(app)
        self.demo = DemoSession()
        self.view = BoardView()

    def build_buttons(self, w, h):
        a, s = self.app, self.app.scale
        out = [self.back_button(w, h)]
        gap = 22 * s
        cw = min((w - 60 * s - 2 * gap) / 3, 300 * s)
        ch = min(h * 0.58, cw * 1.45)
        total = 3 * cw + 2 * gap
        x0, y = w / 2 - total / 2, h * 0.20
        for i, t in enumerate(THEMES):
            rect = pygame.Rect(int(x0 + i * (cw + gap)), int(y), int(cw), int(ch))
            out.append(Card("theme:" + t.key, rect, self._card_drawer(t), tooltip="Usar o tema %s" % t.label))
        return out

    def _card_drawer(self, t: BoardTheme):
        a = self.app

        def draw(surface, rect, hovered, enabled):
            s, th = a.scale, a.theme
            r = rect.move(0, -int(3 * s)) if hovered else rect
            draw_panel(surface, r, th, s)
            area = pygame.Rect(r.x + int(14 * s), r.y + int(14 * s), r.width - int(28 * s), int(r.height * 0.66))
            self.view.layout(area, 5)
            self.view.draw(surface, self.demo, t, a.palette, True, a.settings.high_contrast, s, a.time)
            draw_text(surface, t.label, a.fonts.get(r.width * 0.10, True), th["text"], center=(r.centerx, r.bottom - int(r.height * 0.20)))
            draw_text(surface, t.description, a.fonts.get(r.width * 0.062), th["text_soft"], center=(r.centerx, r.bottom - int(r.height * 0.09)))
            if a.progress.theme == t.key:
                c = (r.right - int(26 * s), r.y + int(26 * s))
                pygame.draw.circle(surface, th["focus"], c, int(17 * s))
                draw_icon(surface, "check", c, int(20 * s), CREAM)
        return draw

    def on_button(self, key):
        if key.startswith("theme:"):
            self.app.progress.set_theme(key[6:])
        else:
            super().on_button(key)

    def draw(self, surface):
        self.draw_background(surface)
        self.draw_header(surface, "Temas", "palette", "Só muda a aparência; as regras são as mesmas")
        self.draw_buttons(surface)
        self.draw_tooltip(surface)


class PlayScreen(BaseScreen):
    START_MESSAGES = ("Vá no seu ritmo.", "Não precisa ter pressa.", "Você pode experimentar outro caminho.")
    FIRST_LEVEL_MESSAGE = "Clique em um ponto e arraste até o ponto da mesma cor."

    def __init__(self, app) -> None:
        super().__init__(app)
        self.view = BoardView()
        self.reset_view()

    def reset_view(self) -> None:
        self.dragging = False
        self.last_pos: Optional[Tuple[int, int]] = None
        self.hint = None
        self.hint_t = 0.0
        self.message = ""
        self.msg_t = 0.0
        self.win_t: Optional[float] = None
        self.last_block_msg = 0.0
        self.tip_shown = False

    def build_buttons(self, w, h):
        s = self.app.scale
        return [
            self.back_button(w, h),
            self.btn("hint", "Dica", w - 24 * s - 170 * s, 18 * s, 170 * s, 54 * s, icon="hint", style="rose",
                     tooltip="Mostrar uma ajuda (sem limite)"),
        ]

    def relayout(self) -> None:
        super().relayout()
        w, h = self.app.window.get_size()
        level = self.app.session.level
        if level is not None:
            self.view.layout(pygame.Rect(int(w * 0.04), int(h * 0.20), int(w * 0.92), int(h * 0.62)), level.size)

    def on_button(self, key):
        if key == "back":
            self.leave()
        elif key == "hint":
            self.do_hint()

    def on_escape(self) -> None:
        self.leave()

    def leave(self) -> None:
        self.app.leave_level()
        self.app.back()

    def say(self, text: str, secs: float = 4.0) -> None:
        self.message, self.msg_t = text, secs

    def base_message(self) -> str:
        lvl = self.app.session.level
        if lvl.id == 1:
            return self.FIRST_LEVEL_MESSAGE
        return self.START_MESSAGES[lvl.id % len(self.START_MESSAGES)]

    def do_hint(self) -> None:
        if self.win_t is not None:
            return
        self.hint = self.app.session.hint()
        self.hint_t = 10.0
        self.app.sounds.play("select")

    def handle_event(self, ev) -> bool:
        if super().handle_event(ev):
            return True
        if self.win_t is not None:
            return False
        if ev.type == pygame.MOUSEBUTTONDOWN:
            if ev.button == 1:
                self.begin_drag(ev.pos)
            elif ev.button == 3:
                self.clear_at(ev.pos)
            return True
        if ev.type == pygame.MOUSEMOTION and self.dragging:
            self.drag(ev.pos)
        elif ev.type == pygame.MOUSEBUTTONUP and ev.button == 1 and self.dragging:
            self.end_drag()
        return False

    def begin_drag(self, pos) -> None:
        self.hint = None
        cell = self.view.cell_at(pos)
        if cell is None:
            return
        res = self.app.session.start_connection(cell)
        if res.kind in (MoveKind.STARTED, MoveKind.RESUMED):
            self.dragging = True
            self.last_pos = pos
            self.app.sounds.play("select")
            if res.replaced:
                self.say("Conexão refeita a partir deste ponto. Sem problema!")

    def drag(self, pos) -> None:
        seq = cells_along_segment(self.last_pos, pos, self.view.origin, self.view.cell, self.view.size)
        self.last_pos = pos
        if seq is None:
            return
        for res in self.app.session.follow_cells(seq):
            if res.kind == MoveKind.COMPLETED:
                self.app.sounds.play("pour")
            elif res.kind in (MoveKind.BLOCKED_OCCUPIED, MoveKind.BLOCKED_DOT):
                if self.app.time - self.last_block_msg > 3.0:
                    self.say("Esse espaço já está ocupado por outro caminho. Você pode experimentar outro.")
                    self.last_block_msg = self.app.time
        self.check_win()

    def end_drag(self) -> None:
        self.dragging = False
        color = self.app.session.finish_connection().color
        self.check_win()
        board = self.app.session.board
        p = board.paths.get(color) if color is not None else None
        if p is not None and not p.complete and len(p.cells) > 1 and not self.tip_shown and self.win_t is None:
            self.tip_shown = True
            self.say("Você pode continuar de onde parou ou clicar no ponto para refazer.", 7.0)

    def clear_at(self, pos) -> None:
        cell = self.view.cell_at(pos)
        if cell is None:
            return
        s = self.app.session
        color = s.board.dot_color(cell)
        if color is None:
            color = s.board.path_color_at(cell)
        if color is not None and s.cancel_connection(color).kind == MoveKind.CLEARED:
            self.hint = None
            self.app.sounds.play("undo")
            self.say("Caminho removido. Você pode tentar outro.")

    def check_win(self) -> None:
        if self.win_t is None and self.app.session.is_won():
            self.win_t = 0.0
            self.dragging = False
            self.hint = None
            self.say("Muito bem! Você encontrou uma solução.", 6.0)

    def update(self, dt: float) -> None:
        if self.msg_t > 0:
            self.msg_t -= dt
        if self.hint is not None:
            self.hint_t -= dt
            if self.hint_t <= 0:
                self.hint = None
        if self.win_t is not None:
            self.win_t += dt
            if self.win_t >= (0.25 if self.app.settings.reduced_motion else 1.0):
                self.win_t = None
                self.app.complete_level()

    def draw(self, surface):
        a, s = self.app, self.app.scale
        w, h = surface.get_size()
        sess = a.session
        lvl = sess.level
        self.draw_background(surface)
        cat = category_of_level(lvl.id)
        draw_text(surface, "Nível %d" % lvl.id, a.fonts.get(40 * s, True), a.theme["cacao"], center=(w // 2, int(h * 0.058)))
        draw_text(surface, "%s · %d × %d" % (cat.label, lvl.size, lvl.size), a.fonts.get(20 * s), a.theme["text_soft"],
                  center=(w // 2, int(h * 0.058) + int(36 * s)))
        board = sess.board
        n = len(board.colors)
        gap = int(30 * s)
        x0 = w // 2 - ((n - 1) * gap) // 2
        y = int(h * 0.058) + int(66 * s)
        for i, color in enumerate(board.colors):
            c = (x0 + i * gap, y)
            col = a.palette[color].rgb
            if board.paths.get(color) is not None and board.paths[color].complete:
                pygame.draw.circle(surface, col, c, int(9 * s))
            else:
                pygame.draw.circle(surface, a.theme["lavender"], c, int(9 * s))
                pygame.draw.circle(surface, col, c, int(9 * s), width=max(2, int(3 * s)))
        done, total = sess.progress()
        draw_text(surface, "Conexões: %d de %d" % (done, total), a.fonts.get(18 * s), a.theme["text_soft"],
                  center=(w // 2, y + int(26 * s)))
        self.view.draw(surface, sess, a.board_theme, a.palette, a.settings.symbols_visible, a.settings.high_contrast, s,
                       a.time, self.hint, a.settings.reduced_motion)
        self.draw_message(surface)
        self.draw_buttons(surface)

    def draw_message(self, surface) -> None:
        a, s = self.app, self.app.scale
        w, h = surface.get_size()
        if self.hint is not None:
            text = self.hint.message
        elif self.msg_t > 0 and self.message:
            text = self.message
        else:
            text = self.base_message()
        font = a.fonts.get(22 * s)
        head = load_mascot("mascot_think", int(60 * s))
        head_w = head.get_width() if head else 0
        max_text = int(w * 0.72)
        lines = []
        from .ui import wrap_text
        lines = wrap_text(text, font, max_text)
        tw = max(font.size(l)[0] for l in lines)
        lh = int(font.get_linesize() * 1.05)
        bw = tw + head_w + int(60 * s)
        bh = max(int(66 * s), lh * len(lines) + int(26 * s))
        rect = pygame.Rect(0, 0, bw, bh)
        rect.center = (w // 2, int(h * 0.915))
        draw_bubble(surface, rect, a.theme, s)
        if head:
            surface.blit(head, head.get_rect(midleft=(rect.x + int(12 * s), rect.centery)))
        ty = rect.centery - (lh * len(lines)) // 2
        for i, line in enumerate(lines):
            draw_text(surface, line, font, a.theme["text"], midleft=(rect.x + head_w + int(34 * s), ty + i * lh + lh // 2))


@dataclass
class CompletionInfo:
    level_id: int
    category: Category
    done: int
    total: int
    category_done: bool
    unlocked: Optional[Category]
    all_done: bool
    next_id: Optional[int]


def draw_doodle(surface, theme, center, width: int, color, flip: bool = False) -> None:
    """Enfeite: dois pontos ligados por um caminho em "L" (a ideia do jogo em miniatura)."""
    cx, cy = center
    r = max(4, width // 9)
    sgn = -1 if flip else 1
    p0, p1, p2 = (cx - sgn * width // 2, cy + width // 3), (cx - sgn * width // 2, cy - width // 3), (cx + sgn * width // 2, cy - width // 3)
    for a, b in ((p0, p1), (p1, p2)):
        pygame.draw.rect(surface, color, pygame.Rect(min(a[0], b[0]) - r // 2, min(a[1], b[1]) - r // 2,
                                                     abs(b[0] - a[0]) + r, abs(b[1] - a[1]) + r), border_radius=r // 2)
    for p in (p0, p2):
        pygame.draw.circle(surface, CREAM, p, r + max(2, r // 3))
        pygame.draw.circle(surface, color, p, r)


class CompleteScreen(BaseScreen):
    def build_buttons(self, w, h):
        a, s = self.app, self.app.scale
        info = a.completion
        bw = min(420 * s, w - 80 * s)
        x, y = w / 2 - bw / 2, h * 0.66
        out = []
        if info is not None and info.next_id is not None:
            out.append(self.btn("next", "Próximo", x, y, bw, 66 * s, icon="next", style="primary", tooltip="Ir para a próxima fase"))
        else:
            out.append(self.btn("difficulty", "Fases", x, y, bw, 66 * s, icon="grid", style="primary", tooltip="Escolher outra fase"))
        out.append(self.btn("levels", "Voltar às fases", x, y + 82 * s, bw, 58 * s, icon="back", style="secondary",
                            tooltip="Ver as fases desta dificuldade"))
        return out

    def on_button(self, key):
        a, info = self.app, self.app.completion
        if key == "next" and info is not None and info.next_id is not None:
            a.start_level(info.next_id)
        elif key == "difficulty":
            a.go(Screen.DIFFICULTY)
        elif key == "levels":
            if info is not None:
                a.state.category_key = info.category.key
            a.go(Screen.LEVELS)

    def draw(self, surface):
        a, s = self.app, self.app.scale
        w, h = surface.get_size()
        info = a.completion
        self.draw_background(surface)
        calm = a.settings.reduced_motion
        mh = int(h * 0.19)
        base_y = int(h * 0.26)
        hop = 0 if calm else abs(math.sin(a.time * 3.4)) * 14 * s
        draw_doodle(surface, a.theme, (int(w / 2 - mh * 1.05), int(base_y - mh * 0.45)), int(mh * 0.55), a.palette[0].rgb)
        draw_doodle(surface, a.theme, (int(w / 2 + mh * 1.05), int(base_y - mh * 0.45)), int(mh * 0.55), a.palette[1].rgb, True)
        draw_mascot(surface, "mascot_happy", mh, (w // 2, int(base_y - hop)))
        if a.theme["thick"] <= 3:
            spark = ((-0.30, 0.04, 11, "rose"), (0.31, 0.01, 14, "lavender"), (0.22, 0.15, 8, "leaf"),
                     (-0.22, 0.13, 9, "lavender"), (-0.36, 0.15, 7, "leaf"), (0.38, 0.10, 9, "rose"))
            for k, (dx, dy, r, col) in enumerate(spark):
                pulse = 1.0 if calm else 0.7 + 0.3 * math.sin(a.time * 4 + k * 1.7)
                draw_sparkle(surface, (int(w / 2 + dx * mh * 1.6), int(h * 0.08 + dy * h)), int(r * s * pulse), a.theme[col])
            for k in range(3):
                t = 0.4 + 0.2 * k if calm else (a.time * 0.45 + k / 3.0) % 1.0
                hx = w / 2 + (k - 1) * mh * 0.22 + (0 if calm else math.sin(a.time * 2 + k * 2) * 8 * s)
                hy = base_y - mh * (0.70 + 0.40 * t)
                draw_heart(surface, (int(hx), int(hy)), int((11 + 4 * (k % 2)) * s), a.theme["rose"])
        y = draw_paragraph(surface, "Parabéns! Você encontrou os caminhos!", a.fonts.get(38 * s, True), a.theme["cacao"],
                           w // 2, int(h * 0.33), int(w * 0.9))
        if info is not None:
            done_txt = "%s: %d de %d" % (info.category.label, info.done, info.total)
            draw_dots(surface, a.theme, w // 2, int(h * 0.45), info.done, info.total, int(10 * s), int(30 * s))
            draw_text(surface, done_txt, a.fonts.get(22 * s), a.theme["text_soft"], center=(w // 2, int(h * 0.485)))
            if info.all_done:
                note = "Conquista! Você concluiu todas as fases do MKconnection."
            elif info.category_done:
                note = "Conquista! Você concluiu a dificuldade %s." % info.category.label
                if info.unlocked is not None:
                    note += " A dificuldade %s foi liberada!" % info.unlocked.label
            else:
                note = "Muito bem! Você encontrou uma solução."
            draw_paragraph(surface, note, a.fonts.get(24 * s), a.theme["text"], w // 2, int(h * 0.525), int(w * 0.86))
        self.draw_buttons(surface)
        self.draw_tooltip(surface)


class App:
    MIN_SIZE = MIN_WINDOW
    notice = ""
    LOG_FILE = Path(__file__).resolve().parent.parent / "erro_mkconnection.log"

    def __init__(self) -> None:
        pygame.init()
        pygame.display.set_caption("MKconnection")
        self.window = pygame.display.set_mode(self._initial_window_size(), pygame.RESIZABLE)
        self.clock = pygame.time.Clock()
        self.fonts = Fonts()
        self.settings_store = SettingsStore()
        self.settings = self.settings_store.settings
        self.progress = ProgressStore()
        self.levels = LevelManager()
        self.sounds = SoundManager(self.settings)
        self.state = AppState()
        self.session = GameSession()
        self.snapshots: Dict[int, Dict] = {}
        self.completion: Optional[CompletionInfo] = None
        self.time = 0.0
        self.theme = make_theme(self.settings.high_contrast)
        self.screens: Dict[Screen, BaseScreen] = {
            Screen.MENU: MenuScreen(self), Screen.DIFFICULTY: DifficultyScreen(self), Screen.LEVELS: LevelsScreen(self),
            Screen.PLAYING: PlayScreen(self), Screen.COMPLETE: CompleteScreen(self),
            Screen.SETTINGS: SettingsScreen(self), Screen.THEMES: ThemesScreen(self),
        }
        self.screens[Screen.MENU].on_enter()

    def _initial_window_size(self) -> Tuple[int, int]:
        w, h = WINDOW_SIZE
        try:
            dw, dh = pygame.display.get_desktop_sizes()[0]
        except (pygame.error, IndexError):
            return w, h
        w = min(w, int(dw * SCREEN_FRACTION))
        h = min(h, int(dh * SCREEN_FRACTION))
        return max(w, self.MIN_SIZE[0]), max(h, self.MIN_SIZE[1])

    @property
    def scale(self) -> float:
        w, h = self.window.get_size()
        return max(0.55, min(w / DESIGN_SIZE[0], h / DESIGN_SIZE[1], 2.0))

    @property
    def board_theme(self) -> BoardTheme:
        return get_theme(self.progress.theme)

    @property
    def palette(self):
        return HC_PATH_COLORS if self.settings.high_contrast else PATH_COLORS

    def apply_settings(self) -> None:
        self.settings.validate()
        self.theme = make_theme(self.settings.high_contrast)

    def go(self, screen: Screen) -> None:
        self.state.go(screen)
        self.screens[screen].on_enter()

    def back(self) -> None:
        target = self.state.back()
        if target is not None:
            self.screens[target].on_enter()

    def start_level(self, level_id: int) -> None:
        level = self.levels.get(level_id)
        self.state.category_key = level.category or category_of_level(level_id).key
        self.session.load_level(level)
        snap = self.snapshots.get(level_id)
        if snap:
            self.session.restore(snap)
        self.progress.set_last_level(level_id)
        self.screens[Screen.PLAYING].reset_view()
        self.go(Screen.PLAYING)

    def leave_level(self) -> None:
        """Guarda o andamento da fase (nesta sessão) antes de sair dela."""
        level = self.session.level
        if level is None:
            return
        if self.session.is_won():
            self.snapshots.pop(level.id, None)
        else:
            self.snapshots[level.id] = self.session.snapshot()

    def complete_level(self) -> None:
        level = self.session.level
        ids = self.levels.ids()
        cat = category_of_level(level.id)
        before = {c.key: self.progress.is_category_unlocked(c, ids) for c in CATEGORIES}
        self.progress.mark_completed(level.id)
        self.snapshots.pop(level.id, None)
        done, total = self.progress.category_progress(cat)
        unlocked = None
        for c in CATEGORIES:
            if not before[c.key] and self.progress.is_category_unlocked(c, ids):
                unlocked = c
        all_done = all(i in self.progress.completed for i in ids)
        self.completion = CompletionInfo(level.id, cat, done, total, done == total, unlocked, all_done,
                                         self.levels.next_id(level.id))
        self.sounds.play("win")
        self.go(Screen.COMPLETE)

    def log_error(self, what: str) -> None:
        try:
            env = "Python %s | pygame %s | %s | janela %s | tela %s" % (
                sys.version.split()[0], pygame.version.ver, platform.platform(),
                self.window.get_size() if self.window else "?", self.state.current.name)
        except Exception:
            env = "(sem detalhes do ambiente)"
        text = "%s\n%s\n%s" % (what, env, traceback.format_exc())
        logging.error(text)
        try:
            with open(self.LOG_FILE, "a", encoding="utf-8") as fh:
                fh.write("[%s] %s\n" % (_time.strftime("%Y-%m-%d %H:%M:%S"), text))
        except OSError:
            pass

    @staticmethod
    def short_error() -> str:
        et, ev, tb = sys.exc_info()
        where = ""
        while tb is not None and tb.tb_next is not None:
            tb = tb.tb_next
        if tb is not None:
            where = " (%s:%d)" % (Path(tb.tb_frame.f_code.co_filename).name, tb.tb_lineno)
        return "%s: %s%s" % (et.__name__ if et else "Erro", str(ev)[:120], where)

    def recover_from_error(self) -> None:
        self.log_error("Erro na tela %s" % self.state.current)
        self.notice = "Ops, algo deu errado, mas está tudo bem! Erro -> " + self.short_error()
        self.screens[Screen.PLAYING].reset_view()
        self.state.go(Screen.MENU)
        self.screens[Screen.MENU].on_enter()

    def run(self) -> None:
        recent: List[float] = []
        try:
            while self.state.running:
                try:
                    dt = min(self.clock.tick(60) / 1000.0, 0.1)
                    self.time += dt
                    self.window = pygame.display.get_surface()
                    for ev in pygame.event.get():
                        if ev.type == pygame.QUIT:
                            self.state.quit()
                        elif ev.type == pygame.VIDEORESIZE:
                            w, h = max(ev.w, self.MIN_SIZE[0]), max(ev.h, self.MIN_SIZE[1])
                            if (w, h) != (ev.w, ev.h):
                                pygame.display.set_mode((w, h), pygame.RESIZABLE)
                            self.window = pygame.display.get_surface()
                            self.screens[self.state.current].relayout()
                        else:
                            self.screens[self.state.current].handle_event(ev)
                    screen = self.screens[self.state.current]
                    screen.update(dt)
                    screen.draw(self.window)
                    pygame.display.flip()
                except Exception:
                    now = _time.monotonic()
                    recent = [t for t in recent if now - t < 3.0] + [now]
                    if len(recent) > 4:
                        self.log_error("Erro repetido; encerrando")
                        raise
                    self.recover_from_error()
        finally:
            self.settings_store.save()
            self.progress.save()
            pygame.quit()
