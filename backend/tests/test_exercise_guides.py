"""How-to guides: steps from exercise_guides.json, photos in frontend/public (spec 24)."""

import json
from pathlib import Path

import pytest

from gymlog import create_app

BACKEND = Path(__file__).resolve().parents[1]
PUBLIC = BACKEND.parent / "frontend" / "public"
GUIDES = json.loads((BACKEND / "gymlog" / "exercise_guides.json").read_text(encoding="utf-8"))
CATALOGUE = json.loads((BACKEND / "gymlog" / "exercises.json").read_text(encoding="utf-8"))
NO_FAIR_EQUIVALENT = [
    "paused-bench-press",
    "spoto-bench-press",
    "larsen-bench-press",
    "cable-lateral-raise",
    "bulgarian-split-squat",
    "one-leg-hip-thrusts",
]


@pytest.fixture
def app(tmp_path):
    return create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-only-secret-key",
            "DATABASE": str(tmp_path / "test.sqlite3"),
            # Vite copies public/ into the build unchanged, so it stands in for dist/ here.
            "FRONTEND_DIST": PUBLIC,
        }
    )


@pytest.fixture
def client(app):
    client = app.test_client()
    token = client.get("/api/session").json["csrf"]
    client.post(
        "/api/register",
        json={"username": "nick", "password": "test-only-password"},
        headers={"X-CSRF-Token": token},
    )
    return client


def test_every_guide_is_complete():
    active = {exercise["id"] for exercise in CATALOGUE if not exercise.get("retired")}
    for exercise_id, guide in GUIDES.items():
        assert exercise_id in active, exercise_id
        assert guide["source"], exercise_id
        assert len(guide["steps"]) >= 1, exercise_id
        for step in guide["steps"]:
            assert isinstance(step, str) and step.strip(), exercise_id
        for number in (0, 1):
            assert (PUBLIC / "exercise-images" / exercise_id / f"{number}.jpg").is_file(), (
                exercise_id
            )


def test_almost_every_exercise_has_a_guide():
    assert len(GUIDES) >= 640
    for exercise_id in NO_FAIR_EQUIVALENT:
        assert exercise_id not in GUIDES


def test_guide_has_steps_and_served_photos(client):
    response = client.get("/api/exercises/bench-press/guide")
    assert response.status_code == 200
    assert response.json["steps"] == GUIDES["bench-press"]["steps"]
    assert response.json["images"] == [
        "/exercise-images/bench-press/0.jpg",
        "/exercise-images/bench-press/1.jpg",
    ]
    photo = client.get(response.json["images"][0])
    assert photo.status_code == 200
    assert photo.mimetype == "image/jpeg"


def test_exercise_without_guide_has_empty_lists(client):
    response = client.get("/api/exercises/spoto-bench-press/guide")
    assert response.status_code == 200
    assert response.json == {"steps": [], "images": []}


def test_unknown_exercise_is_not_found(client):
    response = client.get("/api/exercises/not-real/guide")
    assert response.status_code == 404
    assert response.json["error"].endswith(".")


def test_signed_out_is_refused(app):
    assert app.test_client().get("/api/exercises/bench-press/guide").status_code == 401
