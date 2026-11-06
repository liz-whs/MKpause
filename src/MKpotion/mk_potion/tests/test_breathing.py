import time
import unittest

from game.breathing import (EXHALE, FINISHED, IDLE, INHALE, PAUSED, RUNNING, BreathingExercise)


class BreathingTests(unittest.TestCase):
    def test_phases_follow_rhythm(self):
        ex = BreathingExercise(3, 4, cycles=2)
        self.assertEqual(ex.state, IDLE)
        ex.start()
        ex.update(1.0)
        self.assertEqual((ex.phase, ex.label), (INHALE, "Inspire"))
        ex.update(2.5)
        self.assertEqual((ex.phase, ex.label), (EXHALE, "Expire"))
        ex.update(3.5)
        self.assertEqual(ex.phase, INHALE)

    def test_circle_grows_then_shrinks_smoothly(self):
        ex = BreathingExercise(3, 4, cycles=1)
        ex.start()
        sizes = []
        for _ in range(70):
            ex.update(0.1)
            sizes.append(ex.circle_scale())
        peak = sizes.index(max(sizes))
        self.assertAlmostEqual(peak * 0.1 + 0.1, 3.0, delta=0.25)
        self.assertTrue(all(b >= a - 1e-9 for a, b in zip(sizes[:peak], sizes[1:peak + 1])))
        self.assertTrue(all(b <= a + 1e-9 for a, b in zip(sizes[peak:-1], sizes[peak + 1:])))
        self.assertLessEqual(max(sizes), 1.0)
        self.assertGreaterEqual(min(sizes), 0.45)

        self.assertTrue(all(abs(b - a) < 0.2 for a, b in zip(sizes, sizes[1:])))

    def test_pause_resume_stop(self):
        ex = BreathingExercise(3, 4)
        ex.start()
        ex.update(2)
        ex.pause()
        self.assertEqual(ex.state, PAUSED)
        ex.update(100)
        self.assertAlmostEqual(ex.elapsed, 2)
        ex.resume()
        self.assertEqual(ex.state, RUNNING)
        ex.stop()
        self.assertEqual(ex.state, IDLE)
        self.assertEqual(ex.elapsed, 0)

    def test_finishes_and_can_extend(self):
        ex = BreathingExercise(3, 4, cycles=1)
        ex.start()
        ex.update(7.0)
        self.assertEqual(ex.state, FINISHED)
        ex.update(5)
        self.assertEqual(ex.state, FINISHED)
        ex.extend()
        self.assertEqual(ex.state, RUNNING)

    def test_default_runs_continuously_until_user_stops(self):
        for inhale, exhale in ((3, 4), (4, 6), (3, 3)):
            exercise = BreathingExercise(inhale, exhale)
            exercise.start()
            exercise.update(3600)
            self.assertEqual(exercise.state, RUNNING)
            self.assertIn(exercise.phase, (INHALE, EXHALE))
            exercise.stop()
            self.assertEqual(exercise.state, IDLE)

    def test_update_is_non_blocking(self):
        ex = BreathingExercise(3, 4, cycles=6)
        ex.start()
        t0 = time.perf_counter()
        for _ in range(2000):
            ex.update(1 / 60)
        self.assertLess(time.perf_counter() - t0, 0.5)
        self.assertGreater(ex.elapsed, 30)


if __name__ == "__main__":
    unittest.main()
