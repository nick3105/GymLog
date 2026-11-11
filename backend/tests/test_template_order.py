"""The builder's chosen order survives saving, reload and workout execution."""

from uuid import uuid4

from gymlog import create_app


def test_saved_order_and_targets_survive_starting_a_session(tmp_path, monkeypatch):
    """Keep two distinct bench targets attached while saving a reordered routine."""
    monkeypatch.setenv("GYMLOG_INSTANCE", str(tmp_path))
    app = create_app(
        {"TESTING": True, "SECRET_KEY": "order-test", "DATABASE": str(tmp_path / "test.db")}
    )
    client = app.test_client()
    token = client.get("/api/session").json["csrf"]
    account = client.post(
        "/api/register",
        json={"username": "order-test", "password": "temporary-test-password"},
        headers={"X-CSRF-Token": token},
    )
    headers = {"X-CSRF-Token": account.json["csrf"]}
    targets = [{"reps": 3, "weight": 100, "rpe": 9}, {"reps": 8, "weight": 80, "rpe": None}]
    exercises = [
        {"id": "deadlift", "targets": [{"reps": 5, "weight": 120, "rpe": None}]},
        {"id": "squat", "targets": [{"reps": 5, "weight": 90, "rpe": None}]},
        {"id": "bench-press", "targets": targets},
    ]
    saved = client.post(
        "/api/templates", json={"name": "Reordered", "exercises": exercises}, headers=headers
    )
    assert saved.status_code == 201
    template = client.get("/api/state").json["templates"][0]
    assert [item["id"] for item in template["exercises"]] == ["deadlift", "squat", "bench-press"]
    assert template["exercises"][2]["targets"] == targets
    actuals = []
    for exercise in exercises:
        actuals.append({"id": exercise["id"], "sets": exercise["targets"]})
    session = client.post(
        "/api/sessions",
        json={
            "clientId": str(uuid4()),
            "templateId": template["id"],
            "day": "2026-11-11",
            "exercises": actuals,
        },
        headers=headers,
    )
    assert session.status_code == 201
    assert [item["id"] for item in session.json["exercises"]] == [
        "deadlift",
        "squat",
        "bench-press",
    ]
    assert session.json["exercises"][2]["sets"] == targets
