import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from game.liquid import HIGH_CONTRAST_COLORS, LIQUID_COLORS

ICONS_USED = ["back", "grid", "pause", "restart", "undo", "play_game", "help", "breathe", "gear", "hint",
              "home", "next", "play", "lock", "check"]


class AssetTests(unittest.TestCase):
    def test_all_icons_exist(self):
        missing = [n for n in ICONS_USED if not (ROOT / "assets" / "images" / "icons" / (n + ".png")).exists()]
        self.assertEqual(missing, [])

    def test_every_liquid_symbol_has_an_image(self):
        for color in LIQUID_COLORS + HIGH_CONTRAST_COLORS:
            self.assertTrue((ROOT / "assets" / "images" / "glyphs" / (color.symbol + ".png")).exists(), color.symbol)

    def test_mascot_images_exist(self):
        for n in ("mascot_front", "mascot_sit", "mascot_happy", "mascot_think"):
            self.assertTrue((ROOT / "assets" / "images" / (n + ".png")).exists(), n)


if __name__ == "__main__":
    unittest.main()
