"""Upgrading a pre-accounts database keeps every activated profile's password and data."""

import json
import sqlite3

import pytest
from werkzeug.security import generate_password_hash

from gymlog import create_app

LEGACY_TABLES = """
    CREATE TABLE templates (id TEXT PRIMARY KEY, document TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE sessions (id TEXT PRIMARY KEY, client_id TEXT UNIQUE NOT NULL,
        document TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE body_weights (day TEXT PRIMARY KEY, kg REAL NOT NULL);
    CREATE TABLE login_attempts (address TEXT PRIMARY KEY, count INTEGER NOT NULL, since REAL NOT NULL);
"""


def legacy_journal(path, name, kg):
    """Write one profile's journal the way cloud/storage.py did."""
    with sqlite3.connect(path) as db:
        db.executescript(LEGACY_TABLES)
        template = {"id": f"t-{name}", "name": f"{name} A", "exercises": []}
        db.execute(
            "INSERT INTO templates VALUES (?, ?, ?)", (template["id"], json.dumps(template), "1")
        )
        session = {"id": f"s-{name}", "clientId": f"c-{name}", "name": f"{name} A"}
        db.execute(
            "INSERT INTO sessions VALUES (?, ?, ?, ?)",
            (session["id"], session["clientId"], json.dumps(session), "2"),
        )
        db.execute("INSERT INTO body_weights VALUES ('2026-11-01', ?)", (kg,))
    return template, session


@pytest.fixture
def legacy(tmp_path):
    main = tmp_path / "gymlog.sqlite3"
    nick = legacy_journal(main, "nick", 80)
    martin = legacy_journal(tmp_path / "gymlog-martin.sqlite3", "martin", 70)
    with sqlite3.connect(main) as db:
        db.execute(
            "CREATE TABLE accounts (profile TEXT PRIMARY KEY, password_hash TEXT, invite_hash TEXT, expires REAL)"
        )
        db.execute(
            "INSERT INTO accounts VALUES ('martin', ?, NULL, NULL)",
            (generate_password_hash("martin-old-password"),),
        )
        # Invited but never activated: no password, so no account.
        db.execute("INSERT INTO accounts VALUES ('gaia', NULL, 'hash', 1)")
    config = {
        "TESTING": True,
        "SECRET_KEY": "test-only-secret-key",
        "SESSION_COOKIE_SECURE": False,
        "DATABASE": str(main),
        "OWNER_PASSWORD_HASH": generate_password_hash("nick-old-password"),
    }
    return config, {"nick": nick, "martin": martin}


def sign_in(app, username, password):
    client = app.test_client()
    token = client.get("/api/session").json["csrf"]
    response = client.post(
        "/api/login",
        json={"username": username, "password": password},
        headers={"X-CSRF-Token": token},
    )
    return client, response.status_code


def test_upgrade_keeps_passwords_and_data(legacy):
    config, journals = legacy
    app = create_app(config)
    for username, password, kg in [
        ("nick", "nick-old-password", 80),
        ("martin", "martin-old-password", 70),
    ]:
        client, status = sign_in(app, username, password)
        assert status == 200
        template, session = journals[username]
        state = client.get("/api/state").json
        assert state["templates"] == [template]
        assert state["sessions"] == [session]
        assert state["weights"] == [{"day": "2026-11-01", "kg": kg}]
    assert sign_in(app, "gaia", "anything-at-all-123")[1] == 401


def test_upgrade_runs_once(legacy):
    config, _ = legacy
    create_app(config)
    client, _ = sign_in(create_app(config), "nick", "nick-old-password")
    assert len(client.get("/api/state").json["templates"]) == 1
    with sqlite3.connect(config["DATABASE"]) as db:
        assert db.execute("PRAGMA user_version").fetchone()[0] == 1
        assert db.execute("SELECT count(*) FROM users").fetchone()[0] == 2


def test_failed_upgrade_changes_nothing(legacy):
    config, _ = legacy
    with pytest.raises(RuntimeError, match="password_hash"):
        create_app({**config, "OWNER_PASSWORD_HASH": None})
    with sqlite3.connect(config["DATABASE"]) as db:
        tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        assert {"templates", "accounts"} <= tables
        assert "users" not in tables
        assert db.execute("PRAGMA user_version").fetchone()[0] == 0
    create_app(config)
