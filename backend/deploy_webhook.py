"""PythonAnywhere WSGI wrapper for signed GitHub push deliveries."""

import hashlib
import hmac
import json
import os
import subprocess
from contextlib import contextmanager
from pathlib import Path


@contextmanager
def deployment_lock(path):
    """Hold an exclusive deployment lock using the operating system's standard library."""
    with Path(path).open("a") as lock:
        lock.seek(0)
        if os.name == "nt":
            import msvcrt

            msvcrt.locking(lock.fileno(), msvcrt.LK_LOCK, 1)
        else:
            import fcntl

            fcntl.flock(lock, fcntl.LOCK_EX)
        try:
            yield
        finally:
            if os.name == "nt":
                lock.seek(0)
                msvcrt.locking(lock.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(lock, fcntl.LOCK_UN)


def wrap(application, repo, wsgi_file, secret_file):
    repo = Path(repo)
    secret = Path(secret_file).read_bytes().strip()
    if len(secret) < 32:
        raise ValueError("Deployment webhook secret must be at least 32 bytes")

    def dispatch(environ, start_response):
        if environ.get("PATH_INFO") != "/_deploy/github":
            return application(environ, start_response)

        def respond(status, message):
            start_response(status, [("Content-Type", "text/plain; charset=utf-8")])
            return [message.encode()]

        if environ.get("REQUEST_METHOD") != "POST":
            return respond("405 Method Not Allowed", "POST required")
        try:
            size = int(environ.get("CONTENT_LENGTH") or 0)
        except ValueError:
            size = 0
        if not 0 < size <= 2_000_000:
            return respond("400 Bad Request", "Invalid payload size")
        body = environ["wsgi.input"].read(size)
        signature = "sha256=" + hmac.new(secret, body, hashlib.sha256).hexdigest()
        supplied = environ.get("HTTP_X_HUB_SIGNATURE_256", "").encode()
        if not hmac.compare_digest(signature.encode(), supplied):
            return respond("403 Forbidden", "Invalid signature")
        if environ.get("HTTP_X_GITHUB_EVENT") != "push":
            return respond("200 OK", "No deployment requested")
        try:
            payload = json.loads(body)
        except ValueError:
            return respond("400 Bad Request", "Invalid JSON")
        if (
            payload.get("repository", {}).get("full_name") != "nick3105/GymLog"
            or payload.get("ref") != "refs/heads/deploy"
            or payload.get("deleted")
        ):
            return respond("200 OK", "No deployment requested")

        try:
            with deployment_lock(Path(secret_file).with_suffix(".lock")):
                # `deploy` is rebuilt from main with the React build on every merge
                # (.github/workflows/deploy.yml), so take it as it is instead of pulling.
                subprocess.run(
                    ["git", "fetch", "origin", "deploy"], cwd=repo, check=True, timeout=45
                )
                subprocess.run(
                    ["git", "checkout", "--force", "-B", "deploy", "origin/deploy"],
                    cwd=repo,
                    check=True,
                    timeout=45,
                )
                subprocess.run(
                    ["/usr/local/bin/uv", "sync", "--frozen", "--no-dev", "--python", "3.12"],
                    cwd=repo / "backend",
                    check=True,
                    timeout=90,
                )
                commit = subprocess.check_output(
                    ["git", "rev-parse", "HEAD"], cwd=repo, text=True, timeout=10
                ).strip()
                Path(wsgi_file).touch(exist_ok=True)
        except (OSError, subprocess.SubprocessError):
            return respond(
                "500 Internal Server Error", "Deployment failed; check PythonAnywhere logs"
            )
        return respond("200 OK", f"Reload requested for {commit}")

    return dispatch
