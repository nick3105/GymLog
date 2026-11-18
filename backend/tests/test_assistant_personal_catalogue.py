"""Assistant integration with the owner-scoped personal exercise catalogue."""

import json
from uuid import uuid4

import pytest
from test_assistant import client as client
from test_assistant import request_body

from gymlog import assistant


@pytest.mark.parametrize("other_user", [False, True])
def test_personal_exercise_context_and_drafts_stay_with_owner(client, monkeypatch, other_user):
    """Accept an owner's private draft but reject its ID for another account."""
    app, browser, headers = client
    created = browser.post(
        "/api/exercises/personal",
        json={
            "requestId": str(uuid4()),
            "name": "Private balance hold",
            "group": "Core",
            "measurement": "duration",
        },
        headers=headers,
    )
    assert created.status_code == 201
    exercise_id = created.json["id"]
    draft = {
        "name": "Balance",
        "exercises": [{"id": exercise_id, "targets": [{"durationSeconds": 30}]}],
    }
    if other_user:
        browser = app.test_client()
        csrf = browser.get("/api/session").json["csrf"]
        registered = browser.post(
            "/api/register",
            json={"username": "bob", "password": "test-password-long"},
            headers={"X-CSRF-Token": csrf},
        )
        headers = {"X-CSRF-Token": registered.json["csrf"]}
    captured = []

    def capture(key, model, messages):
        """Inspect outgoing context and propose the same private exercise."""
        captured.extend(messages)
        return json.dumps({"reply": "Try this balance drill.", "plans": [draft]})

    monkeypatch.setattr(assistant, "complete", capture)
    response = browser.post(
        "/api/assistant", json={**request_body(), "draft": draft}, headers=headers
    )
    if other_user:
        assert response.status_code == 400
        assert captured == []
        # A valid chat must also omit another owner's private catalogue entry.
        browser.post("/api/assistant", json=request_body(), headers=headers)
        assert exercise_id not in {
            item["id"] for item in json.loads(captured[1]["content"])["catalogue"]
        }
    else:
        assert response.status_code == 200
        context = json.loads(captured[1]["content"])
        assert context["currentDraft"]["exercises"][0]["id"] == exercise_id
        assert exercise_id in {item["id"] for item in context["catalogue"]}
        suggested = response.json["plans"][0]
        assert suggested["exercises"][0]["source"] == "personal"
        assert browser.post("/api/templates", json=suggested, headers=headers).status_code == 201
