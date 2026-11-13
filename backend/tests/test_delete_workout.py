"""Deleting a saved routine never deletes history or another user's data."""

from uuid import uuid4

import pytest

from gymlog import create_app


@pytest.fixture
def journal(tmp_path, monkeypatch):
    """Use a disposable journal, including a routine with completed history."""
    monkeypatch.setenv("GYMLOG_INSTANCE", str(tmp_path))
    app = create_app(
        {"TESTING": True, "SECRET_KEY": "delete-test", "DATABASE": str(tmp_path / "test.db")}
    )
    browser = app.test_client()
    token = browser.get("/api/session").json["csrf"]
    account = browser.post(
        "/api/register",
        json={"username": "alice", "password": "temporary-test-password"},
        headers={"X-CSRF-Token": token},
    )
    headers = {"X-CSRF-Token": account.json["csrf"]}
    body = {
        "name": "Upper A",
        "exercises": [{"id": "bench-press", "targets": [{"reps": 8, "weight": 60, "rpe": 8}]}],
    }
    template = browser.post("/api/templates", json=body, headers=headers).json
    body["name"] = "Upper B"
    keep = browser.post("/api/templates", json=body, headers=headers).json
    completed = browser.post(
        "/api/sessions",
        json={
            "clientId": str(uuid4()),
            "templateId": template["id"],
            "day": "2026-11-11",
            "exercises": [{"id": "bench-press", "sets": [{"reps": 8, "weight": 60, "rpe": 8}]}],
        },
        headers=headers,
    )
    assert completed.status_code == 201
    return app, browser, headers, template, keep, completed.json


def test_delete_only_selected_template_preserves_history_and_progress(journal):
    """Remove the selected routine while its actual results and estimates remain."""
    app, browser, headers, template, keep, completed = journal
    stats = browser.get("/api/exercises/bench-press/stats").json
    result = browser.post(f"/api/templates/{template['id']}/delete", json={}, headers=headers)
    assert result.status_code == 200
    assert result.json == {"ok": True}
    state = browser.get("/api/state").json
    assert state["templates"] == [keep]
    assert state["sessions"] == [completed]
    assert browser.get("/api/exercises/bench-press/stats").json == stats
    again = browser.post(f"/api/templates/{template['id']}/delete", json={}, headers=headers)
    assert again.status_code == 404
    assert again.json["error"] == "That workout template could not be found."


def test_delete_requires_signin_csrf_and_ownership(journal):
    """No client can delete another owner's routine or bypass write protection."""
    app, browser, headers, template, keep, completed = journal
    path = f"/api/templates/{template['id']}/delete"
    assert browser.post(path, json={}).status_code == 403
    other = app.test_client()
    token = other.get("/api/session").json["csrf"]
    other_headers = {"X-CSRF-Token": token}
    assert other.post(path, json={}, headers=other_headers).status_code == 401
    account = other.post(
        "/api/register",
        json={"username": "bob", "password": "temporary-test-password"},
        headers=other_headers,
    )
    other_headers = {"X-CSRF-Token": account.json["csrf"]}
    foreign = other.post(path, json={}, headers=other_headers)
    missing = other.post("/api/templates/missing/delete", json={}, headers=other_headers)
    assert foreign.status_code == missing.status_code == 404
    assert foreign.json == missing.json
    state = browser.get("/api/state").json
    assert {item["id"] for item in state["templates"]} == {template["id"], keep["id"]}
    assert state["sessions"] == [completed]
