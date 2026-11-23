"""Workout RPE settings survive saving and control the recorded effort and estimates."""

from uuid import uuid4

import pytest

from gymlog import create_app, storage


@pytest.fixture
def accounts(tmp_path):
    """Create two accounts in a temporary database, never the real journal."""
    app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "optional-rpe-tests",
            "DATABASE": str(tmp_path / "journal.sqlite3"),
            "SESSION_COOKIE_SECURE": False,
        }
    )
    result = []
    for name in ("alice", "bob"):
        client = app.test_client()
        token = client.get("/api/session").json["csrf"]
        response = client.post(
            "/api/register",
            json={"username": name, "password": "temporary-test-password"},
            headers={"X-CSRF-Token": token},
        )
        assert response.status_code == 201
        result.append((client, {"X-CSRF-Token": response.json["csrf"]}))
    return result


def workout(enabled):
    """Return one repetition exercise and one timed exercise with effort targets."""
    return {
        "name": "RPE test",
        "rpeEnabled": enabled,
        "exercises": [
            {"id": "bench-press", "targets": [{"reps": 5, "weight": 100, "rpe": 8}]},
            {"id": "plank", "targets": [{"durationSeconds": 30, "rpe": 8}]},
        ],
    }


@pytest.mark.parametrize("enabled, estimate", [(False, 116.7), (True, 123.3)])
def test_setting_controls_targets_sessions_and_corrections(accounts, enabled, estimate):
    """Ignore submitted effort whenever the saved workout has RPE disabled."""
    client, headers = accounts[0]
    response = client.post("/api/templates", json=workout(enabled), headers=headers)
    assert response.status_code == 201
    template = response.json
    assert template["rpeEnabled"] is enabled
    for exercise in template["exercises"]:
        assert exercise["targets"][0]["rpe"] == (8 if enabled else None)
    stored = client.get("/api/state").json["templates"][0]
    assert stored["rpeEnabled"] is enabled
    body = {
        "clientId": str(uuid4()),
        "templateId": template["id"],
        "day": "2026-11-22",
        "exercises": [
            {"id": "bench-press", "sets": [{"weight": 100, "reps": 5, "rpe": 8}]},
            {"id": "plank", "sets": [{"durationSeconds": 30, "rpe": 8}]},
        ],
    }
    response = client.post("/api/sessions", json=body, headers=headers)
    assert response.status_code == 201, response.json
    session = response.json
    assert session["rpeEnabled"] is enabled
    assert session["exercises"][0]["estimated1rm"] == estimate
    for exercise in session["exercises"]:
        assert exercise["sets"][0]["rpe"] == (8 if enabled else None)
    body["revision"] = session.get("revision", 0)
    body["timezoneOffset"] = 0
    corrected = client.post(f"/api/sessions/{session['id']}", json=body, headers=headers)
    assert corrected.status_code == 200, corrected.json
    assert corrected.json["rpeEnabled"] is enabled
    assert corrected.json["exercises"][0]["estimated1rm"] == estimate


def test_legacy_workout_keeps_rpe_and_can_turn_it_off(accounts):
    """Older clients keep effort support; editing explicitly can disable it."""
    client, headers = accounts[0]
    body = workout(True)
    del body["rpeEnabled"]
    created = client.post("/api/templates", json=body, headers=headers).json
    assert created["exercises"][0]["targets"][0]["rpe"] == 8
    changed = client.post(f"/api/templates/{created['id']}", json=workout(False), headers=headers)
    assert changed.status_code == 200
    assert changed.json["rpeEnabled"] is False
    assert changed.json["exercises"][0]["targets"][0]["rpe"] is None
    other, other_headers = accounts[1]
    assert other.get("/api/state").json["templates"] == []
    assert (
        other.post(
            f"/api/templates/{created['id']}", json=workout(True), headers=other_headers
        ).status_code
        == 404
    )


@pytest.mark.parametrize("value", ["false", 0, None])
def test_rpe_setting_must_be_boolean(accounts, value):
    """Reject ambiguous settings rather than silently enabling effort."""
    client, headers = accounts[0]
    response = client.post("/api/templates", json=workout(value), headers=headers)
    assert response.status_code == 400
    assert "RPE" in response.json["error"]


def test_draft_preserves_disabled_setting_and_is_private(accounts):
    """A reload restores the flag without exposing it to another user."""
    client, headers = accounts[0]
    draft = {
        "clientId": str(uuid4()),
        "templateId": "test-template",
        "name": "No RPE",
        "day": "2026-11-22",
        "rpeEnabled": False,
        "exercises": [{"id": "bench-press", "sets": []}],
    }
    assert client.post("/api/workout-draft", json=draft, headers=headers).status_code == 200
    assert client.get("/api/workout-draft").json["draft"]["rpeEnabled"] is False
    assert accounts[1][0].get("/api/workout-draft").json["draft"] is None


def test_pre_toggle_workout_keeps_rpe_and_session_retry_works(accounts):
    """Exercise the same missing flag as a workout saved before the toggle existed."""
    client, headers = accounts[0]
    template = client.post("/api/templates", json=workout(True), headers=headers).json
    del template["rpeEnabled"]
    with client.session_transaction() as session:
        user_id = session["user_id"]
    storage.update_template(client.application.config["DATABASE"], user_id, template)
    body = {
        "clientId": str(uuid4()),
        "templateId": template["id"],
        "day": "2026-11-22",
        "exercises": [
            {"id": "bench-press", "sets": [{"weight": 100, "reps": 5, "rpe": 8}]},
            {"id": "plank", "sets": [{"durationSeconds": 30, "rpe": 8}]},
        ],
    }
    response = client.post("/api/sessions", json=body, headers=headers)
    assert response.status_code == 201
    assert response.json["exercises"][0]["estimated1rm"] == 123.3
    retry = client.post("/api/sessions", json=body, headers=headers)
    assert retry.status_code == 200
    assert retry.json["id"] == response.json["id"]


def test_schedule_preserves_rpe_when_adjusting_targets(accounts):
    """Adjusting a scheduled copy retains its flag and leaves the source unchanged."""
    client, headers = accounts[0]
    template = client.post("/api/templates", json=workout(False), headers=headers).json
    assigned = client.post(
        "/api/schedule",
        json={
            "action": "assignWorkout",
            "id": str(uuid4()),
            "revision": 0,
            "templateId": template["id"],
            "week": "2026-11-23",
            "day": "2026-11-23",
        },
        headers=headers,
    )
    assert assigned.status_code == 200, assigned.json
    entry = assigned.json["entries"][0]
    assert entry["workout"]["rpeEnabled"] is False
    adjusted = workout(False)
    adjusted["exercises"][0]["targets"][0]["reps"] = 6
    changed = client.post(
        "/api/schedule",
        json={
            "action": "editEntry",
            "id": entry["id"],
            "revision": assigned.json["revision"],
            "week": entry["week"],
            "day": entry["day"],
            "workout": adjusted,
        },
        headers=headers,
    )
    assert changed.status_code == 200, changed.json
    assert changed.json["entries"][0]["workout"]["rpeEnabled"] is False
    assert changed.json["entries"][0]["workout"]["exercises"][0]["targets"][0]["rpe"] is None
    assert client.get("/api/state").json["templates"][0]["exercises"][0]["targets"][0]["reps"] == 5
