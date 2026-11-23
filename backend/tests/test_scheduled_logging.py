"""Starting a scheduled copy links its actual results without changing its targets."""

from datetime import UTC, datetime
from uuid import uuid4

from test_schedule import change, template
from test_schedule import journal as journal

WEEK = "2027-02-01"


def agenda(browser):
    return browser.get(f"/api/schedule?week={WEEK}").json


def assign(browser, headers, workout):
    assigned = change(
        browser,
        headers,
        "assignWorkout",
        agenda(browser)["revision"],
        id=str(uuid4()),
        templateId=workout["id"],
        day=WEEK,
    )
    assert assigned.status_code == 200
    return assigned.json["entries"][-1]


def start(browser, headers, entry, revision=None):
    if revision is None:
        revision = agenda(browser)["revision"]
    return browser.post(
        f"/api/schedule/{entry['id']}/start",
        json={"timezoneOffset": 0, "revision": revision},
        headers=headers,
    )


def result_for(draft, count=1):
    return {
        **{field: draft[field] for field in ("clientId", "scheduleEntryId", "templateId", "day")},
        "exercises": [
            {"id": "bench-press", "sets": [{"weight": 62.5, "reps": 11, "rpe": 8}] * count}
        ],
    }


def test_start_uses_edited_snapshot_when_source_is_deleted(journal):
    """The logger uses adjusted targets and validates actuals against the same copy."""
    _, browser, headers = journal
    workout = template(browser, headers)
    entry = assign(browser, headers, workout)
    revised = {
        **workout,
        "rpeEnabled": False,
        "exercises": [{"id": "bench-press", "targets": [{"weight": 65, "reps": 10}] * 2}],
    }
    edited = change(
        browser, headers, "editEntry", 1, id=entry["id"], day=entry["day"], workout=revised
    )
    assert edited.status_code == 200
    assert browser.get("/api/state").json["templates"] == [workout]
    deleted = browser.post(f"/api/templates/{workout['id']}/delete", json={}, headers=headers)
    assert deleted.status_code == 200
    assert start(browser, headers, entry, revision=1).status_code == 409

    earliest = datetime.now(UTC).date().isoformat()
    opened = start(browser, headers, entry)
    latest = datetime.now(UTC).date().isoformat()
    assert opened.status_code == 201
    draft = opened.json["draft"]
    assert draft["day"] in {earliest, latest}
    assert draft["scheduleEntryId"] == entry["id"]
    assert draft["rpeEnabled"] is False
    targets = draft["exercises"][0]["targets"]
    assert targets == [{"reps": 10, "weight": 65, "rpe": None}] * 2
    assert agenda(browser)["entries"][0]["inProgress"] is True

    invalid = browser.post("/api/sessions", json=result_for(draft), headers=headers)
    assert invalid.status_code == 400
    assert browser.get("/api/workout-draft").json == {"draft": draft}

    payload = {**result_for(draft, 3), "day": WEEK}
    saved = browser.post("/api/sessions", json=payload, headers=headers)
    assert saved.status_code == 201
    assert saved.json["scheduleEntryId"] == entry["id"]
    assert saved.json["day"] == draft["day"]
    assert saved.json["startedAt"] == draft["startedAt"]
    assert saved.json["exercises"][0]["sets"] == [{"weight": 62.5, "reps": 11, "rpe": None}] * 3
    assert browser.get("/api/workout-draft").json == {"draft": None}
    completed = agenda(browser)["entries"][0]
    assert completed["sessionId"] == saved.json["id"]
    assert completed["day"] == WEEK
    assert completed["workout"]["exercises"][0]["targets"] == targets
    assert not completed.get("inProgress")
    assert start(browser, headers, entry).status_code == 409
    assert change(browser, headers, "deleteEntry", 3, id=entry["id"]).status_code == 409


def test_resume_discard_and_retry_keep_series_copies_independent(journal):
    """An undated copy can resume or restart and a retry leaves a newer draft alone."""
    _, browser, headers = journal
    workout = template(browser, headers)
    series_id = str(uuid4())
    series = change(
        browser,
        headers,
        "saveSeries",
        id=series_id,
        name="Two days",
        templateIds=[workout["id"]] * 2,
    )
    assert series.status_code == 200
    assigned = change(
        browser, headers, "assignSeries", 1, id=str(uuid4()), week=WEEK, seriesId=series_id
    )
    assert assigned.status_code == 200
    first, second = assigned.json["entries"]
    assert first["day"] is second["day"] is None
    draft = start(browser, headers, first).json["draft"]
    draft["exercises"][0]["sets"][0]["weight"] = "62.5"
    assert browser.post("/api/workout-draft", json=draft, headers=headers).status_code == 200
    assert start(browser, headers, first, revision=1).json == {"draft": draft}
    assert start(browser, headers, second).status_code == 409
    assert change(browser, headers, "deleteEntry", 2, id=first["id"]).status_code == 409

    discarded = browser.post(
        "/api/workout-draft/discard", json={"clientId": draft["clientId"]}, headers=headers
    )
    assert discarded.status_code == 200
    assert not agenda(browser)["entries"][0].get("inProgress")
    assert browser.post("/api/workout-draft", json=draft, headers=headers).status_code == 409

    new_draft = start(browser, headers, first).json["draft"]
    assert new_draft["clientId"] != draft["clientId"]
    payload = result_for(new_draft)
    saved = browser.post("/api/sessions", json=payload, headers=headers)
    assert saved.status_code == 201
    second_draft = start(browser, headers, second).json["draft"]
    retried = browser.post("/api/sessions", json=payload, headers=headers)
    assert retried.status_code == 200
    assert retried.json == saved.json
    assert browser.get("/api/workout-draft").json == {"draft": second_draft}
    assert browser.get("/api/state").json["sessions"] == [saved.json]
    assert agenda(browser)["entries"][1]["inProgress"] is True


def test_scheduled_start_and_finish_require_owned_entry_and_csrf(journal):
    """Only the owner can access a scheduled copy and finish a matching active draft."""
    app, browser, headers = journal
    workout = template(browser, headers)
    entry = assign(browser, headers, workout)
    assert start(browser, {}, entry, revision=1).status_code == 403

    other = app.test_client()
    csrf = other.get("/api/session").json["csrf"]
    other_headers = {"X-CSRF-Token": csrf}
    assert start(other, other_headers, entry, revision=1).status_code == 401
    registered = other.post(
        "/api/register",
        json={"username": "bob", "password": "other-test-password"},
        headers=other_headers,
    )
    assert registered.status_code == 201
    assert start(other, {"X-CSRF-Token": registered.json["csrf"]}, entry).status_code == 404

    payload = result_for(
        {
            "clientId": str(uuid4()),
            "scheduleEntryId": entry["id"],
            "templateId": workout["id"],
            "day": WEEK,
        }
    )
    assert browser.post("/api/sessions", json=payload, headers=headers).status_code == 409
    assert browser.get("/api/state").json["sessions"] == []
