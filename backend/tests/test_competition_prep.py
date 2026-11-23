"""Competition plans respect the athlete's preparation, dates and private schedule."""

import json
from copy import deepcopy
from datetime import UTC, date, datetime, timedelta
from uuid import uuid4

import pytest

from gymlog import assistant, create_app


def register(app, username):
    """Open a test journal with its own CSRF token."""
    client = app.test_client()
    token = client.get("/api/session").json["csrf"]
    result = client.post(
        "/api/register",
        json={"username": username, "password": "test-password-long"},
        headers={"X-CSRF-Token": token},
    )
    assert result.status_code == 201
    return client, {"X-CSRF-Token": result.json["csrf"]}


@pytest.fixture
def journal(tmp_path, monkeypatch):
    """Use a disposable database and a fake provider key."""
    monkeypatch.setenv("GYMLOG_INSTANCE", str(tmp_path))
    app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "competition-tests",
            "DATABASE": str(tmp_path / "journal.db"),
            "AI_ENABLED": True,
            "REQUESTY_API_KEY": "fake-key",
        }
    )
    client, headers = register(app, "alice")
    return app, client, headers


def answers(sport="powerlifting", *, weekdays=None):
    """Provide a future event and a self-reported baseline."""
    today = datetime.now(UTC).date()
    return {
        "sport": sport,
        "eventName": "Private team event",
        "eventDate": (today + timedelta(days=15)).isoformat(),
        "today": today.isoformat(),
        "stage": "in-progress",
        "recentTraining": "Halfway through my programme and training twice per week.",
        "goal": "Complete the competition.",
        "equipment": "Shared gym.",
        "sessionsPerWeek": 2,
        "minutesPerSession": 45,
        "weekdays": weekdays or [],
    }


def fake_provider(monkeypatch, captured, *, broken=False):
    """Replace the provider boundary while recording its actual input."""

    def complete(key, model, messages):
        """Return ideas and one set of references per requested week."""
        context = json.loads(messages[-1]["content"])
        captured.append(context)
        kind = {"powerlifting": "strength", "hyrox": "hybrid", "marathon": "run"}[context["sport"]]
        weeks = [
            {"focus": "Build from recent training", "workouts": [0] * week["limit"]}
            for week in context["weeks"]
        ]
        if broken:
            weeks[0]["workouts"] = [999]
        return json.dumps(
            {
                "summary": "Continue from the work you have already done.",
                "workouts": [
                    {
                        "name": "Practice session",
                        "kind": kind,
                        "minutes": 40,
                        "steps": ["Warm up at an easy effort.", "Practice the competition movement."],
                    }
                ],
                "weeks": weeks,
            }
        )

    monkeypatch.setattr(assistant, "complete", complete)


def generate(client, headers, intake, *, consent=True):
    """Request a preview without saving any workouts."""
    return client.post(
        "/api/assistant/competition-plan",
        json={"consent": consent, "intake": intake},
        headers=headers,
    )


def schedule(client, week):
    """Read the selected owner's schedule week."""
    response = client.get(f"/api/schedule?week={week}")
    assert response.status_code == 200
    return response.json


def save(client, headers, result, *, identifier=None, revision=None):
    """Submit a preview for explicit save."""
    return client.post(
        "/api/competition-plans",
        json={
            "id": identifier or str(uuid4()),
            "revision": result["revision"] if revision is None else revision,
            "intake": result["intake"],
            "plan": result["plan"],
        },
        headers=headers,
    )


@pytest.mark.parametrize("sport", ["powerlifting", "hyrox", "marathon"])
def test_generation_uses_reported_stage_and_leaves_schedule_untouched(journal, monkeypatch, sport):
    """Share the athlete's answers without disclosing private event details."""
    _, client, headers = journal
    captured = []
    fake_provider(monkeypatch, captured)
    intake = answers(sport)
    result = generate(client, headers, intake)
    assert result.status_code == 200
    data = result.json
    assert captured[0]["sport"] == sport
    assert captured[0]["eventDate"] == intake["eventDate"]
    assert captured[0]["stage"] == "in-progress"
    assert "Halfway" in captured[0]["recentTraining"]
    assert captured[0]["minutesPerSession"] == 45
    assert "Private team event" not in json.dumps(captured)
    assert "templates" not in captured[0]
    assert data["plan"]["weeks"][0]["sessions"][0]["day"] is None
    assert all(len(week["sessions"]) <= 2 for week in data["plan"]["weeks"])
    assert schedule(client, intake["today"])["competitionEntries"] == []


def test_dated_plan_matches_available_days_and_excludes_event_day(journal, monkeypatch):
    """Only declared weekdays before the race are eligible training dates."""
    _, client, headers = journal
    fake_provider(monkeypatch, [])
    intake = answers(weekdays=[0, 3])
    response = generate(client, headers, intake)
    assert response.status_code == 200
    days = [
        date.fromisoformat(session["day"])
        for week in response.json["plan"]["weeks"]
        for session in week["sessions"]
    ]
    assert days
    assert all(day.weekday() in (0, 3) for day in days)
    assert all(
        date.fromisoformat(intake["today"]) <= day < date.fromisoformat(intake["eventDate"])
        for day in days
    )


def test_edits_save_once_for_the_owner(journal, monkeypatch):
    """A reviewed individual workout and its event are saved once and kept private."""
    app, client, headers = journal
    fake_provider(monkeypatch, [])
    intake = answers()
    data = generate(client, headers, intake).json
    data["plan"]["weeks"][0]["sessions"][0]["name"] = "Adjusted practice"
    identifier = str(uuid4())
    assert save(client, headers, data, identifier=identifier).status_code == 201
    assert save(client, headers, data, identifier=identifier).status_code == 200
    saved = schedule(client, intake["today"])
    assert saved["revision"] == 1
    assert [entry["name"] for entry in saved["competitionEntries"]].count("Adjusted practice") == 1
    assert saved["entries"] == []
    marker = next(
        entry
        for entry in schedule(client, intake["eventDate"])["competitionEntries"]
        if entry["kind"] == "event"
    )
    assert marker["day"] == intake["eventDate"]
    assert marker["name"] == "Private team event"
    assert client.get("/api/state").json["sessions"] == []
    other, _ = register(app, "bob")
    assert schedule(other, intake["today"])["competitionEntries"] == []


def test_invalid_placement_and_stale_writes_leave_schedule_intact(journal, monkeypatch):
    """Reject a bad date and revision atomically."""
    _, client, headers = journal
    fake_provider(monkeypatch, [])
    intake = answers(weekdays=[0, 3])
    data = generate(client, headers, intake).json
    modified = deepcopy(data)
    week = next(item for item in modified["plan"]["weeks"] if item["sessions"])
    week["sessions"][0]["day"] = intake["eventDate"]
    assert save(client, headers, modified).status_code == 400
    assert schedule(client, intake["today"])["revision"] == 0
    assert save(client, headers, data).status_code == 201
    assert save(client, headers, data, revision=0).status_code == 409
    assert schedule(client, intake["today"])["revision"] == 1


def test_consent_bad_inputs_and_bad_provider_output_do_not_write(journal, monkeypatch):
    """Do not contact the provider before consent and valid input."""
    _, client, headers = journal
    captured = []
    fake_provider(monkeypatch, captured, broken=True)
    intake = answers()
    assert generate(client, headers, intake, consent=False).status_code == 400
    assert generate(client, headers, {**intake, "eventDate": intake["today"]}).status_code == 400
    assert generate(client, headers, {**intake, "recentTraining": ""}).status_code == 400
    assert generate(client, {}, intake).status_code == 403
    assert captured == []
    assert generate(client, headers, intake).status_code == 502
    assert len(captured) == 1
    assert schedule(client, intake["today"])["competitionEntries"] == []
