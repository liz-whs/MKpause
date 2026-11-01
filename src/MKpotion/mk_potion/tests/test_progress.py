import json
import tempfile
import unittest
from pathlib import Path

from game.progress import ProgressStore
from game.settings import Settings, SettingsStore

IDS = [1, 2, 3]


class ProgressTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.path = Path(self.dir.name) / "progress.json"

    def tearDown(self):
        self.dir.cleanup()

    def test_save_and_recover(self):
        p = ProgressStore(self.path)
        p.mark_completed(1)
        p.mark_completed(2)
        p.set_last_level(3)
        q = ProgressStore(self.path)
        self.assertEqual(q.completed, {1, 2})
        self.assertEqual(q.last_level, 3)

    def test_unlock_rules_and_next(self):
        p = ProgressStore(self.path)
        self.assertTrue(p.is_unlocked(1, IDS))
        self.assertFalse(p.is_unlocked(2, IDS))
        p.mark_completed(1)
        self.assertTrue(p.is_unlocked(2, IDS))
        self.assertEqual(p.next_to_play(IDS), 2)
        for i in IDS:
            p.mark_completed(i)
        self.assertEqual(p.next_to_play(IDS), IDS[0])

    def test_new_game_resets(self):
        p = ProgressStore(self.path)
        p.mark_completed(1)
        p.reset()
        self.assertEqual(ProgressStore(self.path).completed, set())

    def test_corrupt_file_is_handled(self):
        self.path.write_text("lixo", encoding="utf-8")
        p = ProgressStore(self.path)
        self.assertEqual(p.completed, set())
        self.assertTrue(p.error)

    def test_no_personal_data_saved(self):
        p = ProgressStore(self.path)
        p.mark_completed(1)
        self.assertEqual(set(json.loads(self.path.read_text())), {"version", "completed", "last_level"})

    def test_settings_roundtrip_and_validation(self):
        store = SettingsStore(Path(self.dir.name) / "s.json")
        store.settings.volume = 0.3
        store.settings.reduced_motion = True
        store.save()
        again = SettingsStore(Path(self.dir.name) / "s.json").settings
        self.assertEqual((again.volume, again.reduced_motion), (0.3, True))
        s = Settings(volume=9, breathing_preset=7)
        s.validate()
        self.assertEqual(s.volume, 1.0)
        self.assertLess(s.breathing_preset, 3)


if __name__ == "__main__":
    unittest.main()
