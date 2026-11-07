import unittest

from game.game_state import BACK_TARGET, AppState, Screen


class NavigationTests(unittest.TestCase):
    def test_back_from_a_level_goes_to_the_levels_of_the_category(self):
        s = AppState()
        s.go(Screen.PLAYING)
        self.assertEqual(s.back(), Screen.LEVELS)

    def test_back_from_levels_goes_to_difficulty_selection(self):
        s = AppState()
        s.go(Screen.LEVELS)
        self.assertEqual(s.back(), Screen.DIFFICULTY)

    def test_back_from_difficulty_goes_to_menu(self):
        s = AppState()
        s.go(Screen.DIFFICULTY)
        self.assertEqual(s.back(), Screen.MENU)

    def test_back_from_settings_and_themes_goes_to_menu(self):
        for scr in (Screen.SETTINGS, Screen.THEMES):
            s = AppState()
            s.go(scr)
            self.assertEqual(s.back(), Screen.MENU)

    def test_back_from_completion_goes_to_levels(self):
        s = AppState()
        s.go(Screen.COMPLETE)
        self.assertEqual(s.back(), Screen.LEVELS)

    def test_back_on_the_menu_does_nothing(self):
        s = AppState()
        self.assertIsNone(s.back())
        self.assertEqual(s.current, Screen.MENU)
        self.assertTrue(s.running)

    def test_full_journey_and_return(self):
        s = AppState()
        for scr in (Screen.DIFFICULTY, Screen.LEVELS, Screen.PLAYING):
            s.go(scr)
        trail = []
        while s.back():
            trail.append(s.current)
        self.assertEqual(trail, [Screen.LEVELS, Screen.DIFFICULTY, Screen.MENU])

    def test_every_screen_has_a_way_back_except_the_menu(self):
        for scr in Screen:
            if scr is not Screen.MENU:
                self.assertIn(scr, BACK_TARGET)

    def test_category_is_remembered(self):
        s = AppState()
        s.category_key = "hard"
        s.go(Screen.PLAYING)
        s.back()
        self.assertEqual(s.category_key, "hard")


if __name__ == "__main__":
    unittest.main()
