"""The PythonAnywhere webhook deploys signed pushes to the deploy branch, and nothing else."""

import hashlib
import hmac
import io
import json

import pytest

import deploy_webhook

SECRET = b"x" * 32


@pytest.fixture
def webhook(tmp_path, monkeypatch):
    secret_file = tmp_path / "secret"
    secret_file.write_bytes(SECRET)
    commands = []

    def run(command, **options):
        commands.append(command)

    monkeypatch.setattr(deploy_webhook.subprocess, "run", run)
    monkeypatch.setattr(deploy_webhook.subprocess, "check_output", lambda *a, **k: "abc123\n")

    def app(environ, start_response):
        start_response("200 OK", [])
        return [b"app"]

    handler = deploy_webhook.wrap(app, tmp_path, tmp_path / "wsgi.py", secret_file)
    return handler, commands


def push(handler, ref, signed=True):
    body = json.dumps({"repository": {"full_name": "nick3105/GymLog"}, "ref": ref}).encode()
    signature = "sha256=" + hmac.new(SECRET, body, hashlib.sha256).hexdigest()
    environ = {
        "PATH_INFO": "/_deploy/github",
        "REQUEST_METHOD": "POST",
        "CONTENT_LENGTH": str(len(body)),
        "wsgi.input": io.BytesIO(body),
        "HTTP_X_HUB_SIGNATURE_256": signature if signed else "sha256=wrong",
        "HTTP_X_GITHUB_EVENT": "push",
    }
    status = []
    response = handler(environ, lambda code, headers: status.append(code))
    return status[0], b"".join(response).decode()


def test_push_to_deploy_checks_out_the_built_branch(webhook):
    handler, commands = webhook
    status, message = push(handler, "refs/heads/deploy")
    assert status == "200 OK"
    assert message == "Reload requested for abc123"
    assert commands[0] == ["git", "fetch", "origin", "deploy"]
    assert commands[1] == ["git", "checkout", "--force", "-B", "deploy", "origin/deploy"]


def test_push_to_main_deploys_nothing(webhook):
    handler, commands = webhook
    assert push(handler, "refs/heads/main") == ("200 OK", "No deployment requested")
    assert commands == []


def test_unsigned_push_is_refused(webhook):
    handler, commands = webhook
    assert push(handler, "refs/heads/deploy", signed=False)[0] == "403 Forbidden"
    assert commands == []
