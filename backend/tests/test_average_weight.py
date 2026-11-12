"""Average load per completed set is separate from estimated strength (spec 28)."""

from test_exercise_stats import register, save_workout

from gymlog.models import exercise_stats

pytest_plugins = ["test_exercise_stats"]


def test_average_weight_endpoint_includes_high_reps_and_zero_load(client, app):
    """Use equal set weights and keep each user's history private."""
    save_workout(client, "Mixed loads", "2026-11-01", {"bench-press": [(60, 2, None), (80, 15, 8)]})
    save_workout(
        client, "Bodyweight", "2026-11-02", {"bench-press": [(0, 8, None), (80, 12, None)]}
    )
    url = "/api/exercises/bench-press/stats"
    result = client.get(url + "?include=average-weight").json
    assert result["averageWeight"] == {
        "points": [{"day": "2026-11-01", "weight": 70}, {"day": "2026-11-02", "weight": 40}],
        "best": 70,
        "latest": 40,
    }
    default = client.get(url).json
    assert "averageWeight" not in default
    assert {key: result[key] for key in default} == default

    stranger = app.test_client()
    stranger.token = register(stranger, "stranger")
    assert stranger.get(url + "?include=average-weight").json["averageWeight"] == {
        "points": [],
        "best": None,
        "latest": None,
    }
    assert app.test_client().get(url + "?include=average-weight").status_code == 401


def test_skips_timed_sets_rounding_and_same_day_order():
    """Calculate old JSON snapshots without counting skips or seconds as load."""
    sessions = [
        {
            "day": "2026-11-01",
            "completedAt": "2026-11-01T12:00:00Z",
            "exercises": [
                {
                    "id": "press",
                    "sets": [
                        {"weight": 80, "reps": 15},
                        {"weight": 0, "reps": 8},
                        {"skipped": True},
                        {"durationSeconds": 60},
                    ],
                }
            ],
        },
        {
            "day": "2026-11-01",
            "completedAt": "2026-11-01T10:00:00Z",
            "exercises": [
                {
                    "id": "press",
                    "sets": [
                        {"weight": 60, "reps": 5},
                        {"weight": 60, "reps": 5},
                        {"weight": 61, "reps": 5},
                    ],
                }
            ],
        },
        {
            "day": "2026-11-02",
            "completedAt": "2026-11-02T12:00:00Z",
            "exercises": [{"id": "press", "sets": [{"skipped": True}, {"durationSeconds": 30}]}],
        },
    ]
    assert exercise_stats(sessions, "press", True)["averageWeight"] == {
        "points": [{"day": "2026-11-01", "weight": 60.3}, {"day": "2026-11-01", "weight": 40}],
        "best": 60.3,
        "latest": 40,
    }
