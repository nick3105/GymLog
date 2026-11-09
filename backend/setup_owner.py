"""One-time password setup. Credentials are never included in Git."""

import getpass
import json
import os
import secrets
from pathlib import Path

from werkzeug.security import generate_password_hash


def main():
    root = Path(
        os.environ.get("GYMLOG_INSTANCE", str(Path(__file__).resolve().parent / "instance"))
    )
    root.mkdir(parents=True, exist_ok=True)
    path = root / "settings.json"
    if path.exists():
        raise SystemExit("Owner already configured. See README for password reset instructions.")
    password = getpass.getpass("Choose your GymLog password (at least 12 characters): ")
    if len(password) < 12 or len(password) > 1024:
        raise SystemExit("Use between 12 and 1024 characters.")
    if password != getpass.getpass("Repeat password: "):
        raise SystemExit("Passwords did not match. Nothing was saved.")
    settings = {
        "secret_key": secrets.token_hex(32),
        "password_hash": generate_password_hash(password),
    }
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as file:
        json.dump(settings, file)
    print("Owner configured. Password is stored as a hash; keep instance/ private.")


if __name__ == "__main__":
    main()
