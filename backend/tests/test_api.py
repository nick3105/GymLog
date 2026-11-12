"""Integration checks use a temporary private database and two browser sessions."""

import sqlite3
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path
from uuid import uuid4

from werkzeug.security import generate_password_hash

from gymlog import create_app
from gymlog.models import estimated_1rm


class JournalTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.password = "test-only-password-for-temp-db"

    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.config = {
            "TESTING": True,
            "SECRET_KEY": "test-only-secret-key",
            "SESSION_COOKIE_SECURE": False,
            "DATABASE": str(Path(self.folder.name) / "test.sqlite3"),
        }
        self.app = create_app(self.config)
        self.client = self.app.test_client()
        self.token = self.register(self.client, "nick", self.password)

    def tearDown(self):
        self.folder.cleanup()

    def register(self, client, username, password):
        token = client.get("/api/session").json["csrf"]
        response = client.post(
            "/api/register",
            json={"username": username, "password": password},
            headers={"X-CSRF-Token": token},
        )
        self.assertEqual(response.status_code, 201, response.json)
        return response.json["csrf"]

    def login(self, client, username="nick", password=None):
        token = client.get("/api/session").json["csrf"]
        response = client.post(
            "/api/login",
            json={"username": username, "password": password or self.password},
            headers={"X-CSRF-Token": token},
        )
        self.assertEqual(response.status_code, 200, response.json)
        return response.json["csrf"]

    def post(self, path, body):
        return self.client.post(path, json=body, headers={"X-CSRF-Token": self.token})

    def test_retired_exercises_keep_existing_workouts_usable(self):
        """Hide retired choices while preserving their saved-workout compatibility."""
        exercises = self.client.get("/api/state").json["exercises"]
        names = {exercise["id"]: exercise["name"] for exercise in exercises}
        self.assertEqual(names["larsen-bench-press"], "Larsen Bench Press")
        self.assertEqual(names["close-grip-front-lat-pulldown"], "Lat Pulldown Close Grip")
        self.assertEqual(names["lat-pulldown-wide-grip"], "Lat Pulldown Wide Grip")
        self.assertEqual(names["one-leg-hip-thrusts"], "One Leg Hip Thrusts")
        self.assertIn("bench-press", names)
        self.assertNotIn("bench-press-powerlifting", names)
        response = self.post(
            "/api/templates",
            {
                "name": "Existing powerlifting workout",
                "exercises": [{"id": "bench-press-powerlifting", "sets": 1, "targetReps": 5}],
            },
        )
        self.assertEqual(response.status_code, 201, response.json)
        self.assertEqual(response.json["exercises"][0]["id"], "bench-press-powerlifting")
        self.assertEqual(
            self.client.get("/api/exercises/bench-press-powerlifting/stats").status_code,
            200,
        )

    def template(self):
        response = self.post(
            "/api/templates",
            {
                "name": "Upper A",
                "exercises": [
                    {"id": "bench-press", "sets": 2, "targetReps": 8, "targetWeight": 60},
                    {"id": "barbell-row", "sets": 1, "targetReps": 10, "targetWeight": None},
                ],
            },
        )
        self.assertEqual(response.status_code, 201, response.json)
        return response.json

    def session(self, template):
        return {
            "clientId": str(uuid4()),
            "templateId": template["id"],
            "day": "2026-11-06",
            "exercises": [
                {
                    "id": "bench-press",
                    "sets": [
                        {"weight": 60, "reps": 8, "rpe": None},
                        {"weight": 62.5, "reps": 8, "rpe": 8.5},
                    ],
                },
                {"id": "barbell-row", "sets": [{"weight": 50, "reps": 10, "rpe": ""}]},
            ],
        }

    def test_two_devices_and_server_restart_keep_actuals_and_template(self):
        template = self.template()
        payload = self.session(template)
        saved = self.post("/api/sessions", payload)
        self.assertEqual(saved.status_code, 201, saved.json)
        self.assertEqual(saved.json["exercises"][0]["estimated1rm"], 82.3)
        self.assertIsNone(saved.json["exercises"][0]["sets"][0]["rpe"])
        self.assertIsNone(saved.json["exercises"][1]["sets"][0]["rpe"])
        phone = self.app.test_client()
        self.login(phone)
        state = phone.get("/api/state").json
        self.assertEqual(state["sessions"][0], saved.json)
        self.assertEqual(state["templates"][0], template)
        restarted = create_app(self.config).test_client()
        self.login(restarted)
        self.assertEqual(restarted.get("/api/state").json["sessions"][0], saved.json)
        self.assertEqual(self.post("/api/sessions", payload).json["id"], saved.json["id"])
        payload["exercises"][0]["sets"][0]["weight"] = 70
        self.assertEqual(self.post("/api/sessions", payload).status_code, 409)
        self.assertEqual(len(restarted.get("/api/state").json["sessions"]), 1)

    def test_authentication_csrf_and_logout(self):
        stranger = self.app.test_client()
        self.assertEqual(stranger.get("/api/state").status_code, 401)
        self.assertEqual(stranger.post("/api/templates", json={}).status_code, 403)
        self.assertEqual(self.client.post("/api/templates", json={}).status_code, 403)
        self.assertEqual(self.client.get("/instance/settings.json").status_code, 404)
        self.assertEqual(self.client.get("/assets/../instance/settings.json").status_code, 404)
        response = self.client.get("/api/state")
        self.assertEqual(response.headers["Cache-Control"], "no-store")
        self.assertIn("frame-ancestors 'none'", response.headers["Content-Security-Policy"])
        self.assertEqual(self.post("/api/logout", {}).status_code, 200)
        self.assertEqual(self.client.get("/api/state").status_code, 401)

    def test_invalid_inputs_never_save(self):
        for exercises in [[], [{"id": []}], [{"id": "not-real"}]]:
            self.assertEqual(
                self.post(
                    "/api/templates", {"name": "Invalid", "exercises": exercises}
                ).status_code,
                400,
            )
        template = self.template()
        base = self.session(template)
        for value in [None, "", -1, 1001, True, "NaN"]:
            payload = deepcopy(base)
            payload["exercises"][0]["sets"][0]["weight"] = value
            self.assertEqual(self.post("/api/sessions", payload).status_code, 400, value)
        for value in [0, 101, 2.5, "", None]:
            payload = deepcopy(base)
            payload["exercises"][0]["sets"][0]["reps"] = value
            self.assertEqual(self.post("/api/sessions", payload).status_code, 400, value)
        for value in [0, 10.5, 7.2, "NaN"]:
            payload = deepcopy(base)
            payload["exercises"][0]["sets"][0]["rpe"] = value
            self.assertEqual(self.post("/api/sessions", payload).status_code, 400, value)
        payload = deepcopy(base)
        payload["exercises"][0]["sets"].pop()
        self.assertEqual(self.post("/api/sessions", payload).status_code, 400)
        self.assertEqual(self.client.get("/api/state").json["sessions"], [])

    def test_login_attempt_limit_is_persistent(self):
        other = self.app.test_client()
        token = other.get("/api/session").json["csrf"]
        for _ in range(10):
            result = other.post(
                "/api/login",
                json={"username": "nick", "password": "wrong"},
                headers={"X-CSRF-Token": token},
            )
            self.assertEqual(result.status_code, 401)
        restarted = create_app(self.config).test_client()
        token = restarted.get("/api/session").json["csrf"]
        self.assertEqual(
            restarted.post(
                "/api/login",
                json={"username": "nick", "password": self.password},
                headers={"X-CSRF-Token": token},
            ).status_code,
            429,
        )

    def test_registration_rules(self):
        stranger = self.app.test_client()
        token = stranger.get("/api/session").json["csrf"]
        for body, status in [
            ({"username": "NICK", "password": "another-long-password"}, 409),
            ({"username": "a b", "password": "another-long-password"}, 400),
            ({"username": "ab", "password": "another-long-password"}, 400),
            ({"username": "martin", "password": "too-short"}, 400),
            ({"username": "martin"}, 400),
        ]:
            result = stranger.post("/api/register", json=body, headers={"X-CSRF-Token": token})
            self.assertEqual(result.status_code, status, body)
        self.assertFalse(stranger.get("/api/session").json["authenticated"])
        self.login(stranger, "Nick ")
        self.assertEqual(stranger.get("/api/session").json["username"], "nick")

    def test_users_are_isolated(self):
        template = self.template()
        self.post("/api/weights", {"day": "2026-11-06", "kg": 80})
        martin = self.app.test_client()
        headers = {"X-CSRF-Token": self.register(martin, "Martin", "martin-test-password")}
        state = martin.get("/api/state").json
        self.assertEqual((state["templates"], state["sessions"], state["weights"]), ([], [], []))
        self.assertEqual(martin.get("/api/session").json["username"], "martin")
        foreign = martin.post("/api/sessions", json=self.session(template), headers=headers)
        self.assertEqual(foreign.status_code, 404)
        weight = {"day": "2026-11-06", "kg": 70}
        self.assertEqual(martin.post("/api/weights", json=weight, headers=headers).status_code, 200)
        self.assertEqual(self.client.get("/api/state").json["weights"][0]["kg"], 80)
        self.assertEqual(self.client.get("/api/state").json["templates"], [template])
        phone = self.app.test_client()
        self.login(phone, "martin", "martin-test-password")
        self.assertEqual(phone.get("/api/state").json["weights"], [weight])

    def test_password_change_signs_out_other_devices(self):
        with sqlite3.connect(self.config["DATABASE"]) as db:
            db.execute(
                "UPDATE users SET password_hash=? WHERE username='nick'",
                (generate_password_hash("a-brand-new-password"),),
            )
        self.assertEqual(self.client.get("/api/state").status_code, 401)

    def test_per_set_targets_and_optional_rpe(self):
        targets = [{"reps": 3, "weight": 100, "rpe": 9}, {"reps": 8, "weight": 80, "rpe": None}]
        body = {"name": "Top and backoff", "exercises": [{"id": "bench-press", "targets": targets}]}
        result = self.post("/api/templates", body)
        self.assertEqual(result.status_code, 201)
        self.assertEqual(result.json["exercises"][0]["sets"], 2)
        self.assertEqual(result.json["exercises"][0]["targets"], targets)
        self.assertEqual(
            self.client.get("/api/state").json["templates"][0]["exercises"][0]["targets"], targets
        )
        targets[0]["rpe"] = 8.3
        self.assertEqual(self.post("/api/templates", body).status_code, 400)

    def test_weight_upsert_and_access(self):
        payload = {"day": "2026-11-06", "kg": 80.2}
        self.assertEqual(self.post("/api/weights", payload).status_code, 200)
        payload["kg"] = 80.5
        self.assertEqual(self.post("/api/weights", payload).status_code, 200)
        self.assertEqual(self.post("/api/weights", {"day": "invalid", "kg": 80}).status_code, 400)
        phone = create_app(self.config).test_client()
        self.assertEqual(phone.get("/api/state").status_code, 401)
        self.login(phone)
        self.assertEqual(phone.get("/api/state").json["weights"], [payload])

    def test_estimate_rules(self):
        self.assertEqual(estimated_1rm(80, 5, 8), 98.7)
        self.assertEqual(estimated_1rm(80, 5, 10), 93.3)
        self.assertEqual(estimated_1rm(80, 9, 7), 106.7)
        self.assertEqual(estimated_1rm(80, 5), 93.3)
        self.assertEqual(estimated_1rm(100, 1), 100)
        self.assertIsNone(estimated_1rm(80, 11))
        self.assertIsNone(estimated_1rm(0, 8))


if __name__ == "__main__":
    unittest.main()
