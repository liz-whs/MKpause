import copy
import json
import tempfile
import unittest
from pathlib import Path

from helpers import make_level
from game.level_generator import KNOWN_SEEDS, LEVEL_SPECS, build_level, generate_all_fast, greedy_fail_rate
from game.level_manager import CATEGORIES, DEFAULT_PATH, LevelManager, category_of_level
from game.level_validator import (LEVEL_RULES, is_solvable, pairs_of, validate_all, validate_level,
                                  validate_solution, validate_structure)


def raw_levels():
    return json.loads(DEFAULT_PATH.read_text(encoding="utf-8"))["levels"]


class OfficialLevelsTests(unittest.TestCase):
    def test_there_are_nine_levels_split_in_three_categories(self):
        levels = raw_levels()
        self.assertEqual([lv["id"] for lv in levels], list(range(1, 10)))
        self.assertEqual([(c.key, c.size, len(c.level_ids)) for c in CATEGORIES],
                         [("easy", 6, 3), ("medium", 8, 3), ("hard", 10, 3)])
        for lv in levels:
            self.assertEqual(lv["size"], category_of_level(lv["id"]).size)

    def test_pairs_per_level_follow_the_project_table(self):
        for lv in raw_levels():
            size, lo, hi = LEVEL_RULES[lv["id"]]
            self.assertEqual(lv["size"], size)
            self.assertTrue(lo <= len(lv["pairs"]) <= hi, lv["id"])
        counts = [len(lv["pairs"]) for lv in raw_levels()]
        self.assertEqual(counts[:3], [3, 3, 4])
        self.assertEqual(counts[3:6], [4, 5, 5])
        self.assertIn(counts[7], (6, 7))
        self.assertEqual(counts[6], 6)
        self.assertEqual(counts[8], 7)

    def test_every_color_has_exactly_two_endpoints(self):
        for lv in raw_levels():
            cells = [tuple(p[k]) for p in lv["pairs"] for k in ("a", "b")]
            self.assertEqual(len(cells), len(set(cells)), lv["id"])
            self.assertEqual(len(cells), 2 * len(lv["pairs"]))
            self.assertEqual(len({p["color"] for p in lv["pairs"]}), len(lv["pairs"]))

    def test_all_levels_are_valid_and_solvable(self):
        problems = validate_all(raw_levels(), check_solver=True)
        self.assertEqual(problems, {})

    def test_stored_solutions_connect_every_pair_without_crossing(self):
        for lv in raw_levels():
            self.assertEqual(validate_solution(lv), [], lv["id"])

    def test_solver_independently_finds_a_solution(self):
        for lv in raw_levels():
            self.assertTrue(is_solvable(lv), lv["id"])

    def test_levels_get_harder_with_size_and_pairs(self):
        levels = raw_levels()
        cells = [sum(len(p) for p in lv["solution"].values()) for lv in levels]
        self.assertLess(cells[0], cells[3])
        self.assertLess(cells[3], cells[6])

    def test_hard_levels_need_planning_not_just_more_dots(self):
        import random
        for lv in raw_levels():
            rate = greedy_fail_rate(lv["size"], pairs_of(lv), random.Random(1), trials=300)
            if lv["id"] >= 5:
                self.assertGreaterEqual(rate, 0.3, "fase %d muito fácil de resolver sem planejar" % lv["id"])


class ReproducibilityTests(unittest.TestCase):
    def test_seeds_rebuild_the_official_levels_exactly(self):
        stored = {lv["id"]: lv for lv in raw_levels()}
        for spec in LEVEL_SPECS:
            rebuilt = build_level(spec, KNOWN_SEEDS[spec["id"]])
            self.assertEqual(rebuilt, stored[spec["id"]])

    def test_fast_fallback_matches_the_json(self):
        self.assertEqual(generate_all_fast(), raw_levels())


class ValidatorTests(unittest.TestCase):
    def good(self):
        return copy.deepcopy(raw_levels()[0])

    def test_detects_endpoint_out_of_the_grid(self):
        lv = self.good()
        lv["pairs"][0]["a"] = [9, 9]
        self.assertTrue(validate_structure(lv))

    def test_detects_a_color_with_one_or_three_endpoints(self):
        lv = self.good()
        lv["pairs"].append(dict(lv["pairs"][0]))
        self.assertTrue(any("repet" in e or "duas" in e for e in validate_structure(lv)))

    def test_detects_two_dots_in_the_same_cell(self):
        lv = self.good()
        lv["pairs"][1]["a"] = lv["pairs"][0]["a"]
        self.assertTrue(validate_structure(lv))

    def test_detects_a_solution_that_crosses(self):
        lv = self.good()
        c0, c1 = [str(p["color"]) for p in lv["pairs"][:2]]
        lv["solution"][c0] = lv["solution"][c0][:-1] + [lv["solution"][c1][0]]
        self.assertTrue(validate_solution(lv))

    def test_detects_a_diagonal_step_in_the_solution(self):
        lv = self.good()
        c0 = str(lv["pairs"][0]["color"])
        path = lv["solution"][c0]
        lv["solution"][c0] = [path[0], [path[0][0] + 1, path[0][1] + 1]] + path[2:]
        self.assertTrue(validate_solution(lv))

    def test_detects_an_unsolvable_level(self):
        lv = {"id": 1, "size": 3, "seed": 0, "category": "easy",
              "pairs": [{"color": 0, "a": [0, 1], "b": [2, 1]}, {"color": 1, "a": [1, 0], "b": [1, 2]}],
              "solution": {"0": [[0, 1], [1, 1], [2, 1]], "1": [[1, 0], [1, 1], [1, 2]]}}
        self.assertTrue(validate_solution(lv))
        self.assertFalse(is_solvable(lv))


class LevelManagerTests(unittest.TestCase):
    def test_loads_the_official_levels(self):
        m = LevelManager()
        self.assertEqual(m.ids(), list(range(1, 10)))
        self.assertEqual(m.warning, "")
        self.assertEqual(m.next_id(3), 4)
        self.assertIsNone(m.next_id(9))
        self.assertEqual(len(m.levels_in(CATEGORIES[1])), 3)

    def test_missing_file_falls_back_to_default_levels(self):
        m = LevelManager(Path(tempfile.mkdtemp()) / "nao_existe.json")
        self.assertEqual(m.ids(), list(range(1, 10)))
        self.assertTrue(m.warning)

    def test_corrupt_file_falls_back_to_default_levels(self):
        p = Path(tempfile.mkdtemp()) / "ruim.json"
        p.write_text("{ isto não é json", encoding="utf-8")
        self.assertEqual(LevelManager(p).ids(), list(range(1, 10)))

    def test_invalid_level_is_not_made_available(self):
        data = {"levels": raw_levels()}
        data["levels"][2]["pairs"][0]["a"] = [99, 99]
        p = Path(tempfile.mkdtemp()) / "levels.json"
        p.write_text(json.dumps(data), encoding="utf-8")
        m = LevelManager(p)
        self.assertNotIn(3, m.ids())
        self.assertTrue(m.warning)


if __name__ == "__main__":
    unittest.main()
