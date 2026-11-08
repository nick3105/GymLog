"""Integration checks use a temporary private database and two browser sessions."""
from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest
from uuid import uuid4

from werkzeug.security import generate_password_hash
from app import create_app
from models import estimated_1rm


class JournalTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.password = "test-only-password-for-temp-db"
        cls.password_hash = generate_password_hash(cls.password)

    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.config = {"TESTING": True, "SECRET_KEY": "test-only-secret-key",
                       "OWNER_PASSWORD_HASH": self.password_hash,
                       "SESSION_COOKIE_SECURE": False,
                       "DATABASE": str(Path(self.folder.name) / "test.sqlite3")}
        self.app = create_app(self.config)
        self.client = self.app.test_client()
        self.token = self.login(self.client)

    def tearDown(self):
        self.folder.cleanup()

    def login(self, client):
        token = client.get("/api/session").json["csrf"]
        response = client.post("/api/login", json={"password": self.password}, headers={"X-CSRF-Token": token})
        self.assertEqual(response.status_code, 200)
        return response.json["csrf"]

    def post(self, path, body):
        return self.client.post(path, json=body, headers={"X-CSRF-Token": self.token})

    def template(self):
        response = self.post("/api/templates", {"name": "Upper A", "exercises": [
            {"id": "bench-press", "sets": 2, "targetReps": 8, "targetWeight": 60},
            {"id": "barbell-row", "sets": 1, "targetReps": 10, "targetWeight": None}]})
        self.assertEqual(response.status_code, 201, response.json)
        return response.json

    def session(self, template):
        return {"clientId": str(uuid4()), "templateId": template["id"], "day": "2026-11-06", "exercises": [
            {"id": "bench-press", "sets": [{"weight": 60, "reps": 8, "rpe": None}, {"weight": 62.5, "reps": 8, "rpe": 8.5}]},
            {"id": "barbell-row", "sets": [{"weight": 50, "reps": 10, "rpe": ""}]}]}

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
            self.assertEqual(self.post("/api/templates", {"name": "Invalid", "exercises": exercises}).status_code, 400)
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
        payload = deepcopy(base); payload["exercises"][0]["sets"].pop()
        self.assertEqual(self.post("/api/sessions", payload).status_code, 400)
        self.assertEqual(self.client.get("/api/state").json["sessions"], [])

    def test_login_attempt_limit_is_persistent(self):
        other = self.app.test_client()
        token = other.get("/api/session").json["csrf"]
        for _ in range(10):
            result = other.post("/api/login", json={"password": "wrong"}, headers={"X-CSRF-Token": token})
            self.assertEqual(result.status_code, 401)
        restarted = create_app(self.config).test_client()
        token = restarted.get("/api/session").json["csrf"]
        self.assertEqual(restarted.post("/api/login", json={"password": self.password}, headers={"X-CSRF-Token": token}).status_code, 429)

    def test_guest_activation_and_isolation(self):
        template = self.template()
        self.post("/api/weights", {"day": "2026-11-06", "kg": 80})
        code = self.post("/api/invite", {"profile": "martin"}).json["code"]
        guest = self.app.test_client()
        token = guest.get("/api/session").json["csrf"]
        payload = {"profile": "martin", "code": code, "password": "guest-test-password"}
        result = guest.post("/api/activate", json=payload, headers={"X-CSRF-Token": token})
        self.assertEqual(result.status_code, 200)
        headers = {"X-CSRF-Token": result.json["csrf"]}
        state = guest.get("/api/state").json
        self.assertEqual((state["templates"], state["sessions"], state["weights"]), ([], [], []))
        self.assertEqual(guest.get("/api/state", headers={"X-GymLog-Profile": "nick"}).status_code, 401)
        self.assertEqual(guest.post("/api/invite", json={"profile": "gaia"}, headers=headers).status_code, 403)
        self.assertEqual(guest.post("/api/activate", json=payload, headers=headers).status_code, 403)
        self.assertEqual(guest.post("/api/weights", json={"day": "2026-11-06", "kg": 70}, headers=headers).status_code, 200)
        self.assertEqual(self.client.get("/api/state").json["weights"][0]["kg"], 80)
        self.assertEqual(self.client.get("/api/state").json["templates"][0]["id"], template["id"])
        other = self.app.test_client()
        token = other.get("/api/session").json["csrf"]
        self.assertEqual(other.post("/api/login", json={"profile": "martin", "password": payload["password"]}, headers={"X-CSRF-Token": token}).status_code, 200)
        self.assertEqual(other.get("/api/state").json["weights"][0]["kg"], 70)

    def test_per_set_targets_and_optional_rpe(self):
        targets = [{"reps": 3, "weight": 100, "rpe": 9},
                   {"reps": 8, "weight": 80, "rpe": None}]
        body = {"name": "Top and backoff", "exercises": [{"id": "bench-press", "targets": targets}]}
        result = self.post("/api/templates", body)
        self.assertEqual(result.status_code, 201)
        self.assertEqual(result.json["exercises"][0]["sets"], 2)
        self.assertEqual(result.json["exercises"][0]["targets"], targets)
        self.assertEqual(self.client.get("/api/state").json["templates"][0]["exercises"][0]["targets"], targets)
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
