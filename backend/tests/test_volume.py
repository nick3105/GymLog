"""Weekly-volume accounting is private, explicit and safe for local draft coefficients."""

import json
from copy import deepcopy
from pathlib import Path

import pytest

from gymlog import create_app
from gymlog.models import weekly_volume

REGISTRY = json.loads(
    (Path(__file__).parents[2] / "docs/VOLUME_COEFFICIENTS_DRAFT.json").read_text(encoding="utf-8")
)


@pytest.fixture
def volume_client(tmp_path, monkeypatch):
    """Build an empty disposable journal with local preview counting enabled."""
    monkeypatch.setenv("GYMLOG_INSTANCE", str(tmp_path))
    app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-secret",
            "DATABASE": str(tmp_path / "test.sqlite3"),
            "VOLUME_DRAFT_PREVIEW": True,
        }
    )
    client = app.test_client()
    csrf = client.get("/api/session").json["csrf"]
    user = client.post(
        "/api/register",
        json={"username": "volume-user", "password": "temporary-test-password"},
        headers={"X-CSRF-Token": csrf},
    )
    return app, client, {"X-CSRF-Token": user.json["csrf"]}


def test_week_boundaries_exclusions_and_fractional_credit():
    """Use each performed set once and preserve explicit coverage exclusions."""
    session = {
        "day": "2026-11-09",
        "exercises": [
            {
                "id": "bench-press",
                "name": "Bench press",
                "sets": [{"weight": 60, "reps": 8}] * 3 + [{"skipped": True}],
            },
            {
                "id": "plank",
                "name": "Plank",
                "measurement": "duration",
                "sets": [{"durationSeconds": 60}],
            },
            {
                "id": "custom-123",
                "name": "Rehab exercise",
                "source": "personal",
                "sets": [{"weight": 0, "reps": 8}],
            },
        ],
    }
    outside = {**deepcopy(session), "day": "2026-11-08"}
    result = weekly_volume(
        [session, outside], "2026-11-11", REGISTRY, {"goals": {"chest": 10}}, True
    )
    groups = {row["muscle"]: row for row in result["muscles"]}
    assert result["weekStart"] == "2026-11-09"
    assert result["weekEnd"] == "2026-11-15"
    assert result["countedSets"] == 3
    assert groups["chest"]["total"] == 3
    assert groups["triceps"]["indirect"] == 1.5
    assert groups["chest"]["goal"] == 10
    assert result["excluded"] == {"Timed holds": 1, "Personal exercise": 1}
    disabled = weekly_volume([session], "2026-11-09", REGISTRY, {}, False)
    assert disabled["countedSets"] == 0
    assert disabled["excluded"]["Draft mapping disabled"] == 3


def test_goals_and_sessions_are_owner_scoped_and_revision_checked(volume_client):
    """Persist own goals and reject stale changes or cross-account visibility."""
    app, client, headers = volume_client
    payload = {
        "goals": {"chest": 12},
        "profile": {"ageBand": "40-64", "experience": "3+", "gender": "woman"},
        "revision": 0,
    }
    saved = client.post("/api/volume/preferences", json=payload, headers=headers)
    assert saved.status_code == 200
    assert client.post("/api/volume/preferences", json=payload, headers=headers).status_code == 409
    result = client.get("/api/volume?week=2026-11-09").json
    assert result["goals"] == {"chest": 12}
    assert result["profile"]["gender"] == "woman"
    stranger = app.test_client()
    csrf = stranger.get("/api/session").json["csrf"]
    stranger.post(
        "/api/register",
        json={"username": "stranger", "password": "temporary-test-password"},
        headers={"X-CSRF-Token": csrf},
    )
    assert stranger.get("/api/volume?week=2026-11-09").json["goals"] == {}
    assert app.test_client().get("/api/volume").status_code == 401


@pytest.mark.parametrize(
    "goals", [{"invented": 10}, {"chest": -1}, {"chest": True}, {"chest": 1001}]
)
def test_invalid_goal_does_not_persist(volume_client, goals):
    """Reject invalid muscle names and goal values in the API."""
    _, client, headers = volume_client
    response = client.post(
        "/api/volume/preferences", json={"goals": goals, "revision": 0}, headers=headers
    )
    assert response.status_code == 400
    assert client.get("/api/volume").json["goals"] == {}


def test_mapping_version_identifies_coefficients_not_only_anatomy_source():
    """Changing a coefficient changes the visible calculation version."""
    changed = deepcopy(REGISTRY)
    changed["exercises"][0]["coefficients"]["chest"] = 0.5
    original = weekly_volume([], "2026-11-09", REGISTRY, {}, True)
    updated = weekly_volume([], "2026-11-09", changed, {}, True)
    assert original["mappingVersion"] != updated["mappingVersion"]


def test_out_of_range_week_is_a_readable_error(volume_client):
    """Reject a final incomplete year-9999 calendar week instead of overflowing."""
    _, client, _ = volume_client
    response = client.get("/api/volume?week=9999-12-31")
    assert response.status_code == 400


def test_preview_supplies_starting_goals_for_every_group():
    """Fill missing goals while preserving user choices, including an explicit zero."""
    result = weekly_volume([], "2026-11-09", REGISTRY, {"goals": {"chest": 12, "triceps": 0}}, True)
    assert len(result["muscles"]) == len(REGISTRY["taxonomy"])
    for muscle in result["muscles"]:
        expected = {"chest": 12, "triceps": 0}.get(muscle["muscle"], 10)
        assert muscle["goal"] == expected
        assert muscle["goalSource"] == (
            "saved" if muscle["muscle"] in ("chest", "triceps") else "starter"
        )
    adult = weekly_volume([], "2026-11-09", REGISTRY, {}, False)
    younger = weekly_volume([], "2026-11-09", REGISTRY, {"profile": {"ageBand": "under18"}}, True)
    assert all(muscle["goal"] == 10 for muscle in adult["muscles"])
    assert all(muscle["goal"] == 10 for muscle in younger["muscles"])


def test_goal_only_save_preserves_legacy_profile_without_using_it(volume_client):
    """Removing profile inputs must not erase old fields or change the default goal."""
    _, client, headers = volume_client
    response = client.post(
        "/api/volume/preferences",
        json={"goals": {"chest": 12}, "profile": {"ageBand": "under18"}, "revision": 0},
        headers=headers,
    )
    response = client.post(
        "/api/volume/preferences",
        json={"goals": {"chest": 14}, "revision": response.json["revision"]},
        headers=headers,
    )
    assert response.status_code == 200
    result = client.get("/api/volume?week=2026-11-09").json
    assert result["profile"]["ageBand"] == "under18"
    assert result["startingGoal"] == 10
    assert result["goals"]["chest"] == 14
