"""Small SQLite repository. JSON snapshots keep the course project readable."""

import json
import sqlite3
import time
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4


@contextmanager
def connect(path):
    connection = sqlite3.connect(path, timeout=15)
    connection.row_factory = sqlite3.Row
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def initialize(path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with connect(path) as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS templates (
                id TEXT PRIMARY KEY, document TEXT NOT NULL, created_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY, client_id TEXT UNIQUE NOT NULL,
                document TEXT NOT NULL, created_at TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS body_weights (day TEXT PRIMARY KEY, kg REAL NOT NULL);
            CREATE TABLE IF NOT EXISTS login_attempts (
                address TEXT PRIMARY KEY, count INTEGER NOT NULL, since REAL NOT NULL);
        """)


def now():
    return datetime.now(UTC).isoformat()


def documents(path, table):
    if table not in ("templates", "sessions"):
        raise ValueError("Unknown table")
    with connect(path) as db:
        return [
            json.loads(row["document"])
            for row in db.execute(
                f"SELECT document FROM {table} ORDER BY created_at DESC, rowid DESC"
            )
        ]


def get_template(path, template_id):
    with connect(path) as db:
        row = db.execute("SELECT document FROM templates WHERE id=?", (template_id,)).fetchone()
        return json.loads(row["document"]) if row else None


def add_template(path, data):
    document = {**data, "id": str(uuid4()), "createdAt": now()}
    with connect(path) as db:
        db.execute(
            "INSERT INTO templates VALUES (?, ?, ?)",
            (document["id"], json.dumps(document), document["createdAt"]),
        )
    return document


def existing_session(path, client_id):
    with connect(path) as db:
        row = db.execute("SELECT document FROM sessions WHERE client_id=?", (client_id,)).fetchone()
        return json.loads(row["document"]) if row else None


def add_session(path, data):
    document = {**data, "id": str(uuid4()), "completedAt": now()}
    with connect(path) as db:
        db.execute(
            "INSERT OR IGNORE INTO sessions VALUES (?, ?, ?, ?)",
            (document["id"], document["clientId"], json.dumps(document), document["completedAt"]),
        )
        row = db.execute(
            "SELECT document FROM sessions WHERE client_id=?", (document["clientId"],)
        ).fetchone()
    return json.loads(row["document"])


def login_blocked(path, address):
    with connect(path) as db:
        row = db.execute(
            "SELECT count, since FROM login_attempts WHERE address=?", (address,)
        ).fetchone()
        return bool(row and row["count"] >= 10 and time.time() - row["since"] < 900)


def record_login(path, address, success):
    with connect(path) as db:
        db.execute("DELETE FROM login_attempts WHERE since < ?", (time.time() - 900,))
        if success:
            db.execute("DELETE FROM login_attempts WHERE address=?", (address,))
        else:
            db.execute(
                """INSERT INTO login_attempts VALUES (?, 1, ?)
                ON CONFLICT(address) DO UPDATE SET count=count+1""",
                (address, time.time()),
            )


def weights(path):
    with connect(path) as db:
        return [dict(row) for row in db.execute("SELECT day, kg FROM body_weights ORDER BY day")]


def save_weight(path, day, kg):
    with connect(path) as db:
        db.execute(
            "INSERT INTO body_weights VALUES (?, ?) ON CONFLICT(day) DO UPDATE SET kg=excluded.kg",
            (day, kg),
        )
    return {"day": day, "kg": kg}
