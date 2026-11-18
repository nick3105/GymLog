"""Issue 004 and spec 35: personal muscle choices count privately and survive snapshots."""

from copy import deepcopy
from uuid import uuid4

import pytest

from gymlog import create_app


@pytest.fixture
def journal(tmp_path, monkeypatch):
    """Build a disposable owner journal without opening local instance settings."""
    monkeypatch.setenv("GYMLOG_INSTANCE", str(tmp_path))
    app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "personal-volume-test",
            "DATABASE": str(tmp_path / "test.db"),
        }
    )
    client = app.test_client()
    headers = register(client, "alice")
    return app, client, headers


def register(client, username):
    """Register a test account through the public API."""
    token = client.get("/api/session").json["csrf"]
    response = client.post(
        "/api/register",
        json={"username": username, "password": "temporary-test-password"},
        headers={"X-CSRF-Token": token},
    )
    return {"X-CSRF-Token": response.json["csrf"]}


def test_creation_options_match_weekly_muscles_and_require_sign_in(journal):
    """Offer every weekly muscle and None without exposing personal journal data."""
    app, client, _ = journal
    response = client.get("/api/exercises/personal/muscles")
    assert response.status_code == 200
    choices = response.json["muscles"]
    weekly = client.get("/api/volume?week=2026-11-16").json
    assert {row["id"] for row in choices} == {row["muscle"] for row in weekly["muscles"]} | {"none"}
    assert len(choices) == 18
    assert app.test_client().get("/api/exercises/personal/muscles").status_code == 401


def save_personal(client, headers, choice, measurement="repetitions"):
    """Create a personal exercise and save two completed sets and one skip."""
    body = {
        "requestId": str(uuid4()),
        "name": f"Personal {choice} {measurement}",
        "primaryMuscle": choice,
        "measurement": measurement,
    }
    created = client.post("/api/exercises/personal", json=body, headers=headers)
    assert created.status_code == 201, created.json
    assert client.post("/api/exercises/personal", json=body, headers=headers).json == created.json
    exercise = created.json
    target = {"durationSeconds": 30} if measurement == "duration" else {"reps": 8}
    template = client.post(
        "/api/templates",
        json={
            "name": "Personal workout",
            "exercises": [{"id": exercise["id"], "targets": [target] * 3}],
        },
        headers=headers,
    )
    assert template.status_code == 201, template.json
    rows = [{"durationSeconds": 30}, {"durationSeconds": 25}]
    if measurement != "duration":
        rows = [{"weight": 20, "reps": 8}, {"weight": 0, "reps": 8}]
    payload = {
        "clientId": str(uuid4()),
        "templateId": template.json["id"],
        "day": "2026-11-17",
        "exercises": [{"id": exercise["id"], "sets": rows + [{"skipped": True}]}],
    }
    saved = client.post("/api/sessions", json=payload, headers=headers)
    assert saved.status_code == 201, saved.json
    assert client.post("/api/sessions", json=payload, headers=headers).json == saved.json
    return exercise, saved.json


@pytest.mark.parametrize(
    "muscle",
    [
        "abdominals",
        "abductors",
        "adductors",
        "biceps",
        "calves",
        "chest",
        "forearms",
        "glutes",
        "hamstrings",
        "lats",
        "lower_back",
        "middle_back",
        "neck",
        "quadriceps",
        "shoulders",
        "traps",
        "triceps",
    ],
)
def test_each_primary_muscle_counts_once_without_indirect_credit(journal, muscle):
    """Count non-skipped personal sets, including zero load, even with draft counting off."""
    app, client, headers = journal
    exercise, saved = save_personal(client, headers, muscle)
    assert exercise["volumeMuscle"] == muscle
    assert exercise["volumeEligible"] is True
    assert saved["exercises"][0]["volumeMuscle"] == muscle
    response = client.get("/api/volume?week=2026-11-16")
    assert response.status_code == 200
    report = response.json
    assert report["countedSets"] == 2
    assert report["excluded"] == {}
    for row in report["muscles"]:
        assert row["total"] == (2 if row["muscle"] == muscle else 0)
        assert row["direct"] == row["total"]
        assert row["indirect"] == 0
        if row["muscle"] == muscle:
            assert row["exercises"][0]["coefficient"] == 1
    body = client.get("/api/body-load?days=7&today=2026-11-18")
    assert body.status_code == 200
    group = next(row for row in body.json["groups"] if row["group"] == exercise["group"])
    assert (group["sets"], group["volumeKg"]) == (2, 160)
    stranger = app.test_client()
    register(stranger, "bob")
    assert stranger.get("/api/volume?week=2026-11-16").json["countedSets"] == 0
    assert all(
        row["sets"] == 0
        for row in stranger.get("/api/body-load?days=all&today=2026-11-18").json["groups"]
    )
    assert stranger.get(f"/api/exercises/{exercise['id']}/stats").status_code == 404
    assert client.get("/api/volume?week=2026-11-23").json["countedSets"] == 0


def test_none_does_not_count_in_either_report(journal):
    """Keep None exercises in history without adding a muscle or any volume."""
    _, client, headers = journal
    exercise, _ = save_personal(client, headers, "none")
    assert exercise["volumeEligible"] is False
    report = client.get("/api/volume?week=2026-11-16").json
    assert report["countedSets"] == 0
    assert report["excluded"] == {"No muscle selected": 2}
    body = client.get("/api/body-load?days=all&today=2026-11-18")
    assert body.status_code == 200
    assert len(body.json["groups"]) == 10
    assert all(row["sets"] == 0 for row in body.json["groups"])


def test_timed_personal_stays_out_of_weekly_volume(journal):
    """Keep the existing timed exclusion while counting seconds in Body load."""
    _, client, headers = journal
    _, saved = save_personal(client, headers, "abdominals", "duration")
    assert saved["exercises"][0]["volumeEligible"] is False
    report = client.get("/api/volume?week=2026-11-16").json
    assert report["excluded"] == {"Timed holds": 2}
    assert report["countedSets"] == 0
    body = client.get("/api/body-load?days=7&today=2026-11-18")
    assert body.status_code == 200
    assert sum(row["durationSeconds"] for row in body.json["groups"]) == 55


def test_legacy_personal_body_load_recovers_without_rewriting_weekly_history(journal):
    """Fix the original crash for old personal exercises, preserving their exclusion."""
    _, client, headers = journal
    response = client.post(
        "/api/exercises/personal",
        json={
            "requestId": str(uuid4()),
            "name": "Legacy",
            "group": "Chest",
        },
        headers=headers,
    )
    exercise = response.json
    template = client.post(
        "/api/templates",
        json={"name": "Legacy", "exercises": [{"id": exercise["id"], "targets": [{"reps": 5}]}]},
        headers=headers,
    ).json
    client.post(
        "/api/sessions",
        json={
            "clientId": str(uuid4()),
            "templateId": template["id"],
            "day": "2026-11-17",
            "exercises": [{"id": exercise["id"], "sets": [{"weight": 20, "reps": 5}]}],
        },
        headers=headers,
    )
    body = client.get("/api/body-load?days=7&today=2026-11-18")
    assert body.status_code == 200
    assert next(row for row in body.json["groups"] if row["group"] == "Chest")["sets"] == 1
    assert client.get("/api/volume?week=2026-11-16").json["excluded"] == {"Personal exercise": 1}


def test_correction_keeps_server_snapshot_and_recomputes_totals(journal):
    """Ignore forged muscle changes in corrections and recompute from corrected sets."""
    _, client, headers = journal
    _, saved = save_personal(client, headers, "chest")
    exercises = deepcopy(saved["exercises"])
    exercises[0]["volumeMuscle"] = "biceps"
    exercises[0]["sets"][0]["weight"] = 30
    response = client.post(
        f"/api/sessions/{saved['id']}",
        json={
            "day": "2026-11-10",
            "timezoneOffset": 0,
            "revision": 0,
            "exercises": exercises,
        },
        headers=headers,
    )
    assert response.status_code == 200, response.json
    assert response.json["exercises"][0]["volumeMuscle"] == "chest"
    report = client.get("/api/volume?week=2026-11-16").json
    assert report["countedSets"] == 0
    assert client.get("/api/volume?week=2026-11-09").json["countedSets"] == 2
    body = client.get("/api/body-load?days=all&today=2026-11-18").json
    assert next(row for row in body["groups"] if row["group"] == "Chest")["volumeKg"] == 240


@pytest.mark.parametrize("choice", ["Back", "invented", None, 1, [], {}])
def test_bad_primary_muscle_is_refused(journal, choice):
    """Reject unknown muscle choices with a readable field error."""
    _, client, headers = journal
    response = client.post(
        "/api/exercises/personal",
        json={
            "requestId": str(uuid4()),
            "name": "Invalid",
            "primaryMuscle": choice,
        },
        headers=headers,
    )
    assert response.status_code == 400
    assert response.json["error"].endswith(".")
