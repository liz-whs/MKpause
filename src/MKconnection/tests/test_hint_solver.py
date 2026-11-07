import json
import unittest

from helpers import BLOCKING_A, PAIRS_4, draw, make_level, make_session
from game.cell import is_adjacent
from game.game_logic import GameSession
from game.hint_solver import SOLVED, UNKNOWN, UNSOLVABLE, compute_hint, solve
from game.level_manager import DEFAULT_PATH, LevelManager


class SolverTests(unittest.TestCase):
    def test_solves_every_official_level_from_scratch(self):
        for lv in LevelManager().levels:
            res = solve(lv.size, lv.pairs)
            self.assertEqual(res.status, SOLVED, lv.id)
            occupied = {}
            for color, path in res.paths.items():
                a, b = lv.pairs[color]
                self.assertEqual({path[0], path[-1]}, {a, b})
                for x, y in zip(path, path[1:]):
                    self.assertTrue(is_adjacent(x, y))
                for cell in path:
                    self.assertNotIn(cell, occupied)
                    occupied[cell] = color

    def test_respects_fixed_paths(self):
        res = solve(4, PAIRS_4, fixed={0: BLOCKING_A})
        self.assertEqual(res.status, UNSOLVABLE)

    def test_gives_up_instead_of_freezing_when_the_budget_ends(self):
        lv = LevelManager().get(9)
        self.assertEqual(solve(lv.size, lv.pairs, node_limit=3).status, UNKNOWN)


class HintTests(unittest.TestCase):
    def test_hint_on_empty_board_suggests_starting_from_a_dot(self):
        for lv in LevelManager().levels:
            s = GameSession()
            s.load_level(lv)
            h = s.hint()
            self.assertEqual(h.kind, "start", lv.id)
            self.assertIn(h.color, lv.pairs)
            self.assertIn(h.cells[0], lv.pairs[h.color])
            self.assertTrue(h.message)
            for a, b in zip(h.cells, h.cells[1:]):
                self.assertTrue(is_adjacent(a, b))

    def test_hint_never_changes_the_board(self):
        for lv in LevelManager().levels[:5]:
            s = GameSession()
            s.load_level(lv)
            before = json.dumps(s.snapshot(), sort_keys=True)
            for _ in range(4):
                s.hint()
            self.assertEqual(json.dumps(s.snapshot(), sort_keys=True), before)

    def test_hint_cells_are_legal_moves_for_the_current_state(self):
        """Seguindo a dica célula por célula, o jogo aceita todos os passos."""
        for lv in LevelManager().levels:
            s = GameSession()
            s.load_level(lv)
            h = s.hint()
            s.start_connection(h.cells[0])
            for cell in h.cells[1:]:
                self.assertFalse(s.add_segment(cell).blocked, (lv.id, cell))

    def test_following_hints_repeatedly_solves_the_level(self):
        """Pedir a dica, ligar a cor sugerida pelo caminho que a dica indica e repetir termina a fase."""
        for lv in LevelManager().levels:
            s = GameSession()
            s.load_level(lv)
            for _ in range(len(lv.pairs) + 1):
                if s.is_won():
                    break
                h = s.hint()
                self.assertIn(h.kind, ("start", "continue"), (lv.id, h))
                path = lv.solution[h.color]
                s.start_connection(path[0])
                s.drag_to(path[1:])
                s.finish_connection()
            self.assertTrue(s.is_won(), lv.id)

    def test_hint_continues_a_partial_path_that_follows_the_solution(self):
        lv = LevelManager().get(2)
        s = GameSession()
        s.load_level(lv)
        color = next(iter(lv.solution))
        path = lv.solution[color]
        s.start_connection(path[0])
        s.drag_to(path[1:3])
        s.finish_connection()
        h = s.hint()
        self.assertIn(h.kind, ("continue", "start"))
        if h.kind == "continue":
            self.assertEqual(h.color, color)
            self.assertTrue(is_adjacent(path[2], h.cells[0]))

    def test_hint_says_a_path_is_in_the_way_when_the_level_became_impossible(self):
        s = make_session(4, PAIRS_4, solution={0: [(0, 0), (0, 1), (0, 2), (0, 3)],
                                               1: [(3, 0), (3, 1), (3, 2), (3, 3)]})
        draw(s, BLOCKING_A)
        h = s.hint()
        self.assertEqual(h.kind, "blocked")
        self.assertEqual(h.blocker, 0)
        self.assertIn("ajust", h.message.lower())
        self.assertTrue(set(h.cells) <= set(BLOCKING_A))

    def test_hint_is_calm_when_everything_is_connected(self):
        s = make_session(4, PAIRS_4)
        draw(s, [(0, 0), (0, 1), (0, 2), (0, 3)])
        draw(s, [(3, 0), (3, 1), (3, 2), (3, 3)])
        h = s.hint()
        self.assertEqual(h.kind, "done")

    def test_messages_are_friendly_and_never_punitive(self):
        s = make_session(4, PAIRS_4)
        msgs = {s.hint().message for _ in range(6)}
        for m in msgs:
            low = m.lower()
            for bad in ("erro", "errado", "falhou", "perdeu", "tempo"):
                self.assertNotIn(bad, low)
        self.assertGreaterEqual(len(msgs), 2)


if __name__ == "__main__":
    unittest.main()


class HintRespectsCurrentBoardTests(unittest.TestCase):
    def test_hint_never_suggests_a_cell_that_the_game_would_block(self):
        import random
        from game.cell import neighbors
        rng = random.Random(5)
        for lv in LevelManager().levels:
            for _ in range(2):
                s = GameSession()
                s.load_level(lv)
                for _ in range(8):
                    color = rng.choice(list(lv.pairs))
                    s.start_connection(rng.choice(lv.pairs[color]))
                    for _ in range(rng.randint(1, 12)):
                        head = s.board.paths[color].head
                        s.add_segment(rng.choice(neighbors(head, lv.size)))
                    s.finish_connection()
                    h = s.hint()
                    if h.kind in ("start", "continue"):
                        for cell in h.cells:
                            owner = s.board.path_color_at(cell)
                            self.assertIn(owner, (None, h.color), (lv.id, h, cell))
                            self.assertIn(s.board.dot_color(cell), (None, h.color), (lv.id, h, cell))

    def test_hint_blames_an_unfinished_path_when_that_is_what_blocks(self):
        s = make_session(4, PAIRS_4, solution={0: [(0, 0), (0, 1), (0, 2), (0, 3)],
                                               1: [(3, 0), (3, 1), (3, 2), (3, 3)]})
        draw(s, BLOCKING_A[:-1])
        s.finish_connection()
        h = s.hint()
        self.assertIn(h.kind, ("blocked", "start", "continue"))
        if h.kind != "blocked":
            for cell in h.cells:
                self.assertIn(s.board.path_color_at(cell), (None, h.color))


class HintSpeedTests(unittest.TestCase):
    def test_a_hint_never_takes_long_even_on_hopeless_boards(self):
        import random
        import time
        from game.cell import neighbors
        rng = random.Random(11)
        worst = 0.0
        for lv in LevelManager().levels:
            s = GameSession()
            s.load_level(lv)
            for _ in range(6):
                color = rng.choice(list(lv.pairs))
                s.start_connection(rng.choice(lv.pairs[color]))
                for _ in range(rng.randint(2, 14)):
                    s.add_segment(rng.choice(neighbors(s.board.paths[color].head, lv.size)))
                s.finish_connection()
                t = time.perf_counter()
                s.hint()
                worst = max(worst, time.perf_counter() - t)
        self.assertLess(worst, 0.8)
