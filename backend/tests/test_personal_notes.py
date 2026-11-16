"""Owner-private exercises and note snapshots remain isolated and retry safe."""

import sqlite3
from copy import deepcopy
from uuid import uuid4

import pytest

from gymlog import create_app, storage

pytest_plugins = ["test_skip_sets"]


def create_personal(client, headers, name="Balance hold", measurement="duration", request_id=None):
    """Create a private exercise through its normal authenticated API."""
    return client.post(
        "/api/exercises/personal",
        json={
            "requestId": request_id or str(uuid4()),
            "name": name,
            "group": "Core",
            "measurement": measurement,
        },
        headers=headers,
    )


def test_personal_catalogue_is_owner_scoped_idempotent_and_snapshotted(journal):
    """Keep custom exercises private and preserve source and timed measurement in history."""
    app, client, headers, _, _ = journal
    request_id = str(uuid4())
    response = create_personal(client, headers, request_id=request_id)
    assert response.status_code == 201
    exercise = response.json
    assert exercise["id"].startswith("custom-")
    assert exercise["source"] == "personal"
    assert exercise["volumeEligible"] is False
    assert create_personal(client, headers, request_id=request_id).json == exercise
    assert create_personal(client, headers, name="BALANCE HOLD").status_code == 400
    assert exercise in client.get("/api/state").json["exercises"]
    template = client.post(
        "/api/templates",
        json={
            "name": "Balance",
            "exercises": [{"id": exercise["id"], "targets": [{"durationSeconds": 30}]}],
        },
        headers=headers,
    )
    assert template.status_code == 201
    assert template.json["exercises"][0]["source"] == "personal"
    assert template.json["exercises"][0]["volumeEligible"] is False
    body = {
        "clientId": str(uuid4()),
        "templateId": template.json["id"],
        "day": "2026-01-01",
        "exercises": [{"id": exercise["id"], "sets": [{"durationSeconds": 25}]}],
    }
    saved = client.post("/api/sessions", json=body, headers=headers)
    assert saved.status_code == 201
    assert saved.json["exercises"][0]["sets"][0]["durationSeconds"] == 25
    assert saved.json["exercises"][0]["source"] == "personal"

    stranger = app.test_client()
    token = stranger.get("/api/session").json["csrf"]
    registered = stranger.post(
        "/api/register",
        json={"username": "stranger", "password": "test-private-password"},
        headers={"X-CSRF-Token": token},
    )
    other_headers = {"X-CSRF-Token": registered.json["csrf"]}
    assert exercise not in stranger.get("/api/state").json["exercises"]
    assert stranger.get(f"/api/exercises/{exercise['id']}/stats").status_code == 404
    assert (
        stranger.post(
            "/api/templates",
            json={"name": "Stolen", "exercises": template.json["exercises"]},
            headers=other_headers,
        ).status_code
        == 400
    )
    own = create_personal(stranger, other_headers, request_id=request_id)
    assert own.status_code == 201
    assert own.json["id"] != exercise["id"]


@pytest.mark.parametrize(
    "changes",
    [
        {"name": ""},
        {"name": "🦊" * 81},
        {"group": "Unknown"},
        {"measurement": "minutes"},
        {"user_id": 999},
        {"source": "builtin"},
        {"volumeEligible": True},
        {"requestId": "invalid"},
    ],
)
def test_invalid_personal_fields_are_rejected(journal, changes):
    """Reject forged ownership, coefficients and invalid catalogue fields."""
    _, client, headers, _, _ = journal
    body = {
        "requestId": str(uuid4()),
        "name": "Private",
        "group": "Core",
        "measurement": "repetitions",
    }
    assert (
        client.post(
            "/api/exercises/personal", json={**body, **changes}, headers=headers
        ).status_code
        == 400
    )
    assert not [
        exercise
        for exercise in client.get("/api/state").json["exercises"]
        if exercise.get("source") == "personal"
    ]


def test_notes_snapshot_copy_correction_conflict_and_unicode_limits(journal):
    """Copy plan notes while allowing isolated corrections with optimistic revision checks."""
    _, client, headers, _, _ = journal
    planned = {
        "name": "Upper notes",
        "note": "Keep easy\n<script>alert(1)</script>",
        "exercises": [
            {"id": "bench-press", "note": "Pause on chest", "targets": [{"reps": 8, "weight": 60}]}
        ],
    }
    template = client.post("/api/templates", json=planned, headers=headers).json
    body = {
        "clientId": str(uuid4()),
        "templateId": template["id"],
        "day": "2026-01-01",
        "exercises": [{"id": "bench-press", "sets": [{"weight": 60, "reps": 8}]}],
    }
    saved = client.post("/api/sessions", json=body, headers=headers).json
    assert saved["note"] == planned["note"]
    assert saved["exercises"][0]["note"] == "Pause on chest"
    corrected_body = {
        "day": saved["day"],
        "timezoneOffset": 0,
        "revision": 0,
        "note": "Updated",
        "exercises": deepcopy(saved["exercises"]),
    }
    corrected_body["exercises"][0]["note"] = "Paused all sets"
    url = f"/api/sessions/{saved['id']}"
    corrected = client.post(url, json=corrected_body, headers=headers)
    assert corrected.status_code == 200
    assert corrected.json["revision"] == 1
    assert corrected.json["completedAt"] == saved["completedAt"]
    assert corrected.json["exercises"][0]["sets"] == saved["exercises"][0]["sets"]
    assert client.post(url, json=corrected_body, headers=headers).json == corrected.json
    stale = {**corrected_body, "note": "Lost update"}
    assert client.post(url, json=stale, headers=headers).status_code == 409
    assert client.get("/api/state").json["sessions"][0]["note"] == "Updated"
    assert client.get("/api/state").json["templates"][0]["note"] == planned["note"]
    assert (
        client.post(
            url,
            json={key: value for key, value in stale.items() if key != "revision"},
            headers=headers,
        ).status_code
        == 409
    )
    for value in (None, {}, "🦊" * 1001):
        invalid = {**planned, "note": value}
        assert client.post("/api/templates", json=invalid, headers=headers).status_code == 400
    valid = {**planned, "note": "🦊" * 1000}
    assert client.post("/api/templates", json=valid, headers=headers).status_code == 201
    invalid = deepcopy(planned)
    invalid["exercises"][0]["note"] = "x" * 501
    assert client.post("/api/templates", json=invalid, headers=headers).status_code == 400


def test_personal_migration_preserves_populated_v1_and_v2(tmp_path, monkeypatch):
    """Upgrade populated account schemas without rewriting saved workout snapshots."""
    monkeypatch.setenv("GYMLOG_INSTANCE", str(tmp_path))
    path = str(tmp_path / "journal.sqlite3")
    app = create_app({"SECRET_KEY": "test-only", "DATABASE": path, "TESTING": True})
    owner = storage.create_user(path, "alice", "not-a-production-password")
    original = storage.add_template(path, owner, {"name": "Old", "exercises": []})
    for old_version in (1, 2):
        with sqlite3.connect(path) as db:
            db.execute("DROP TABLE personal_exercises")
            db.execute(f"PRAGMA user_version = {old_version}")
        storage.initialize(path)
        assert storage.get_template(path, owner, original["id"]) == original
        assert storage.personal_exercises(path, owner) == []
    assert app.test_client().get("/api/health").status_code == 200
