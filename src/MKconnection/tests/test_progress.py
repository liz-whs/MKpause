import json
import tempfile
import unittest
from pathlib import Path

from game.level_manager import CATEGORIES
from game.progress import ProgressStore
from game.settings import Settings, SettingsStore

IDS = list(range(1, 10))


def store():
    return ProgressStore(Path(tempfile.mkdtemp()) / "progress.json")


class ProgressTests(unittest.TestCase):
    def test_save_and_reload(self):
        s = store()
        s.mark_completed(1)
        s.mark_completed(2)
        s.set_last_level(3)
        s.set_theme("noite")
        t = ProgressStore(s.path)
        self.assertEqual(t.completed, {1, 2})
        self.assertEqual(t.last_level, 3)
        self.assertEqual(t.theme, "noite")
        self.assertFalse(list(s.path.parent.glob("*.tmp")))

    def test_corrupt_file_starts_from_scratch_without_crashing(self):
        s = store()
        s.path.write_text("não é json", encoding="utf-8")
        t = ProgressStore(s.path)
        self.assertEqual(t.completed, set())
        self.assertTrue(t.error)

    def test_missing_file_is_a_fresh_start(self):
        t = store()
        self.assertEqual((t.completed, t.last_level, t.theme, t.error), (set(), 1, "chinchila", ""))

    def test_levels_unlock_one_after_the_other(self):
        p = store()
        self.assertEqual([p.is_level_unlocked(i, IDS) for i in (1, 2, 3)], [True, False, False])
        p.mark_completed(1)
        self.assertTrue(p.is_level_unlocked(2, IDS))
        self.assertFalse(p.is_level_unlocked(3, IDS))

    def test_medium_unlocks_after_the_three_easy_levels(self):
        p = store()
        easy, medium, hard = CATEGORIES
        self.assertTrue(p.is_category_unlocked(easy, IDS))
        self.assertFalse(p.is_category_unlocked(medium, IDS))
        for i in (1, 2):
            p.mark_completed(i)
        self.assertFalse(p.is_category_unlocked(medium, IDS))
        p.mark_completed(3)
        self.assertTrue(p.is_category_unlocked(medium, IDS))
        self.assertFalse(p.is_category_unlocked(hard, IDS))

    def test_hard_unlocks_after_the_three_medium_levels(self):
        p = store()
        for i in range(1, 7):
            p.mark_completed(i)
        self.assertTrue(p.is_category_unlocked(CATEGORIES[2], IDS))

    def test_category_progress_counts(self):
        p = store()
        p.mark_completed(1)
        p.mark_completed(2)
        self.assertEqual(p.category_progress(CATEGORIES[0]), (2, 3))
        self.assertEqual(p.category_progress(CATEGORIES[1]), (0, 3))

    def test_play_goes_to_the_next_unfinished_level(self):
        p = store()
        self.assertEqual(p.next_to_play(IDS), 1)
        p.mark_completed(1)
        p.mark_completed(2)
        self.assertEqual(p.next_to_play(IDS), 3)
        for i in IDS:
            p.mark_completed(i)
        self.assertEqual(p.next_to_play(IDS), 1)

    def test_reset(self):
        p = store()
        p.mark_completed(1)
        p.reset()
        self.assertEqual(ProgressStore(p.path).completed, set())


class SettingsTests(unittest.TestCase):
    def test_defaults_are_calm(self):
        s = Settings()
        self.assertTrue(s.sound_enabled)
        self.assertFalse(s.reduced_motion)
        self.assertTrue(s.show_symbols)

    def test_invalid_values_are_corrected(self):
        path = Path(tempfile.mkdtemp()) / "settings.json"
        path.write_text(json.dumps({"volume": 7, "sound_enabled": 0, "lixo": 1}), encoding="utf-8")
        st = SettingsStore(path)
        self.assertEqual(st.settings.volume, 1.0)
        self.assertFalse(st.settings.sound_enabled)

    def test_save_and_reload(self):
        path = Path(tempfile.mkdtemp()) / "settings.json"
        st = SettingsStore(path)
        st.settings.reduced_motion = True
        st.save()
        self.assertTrue(SettingsStore(path).settings.reduced_motion)


if __name__ == "__main__":
    unittest.main()
