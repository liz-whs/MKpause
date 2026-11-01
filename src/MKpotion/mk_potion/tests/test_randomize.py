import random
import sys
import time
import unittest
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from game.game_logic import is_uniform, is_won
from game.hint_solver import SOLVED, solve
from game.level_generator import randomize_bottles
from game.level_manager import LevelManager


class RandomizeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.levels = LevelManager().levels

    def test_every_level_stays_valid_and_solvable(self):
        for lv in self.levels:
            for seed in range(5):
                new = randomize_bottles(lv.bottles, lv.capacity, lv.id, rng=random.Random(seed))
                self.assertEqual(len(new), len(lv.bottles))
                self.assertEqual(Counter(c for b in new for c in b), Counter(c for b in lv.bottles for c in b))
                self.assertEqual(sum(1 for b in new if not b), sum(1 for b in lv.bottles if not b))
                self.assertTrue(all(len(b) <= lv.capacity for b in new))
                self.assertFalse(any(b and is_uniform(b) for b in new), "garrafa já pronta no início")
                self.assertFalse(is_won(new, lv.capacity))
                self.assertEqual(solve(new, lv.capacity, weight=1.5).status, SOLVED, (lv.id, seed))

    def test_arrangements_really_vary(self):
        for lv in self.levels:
            seen = {randomize_bottles(lv.bottles, lv.capacity, lv.id, rng=random.Random(s)) for s in range(10)}
            self.assertGreaterEqual(len(seen), 9, "fase %d variou pouco" % lv.id)

    def test_same_seed_same_result(self):
        lv = self.levels[3]
        a = randomize_bottles(lv.bottles, lv.capacity, lv.id, rng=random.Random(7))
        b = randomize_bottles(lv.bottles, lv.capacity, lv.id, rng=random.Random(7))
        self.assertEqual(a, b)

    def test_avoid_current_arrangement(self):
        lv = self.levels[0]
        first = randomize_bottles(lv.bottles, lv.capacity, lv.id, rng=random.Random(1))
        again = randomize_bottles(lv.bottles, lv.capacity, lv.id, rng=random.Random(1), avoid=first)
        self.assertNotEqual(first, again)

    def test_difficulty_follows_level_progression(self):
        def avg_len(lv):
            lens = []
            for s in range(5):
                new = randomize_bottles(lv.bottles, lv.capacity, lv.id, rng=random.Random(s))
                lens.append(len(solve(new, lv.capacity, weight=1.5).moves))
            return sum(lens) / len(lens)
        by_id = {lv.id: avg_len(lv) for lv in self.levels if lv.id in (1, 3, 7)}
        self.assertLess(by_id[1], by_id[3])
        self.assertLess(by_id[3], by_id[7])

    def test_fast_enough_to_run_when_a_level_starts(self):
        for lv in self.levels:
            t = time.perf_counter()
            randomize_bottles(lv.bottles, lv.capacity, lv.id, rng=random.Random(3))
            self.assertLess(time.perf_counter() - t, 1.5, "fase %d demorou" % lv.id)

    def test_falls_back_to_original_when_it_cannot_shuffle(self):
        impossible = ((0, 0, 0, 0), (1, 1, 1, 1))
        self.assertEqual(randomize_bottles(impossible, 4), impossible)


if __name__ == "__main__":
    unittest.main()
