"""Scheduling preserves reusable workouts and private historical records."""

from copy import deepcopy
from uuid import uuid4

import pytest

from gymlog import create_app, storage


@pytest.fixture
def journal(tmp_path, monkeypatch):
    """Build an isolated signed-in account without private instance data."""
    monkeypatch.setenv("GYMLOG_INSTANCE", str(tmp_path))
    app = create_app(
        {"TESTING": True, "SECRET_KEY": "tests", "DATABASE": str(tmp_path / "test.db")}
    )
    browser = app.test_client()
    token = browser.get("/api/session").json["csrf"]
    result = browser.post(
        "/api/register",
        json={"username": "alice", "password": "test-password-long"},
        headers={"X-CSRF-Token": token},
    )
    return app, browser, {"X-CSRF-Token": result.json["csrf"]}


def template(browser, headers, name="Upper"):
    """Save one reusable workout through its public API."""
    response = browser.post(
        "/api/templates",
        json={
            "name": name,
            "exercises": [
                {"id": "bench-press", "targets": [{"reps": 8, "weight": 60, "rpe": None}]}
            ],
        },
        headers=headers,
    )
    assert response.status_code == 201
    return response.json


def change(browser, headers, action, revision=0, **fields):
    """Submit one revision-protected scheduling command."""
    return browser.post(
        "/api/schedule", json={"action": action, "revision": revision, **fields}, headers=headers
    )


def test_week_series_and_progressive_overload_preserve_sources(journal):
    """A week's adjusted targets never change its reusable series or template."""
    app, browser, headers = journal
    original = template(browser, headers)
    series_id = str(uuid4())
    result = change(
        browser,
        headers,
        "saveSeries",
        id=series_id,
        name="Three days",
        templateIds=[original["id"]] * 3,
    )
    assert result.status_code == 200
    series = result.json["series"][0]
    request_id = str(uuid4())
    assigned = change(
        browser, headers, "assignSeries", 1, id=request_id, seriesId=series_id, week="2026-11-23"
    )
    assert assigned.status_code == 200
    entries = assigned.json["entries"]
    assert [entry["position"] for entry in entries] == [1, 2, 3]
    assert all(entry["day"] is None for entry in entries)
    next_week = change(
        browser,
        headers,
        "assignSeries",
        2,
        id=str(uuid4()),
        seriesId=series_id,
        week="2026-11-30",
    )
    assert next_week.status_code == 200
    next_entries = browser.get("/api/schedule?week=2026-11-30").json["entries"]
    assert len(next_entries) == 3
    assert {item["id"] for item in entries}.isdisjoint(item["id"] for item in next_entries)
    edited = deepcopy(entries[0]["workout"])
    edited["exercises"][0]["targets"] = [{"reps": 10, "weight": 62.5, "rpe": None}] * 2
    response = change(
        browser,
        headers,
        "editEntry",
        3,
        id=entries[0]["id"],
        workout=edited,
        week="2026-11-23",
        day="2026-11-25",
    )
    assert response.status_code == 200
    assert response.json["entries"][0]["workout"]["exercises"][0]["sets"] == 2
    assert response.json["series"][0] == series
    assert browser.get("/api/state").json["templates"] == [original]
    assert browser.get("/api/state").json["sessions"] == []
    assert browser.get("/api/schedule?week=2026-11-30").json["entries"] == next_entries
    assert len(browser.get("/api/schedule?week=2026-11-23").json["entries"]) == 3


def test_assign_retry_conflict_and_source_deletion(journal):
    """Retry creates once, stale changes fail, and source deletion retains snapshots."""
    app, browser, headers = journal
    original = template(browser, headers)
    request_id = str(uuid4())
    fields = {"id": request_id, "templateId": original["id"], "day": "2026-12-31"}
    first = change(browser, headers, "assignWorkout", **fields)
    assert first.status_code == 200
    assert change(browser, headers, "assignWorkout", **fields).status_code == 200
    entry = first.json["entries"][0]
    assert change(browser, headers, "deleteEntry", id=entry["id"]).status_code == 409
    browser.post(f"/api/templates/{original['id']}/delete", json={}, headers=headers)
    saved = browser.get("/api/schedule?week=2026-12-28").json
    assert saved["entries"][0]["workout"] == original
    deleted = change(browser, headers, "deleteEntry", 1, id=entry["id"])
    assert deleted.status_code == 200
    assert deleted.json["entries"] == []
    retry = change(browser, headers, "assignWorkout", **fields)
    assert retry.status_code == 200
    assert retry.json["entries"] == []


def test_private_commands_and_foreign_nested_references(journal):
    """Other accounts cannot read entries, use sources or mutate the owner's schedule."""
    app, browser, headers = journal
    saved = template(browser, headers)
    series_id = str(uuid4())
    assert (
        change(
            browser, headers, "saveSeries", id=series_id, name="Strength", templateIds=[saved["id"]]
        ).status_code
        == 200
    )
    entry = change(
        browser, headers, "assignSeries", 1, id=str(uuid4()), seriesId=series_id, week="2026-11-23"
    ).json["entries"][0]
    other = app.test_client()
    token = other.get("/api/session").json["csrf"]
    assert other.get("/api/schedule?week=2026-11-23").status_code == 401
    result = other.post(
        "/api/register",
        json={"username": "bob", "password": "test-password-long"},
        headers={"X-CSRF-Token": token},
    )
    foreign_headers = {"X-CSRF-Token": result.json["csrf"]}
    assert other.get("/api/schedule?week=2026-11-23").json["entries"] == []
    for action, fields in [
        ("saveSeries", {"id": str(uuid4()), "name": "Stolen", "templateIds": [saved["id"]]}),
        ("assignWorkout", {"id": str(uuid4()), "templateId": saved["id"], "day": "2026-11-24"}),
        ("assignSeries", {"id": str(uuid4()), "seriesId": series_id, "week": "2026-11-23"}),
        ("deleteSeries", {"id": series_id}),
        ("deleteEntry", {"id": entry["id"]}),
        ("editEntry", {"id": entry["id"], "week": "2026-11-23", "day": None}),
    ]:
        assert change(other, foreign_headers, action, **fields).status_code == 404
    assert (
        browser.post(
            "/api/schedule", json={"action": "deleteSeries", "id": series_id, "revision": 2}
        ).status_code
        == 403
    )
    assert len(browser.get("/api/schedule?week=2026-11-23").json["entries"]) == 1


def test_series_edit_order_and_delete_keep_assigned_week(journal):
    """Reusable order can change while weeks already assigned remain independent."""
    app, browser, headers = journal
    upper = template(browser, headers)
    lower = template(browser, headers, "Lower")
    series_id = str(uuid4())
    change(
        browser,
        headers,
        "saveSeries",
        id=series_id,
        name="Split",
        templateIds=[upper["id"], lower["id"]],
    )
    assigned = change(
        browser, headers, "assignSeries", 1, id=str(uuid4()), seriesId=series_id, week="2026-11-23"
    ).json["entries"]
    updated = change(
        browser,
        headers,
        "saveSeries",
        2,
        id=series_id,
        name="Reversed",
        templateIds=[lower["id"], upper["id"]],
    )
    assert updated.status_code == 200
    assert updated.json["entries"] == assigned
    removed = change(browser, headers, "deleteSeries", 3, id=series_id)
    assert removed.status_code == 200
    assert removed.json["series"] == []
    assert removed.json["entries"] == assigned


@pytest.mark.parametrize("day", ["2026-02-30", "20261124", "1999-12-31", None, True])
def test_refuses_invalid_assignment_dates(journal, day):
    """Scheduling validates real, canonical calendar dates within the agreed bounds."""
    app, browser, headers = journal
    saved = template(browser, headers)
    result = change(
        browser, headers, "assignWorkout", id=str(uuid4()), templateId=saved["id"], day=day
    )
    assert result.status_code == 400


def test_capacity_rolls_back_entire_series(journal):
    """A multi-day series never leaves a half-filled assignment at the weekly limit."""
    app, browser, headers = journal
    saved = template(browser, headers)
    series_id = str(uuid4())
    change(
        browser, headers, "saveSeries", id=series_id, name="Seven", templateIds=[saved["id"]] * 7
    )
    revision = 1
    for _ in range(7):
        result = change(
            browser,
            headers,
            "assignSeries",
            revision,
            id=str(uuid4()),
            seriesId=series_id,
            week="2026-11-23",
        )
        assert result.status_code == 200
        revision += 1
    result = change(
        browser,
        headers,
        "assignSeries",
        revision,
        id=str(uuid4()),
        seriesId=series_id,
        week="2026-11-23",
    )
    assert result.status_code == 400
    state = browser.get("/api/schedule?week=2026-11-23").json
    assert len(state["entries"]) == 49
    assert state["revision"] == revision


def test_version_ten_upgrade_preserves_existing_journal(journal):
    """The additive migration keeps populated workouts, sessions, weights and drafts."""
    app, browser, headers = journal
    saved = template(browser, headers)
    session = browser.post(
        "/api/sessions",
        json={
            "clientId": str(uuid4()),
            "templateId": saved["id"],
            "day": "2026-11-23",
            "exercises": [{"id": "bench-press", "sets": [{"weight": 60, "reps": 8}]}],
        },
        headers=headers,
    )
    assert session.status_code == 201
    weight = browser.post("/api/weights", json={"day": "2026-11-23", "kg": 80}, headers=headers)
    assert weight.status_code == 200
    draft = {
        "clientId": str(uuid4()),
        "templateId": saved["id"],
        "name": "Upper",
        "day": "2026-11-23",
        "exercises": saved["exercises"],
    }
    assert browser.post("/api/workout-draft", json=draft, headers=headers).status_code == 200
    path = app.config["DATABASE"]
    with storage.connect(path) as db:
        db.execute("DROP TABLE schedule_state")
        db.execute("PRAGMA user_version = 10")
    before = browser.get("/api/state").json
    storage.initialize(path)
    storage.initialize(path)
    assert browser.get("/api/state").json == before
    assert browser.get("/api/workout-draft").json["draft"] == draft
    assert browser.get("/api/state").json["templates"] == [saved]
    assert browser.get("/api/schedule?week=2026-11-23").json["entries"] == []


def complete_workout(browser, headers, plan, day):
    """Save one session outside Schedule for the same workout."""
    response = browser.post(
        "/api/sessions",
        json={
            "clientId": str(uuid4()),
            "templateId": plan["id"],
            "day": day,
            "exercises": [{"id": "bench-press", "sets": [{"weight": 65, "reps": 8}]}],
        },
        headers=headers,
    )
    assert response.status_code == 201, response.json
    return response.json


def link_completed(browser, headers, revision, *pairs):
    """Link the listed schedule and session identifiers through the API."""
    return browser.post(
        "/api/schedule/link-completed",
        json={
            "revision": revision,
            "links": [{"entryId": entry, "sessionId": session} for entry, session in pairs],
        },
        headers=headers,
    )


def test_links_to_existing_history_and_blocks_start_without_duplicating(journal):
    """Use the already completed records and leave their actuals and other entries alone."""
    _, browser, headers = journal
    plan = template(browser, headers)
    week = "2026-11-16"
    pairs = []
    for index, day in enumerate(("2026-11-18", "2026-11-20")):
        assigned = change(
            browser,
            headers,
            "assignWorkout",
            index,
            id=str(uuid4()),
            templateId=plan["id"],
            day=day,
        )
        assert assigned.status_code == 200, assigned.json
        entry_id = assigned.json["entries"][-1]["id"]
        session_id = complete_workout(browser, headers, plan, day)["id"]
        pairs.append((entry_id, session_id))
    before = browser.get("/api/state").json["sessions"]
    before_schedule = browser.get(f"/api/schedule?week={week}").json
    draft = {
        "clientId": str(uuid4()),
        "templateId": plan["id"],
        "name": plan["name"],
        "day": "2026-11-22",
        "exercises": plan["exercises"],
    }
    assert browser.post("/api/workout-draft", json=draft, headers=headers).status_code == 200

    saved = link_completed(browser, headers, 2, *pairs)
    assert saved.status_code == 200, saved.json
    assert saved.json == {"revision": 3}
    calendar = browser.get(f"/api/schedule?week={week}").json
    assert calendar["entries"] == [
        {**entry, "sessionId": session_id}
        for entry, (_, session_id) in zip(before_schedule["entries"], pairs, strict=True)
    ]
    assert browser.get("/api/state").json["sessions"] == before
    assert browser.get("/api/workout-draft").json["draft"] == draft

    entry_id, _ = pairs[0]
    start = browser.post(
        f"/api/schedule/{entry_id}/start",
        json={"revision": 3, "timezoneOffset": 0},
        headers=headers,
    )
    assert start.status_code == 409
    assert start.json["error"] == "That scheduled workout is already complete."
    retry = link_completed(browser, headers, 2, *pairs)
    assert retry.status_code == 200
    assert retry.json == saved.json


def test_link_batch_rejects_invalid_pairs_without_changing_schedule(journal):
    """Check ownership, stale revisions, duplicate sessions and mismatched records."""
    app, browser, headers = journal
    plan = template(browser, headers)
    other_plan = template(browser, headers, "Another workout")
    day = "2026-11-18"
    week = "2026-11-16"
    entry_ids = []
    for revision in range(2):
        assigned = change(
            browser,
            headers,
            "assignWorkout",
            revision,
            id=str(uuid4()),
            templateId=plan["id"],
            day=day,
        )
        assert assigned.status_code == 200, assigned.json
        entry_ids.append(assigned.json["entries"][-1]["id"])
    valid = complete_workout(browser, headers, plan, day)["id"]
    different_date = complete_workout(browser, headers, plan, "2026-11-20")["id"]
    different_template = complete_workout(browser, headers, other_plan, day)["id"]

    stranger = app.test_client()
    token = stranger.get("/api/session").json["csrf"]
    registered = stranger.post(
        "/api/register",
        json={"username": "stranger", "password": "test-password-long"},
        headers={"X-CSRF-Token": token},
    )
    stranger_headers = {"X-CSRF-Token": registered.json["csrf"]}
    stranger_plan = template(stranger, stranger_headers)
    foreign = complete_workout(stranger, stranger_headers, stranger_plan, day)["id"]
    assert link_completed(stranger, stranger_headers, 0, (entry_ids[0], valid)).status_code == 404
    assert link_completed(browser, {}, 2, (entry_ids[0], valid)).status_code == 403

    before = browser.get(f"/api/schedule?week={week}").json
    for second, status in (
        (foreign, 404),
        (different_date, 409),
        (different_template, 409),
        (valid, 409),
    ):
        result = link_completed(browser, headers, 2, (entry_ids[0], valid), (entry_ids[1], second))
        assert result.status_code == status, result.json
        assert browser.get(f"/api/schedule?week={week}").json == before

    stale = link_completed(browser, headers, 1, (entry_ids[0], valid))
    assert stale.status_code == 409
    assert browser.get(f"/api/schedule?week={week}").json == before
