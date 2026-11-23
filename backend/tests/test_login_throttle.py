"""Issue 006: the sign-in limit counts real visitors and cannot be reset by another account."""

import importlib
import json
import sys
from pathlib import Path

from gymlog import create_app

PASSWORD = "test-only-password-for-temp-db"


def make_app(tmp_path, **config):
    """Build an app on a temporary database with two accounts."""
    app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-only-secret-key",
            "SESSION_COOKIE_SECURE": False,
            "DATABASE": str(tmp_path / "test.sqlite3"),
            **config,
        }
    )
    for username in ("alice", "eve"):
        client = app.test_client()
        token = client.get("/api/session").json["csrf"]
        response = client.post(
            "/api/register",
            json={"username": username, "password": PASSWORD},
            headers={"X-CSRF-Token": token},
        )
        assert response.status_code == 201
    return app


def sign_in(client, username, password, address=None):
    """Send one sign-in attempt, optionally as if the proxy saw `address`."""
    token = client.get("/api/session").json["csrf"]
    headers = {"X-CSRF-Token": token}
    if address:
        headers["X-Real-IP"] = address
    return client.post(
        "/api/login", json={"username": username, "password": password}, headers=headers
    )


def test_own_successful_sign_in_does_not_reset_failed_attempts(tmp_path):
    app = make_app(tmp_path)
    attacker = app.test_client()
    codes = []
    for _ in range(2):
        for _ in range(9):
            codes.append(sign_in(attacker, "alice", "wrong-guess-password").status_code)
        sign_in(attacker, "eve", PASSWORD)
    assert 429 in codes


def test_behind_proxy_one_visitor_cannot_lock_out_another(tmp_path):
    app = make_app(tmp_path, TRUST_X_REAL_IP=True)
    attacker = app.test_client()
    for _ in range(10):
        assert sign_in(attacker, "alice", "wrong-guess-password", "198.51.100.7").status_code == 401
    assert sign_in(attacker, "alice", PASSWORD, "198.51.100.7").status_code == 429
    victim = app.test_client()
    assert sign_in(victim, "alice", PASSWORD, "203.0.113.20").status_code == 200


def test_without_proxy_a_sent_real_ip_header_is_ignored(tmp_path):
    app = make_app(tmp_path)
    attacker = app.test_client()
    for number in range(10):
        sign_in(attacker, "alice", "wrong-guess-password", f"198.51.100.{number}")
    assert sign_in(attacker, "alice", PASSWORD, "198.51.100.99").status_code == 429


def test_pythonanywhere_entry_point_trusts_the_proxy_header(tmp_path, monkeypatch):
    (tmp_path / "settings.json").write_text(json.dumps({"secret_key": "test-only-secret-key"}))
    monkeypatch.setenv("GYMLOG_INSTANCE", str(tmp_path))
    monkeypatch.syspath_prepend(str(Path(__file__).resolve().parents[1]))
    sys.modules.pop("wsgi", None)
    wsgi = importlib.import_module("wsgi")
    assert wsgi.application.config["TRUST_X_REAL_IP"] is True
