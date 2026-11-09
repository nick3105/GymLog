"""Small SQLite repository. JSON snapshots keep the course project readable."""

import json
import sqlite3
import time
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

SCHEMA_VERSION = 1

# One statement per item: executescript() would commit an open transaction first.
SCHEMA = [
    """CREATE TABLE users (
        id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL, created_at TEXT NOT NULL)""",
    """CREATE TABLE templates (
        id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
        document TEXT NOT NULL, created_at TEXT NOT NULL)""",
    """CREATE TABLE sessions (
        id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
        client_id TEXT NOT NULL, document TEXT NOT NULL, created_at TEXT NOT NULL,
        UNIQUE (user_id, client_id))""",
    """CREATE TABLE body_weights (
        user_id INTEGER NOT NULL REFERENCES users(id), day TEXT NOT NULL, kg REAL NOT NULL,
        PRIMARY KEY (user_id, day))""",
    """CREATE TABLE IF NOT EXISTS login_attempts (
        address TEXT PRIMARY KEY, count INTEGER NOT NULL, since REAL NOT NULL)""",
]


@contextmanager
def connect(path):
    connection = sqlite3.connect(path, timeout=15)
    connection.row_factory = sqlite3.Row
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def initialize(path, owner_password_hash=None):
    """Create the schema, or upgrade a pre-accounts database in place.

    Before version 1, Nick's journal lived in this file (password in settings.json) and each
    activated guest had a gymlog-<profile>.sqlite3 next to it. The upgrade turns every one of
    them into a user, keeping their password and data, in a single transaction.
    """
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path, timeout=15, isolation_level=None)
    try:
        if db.execute("PRAGMA user_version").fetchone()[0] >= SCHEMA_VERSION:
            return
        tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if "templates" in tables:
            _upgrade_profiles(db, Path(path), tables, owner_password_hash)
        else:
            db.execute("BEGIN IMMEDIATE")
            if _already_upgraded(db):
                return
            for statement in SCHEMA:
                db.execute(statement)
            db.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
            db.execute("COMMIT")
    finally:
        db.close()


def _already_upgraded(db):
    """Re-check under the write lock, in case another process upgraded first."""
    if db.execute("PRAGMA user_version").fetchone()[0] >= SCHEMA_VERSION:
        db.execute("COMMIT")
        return True
    return False


def _upgrade_profiles(db, path, tables, owner_password_hash):
    guests = []
    if "accounts" in tables:
        guests = db.execute(
            "SELECT profile, password_hash FROM accounts WHERE password_hash IS NOT NULL"
        ).fetchall()
    # ATTACH is not allowed inside a transaction, so attach every guest file first.
    attached = []
    for index, (profile, _) in enumerate(guests):
        guest_file = path.with_name(f"gymlog-{profile}.sqlite3")
        if guest_file.exists():
            db.execute(f"ATTACH DATABASE ? AS guest{index}", (str(guest_file),))
            attached.append(f"guest{index}")
        else:
            attached.append(None)
    try:
        db.execute("BEGIN IMMEDIATE")
        if _already_upgraded(db):
            return
        for table in ("templates", "sessions", "body_weights"):
            db.execute(f"ALTER TABLE {table} RENAME TO old_{table}")
        for statement in SCHEMA:
            db.execute(statement)
        owners = []
        if owner_password_hash:
            owners.append(("nick", owner_password_hash, "main", "old_"))
        for (profile, password_hash), schema in zip(guests, attached, strict=True):
            owners.append((profile, password_hash, schema, ""))
        for username, password_hash, schema, prefix in owners:
            user_id = db.execute(
                "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
                (username, password_hash, now()),
            ).lastrowid
            if schema is None:
                continue
            db.execute(
                f"INSERT INTO templates SELECT id, ?, document, created_at FROM {schema}.{prefix}templates",
                (user_id,),
            )
            db.execute(
                f"INSERT INTO sessions SELECT id, ?, client_id, document, created_at FROM {schema}.{prefix}sessions",
                (user_id,),
            )
            db.execute(
                f"INSERT INTO body_weights SELECT ?, day, kg FROM {schema}.{prefix}body_weights",
                (user_id,),
            )
        leftover = sum(
            db.execute(f"SELECT count(*) FROM old_{table}").fetchone()[0]
            for table in ("templates", "sessions", "body_weights")
        )
        if leftover and not owner_password_hash:
            raise RuntimeError("The database has data but settings.json has no password_hash.")
        for table in ("templates", "sessions", "body_weights"):
            db.execute(f"DROP TABLE old_{table}")
        db.execute("DROP TABLE IF EXISTS accounts")
        db.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
        db.execute("COMMIT")
    except BaseException:
        if db.in_transaction:
            db.execute("ROLLBACK")
        raise
    finally:
        for schema in attached:
            if schema:
                db.execute(f"DETACH DATABASE {schema}")


def now():
    return datetime.now(UTC).isoformat()


def create_user(path, username, password_hash):
    """Return the new user's id, or None when the username is taken."""
    try:
        with connect(path) as db:
            return db.execute(
                "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
                (username, password_hash, now()),
            ).lastrowid
    except sqlite3.IntegrityError:
        return None


def find_user(path, username):
    with connect(path) as db:
        row = db.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
        return dict(row) if row else None


def get_user(path, user_id):
    with connect(path) as db:
        row = db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        return dict(row) if row else None


def documents(path, user_id, table):
    if table not in ("templates", "sessions"):
        raise ValueError("Unknown table")
    with connect(path) as db:
        return [
            json.loads(row["document"])
            for row in db.execute(
                f"SELECT document FROM {table} WHERE user_id=? ORDER BY created_at DESC, rowid DESC",
                (user_id,),
            )
        ]


def get_template(path, user_id, template_id):
    with connect(path) as db:
        row = db.execute(
            "SELECT document FROM templates WHERE id=? AND user_id=?", (template_id, user_id)
        ).fetchone()
        return json.loads(row["document"]) if row else None


def add_template(path, user_id, data):
    document = {**data, "id": str(uuid4()), "createdAt": now()}
    with connect(path) as db:
        db.execute(
            "INSERT INTO templates VALUES (?, ?, ?, ?)",
            (document["id"], user_id, json.dumps(document), document["createdAt"]),
        )
    return document


def existing_session(path, user_id, client_id):
    with connect(path) as db:
        row = db.execute(
            "SELECT document FROM sessions WHERE user_id=? AND client_id=?", (user_id, client_id)
        ).fetchone()
        return json.loads(row["document"]) if row else None


def add_session(path, user_id, data):
    document = {**data, "id": str(uuid4()), "completedAt": now()}
    with connect(path) as db:
        db.execute(
            "INSERT OR IGNORE INTO sessions VALUES (?, ?, ?, ?, ?)",
            (
                document["id"],
                user_id,
                document["clientId"],
                json.dumps(document),
                document["completedAt"],
            ),
        )
        row = db.execute(
            "SELECT document FROM sessions WHERE user_id=? AND client_id=?",
            (user_id, document["clientId"]),
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


def weights(path, user_id):
    with connect(path) as db:
        return [
            dict(row)
            for row in db.execute(
                "SELECT day, kg FROM body_weights WHERE user_id=? ORDER BY day", (user_id,)
            )
        ]


def save_weight(path, user_id, day, kg):
    with connect(path) as db:
        db.execute(
            """INSERT INTO body_weights VALUES (?, ?, ?)
            ON CONFLICT(user_id, day) DO UPDATE SET kg=excluded.kg""",
            (user_id, day, kg),
        )
    return {"day": day, "kg": kg}
