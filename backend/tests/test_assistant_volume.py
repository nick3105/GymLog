"""Issue 003: generated routines keep work-set counts and reject one-set routines."""

import json

import pytest

from gymlog import assistant, create_app
from gymlog.models import ASSISTANT_INSTRUCTIONS, validate_assistant_reply, validate_template


@pytest.fixture
def catalogue():
    """Use a small catalogue without reading any private journal."""
    return {
        "bench-press": {"id": "bench-press", "name": "Bench press"},
        "barbell-row": {"id": "barbell-row", "name": "Barbell row"},
        "squat": {"id": "squat", "name": "Squat"},
        "cable-fly": {"id": "cable-fly", "name": "Cable fly"},
        "plank": {"id": "plank", "name": "Plank", "measurement": "duration"},
    }


def exercise(exercise_id, sets):
    """Return one compact exercise prescription."""
    target = {"reps": 8, "weight": None, "rpe": 7}
    if exercise_id == "plank":
        target = {"durationSeconds": 30, "rpe": None}
    return {"id": exercise_id, "sets": sets, "targets": [target]}


def reply(exercises):
    """Wrap a suggested routine in the assistant response format."""
    return json.dumps(
        {
            "reply": "A routine for your training week.",
            "plans": [
                {"name": "Full body", "exercises": exercises},
            ],
        }
    )


def test_five_single_set_exercises_are_not_a_regular_routine(catalogue):
    """Reject the reported thin routine rather than treating it as a finished workout."""
    rows = [exercise(exercise_id, 1) for exercise_id in catalogue]
    with pytest.raises(ValueError, match="at least two work sets"):
        validate_assistant_reply(reply(rows), catalogue)


def test_compact_two_and_three_set_counts_are_preserved(catalogue):
    """Expand counts into the per-set structure that the UI and save API use."""
    rows = [exercise("bench-press", 3), exercise("barbell-row", 3), exercise("plank", 2)]
    planned = validate_assistant_reply(reply(rows), catalogue)["plans"][0]["exercises"]
    assert [item["sets"] for item in planned] == [3, 3, 2]
    assert [len(item["targets"]) for item in planned] == [3, 3, 2]
    assert planned[0]["targets"][2] == {"reps": 8, "weight": None, "rpe": 7}
    assert planned[2]["targets"] == [{"durationSeconds": 30, "rpe": None}] * 2
    assert planned[0]["targets"][0] is not planned[0]["targets"][1]


def test_explicit_individual_targets_are_not_repeated_or_overwritten(catalogue):
    """Keep differences between the model's top and back-off targets."""
    rows = [exercise("bench-press", 2), exercise("barbell-row", 2)]
    rows[0]["targets"].append({"reps": 10, "weight": None, "rpe": 6.5})
    result = validate_assistant_reply(reply(rows), catalogue)["plans"][0]
    assert result["exercises"][0]["targets"] == rows[0]["targets"]
    assert result["exercises"][1]["sets"] == 2


@pytest.mark.parametrize("count", [0, -1, 21, 2.5, True, None, "three"])
def test_invalid_compact_set_counts_are_rejected(catalogue, count):
    """Never silently ignore an invalid model count beside a valid target row."""
    with pytest.raises(ValueError):
        validate_assistant_reply(reply([exercise("bench-press", count)]), catalogue)


def test_conflicting_count_and_individual_targets_are_rejected(catalogue):
    """A model cannot claim three sets while providing two differing prescriptions."""
    row = exercise("bench-press", 3)
    row["targets"].append({"reps": 10, "weight": None, "rpe": 6})
    with pytest.raises(ValueError, match="set count"):
        validate_assistant_reply(reply([row]), catalogue)


def test_manual_and_standalone_single_set_workouts_keep_working(catalogue):
    """The routine rule does not restrict manual templates or standalone drills."""
    rows = [exercise("bench-press", 1), exercise("plank", 1)]
    manual = validate_template({"name": "My plan", "exercises": rows}, catalogue)
    assert [item["sets"] for item in manual["exercises"]] == [1, 1]
    drill = validate_assistant_reply(reply([exercise("plank", 1)]), catalogue)
    assert drill["plans"][0]["exercises"][0]["sets"] == 1


def test_prompt_budgets_time_and_work_sets():
    """The live model receives the time/volume defaults motivating this issue."""
    assert "60-90 minutes" in ASSISTANT_INSTRUCTIONS
    assert "12-24 work sets" in ASSISTANT_INSTRUCTIONS
    assert "warm-up" in ASSISTANT_INSTRUCTIONS
    assert '"sets":3' in ASSISTANT_INSTRUCTIONS


def test_compact_routine_round_trip_through_chat_save_and_reload(tmp_path, monkeypatch):
    """Only an explicit save persists all the expanded work sets."""
    monkeypatch.setenv("GYMLOG_INSTANCE", str(tmp_path))
    app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-only",
            "DATABASE": str(tmp_path / "test.db"),
            "AI_ENABLED": True,
            "REQUESTY_API_KEY": "fake-key",
        }
    )
    content = reply([exercise("bench-press", 3), exercise("barbell-row", 2)])
    monkeypatch.setattr(assistant, "complete", lambda *args: content)
    browser = app.test_client()
    token = browser.get("/api/session").json["csrf"]
    registered = browser.post(
        "/api/register",
        json={
            "username": "alice",
            "password": "test-password-long",
        },
        headers={"X-CSRF-Token": token},
    )
    headers = {"X-CSRF-Token": registered.json["csrf"]}
    response = browser.post(
        "/api/assistant",
        json={
            "consent": True,
            "messages": [{"role": "user", "content": "Plan a 60-90 minute workout"}],
        },
        headers=headers,
    )
    assert response.status_code == 200
    assert browser.get("/api/state").json["templates"] == []
    suggestion = response.json["plans"][0]
    saved = browser.post("/api/templates", json=suggestion, headers=headers)
    assert saved.status_code == 201
    assert [item["sets"] for item in saved.json["exercises"]] == [3, 2]
    assert browser.get("/api/state").json["templates"] == [saved.json]
