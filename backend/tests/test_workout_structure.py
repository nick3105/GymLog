"""Superset snapshots and optional reminders preserve identities and existing journals."""

from copy import deepcopy
from uuid import uuid4

import pytest

pytest_plugins = ["test_skip_sets"]


def workout_document():
    """Prepare a mixed workout with a two-exercise superset and two reminders."""
    return {
        "name": "Paired upper",
        "warmup": "  Bike gently  ",
        "cooldown": "Stretch comfortably",
        "exercises": [
            {"id": "bench-press", "supersetId": "pair-a", "targets": [{"reps": 8, "weight": 60}]},
            {"id": "barbell-row", "supersetId": "pair-a", "targets": [{"reps": 10, "weight": 40}]},
            {"id": "plank", "targets": [{"durationSeconds": 60}]},
        ],
    }


def save_plan(client, headers):
    """Save a paired template through its normal authenticated endpoint."""
    response = client.post("/api/templates", json=workout_document(), headers=headers)
    assert response.status_code == 201
    return response.json


def session_document(template):
    """Prepare actual results with unchanged flat exercise identities."""
    return {
        "clientId": str(uuid4()),
        "templateId": template["id"],
        "day": "2026-01-01",
        "warmup": "Bike gently",
        "cooldown": "Stretch comfortably",
        "warmupDone": True,
        "cooldownDone": False,
        "exercises": [
            {"id": "bench-press", "supersetId": "pair-a", "sets": [{"weight": 60, "reps": 8}]},
            {"id": "barbell-row", "supersetId": "pair-a", "sets": [{"weight": 40, "reps": 10}]},
            {"id": "plank", "sets": [{"durationSeconds": 50}]},
        ],
    }


def test_structure_snapshots_retry_corrections_and_template_edits(journal):
    """Preserve pairs and reminders independently of subsequent plan changes."""
    _, client, headers, _, _ = journal
    template = save_plan(client, headers)
    assert template["warmup"] == "Bike gently"
    body = session_document(template)
    response = client.post("/api/sessions", json=body, headers=headers)
    assert response.status_code == 201
    saved = response.json
    assert saved["warmupDone"] is True
    assert saved["cooldownDone"] is False
    assert [exercise.get("supersetId") for exercise in saved["exercises"]] == [
        "pair-a",
        "pair-a",
        None,
    ]
    assert sum(len(exercise["sets"]) for exercise in saved["exercises"]) == 3
    assert client.post("/api/sessions", json=body, headers=headers).json == saved
    body["cooldownDone"] = True
    assert client.post("/api/sessions", json=body, headers=headers).status_code == 409

    changed = workout_document()
    changed["warmup"] = ""
    changed["cooldown"] = ""
    for exercise in changed["exercises"]:
        exercise.pop("supersetId", None)
    edited_plan = client.post(f"/api/templates/{template['id']}", json=changed, headers=headers)
    assert edited_plan.status_code == 200
    assert edited_plan.json["warmup"] == ""
    assert "supersetId" not in edited_plan.json["exercises"][0]
    assert client.get("/api/state").json["sessions"] == [saved]

    correction = {
        "day": body["day"],
        "timezoneOffset": 0,
        "cooldownDone": True,
        "warmup": "A forged replacement",
        "exercises": deepcopy(saved["exercises"]),
    }
    correction["exercises"][0]["sets"][0]["weight"] = 62.5
    result = client.post(f"/api/sessions/{saved['id']}", json=correction, headers=headers)
    assert result.status_code == 200
    assert result.json["cooldownDone"] is True
    assert result.json["warmupDone"] is True
    assert result.json["warmup"] == "Bike gently"
    assert result.json["exercises"][0]["supersetId"] == "pair-a"


@pytest.mark.parametrize(
    "groups",
    [
        ["alone", None, None],
        ["a", None, "a"],
        ["a", "a", "a"],
        [42, 42, None],
        [["a"], ["a"], None],
        ["bad space", "bad space", None],
    ],
)
def test_invalid_grouping_is_rejected_without_saving(journal, groups):
    """Reject orphan, separated, oversized and malformed superset groups."""
    _, client, headers, _, _ = journal
    body = workout_document()
    for exercise, group in zip(body["exercises"], groups, strict=True):
        exercise["supersetId"] = group
    response = client.post("/api/templates", json=body, headers=headers)
    assert response.status_code == 400
    assert "superset" in response.json["error"].lower()


def test_group_cannot_be_forged_in_actual_results(journal):
    """Use plan membership rather than client-provided session membership."""
    _, client, headers, _, _ = journal
    template = save_plan(client, headers)
    body = session_document(template)
    body["exercises"][0]["supersetId"] = "forged"
    assert client.post("/api/sessions", json=body, headers=headers).status_code == 400


@pytest.mark.parametrize("field", ["warmup", "cooldown"])
def test_reminder_unicode_limit_and_type(journal, field):
    """Count supplementary Unicode characters as code points on the API."""
    _, client, headers, _, _ = journal
    body = workout_document()
    body[field] = "🔥" * 100
    assert client.post("/api/templates", json=body, headers=headers).status_code == 201
    for invalid in ("🔥" * 101, 12, None, []):
        body[field] = invalid
        response = client.post("/api/templates", json=body, headers=headers)
        assert response.status_code == 400
        assert field in response.json["error"].lower()


@pytest.mark.parametrize("value", [1, "true", None, []])
def test_done_requires_boolean(journal, value):
    """Reject ambiguous checkbox representations without saving."""
    _, client, headers, _, _ = journal
    template = save_plan(client, headers)
    body = session_document(template)
    body["warmupDone"] = value
    assert client.post("/api/sessions", json=body, headers=headers).status_code == 400
    assert client.get("/api/state").json["sessions"] == []


def test_reminder_alone_cannot_complete_workout(journal):
    """Reminder completion creates no exercise performance."""
    _, client, headers, _, _ = journal
    template = save_plan(client, headers)
    body = session_document(template)
    for exercise in body["exercises"]:
        exercise["sets"] = [{"skipped": True}]
    response = client.post("/api/sessions", json=body, headers=headers)
    assert response.status_code == 400
    assert "at least one set" in response.json["error"]


def test_structure_is_private_and_old_documents_still_save(journal):
    """Keep journal access scoped and accept absent reminder and grouping fields."""
    app, client, headers, old_template, old_body = journal
    template = save_plan(client, headers)
    assert client.post("/api/sessions", json=old_body, headers=headers).status_code == 201
    stranger = app.test_client()
    token = stranger.get("/api/session").json["csrf"]
    user = stranger.post(
        "/api/register",
        json={"username": "outsider", "password": "temporary-test-password"},
        headers={"X-CSRF-Token": token},
    )
    other_headers = {"X-CSRF-Token": user.json["csrf"]}
    assert stranger.get("/api/state").json["templates"] == []
    assert (
        stranger.post(
            "/api/sessions", json=session_document(template), headers=other_headers
        ).status_code
        == 404
    )
    assert (
        stranger.post(
            f"/api/templates/{template['id']}", json=workout_document(), headers=other_headers
        ).status_code
        == 404
    )
