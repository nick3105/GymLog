"""seed_demo.py fills a local journal with demo training through the API (spec 23)."""

import sys
import threading
from datetime import date, timedelta

import pytest
from werkzeug.serving import make_server

from gymlog import create_app
from seed_demo import main, seed


@pytest.fixture
def app(tmp_path):
    return create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-only-secret-key",
            "DATABASE": str(tmp_path / "test.sqlite3"),
            # The test server is plain HTTP, like `flask run --debug`.
            "SESSION_COOKIE_SECURE": False,
        }
    )


@pytest.fixture
def address(app):
    """Serve the app on a free local port, as `flask run` would."""
    server = make_server("127.0.0.1", 0, app)
    thread = threading.Thread(target=server.serve_forever)
    thread.start()
    yield f"http://127.0.0.1:{server.server_port}"
    server.shutdown()
    thread.join()


def login_demo(app, username="demo"):
    """Sign in to a seeded account with a separate client."""
    client = app.test_client()
    token = client.get("/api/session").json["csrf"]
    response = client.post(
        "/api/login",
        json={"username": username, "password": "demo-password-123"},
        headers={"X-CSRF-Token": token},
    )
    assert response.status_code == 200, response.json
    return client


def demo_journal(app):
    """Return the default demo account’s whole journal."""
    return login_demo(app).get("/api/state").json


def test_fills_every_feature(app, address):
    seed(address)
    journal = demo_journal(app)
    yesterday = (date.today() - timedelta(days=1)).isoformat()

    assert len(journal["templates"]) == 3
    assert len(journal["sessions"]) == 84
    assert max(session["day"] for session in journal["sessions"]) == yesterday
    assert len(journal["weights"]) == 30
    assert date.today().isoformat() not in [weight["day"] for weight in journal["weights"]]
    assert journal["weightGoal"] == {"kg": 78, "mode": "lose"}

    group_by_id = {exercise["id"]: exercise["group"] for exercise in journal["exercises"]}
    trained = set()
    for session in journal["sessions"]:
        for exercise in session["exercises"]:
            trained.add(group_by_id[exercise["id"]])
    assert trained == set(group_by_id.values())

    chronological = sorted(journal["sessions"], key=lambda session: session["day"])
    assert [date.fromisoformat(session["day"]) for session in chronological] == [
        date.today() - timedelta(weeks=week, days=day)
        for week in range(27, -1, -1)
        for day in (5, 3, 1)
    ]
    assert [session["name"] for session in chronological] == ["Push", "Pull", "Legs"] * 28

    progress = {}
    for session in chronological:
        for exercise in session["exercises"]:
            first_set = exercise["sets"][0]
            if "durationSeconds" in first_set:
                value = first_set["durationSeconds"]
            else:
                value = first_set["weight"] or first_set["reps"]
            progress.setdefault(exercise["name"], []).append(value)

    assert len(progress) == 14
    for values in progress.values():
        assert len(values) == 28
        assert values[0] < values[-1]
        assert values == sorted(values)

    names = {exercise["id"]: exercise["name"] for exercise in journal["exercises"]}
    for exercise_id, starting_value, final_value in (
        ("bench-press", 45, 85),
        ("squat", 60, 100),
        ("romanian-deadlift", 65, 115),
        ("barbell-curl", 15, 23),
    ):
        values = progress[names[exercise_id]]
        assert (values[0], values[-1]) == (starting_value, final_value)
        assert values[4] - values[0] > values[-1] - values[-5]
    assert progress[names["push-up"]][-1] == 26
    assert progress[names["plank"]][-1] == 95
    assert progress["Band chest fly"][-1] == 20
    assert progress["Single-leg balance"][-1] == 55


def test_second_run_changes_nothing(app, address):
    seed(address)
    with pytest.raises(ValueError, match="The demo user already exists."):
        seed(address)
    assert len(demo_journal(app)["sessions"]) == 84


def test_refuses_anything_but_a_local_address():
    with pytest.raises(ValueError, match="Demo data is only for a local TimeToLift journal"):
        seed("http://example.com")


def test_named_cli_account_has_examples_and_optional_draft(app, address, monkeypatch, capsys):
    """Create a second account through the CLI and keep the default demo isolated."""
    seed(address)
    default_client = login_demo(app)
    previous = default_client.get("/api/state").json
    monkeypatch.setattr(
        sys, "argv", ["seed_demo.py", address, "--username", "demo-2", "--with-draft"]
    )

    main()
    assert "Sign in as demo-2" in capsys.readouterr().out
    client = login_demo(app, "demo-2")
    journal = client.get("/api/state").json
    push = next(template for template in journal["templates"] if template["name"] == "Push")
    latest_push = max(
        (session for session in journal["sessions"] if session["name"] == "Push"),
        key=lambda session: session["day"],
    )
    assert push["exercises"][0]["targets"][0]["rpe"] == 8
    assert latest_push["note"] == push["note"] and push["note"]
    assert latest_push["exercises"][0]["note"] == push["exercises"][0]["note"]
    assert latest_push["warmupDone"] and not latest_push["cooldownDone"]
    superset = [exercise for exercise in latest_push["exercises"] if exercise.get("supersetId")]
    assert [exercise["id"] for exercise in superset] == ["triceps-pushdown", "push-up"]
    assert superset[0]["supersetId"] == superset[1]["supersetId"]
    assert len(latest_push["exercises"][0]["sets"]) == 5
    assert set(journal["favoriteExerciseIds"]) == {"bench-press", "squat", "plank"}
    assert client.get("/api/volume").json["goals"] == {"chest": 12, "quadriceps": 10}
    personal_ids = {
        exercise["id"] for exercise in journal["exercises"] if exercise.get("source") == "personal"
    }
    assert len(personal_ids) == 2
    assert personal_ids.isdisjoint(exercise["id"] for exercise in previous["exercises"])

    draft = client.get("/api/workout-draft").json["draft"]
    assert draft["templateId"] == push["id"]
    assert draft["day"] == date.today().isoformat()
    sets = draft["exercises"][0]["sets"]
    assert sets[0] == {"weight": "45", "reps": "5", "rpe": "8"}
    assert sets[1] == {"weight": "", "reps": "", "rpe": ""}
    assert len(journal["sessions"]) == 84

    with pytest.raises(ValueError, match="demo-2 already exists"):
        seed(address, username="demo-2")
    assert client.get("/api/state").json == journal
    assert default_client.get("/api/state").json == previous
    assert default_client.get("/api/workout-draft").json["draft"] is None
