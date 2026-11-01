import unittest

from game.move_history import MoveHistory


class MoveHistoryTests(unittest.TestCase):
    def test_push_pop_order(self):
        h = MoveHistory()
        h.push("a")
        h.push("b")
        self.assertEqual(len(h), 2)
        self.assertEqual(h.pop(), "b")
        self.assertEqual(h.pop(), "a")
        self.assertIsNone(h.pop())
        self.assertFalse(h.can_undo())

    def test_clear(self):
        h = MoveHistory()
        h.push(1)
        h.clear()
        self.assertFalse(h.can_undo())


if __name__ == "__main__":
    unittest.main()
