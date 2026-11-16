"""GET /api/body-load: completed sets, volume and seconds per muscle group (spec 22)."""

from uuid import uuid4

import pytest

from gymlog import create_app

GROUPS = [
    "Back",
    "Biceps",
    "Calves",
    "Chest",
    "Core",
    "Forearms",
    "Hamstrings & glutes",
    "Quads",
    "Shoulders",
    "Triceps",
]


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


def save_workout(client, day, exercises):
    """Save a template of these exercises and one completed session with these sets."""
    headers = {"X-CSRF-Token": client.token}
    planned = []
    for exercise_id, sets in exercises.items():
        # Timed exercises (Plank) are planned in seconds, the others in reps.
        target = {"durationSeconds": 60} if "durationSeconds" in sets[0] else {"reps": 5}
        planned.append({"id": exercise_id, "targets": [target] * len(sets)})
    template = client.post(
        "/api/templates", json={"name": "Workout", "exercises": planned}, headers=headers
    ).json
    session = {
        "clientId": str(uuid4()),
        "templateId": template["id"],
        "day": day,
        "exercises": [{"id": exercise_id, "sets": sets} for exercise_id, sets in exercises.items()],
    }
    response = client.post("/api/sessions", json=session, headers=headers)
    assert response.status_code == 201, response.json


def body_load(client, days="7", today="2026-11-16"):
    response = client.get(f"/api/body-load?days={days}&today={today}")
    assert response.status_code == 200, response.json
    return {group["group"]: group for group in response.json["groups"]}


def test_new_user_has_every_group_untrained(client):
    groups = body_load(client)
    assert sorted(groups) == GROUPS
    for group in groups.values():
        assert group["sets"] == 0
        assert group["level"] == 0
        assert group["exercises"] == []


def test_counts_sets_volume_and_seconds(client):
    bench = {"weight": 80, "reps": 5}
    save_workout(
        client,
        "2026-11-14",
        {
            "bench-press": [bench, bench, bench, {"skipped": True}],
            "plank": [{"durationSeconds": 60}, {"durationSeconds": 45}],
        },
    )
    groups = body_load(client)
    chest = groups["Chest"]
    assert (chest["sets"], chest["volumeKg"], chest["durationSeconds"], chest["level"]) == (
        3,
        1200.0,
        0,
        3,
    )
    assert chest["exercises"] == [
        {
            "id": "bench-press",
            "name": "Bench press",
            "sets": 3,
            "volumeKg": 1200.0,
            "durationSeconds": 0,
        }
    ]
    core = groups["Core"]
    assert (core["sets"], core["volumeKg"], core["durationSeconds"], core["level"]) == (
        2,
        0.0,
        105,
        2,
    )
    assert groups["Calves"]["level"] == 0


def test_bodyweight_sets_count_without_volume(client):
    save_workout(client, "2026-11-14", {"push-up": [{"weight": 0, "reps": 20}]})
    chest = body_load(client)["Chest"]
    assert chest["sets"] == 1
    assert chest["volumeKg"] == 0.0


def test_period_counts_only_its_days(client):
    save_workout(client, "2026-11-10", {"bench-press": [{"weight": 60, "reps": 5}]})
    save_workout(client, "2026-11-09", {"bench-press": [{"weight": 60, "reps": 5}]})
    assert body_load(client, days="7")["Chest"]["sets"] == 1
    assert body_load(client, days="28")["Chest"]["sets"] == 2
    assert body_load(client, days="all")["Chest"]["sets"] == 2


def test_most_sets_first_then_alphabetical(client):
    row = {"weight": 20, "reps": 10}
    save_workout(
        client,
        "2026-11-14",
        {"squat": [row, row], "barbell-curl": [row], "bench-press": [row]},
    )
    response = client.get("/api/body-load?days=7&today=2026-11-16")
    order = [group["group"] for group in response.json["groups"]]
    assert order[:3] == ["Quads", "Biceps", "Chest"]
    assert order[3:] == [name for name in GROUPS if name not in ("Quads", "Biceps", "Chest")]


def test_another_user_never_changes_the_numbers(app, client):
    stranger = app.test_client()
    stranger.token = register(stranger, "outsider")
    save_workout(stranger, "2026-11-14", {"bench-press": [{"weight": 100, "reps": 5}]})
    assert body_load(client)["Chest"]["sets"] == 0
    assert body_load(stranger)["Chest"]["sets"] == 1


@pytest.mark.parametrize(
    "query",
    [
        "days=5&today=2026-11-16",
        "days=7",
        "days=7&today=16.11.2026",
    ],
)
def test_bad_input_is_refused_with_a_sentence(client, query):
    response = client.get(f"/api/body-load?{query}")
    assert response.status_code == 400
    assert response.json["error"].endswith(".")


def test_signed_out_is_refused(app):
    response = app.test_client().get("/api/body-load?days=7&today=2026-11-16")
    assert response.status_code == 401
