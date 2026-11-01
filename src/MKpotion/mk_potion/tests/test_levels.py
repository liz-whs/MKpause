import json
import tempfile
import unittest
from pathlib import Path

from game.game_logic import is_won
from game.hint_solver import SOLVED, solve
from game.level_generator import LEVEL_SPECS, generate_level
from game.level_manager import LevelError, LevelManager, parse_level
from game.liquid import (LIQUID_COLORS, HIGH_CONTRAST_COLORS, MIN_COLOR_DISTANCE, get_palette,
                         min_pairwise_distance)


class LevelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manager = LevelManager()

    def test_eight_levels_loaded_from_file(self):
        self.assertEqual(self.manager.warning, "")
        self.assertEqual(self.manager.count, 8)

    def test_progression_matches_spec(self):
        expected = [(3, 5), (3, 5), (4, 6), (4, 6), (5, 7), (5, 7), (6, 8), (6, 8)]
        for lv, (colors, bottles) in zip(self.manager.levels, expected):
            used = {c for b in lv.bottles for c in b}
            self.assertEqual((len(used), len(lv.bottles)), (colors, bottles), lv.id)
        self.assertGreaterEqual(sum(1 for b in self.manager.levels[0].bottles if not b), 1)

    def test_every_level_is_valid_and_solvable(self):
        for lv in self.manager.levels:
            self.assertFalse(is_won(lv.bottles, lv.capacity), "fase já começa resolvida: %d" % lv.id)
            res = solve(lv.bottles, lv.capacity, weight=1.5, max_nodes=200_000)
            self.assertEqual(res.status, SOLVED, "fase %d sem solução" % lv.id)

    def test_difficulty_grows_gradually(self):
        lengths = [solve(lv.bottles, lv.capacity, weight=1.5).moves for lv in self.manager.levels]
        sizes = [len(m) for m in lengths]
        self.assertLess(sizes[0], sizes[-1])
        for a, b in zip(sizes, sizes[1:]):
            self.assertLessEqual(a - b, 4)
            self.assertLessEqual(b - a, 8)

    def test_levels_are_reproducible(self):
        for spec in LEVEL_SPECS[:4]:
            stored = self.manager.get(spec["id"])
            again = generate_level(spec)
            self.assertEqual([list(b) for b in stored.bottles], again["bottles"])

    def test_invalid_level_rejected(self):
        with self.assertRaises(LevelError):
            parse_level({"id": 1, "capacity": 2, "bottles": [[0, 0, 0], []]})
        with self.assertRaises(LevelError):
            parse_level({"id": 1, "capacity": 2, "bottles": [[0, 1], [1]]})
        with self.assertRaises(LevelError):
            parse_level({"id": 1})

    def test_missing_or_corrupt_file_falls_back(self):
        with tempfile.TemporaryDirectory() as d:
            m = LevelManager(Path(d) / "nao_existe.json")
            self.assertEqual(m.count, 8)
            self.assertTrue(m.warning)
            bad = Path(d) / "ruim.json"
            bad.write_text("{ isto nao e json", encoding="utf-8")
            self.assertEqual(LevelManager(bad).count, 8)

    def test_next_id(self):
        self.assertEqual(self.manager.next_id(1), 2)
        self.assertIsNone(self.manager.next_id(8))


class PaletteTests(unittest.TestCase):
    def test_liquids_are_distinguishable(self):
        for pal in (LIQUID_COLORS, HIGH_CONTRAST_COLORS):
            self.assertGreaterEqual(min_pairwise_distance(get_palette(pal is HIGH_CONTRAST_COLORS)), MIN_COLOR_DISTANCE)

    def test_symbols_are_unique(self):
        self.assertEqual(len({c.symbol for c in LIQUID_COLORS}), len(LIQUID_COLORS))


if __name__ == "__main__":
    unittest.main()
