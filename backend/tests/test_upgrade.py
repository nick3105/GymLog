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
        assert db.execute("PRAGMA user_version").fetchone()[0] == 3
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


def test_v1_database_adds_goal_storage_without_losing_journal_data(tmp_path):
    database = tmp_path / "gymlog.sqlite3"
    with sqlite3.connect(database) as db:
        db.executescript(
            """
            CREATE TABLE users (
                id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
            CREATE TABLE templates (
                id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
                document TEXT NOT NULL, created_at TEXT NOT NULL);
            CREATE TABLE sessions (
                id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
                client_id TEXT NOT NULL, document TEXT NOT NULL, created_at TEXT NOT NULL,
                UNIQUE (user_id, client_id));
            CREATE TABLE body_weights (
                user_id INTEGER NOT NULL REFERENCES users(id), day TEXT NOT NULL, kg REAL NOT NULL,
                PRIMARY KEY (user_id, day));
            CREATE TABLE login_attempts (
                address TEXT PRIMARY KEY, count INTEGER NOT NULL, since REAL NOT NULL);
            PRAGMA user_version = 1;
            """
        )
        db.execute(
            "INSERT INTO users VALUES (1, 'nick', ?, '2026-11-01')",
            (generate_password_hash("nick-old-password"),),
        )
        db.execute("INSERT INTO body_weights VALUES (1, '2026-11-01', 80.2)")

    config = {
        "TESTING": True,
        "SECRET_KEY": "test-only-secret-key",
        "SESSION_COOKIE_SECURE": False,
        "DATABASE": str(database),
    }
    app = create_app(config)
    client, status = sign_in(app, "nick", "nick-old-password")
    assert status == 200
    state = client.get("/api/state").json
    assert state["weights"] == [{"day": "2026-11-01", "kg": 80.2}]
    assert state["weightGoal"] is None
    with sqlite3.connect(database) as db:
        assert db.execute("PRAGMA user_version").fetchone()[0] == 3


def test_v2_weight_goal_migrates_as_weight_loss(tmp_path):
    database = tmp_path / "gymlog.sqlite3"
    with sqlite3.connect(database) as db:
        db.executescript(
            """
            CREATE TABLE users (
                id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
            CREATE TABLE templates (
                id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
                document TEXT NOT NULL, created_at TEXT NOT NULL);
            CREATE TABLE sessions (
                id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
                client_id TEXT NOT NULL, document TEXT NOT NULL, created_at TEXT NOT NULL,
                UNIQUE (user_id, client_id));
            CREATE TABLE body_weights (
                user_id INTEGER NOT NULL REFERENCES users(id), day TEXT NOT NULL, kg REAL NOT NULL,
                PRIMARY KEY (user_id, day));
            CREATE TABLE body_weight_goals (
                user_id INTEGER PRIMARY KEY REFERENCES users(id), kg REAL NOT NULL);
            CREATE TABLE login_attempts (
                address TEXT PRIMARY KEY, count INTEGER NOT NULL, since REAL NOT NULL);
            PRAGMA user_version = 2;
            """
        )
        db.execute(
            "INSERT INTO users VALUES (1, 'nick', ?, '2026-11-01')",
            (generate_password_hash("nick-old-password"),),
        )
        db.execute("INSERT INTO body_weights VALUES (1, '2026-11-01', 80.2)")
        db.execute("INSERT INTO body_weight_goals VALUES (1, 75)")

    app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-only-secret-key",
            "SESSION_COOKIE_SECURE": False,
            "DATABASE": str(database),
        }
    )
    client, status = sign_in(app, "nick", "nick-old-password")
    assert status == 200
    assert client.get("/api/state").json["weightGoal"] == {"kg": 75, "mode": "lose"}
    with sqlite3.connect(database) as db:
        assert db.execute("PRAGMA user_version").fetchone()[0] == 3
