"""The exercise catalogue is complete, stable and grouped in split order (spec 11)."""

import json
import re
from pathlib import Path

CATALOGUE = json.loads(
    (Path(__file__).parent.parent / "gymlog" / "exercises.json").read_text(encoding="utf-8")
)

SPLIT_ORDER = [
    "Chest",
    "Shoulders",
    "Triceps",
    "Back",
    "Biceps",
    "Forearms",
    "Quads",
    "Hamstrings & glutes",
    "Calves",
    "Core",
]

ORIGINAL_EXERCISES = {
    "bench-press": "Bench press",
    "squat": "Squat",
    "deadlift": "Deadlift",
    "overhead-press": "Overhead press",
    "barbell-row": "Barbell row",
    "lat-pulldown": "Lat pulldown",
    "leg-press": "Leg press",
    "dumbbell-curl": "Dumbbell curl",
    "triceps-pushdown": "Triceps pushdown",
}


def test_ids_and_names_are_unique_and_readable():
    ids = [exercise["id"] for exercise in CATALOGUE]
    names = [exercise["name"] for exercise in CATALOGUE]
    assert len(set(ids)) == len(ids)
    assert len(set(names)) == len(names)
    for exercise_id in ids:
        assert re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", exercise_id), exercise_id


def test_catalogue_covers_a_whole_gym():
    assert len(CATALOGUE) >= 600


def test_original_exercises_keep_their_id_and_name():
    names_by_id = {exercise["id"]: exercise["name"] for exercise in CATALOGUE}
    for exercise_id, name in ORIGINAL_EXERCISES.items():
        assert names_by_id.get(exercise_id) == name


def test_groups_are_blocks_in_split_order():
    blocks = []
    for exercise in CATALOGUE:
        assert exercise["group"] in SPLIT_ORDER, exercise
        if not blocks or blocks[-1] != exercise["group"]:
            blocks.append(exercise["group"])
    assert blocks == SPLIT_ORDER
