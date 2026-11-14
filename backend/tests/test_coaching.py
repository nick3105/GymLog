"""Coaching consent, delegated plans and relationship migration preserve journal ownership."""

import sqlite3
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest

from gymlog import create_app, storage
from gymlog.models import validate_coaching_transition


@pytest.fixture
def accounts(tmp_path, monkeypatch):
    """Create separate browser sessions on a disposable private database."""
    monkeypatch.setenv("GYMLOG_INSTANCE", str(tmp_path / "empty-instance"))
    path = str(tmp_path / "journal.sqlite3")
    app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-key",
            "DATABASE": path,
            "SESSION_COOKIE_SECURE": False,
        }
    )
    result = {}
    for username in ("alice", "bob", "eve"):
        client = app.test_client()
        token = client.get("/api/session").json["csrf"]
        signed = client.post(
            "/api/register",
            json={"username": username, "password": "test-only-password"},
            headers={"X-CSRF-Token": token},
        )
        result[username] = (client, {"X-CSRF-Token": signed.json["csrf"]})
    return app, path, result


def request_and_accept(accounts):
    """Create an accepted Alice-to-Bob coaching relationship."""
    _, _, users = accounts
    alice, alice_headers = users["alice"]
    bob, bob_headers = users["bob"]
    result = alice.post(
        "/api/coaching/request", json={"username": " BOB ", "consent": True}, headers=alice_headers
    )
    assert result.status_code == 201
    relationship = result.json
    assert (
        bob.post(
            f"/api/coaching/{relationship['id']}/accept", json={}, headers=bob_headers
        ).status_code
        == 200
    )
    return relationship


def plan():
    """Return a simple plan valid through the ordinary template validator."""
    return {
        "name": "Alice upper",
        "exercises": [{"id": "bench-press", "targets": [{"reps": 8, "weight": 40}] * 3}],
    }


def test_consent_acceptance_ownership_and_revocation(accounts):
    """Pending users cannot read training, and accepted users cannot read weights or security."""
    app, _, users = accounts
    alice, alice_headers = users["alice"]
    bob, bob_headers = users["bob"]
    eve, eve_headers = users["eve"]
    assert (
        alice.post(
            "/api/coaching/request", json={"username": "bob"}, headers=alice_headers
        ).status_code
        == 400
    )
    assert (
        alice.post(
            "/api/coaching/request",
            json={"username": "alice", "consent": True},
            headers=alice_headers,
        ).status_code
        == 400
    )
    requested = alice.post(
        "/api/coaching/request", json={"username": "bob", "consent": True}, headers=alice_headers
    ).json
    owner = requested["coachee_id"]
    url = f"/api/coachees/{owner}"
    assert bob.get(url).status_code == 404
    assert (
        alice.post(
            f"/api/coaching/{requested['id']}/accept", json={}, headers=alice_headers
        ).status_code
        == 400
    )
    assert (
        eve.post(
            f"/api/coaching/{requested['id']}/accept", json={}, headers=eve_headers
        ).status_code
        == 404
    )
    assert (
        bob.post(
            f"/api/coaching/{requested['id']}/accept", json={}, headers=bob_headers
        ).status_code
        == 200
    )
    assert (
        bob.post(
            f"/api/coaching/{requested['id']}/accept", json={}, headers=bob_headers
        ).status_code
        == 200
    )
    alice.post("/api/weights", json={"day": "2026-01-01", "kg": 75}, headers=alice_headers)
    own = alice.post("/api/templates", json=plan(), headers=alice_headers).json
    coached = bob.post(url + "/templates", json=plan(), headers=bob_headers)
    assert coached.status_code == 201
    coached = coached.json
    assert coached["createdBy"]["username"] == "bob"
    shared = bob.get(url).json
    assert set(shared) == {"owner", "exercises", "templates", "sessions"}
    assert len(shared["templates"]) == 2
    assert bob.get("/api/state").json["templates"] == []
    assert eve.get(url).status_code == 404
    assert app.test_client().get(url).status_code == 401
    assert (
        bob.post(url + f"/templates/{own['id']}", json=plan(), headers=bob_headers).status_code
        == 404
    )
    assert eve.post(url + "/templates", json=plan(), headers=eve_headers).status_code == 404
    edited = bob.post(
        url + f"/templates/{coached['id']}", json={**plan(), "name": "Edited"}, headers=bob_headers
    )
    assert edited.status_code == 200
    body = {
        "clientId": str(uuid4()),
        "templateId": coached["id"],
        "day": "2026-01-01",
        "exercises": [{"id": "bench-press", "sets": [{"weight": 40, "reps": 8}] * 3}],
    }
    saved = alice.post("/api/sessions", json=body, headers=alice_headers)
    assert saved.status_code == 201
    assert bob.get(url).json["sessions"][0]["id"] == saved.json["id"]
    assert bob.get(url + "/exercises/bench-press/stats").json["last"]["sets"][0]["weight"] == 40
    assert eve.get(url + "/exercises/bench-press/stats").status_code == 404
    assert (
        bob.post(f"/api/sessions/{saved.json['id']}", json={}, headers=bob_headers).status_code
        == 404
    )
    assert (
        alice.post(
            f"/api/coaching/{requested['id']}/revoke", json={}, headers=alice_headers
        ).status_code
        == 200
    )
    assert bob.get(url).status_code == 404
    assert (
        bob.post(url + f"/templates/{coached['id']}", json=plan(), headers=bob_headers).status_code
        == 404
    )
    assert (
        bob.post(
            f"/api/coaching/{requested['id']}/accept", json={}, headers=bob_headers
        ).status_code
        == 400
    )
    assert len(alice.get("/api/state").json["templates"]) == 2
    assert alice.get("/api/state").json["sessions"][0]["id"] == saved.json["id"]


def test_pending_transitions_and_only_one_current_coach(accounts):
    """Cancel and decline stay terminal, while retrying a request keeps its ID."""
    _, _, users = accounts
    alice, headers = users["alice"]
    bob, bob_headers = users["bob"]
    first = alice.post(
        "/api/coaching/request", json={"username": "bob", "consent": True}, headers=headers
    ).json
    duplicate = alice.post(
        "/api/coaching/request", json={"username": "bob", "consent": True}, headers=headers
    ).json
    assert duplicate["id"] == first["id"]
    assert (
        alice.post(
            "/api/coaching/request", json={"username": "eve", "consent": True}, headers=headers
        ).status_code
        == 400
    )
    assert (
        alice.post(f"/api/coaching/{first['id']}/cancel", json={}, headers=headers).status_code
        == 200
    )
    assert (
        bob.post(f"/api/coaching/{first['id']}/accept", json={}, headers=bob_headers).status_code
        == 400
    )
    second = alice.post(
        "/api/coaching/request", json={"username": "bob", "consent": True}, headers=headers
    ).json
    assert second["id"] != first["id"]
    assert (
        bob.post(f"/api/coaching/{second['id']}/decline", json={}, headers=bob_headers).status_code
        == 200
    )
    assert (
        bob.post(f"/api/coaching/{second['id']}/accept", json={}, headers=bob_headers).status_code
        == 400
    )
    assert alice.get("/api/coaching").json["relationships"] == []


def test_write_after_revocation_is_rejected_under_storage_lock(accounts):
    """A stale delegated save cannot bypass the relationship check in the write transaction."""
    _, path, users = accounts
    relationship = request_and_accept(accounts)
    alice, headers = users["alice"]
    alice.post(f"/api/coaching/{relationship['id']}/revoke", json={}, headers=headers)
    assert (
        storage.save_coached_template(
            path, relationship["coach_id"], relationship["coachee_id"], plan()
        )
        is None
    )
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(
            pool.map(
                lambda _: storage.change_coaching(
                    path,
                    relationship["id"],
                    relationship["coachee_id"],
                    "revoke",
                    validate_coaching_transition,
                ),
                range(2),
            )
        )
    assert all(row["state"] == "revoked" for row in results)


def test_upgrade_populated_version_one_and_repeat_initialize(tmp_path):
    """Upgrade the previous schema without losing accounts, workout JSON or body weights."""
    path = str(tmp_path / "previous.sqlite3")
    with sqlite3.connect(path) as db:
        for statement in storage.SCHEMA:
            db.execute(statement)
        db.execute("INSERT INTO users VALUES (1,'alice','hash','2026-01-01')")
        db.execute("INSERT INTO templates VALUES ('plan',1,'{\"id\":\"plan\"}','2026-01-01')")
        db.execute("INSERT INTO body_weights VALUES (1,'2026-01-01',75)")
        db.execute("PRAGMA user_version=1")
    storage.initialize(path)
    storage.initialize(path)
    with sqlite3.connect(path) as db:
        assert db.execute("PRAGMA user_version").fetchone()[0] == 2
        assert db.execute("SELECT username FROM users").fetchone()[0] == "alice"
        assert db.execute("SELECT document FROM templates").fetchone()[0] == '{"id":"plan"}'
        assert db.execute("SELECT kg FROM body_weights").fetchone()[0] == 75
        assert db.execute("SELECT count(*) FROM coaching_relationships").fetchone()[0] == 0
