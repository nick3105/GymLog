"""Issue 005: deployment locks remain real and recover after failed commands."""

import os
from contextlib import contextmanager

import pytest
from test_deploy_webhook import push

import deploy_webhook

pytest_plugins = ["test_deploy_webhook"]


def test_deployment_lock_blocks_a_second_file_handle(tmp_path):
    """Verify the native lock actually prevents another deployment entering."""
    path = tmp_path / "deploy.lock"
    with deploy_webhook.deployment_lock(path), path.open("a") as other:
        other.seek(0)
        if os.name == "nt":
            import msvcrt

            with pytest.raises(OSError):
                msvcrt.locking(other.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl

            with pytest.raises(BlockingIOError):
                fcntl.flock(other, fcntl.LOCK_EX | fcntl.LOCK_NB)


def test_deployment_lock_releases_after_an_exception(tmp_path):
    """A failed deployment must not leave the next request locked out."""
    path = tmp_path / "deploy.lock"
    with pytest.raises(RuntimeError, match="test failure"):
        with deploy_webhook.deployment_lock(path):
            raise RuntimeError("test failure")
    with deploy_webhook.deployment_lock(path):
        assert path.exists()


def test_lock_failure_never_runs_deployment_commands(webhook, monkeypatch):
    """Refuse deployment when an exclusive lock cannot be acquired."""
    handler, commands = webhook

    @contextmanager
    def unavailable_lock(path):
        """Simulate the operating system refusing the deployment lock."""
        raise OSError("Lock unavailable")
        yield

    monkeypatch.setattr(deploy_webhook, "deployment_lock", unavailable_lock)
    status, message = push(handler, "refs/heads/deploy")
    assert status == "500 Internal Server Error"
    assert message == "Deployment failed; check PythonAnywhere logs"
    assert commands == []
