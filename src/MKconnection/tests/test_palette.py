import math
import unittest

from helpers import make_level
from game.settings import (CACAO, CREAM, DUSTY_ROSE, GRASS, HC_PATH_COLORS, JUNGLE, LAVENDER, LEAF, PALETTE,
                           PALETTE_HEX, PATH_COLORS, PEONY, SKY, contrast_ratio as contrast, hex_to_rgb, symbol_ink)
from game.themes import THEMES, make_theme


def _lab(rgb):
    """sRGB -> CIE Lab (D65), para medir o quanto duas cores parecem diferentes."""
    def lin(c):
        c /= 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(c) for c in rgb)
    x, y, z = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, 0.2126 * r + 0.7152 * g + 0.0722 * b, \
              (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    return 116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))


def delta_e(a, b):
    return math.dist(_lab(a), _lab(b))


class PaletteTests(unittest.TestCase):
    def test_palette_hex_codes_are_exactly_the_ones_of_the_reference_image(self):
        self.assertEqual(PALETTE_HEX, {
            "Lavender": "#CCC3D1", "Leaf": "#C1BC77", "Grass": "#8D8B4C", "Jungle": "#65613F",
            "Sky": "#AFB8CD", "Cacao": "#6B403B", "Peony": "#F7DDD5", "Dusty Rose": "#D8A4AF"})
        self.assertEqual(PALETTE["Cacao"], hex_to_rgb("#6B403B"))
        self.assertEqual((LAVENDER, LEAF, GRASS, JUNGLE, SKY, CACAO, PEONY, DUSTY_ROSE),
                         tuple(PALETTE[k] for k in ("Lavender", "Leaf", "Grass", "Jungle", "Sky", "Cacao", "Peony", "Dusty Rose")))

    def test_interface_colors_come_straight_from_the_palette(self):
        t = make_theme(False)
        self.assertEqual(t["text"], CACAO)
        self.assertEqual(t["text_soft"], JUNGLE)
        self.assertEqual(t["btn_primary"][0], CACAO)
        self.assertEqual(t["btn_secondary"][0], PEONY)
        self.assertEqual(t["btn_soft"][0], LAVENDER)
        self.assertEqual(t["btn_rose"][0], DUSTY_ROSE)
        self.assertEqual(t["btn_sky"][0], SKY)
        self.assertEqual(t["btn_leaf"][0], LEAF)

    def test_background_is_a_very_light_warm_tint_of_peony(self):
        t = make_theme(False)
        self.assertLess(contrast(t["bg"], (255, 255, 255)), 1.15)
        self.assertGreater(t["bg"][0], t["bg"][2])

    def test_text_is_readable_on_the_background(self):
        t = make_theme(False)
        self.assertGreaterEqual(contrast(t["text"], t["bg"]), 7.0)
        self.assertGreaterEqual(contrast(t["text_soft"], t["bg"]), 4.5)
        self.assertGreaterEqual(contrast(t["text"], t["panel"]), 7.0)

    def test_every_button_label_is_readable(self):
        for high in (False, True):
            t = make_theme(high)
            minimum = 7.0 if high else 4.0
            for key in [k for k in t if k.startswith("btn_") and k != "btn_disabled"]:
                bg, fg = t[key]
                self.assertGreaterEqual(contrast(bg, fg), minimum, (key, high))

    def test_path_colors_stand_out_on_every_board_theme(self):
        for theme in THEMES:
            for colors in (PATH_COLORS, HC_PATH_COLORS):
                for pc in colors:
                    self.assertGreaterEqual(contrast(pc.rgb, theme.board_bg), 3.0, (theme.key, pc.name))

    def test_symbols_are_readable_inside_the_dots(self):
        for colors in (PATH_COLORS, HC_PATH_COLORS):
            for pc in colors:
                self.assertGreaterEqual(contrast(pc.rgb, symbol_ink(pc.rgb)), 3.0, pc.name)

    def test_dots_outline_stands_out_from_the_board(self):
        for theme in THEMES:
            self.assertGreaterEqual(contrast(CREAM, theme.board_bg), 7.0, theme.key)

    def test_board_themes_are_dark_and_start_from_a_palette_color(self):
        base = {"chinchila": LAVENDER, "jardim": JUNGLE, "noite": SKY}
        for theme in THEMES:
            b = base[theme.key]
            self.assertEqual(max(range(3), key=lambda i: theme.board_bg[i]), max(range(3), key=lambda i: b[i]), theme.key)
            self.assertIn(theme.accent, PALETTE.values(), theme.key)

    def test_path_colors_come_from_the_palette(self):
        exact = [pc for pc in PATH_COLORS if pc.rgb in PALETTE.values()]
        self.assertGreaterEqual(len(exact), 5)
        for pc in PATH_COLORS:
            if pc in exact:
                continue
            self.assertLessEqual(min(delta_e(pc.rgb, c) for c in PALETTE.values()), 30, pc.name)

    def test_path_colors_are_easy_to_tell_apart(self):
        for k in range(3, 8):
            cols = [pc.rgb for pc in PATH_COLORS[:k]]
            worst = min(delta_e(a, b) for i, a in enumerate(cols) for b in cols[i + 1:])
            self.assertGreaterEqual(worst, 18, k)

    def test_the_seven_path_colors_are_distinct(self):
        for colors in (PATH_COLORS, HC_PATH_COLORS):
            self.assertEqual(len({c.rgb for c in colors}), 7)


if __name__ == "__main__":
    unittest.main()
