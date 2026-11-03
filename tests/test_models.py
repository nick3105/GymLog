import unittest
from datetime import date
from gymlog.models import Workout, create_workout, weekly_workouts


class WorkoutTests(unittest.TestCase):
    def test_valid_record_and_trimming(self):
        workout = create_workout("  Cardio  ", "30", date(2026, 11, 3))
        self.assertEqual(workout, Workout("Cardio", 30, date(2026, 11, 3)))

    def test_invalid_entries(self):
        for name, minutes in [("", "30"), ("   ", "30"), ("x" * 51, "30"),
                              ("Run", "0"), ("Run", "601"), ("Run", "-1"),
                              ("Run", "2.5"), ("Run", "abc"), ("Run", "")]:
            with self.subTest(name=name, minutes=minutes):
                with self.assertRaises(ValueError):
                    create_workout(name, minutes)

    def test_duration_limits(self):
        self.assertEqual(create_workout("Run", "1").minutes, 1)
        self.assertEqual(create_workout("Run", "600").minutes, 600)

    def test_week_crossing_year_and_future_excluded(self):
        today = date(2027, 1, 3)  # Sunday; Monday is 28 December.
        entries = [Workout("A", 10, date(2026, 12, 27)),
                   Workout("B", 20, date(2026, 12, 28)),
                   Workout("C", 30, today),
                   Workout("D", 40, date(2027, 1, 4))]
        self.assertEqual(weekly_workouts(entries, today), entries[1:3])
        self.assertEqual(weekly_workouts(entries, date(2027, 1, 4)), entries[3:])
        self.assertEqual(weekly_workouts([], today), [])


if __name__ == "__main__":
    unittest.main()
