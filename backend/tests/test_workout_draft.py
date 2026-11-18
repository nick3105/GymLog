"""An active workout draft belongs to one account until it is completed or discarded."""

from uuid import uuid4

import pytest

from gymlog import create_app, storage


@pytest.fixture
def journal(tmp_path):
    """Create two isolated accounts and a disposable journal database."""
    app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "draft-test-secret",
            "SESSION_COOKIE_SECURE": False,
            "DATABASE": str(tmp_path / "journal.sqlite3"),
        }
    )
    clients = {}
    headers = {}
    for username in ("alice", "bob"):
        client = app.test_client()
        token = client.get("/api/session").json["csrf"]
        account = client.post(
            "/api/register",
            json={"username": username, "password": "temporary-test-password"},
            headers={"X-CSRF-Token": token},
        )
        clients[username] = client
        headers[username] = {"X-CSRF-Token": account.json["csrf"]}
    return app, clients, headers


def workout_draft():
    """Return a realistic in-progress workout with partially entered set values."""
    return {
        "clientId": str(uuid4()),
        "templateId": "template-1",
        "name": "Upper A",
        "day": "2026-11-17",
        "exercises": [
            {
                "id": "bench-press",
                "name": "Bench Press",
                "targets": [{"reps": 8, "weight": 60}],
                "sets": [{"weight": "62.5", "reps": "", "rpe": ""}],
            }
        ],
    }


def test_draft_can_be_saved_restored_and_discarded_per_account(journal):
    """Saving a draft changes neither completed history nor another account's draft."""
    app, clients, headers = journal
    alice = clients["alice"]
    bob = clients["bob"]
    draft = workout_draft()

    assert alice.get("/api/workout-draft").json == {"draft": None}
    saved = alice.post("/api/workout-draft", json=draft, headers=headers["alice"])
    assert saved.status_code == 200
    assert saved.json == {"draft": draft}
    replacement = {**draft, "clientId": str(uuid4())}
    rejected = alice.post("/api/workout-draft", json=replacement, headers=headers["alice"])
    assert rejected.status_code == 409
    assert alice.get("/api/workout-draft").json == {"draft": draft}
    assert bob.get("/api/workout-draft").json == {"draft": None}
    assert alice.get("/api/state").json["sessions"] == []

    deleted = alice.post("/api/workout-draft/discard", json={}, headers=headers["alice"])
    assert deleted.status_code == 200
    assert alice.get("/api/workout-draft").json == {"draft": None}


def test_workout_draft_requires_authentication_and_csrf(journal):
    """Read and write draft requests must use the signed-in user's protected API."""
    _, clients, headers = journal
    anonymous = clients["alice"]
    anonymous.post("/api/logout", json={}, headers=headers["alice"])
    token = anonymous.get("/api/session").json["csrf"]

    assert anonymous.get("/api/workout-draft").status_code == 401
    assert anonymous.post("/api/workout-draft", json=workout_draft()).status_code == 403
    assert (
        anonymous.post(
            "/api/workout-draft/discard", json={}, headers={"X-CSRF-Token": token}
        ).status_code
        == 401
    )


def test_finishing_clears_draft_only_after_session_is_saved(journal):
    """A rejected finish keeps the draft, while a successful finish clears it."""
    app, clients, headers = journal
    client = clients["alice"]
    token = headers["alice"]
    template_response = client.post(
        "/api/templates",
        json={
            "name": "Upper A",
            "exercises": [{"id": "bench-press", "sets": 1, "targetReps": 8}],
        },
        headers=token,
    )
    assert template_response.status_code == 201
    template = template_response.json
    draft = workout_draft()
    draft["templateId"] = template["id"]
    client.post("/api/workout-draft", json=draft, headers=token)

    invalid = client.post("/api/sessions", json={"templateId": template["id"]}, headers=token)
    assert invalid.status_code == 400
    assert client.get("/api/workout-draft").json == {"draft": draft}

    completed = client.post(
        "/api/sessions",
        json={
            **draft,
            "exercises": [{"id": "bench-press", "sets": [{"weight": 60, "reps": 8}]}],
        },
        headers=token,
    )
    assert completed.status_code == 201
    assert client.get("/api/workout-draft").json == {"draft": None}
    assert client.get("/api/state").json["sessions"] == [completed.json]


def test_draft_migration_adds_table_without_removing_existing_data(journal):
    """The additive draft migration preserves existing account and session rows."""
    app, clients, headers = journal
    client = clients["alice"]
    response = client.post(
        "/api/templates",
        json={
            "name": "Upper A",
            "exercises": [{"id": "bench-press", "sets": 1, "targetReps": 8}],
        },
        headers=headers["alice"],
    )
    assert response.status_code == 201
    database = app.config["DATABASE"]
    with storage.connect(database) as db:
        db.execute("DROP TABLE workout_drafts")
        db.execute("PRAGMA user_version = 5")

    storage.initialize(database)

    with storage.connect(database) as db:
        assert db.execute("PRAGMA user_version").fetchone()[0] == storage.SCHEMA_VERSION
        assert db.execute("SELECT count(*) FROM users").fetchone()[0] == 2
        assert db.execute("SELECT count(*) FROM templates").fetchone()[0] == 1
        assert db.execute("SELECT count(*) FROM workout_drafts").fetchone()[0] == 0
