"""Favourite exercises belong only to the signed-in journal owner."""

import sqlite3

from gymlog import create_app, storage


def signed_client(app, username):
    """Register one user and return its browser session and CSRF header."""
    client = app.test_client()
    csrf = client.get("/api/session").json["csrf"]
    response = client.post(
        "/api/register",
        json={"username": username, "password": "temporary-test-password"},
        headers={"X-CSRF-Token": csrf},
    )
    assert response.status_code == 201
    return client, {"X-CSRF-Token": response.json["csrf"]}


def test_favourites_are_toggled_and_never_shared_between_users(tmp_path):
    """A star affects only its owner's saved favourite IDs."""
    app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "favourite-exercise-test",
            "SESSION_COOKIE_SECURE": False,
            "DATABASE": str(tmp_path / "journal.sqlite3"),
        }
    )
    gaia, gaia_headers = signed_client(app, "gaia")
    martin, martin_headers = signed_client(app, "martin")

    saved = gaia.post("/api/exercises/bench-press/favorite", json={}, headers=gaia_headers)
    assert saved.status_code == 200
    assert saved.json == {"exerciseId": "bench-press", "favorite": True}
    assert gaia.get("/api/state").json["favoriteExerciseIds"] == ["bench-press"]
    assert martin.get("/api/state").json["favoriteExerciseIds"] == []

    removed = gaia.post("/api/exercises/bench-press/favorite", json={}, headers=gaia_headers)
    assert removed.status_code == 200
    assert removed.json == {"exerciseId": "bench-press", "favorite": False}
    assert gaia.get("/api/state").json["favoriteExerciseIds"] == []

    missing = martin.post(
        "/api/exercises/not-an-exercise/favorite", json={}, headers=martin_headers
    )
    assert missing.status_code == 404


def test_version_five_journal_upgrades_without_losing_its_user(tmp_path):
    """A version-five journal receives the favourites table in place."""
    database = tmp_path / "journal.sqlite3"
    with sqlite3.connect(database) as db:
        for statement in storage.SCHEMA:
            db.execute(statement)
        for statement in storage.COACHING_SCHEMA + storage.PERSONAL_EXERCISE_SCHEMA:
            db.execute(statement)
        db.execute(storage.VOLUME_PREFERENCES_SCHEMA)
        db.execute(
            "INSERT INTO users VALUES (?, ?, ?, ?)",
            (1, "existing-user", "hash", "2026-11-17T00:00:00+00:00"),
        )
        db.execute("PRAGMA user_version = 5")

    create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "favourite-upgrade-test",
            "SESSION_COOKIE_SECURE": False,
            "DATABASE": str(database),
        }
    )

    with sqlite3.connect(database) as db:
        assert db.execute("PRAGMA user_version").fetchone()[0] == storage.SCHEMA_VERSION
        assert db.execute("SELECT username FROM users").fetchone()[0] == "existing-user"
        assert db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='favorite_exercises'"
        ).fetchone()
