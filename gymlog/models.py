"""Plain Python data and validation; no GUI or database dependencies."""
from dataclasses import dataclass
from datetime import date, timedelta


@dataclass(frozen=True)
class Workout:
    name: str
    minutes: int
    day: date


def create_workout(name: str, minutes: str, day: date | None = None) -> Workout:
    name = name.strip()
    if not name or len(name) > 50:
        raise ValueError("Enter a workout name between 1 and 50 characters.")
    try:
        duration = int(minutes)
    except ValueError:
        raise ValueError("Duration must be a whole number of minutes.") from None
    if not 1 <= duration <= 600:
        raise ValueError("Duration must be between 1 and 600 minutes.")
    return Workout(name, duration, day or date.today())


def weekly_workouts(workouts: list[Workout], today: date) -> list[Workout]:
    monday = today - timedelta(days=today.weekday())
    return [w for w in workouts if monday <= w.day <= today]


def demo_workouts(today: date) -> list[Workout]:
    return [Workout("Upper body strength", 45, today),
            Workout("Easy cardio", 25, today - timedelta(days=2)),
            Workout("Lower body strength", 50, today - timedelta(days=4))]
