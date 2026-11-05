from __future__ import annotations

import asyncio
import dataclasses
import logging
import math
import platform
import sys
import time as _time
import traceback
from pathlib import Path
from typing import List, Optional

import pygame

from .bottle import draw_bottle
from .breathing import (DISCLAIMER, FINISHED, IDLE, MESSAGE, PAUSED as B_PAUSED, PRESETS,
                        RUNNING, BreathingExercise)
from .game_logic import GameSession
from . import web
from .game_state import AppState, Screen
from .level_manager import LevelManager
from .level_generator import randomize_bottles
from .liquid import get_palette
from .progress import ProgressStore
from .settings import SettingsStore
from .sounds import SoundManager
from .ui import (Button, Fonts, draw_background, draw_heart, draw_mascot, draw_sparkle, load_mascot, draw_icon, draw_panel, draw_paragraph,
                 draw_text, make_theme)


BIG_BOTTLES_FROM_LEVEL = 3
STUCK_KEYS = ("stuck_undo", "stuck_restart", "stuck_close")


class BoardView:

    def __init__(self, app: "App", session: GameSession) -> None:
        self.app, self.session = app, session
        self.area = pygame.Rect(0, 0, 100, 100)
        self.rects: List[pygame.Rect] = []
        self.cells: List[pygame.Rect] = []
        self.lift: List[float] = []
        self.pour: Optional[dict] = None
        self.hint = None

    def layout(self, area: pygame.Rect) -> None:
        self.area = area
        n = len(self.session.state)
        cap = self.session.capacity
        s = self.app.scale
        self.rects, self.cells = [], []
        if n == 0:
            self.lift = []
            return
        rows = 1 if n <= 5 else 2
        per_row = math.ceil(n / rows)
        row_h = area.height / rows
        ratio = 0.9 * cap + 0.4

        big = self.session.level_id >= BIG_BOTTLES_FROM_LEVEL
        bottle_h = min(row_h * (0.78 if big else 0.74), 95 * s * ratio * (1.15 if big else 1.0))
        cell_w = area.width / per_row
        bottle_w = min(cell_w * 0.6, bottle_h / ratio)
        for i in range(n):
            r, c = divmod(i, per_row)
            in_row = per_row if r < rows - 1 else n - per_row * (rows - 1)
            x0 = area.x + (area.width - in_row * cell_w) / 2 + c * cell_w
            y0 = area.y + r * row_h
            self.cells.append(pygame.Rect(int(x0), int(y0), int(cell_w), int(row_h)))
            self.rects.append(pygame.Rect(int(x0 + (cell_w - bottle_w) / 2),
                                          int(y0 + (row_h - bottle_h) / 2 + 14 * s), int(bottle_w), int(bottle_h)))
        if len(self.lift) != n:
            self.lift = [0.0] * n

    def hit(self, pos) -> Optional[int]:
        for i, cell in enumerate(self.cells):
            if cell.collidepoint(pos):
                return i
        return None

    def clear_effects(self) -> None:
        self.pour, self.hint = None, None

    def on_result(self, result) -> None:
        if result.kind == "moved" and not self.app.settings.reduced_motion:
            color = self.session.state[result.dst][-1]
            self.pour = {"src": result.src, "dst": result.dst, "count": result.move.count, "color": color, "t": 0.0}
        else:
            self.pour = None

    def update(self, dt: float) -> None:
        if len(self.lift) != len(self.session.state):
            self.layout(self.area)
        for i in range(len(self.lift)):
            target = 1.0 if self.session.selected == i else 0.0
            if self.app.settings.reduced_motion:
                self.lift[i] = target
            else:
                self.lift[i] += (target - self.lift[i]) * min(1.0, dt * 14)
        if self.pour:
            self.pour["t"] += dt / 0.5
            if self.pour["t"] >= 1.0:
                self.pour = None

    def draw(self, surface) -> None:
        if len(self.rects) != len(self.session.state):
            self.layout(self.area)
        app, s = self.app, self.app.scale
        fonts, theme = app.fonts, app.theme
        drawn = []
        for i, base in enumerate(self.rects):
            units = self.session.state[i]
            lift_px = 10 if self.session.level_id >= BIG_BOTTLES_FROM_LEVEL else 22
            rect = base.move(0, -int(self.lift[i] * lift_px * s))
            highlight = "selected" if self.session.selected == i else None
            if self.hint:
                if i == self.hint[0]:
                    highlight = "hint_from"
                elif i == self.hint[1]:
                    highlight = "hint_to"
            anim = None
            if self.pour:
                p = self.pour
                if i == p["dst"]:
                    anim = ("in", p["count"], p["t"], p["color"])
                elif i == p["src"]:
                    anim = ("out", p["count"], p["t"], p["color"])
            draw_bottle(surface, rect, units, self.session.capacity, app.palette, theme,
                        show_patterns=app.settings.patterns_visible, thick=theme["thick"],
                        highlight=highlight, anim=anim, scale=s)
            drawn.append((i, base, units))

        for i, base, units in drawn:


            if self.hint and i in self.hint:
                label = ("De %d" if i == self.hint[0] else "Para %d") % (i + 1)
                font = fonts.get(18 * s, bold=True)
                tw = font.size(label)[0] + int(20 * s)
                pill = pygame.Rect(0, 0, tw, int(26 * s))
                pill.midtop = (base.centerx, base.bottom + int(6 * s))
                pygame.draw.rect(surface, theme["jungle"], pill, border_radius=int(13 * s))
                draw_text(surface, label, font, (252, 244, 238), center=pill.center)
            else:
                num = draw_text(surface, str(i + 1), fonts.get(20 * s), theme["text_soft"],
                                midtop=(base.centerx, base.bottom + int(8 * s)))
                if len(units) == self.session.capacity and len(set(units)) == 1:

                    r = int(11 * s)
                    center = (num.right + int(6 * s) + r, num.centery)
                    pygame.draw.circle(surface, theme["jungle"], center, r)
                    draw_icon(surface, "check", center, int(14 * s), (252, 244, 238))


class BaseScreen:
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

    def on_button(self, key: str) -> None:
        pass


    def handle_event(self, ev) -> bool:
        if ev.type == pygame.MOUSEBUTTONDOWN and ev.button == 1:
            for b in self.buttons:
                if b.enabled and b.rect.collidepoint(ev.pos):
                    self.focus = -1
                    self.on_button(b.key)
                    return True
        elif ev.type == pygame.KEYDOWN:
            enabled = [i for i, b in enumerate(self.buttons) if b.enabled]
            if ev.key == pygame.K_TAB and enabled:
                step = -1 if ev.mod & pygame.KMOD_SHIFT else 1
                if self.focus in enabled:
                    self.focus = enabled[(enabled.index(self.focus) + step) % len(enabled)]
                else:
                    self.focus = enabled[0 if step == 1 else -1]
                return True
            if ev.key in (pygame.K_RETURN, pygame.K_KP_ENTER, pygame.K_SPACE) and 0 <= self.focus < len(self.buttons):
                if self.buttons[self.focus].enabled:
                    self.on_button(self.buttons[self.focus].key)
                    return True
        return False

    def update(self, dt: float) -> None:
        pass


    def tooltip_text(self) -> str:
        pos = pygame.mouse.get_pos()
        for b in self.buttons:
            if b.rect.collidepoint(pos) and b.tooltip:
                return b.tooltip
        if 0 <= self.focus < len(self.buttons):
            return self.buttons[self.focus].tooltip
        return ""

    def draw_buttons(self, surface) -> None:
        pos = pygame.mouse.get_pos()
        for i, b in enumerate(self.buttons):
            b.draw(surface, self.app.theme, self.app.fonts, self.app.scale,
                   b.enabled and b.rect.collidepoint(pos), i == self.focus)

    def draw_tooltip(self, surface, y: Optional[int] = None) -> None:
        text = self.tooltip_text()
        if text:
            w, h = surface.get_size()
            draw_text(surface, text, self.app.fonts.get(20 * self.app.scale), self.app.theme["text_soft"],
                      center=(w // 2, y if y is not None else h - int(24 * self.app.scale)))

    def draw(self, surface) -> None:
        draw_background(surface, self.app.theme)
        self.draw_buttons(surface)
        self.draw_tooltip(surface)


    def btn(self, key, label, x, y, w, h, **kw) -> Button:
        return Button(key, label, pygame.Rect(int(x), int(y), int(w), int(h)), **kw)


MENU_BOTTLES = [(0, 0, 0, 0), (1, 1, 2, 2), (3, 3, 3, 5), (4, 4, 4, 4), ()]


class MenuScreen(BaseScreen):
    def build_buttons(self, w, h):
        s = self.app.scale
        bw, bh, gap = 340 * s, 62 * s, 16 * s
        x, y = w * 0.74 - bw / 2, h * 0.40
        if web.EMBUTIDO:
            x, y = w / 2 - bw / 2, h * 0.30
        items = [
            ("play", "Jogar", "play_game", "primary", "Continuar de onde você parou"),
            ("howto", "Como jogar", "help", "secondary", "Veja o passo a passo com um exemplo"),
            ("breathe", "Respirar", "breathe", "soft", "Um momento de pausa com respiração guiada"),
            ("settings", "Configurações", "gear", "secondary", "Sons, animações, ritmo e contraste"),
        ]
        if web.EMBUTIDO:  # o MKpause já tem a atividade de respiração
            items = [i for i in items if i[0] != "breathe"]
        out = []
        for key, label, icon, style, tip in items:
            out.append(self.btn(key, label, x, y, bw, bh, icon=icon, style=style, tooltip=tip))
            y += bh + gap
        out.append(self.btn("levels", "Escolher fase", x, y, bw, 50 * s, icon="grid", style="soft",
                            tooltip="Escolha uma fase liberada ou comece uma nova partida"))
        return out

    def on_button(self, key):
        a = self.app
        if key == "play":
            a.start_level(a.progress.next_to_play(a.levels.ids()))
        elif key == "howto":
            a.go(Screen.HOWTO)
        elif key == "breathe":
            a.go(Screen.BREATHING)
        elif key == "settings":
            a.go(Screen.SETTINGS)
        elif key == "levels":
            a.go(Screen.LEVELS)

    def draw(self, surface):
        a, s = self.app, self.app.scale
        w, h = surface.get_size()
        draw_background(surface, a.theme)
        cx = int(w * 0.74)
        if web.EMBUTIDO:
            # Dentro do MKpause: título e botões, direto ao ponto.
            draw_text(surface, "MK Potion", a.fonts.titulo(72 * s), a.theme["cacao"], center=(w // 2, int(h * 0.17)))
            if a.notice:
                draw_paragraph(surface, a.notice, a.fonts.get(18 * s), a.theme["text_soft"], w // 2, h - int(112 * s), int(w * 0.9))
            self.draw_buttons(surface)
            self.draw_tooltip(surface)
            return
        draw_text(surface, "MK Potion", a.fonts.titulo(72 * s), a.theme["cacao"], center=(cx, int(h * 0.15)))
        draw_paragraph(surface, "Bem-vindo(a)! Aqui você joga com calma, no seu ritmo. Não há tempo nem pressa.",
                       a.fonts.get(24 * s), a.theme["text_soft"], cx, int(h * 0.23), int(400 * s))

        hop = 0 if a.settings.reduced_motion else abs(math.sin(a.time * 1.6)) * 6 * s
        draw_mascot(surface, "mascot_front", int(h * 0.25), (int(w * 0.26), int(h * 0.285 - hop)))

        bw, bh, gap = 64 * s, 250 * s, 26 * s
        total = len(MENU_BOTTLES) * bw + (len(MENU_BOTTLES) - 1) * gap
        x0 = w * 0.26 - total / 2
        for i, units in enumerate(MENU_BOTTLES):
            bob = 0 if a.settings.reduced_motion else math.sin(a.time * 1.2 + i) * 5 * s
            rect = pygame.Rect(int(x0 + i * (bw + gap)), int(h * 0.30 + bob + (i % 2) * 20 * s), int(bw), int(bh))
            draw_bottle(surface, rect, units, 4, a.palette, a.theme, show_patterns=a.settings.patterns_visible,
                        thick=a.theme["thick"], scale=s)
        draw_text(surface, "Organize as cores, uma garrafa de cada vez.", a.fonts.get(22 * s), a.theme["text_soft"],
                  center=(int(w * 0.26), int(h * 0.30 + bh + 70 * s)))
        if a.progress.error:
            draw_text(surface, a.progress.error, a.fonts.get(18 * s), a.theme["text_soft"], midbottom=(w // 2, h - int(46 * s)))
        if a.notice:
            draw_paragraph(surface, a.notice, a.fonts.get(18 * s), a.theme["text_soft"], w // 2, h - int(112 * s), int(w * 0.9))
        self.draw_buttons(surface)
        self.draw_tooltip(surface)


STEPS = [
    "Escolha uma garrafa.",
    "Escolha para qual garrafa deseja transferir o líquido.",
    "Organize as cores até separar cada uma em sua própria garrafa.",
    "Utilize os botões de ajuda quando precisar.",
]


class HowToScreen(BaseScreen):
    def __init__(self, app):
        super().__init__(app)
        self.demo = GameSession()
        self.board = BoardView(app, self.demo)
        self.restart_demo()

    def restart_demo(self):

        self.demo.start_custom(((0, 1), (1, 0), ()), 2, 0, "Exemplo")
        self.board.clear_effects()

    def build_buttons(self, w, h):
        s = self.app.scale
        self.board.layout(pygame.Rect(int(w * 0.52), int(h * 0.22), int(w * 0.43), int(h * 0.42)))
        return [
            self.btn("back", "Voltar ao menu", 30 * s, h - 84 * s, 280 * s, 58 * s, icon="back", style="primary",
                     tooltip="Voltar para a tela inicial"),
            self.btn("reset", "Reiniciar exemplo", w - 330 * s, h - 84 * s, 300 * s, 58 * s, icon="restart",
                     style="secondary", tooltip="Começar o exemplo de novo"),
        ]

    def on_button(self, key):
        if key == "back":
            self.app.go(Screen.MENU)
        elif key == "reset":
            self.restart_demo()

    def handle_event(self, ev):
        if super().handle_event(ev):
            return True
        if ev.type == pygame.MOUSEBUTTONDOWN and ev.button == 1:
            i = self.board.hit(ev.pos)
            if i is not None and not self.demo.is_won():
                res = self.demo.click(i)
                self.board.on_result(res)
                self.app.sounds.play("pour" if res.kind == "moved" else "select")
                return True
        elif ev.type == pygame.KEYDOWN and ev.key == pygame.K_ESCAPE:
            self.app.go(Screen.MENU)
        return False

    def update(self, dt):
        self.board.update(dt)

    def draw(self, surface):
        a, s = self.app, self.app.scale
        w, h = surface.get_size()
        draw_background(surface, a.theme)
        t_rect = draw_text(surface, "Como jogar", a.fonts.titulo(52 * s), a.theme["cacao"], center=(w // 2, int(h * 0.09)))
        draw_icon(surface, "help", (t_rect.left - int(40 * s), t_rect.centery), int(44 * s), a.theme["rose"])
        y = int(h * 0.20)
        step_h = int(h * 0.14)
        for i, text in enumerate(STEPS):
            pygame.draw.circle(surface, a.theme["jungle"], (int(w * 0.075), y + int(20 * s)), int(20 * s))
            draw_text(surface, str(i + 1), a.fonts.get(24 * s, True), (252, 244, 238), center=(int(w * 0.075), y + int(20 * s)))
            end = draw_paragraph(surface, text, a.fonts.get(24 * s), a.theme["text"], 0, y + int(6 * s), int(w * 0.36),
                                 align_left=int(w * 0.115))
            y = max(y + int(h * 0.12), end + int(16 * s))
        draw_panel(surface, self.board.area.inflate(int(30 * s), int(50 * s)), a.theme, s)
        self.board.draw(surface)
        msg = ("Muito bem! Era assim mesmo." if self.demo.is_won()
               else "Experimente: toque em uma garrafa e depois em outra.")
        draw_paragraph(surface, msg, a.fonts.get(22 * s), a.theme["text_soft"], int(w * 0.735),
                       int(h * 0.64) + int(36 * s), int(w * 0.44))
        self.draw_buttons(surface)
        self.draw_tooltip(surface, h - int(20 * s) - int(0 * s))


class PlayScreen(BaseScreen):
    def __init__(self, app):
        super().__init__(app)
        self.board = BoardView(app, app.session)
        self.reset_view()

    def reset_view(self):
        self.message, self.msg_t = "", 0.0
        self.win_t: Optional[float] = None
        self.stuck = ""
        self.stuck_popup = False
        self.popup_delay: Optional[float] = None
        self.board.clear_effects()
        self.board.lift = []

    def say(self, text: str, secs: float = 4.5):
        self.message, self.msg_t = text, secs

    def build_buttons(self, w, h):
        s = self.app.scale
        top = max(110 * s, h * 0.2)
        if self.app.session.level_id >= BIG_BOTTLES_FROM_LEVEL:
            top = max(104 * s, h * 0.15)
        self.board.layout(pygame.Rect(int(30 * s), int(top), int(w - 60 * s), int(h - 165 * s - top)))
        bw, bh, gap = 210 * s, 62 * s, 14 * s
        y = h - 84 * s
        items = [
            ("restart", "Reiniciar", "restart", "secondary", "Reiniciar: volta a fase ao começo"),
            ("undo", "Desfazer", "undo", "secondary", "Desfazer: volta uma jogada (quantas vezes quiser)"),
            ("hint", "Dica", "hint", "rose", "Dica: mostra um movimento que ajuda"),
            ("breathe", "Respirar", "breathe", "soft", "Respirar: abre o exercício de respiração"),
        ]
        if web.EMBUTIDO:
            items = [i for i in items if i[0] != "breathe"]
        x = (w - (len(items) * bw + (len(items) - 1) * gap)) / 2
        out = []
        for k, (key, label, icon, style, tip) in enumerate(items):
            out.append(self.btn(key, label, x + k * (bw + gap), y, bw, bh, icon=icon, style=style, tooltip=tip))
        out.append(self.btn("pause", "Pausa", 24 * s, 18 * s, 150 * s, 52 * s, icon="pause", style="primary",
                            tooltip="Pausar: seu progresso fica guardado"))
        if self.stuck_popup:
            r = self.popup_rect(w, h)
            gap2 = 14 * s
            bw2 = (r.width - 60 * s - gap2) / 2
            out.append(self.btn("stuck_undo", "Voltar um passo", r.x + 30 * s, r.bottom - 142 * s, bw2, 58 * s,
                                icon="undo", style="rose", tooltip="Desfaz a última jogada para tentar outro caminho",
                                enabled=self.app.session.can_undo()))
            out.append(self.btn("stuck_restart", "Reiniciar fase", r.x + 30 * s + bw2 + gap2, r.bottom - 142 * s,
                                bw2, 58 * s, icon="restart", style="secondary",
                                tooltip="Recomeça esta fase do início"))
            out.append(self.btn("stuck_close", "Continuar olhando", r.centerx - 140 * s, r.bottom - 66 * s,
                                280 * s, 46 * s, style="soft", tooltip="Fechar o aviso e olhar o tabuleiro"))
        return out


    def popup_rect(self, w, h) -> pygame.Rect:
        s = self.app.scale
        pw, ph = min(w - 40 * s, 620 * s), 400 * s
        return pygame.Rect(int((w - pw) / 2), int(h * 0.5 - ph / 2 - 10 * s), int(pw), int(ph))

    def check_stuck(self, allow_popup: bool = True):
        kind = self.app.session.stuck_status()
        if kind in ("no_moves", "unsolvable"):
            newly = not self.stuck
            self.stuck = kind
            if newly and allow_popup:
                self.popup_delay = 0.1 if self.app.settings.reduced_motion else 0.7
        else:
            self.stuck, self.stuck_popup, self.popup_delay = "", False, None
        self.relayout()

    def close_popup(self):
        self.stuck_popup, self.popup_delay = False, None
        self.relayout()


    def do_restart(self):
        self.app.session.restart()
        self.reset_view()
        self.say("Fase reiniciada. Vamos de novo, sem pressa!")
        self.relayout()

    def do_undo(self):
        if self.app.session.undo():
            self.board.clear_effects()
            self.app.sounds.play("undo")
            self.stuck_popup, self.popup_delay = False, None
            self.check_stuck(allow_popup=False)
        else:
            self.say("Ainda não há jogadas para desfazer.")

    def do_hint(self):
        res = self.app.session.hint()
        if res.status == "unsolvable":
            self.stuck, self.stuck_popup, self.popup_delay = "unsolvable", True, None
        elif res.status in ("ok", "solved"):
            self.stuck, self.stuck_popup, self.popup_delay = "", False, None
        if res.status == "ok":
            src, dst = res.move
            self.board.hint = res.move
            self.app.session.selected = None
            self.say("Dica: passe o líquido da garrafa %d para a garrafa %d." % (src + 1, dst + 1), 8)
        else:
            self.board.hint = None
            self.say(res.message, 8)
        self.relayout()

    def click_bottle(self, i: int):
        if self.win_t is not None or self.stuck_popup:
            return
        self.board.hint = None
        res = self.app.session.click(i)
        self.board.on_result(res)
        if res.kind == "invalid" and res.message:
            self.say(res.message)
        elif res.kind == "switched":
            self.say("")
        if res.kind == "moved":
            self.app.sounds.play("pour")
            if self.app.session.is_won():
                if self.app.session.level_id > 0:
                    self.app.progress.mark_completed(self.app.session.level_id)
                self.app.sounds.play("win")
                self.win_t = 0.0
            else:
                self.check_stuck()
        elif res.kind in ("selected", "deselected", "switched"):
            self.app.sounds.play("select")

    def on_button(self, key):
        if key in ("restart", "stuck_restart"):
            self.do_restart()
        elif key == "stuck_undo":
            self.do_undo()
        elif key == "stuck_close":
            self.close_popup()
        elif key == "undo":
            self.do_undo()
        elif key == "hint":
            self.do_hint()
        elif key == "breathe":
            self.app.go(Screen.BREATHING)
        elif key == "pause":
            self.app.go(Screen.PAUSED)

    def handle_event(self, ev):
        if super().handle_event(ev):
            return True
        if self.stuck_popup:
            if ev.type == pygame.MOUSEBUTTONDOWN:
                return True
            if ev.type == pygame.KEYDOWN:
                if ev.key in (pygame.K_ESCAPE, pygame.K_p):
                    self.close_popup()
                    return True
                if pygame.K_1 <= ev.key <= pygame.K_9:
                    return True
        if ev.type == pygame.MOUSEBUTTONDOWN and ev.button == 1:
            i = self.board.hit(ev.pos)
            if i is not None:
                self.click_bottle(i)
                return True
        elif ev.type == pygame.KEYDOWN:
            if ev.key in (pygame.K_ESCAPE, pygame.K_p):
                self.app.go(Screen.PAUSED)
            elif ev.key in (pygame.K_z, pygame.K_BACKSPACE):
                self.do_undo()
            elif ev.key == pygame.K_r:
                self.do_restart()
            elif ev.key == pygame.K_h:
                self.do_hint()
            elif ev.key == pygame.K_b:
                self.app.go(Screen.BREATHING)
            elif pygame.K_1 <= ev.key <= pygame.K_9:
                self.click_bottle(ev.key - pygame.K_1)
            else:
                return False
            return True
        return False

    def update(self, dt):
        self.board.update(dt)
        if self.msg_t > 0:
            self.msg_t -= dt
            if self.msg_t <= 0:
                self.message = ""
        for b in self.buttons:
            if b.key == "undo":
                b.enabled = self.app.session.can_undo()
        if self.popup_delay is not None and self.win_t is None:
            self.popup_delay -= dt
            if self.popup_delay <= 0:
                self.popup_delay, self.stuck_popup = None, True
                self.app.session.selected = None
                self.relayout()
        if self.win_t is not None:
            self.win_t += dt
            if self.win_t >= (0.4 if self.app.settings.reduced_motion else 1.3):
                self.win_t = None
                self.app.go(Screen.COMPLETE)

    def draw_stuck_popup(self, surface, w, h):
        a, s = self.app, self.app.scale
        veil = pygame.Surface((w, h), pygame.SRCALPHA)
        veil.fill((45, 34, 40, 110))
        surface.blit(veil, (0, 0))
        r = self.popup_rect(w, h)
        draw_panel(surface, r, a.theme, s)
        head = load_mascot("mascot_think", int(92 * s))
        if head is not None:
            surface.blit(head, head.get_rect(midtop=(r.centerx, r.y + int(14 * s))))
        if self.stuck == "no_moves":
            title, body = "Não há mais jogadas possíveis", "Tudo bem, isso acontece! Você pode voltar um passo e tentar outro caminho, ou reiniciar a fase."
        else:
            title, body = "Parece que não há mais saída por aqui", "Tudo bem, isso acontece! Você pode voltar um passo e tentar outro caminho, ou reiniciar a fase."
        draw_text(surface, title, a.fonts.titulo(30 * s), a.theme["cacao"], center=(r.centerx, r.y + int(128 * s)))
        draw_paragraph(surface, body, a.fonts.get(22 * s), a.theme["text"], r.centerx, r.y + int(154 * s), int(r.width - 70 * s))
        pos = pygame.mouse.get_pos()
        for i, b in enumerate(self.buttons):
            if b.key in STUCK_KEYS:
                b.draw(surface, a.theme, a.fonts, s, b.enabled and b.rect.collidepoint(pos), i == self.focus)


    def draw(self, surface):
        a, s = self.app, self.app.scale
        w, h = surface.get_size()
        sess = a.session
        draw_background(surface, a.theme)
        title = "Fase %d" % sess.level_id if sess.level_id else sess.level_name
        draw_text(surface, title, a.fonts.titulo(36 * s), a.theme["cacao"], center=(w // 2, int(38 * s)))

        total, done = sess.color_count(), sess.organized_count()
        dots_y = int(80 * s)
        x0 = w // 2 - int((total - 1) * 11 * s)
        for k in range(total):
            pos = (x0 + int(k * 22 * s), dots_y)
            pygame.draw.circle(surface, a.theme["jungle"] if k < done else a.theme["lavender"], pos, int(7 * s))
            pygame.draw.circle(surface, a.theme["jungle"], pos, int(7 * s), 2)
        draw_text(surface, "Garrafas organizadas: %d de %d" % (done, total), a.fonts.get(18 * s), a.theme["text_soft"],
                  center=(w // 2, dots_y + int(24 * s)))
        self.board.draw(surface)
        text = self.tooltip_text() or self.message
        if not text and self.stuck and not self.stuck_popup:
            text = ("Sem saída por aqui. Use Desfazer para voltar um passo ou Reiniciar a fase."
                    if sess.can_undo() else "Sem saída por aqui. Use Reiniciar para começar a fase de novo.")
        if text:
            draw_text(surface, text, a.fonts.get(22 * s), a.theme["text"], center=(w // 2, h - int(112 * s)))
        pos = pygame.mouse.get_pos()
        for i, b in enumerate(self.buttons):
            if b.key in STUCK_KEYS:
                continue
            b.draw(surface, a.theme, a.fonts, s, b.enabled and b.rect.collidepoint(pos), i == self.focus)
            if self.stuck and not self.stuck_popup and b.key in ("undo", "restart") and b.enabled:
                grow = 0 if a.settings.reduced_motion else abs(math.sin(a.time * 3)) * 3 * s
                pygame.draw.rect(surface, a.theme["rose"], b.rect.inflate(int(12 * s + grow), int(12 * s + grow)),
                                 width=max(2, int(3 * s)), border_radius=int(b.rect.height * 0.4))
        if self.stuck_popup:
            self.draw_stuck_popup(surface, w, h)


class PauseScreen(BaseScreen):
    def __init__(self, app):
        super().__init__(app)
        self.backdrop: Optional[pygame.Surface] = None

    def on_enter(self):
        if self.app.state.previous == Screen.PLAYING:
            self.backdrop = self.app.window.copy()
        super().on_enter()

    def build_buttons(self, w, h):
        s = self.app.scale
        bw, bh, gap = 340 * s, 62 * s, 16 * s
        x, y = w / 2 - bw / 2, h * 0.36
        items = [
            ("resume", "Continuar", "play", "primary", "Voltar ao jogo exatamente de onde parou"),
            ("restart", "Reiniciar fase", "restart", "secondary", "Recomeçar esta fase"),
            ("breathe", "Respirar", "breathe", "soft", "Fazer um exercício de respiração"),
            ("menu", "Voltar ao menu", "home", "secondary", "Ir para a tela inicial (seu progresso fica salvo)"),
        ]
        if web.EMBUTIDO:
            items = [i for i in items if i[0] != "breathe"]
        out = []
        for key, label, icon, style, tip in items:
            out.append(self.btn(key, label, x, y, bw, bh, icon=icon, style=style, tooltip=tip))
            y += bh + gap
        return out

    def on_button(self, key):
        a = self.app
        if key == "resume":
            a.go(Screen.PLAYING)
        elif key == "restart":
            a.screens[Screen.PLAYING].do_restart()
            a.go(Screen.PLAYING)
        elif key == "breathe":
            a.go(Screen.BREATHING)
        elif key == "menu":
            a.go(Screen.MENU)

    def handle_event(self, ev):
        if super().handle_event(ev):
            return True
        if ev.type == pygame.KEYDOWN and ev.key in (pygame.K_ESCAPE, pygame.K_p):
            self.app.go(Screen.PLAYING)
            return True
        return False

    def draw(self, surface):
        a, s = self.app, self.app.scale
        w, h = surface.get_size()
        draw_background(surface, a.theme)
        if self.backdrop is not None:
            img = self.backdrop if self.backdrop.get_size() == (w, h) else pygame.transform.smoothscale(self.backdrop, (w, h))
            surface.blit(img, (0, 0))
        veil = pygame.Surface((w, h), pygame.SRCALPHA)
        veil.fill((*a.theme["bg"], 225))
        surface.blit(veil, (0, 0))
        t_rect = draw_text(surface, "Pausa", a.fonts.titulo(56 * s), a.theme["cacao"], center=(w // 2, int(h * 0.15)))
        draw_icon(surface, "pause", (t_rect.left - int(40 * s), t_rect.centery), int(44 * s), a.theme["rose"])
        draw_text(surface, "Seu progresso está guardado. Volte quando quiser.", a.fonts.get(24 * s),
                  a.theme["text_soft"], center=(w // 2, int(h * 0.25)))
        self.draw_buttons(surface)
        self.draw_tooltip(surface)


class CompleteScreen(BaseScreen):
    def build_buttons(self, w, h):
        s = self.app.scale
        a = self.app
        nxt = a.levels.next_id(a.session.level_id)
        bw, bh, gap = 420 * s, 60 * s, 14 * s
        x, y = w / 2 - bw / 2, h * 0.49
        items = []
        if nxt is not None:
            items.append(("next", "Próxima fase", "next", "primary", "Ir para a próxima fase"))
        else:
            items.append(("restart_game", "Recomeçar do início", "restart", "primary",
                          "Voltar para a fase 1 e jogar tudo de novo"))
        items += [
            ("again", "Jogar novamente", "restart", "secondary", "Jogar esta fase outra vez"),
            ("menu", "Voltar ao menu", "home", "secondary", "Ir para a tela inicial"),
            ("breathe", "Fazer uma pausa para respirar", "breathe", "soft", "Um momento de respiração guiada"),
        ]
        out = []
        for key, label, icon, style, tip in items:
            out.append(self.btn(key, label, x, y, bw, bh, icon=icon, style=style, tooltip=tip))
            y += bh + gap
        return out

    def on_button(self, key):
        a = self.app
        if key == "next":
            a.start_level(a.levels.next_id(a.session.level_id))
        elif key == "restart_game":
            a.progress.reset()
            a.start_level(a.levels.ids()[0])
        elif key == "again":
            a.start_level(a.session.level_id)
        elif key == "menu":
            a.go(Screen.MENU)
        elif key == "breathe":
            a.go(Screen.BREATHING)

    def draw(self, surface):
        a, s = self.app, self.app.scale
        w, h = surface.get_size()
        draw_background(surface, a.theme)

        mh = int(h * 0.20)
        calm = a.settings.reduced_motion
        hop = 0 if calm else abs(math.sin(a.time * 3.4)) * 16 * s
        bh = 110 * s
        bw = bh / 3.2
        base_y = int(h * 0.285)
        inner = mh * 0.85
        for sign, c in ((-1, 0), (1, 1)):
            bx = w / 2 + inner if sign > 0 else w / 2 - inner - bw
            draw_bottle(surface, pygame.Rect(int(bx), int(base_y - bh), int(bw), int(bh)), (c,) * 4, 4,
                        a.palette, a.theme, show_patterns=a.settings.patterns_visible, thick=a.theme["thick"], scale=s)
        draw_mascot(surface, "mascot_happy", mh, (w // 2, int(base_y - hop)))
        if a.theme["thick"] <= 3:
            spark = ((-0.30, 0.06, 11, "rose"), (0.31, 0.02, 14, "lavender"), (0.22, 0.17, 8, "leaf"),
                     (-0.22, 0.15, 9, "lavender"), (-0.36, 0.17, 7, "leaf"), (0.38, 0.12, 9, "rose"))
            for k, (dx, dy, r, col) in enumerate(spark):
                pulse = 1.0 if calm else 0.7 + 0.3 * math.sin(a.time * 4 + k * 1.7)
                draw_sparkle(surface, (int(w / 2 + dx * mh * 1.6), int(h * 0.09 + dy * h)), int(r * s * pulse),
                             a.theme[col])

            for k in range(3):
                t = 0.4 + 0.2 * k if calm else (a.time * 0.45 + k / 3.0) % 1.0
                hx = w / 2 + (k - 1) * mh * 0.22 + (0 if calm else math.sin(a.time * 2 + k * 2) * 8 * s)
                hy = base_y - mh * (0.70 + 0.40 * t)
                draw_heart(surface, (int(hx), int(hy)), int((11 + 4 * (k % 2)) * s), a.theme["rose"])
        draw_text(surface, "Você conseguiu!", a.fonts.titulo(58 * s), a.theme["cacao"], center=(w // 2, int(h * 0.345)))
        draw_text(surface, "Muito bem por ter encontrado sua solução.", a.fonts.get(26 * s), a.theme["text"],
                  center=(w // 2, int(h * 0.415)))
        if a.levels.next_id(a.session.level_id) is None:
            draw_text(surface, "Você chegou à última fase disponível. Obrigado por jogar com calma!",
                      a.fonts.get(20 * s), a.theme["text_soft"], center=(w // 2, int(h * 0.465)))
        self.draw_buttons(surface)
        self.draw_tooltip(surface)


class BreathingScreen(BaseScreen):
    def __init__(self, app):
        super().__init__(app)
        self.exercise = BreathingExercise()
        self.origin = Screen.MENU

    def on_enter(self):
        prev = self.app.state.previous
        if prev in (Screen.MENU, Screen.PLAYING, Screen.COMPLETE):
            self.origin = prev
        elif prev == Screen.PAUSED:
            self.origin = Screen.PLAYING
        else:
            self.origin = Screen.MENU
        inhale, exhale = self.app.settings.breathing_rhythm
        cycles = max(1, round(45 / (inhale + exhale)))
        self.exercise = BreathingExercise(inhale, exhale, cycles)
        super().on_enter()

    def build_buttons(self, w, h):
        s = self.app.scale
        ex = self.exercise
        bw, bh, gap = 250 * s, 62 * s, 20 * s
        x, y = w / 2 - bw - gap / 2, h - 88 * s
        back_label = "Voltar ao jogo" if self.origin == Screen.PLAYING else "Voltar ao menu"
        if ex.state == IDLE:
            left = ("start", "Começar", "play", "primary", "Começar o exercício")
            right = ("end", "Encerrar", "stop", "secondary", "Sair do exercício quando quiser")
        elif ex.state == RUNNING:
            left = ("pause", "Pausar", "pause", "primary", "Pausar o exercício")
            right = ("end", "Encerrar", "stop", "secondary", "Sair do exercício quando quiser")
        elif ex.state == B_PAUSED:
            left = ("resume", "Continuar", "play", "primary", "Continuar de onde parou")
            right = ("end", "Encerrar", "stop", "secondary", "Sair do exercício quando quiser")
        else:
            left = ("end", back_label, "back", "primary", "Voltar com calma")
            right = ("more", "Ficar mais um pouco", "breathe", "soft", "Respirar por mais algum tempo")
        return [self.btn(k, l, x + i * (bw + gap), y, bw, bh, icon=ic, style=st, tooltip=tp)
                for i, (k, l, ic, st, tp) in enumerate((left, right))]

    def on_button(self, key):
        ex = self.exercise
        if key == "start":
            ex.start()
        elif key == "pause":
            ex.pause()
        elif key == "resume":
            ex.resume()
        elif key == "more":
            ex.extend()
        elif key == "end":
            ex.stop()
            self.app.go(self.origin)
            return
        self.relayout()

    def handle_event(self, ev):
        if super().handle_event(ev):
            return True
        if ev.type == pygame.KEYDOWN and ev.key == pygame.K_ESCAPE:
            self.on_button("end")
            return True
        return False

    def update(self, dt):
        before = self.exercise.state
        self.exercise.update(dt)
        if self.exercise.state != before:
            self.relayout()

    def draw(self, surface):
        a, s = self.app, self.app.scale
        w, h = surface.get_size()
        draw_background(surface, a.theme, calm=True)
        ex = self.exercise
        min_scale = 0.7 if a.settings.reduced_motion else 0.45
        scale = ex.circle_scale(min_scale, 1.0)
        cx, cy = w // 2, int(h * 0.40)
        max_r = min(w * 0.3, h * 0.24)
        r = int(max_r * scale)
        pygame.draw.circle(surface, a.theme["peony"] if a.theme["thick"] <= 3 else a.theme["bg"], (cx, cy), int(r * 1.15))
        pygame.draw.circle(surface, a.theme["sky"] if a.theme["thick"] <= 3 else a.theme["btn_soft"][0], (cx, cy), r)
        pygame.draw.circle(surface, a.theme["outline"], (cx, cy), r, a.theme["thick"])
        draw_text(surface, ex.label, a.fonts.titulo(46 * s), a.theme["cacao"], center=(cx, cy))
        if ex.state == FINISHED:
            text = "Quando quiser, você pode voltar ou ficar mais um pouco."
        else:
            text = MESSAGE
        draw_text(surface, text, a.fonts.get(24 * s), a.theme["text"], center=(cx, cy + int(max_r * 1.2) + int(24 * s)))
        draw_text(surface, DISCLAIMER, a.fonts.get(16 * s), a.theme["text_soft"], center=(cx, h - int(124 * s)))
        self.draw_buttons(surface)
        self.draw_tooltip(surface, h - int(20 * s))


class SettingsScreen(BaseScreen):
    ROWS = ["sound", "volume", "motion", "breath", "contrast", "patterns"]
    LABELS = {
        "sound": "Efeitos sonoros", "volume": "Volume", "motion": "Animações",
        "breath": "Ritmo da respiração", "contrast": "Contraste", "patterns": "Símbolos nos líquidos",
    }

    def _value(self, key):
        st = self.app.settings
        return {
            "sound": "Ligados" if st.sound_enabled else "Desligados",
            "motion": "Reduzidas" if st.reduced_motion else "Normais",
            "breath": PRESETS[st.breathing_preset][0],
            "contrast": "Alto" if st.high_contrast else "Normal",
            "patterns": "Mostrar" if st.patterns_visible else "Ocultar",
        }.get(key, "")

    def row_y(self, i, h):
        return h * 0.2 + i * 70 * self.app.scale

    def build_buttons(self, w, h):
        s = self.app.scale
        out = []
        x = w * 0.50
        tips = {
            "sound": "Ligar ou desligar os sons suaves (o jogo funciona sem áudio)",
            "motion": "Reduzir movimentos e animações",
            "breath": "Trocar o ritmo de inspirar e expirar",
            "contrast": "Cores e contornos de maior contraste",
            "patterns": "Mostrar símbolos sobre os líquidos além das cores",
        }
        for i, key in enumerate(self.ROWS):
            y = self.row_y(i, h)
            if key == "volume":
                out.append(self.btn("vol_down", "−", x, y, 64 * s, 56 * s, style="secondary", tooltip="Diminuir o volume"))
                out.append(self.btn("vol_up", "+", x + 236 * s, y, 64 * s, 56 * s, style="secondary", tooltip="Aumentar o volume"))
            else:
                out.append(self.btn(key, self._value(key), x, y, 300 * s, 56 * s, style="secondary", tooltip=tips[key]))
        out.append(self.btn("back", "Voltar", 30 * s, h - 84 * s, 220 * s, 58 * s, icon="back", style="primary",
                            tooltip="Voltar ao menu"))
        return out

    def on_button(self, key):
        a, st = self.app, self.app.settings
        if key == "back":
            a.go(Screen.MENU)
            return
        if key == "sound":
            st.sound_enabled = not st.sound_enabled
        elif key == "vol_down":
            st.volume = max(0.0, round(st.volume - 0.1, 2))
            a.sounds.play("select")
        elif key == "vol_up":
            st.volume = min(1.0, round(st.volume + 0.1, 2))
            a.sounds.play("select")
        elif key == "motion":
            st.reduced_motion = not st.reduced_motion
        elif key == "breath":
            st.cycle_breathing()
        elif key == "contrast":
            st.high_contrast = not st.high_contrast
        elif key == "patterns":
            st.show_patterns = not st.show_patterns
        a.apply_settings()
        a.settings_store.save()
        self.relayout()

    def handle_event(self, ev):
        if super().handle_event(ev):
            return True
        if ev.type == pygame.KEYDOWN and ev.key == pygame.K_ESCAPE:
            self.app.go(Screen.MENU)
            return True
        return False

    def draw(self, surface):
        a, s = self.app, self.app.scale
        w, h = surface.get_size()
        draw_background(surface, a.theme)
        t_rect = draw_text(surface, "Configurações", a.fonts.titulo(52 * s), a.theme["cacao"], center=(w // 2, int(h * 0.09)))
        draw_icon(surface, "gear", (t_rect.left - int(40 * s), t_rect.centery), int(44 * s), a.theme["rose"])
        for i, key in enumerate(self.ROWS):
            y = self.row_y(i, h)
            draw_text(surface, self.LABELS[key], a.fonts.get(26 * s), a.theme["text"], midleft=(int(w * 0.08), int(y + 28 * s)))
            if key == "volume":
                draw_text(surface, "%d%%" % round(a.settings.volume * 100), a.fonts.get(26 * s, True), a.theme["text"],
                          center=(int(w * 0.50 + 150 * s), int(y + 28 * s)))
        self.draw_buttons(surface)
        self.draw_tooltip(surface)


class LevelsScreen(BaseScreen):
    def on_enter(self):
        self.confirm_reset = False
        super().on_enter()

    def build_buttons(self, w, h):
        s = self.app.scale
        a = self.app
        ids = a.levels.ids()
        col_w, gap = 360 * s, 20 * s
        x0 = w / 2 - (2 * col_w + gap) / 2
        out = []
        for i, lid in enumerate(ids):
            lv = a.levels.get(lid)
            row, col = divmod(i, 2)
            unlocked = a.progress.is_unlocked(lid, ids)
            done = a.progress.is_completed(lid)
            icon = "check" if done else ("play_game" if unlocked else "lock")
            style = "soft" if done else "secondary"
            tip = ("Fase concluída. Toque para jogar de novo" if done else
                   "Jogar esta fase" if unlocked else "Conclua a fase anterior para liberar")
            out.append(self.btn("lvl:%d" % lid, "Fase %d" % lid, x0 + col * (col_w + gap),
                                h * 0.19 + row * 74 * s, col_w, 62 * s, icon=icon, style=style, tooltip=tip, enabled=unlocked))
        out.append(self.btn("back", "Voltar", 30 * s, h - 84 * s, 220 * s, 58 * s, icon="back", style="primary",
                            tooltip="Voltar ao menu"))
        label = "Tem certeza? Apagar progresso" if self.confirm_reset else "Nova partida"
        out.append(self.btn("reset", label, w - 450 * s, h - 84 * s, 420 * s, 58 * s, icon="restart", style="rose",
                            tooltip="Recomeçar do início (apaga as fases concluídas)"))
        return out

    def on_button(self, key):
        a = self.app
        if key == "back":
            a.go(Screen.MENU)
        elif key == "reset":
            if self.confirm_reset:
                a.progress.reset()
                self.confirm_reset = False
            else:
                self.confirm_reset = True
            self.relayout()
        elif key.startswith("lvl:"):
            a.start_level(int(key[4:]))

    def draw(self, surface):
        a, s = self.app, self.app.scale
        w, h = surface.get_size()
        draw_background(surface, a.theme)
        t_rect = draw_text(surface, "Escolher fase", a.fonts.titulo(52 * s), a.theme["cacao"], center=(w // 2, int(h * 0.09)))
        draw_icon(surface, "grid", (t_rect.left - int(40 * s), t_rect.centery), int(44 * s), a.theme["rose"])
        self.draw_buttons(surface)
        self.draw_tooltip(surface, h - int(110 * s))


class App:
    MIN_SIZE = (800, 560)

    def __init__(self) -> None:
        pygame.init()
        pygame.display.set_caption("MK Potion")
        tamanho = (1000, 700)
        if web.EMBUTIDO:
            web.preparar_canvas()
            tamanho = web.tamanho_ideal(self.MIN_SIZE) or tamanho
        self.window = pygame.display.set_mode(tamanho, pygame.RESIZABLE)
        self.clock = pygame.time.Clock()
        self.time = 0.0
        self.fonts = Fonts()
        self.settings_store = SettingsStore()
        self.settings = self.settings_store.settings
        self.progress = ProgressStore()
        self.levels = LevelManager()
        self.session = GameSession()
        self.sounds = SoundManager(self.settings)
        self.state = AppState()
        self.apply_settings()
        first = self.levels.get(self.progress.next_to_play(self.levels.ids()))
        self.session.start_level(first)
        self.screens = {
            Screen.MENU: MenuScreen(self), Screen.HOWTO: HowToScreen(self), Screen.LEVELS: LevelsScreen(self),
            Screen.PLAYING: PlayScreen(self), Screen.PAUSED: PauseScreen(self), Screen.COMPLETE: CompleteScreen(self),
            Screen.BREATHING: BreathingScreen(self), Screen.SETTINGS: SettingsScreen(self),
        }
        self.screens[self.state.current].on_enter()

    @property
    def scale(self) -> float:
        w, h = self.window.get_size()
        if web.EMBUTIDO and h > w:
            # Celular em pé: a largura manda (os botões da fase precisam caber numa linha).
            return max(0.6, min(w / 700, h / 1000, 2.0))
        return max(0.6, min(w / 1000, h / 700, 2.0))

    def apply_settings(self) -> None:
        self.settings.validate()
        self.theme = make_theme(self.settings.high_contrast)
        self.palette = get_palette(self.settings.high_contrast)

    def go(self, screen: Screen) -> None:
        self.state.go(screen)
        self.screens[screen].on_enter()

    def start_level(self, level_id: int) -> None:
        level = self.levels.get(level_id)
        if level is None:
            return

        try:
            bottles = randomize_bottles(level.bottles, level.capacity, level.id, avoid=self.session.initial
                                        if self.session.level_id == level.id else None)
            level = dataclasses.replace(level, bottles=bottles)
        except Exception:
            self.log_error("Falha ao embaralhar a fase %s (usando a fase original)" % level_id)
        self.session.start_level(level)
        self.progress.set_last_level(level_id)
        self.screens[Screen.PLAYING].reset_view()
        self.go(Screen.PLAYING)


    notice = ""
    LOG_FILE = Path(__file__).resolve().parent.parent / "erro_mk_potion.log"

    def log_error(self, what: str) -> None:
        try:
            env = "Python %s | pygame %s | %s | janela %s | tela atual %s | fase %s" % (
                sys.version.split()[0], getattr(pygame, "version", None) and pygame.version.ver, platform.platform(),
                self.window.get_size() if self.window else "?", self.state.current.name, self.session.level_id)
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

    async def run(self) -> None:
        recent: List[float] = []
        try:
            while self.state.running:
                try:
                    dt = min(self.clock.tick(60) / 1000.0, 0.1)
                    self.time += dt
                    self.window = pygame.display.get_surface()
                    if web.EMBUTIDO:
                        # No navegador não chega VIDEORESIZE: acompanha o tamanho do iframe.
                        alvo = web.tamanho_ideal(self.MIN_SIZE)
                        if alvo and alvo != self.window.get_size():
                            pygame.display.set_mode(alvo, pygame.RESIZABLE)
                            self.window = pygame.display.get_surface()
                            self.screens[self.state.current].relayout()
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
                await asyncio.sleep(0)
        finally:
            self.settings_store.save()
            pygame.quit()
