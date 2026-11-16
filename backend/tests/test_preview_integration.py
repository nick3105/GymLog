"""Cross-feature API round trips and additive preview schema upgrades."""

import json
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from uuid import uuid4

import pytest

from gymlog import create_app, storage


def signed_client(app, username):
    """Register a separate browser session through the normal account endpoint."""
    client = app.test_client()
    csrf = client.get("/api/session").json["csrf"]
    result = client.post(
        "/api/register",
        json={"username": username, "password": "temporary-test-password"},
        headers={"X-CSRF-Token": csrf},
    )
    assert result.status_code == 201
    return client, {"X-CSRF-Token": result.json["csrf"]}


def test_coached_private_timed_superset_notes_reminders_and_volume(tmp_path, monkeypatch):
    """Exercise all feature boundaries through authenticated endpoints without sharing private weights."""
    monkeypatch.setenv("GYMLOG_INSTANCE", str(tmp_path / "empty-instance"))
    app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "preview-integration-secret",
            "SESSION_COOKIE_SECURE": False,
            "DATABASE": str(tmp_path / "journal.sqlite3"),
            "VOLUME_DRAFT_PREVIEW": True,
        }
    )
    alice, alice_headers = signed_client(app, "alice")
    bob, bob_headers = signed_client(app, "bob")
    eve, eve_headers = signed_client(app, "eve")
    exercise = alice.post(
        "/api/exercises/personal",
        json={
            "requestId": str(uuid4()),
            "name": "Balance hold",
            "group": "Core",
            "measurement": "duration",
        },
        headers=alice_headers,
    )
    assert exercise.status_code == 201
    personal_id = exercise.json["id"]
    assert personal_id not in {row["id"] for row in eve.get("/api/state").json["exercises"]}
    requested = alice.post(
        "/api/coaching/request", json={"username": "bob", "consent": True}, headers=alice_headers
    )
    assert requested.status_code == 201
    relationship = requested.json
    coachee_id = relationship["coachee_id"]
    delegated = f"/api/coachees/{coachee_id}"
    assert bob.get(delegated).status_code == 404
    assert (
        bob.post(
            f"/api/coaching/{relationship['id']}/accept", json={}, headers=bob_headers
        ).status_code
        == 200
    )
    assert personal_id in {row["id"] for row in bob.get(delegated).json["exercises"]}
    plan = {
        "name": "Coached balance and press",
        "note": "Steady controlled movement",
        "warmup": "Easy walking",
        "cooldown": "Relax and breathe",
        "exercises": [
            {
                "id": personal_id,
                "supersetId": "pair-a",
                "note": "Find a steady position",
                "targets": [{"durationSeconds": 30}, {"durationSeconds": 20}],
            },
            {
                "id": "bench-press",
                "supersetId": "pair-a",
                "note": "Pause on chest",
                "targets": [{"reps": 5, "weight": 60}, {"reps": 3, "weight": 80}],
            },
        ],
    }
    result = bob.post(delegated + "/templates", json=plan, headers=bob_headers)
    assert result.status_code == 201, result.json
    template = result.json
    assert template["createdBy"]["username"] == "bob"
    assert template["exercises"][0]["source"] == "personal"
    assert template["exercises"][0]["volumeEligible"] is False
    assert template["exercises"][0]["measurement"] == "duration"
    assert alice.get("/api/state").json["templates"][0] == template
    assert bob.get("/api/state").json["templates"] == []
    actual = {
        "clientId": str(uuid4()),
        "templateId": template["id"],
        "day": "2026-11-09",
        "note": "Good balance today",
        "warmupDone": True,
        "cooldownDone": False,
        "exercises": [
            {
                "id": personal_id,
                "supersetId": "pair-a",
                "note": "More stable today",
                "sets": [{"durationSeconds": 30, "rpe": 7}, {"durationSeconds": 20}],
            },
            {
                "id": "bench-press",
                "supersetId": "pair-a",
                "sets": [{"weight": 60, "reps": 5, "rpe": 8}, {"weight": 80, "reps": 3, "rpe": 9}],
            },
        ],
    }
    result = alice.post("/api/sessions", json=actual, headers=alice_headers)
    assert result.status_code == 201, result.json
    saved = result.json
    assert alice.post("/api/sessions", json=actual, headers=alice_headers).json == saved
    assert saved["note"] == "Good balance today"
    assert saved["warmup"] == "Easy walking" and saved["warmupDone"] is True
    assert saved["cooldown"] == "Relax and breathe" and saved["cooldownDone"] is False
    held, pressed = saved["exercises"]
    assert held["note"] == "More stable today" and held["estimated1rm"] is None
    assert held["supersetId"] == pressed["supersetId"] == "pair-a"
    assert held["source"] == "personal" and held["measurement"] == "duration"
    assert pressed["note"] == "Pause on chest" and pressed["estimated1rm"] == 90.7
    shared = bob.get(delegated).json
    assert set(shared) == {"owner", "exercises", "templates", "sessions"}
    assert shared["sessions"][0] == saved
    assert (
        bob.get(delegated + f"/exercises/{personal_id}/stats").json["last"]["sets"] == held["sets"]
    )
    assert (
        alice.get("/api/exercises/bench-press/stats?include=average-weight").json["averageWeight"][
            "latest"
        ]
        == 70
    )
    volume = alice.get("/api/volume?week=2026-11-09").json
    assert volume["countedSets"] == 2
    assert volume["excluded"] == {"Personal exercise": 2}
    assert eve.get("/api/volume?week=2026-11-09").json["countedSets"] == 0
    assert eve.get(delegated).status_code == 404
    assert eve.post(delegated + "/templates", json=plan, headers=eve_headers).status_code == 404
    assert eve.get(f"/api/exercises/{personal_id}/stats").status_code == 404

    correction = {
        "day": saved["day"],
        "timezoneOffset": 0,
        "revision": saved.get("revision", 0),
        "note": "Corrected training note",
        "warmup": "Forged replacement",
        "cooldownDone": True,
        "exercises": deepcopy(saved["exercises"]),
    }
    correction["exercises"][0]["sets"][1]["durationSeconds"] = 25
    result = alice.post(f"/api/sessions/{saved['id']}", json=correction, headers=alice_headers)
    assert result.status_code == 200, result.json
    corrected = result.json
    assert corrected["warmup"] == saved["warmup"]
    assert corrected["warmupDone"] is True and corrected["cooldownDone"] is True
    assert corrected["note"] == "Corrected training note"
    assert corrected["exercises"][0]["sets"][1]["durationSeconds"] == 25
    assert corrected["exercises"][0]["source"] == "personal"
    assert corrected["exercises"][0]["supersetId"] == "pair-a"
    assert corrected["exercises"][0]["targets"] == held["targets"]
    changed_plan = {**deepcopy(plan), "note": "Future plan cue", "warmup": "Future warmup"}
    assert (
        bob.post(
            delegated + f"/templates/{template['id']}", json=changed_plan, headers=bob_headers
        ).status_code
        == 200
    )
    assert alice.get("/api/state").json["sessions"][0] == corrected
    assert (
        alice.post(
            f"/api/coaching/{relationship['id']}/revoke", json={}, headers=alice_headers
        ).status_code
        == 200
    )
    assert bob.get(delegated).status_code == 404
    assert (
        bob.post(
            delegated + f"/templates/{template['id']}", json=plan, headers=bob_headers
        ).status_code
        == 404
    )
    assert alice.get("/api/state").json["sessions"][0] == corrected


@pytest.mark.parametrize("version", [0, 1, 2, 3, 4])
def test_preview_migrations_are_repeatable_and_concurrent(tmp_path, version):
    """Upgrade fresh and each prior additive schema under simultaneous initialization."""
    path = str(tmp_path / "upgrade.sqlite3")
    if version:
        with sqlite3.connect(path) as db:
            for statement in storage.SCHEMA:
                db.execute(statement)
            db.execute("INSERT INTO users VALUES (1,'alice','hash','2026-01-01')")
            db.execute(
                "INSERT INTO templates VALUES ('plan',1,?, '2026-01-01')",
                (json.dumps({"id": "plan"}),),
            )
            if version >= 2:
                for statement in storage.COACHING_SCHEMA:
                    db.execute(statement)
            if version >= 3:
                for statement in storage.PERSONAL_EXERCISE_SCHEMA:
                    db.execute(statement)
            if version >= 4:
                db.execute(storage.VOLUME_PREFERENCES_SCHEMA)
            db.execute(f"PRAGMA user_version={version}")
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(lambda _: storage.initialize(path), range(4)))
    storage.initialize(path)
    with sqlite3.connect(path) as db:
        assert db.execute("PRAGMA user_version").fetchone()[0] == storage.SCHEMA_VERSION
        tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        assert {"coaching_relationships", "personal_exercises", "user_preferences"} <= tables
        if version:
            assert db.execute("SELECT username FROM users").fetchone()[0] == "alice"
            assert json.loads(db.execute("SELECT document FROM templates").fetchone()[0]) == {
                "id": "plan"
            }


@pytest.mark.parametrize("version,has_weight_goal", [(2, True), (4, False)])
def test_shared_and_preview_schema_histories_keep_private_data(tmp_path, version, has_weight_goal):
    """Upgrade shared weight-goal and older preview histories without losing private data."""
    path = str(tmp_path / "histories.sqlite3")
    with sqlite3.connect(path) as db:
        for statement in storage.SCHEMA:
            db.execute(statement)
        db.execute("INSERT INTO users VALUES (1,'alice','hash','2026-01-01')")
        db.execute("INSERT INTO users VALUES (2,'bob','hash','2026-01-01')")
        if has_weight_goal:
            db.execute("INSERT INTO body_weight_goals VALUES (1,80,'gain')")
        else:
            db.execute("DROP TABLE body_weight_goals")
            for statement in storage.COACHING_SCHEMA + storage.PERSONAL_EXERCISE_SCHEMA:
                db.execute(statement)
            db.execute(storage.VOLUME_PREFERENCES_SCHEMA)
            db.execute(
                "INSERT INTO user_preferences VALUES (1,?,'2026-01-01')",
                ('{"goals":{"chest":12},"revision":1}',),
            )
        db.execute(f"PRAGMA user_version={version}")
    storage.initialize(path)
    storage.initialize(path)
    assert storage.weight_goal(path, 1) == ({"kg": 80, "mode": "gain"} if has_weight_goal else None)
    assert storage.weight_goal(path, 2) is None
    assert storage.volume_preferences(path, 2)["goals"] == {}
    if not has_weight_goal:
        assert storage.volume_preferences(path, 1)["goals"] == {"chest": 12}
    with sqlite3.connect(path) as db:
        assert db.execute("PRAGMA user_version").fetchone()[0] == storage.SCHEMA_VERSION
        assert db.execute("SELECT count(*) FROM coaching_relationships").fetchone()[0] == 0


def test_competing_legacy_upgrade_can_finish_before_accounts_read(tmp_path, monkeypatch):
    """A legacy initializer can resume safely after another has migrated its accounts."""
    from test_upgrade import LEGACY_TABLES

    path = str(tmp_path / "legacy-race.sqlite3")
    original_connect = sqlite3.connect
    with original_connect(path) as db:
        db.executescript(LEGACY_TABLES)
        db.execute("CREATE TABLE accounts (profile TEXT PRIMARY KEY, password_hash TEXT)")
        db.execute("INSERT INTO accounts VALUES ('guest', 'guest-hash')")
    race = {"pending": True}

    class InterleavedConnection(sqlite3.Connection):
        def execute(self, sql, parameters=()):
            """Complete a competing migration immediately before the legacy read."""
            if sql.startswith("SELECT profile, password_hash FROM accounts") and race["pending"]:
                race["pending"] = False
                storage.initialize(path, "owner-hash")
            return super().execute(sql, parameters)

    def interleaved_connect(*args, **kwargs):
        """Use a deterministic schedule without touching a real journal."""
        kwargs["factory"] = InterleavedConnection
        return original_connect(*args, **kwargs)

    monkeypatch.setattr(storage.sqlite3, "connect", interleaved_connect)
    storage.initialize(path, "owner-hash")
    with original_connect(path) as db:
        assert db.execute("PRAGMA user_version").fetchone()[0] == storage.SCHEMA_VERSION
        assert db.execute("SELECT username FROM users ORDER BY username").fetchall() == [
            ("guest",),
            ("nick",),
        ]
