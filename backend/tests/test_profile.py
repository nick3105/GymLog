"""GET /api/profile and workout duration: level and statistics from the journal (spec 30)."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from gymlog import create_app
from gymlog.models import level_for, profile_stats

CATALOGUE = {
    "bench-press": {"id": "bench-press", "name": "Bench press", "group": "Chest"},
    "squat": {"id": "squat", "name": "Squat", "group": "Quads"},
    "push-up": {"id": "push-up", "name": "Push-up", "group": "Chest"},
    "plank": {"id": "plank", "name": "Plank", "group": "Core"},
}


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


def started(minutes_ago):
    """A start time like the phone sends: UTC with a Z."""
    moment = datetime.now(UTC) - timedelta(minutes=minutes_ago)
    return moment.isoformat().replace("+00:00", "Z")


def save_workout(client, day, exercises, started_at=None, client_id=None, template_id=None):
    """Save one completed session (and a new template, unless given); return the response."""
    headers = {"X-CSRF-Token": client.token}
    if template_id is None:
        planned = []
        for exercise_id, sets in exercises.items():
            target = {"durationSeconds": 60} if "durationSeconds" in sets[0] else {"reps": 5}
            planned.append({"id": exercise_id, "targets": [target] * len(sets)})
        template_id = client.post(
            "/api/templates", json={"name": "Workout", "exercises": planned}, headers=headers
        ).json["id"]
    session = {
        "clientId": client_id or str(uuid4()),
        "templateId": template_id,
        "day": day,
        "exercises": [{"id": exercise_id, "sets": sets} for exercise_id, sets in exercises.items()],
    }
    if started_at is not None:
        session["startedAt"] = started_at
    return client.post("/api/sessions", json=session, headers=headers)


def profile(client, today="2026-11-16"):
    response = client.get(f"/api/profile?today={today}")
    assert response.status_code == 200, response.json
    return response.json


def session(day, exercises, name="Workout", completed_at=None, started_at=None):
    """A saved session as storage returns it, for testing profile_stats directly."""
    document = {
        "id": str(uuid4()),
        "templateId": name,
        "name": name,
        "day": day,
        "completedAt": completed_at or f"{day}T18:00:00+00:00",
        "exercises": [
            {"id": exercise_id, "name": CATALOGUE[exercise_id]["name"], "sets": sets}
            for exercise_id, sets in exercises.items()
        ],
    }
    if started_at:
        document["startedAt"] = started_at
    return document


def test_new_user(client):
    result = profile(client)
    assert result["level"] == {"name": "Bronze", "next": "Silver", "toNextLevel": 10}
    assert result["overview"]["workouts"] == 0
    assert result["overview"]["liftedKg"] == 0
    assert result["consistency"]["currentStreakWeeks"] == 0
    assert result["duration"]["averageSeconds"] is None
    assert result["averages"] == {"setsPerWorkout": None, "weightPerSet": None, "rpe": None}
    assert set(result["records"].values()) == {None}
    assert set(result["favourites"].values()) == {None}
    assert result["bodyWeight"] == {"latest": None, "change": None, "since": None}


def test_levels():
    assert level_for(9) == {"name": "Bronze", "next": "Silver", "toNextLevel": 1}
    assert level_for(10) == {"name": "Silver", "next": "Gold", "toNextLevel": 40}
    assert level_for(50) == {"name": "Gold", "next": "Platinum", "toNextLevel": 100}
    assert level_for(150) == {"name": "Platinum", "next": None, "toNextLevel": None}


def test_totals(client):
    bench = {"weight": 100, "reps": 5}
    response = save_workout(
        client,
        "2026-11-14",
        {
            "bench-press": [bench, bench, {"skipped": True}],
            "plank": [{"durationSeconds": 60}],
            "push-up": [{"weight": 0, "reps": 20}],
        },
    )
    assert response.status_code == 201, response.json
    overview = profile(client)["overview"]
    assert overview == {
        "workouts": 1,
        "sets": 4,
        "reps": 30,
        "liftedKg": 1000.0,
        "heldSeconds": 60,
        "exercises": 3,
    }
    assert profile(client)["averages"]["weightPerSet"] == 100.0


def test_streaks_end_last_week_until_this_week_has_a_workout():
    row = {"weight": 60, "reps": 5, "rpe": None}
    days = ["2026-10-26", "2026-11-03", "2026-11-09"]
    result = profile_stats(
        [session(day, {"squat": [row]}) for day in days], [], CATALOGUE, "2026-11-16"
    )
    assert result["consistency"]["currentStreakWeeks"] == 3
    assert result["consistency"]["longestStreakWeeks"] == 3

    days += ["2026-10-19", "2026-10-05"]
    result = profile_stats(
        [session(day, {"squat": [row]}) for day in days], [], CATALOGUE, "2026-11-16"
    )
    assert result["consistency"]["currentStreakWeeks"] == 4
    assert result["consistency"]["longestStreakWeeks"] == 4
    assert result["consistency"]["thisWeek"] == 0
    assert result["consistency"]["thisMonth"] == 2
    # Weeks from 5 Oct to 16 Nov: 7, so 5 workouts / 7 weeks.
    assert result["consistency"]["perWeek"] == 0.7
    assert result["consistency"]["trainingDaysLast30"] == 4


def test_only_durations_from_one_minute_to_four_hours_count(client):
    for minutes in (45, 0.5, 300):
        response = save_workout(
            client, "2026-11-16", {"squat": [{"weight": 60, "reps": 5}]}, started(minutes)
        )
        assert response.status_code == 201, response.json
    duration = profile(client)["duration"]
    assert duration["count"] == 1
    assert 44 * 60 <= duration["averageSeconds"] <= 46 * 60
    assert duration["totalSeconds"] == duration["averageSeconds"] == duration["longestSeconds"]
    assert duration["recordedSince"] == "2026-11-16"


def test_start_time_survives_retry_and_correction(client):
    start = started(30)
    client_id = str(uuid4())
    saved = save_workout(
        client, "2026-11-16", {"squat": [{"weight": 60, "reps": 5}]}, start, client_id
    ).json
    assert saved["startedAt"] == start
    retried = save_workout(
        client,
        "2026-11-16",
        {"squat": [{"weight": 60, "reps": 5}]},
        start,
        client_id,
        saved["templateId"],
    )
    assert retried.status_code in (200, 201)
    correction = {
        "day": "2026-11-15",
        "timezoneOffset": 0,
        "exercises": [{"id": "squat", "sets": [{"weight": 62.5, "reps": 5}]}],
    }
    edited = client.post(
        f"/api/sessions/{saved['id']}", json=correction, headers={"X-CSRF-Token": client.token}
    )
    assert edited.status_code == 200, edited.json
    assert edited.json["startedAt"] == start


def test_invalid_start_time_is_refused(client):
    response = save_workout(
        client, "2026-11-16", {"squat": [{"weight": 60, "reps": 5}]}, "yesterday"
    )
    assert response.status_code == 400
    assert response.json["error"] == "The workout start time is not valid."


def test_records_and_favourites():
    sessions = [
        session(
            "2026-11-02",
            {
                "bench-press": [{"weight": 100, "reps": 3, "rpe": None}],
                "push-up": [{"weight": 0, "reps": 30, "rpe": None}],
            },
            name="Push",
        ),
        session(
            "2026-11-05",
            {
                "bench-press": [
                    {"weight": 100, "reps": 5, "rpe": 8},
                    {"weight": 90, "reps": 8, "rpe": 9},
                ]
            },
            name="Push",
        ),
        session("2026-11-07", {"squat": [{"weight": 140, "reps": 5, "rpe": None}]}, name="Legs"),
    ]
    result = profile_stats(sessions, [], CATALOGUE, "2026-11-16")
    records = result["records"]
    assert records["heaviestSet"] == {
        "weight": 140,
        "reps": 5,
        "exercise": "Squat",
        "day": "2026-11-07",
    }
    # Bench 100 × 5 @ 8: 7 effective reps → 123.3; squat 140 × 5 → 163.3.
    assert records["best1rm"] == {"estimate": 163.3, "exercise": "Squat", "day": "2026-11-07"}
    assert records["biggestWorkout"] == {"liftedKg": 1220.0, "name": "Push", "day": "2026-11-05"}
    assert records["mostReps"] == {"reps": 30, "exercise": "Push-up", "day": "2026-11-02"}
    assert result["favourites"] == {
        "exercise": {"name": "Bench press", "sets": 3},
        "workout": {"name": "Push", "count": 2},
        "group": {"name": "Chest", "sets": 4},
    }
    assert result["averages"]["rpe"] == 8.5


def test_heaviest_set_ties_prefer_more_reps_then_earlier_day():
    sessions = [
        session("2026-11-03", {"squat": [{"weight": 100, "reps": 5, "rpe": None}]}),
        session("2026-11-02", {"squat": [{"weight": 100, "reps": 5, "rpe": None}]}),
        session("2026-11-04", {"squat": [{"weight": 100, "reps": 3, "rpe": None}]}),
    ]
    heaviest = profile_stats(sessions, [], CATALOGUE, "2026-11-16")["records"]["heaviestSet"]
    assert heaviest["day"] == "2026-11-02"


def test_body_weight_change():
    weights = [{"day": "2026-10-17", "kg": 84.0}, {"day": "2026-11-15", "kg": 81.1}]
    result = profile_stats([], weights, CATALOGUE, "2026-11-16")
    assert result["bodyWeight"] == {
        "latest": {"day": "2026-11-15", "kg": 81.1},
        "change": -2.9,
        "since": "2026-10-17",
    }


def test_another_user_never_changes_the_numbers(app, client):
    stranger = app.test_client()
    stranger.token = register(stranger, "outsider")
    save_workout(stranger, "2026-11-14", {"squat": [{"weight": 100, "reps": 5}]}, started(40))
    stranger.post(
        "/api/weights",
        json={"day": "2026-11-14", "kg": 90},
        headers={"X-CSRF-Token": stranger.token},
    )
    result = profile(client)
    assert result["overview"]["workouts"] == 0
    assert result["duration"]["count"] == 0
    assert result["bodyWeight"]["latest"] is None


@pytest.mark.parametrize("query", ["", "?today=16.11.2026"])
def test_bad_today_is_refused(client, query):
    response = client.get(f"/api/profile{query}")
    assert response.status_code == 400
    assert response.json["error"].endswith(".")


def test_signed_out_is_refused(app):
    assert app.test_client().get("/api/profile?today=2026-11-16").status_code == 401
