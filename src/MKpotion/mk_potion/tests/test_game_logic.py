import unittest

from game.game_logic import (GameSession, apply_move, count_organized, is_won, legal_moves,
                             validate_move, COLOR_MISMATCH, DEST_FULL, EMPTY_SOURCE, POINTLESS,
                             SAME_BOTTLE, SOURCE_COMPLETE)
from game.hint_solver import find_hint, solve, is_solvable

CAP = 4


class TransferRules(unittest.TestCase):
    def test_valid_transfer_onto_empty(self):
        state = ((0, 1, 1), (), ())
        new, res = apply_move(state, 0, 1, CAP)
        self.assertTrue(res.ok)
        self.assertEqual(res.count, 2)
        self.assertEqual(new, ((0,), (1, 1), ()))

    def test_valid_transfer_onto_same_color(self):
        new, res = apply_move(((0, 1), (2, 1)), 0, 1, CAP)
        self.assertTrue(res.ok)
        self.assertEqual(new, ((0,), (2, 1, 1)))

    def test_invalid_moves_do_not_change_state(self):
        cases = [
            (((0, 1), (2, 3)), 0, 1, COLOR_MISMATCH),
            (((), (1,)), 0, 1, EMPTY_SOURCE),
            (((0, 1), (0, 1)), 0, 0, SAME_BOTTLE),
            (((0, 0, 0, 0), (1,)), 0, 1, SOURCE_COMPLETE),
            (((0, 1), (2, 2, 2, 2)), 0, 1, DEST_FULL),
            (((0, 0), ()), 0, 1, POINTLESS),
        ]
        for state, s, d, reason in cases:
            new, res = apply_move(state, s, d, CAP)
            self.assertFalse(res.ok, reason)
            self.assertEqual(res.reason, reason)
            self.assertEqual(new, state)

    def test_capacity_is_respected(self):
        state = ((1, 0, 0, 0), (2, 2, 0))
        res = validate_move(state, 0, 1, CAP)
        self.assertTrue(res.ok)
        self.assertEqual(res.count, 1)
        new, _ = apply_move(state, 0, 1, CAP)
        self.assertEqual(new, ((1, 0, 0), (2, 2, 0, 0)))
        self.assertTrue(all(len(b) <= CAP for b in new))

    def test_only_top_color_moves(self):
        new, res = apply_move(((0, 0, 1, 2), ()), 0, 1, CAP)
        self.assertEqual(new, ((0, 0, 1), (2,)))
        self.assertEqual(res.count, 1)

    def test_victory_detection(self):
        self.assertTrue(is_won(((0, 0, 0, 0), (1, 1, 1, 1), ()), CAP))
        self.assertFalse(is_won(((0, 0, 0, 1), (1, 1, 1, 0), ()), CAP))

        self.assertFalse(is_won(((0, 0), (0, 0), ()), CAP))
        self.assertEqual(count_organized(((0, 0, 0, 0), (1, 1), ()), CAP), 1)

    def test_legal_moves_are_all_valid(self):
        state = ((0, 1, 2, 0), (1, 2, 0, 1), (2, 0, 1, 2), (), ())
        for s, d in legal_moves(state, CAP):
            self.assertTrue(validate_move(state, s, d, CAP).ok)


class SessionBehaviour(unittest.TestCase):
    def setUp(self):
        self.s = GameSession()
        self.s.start_custom(((0, 1), (1, 0), ()), 2, 1, "Teste")

    def test_undo_multiple_times(self):
        start = self.s.get_state()
        self.s.move(0, 2)
        mid = self.s.get_state()
        self.s.move(1, 0)
        self.assertTrue(self.s.undo())
        self.assertEqual(self.s.get_state(), mid)
        self.assertTrue(self.s.undo())
        self.assertEqual(self.s.get_state(), start)
        self.assertFalse(self.s.undo())

    def test_invalid_move_not_recorded(self):
        self.s.move(0, 0)
        self.assertFalse(self.s.can_undo())

    def test_restart_restores_initial_and_clears_history(self):
        initial = self.s.get_state()
        self.s.move(0, 2)
        self.s.click(1)
        self.s.restart()
        self.assertEqual(self.s.get_state(), initial)
        self.assertFalse(self.s.can_undo())
        self.assertIsNone(self.s.selected)

    def test_new_level_clears_history(self):
        self.s.move(0, 2)
        self.s.start_custom(((0, 1), (1, 0), ()), 2)
        self.assertFalse(self.s.can_undo())

    def test_click_flow_select_deselect_move(self):
        self.assertEqual(self.s.click(0).kind, "selected")
        self.assertEqual(self.s.click(0).kind, "deselected")
        self.s.click(0)
        res = self.s.click(2)
        self.assertEqual(res.kind, "moved")
        self.assertIsNone(self.s.selected)

    def test_click_switches_selection_on_mismatch(self):
        self.s.click(0)
        res = self.s.click(1)
        self.assertEqual(res.kind, "switched")
        self.assertEqual(self.s.selected, 1)

    def test_win_detected_after_solution(self):
        for a, b in ((0, 2), (1, 0), (2, 1)):
            self.s.click(a)
            self.s.click(b)
        self.assertTrue(self.s.is_won())


class Hints(unittest.TestCase):
    def test_hint_is_valid_and_progresses_to_win(self):
        state = ((0, 1, 2, 0), (1, 2, 0, 1), (2, 0, 1, 2), (), ())
        for _ in range(60):
            if is_won(state, CAP):
                break
            hint = find_hint(state, CAP)
            self.assertEqual(hint.status, "ok")
            s, d = hint.move
            state, res = apply_move(state, s, d, CAP)
            self.assertTrue(res.ok)
        self.assertTrue(is_won(state, CAP))

    def test_hint_when_already_solved(self):
        self.assertEqual(find_hint(((0, 0, 0, 0), ()), CAP).status, "solved")

    def test_hint_reports_unsolvable_calmly(self):

        state = ((0, 1, 0, 1), (1, 0, 1, 0))
        self.assertFalse(is_solvable(state, CAP))
        hint = find_hint(state, CAP)
        self.assertEqual(hint.status, "unsolvable")
        self.assertIsNone(hint.move)
        self.assertIn("reiniciar", hint.message)

    def test_solver_path_is_executable(self):
        state = ((0, 1, 0, 1), (1, 0, 1, 0), (), ())
        res = solve(state, CAP)
        self.assertEqual(res.status, "solved")
        for s, d in res.moves:
            state, r = apply_move(state, s, d, CAP)
            self.assertTrue(r.ok)
        self.assertTrue(is_won(state, CAP))


if __name__ == "__main__":
    unittest.main()
