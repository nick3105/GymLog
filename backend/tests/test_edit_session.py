"""Completed-session corrections preserve snapshots and private journals."""

from copy import deepcopy

import pytest

pytest_plugins = ["test_skip_sets"]


def correction(client, headers, body):
    """Save a result and prepare corrected actuals."""
    saved = client.post("/api/sessions", json=body, headers=headers).json
    changes = {"day": "2026-01-02", "timezoneOffset": 0, "exercises": deepcopy(saved["exercises"])}
    changes["exercises"][0]["sets"][0] = {"weight": 100, "reps": 1, "rpe": 9}
    return saved, changes


def test_correction_works_after_template_deleted_and_updates_progress(journal):
    """Correct history independently of the routine and exclude skipped rows."""
    app, client, headers, template, body = journal
    saved, changes = correction(client, headers, body)
    client.post(f"/api/templates/{template['id']}/delete", json={}, headers=headers)
    url = f"/api/sessions/{saved['id']}"
    result = client.post(url, json=changes, headers=headers)
    assert result.status_code == 200
    edited = result.json
    for key in ("id", "clientId", "templateId", "completedAt", "name"):
        assert edited[key] == saved[key]
    assert edited["day"] == changes["day"]
    assert edited["exercises"][0]["sets"][2] == {"skipped": True}
    assert edited["exercises"][0]["plannedSets"] == 3
    assert client.get("/api/exercises/bench-press/stats").json["best"] == 106.7
    assert client.post(url, json=changes, headers=headers).json == edited
    assert client.get("/api/state").json["sessions"] == [edited]
    stranger = app.test_client()
    token = stranger.get("/api/session").json["csrf"]
    registered = stranger.post(
        "/api/register",
        json={"username": "bob", "password": "temporary-test-password"},
        headers={"X-CSRF-Token": token},
    )
    assert (
        stranger.post(
            url, json=changes, headers={"X-CSRF-Token": registered.json["csrf"]}
        ).status_code
        == 404
    )
    assert client.post(url, json=changes).status_code == 403
    signed_out = app.test_client()
    token = signed_out.get("/api/session").json["csrf"]
    assert signed_out.post(url, json=changes, headers={"X-CSRF-Token": token}).status_code == 401


@pytest.mark.parametrize(
    "problem", ["future", "date", "weight", "reps", "rpe", "rows", "skip", "exercise"]
)
def test_invalid_correction_keeps_original(journal, problem):
    """Reject unsupported edits without losing the saved session."""
    app, client, headers, template, body = journal
    saved, changes = correction(client, headers, body)
    exercise = changes["exercises"][0]
    if problem == "future":
        changes["day"] = "2999-01-01"
    elif problem == "date":
        changes["day"] = "2026-02-30"
    elif problem in ("weight", "reps", "rpe"):
        exercise["sets"][0][problem] = -1
    elif problem == "rows":
        exercise["sets"].append({"weight": 20, "reps": 5})
    elif problem == "skip":
        exercise["sets"][0] = {"skipped": True}
    else:
        exercise["id"] = "squat"
    assert (
        client.post(f"/api/sessions/{saved['id']}", json=changes, headers=headers).status_code
        == 400
    )
    assert client.get("/api/state").json["sessions"] == [saved]
