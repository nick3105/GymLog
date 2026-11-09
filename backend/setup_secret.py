"""One-time setup of the session-signing key. Secrets are never included in Git."""

import json
import os
import secrets
from pathlib import Path


def main():
    root = Path(
        os.environ.get("GYMLOG_INSTANCE", str(Path(__file__).resolve().parent / "instance"))
    )
    root.mkdir(parents=True, exist_ok=True)
    path = root / "settings.json"
    if path.exists():
        raise SystemExit("Already configured: instance/settings.json exists.")
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as file:
        json.dump({"secret_key": secrets.token_hex(32)}, file)
    print("Session key created. Keep instance/ private. Create your account in the app.")


if __name__ == "__main__":
    main()
