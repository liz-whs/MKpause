import random
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from game.game_logic import GameSession, apply_move, legal_moves
from game.level_manager import LevelManager


def session_with(bottles, capacity):
    s = GameSession()
    s.start_custom(bottles, capacity, level_id=1, name="teste")
    return s


class StuckTests(unittest.TestCase):
    def test_fresh_levels_are_not_stuck(self):
        for lv in LevelManager().levels:
            s = GameSession()
            s.start_level(lv)
            self.assertEqual(s.stuck_status(), "ok", lv.id)

    def test_won_state_is_ok(self):
        self.assertEqual(session_with(((0, 0), (1, 1), ()), 2).stuck_status(), "ok")

    def test_no_moves_at_all(self):

        s = session_with(((0, 1), (1, 0)), 2)
        self.assertEqual(legal_moves(s.state, 2), [])
        self.assertEqual(s.stuck_status(), "no_moves")

    def test_moves_exist_but_no_way_to_win(self):
        s = session_with(((1, 2, 0), (0, 1, 0), (1, 2, 2), ()), 3)
        self.assertTrue(legal_moves(s.state, 3))
        self.assertEqual(s.stuck_status(), "unsolvable")

    def test_undo_can_leave_the_dead_end(self):
        rng = random.Random(5)
        lv = LevelManager().levels[6]
        for _ in range(60):
            s = GameSession()
            s.start_level(lv)
            for _ in range(80):
                moves = legal_moves(s.state, s.capacity)
                if not moves or s.stuck_status() != "ok":
                    break
                s.move(*rng.choice(moves))
            if s.stuck_status() in ("unsolvable", "no_moves"):
                while s.stuck_status() != "ok":
                    self.assertTrue(s.undo(), "chegou ao começo e ainda sem saída")
                return
        self.fail("a simulação não encontrou nenhum beco sem saída")

    def test_check_is_fast_enough_to_run_after_every_move(self):
        import time
        rng = random.Random(2)
        lv = LevelManager().levels[7]
        s = GameSession()
        s.start_level(lv)
        worst = 0.0
        for _ in range(40):
            moves = legal_moves(s.state, s.capacity)
            if not moves:
                break
            s.move(*rng.choice(moves))
            t = time.perf_counter()
            s.stuck_status()
            worst = max(worst, time.perf_counter() - t)
        self.assertLess(worst, 0.3)


if __name__ == "__main__":
    unittest.main()
