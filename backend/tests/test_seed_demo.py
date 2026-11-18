"""seed_demo.py fills a local journal with demo training through the API (spec 23)."""

import threading
from datetime import date, timedelta

import pytest
from werkzeug.serving import make_server

from gymlog import create_app
from seed_demo import seed


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


def demo_journal(app):
    """Sign in as demo with a separate client and return their whole journal."""
    client = app.test_client()
    token = client.get("/api/session").json["csrf"]
    response = client.post(
        "/api/login",
        json={"username": "demo", "password": "demo-password-123"},
        headers={"X-CSRF-Token": token},
    )
    assert response.status_code == 200, response.json
    return client.get("/api/state").json


def test_fills_every_feature(app, address):
    seed(address)
    journal = demo_journal(app)
    yesterday = (date.today() - timedelta(days=1)).isoformat()

    assert len(journal["templates"]) == 3
    assert len(journal["sessions"]) == 21
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


def test_second_run_changes_nothing(app, address):
    seed(address)
    with pytest.raises(ValueError, match="The demo user already exists."):
        seed(address)
    assert len(demo_journal(app)["sessions"]) == 21


def test_refuses_anything_but_a_local_address():
    with pytest.raises(ValueError, match="Demo data is only for a local GymLog."):
        seed("http://example.com")
