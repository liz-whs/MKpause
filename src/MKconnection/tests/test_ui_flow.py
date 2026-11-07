import os
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
os.environ.setdefault("SDL_AUDIODRIVER", "dummy")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import pygame
except ImportError:
    pygame = None


def E(kind, **kw):
    return SimpleNamespace(type=kind, mod=0, **kw)


@unittest.skipIf(pygame is None, "pygame não instalado")
class UIFlowTests(unittest.TestCase):
    def setUp(self):
        from game import progress, screens, settings
        from game.game_state import Screen
        tmp = Path(tempfile.mkdtemp())
        progress.DEFAULT_PATH = tmp / "progress.json"
        settings.DEFAULT_PATH = tmp / "settings.json"
        screens.App.LOG_FILE = tmp / "erro.log"
        self.Screen = Screen
        self.screens = screens
        self.app = screens.App()
        self.app.window = pygame.display.get_surface()

    def tearDown(self):
        pygame.quit()

    @property
    def play(self):
        return self.app.screens[self.Screen.PLAYING]

    def frames(self, n=1, dt=0.05):
        sc = self.app.screens[self.app.state.current]
        for _ in range(n):
            self.app.time += dt
            sc.update(dt)
            sc.draw(self.app.window)

    def esc(self):
        self.app.screens[self.app.state.current].handle_event(E(pygame.KEYDOWN, key=pygame.K_ESCAPE))

    def press(self, cell):
        self.play.handle_event(E(pygame.MOUSEBUTTONDOWN, pos=self.play.view.center(cell), button=1))

    def move(self, cell):
        self.play.handle_event(E(pygame.MOUSEMOTION, pos=self.play.view.center(cell), rel=(0, 0), buttons=(1, 0, 0)))

    def release(self, cell):
        self.play.handle_event(E(pygame.MOUSEBUTTONUP, pos=self.play.view.center(cell), button=1))

    def drag(self, cells):
        self.press(cells[0])
        for c in cells[1:]:
            self.move(c)
        self.release(cells[-1])

    def start(self, level_id):
        self.app.start_level(level_id)
        self.frames()

    def test_play_button_opens_the_first_level(self):
        menu = self.app.screens[self.Screen.MENU]
        play = next(b for b in menu.buttons if b.key == "play")
        menu.handle_event(E(pygame.MOUSEBUTTONDOWN, pos=play.rect.center, button=1))
        self.assertEqual(self.app.state.current, self.Screen.PLAYING)
        self.assertEqual(self.app.session.level.id, 1)

    def test_dragging_the_mouse_draws_a_connection_and_winning_opens_the_completion_screen(self):
        self.start(1)
        for path in self.app.session.level.solution.values():
            self.drag(path)
        self.assertTrue(self.app.session.is_won())
        self.frames(40, 0.05)
        self.assertEqual(self.app.state.current, self.Screen.COMPLETE)
        self.assertIn(1, self.app.progress.completed)

    def test_fast_mouse_jump_never_creates_diagonals_or_skips_cells(self):
        self.start(2)
        lv = self.app.session.level
        path = next(iter(lv.solution.values()))
        self.press(path[0])
        self.play.handle_event(E(pygame.MOUSEMOTION, pos=self.play.view.center(path[-1]), rel=(0, 0), buttons=(1, 0, 0)))
        self.release(path[-1])
        from game.game_logic import validate_board
        self.assertEqual(validate_board(self.app.session.board), [])

    def test_cannot_drag_over_another_connection(self):
        self.start(1)
        sol = list(self.app.session.level.solution.values())
        self.drag(sol[0])
        occupied = set(sol[0][1:-1])
        before = {c: list(p.cells) for c, p in self.app.session.board.paths.items()}
        self.press(sol[1][0])
        for cell in list(occupied)[:3]:
            self.move(cell)
        self.release(sol[1][0])
        after = {c: list(p.cells) for c, p in self.app.session.board.paths.items()}
        self.assertEqual(before[next(iter(before))], after[next(iter(before))])

    def test_right_click_removes_a_path_without_penalty(self):
        self.start(1)
        path = next(iter(self.app.session.level.solution.values()))
        self.drag(path)
        self.assertTrue(self.app.session.completed_connections())
        self.play.handle_event(E(pygame.MOUSEBUTTONDOWN, pos=self.play.view.center(path[1]), button=3))
        self.assertEqual(self.app.session.completed_connections(), [])

    def test_escape_walks_back_through_the_screens(self):
        self.app.go(self.Screen.DIFFICULTY)
        self.app.state.category_key = "easy"
        self.app.go(self.Screen.LEVELS)
        self.start(1)
        trail = []
        for _ in range(3):
            self.esc()
            trail.append(self.app.state.current)
        self.assertEqual(trail, [self.Screen.LEVELS, self.Screen.DIFFICULTY, self.Screen.MENU])
        self.esc()
        self.assertEqual(self.app.state.current, self.Screen.MENU)
        self.assertTrue(self.app.state.running)

    def test_leaving_a_level_keeps_the_unfinished_work_during_the_session(self):
        self.start(2)
        path = next(iter(self.app.session.level.solution.values()))
        self.drag(path[:3])
        self.esc()
        self.start(2)
        color = next(iter(self.app.session.level.solution))
        self.assertEqual(self.app.session.board.paths[color].cells[:3], path[:3])

    def test_hint_button_shows_a_message_and_does_not_change_the_board(self):
        self.start(1)
        before = self.app.session.snapshot()
        hint = next(b for b in self.play.buttons if b.key == "hint")
        self.play.handle_event(E(pygame.MOUSEBUTTONDOWN, pos=hint.rect.center, button=1))
        self.assertIsNotNone(self.play.hint)
        self.assertTrue(self.play.hint.message)
        self.assertEqual(self.app.session.snapshot(), before)
        self.frames(2)

    def test_locked_difficulty_cannot_be_opened(self):
        self.app.go(self.Screen.DIFFICULTY)
        card = next(b for b in self.app.screens[self.Screen.DIFFICULTY].buttons if b.key == "cat:medium")
        self.assertFalse(card.enabled)
        self.app.screens[self.Screen.DIFFICULTY].handle_event(E(pygame.MOUSEBUTTONDOWN, pos=card.rect.center, button=1))
        self.assertEqual(self.app.state.current, self.Screen.DIFFICULTY)

    def test_settings_and_theme_choices_are_saved(self):
        self.app.go(self.Screen.SETTINGS)
        sc = self.app.screens[self.Screen.SETTINGS]
        sc.on_button("motion")
        sc.on_button("contrast")
        self.assertTrue(self.app.settings.reduced_motion and self.app.settings.high_contrast)
        from game.settings import SettingsStore
        self.assertTrue(SettingsStore(self.app.settings_store.path).settings.reduced_motion)
        self.app.go(self.Screen.THEMES)
        self.app.screens[self.Screen.THEMES].on_button("theme:noite")
        from game.progress import ProgressStore
        self.assertEqual(ProgressStore(self.app.progress.path).theme, "noite")

    def test_every_screen_draws_at_different_window_sizes_and_contrasts(self):
        for size in ((1000, 800), (640, 560), (1500, 900)):
            pygame.display.set_mode(size, pygame.RESIZABLE)
            self.app.window = pygame.display.get_surface()
            for high in (False, True):
                self.app.settings.high_contrast = high
                self.app.apply_settings()
                for scr in self.Screen:
                    if scr in (self.Screen.PLAYING, self.Screen.COMPLETE):
                        self.app.start_level(7) if scr == self.Screen.PLAYING else None
                        if scr == self.Screen.COMPLETE:
                            self.app.completion = None
                    self.app.go(scr)
                    self.frames(2)


if __name__ == "__main__":
    unittest.main()
