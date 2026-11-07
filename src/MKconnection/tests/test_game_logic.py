import random
import unittest

from helpers import BLOCKING_A, PAIRS_4, draw, make_session
from game.game_logic import MoveKind, validate_board


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.s = make_session(4, PAIRS_4)
        self.total_free = len(self.s.board.free_cells())

    def test_cancel_releases_all_cells(self):
        draw(self.s, [(0, 0), (1, 0), (1, 1), (1, 2)])
        self.assertLess(len(self.s.board.free_cells()), self.total_free)
        res = self.s.cancel_connection(0)
        self.assertEqual(res.kind, MoveKind.CLEARED)
        self.assertEqual(len(self.s.board.free_cells()), self.total_free)
        self.assertEqual(validate_board(self.s.board), [])

    def test_restarting_from_the_dot_replaces_the_old_path_and_frees_its_cells(self):
        draw(self.s, [(0, 0), (1, 0), (1, 1), (1, 2)])
        self.s.finish_connection()
        res = self.s.start_connection((0, 0))
        self.assertEqual(res.kind, MoveKind.STARTED)
        self.assertTrue(res.replaced)
        self.assertEqual(len(self.s.board.free_cells()), self.total_free)
        draw(self.s, [(0, 0), (0, 1)])
        self.assertEqual(self.s.board.paths[0].cells, [(0, 0), (0, 1)])
        self.assertEqual(validate_board(self.s.board), [])

    def test_replacing_a_completed_connection_frees_it(self):
        draw(self.s, [(0, 0), (0, 1), (0, 2), (0, 3)])
        self.s.finish_connection()
        self.assertEqual(self.s.completed_connections(), [0])
        self.s.start_connection((0, 3))
        self.assertEqual(self.s.completed_connections(), [])
        self.assertEqual(len(self.s.board.free_cells()), self.total_free)

    def test_cells_released_by_one_path_can_be_used_by_another(self):
        draw(self.s, [(0, 0), (1, 0), (2, 0)])
        self.s.finish_connection()
        self.s.cancel_connection(0)
        res = draw(self.s, [(3, 0), (2, 0), (1, 0)])
        self.assertEqual(res[-1].kind, MoveKind.ADDED)

    def test_resume_from_middle_of_path_shortens_and_frees_the_rest(self):
        draw(self.s, [(0, 0), (1, 0), (1, 1), (1, 2)])
        self.s.finish_connection()
        res = self.s.start_connection((1, 0))
        self.assertEqual(res.kind, MoveKind.RESUMED)
        self.assertEqual(self.s.board.paths[0].cells, [(0, 0), (1, 0)])
        self.assertTrue(self.s.board.is_free((1, 1)))
        self.assertTrue(self.s.board.is_free((1, 2)))

    def test_incomplete_path_stays_and_can_be_continued(self):
        draw(self.s, [(0, 0), (0, 1)])
        self.s.finish_connection()
        self.assertEqual(self.s.completed_connections(), [])
        self.s.start_connection((0, 1))
        res = self.s.drag_to([(0, 2), (0, 3)])
        self.assertEqual(res[-1].kind, MoveKind.COMPLETED)

    def test_cancel_without_path_is_harmless(self):
        self.assertEqual(self.s.cancel_connection(1).kind, MoveKind.NOOP)
        self.assertEqual(self.s.cancel_connection().kind, MoveKind.NOOP)


class VictoryTests(unittest.TestCase):
    def test_level_is_complete_only_when_every_pair_is_connected(self):
        s = make_session(4, PAIRS_4)
        self.assertFalse(s.is_won())
        draw(s, [(0, 0), (0, 1), (0, 2), (0, 3)])
        self.assertFalse(s.is_won())
        self.assertEqual(s.progress(), (1, 2))
        draw(s, [(3, 0), (3, 1), (3, 2), (3, 3)])
        self.assertTrue(s.is_won())
        self.assertEqual(s.progress(), (2, 2))

    def test_partial_path_does_not_count(self):
        s = make_session(4, PAIRS_4)
        draw(s, [(0, 0), (0, 1), (0, 2)])
        draw(s, [(3, 0), (3, 1), (3, 2), (3, 3)])
        self.assertFalse(s.is_won())

    def test_breaking_a_connection_undoes_the_victory(self):
        s = make_session(4, PAIRS_4)
        draw(s, [(0, 0), (0, 1), (0, 2), (0, 3)])
        draw(s, [(3, 0), (3, 1), (3, 2), (3, 3)])
        self.assertTrue(s.is_won())
        s.start_connection((0, 0))
        self.assertFalse(s.is_won())


class SnapshotTests(unittest.TestCase):
    def test_snapshot_roundtrip(self):
        s = make_session(4, PAIRS_4)
        draw(s, [(0, 0), (0, 1), (0, 2), (0, 3)])
        draw(s, [(3, 0), (3, 1)])
        snap = s.snapshot()
        t = make_session(4, PAIRS_4)
        t.restore(snap)
        self.assertEqual(t.snapshot(), snap)
        self.assertEqual(t.completed_connections(), [0])
        self.assertEqual(validate_board(t.board), [])

    def test_invalid_snapshot_is_discarded(self):
        t = make_session(4, PAIRS_4)
        t.restore({"0": {"cells": [[0, 0], [2, 2]], "complete": True}})
        self.assertEqual(t.board.paths, {})
        t.restore({"0": {"cells": [[0, 0], [0, 1]], "complete": False},
                   "1": {"cells": [[3, 0], [2, 0], [1, 0], [0, 0]], "complete": False}})
        self.assertEqual(validate_board(t.board), [])


class StressTests(unittest.TestCase):
    def test_random_mouse_play_never_breaks_the_rules(self):
        rng = random.Random(7)
        s = make_session(4, PAIRS_4)
        for _ in range(4000):
            r = rng.random()
            cell = (rng.randint(-1, 4), rng.randint(-1, 4))
            if r < 0.25:
                s.start_connection(cell)
            elif r < 0.85:
                s.add_segment(cell)
            elif r < 0.93:
                s.finish_connection()
            else:
                s.cancel_connection(rng.choice([None, 0, 1]))
            self.assertEqual(validate_board(s.board), [])

    def test_blocking_scenario_is_a_legal_state(self):
        s = make_session(4, PAIRS_4)
        res = draw(s, BLOCKING_A)
        self.assertEqual(res[-1].kind, MoveKind.COMPLETED)
        self.assertEqual(validate_board(s.board), [])


if __name__ == "__main__":
    unittest.main()


class FollowCellsTests(unittest.TestCase):
    def setUp(self):
        self.s = make_session(4, PAIRS_4)

    def test_fast_straight_drag_adds_every_cell_in_order(self):
        self.s.start_connection((0, 0))
        res = self.s.follow_cells([(0, 0), (0, 1), (0, 2), (0, 3)])
        self.assertEqual([r.kind for r in res], [MoveKind.ADDED, MoveKind.ADDED, MoveKind.COMPLETED])
        self.assertTrue(self.s.is_won() is False and self.s.completed_connections() == [0])

    def test_cells_far_from_the_head_are_ignored_until_the_cursor_comes_back(self):
        self.s.start_connection((0, 0))
        res = self.s.follow_cells([(2, 2), (1, 2), (0, 1)])
        self.assertEqual(self.s.board.paths[0].cells, [(0, 0), (0, 1)])
        self.assertEqual(len(res), 1)

    def test_a_jump_in_the_middle_of_the_movement_stops_it(self):
        self.s.start_connection((0, 0))
        self.s.follow_cells([(0, 1), (2, 2), (0, 2)])
        self.assertEqual(self.s.board.paths[0].cells, [(0, 0), (0, 1)])

    def test_blocked_cell_stops_the_movement_without_breaking_anything(self):
        draw(self.s, [(3, 0), (2, 0)])
        self.s.finish_connection()
        self.s.start_connection((0, 0))
        res = self.s.follow_cells([(1, 0), (2, 0), (2, 1)])
        self.assertTrue(res[-1].blocked)
        self.assertEqual(self.s.board.paths[0].cells, [(0, 0), (1, 0)])
        self.assertEqual(validate_board(self.s.board), [])

    def test_no_active_path_does_nothing(self):
        self.assertEqual(self.s.follow_cells([(0, 1)]), [])
