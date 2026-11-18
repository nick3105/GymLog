"""Exercise cards reuse guide photos without exposing another user's catalogue."""

from uuid import uuid4

import pytest

from gymlog import create_app


@pytest.fixture
def client(tmp_path, monkeypatch):
    """Create an authenticated disposable journal for the card metadata tests."""
    monkeypatch.setenv("GYMLOG_INSTANCE", str(tmp_path))
    app = create_app(
        {"TESTING": True, "SECRET_KEY": "visual-test", "DATABASE": str(tmp_path / "test.db")}
    )
    client = app.test_client()
    token = client.get("/api/session").json["csrf"]
    client.post(
        "/api/register",
        json={"username": "alice", "password": "test-only-password"},
        headers={"X-CSRF-Token": token},
    )
    return client


def test_library_thumbnails_only_use_available_guides(client):
    """Known movements use their own photo and unavailable guides have none."""
    exercises = {item["id"]: item for item in client.get("/api/state").json["exercises"]}
    assert exercises["bench-press"]["thumbnail"] == "/exercise-images/bench-press/0.jpg"
    assert exercises["spoto-bench-press"].get("thumbnail") is None
    assert client.application.test_client().get("/api/state").status_code == 401


def test_private_exercise_does_not_inherit_photo_or_leak_to_another_user(client):
    """A personal movement with a familiar name remains private and has no guessed photo."""
    token = client.get("/api/session").json["csrf"]
    exercise = client.post(
        "/api/exercises/personal",
        json={"requestId": str(uuid4()), "name": "Bench press", "group": "Chest"},
        headers={"X-CSRF-Token": token},
    ).json
    owned = next(
        item for item in client.get("/api/state").json["exercises"] if item["id"] == exercise["id"]
    )
    assert owned.get("thumbnail") is None
    stranger = client.application.test_client()
    token = stranger.get("/api/session").json["csrf"]
    stranger.post(
        "/api/register",
        json={"username": "bob", "password": "test-only-password"},
        headers={"X-CSRF-Token": token},
    )
    assert exercise["id"] not in {
        item["id"] for item in stranger.get("/api/state").json["exercises"]
    }
