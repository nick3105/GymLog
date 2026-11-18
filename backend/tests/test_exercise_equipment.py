"""Equipment tags describe the catalogue without changing exercise identity."""

import json
from pathlib import Path

CATALOGUE = json.loads(
    (Path(__file__).resolve().parents[1] / "gymlog" / "exercises.json").read_text()
)


def test_every_catalogue_exercise_has_a_supported_equipment_tag():
    """Unknown and unmatched equipment stays explicitly categorised as other."""
    allowed = {
        "barbell",
        "dumbbell",
        "cable",
        "machine",
        "bodyweight",
        "kettlebell",
        "bands",
        "other",
    }
    assert all(exercise.get("equipment") in allowed for exercise in CATALOGUE)
    by_id = {exercise["id"]: exercise for exercise in CATALOGUE}
    for exercise_id, expected in {
        "bench-press": "barbell",
        "dumbbell-bench-press": "dumbbell",
        "cable-fly": "cable",
        "chest-press-machine": "machine",
        "push-up": "bodyweight",
        "alternating-kettlebell-press": "kettlebell",
        "band-good-morning": "bands",
    }.items():
        assert by_id[exercise_id]["equipment"] == expected
