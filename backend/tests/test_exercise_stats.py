"""GET /api/exercises/<id>/stats: last performance and the 1RM trend (spec 03)."""

from uuid import uuid4

import pytest

from gymlog import create_app
from gymlog.models import exercise_stats


def register(client, username):
    token = client.get("/api/session").json["csrf"]
    response = client.post(
        "/api/register",
        json={"username": username, "password": "test-only-password"},
        headers={"X-CSRF-Token": token},
    )
    return response.json["csrf"]


@pytest.fixture
def app(tmp_path):
    return create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-only-secret-key",
            "DATABASE": str(tmp_path / "test.sqlite3"),
        }
    )


@pytest.fixture
def client(app):
    client = app.test_client()
    client.token = register(client, "nick")
    return client


def save_workout(client, name, day, exercises):
    """Save a template with these exercises and one completed session of it."""
    headers = {"X-CSRF-Token": client.token}
    template = client.post(
        "/api/templates",
        json={
            "name": name,
            "exercises": [
                {"id": exercise_id, "sets": len(sets), "targetReps": 5}
                for exercise_id, sets in exercises.items()
            ],
        },
        headers=headers,
    ).json
    session = {
        "clientId": str(uuid4()),
        "templateId": template["id"],
        "day": day,
        "exercises": [
            {
                "id": exercise_id,
                "sets": [
                    {"weight": weight, "reps": reps, "rpe": rpe} for weight, reps, rpe in sets
                ],
            }
            for exercise_id, sets in exercises.items()
        ],
    }
    response = client.post("/api/sessions", json=session, headers=headers)
    assert response.status_code == 201, response.json


def stats(client, exercise_id="bench-press"):
    return client.get(f"/api/exercises/{exercise_id}/stats")


def test_no_history(client):
    assert stats(client).json == {"last": None, "points": [], "best": None, "latest": None}


def test_last_comes_from_any_template(client):
    save_workout(client, "Upper A", "2026-11-04", {"bench-press": [(60, 8, None)]})
    save_workout(client, "Push", "2026-11-06", {"squat": [(100, 5, None)]})
    last = stats(client).json["last"]
    assert last == {"day": "2026-11-04", "sets": [{"weight": 60, "reps": 8, "rpe": None}]}


def test_estimates(client):
    save_workout(client, "Upper A", "2026-11-04", {"bench-press": [(80, 5, None)]})
    save_workout(client, "Upper A", "2026-11-06", {"bench-press": [(80, 5, 8)]})
    result = stats(client).json
    assert result["points"] == [
        {"day": "2026-11-04", "estimate": 93.3},
        {"day": "2026-11-06", "estimate": 98.7},
    ]
    assert (result["best"], result["latest"]) == (98.7, 98.7)


def test_latest_is_by_day_not_by_save_order(client):
    save_workout(client, "Upper A", "2026-11-06", {"bench-press": [(80, 5, None)]})
    save_workout(client, "Upper A", "2026-11-04", {"bench-press": [(60, 5, None)]})
    result = stats(client).json
    assert result["last"]["day"] == "2026-11-06"
    assert [point["day"] for point in result["points"]] == ["2026-11-04", "2026-11-06"]
    assert result["latest"] == 93.3


def test_ineligible_sets_have_no_points_but_count_as_last(client):
    save_workout(client, "Upper A", "2026-11-04", {"bench-press": [(0, 8, None), (80, 12, None)]})
    result = stats(client).json
    assert result["points"] == []
    assert (result["best"], result["latest"]) == (None, None)
    assert len(result["last"]["sets"]) == 2


def test_other_users_sessions_never_count(app, client):
    save_workout(client, "Upper A", "2026-11-04", {"bench-press": [(80, 5, None)]})
    martin = app.test_client()
    martin.token = register(martin, "martin")
    save_workout(martin, "Push", "2026-11-08", {"bench-press": [(120, 3, None)]})
    assert stats(client).json["best"] == 93.3
    assert stats(martin).json["best"] == 132.0


def test_unknown_exercise_is_404(client):
    response = stats(client, "not-real")
    assert response.status_code == 404
    assert response.json["error"]


def test_signed_out_is_401(app):
    assert stats(app.test_client()).status_code == 401


def test_calculation_needs_no_request():
    sessions = [
        {
            "day": "2026-11-04",
            "completedAt": "2026-11-04T10:00:00Z",
            "exercises": [{"id": "squat", "sets": [{"weight": 100, "reps": 1, "rpe": None}]}],
        }
    ]
    assert exercise_stats(sessions, "squat")["best"] == 100
