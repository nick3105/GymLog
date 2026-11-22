"""Friend requests and explicitly shared workouts preserve the private journal."""

from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest

from gymlog import create_app, storage
from gymlog.models import validate_friend_pair


@pytest.fixture
def accounts(tmp_path, monkeypatch):
    """Set up three independent signed-in test clients."""
    monkeypatch.setenv("GYMLOG_INSTANCE", str(tmp_path))
    path = tmp_path / "journal.sqlite3"
    app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "friends-test",
            "DATABASE": str(path),
            "SESSION_COOKIE_SECURE": False,
        }
    )
    users = {}
    for username in ("alice", "bob", "carol"):
        client = app.test_client()
        token = client.get("/api/session").json["csrf"]
        result = client.post(
            "/api/register",
            json={"username": username, "password": "test-only-password"},
            headers={"X-CSRF-Token": token},
        )
        assert result.status_code == 201
        users[username] = (client, {"X-CSRF-Token": result.json["csrf"]})
    return path, users


def saved_workout(client, headers, sharing=None):
    """Save a completed workout with notes and set details that must stay private."""
    plan = client.post(
        "/api/templates",
        json={
            "name": "Upper body",
            "exercises": [{"id": "bench-press", "targets": [{"reps": 8, "weight": 40}] * 3}],
        },
        headers=headers,
    )
    assert plan.status_code == 201
    workout = client.post(
        "/api/sessions",
        json={
            "clientId": str(uuid4()),
            "templateId": plan.json["id"],
            "day": "2026-11-22",
            "note": "private workout note",
            "sharing": sharing,
            "exercises": [
                {
                    "id": "bench-press",
                    "note": "private exercise note",
                    "sets": [{"reps": 8, "weight": 40, "rpe": 7}] * 3,
                }
            ],
        },
        headers=headers,
    )
    assert workout.status_code == 201
    return workout.json


def test_explicit_sharing_and_revocation(accounts):
    """A single recipient can only read selected fields while the share remains active."""
    _, users = accounts
    alice, ah = users["alice"]
    bob, bh = users["bob"]
    carol, ch = users["carol"]
    workout = saved_workout(alice, ah)
    endpoint = f"/api/sessions/{workout['id']}/shares"
    assert bob.get(endpoint).status_code == 404
    assert alice.post("/api/friends/request", json={"username": "bob"}).status_code == 403
    assert (
        alice.post("/api/friends/request", json={"username": "alice"}, headers=ah).status_code
        == 400
    )
    request = alice.post("/api/friends/request", json={"username": " BOB "}, headers=ah)
    assert request.status_code == 200
    friendship = request.json["id"]
    relationship_path = f"/api/friends/{friendship}"
    payload = {"friendshipId": friendship}

    assert alice.post(endpoint, json=payload, headers=ah).status_code == 404
    assert carol.post(f"{relationship_path}/accept", json={}, headers=ch).status_code == 404
    assert alice.post(f"{relationship_path}/accept", json={}, headers=ah).status_code == 400
    assert bob.post(f"{relationship_path}/accept", json={}, headers=bh).status_code == 200
    assert bob.get("/api/friends").json["activity"] == []
    assert bob.post(endpoint, json=payload, headers=bh).status_code == 404

    for _ in range(2):
        assert alice.post(endpoint, json=payload, headers=ah).status_code == 200
    items = bob.get("/api/friends").json["activity"]
    assert len(items) == 1
    share = items[0]["id"]
    assert items == [{"id": share, "sender": "alice", "name": "Upper body", "day": "2026-11-22"}]
    detail_path = f"/api/shared-workouts/{share}"
    assert carol.get(detail_path).status_code == 404
    detail = bob.get(detail_path).json
    assert detail == {
        **items[0],
        "exercises": [
            {"name": workout["exercises"][0]["name"], "sets": [{"weight": 40, "reps": 8}] * 3}
        ],
    }
    assert bob.post(f"{endpoint}/{share}/revoke", json={}, headers=bh).status_code == 404
    assert alice.post(f"{endpoint}/{share}/revoke", json={}, headers=ah).status_code == 200
    assert bob.get(detail_path).status_code == 404
    assert bob.get("/api/friends").json["activity"] == []


def test_end_refriend_and_delete(accounts):
    """Ending a friendship or deleting a session makes old links inaccessible."""
    path, users = accounts
    alice, ah = users["alice"]
    bob, bh = users["bob"]
    workout = saved_workout(alice, ah)
    endpoint = f"/api/sessions/{workout['id']}/shares"
    friendship = alice.post("/api/friends/request", json={"username": "bob"}, headers=ah).json["id"]
    assert bob.post(f"/api/friends/{friendship}/accept", json={}, headers=bh).status_code == 200
    assert alice.post(endpoint, json={"friendshipId": friendship}, headers=ah).status_code == 200
    share_id = bob.get("/api/friends").json["activity"][0]["id"]

    assert bob.post(f"/api/friends/{friendship}/end", json={}, headers=bh).status_code == 200
    assert bob.get(f"/api/shared-workouts/{share_id}").status_code == 404
    new_friendship = alice.post("/api/friends/request", json={"username": "bob"}, headers=ah).json[
        "id"
    ]
    assert new_friendship != friendship
    assert bob.post(f"/api/friends/{new_friendship}/accept", json={}, headers=bh).status_code == 200
    assert bob.get("/api/friends").json["activity"] == []
    assert alice.post(endpoint, json={"friendshipId": friendship}, headers=ah).status_code == 404
    assert (
        alice.post(endpoint, json={"friendshipId": new_friendship}, headers=ah).status_code == 200
    )
    new_share_id = bob.get("/api/friends").json["activity"][0]["id"]

    with storage.connect(path) as db:
        db.execute("DELETE FROM sessions WHERE id=? AND user_id=?", (workout["id"], 1))
    assert bob.get(f"/api/shared-workouts/{new_share_id}").status_code == 404
    assert bob.get("/api/friends").json["activity"] == []


def test_upgrade_and_concurrent_cross_requests(accounts):
    """Version 7 journals survive, and concurrent requests create a single pending row."""
    path, users = accounts
    alice, ah = users["alice"]
    bob, bh = users["bob"]
    workout = saved_workout(alice, ah)
    with storage.connect(path) as db:
        db.execute("DROP TABLE workout_shares")
        db.execute("DROP TABLE friendships")
        db.execute("PRAGMA user_version=7")
    storage.initialize(path)
    assert alice.get("/api/state").json["sessions"] == [workout]

    with ThreadPoolExecutor(max_workers=2) as pool:
        first = pool.submit(storage.request_friend, path, 1, "bob", validate_friend_pair)
        second = pool.submit(storage.request_friend, path, 2, "alice", validate_friend_pair)
        friendship = first.result()
        assert friendship == second.result()

    alice_rows = alice.get("/api/friends").json["relationships"]
    bob_rows = bob.get("/api/friends").json["relationships"]
    assert len(alice_rows) == len(bob_rows) == 1
    assert alice_rows[0]["incoming"] != bob_rows[0]["incoming"]
    recipient, headers = (alice, ah) if alice_rows[0]["incoming"] else (bob, bh)
    assert (
        recipient.post(f"/api/friends/{friendship}/decline", json={}, headers=headers).status_code
        == 200
    )
    assert alice.get("/api/friends").json["relationships"] == []
    assert bob.get("/api/friends").json["relationships"] == []


def test_save_privately_then_share_with_all_or_selected_friends(accounts):
    """Saving never shares, and a separate request grants only the chosen access."""
    _, users = accounts
    alice, ah = users["alice"]
    bob, bh = users["bob"]
    carol, ch = users["carol"]
    friends = {}
    for username, client, headers in (("bob", bob, bh), ("carol", carol, ch)):
        result = alice.post("/api/friends/request", json={"username": username}, headers=ah)
        friendship = result.json["id"]
        assert (
            client.post(f"/api/friends/{friendship}/accept", json={}, headers=headers).status_code
            == 200
        )
        friends[username] = friendship

    # An older frontend may still send a save-time audience. Saving stays private.
    private = saved_workout(alice, ah, {"audience": "all"})
    selected = saved_workout(alice, ah)
    everyone = saved_workout(alice, ah)
    assert bob.get("/api/friends").json["activity"] == []
    assert carol.get("/api/friends").json["activity"] == []

    selected_path = f"/api/sessions/{selected['id']}/shares"
    payload = {"audience": "selected", "friendshipIds": [friends["bob"]]}
    assert alice.post(selected_path, json=payload, headers=ah).json == {
        "ok": True,
        "recipientCount": 1,
    }
    assert len(bob.get("/api/friends").json["activity"]) == 1
    assert carol.get("/api/friends").json["activity"] == []

    everyone_path = f"/api/sessions/{everyone['id']}/shares"
    for _ in range(2):
        assert alice.post(everyone_path, json={"audience": "all"}, headers=ah).json == {
            "ok": True,
            "recipientCount": 2,
        }
    assert len(bob.get("/api/friends").json["activity"]) == 2
    assert len(carol.get("/api/friends").json["activity"]) == 1

    assert (
        carol.post(f"/api/friends/{friends['carol']}/end", json={}, headers=ch).status_code == 200
    )
    stale = alice.post(
        f"/api/sessions/{private['id']}/shares",
        json={"audience": "selected", "friendshipIds": list(friends.values())},
        headers=ah,
    )
    assert stale.status_code == 404
    assert len(alice.get("/api/state").json["sessions"]) == 3
    assert len(bob.get("/api/friends").json["activity"]) == 2

    # Save & close keeps existing selected links and removes unchecked recipients.
    remaining_share = alice.get(everyone_path).json["shares"][0]["id"]
    assert (
        alice.post(everyone_path, json={"audience": "all", "replace": True}, headers=ah).status_code
        == 200
    )
    new_carol = alice.post("/api/friends/request", json={"username": "carol"}, headers=ah).json[
        "id"
    ]
    assert carol.post(f"/api/friends/{new_carol}/accept", json={}, headers=ch).status_code == 200
    assert (
        alice.post(everyone_path, json={"audience": "all", "replace": True}, headers=ah).json[
            "recipientCount"
        ]
        == 2
    )
    assert len(carol.get("/api/friends").json["activity"]) == 1
    replace = {"audience": "selected", "friendshipIds": [friends["bob"]], "replace": True}
    assert alice.post(everyone_path, json=replace, headers=ah).json["recipientCount"] == 1
    assert alice.get(everyone_path).json["shares"][0]["id"] == remaining_share
    assert carol.get("/api/friends").json["activity"] == []

    replace["friendshipIds"] = []
    assert alice.post(everyone_path, json=replace, headers=ah).json["recipientCount"] == 0
    assert bob.get(f"/api/shared-workouts/{remaining_share}").status_code == 404
    assert everyone["id"] in {session["id"] for session in alice.get("/api/state").json["sessions"]}


def test_workout_comments_are_shared_only_with_current_recipients(accounts):
    """The owner and current recipients share a thread, and retries post only once."""
    path, users = accounts
    alice, ah = users["alice"]
    bob, bh = users["bob"]
    carol, ch = users["carol"]
    workout = saved_workout(alice, ah)
    session = f"/api/sessions/{workout['id']}"
    with storage.connect(path) as db:
        db.execute("DROP TABLE workout_comments")
        db.execute("PRAGMA user_version=8")
    storage.initialize(path)
    invites = {}
    for name, friend, headers in [("bob", bob, bh), ("carol", carol, ch)]:
        invite = alice.post("/api/friends/request", json={"username": name}, headers=ah).json["id"]
        assert (
            friend.post(f"/api/friends/{invite}/accept", json={}, headers=headers).status_code
            == 200
        )
        invites[name] = invite
        if name == "bob":
            assert (
                alice.post(
                    f"{session}/shares", json={"friendshipId": invite}, headers=ah
                ).status_code
                == 200
            )
    share = bob.get("/api/friends").json["activity"][0]["id"]
    thread = f"/api/shared-workouts/{share}/comments"
    payload = {"text": "Nice work!", "clientId": str(uuid4())}
    assert carol.get(thread).status_code == 404
    assert carol.post(thread, json=payload, headers=ch).status_code == 404
    assert bob.post(f"{session}/comments", json=payload, headers=bh).status_code == 404
    assert bob.post(thread, json={**payload, "text": " "}, headers=bh).status_code == 400
    for _ in range(2):
        assert bob.post(thread, json=payload, headers=bh).status_code == 200
    entries = alice.get(f"{session}/comments").json["comments"]
    assert [(entry["author"], entry["text"]) for entry in entries] == [("bob", "Nice work!")]
    assert (
        alice.post(
            f"{session}/comments", json={"text": "Thanks!", "clientId": str(uuid4())}, headers=ah
        ).status_code
        == 200
    )
    assert [entry["text"] for entry in bob.get(thread).json["comments"]] == [
        "Nice work!",
        "Thanks!",
    ]
    assert (
        alice.post(
            f"{session}/shares", json={"friendshipId": invites["carol"]}, headers=ah
        ).status_code
        == 200
    )
    alerts = alice.get("/api/friends").json["commentActivity"]
    assert alerts == [
        {
            "id": entries[0]["id"],
            "author": "bob",
            "workoutId": workout["id"],
            "workoutName": "Upper body",
        }
    ]
    assert bob.get("/api/friends").json["commentActivity"] == []
    assert carol.get("/api/friends").json["commentActivity"] == []
    carol_share = carol.get("/api/friends").json["activity"][0]["id"]
    carol_thread = f"/api/shared-workouts/{carol_share}/comments"
    assert carol.get(carol_thread).json["comments"] == bob.get(thread).json["comments"]
    assert alice.post(f"{session}/shares/{share}/revoke", json={}, headers=ah).status_code == 200
    assert bob.get(thread).status_code == 404
    assert bob.post(thread, json=payload, headers=bh).status_code == 404
    assert len(alice.get(f"{session}/comments").json["comments"]) == 2
    assert len(carol.get(carol_thread).json["comments"]) == 2


def test_share_achieved_goal_without_exposing_weights(accounts):
    """Only selected friends receive a milestone and can congratulate the owner once."""
    path, users = accounts
    alice, ah = users["alice"]
    bob, bh = users["bob"]
    carol, ch = users["carol"]
    assert (
        alice.post("/api/weights", json={"day": "2026-11-21", "kg": 79}, headers=ah).status_code
        == 200
    )
    assert (
        alice.post("/api/weight-goal", json={"kg": 75, "mode": "lose"}, headers=ah).status_code
        == 200
    )
    with storage.connect(path) as db:
        db.execute("DROP TABLE goal_milestone_shares")
        db.execute("DROP TABLE goal_milestones")
        db.execute("PRAGMA user_version=9")
    storage.initialize(path)
    accepted = {}
    for name, client, headers in [("bob", bob, bh), ("carol", carol, ch)]:
        invite = alice.post("/api/friends/request", json={"username": name}, headers=ah).json["id"]
        assert (
            client.post(f"/api/friends/{invite}/accept", json={}, headers=headers).status_code
            == 200
        )
        accepted[name] = invite
    share = "/api/weight-goal/milestone"
    audience = {"audience": "selected", "friendshipIds": [accepted["bob"]]}
    assert alice.post(share, json=audience, headers=ah).status_code == 400
    assert (
        alice.post("/api/weights", json={"day": "2026-11-22", "kg": 74}, headers=ah).status_code
        == 200
    )
    assert bob.get("/api/friends").json["milestones"] == []
    for _ in range(2):
        assert alice.post(share, json=audience, headers=ah).status_code == 200
    results = bob.get("/api/friends").json["milestones"]
    assert len(results) == 1
    entry = results[0]
    assert entry == {"id": entry["id"], "sender": "alice", "congratulated": False}
    assert carol.get("/api/friends").json["milestones"] == []
    congratulate = f"/api/goal-milestones/{entry['id']}/congratulate"
    assert carol.post(congratulate, json={}, headers=ch).status_code == 404
    for _ in range(2):
        assert bob.post(congratulate, json={}, headers=bh).status_code == 200
    assert bob.get("/api/friends").json["milestones"][0]["congratulated"] is True
    assert alice.get("/api/friends").json["congratulations"] == [
        {"id": entry["id"], "sender": "bob"}
    ]
    assert carol.get("/api/friends").json["congratulations"] == []
    assert bob.post(f"/api/friends/{accepted['bob']}/end", json={}, headers=bh).status_code == 200
    assert bob.get("/api/friends").json["milestones"] == []
    assert bob.post(congratulate, json={}, headers=bh).status_code == 404
