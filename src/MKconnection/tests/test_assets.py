import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from game.settings import HC_PATH_COLORS, PATH_COLORS
from game.themes import THEMES

ICONS_USED = ["back", "hint", "grid", "lock", "check", "next", "play_game", "gear", "palette"]


class AssetTests(unittest.TestCase):
    def test_all_icons_exist(self):
        missing = [n for n in ICONS_USED if not (ROOT / "assets" / "images" / "icons" / (n + ".png")).exists()]
        self.assertEqual(missing, [])

    def test_every_dot_symbol_has_an_image(self):
        for color in PATH_COLORS + HC_PATH_COLORS:
            self.assertTrue((ROOT / "assets" / "images" / "glyphs" / (color.symbol + ".png")).exists(), color.symbol)

    def test_each_theme_decoration_has_an_image(self):
        for t in THEMES:
            self.assertTrue((ROOT / "assets" / "images" / "glyphs" / (t.decor + ".png")).exists(), t.decor)

    def test_mascot_images_exist(self):
        for n in ("mascot_front", "mascot_happy", "mascot_think"):
            self.assertTrue((ROOT / "assets" / "images" / (n + ".png")).exists(), n)

    def test_symbols_are_unique_so_colors_never_depend_on_hue_alone(self):
        self.assertEqual(len({c.symbol for c in PATH_COLORS}), len(PATH_COLORS))
        self.assertEqual(len({c.name for c in PATH_COLORS}), len(PATH_COLORS))


if __name__ == "__main__":
    unittest.main()
