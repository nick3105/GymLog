"""Timed sets use seconds throughout the API and retain repetition-workout compatibility."""

from copy import deepcopy
from uuid import uuid4

import pytest

pytest_plugins = ["test_skip_sets"]


def plank_template(client, headers):
    """Create a mixed workout through the normal template endpoint."""
    response = client.post(
        "/api/templates",
        json={
            "name": "Strength and holds",
            "exercises": [
                {"id": "bench-press", "targets": [{"reps": 8, "weight": 60}]},
                {"id": "plank", "targets": [{"durationSeconds": 60}] * 3},
            ],
        },
        headers=headers,
    )
    assert response.status_code == 201
    return response.json


def test_duration_round_trip_edit_retry_stats_and_isolation(journal):
    """Preserve seconds, skipped/extra sets and snapshots across saves and corrections."""
    app, client, headers, _, _ = journal
    template = plank_template(client, headers)
    assert template["exercises"][1]["measurement"] == "duration"
    assert template["exercises"][1]["targets"][0] == {"durationSeconds": 60, "rpe": None}
    body = {
        "clientId": str(uuid4()),
        "templateId": template["id"],
        "day": "2026-01-01",
        "exercises": [
            {"id": "bench-press", "sets": [{"weight": 60, "reps": 8}]},
            {
                "id": "plank",
                "sets": [
                    {"durationSeconds": 60},
                    {"durationSeconds": 45, "rpe": 8.5},
                    {"skipped": True},
                    {"durationSeconds": 30},
                ],
            },
        ],
    }
    result = client.post("/api/sessions", json=body, headers=headers)
    assert result.status_code == 201
    saved = result.json
    assert saved["exercises"][1]["estimated1rm"] is None
    assert saved["exercises"][0]["estimated1rm"] == 76
    assert client.post("/api/sessions", json=body, headers=headers).json == saved
    assert client.get("/api/state").json["sessions"][0] == saved
    stats = client.get("/api/exercises/plank/stats").json
    assert stats["points"] == []
    assert stats["best"] is None
    assert stats["last"]["sets"][1]["durationSeconds"] == 45

    changes = {"day": body["day"], "timezoneOffset": 0, "exercises": deepcopy(body["exercises"])}
    changes["exercises"][1]["sets"][1]["durationSeconds"] = 50
    client.post(f"/api/templates/{template['id']}/delete", json={}, headers=headers)
    edited = client.post(f"/api/sessions/{saved['id']}", json=changes, headers=headers)
    assert edited.status_code == 200
    assert edited.json["exercises"][1]["sets"][1]["durationSeconds"] == 50
    assert edited.json["exercises"][1]["targets"][1]["durationSeconds"] == 60
    assert edited.json["exercises"][1]["plannedSets"] == 3

    stranger = app.test_client()
    token = stranger.get("/api/session").json["csrf"]
    registered = stranger.post(
        "/api/register",
        json={"username": "outsider", "password": "temporary-test-password"},
        headers={"X-CSRF-Token": token},
    )
    assert stranger.get("/api/state").json["sessions"] == []
    assert stranger.get("/api/exercises/plank/stats").json["last"] is None
    assert (
        stranger.post(
            f"/api/sessions/{saved['id']}",
            json=changes,
            headers={"X-CSRF-Token": registered.json["csrf"]},
        ).status_code
        == 404
    )


@pytest.mark.parametrize("seconds", [None, "", 0, -1, 1.5, 86401, True, "abc"])
def test_invalid_duration_targets_and_actuals_are_rejected(journal, seconds):
    """Reject missing or invalid seconds without saving a template or result."""
    _, client, headers, _, _ = journal
    response = client.post(
        "/api/templates",
        json={
            "name": "Hold",
            "exercises": [{"id": "plank", "targets": [{"durationSeconds": seconds}]}],
        },
        headers=headers,
    )
    assert response.status_code == 400
    assert "seconds" in response.json["error"].lower()
    template = plank_template(client, headers)
    response = client.post(
        "/api/sessions",
        json={
            "clientId": str(uuid4()),
            "templateId": template["id"],
            "day": "2026-01-01",
            "exercises": [
                {"id": "bench-press", "sets": [{"weight": 60, "reps": 8}]},
                {"id": "plank", "sets": [{"durationSeconds": seconds}] * 3},
            ],
        },
        headers=headers,
    )
    assert response.status_code == 400
    assert client.get("/api/state").json["sessions"] == []
