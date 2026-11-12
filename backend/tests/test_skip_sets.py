"""Skipped rows stay distinct from actual results and do not change a routine."""

from copy import deepcopy
from uuid import uuid4

import pytest

from gymlog import create_app


@pytest.fixture
def journal(tmp_path, monkeypatch):
    """Create a private disposable journal with a three-set template."""
    monkeypatch.setenv("GYMLOG_INSTANCE", str(tmp_path))
    app = create_app(
        {"TESTING": True, "SECRET_KEY": "skip-test", "DATABASE": str(tmp_path / "test.db")}
    )
    client = app.test_client()
    token = client.get("/api/session").json["csrf"]
    user = client.post(
        "/api/register",
        json={"username": "alice", "password": "temporary-test-password"},
        headers={"X-CSRF-Token": token},
    )
    headers = {"X-CSRF-Token": user.json["csrf"]}
    template = client.post(
        "/api/templates",
        json={
            "name": "Upper",
            "exercises": [
                {"id": "bench-press", "targets": [{"reps": 8, "weight": 60, "rpe": None}] * 3}
            ],
        },
        headers=headers,
    ).json
    body = {
        "clientId": str(uuid4()),
        "templateId": template["id"],
        "day": "2026-11-11",
        "exercises": [
            {
                "id": "bench-press",
                "sets": [
                    {"weight": 60, "reps": 8, "rpe": None},
                    {"weight": 65, "reps": 5, "rpe": 8},
                    {"skipped": True},
                ],
            }
        ],
    }
    return app, client, headers, template, body


def test_skip_keeps_template_and_history_and_is_retry_safe(journal):
    """Save two actual rows and one explicit skip, then retry without duplicating."""
    app, client, headers, template, body = journal
    result = client.post("/api/sessions", json=body, headers=headers)
    assert result.status_code == 201
    sets = result.json["exercises"][0]["sets"]
    assert sets[2] == {"skipped": True}
    assert result.json["exercises"][0]["estimated1rm"] == 80.2
    assert client.post("/api/sessions", json=body, headers=headers).json == result.json
    state = client.get("/api/state").json
    assert state["templates"] == [template]
    assert state["sessions"] == [result.json]
    stats = client.get("/api/exercises/bench-press/stats").json
    assert stats["last"]["sets"] == sets[:2]
    assert stats["best"] == 80.2
    stranger = app.test_client()
    token = stranger.get("/api/session").json["csrf"]
    user = stranger.post(
        "/api/register",
        json={"username": "bob", "password": "temporary-test-password"},
        headers={"X-CSRF-Token": token},
    )
    assert stranger.get("/api/state").json["sessions"] == []
    assert (
        stranger.post(
            "/api/sessions", json=body, headers={"X-CSRF-Token": user.json["csrf"]}
        ).status_code
        == 404
    )


@pytest.mark.parametrize(
    "row", [{}, {"skipped": False}, {"skipped": "true"}, {"skipped": 1}, {"skipped": None}]
)
def test_only_explicit_boolean_skip_can_replace_actual_results(journal, row):
    """An unfinished row or an invalid skip flag must not be saved."""
    app, client, headers, template, body = journal
    body["exercises"][0]["sets"][2] = row
    assert client.post("/api/sessions", json=body, headers=headers).status_code == 400
    assert client.get("/api/state").json["sessions"] == []


def test_skipped_values_are_ignored_and_different_retry_is_rejected(journal):
    """Stale values on a skipped row cannot inflate estimates or change saved results."""
    app, client, headers, template, body = journal
    body["exercises"][0]["sets"][2] = {"skipped": True, "weight": 1000, "reps": 1, "rpe": 10}
    result = client.post("/api/sessions", json=body, headers=headers)
    assert result.status_code == 201
    assert result.json["exercises"][0]["sets"][2] == {"skipped": True}
    assert result.json["exercises"][0]["estimated1rm"] == 80.2
    changed = deepcopy(body)
    changed["exercises"][0]["sets"][2] = {"weight": 60, "reps": 8, "rpe": None}
    assert client.post("/api/sessions", json=changed, headers=headers).status_code == 409


def test_skipping_every_set_cannot_save_an_empty_workout(journal):
    """At least one set must actually be performed somewhere in the session."""
    app, client, headers, template, body = journal
    body["exercises"][0]["sets"] = [{"skipped": True}] * 3
    response = client.post("/api/sessions", json=body, headers=headers)
    assert response.status_code == 400
    assert (
        response.json["error"]
        == "Complete at least one set before saving, or discard this workout."
    )
    assert client.get("/api/state").json["sessions"] == []


def test_whole_exercise_can_be_skipped_when_another_has_one_completed_set(journal):
    """Skipping bench entirely does not replace its previous actual performance."""
    app, client, headers, template, body = journal
    assert client.post("/api/sessions", json=body, headers=headers).status_code == 201
    previous = client.get("/api/exercises/bench-press/stats").json
    changed = {
        "name": "Short session",
        "exercises": template["exercises"]
        + [{"id": "barbell-row", "targets": [{"reps": 5, "weight": 40, "rpe": None}]}],
    }
    next_template = client.post("/api/templates", json=changed, headers=headers).json
    next_session = {
        "clientId": str(uuid4()),
        "templateId": next_template["id"],
        "day": "2026-11-12",
        "exercises": [
            {"id": "bench-press", "sets": [{"skipped": True}] * 3},
            {"id": "barbell-row", "sets": [{"weight": 40, "reps": 5, "rpe": None}]},
        ],
    }
    saved = client.post("/api/sessions", json=next_session, headers=headers)
    assert saved.status_code == 201
    assert saved.json["exercises"][0]["estimated1rm"] is None
    assert saved.json["exercises"][0]["sets"] == [{"skipped": True}] * 3
    assert client.get("/api/exercises/bench-press/stats").json == previous


def test_extra_actual_sets_are_saved_without_changing_template(journal):
    """A fourth set belongs to today's result and can improve its estimate."""
    app, client, headers, template, body = journal
    body["exercises"][0]["sets"].append({"weight": 100, "reps": 1, "rpe": None})
    result = client.post("/api/sessions", json=body, headers=headers)
    assert result.status_code == 201
    exercise = result.json["exercises"][0]
    assert exercise["plannedSets"] == 3
    assert len(exercise["sets"]) == 4
    assert exercise["estimated1rm"] == 100
    assert client.get("/api/state").json["templates"] == [template]
    assert client.post("/api/sessions", json=body, headers=headers).json == result.json
    stats = client.get("/api/exercises/bench-press/stats").json
    assert stats["best"] == 100
    assert len(stats["last"]["sets"]) == 3


def test_extra_blank_rows_require_results_or_explicit_skip(journal):
    """An accidental blank addition can be skipped without inventing actuals."""
    app, client, headers, template, body = journal
    body["exercises"][0]["sets"].append({})
    assert client.post("/api/sessions", json=body, headers=headers).status_code == 400
    body["exercises"][0]["sets"][-1] = {"skipped": True}
    result = client.post("/api/sessions", json=body, headers=headers)
    assert result.status_code == 201
    assert result.json["exercises"][0]["sets"][-1] == {"skipped": True}


@pytest.mark.parametrize("count, expected", [(2, 400), (20, 201), (21, 400)])
def test_total_rows_keep_every_planned_set_and_stay_within_limit(journal, count, expected):
    """Extras do not permit removing planned rows or exceeding twenty total rows."""
    app, client, headers, template, body = journal
    body["exercises"][0]["sets"] = [{"weight": 60, "reps": 8, "rpe": None}] * count
    assert client.post("/api/sessions", json=body, headers=headers).status_code == expected
