"""Updating a routine preserves its identity, history and owner isolation."""

import pytest

from gymlog import create_app


@pytest.fixture
def client(tmp_path, monkeypatch):
    """Create a signed-in journal without reading private instance settings."""
    monkeypatch.setenv("GYMLOG_INSTANCE", str(tmp_path))
    app = create_app(
        {"TESTING": True, "SECRET_KEY": "test-only", "DATABASE": str(tmp_path / "test.db")}
    )
    client = app.test_client()
    token = client.get("/api/session").json["csrf"]
    result = client.post(
        "/api/register",
        json={"username": "alice", "password": "test-password-long"},
        headers={"X-CSRF-Token": token},
    )
    return app, client, {"X-CSRF-Token": result.json["csrf"]}


def workout(name="Upper A"):
    """Return a routine with individual set targets."""
    return {
        "name": name,
        "exercises": [{"id": "bench-press", "targets": [{"reps": 8, "weight": 60, "rpe": None}]}],
    }


def test_update_preserves_history_and_identity(client):
    """Future workouts change while completed snapshots stay identical."""
    app, browser, headers = client
    template = browser.post("/api/templates", json=workout(), headers=headers).json
    saved = browser.post(
        "/api/sessions",
        json={
            "clientId": "12345678-1234-4234-8234-123456789012",
            "templateId": template["id"],
            "day": "2026-11-10",
            "exercises": [{"id": "bench-press", "sets": [{"weight": 60, "reps": 8, "rpe": None}]}],
        },
        headers=headers,
    )
    assert saved.status_code == 201
    changed = workout("Upper B")
    changed["exercises"].append(
        {"id": "barbell-row", "targets": [{"reps": 5, "weight": 40, "rpe": 8}]}
    )
    response = browser.post(f"/api/templates/{template['id']}", json=changed, headers=headers)
    assert response.status_code == 200
    assert response.json["id"] == template["id"]
    assert response.json["createdAt"] == template["createdAt"]
    state = browser.get("/api/state").json
    assert state["templates"] == [response.json]
    assert state["templates"][0]["name"] == "Upper B"
    assert state["templates"][0]["exercises"][1]["targets"][0]["reps"] == 5
    assert state["sessions"] == [saved.json]


def test_reorder_saved_template_keeps_targets_and_completed_history(client):
    """An edited order affects the same routine, never completed session snapshots."""
    app, browser, headers = client
    body = workout()
    body["exercises"].append(
        {"id": "barbell-row", "targets": [{"reps": 5, "weight": 40, "rpe": 8}]}
    )
    template = browser.post("/api/templates", json=body, headers=headers).json
    completed = browser.post(
        "/api/sessions",
        json={
            "clientId": "12345678-1234-4234-8234-123456789013",
            "templateId": template["id"],
            "day": "2026-11-11",
            "exercises": [
                {"id": item["id"], "sets": item["targets"]} for item in body["exercises"]
            ],
        },
        headers=headers,
    )
    assert completed.status_code == 201
    body["exercises"].reverse()
    updated = browser.post(f"/api/templates/{template['id']}", json=body, headers=headers)
    assert updated.status_code == 200
    reloaded = browser.get("/api/state").json
    assert len(reloaded["templates"]) == 1
    assert reloaded["templates"][0]["id"] == template["id"]
    assert reloaded["templates"][0]["exercises"] == list(reversed(template["exercises"]))
    assert reloaded["sessions"] == [completed.json]


def test_update_refuses_invalid_foreign_and_unprotected_requests(client):
    """An update cannot overwrite another journal or bypass validation and CSRF."""
    app, browser, headers = client
    template = browser.post("/api/templates", json=workout(), headers=headers).json
    path = f"/api/templates/{template['id']}"
    assert browser.post(path, json=workout()).status_code == 403
    assert browser.post(path, json=workout(""), headers=headers).status_code == 400
    assert (
        browser.post("/api/templates/missing", json=workout(), headers=headers).status_code == 404
    )
    other = app.test_client()
    token = other.get("/api/session").json["csrf"]
    assert other.post(path, json=workout(), headers={"X-CSRF-Token": token}).status_code == 401
    result = other.post(
        "/api/register",
        json={"username": "bob", "password": "test-password-long"},
        headers={"X-CSRF-Token": token},
    )
    assert (
        other.post(
            path, json=workout("Stolen"), headers={"X-CSRF-Token": result.json["csrf"]}
        ).status_code
        == 404
    )
    assert browser.get("/api/state").json["templates"] == [template]
