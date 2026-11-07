import unittest

from helpers import PAIRS_4, draw, make_session
from game.cell import cells_along_segment, straight_cells
from game.game_logic import MoveKind


class PathRulesTests(unittest.TestCase):
    def setUp(self):
        self.s = make_session(4, PAIRS_4)

    def test_valid_connection_between_same_color_dots(self):
        res = draw(self.s, [(0, 0), (0, 1), (0, 2), (0, 3)])
        self.assertEqual(res[-1].kind, MoveKind.COMPLETED)
        self.assertEqual(self.s.completed_connections(), [0])
        self.assertTrue(self.s.board.paths[0].complete)

    def test_connection_works_starting_from_either_dot(self):
        res = draw(self.s, [(0, 3), (0, 2), (0, 1), (0, 0)])
        self.assertEqual(res[-1].kind, MoveKind.COMPLETED)

    def test_cannot_connect_different_colors(self):
        self.s.start_connection((0, 0))
        for cell in [(1, 0), (2, 0)]:
            self.s.add_segment(cell)
        res = self.s.add_segment((3, 0))
        self.assertEqual(res.kind, MoveKind.BLOCKED_DOT)
        self.assertNotIn((3, 0), self.s.board.paths[0].cells)
        self.assertFalse(self.s.board.paths[0].complete)

    def test_diagonal_move_is_blocked(self):
        self.s.start_connection((0, 0))
        res = self.s.add_segment((1, 1))
        self.assertEqual(res.kind, MoveKind.BLOCKED_NOT_ADJACENT)
        self.assertEqual(self.s.board.paths[0].cells, [(0, 0)])

    def test_move_that_skips_cells_is_blocked(self):
        self.s.start_connection((0, 0))
        res = self.s.add_segment((0, 2))
        self.assertEqual(res.kind, MoveKind.BLOCKED_NOT_ADJACENT)
        self.assertEqual(self.s.board.paths[0].cells, [(0, 0)])

    def test_path_cannot_cross_another_path(self):
        draw(self.s, [(3, 0), (2, 0), (2, 1)])
        self.s.finish_connection()
        self.s.start_connection((0, 0))
        self.s.add_segment((1, 0))
        res = self.s.add_segment((2, 0))
        self.assertEqual(res.kind, MoveKind.BLOCKED_OCCUPIED)
        self.assertEqual(self.s.board.occupant((2, 0)), 1)

    def test_path_cannot_cover_dot_of_another_color(self):
        self.s.start_connection((0, 0))
        for cell in [(1, 0), (2, 0)]:
            self.s.add_segment(cell)
        self.assertEqual(self.s.add_segment((3, 0)).kind, MoveKind.BLOCKED_DOT)

    def test_out_of_bounds_is_ignored_safely(self):
        self.s.start_connection((0, 0))
        self.assertEqual(self.s.add_segment((-1, 0)).kind, MoveKind.OUT_OF_BOUNDS)
        self.assertEqual(self.s.add_segment((0, -1)).kind, MoveKind.OUT_OF_BOUNDS)

    def test_going_back_undoes_one_step(self):
        draw(self.s, [(0, 0), (0, 1), (0, 2)])
        res = self.s.add_segment((0, 1))
        self.assertEqual(res.kind, MoveKind.UNDONE)
        self.assertEqual(self.s.board.paths[0].cells, [(0, 0), (0, 1)])
        self.assertIsNone(self.s.board.occupant((0, 2)))

    def test_returning_to_own_path_shortens_it(self):
        draw(self.s, [(0, 0), (1, 0), (1, 1), (0, 1)])
        res = self.s.add_segment((0, 0))
        self.assertIn(res.kind, (MoveKind.TRUNCATED, MoveKind.NOOP, MoveKind.UNDONE))
        self.assertTrue(self.s.board.is_consistent())

    def test_drag_stops_at_first_blocked_cell_without_breaking(self):
        draw(self.s, [(3, 0), (2, 0)])
        self.s.finish_connection()
        res = draw(self.s, [(0, 0), (1, 0), (2, 0), (2, 1)])
        self.assertEqual(res[-1].kind, MoveKind.BLOCKED_OCCUPIED)
        self.assertEqual(self.s.board.paths[0].cells, [(0, 0), (1, 0)])

    def test_no_move_without_active_path(self):
        self.assertEqual(self.s.add_segment((0, 1)).kind, MoveKind.NOOP)
        self.assertEqual(self.s.start_connection((1, 1)).kind, MoveKind.IGNORED)

    def test_cannot_extend_completed_path(self):
        draw(self.s, [(0, 0), (0, 1), (0, 2), (0, 3)])
        self.assertEqual(self.s.add_segment((1, 3)).kind, MoveKind.NOOP)


class GeometryTests(unittest.TestCase):
    ORIGIN, CELL, N = (100.0, 50.0), 40.0, 6

    def test_straight_cells_in_row_and_column(self):
        self.assertEqual(straight_cells((0, 0), (0, 3)), [(0, 1), (0, 2), (0, 3)])
        self.assertEqual(straight_cells((3, 1), (0, 1)), [(2, 1), (1, 1), (0, 1)])
        self.assertIsNone(straight_cells((0, 0), (1, 1)))

    def test_fast_horizontal_drag_visits_every_cell_in_order(self):
        cells = cells_along_segment((120, 70), (240, 70), self.ORIGIN, self.CELL, self.N)
        self.assertEqual(cells, [(0, 0), (0, 1), (0, 2), (0, 3)])

    def test_drag_through_a_corner_is_ambiguous_and_ignored(self):
        cells = cells_along_segment((139.9, 89.9), (140.1, 90.1), self.ORIGIN, self.CELL, self.N)
        self.assertTrue(cells is None or all(abs(a[0] - b[0]) + abs(a[1] - b[1]) == 1
                                             for a, b in zip(cells, cells[1:])))

    def test_pure_diagonal_jump_never_produces_diagonal_steps(self):
        cells = cells_along_segment((100.5, 50.5), (219.5, 169.5), self.ORIGIN, self.CELL, self.N)
        if cells is not None:
            for a, b in zip(cells, cells[1:]):
                self.assertEqual(abs(a[0] - b[0]) + abs(a[1] - b[1]), 1)

    def test_leaving_the_grid_is_ignored(self):
        self.assertIsNone(cells_along_segment((120, 70), (90, 70), self.ORIGIN, self.CELL, self.N))


if __name__ == "__main__":
    unittest.main()
