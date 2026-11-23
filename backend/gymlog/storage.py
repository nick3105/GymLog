"""Small SQLite repository. JSON snapshots keep the course project readable."""

import json
import sqlite3
import time
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

SCHEMA_VERSION = 11

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
    """CREATE TABLE body_weight_goals (
        user_id INTEGER PRIMARY KEY REFERENCES users(id), kg REAL NOT NULL,
        mode TEXT NOT NULL CHECK (mode IN ('lose', 'gain')))""",
    """CREATE TABLE IF NOT EXISTS login_attempts (
        address TEXT PRIMARY KEY, count INTEGER NOT NULL, since REAL NOT NULL)""",
]


PERSONAL_EXERCISE_SCHEMA = [
    """CREATE TABLE IF NOT EXISTS personal_exercises (
        id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
        request_id TEXT NOT NULL, name_key TEXT NOT NULL, document TEXT NOT NULL,
        created_at TEXT NOT NULL, UNIQUE(user_id, request_id), UNIQUE(user_id, name_key))"""
]


COACHING_SCHEMA = [
    """CREATE TABLE IF NOT EXISTS coaching_relationships (
        id TEXT PRIMARY KEY,
        coachee_id INTEGER NOT NULL REFERENCES users(id),
        coach_id INTEGER NOT NULL REFERENCES users(id),
        state TEXT NOT NULL CHECK(state IN ('pending','accepted','declined','cancelled','revoked')),
        created_at TEXT NOT NULL, decided_at TEXT,
        CHECK(coachee_id != coach_id))""",
    """CREATE UNIQUE INDEX IF NOT EXISTS one_current_coach ON coaching_relationships(coachee_id)
        WHERE state IN ('pending','accepted')""",
    "CREATE INDEX IF NOT EXISTS coach_relationships ON coaching_relationships(coach_id, state)",
]


@contextmanager
def connect(path, transaction=None):
    if transaction is not None:
        yield transaction
        return
    connection = sqlite3.connect(path, timeout=15)
    connection.row_factory = sqlite3.Row
    try:
        with connection:
            yield connection
    finally:
        connection.close()


@contextmanager
def workout_transaction(path):
    """Serialize changes that span the schedule, workout draft and session history."""
    with connect(path) as db:
        db.execute("BEGIN IMMEDIATE")
        yield db


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
        if db.execute("PRAGMA user_version").fetchone()[0] >= 1:
            _upgrade_extensions(db)
            return
        tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if "templates" in tables:
            _upgrade_profiles(db, Path(path), tables, owner_password_hash)
        else:
            db.execute("BEGIN IMMEDIATE")
            if _already_upgraded(db):
                _upgrade_extensions(db)
                return
            for statement in SCHEMA:
                db.execute(statement)
            db.execute("PRAGMA user_version = 1")
            db.execute("COMMIT")
        _upgrade_extensions(db)

    finally:
        db.close()


def _already_upgraded(db):
    """Re-check under the write lock, in case another process upgraded first."""
    if db.execute("PRAGMA user_version").fetchone()[0] >= 1:
        db.execute("COMMIT")
        return True
    return False


def _upgrade_profiles(db, path, tables, owner_password_hash):
    guests = []
    if "accounts" in tables:
        try:
            guests = db.execute(
                "SELECT profile, password_hash FROM accounts WHERE password_hash IS NOT NULL"
            ).fetchall()
        except sqlite3.OperationalError:
            # A competing initializer can remove the legacy table before this pre-lock read.
            if db.execute("PRAGMA user_version").fetchone()[0] >= 1:
                return
            raise
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
        db.execute("PRAGMA user_version = 1")
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


def update_template(path, user_id, document):
    """Replace only the owner's saved template, leaving session snapshots alone."""
    with connect(path) as db:
        result = db.execute(
            "UPDATE templates SET document=? WHERE id=? AND user_id=?",
            (json.dumps(document), document["id"], user_id),
        )
    return document if result.rowcount else None


def delete_template(path, user_id, template_id):
    """Delete only this owner's routine; completed session snapshots stay stored."""
    with connect(path) as db:
        result = db.execute(
            "DELETE FROM templates WHERE id=? AND user_id=?", (template_id, user_id)
        )
    return result.rowcount > 0


def existing_session(path, user_id, client_id, *, transaction=None):
    with connect(path, transaction) as db:
        row = db.execute(
            "SELECT document FROM sessions WHERE user_id=? AND client_id=?", (user_id, client_id)
        ).fetchone()
        return json.loads(row["document"]) if row else None


def add_session(path, user_id, data, *, transaction=None):
    """Save a private completed workout once per client ID."""
    document = {**data, "id": str(uuid4()), "completedAt": now()}
    with connect(path, transaction) as db:
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
        delete_workout_draft(path, user_id, document["clientId"], transaction=db)
    return json.loads(row["document"])


def workout_draft(path, user_id, *, transaction=None):
    """Return only the signed-in user's active workout draft, if one exists."""
    with connect(path, transaction) as db:
        row = db.execute(
            "SELECT document FROM workout_drafts WHERE user_id=?", (user_id,)
        ).fetchone()
    return json.loads(row["document"]) if row else None


def save_workout_draft(path, user_id, document, *, transaction=None):
    """Replace the one active draft owned by this user."""
    with connect(path, transaction) as db:
        db.execute(
            """INSERT INTO workout_drafts (user_id, document, updated_at)
            VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET
            document=excluded.document, updated_at=excluded.updated_at""",
            (user_id, json.dumps(document), now()),
        )
    return document


def delete_workout_draft(path, user_id, client_id=None, *, transaction=None):
    """Delete the owner's active draft, optionally only when it matches the given ID."""
    with connect(path, transaction) as db:
        if client_id is None:
            db.execute("DELETE FROM workout_drafts WHERE user_id=?", (user_id,))
        else:
            db.execute(
                "DELETE FROM workout_drafts WHERE user_id=? AND json_extract(document, '$.clientId')=?",
                (user_id, client_id),
            )


def login_blocked(path, address):
    with connect(path) as db:
        row = db.execute(
            "SELECT count, since FROM login_attempts WHERE address=?", (address,)
        ).fetchone()
        return bool(row and row["count"] >= 10 and time.time() - row["since"] < 900)


def record_login(path, address, success):
    with connect(path) as db:
        db.execute("DELETE FROM login_attempts WHERE since < ?", (time.time() - 900,))
        # A success never clears failures: else signing in to your own account between
        # guesses at someone else's password would reset the limit (issue 006).
        if not success:
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


def weight_goal(path, user_id):
    """Return the signed-in user's private goal, if they have set one."""
    with connect(path) as db:
        row = db.execute(
            "SELECT kg, mode FROM body_weight_goals WHERE user_id=?", (user_id,)
        ).fetchone()
    return dict(row) if row else None


def save_weight_goal(path, user_id, goal):
    """Save or clear only this user's weight goal."""
    with connect(path) as db:
        db.execute("BEGIN IMMEDIATE")
        previous = db.execute(
            "SELECT kg, mode FROM body_weight_goals WHERE user_id=?", (user_id,)
        ).fetchone()
        if previous is not None and dict(previous) != goal:
            db.execute("UPDATE goal_milestones SET is_current=0 WHERE owner_id=?", (user_id,))
        if goal["kg"] is None:
            db.execute("DELETE FROM body_weight_goals WHERE user_id=?", (user_id,))
            return None
        db.execute(
            """INSERT INTO body_weight_goals VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET kg=excluded.kg, mode=excluded.mode""",
            (user_id, goal["kg"], goal["mode"]),
        )
    return {"kg": goal["kg"], "mode": goal["mode"]}


def get_session(path, user_id, session_id):
    """Read only this user's completed workout."""
    with connect(path) as db:
        row = db.execute(
            "SELECT document FROM sessions WHERE id=? AND user_id=?", (session_id, user_id)
        ).fetchone()
        return json.loads(row["document"]) if row else None


def update_session(path, user_id, document, expected_revision=None):
    """Replace an owned result atomically, rejecting a stale concurrent correction."""
    with connect(path) as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute(
            "SELECT document FROM sessions WHERE id=? AND user_id=?",
            (document["id"], user_id),
        ).fetchone()
        if row is None:
            return None
        current = json.loads(row["document"])
        previous_content = {key: value for key, value in current.items() if key != "revision"}
        next_content = {key: value for key, value in document.items() if key != "revision"}
        if previous_content == next_content:
            return current
        revision = current.get("revision", 0)
        if expected_revision is not None and expected_revision != revision:
            raise ValueError("This workout changed on another device. Reload it before saving.")
        updated = {**document, "revision": revision + 1}
        db.execute(
            "UPDATE sessions SET document=? WHERE id=? AND user_id=?",
            (json.dumps(updated), document["id"], user_id),
        )
    return updated


def personal_exercises(path, user_id):
    """Read only the selected owner's personal exercise catalogue."""
    with connect(path) as db:
        return [
            json.loads(row["document"])
            for row in db.execute(
                "SELECT document FROM personal_exercises WHERE user_id=? ORDER BY created_at, id",
                (user_id,),
            )
        ]


def add_personal_exercise(path, user_id, data):
    """Create a private exercise once per owner request, preserving retry identity."""
    request_id = data["requestId"]
    fields = {key: data[key] for key in ("name", "group", "measurement", "volumeEligible")}
    if "volumeMuscle" in data:
        fields["volumeMuscle"] = data["volumeMuscle"]
    with connect(path) as db:
        db.execute("BEGIN IMMEDIATE")
        existing = db.execute(
            "SELECT document FROM personal_exercises WHERE user_id=? AND request_id=?",
            (user_id, request_id),
        ).fetchone()
        if existing:
            document = json.loads(existing["document"])
            if any(document.get(key, "repetitions") != value for key, value in fields.items()):
                raise ValueError("This creation request was already used. Start a new exercise.")
            return document
        name_key = data["name"].casefold()
        duplicate = db.execute(
            "SELECT 1 FROM personal_exercises WHERE user_id=? AND name_key=?",
            (user_id, name_key),
        ).fetchone()
        if duplicate:
            raise ValueError("You already have a personal exercise with that name.")
        document = {
            "id": f"custom-{uuid4()}",
            **fields,
            "source": "personal",
        }
        db.execute(
            "INSERT INTO personal_exercises VALUES (?, ?, ?, ?, ?, ?)",
            (document["id"], user_id, request_id, name_key, json.dumps(document), now()),
        )
    return document


VOLUME_PREFERENCES_SCHEMA = """CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id), document TEXT NOT NULL,
    updated_at TEXT NOT NULL)"""


FAVORITE_EXERCISE_SCHEMA = """CREATE TABLE IF NOT EXISTS favorite_exercises (
    user_id INTEGER NOT NULL REFERENCES users(id), exercise_id TEXT NOT NULL,
    created_at TEXT NOT NULL, PRIMARY KEY (user_id, exercise_id))"""


def _upgrade_extensions(db):
    """Install additive account extensions under one lock."""
    db.execute("BEGIN IMMEDIATE")
    try:
        if db.execute("PRAGMA user_version").fetchone()[0] < SCHEMA_VERSION:
            # Version 2 existed in both weight-goal main and the coaching preview.
            # Install each extension idempotently so either history upgrades safely.
            db.execute(
                """CREATE TABLE IF NOT EXISTS body_weight_goals (
                    user_id INTEGER PRIMARY KEY REFERENCES users(id), kg REAL NOT NULL,
                    mode TEXT NOT NULL CHECK (mode IN ('lose', 'gain')))"""
            )
            for statement in (
                COACHING_SCHEMA
                + PERSONAL_EXERCISE_SCHEMA
                + FRIENDS_SCHEMA
                + [
                    VOLUME_PREFERENCES_SCHEMA,
                    """CREATE TABLE IF NOT EXISTS workout_drafts (
                        user_id INTEGER PRIMARY KEY REFERENCES users(id),
                        document TEXT NOT NULL, updated_at TEXT NOT NULL)""",
                    FAVORITE_EXERCISE_SCHEMA,
                    """CREATE TABLE IF NOT EXISTS schedule_state (
                        user_id INTEGER PRIMARY KEY REFERENCES users(id),
                        document TEXT NOT NULL, revision INTEGER NOT NULL)""",
                ]
            ):
                db.execute(statement)
            db.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
        db.execute("COMMIT")
    except BaseException:
        if db.in_transaction:
            db.execute("ROLLBACK")
        raise


def favorite_exercise_ids(path, user_id):
    """Read the selected owner's favourite exercise IDs in saved order."""
    with connect(path) as db:
        return [
            row["exercise_id"]
            for row in db.execute(
                "SELECT exercise_id FROM favorite_exercises WHERE user_id=? ORDER BY created_at, rowid",
                (user_id,),
            )
        ]


def schedule_state(path, user_id, *, transaction=None):
    """Read only this account's reusable series and scheduled snapshots."""
    with connect(path, transaction) as db:
        row = db.execute(
            "SELECT document FROM schedule_state WHERE user_id=?", (user_id,)
        ).fetchone()
        if row:
            return json.loads(row["document"])
        return {"revision": 0, "series": [], "entries": [], "requests": {}}


def save_schedule_state(path, user_id, document, revision, *, transaction=None):
    """Compare and replace an owner's schedule atomically without changing their journal."""
    with connect(path, transaction) as db:
        if transaction is None:
            db.execute("BEGIN IMMEDIATE")
        row = db.execute(
            "SELECT revision FROM schedule_state WHERE user_id=?", (user_id,)
        ).fetchone()
        current_revision = row["revision"] if row else 0
        if current_revision != revision:
            return None
        saved = {**document, "revision": revision + 1}
        db.execute(
            "INSERT INTO schedule_state VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET "
            "document=excluded.document, revision=excluded.revision",
            (user_id, json.dumps(saved), saved["revision"]),
        )
        return saved


def toggle_favorite_exercise(path, user_id, exercise_id):
    """Add or remove one favourite for its owner and return its new state."""
    with connect(path) as db:
        db.execute("BEGIN IMMEDIATE")
        existing = db.execute(
            "SELECT 1 FROM favorite_exercises WHERE user_id=? AND exercise_id=?",
            (user_id, exercise_id),
        ).fetchone()
        if existing:
            db.execute(
                "DELETE FROM favorite_exercises WHERE user_id=? AND exercise_id=?",
                (user_id, exercise_id),
            )
            return False
        db.execute(
            "INSERT INTO favorite_exercises VALUES (?, ?, ?)",
            (user_id, exercise_id, now()),
        )
        return True


def volume_preferences(path, user_id):
    """Return the owner's goals and evidence context, or empty defaults."""
    with connect(path) as db:
        row = db.execute(
            "SELECT document FROM user_preferences WHERE user_id=?", (user_id,)
        ).fetchone()
        return json.loads(row["document"]) if row else {"goals": {}, "profile": {}, "revision": 0}


def save_volume_preferences(path, user_id, document, revision):
    """Update only the owner's goals, rejecting concurrent changes."""
    with connect(path) as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute(
            "SELECT document FROM user_preferences WHERE user_id=?", (user_id,)
        ).fetchone()
        current = json.loads(row["document"]) if row else {"revision": 0}
        if current.get("revision", 0) != revision:
            return None
        document = {**document, "revision": revision + 1}
        db.execute(
            "INSERT INTO user_preferences VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET "
            "document=excluded.document, updated_at=excluded.updated_at",
            (user_id, json.dumps(document), now()),
        )
        return document


def profile_bio(path, user_id):
    """Return the signed-in user's short profile bio."""
    with connect(path) as db:
        row = db.execute(
            "SELECT document FROM user_preferences WHERE user_id=?", (user_id,)
        ).fetchone()
        return json.loads(row["document"]).get("bio", "") if row else ""


def profile_avatar(path, user_id):
    """Return the signed-in user's optional avatar data URL."""
    with connect(path) as db:
        row = db.execute(
            "SELECT document FROM user_preferences WHERE user_id=?", (user_id,)
        ).fetchone()
        return json.loads(row["document"]).get("avatar") if row else None


def profile_avatar_zoom(path, user_id):
    """Return the signed-in user's avatar zoom, defaulting to a centered crop."""
    with connect(path) as db:
        row = db.execute(
            "SELECT document FROM user_preferences WHERE user_id=?", (user_id,)
        ).fetchone()
        return float(json.loads(row["document"]).get("avatarZoom", 1)) if row else 1


def save_profile_bio(path, user_id, bio):
    """Save only the signed-in user's short profile bio."""
    with connect(path) as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute(
            "SELECT document FROM user_preferences WHERE user_id=?", (user_id,)
        ).fetchone()
        document = json.loads(row["document"]) if row else {"revision": 0}
        document["bio"] = bio
        db.execute(
            "INSERT INTO user_preferences VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET "
            "document=excluded.document, updated_at=excluded.updated_at",
            (user_id, json.dumps(document), now()),
        )
        return bio


def save_profile(path, user_id, bio, avatar, avatar_zoom=1):
    """Save the signed-in user's bio, avatar, and centered crop together."""
    with connect(path) as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute(
            "SELECT document FROM user_preferences WHERE user_id=?", (user_id,)
        ).fetchone()
        document = json.loads(row["document"]) if row else {"revision": 0}
        document["bio"] = bio
        document["avatar"] = avatar
        document["avatarZoom"] = avatar_zoom
        db.execute(
            "INSERT INTO user_preferences VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET "
            "document=excluded.document, updated_at=excluded.updated_at",
            (user_id, json.dumps(document), now()),
        )
        return {"bio": bio, "avatar": avatar, "avatarZoom": avatar_zoom}


def coaching_state(path, user_id):
    """Read only relationships in which this user is a participant."""
    with connect(path) as db:
        rows = db.execute(
            """SELECT r.*, learner.username AS coachee, teacher.username AS coach
            FROM coaching_relationships r JOIN users learner ON learner.id=r.coachee_id
            JOIN users teacher ON teacher.id=r.coach_id
            WHERE (r.coachee_id=? OR r.coach_id=?) AND r.state IN ('pending','accepted')
            ORDER BY r.created_at DESC""",
            (user_id, user_id),
        ).fetchall()
        return [dict(row) for row in rows]


def request_coach(path, coachee_id, username, validate):
    """Create a request under the same lock as the current-relationship check."""
    with connect(path) as db:
        db.execute("BEGIN IMMEDIATE")
        coach = db.execute("SELECT id FROM users WHERE username=?", (username,)).fetchone()
        if coach is None:
            return None
        existing = db.execute(
            "SELECT * FROM coaching_relationships WHERE coachee_id=? AND state IN ('pending','accepted')",
            (coachee_id,),
        ).fetchone()
        validate(coachee_id, coach["id"], dict(existing) if existing else None)
        if existing:
            return dict(existing)
        relationship = {
            "id": str(uuid4()),
            "coachee_id": coachee_id,
            "coach_id": coach["id"],
            "state": "pending",
            "created_at": now(),
            "decided_at": None,
        }
        db.execute(
            "INSERT INTO coaching_relationships VALUES (?, ?, ?, ?, ?, ?)",
            tuple(relationship.values()),
        )
        return relationship


def change_coaching(path, relationship_id, actor_id, action, validate):
    """Check a participant transition and persist it under one write lock."""
    with connect(path) as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute(
            "SELECT * FROM coaching_relationships WHERE id=? AND (coachee_id=? OR coach_id=?)",
            (relationship_id, actor_id, actor_id),
        ).fetchone()
        if row is None:
            return None
        relationship = dict(row)
        target = validate(relationship, actor_id, action)
        if target != relationship["state"]:
            relationship.update(state=target, decided_at=now())
            db.execute(
                "UPDATE coaching_relationships SET state=?, decided_at=? WHERE id=?",
                (target, relationship["decided_at"], relationship_id),
            )
        return relationship


def _accepted_coachee(db, coach_id, coachee_id):
    """Find only an accepted coachee owned by this coach relationship."""
    return db.execute(
        """SELECT u.id, u.username FROM users u JOIN coaching_relationships r ON r.coachee_id=u.id
        WHERE r.coachee_id=? AND r.coach_id=? AND r.state='accepted'""",
        (coachee_id, coach_id),
    ).fetchone()


def coachee_journal(path, coach_id, coachee_id):
    """Return training snapshots only, without private weights or security settings."""
    with connect(path) as db:
        db.execute("BEGIN")
        owner = _accepted_coachee(db, coach_id, coachee_id)
        if owner is None:
            return None
        result = {"owner": dict(owner), "personalExercises": []}
        if db.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='personal_exercises'"
        ).fetchone():
            result["personalExercises"] = [
                json.loads(row["document"])
                for row in db.execute(
                    "SELECT document FROM personal_exercises WHERE user_id=? ORDER BY created_at, id",
                    (coachee_id,),
                )
            ]
        for table in ("templates", "sessions"):
            result[table] = [
                json.loads(row["document"])
                for row in db.execute(
                    f"SELECT document FROM {table} WHERE user_id=? ORDER BY created_at DESC, rowid DESC",
                    (coachee_id,),
                )
            ]
        return result


def save_coached_template(path, coach_id, coachee_id, data, template_id=None):
    """Authorize and write a coachee plan atomically with relationship revocation."""
    with connect(path) as db:
        db.execute("BEGIN IMMEDIATE")
        if _accepted_coachee(db, coach_id, coachee_id) is None:
            return None
        creator = db.execute("SELECT username FROM users WHERE id=?", (coach_id,)).fetchone()
        if template_id:
            previous = db.execute(
                "SELECT document FROM templates WHERE id=? AND user_id=?", (template_id, coachee_id)
            ).fetchone()
            if previous is None:
                return None
            document = json.loads(previous["document"])
            if document.get("createdBy", {}).get("id") != coach_id:
                return None
            document.update(data)
            db.execute(
                "UPDATE templates SET document=? WHERE id=? AND user_id=?",
                (json.dumps(document), template_id, coachee_id),
            )
        else:
            document = {
                **data,
                "id": str(uuid4()),
                "createdAt": now(),
                "createdBy": {"id": coach_id, "username": creator["username"]},
            }
            db.execute(
                "INSERT INTO templates VALUES (?, ?, ?, ?)",
                (document["id"], coachee_id, json.dumps(document), document["createdAt"]),
            )
        return document


FRIENDS_SCHEMA = [
    """CREATE TABLE IF NOT EXISTS friendships (
        id TEXT PRIMARY KEY, sender_id INTEGER NOT NULL REFERENCES users(id),
        recipient_id INTEGER NOT NULL REFERENCES users(id),
        state TEXT NOT NULL CHECK(state IN ('pending', 'accepted', 'declined', 'ended')),
        CHECK(sender_id != recipient_id))""",
    """CREATE UNIQUE INDEX IF NOT EXISTS one_active_friendship
        ON friendships(min(sender_id, recipient_id), max(sender_id, recipient_id))
        WHERE state IN ('pending', 'accepted')""",
    """CREATE TABLE IF NOT EXISTS workout_shares (
        id TEXT PRIMARY KEY, friendship_id TEXT NOT NULL REFERENCES friendships(id),
        session_id TEXT NOT NULL REFERENCES sessions(id), recipient_id INTEGER NOT NULL
        REFERENCES users(id), shared_at TEXT NOT NULL,
        UNIQUE(friendship_id, session_id, recipient_id))""",
    """CREATE INDEX IF NOT EXISTS workout_shares_recipient
        ON workout_shares(recipient_id, shared_at)""",
    """CREATE TABLE IF NOT EXISTS workout_comments (
        session_id TEXT NOT NULL REFERENCES sessions(id), author_id INTEGER NOT NULL
        REFERENCES users(id), client_id TEXT NOT NULL, comment TEXT NOT NULL,
        created_at TEXT NOT NULL, PRIMARY KEY (session_id, author_id, client_id))""",
    """CREATE TABLE IF NOT EXISTS goal_milestones (
        id TEXT PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES users(id),
        is_current INTEGER NOT NULL CHECK(is_current IN (0, 1)), created_at TEXT NOT NULL)""",
    """CREATE UNIQUE INDEX IF NOT EXISTS current_goal_milestone
        ON goal_milestones(owner_id) WHERE is_current=1""",
    """CREATE TABLE IF NOT EXISTS goal_milestone_shares (
        id TEXT PRIMARY KEY, milestone_id TEXT NOT NULL REFERENCES goal_milestones(id),
        friendship_id TEXT NOT NULL REFERENCES friendships(id),
        recipient_id INTEGER NOT NULL REFERENCES users(id), shared_at TEXT NOT NULL,
        congratulated_at TEXT, UNIQUE(milestone_id, friendship_id))""",
    """CREATE INDEX IF NOT EXISTS goal_milestone_recipient
        ON goal_milestone_shares(recipient_id, shared_at)""",
]


def friendships(path, user_id):
    """List active relationships with the other account's public username."""
    with connect(path) as db:
        rows = db.execute(
            """SELECT f.id, f.state, f.recipient_id = ? AS incoming, u.username
            FROM friendships f JOIN users u ON
                u.id = CASE WHEN f.sender_id = ? THEN f.recipient_id ELSE f.sender_id END
            WHERE (f.sender_id = ? OR f.recipient_id = ?)
                AND f.state IN ('pending', 'accepted')
            ORDER BY u.username COLLATE NOCASE""",
            (user_id, user_id, user_id, user_id),
        )
        return [{**dict(row), "incoming": bool(row["incoming"])} for row in rows]


def request_friend(path, sender_id, username, validate):
    """Create at most one active request per unordered pair."""
    with connect(path) as db:
        db.execute("BEGIN IMMEDIATE")
        user = db.execute("SELECT id FROM users WHERE username=?", (username,)).fetchone()
        if user is None:
            return None
        recipient_id = user["id"]
        validate(sender_id, recipient_id)
        existing = db.execute(
            """SELECT id FROM friendships
            WHERE min(sender_id, recipient_id)=? AND max(sender_id, recipient_id)=?
                AND state IN ('pending', 'accepted')""",
            tuple(sorted((sender_id, recipient_id))),
        ).fetchone()
        if existing:
            return existing["id"]
        relationship_id = str(uuid4())
        db.execute(
            "INSERT INTO friendships VALUES (?, ?, ?, 'pending')",
            (relationship_id, sender_id, recipient_id),
        )
        return relationship_id


def change_friendship(path, user_id, relationship_id, action, validate):
    """Apply an authorized transition and remove ended friendship shares."""
    with connect(path) as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute(
            "SELECT * FROM friendships WHERE id=? AND ? IN (sender_id, recipient_id)",
            (relationship_id, user_id),
        ).fetchone()
        if row is None:
            return False
        state = validate(row, user_id, action)
        db.execute("UPDATE friendships SET state=? WHERE id=?", (state, relationship_id))
        if state == "ended":
            db.execute("DELETE FROM workout_shares WHERE friendship_id=?", (relationship_id,))
        return True


def own_workout_shares(path, user_id, session_id):
    """List recipients for an owned workout."""
    with connect(path) as db:
        rows = db.execute(
            """SELECT w.id, w.friendship_id AS friendshipId, u.username
            FROM workout_shares w JOIN sessions s ON s.id=w.session_id
            JOIN friendships f ON f.id=w.friendship_id AND f.state='accepted'
            JOIN users u ON u.id=w.recipient_id
            WHERE s.id=? AND s.user_id=? ORDER BY u.username COLLATE NOCASE""",
            (session_id, user_id),
        )
        return [dict(row) for row in rows]


def _accepted_friends(db, user_id):
    """Resolve relationship IDs to accepted recipients inside the caller's transaction."""
    return db.execute(
        """SELECT id, CASE WHEN sender_id=? THEN recipient_id ELSE sender_id END AS recipient
        FROM friendships WHERE state='accepted' AND ? IN (sender_id, recipient_id)""",
        (user_id, user_id),
    ).fetchall()


def share_workout(path, user_id, session_id, friendship_ids=None, *, replace=False):
    """Add or replace access to one owned workout in a single transaction."""
    with connect(path) as db:
        db.execute("BEGIN IMMEDIATE")
        workout = db.execute(
            "SELECT 1 FROM sessions WHERE id=? AND user_id=?", (session_id, user_id)
        ).fetchone()
        if workout is None:
            return None
        friends = _accepted_friends(db, user_id)
        if friendship_ids is not None:
            selected = set(friendship_ids)
            friends = [friend for friend in friends if friend["id"] in selected]
            if len(friends) != len(selected):
                return None
        if replace:
            keep = {friend["id"] for friend in friends}
            existing = db.execute(
                "SELECT id, friendship_id FROM workout_shares WHERE session_id=?", (session_id,)
            ).fetchall()
            db.executemany(
                "DELETE FROM workout_shares WHERE id=?",
                [(row["id"],) for row in existing if row["friendship_id"] not in keep],
            )
        db.executemany(
            """INSERT INTO workout_shares VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(friendship_id, session_id, recipient_id) DO NOTHING""",
            [
                (str(uuid4()), friend["id"], session_id, friend["recipient"], now())
                for friend in friends
            ],
        )
        return len(friends)


def revoke_workout_share(path, user_id, session_id, share_id):
    """Remove a share only when the actor still owns the specified workout."""
    with connect(path) as db:
        return bool(
            db.execute(
                """DELETE FROM workout_shares WHERE id=? AND session_id=? AND EXISTS
                    (SELECT 1 FROM sessions WHERE id=? AND user_id=?)""",
                (share_id, session_id, session_id, user_id),
            ).rowcount
        )


def received_workouts(path, user_id, share_id=None):
    """Read current documents for the recipient's still-active shares."""
    with connect(path) as db:
        return db.execute(
            """SELECT w.id, u.username AS sender, s.document
            FROM workout_shares w JOIN sessions s ON s.id=w.session_id
            JOIN users u ON u.id=s.user_id
            JOIN friendships f ON f.id=w.friendship_id AND f.state='accepted'
            WHERE w.recipient_id=? AND (? IS NULL OR w.id=?)
            ORDER BY w.shared_at DESC, w.rowid DESC""",
            (user_id, share_id, share_id),
        ).fetchall()


def workout_comments(path, user_id, *, session_id=None, share_id=None, new_comment=None):
    """Read or post to one workout after checking the owner's or recipient's access."""
    with connect(path) as db:
        db.execute("BEGIN IMMEDIATE" if new_comment else "BEGIN")
        if share_id is not None:
            workout = db.execute(
                """SELECT s.id FROM workout_shares w JOIN sessions s ON s.id=w.session_id
                JOIN friendships f ON f.id=w.friendship_id AND f.state='accepted'
                WHERE w.id=? AND w.recipient_id=?""",
                (share_id, user_id),
            ).fetchone()
        else:
            workout = db.execute(
                "SELECT id FROM sessions WHERE id=? AND user_id=?", (session_id, user_id)
            ).fetchone()
        if workout is None:
            return None
        if new_comment:
            client_id, comment = new_comment
            db.execute(
                """INSERT INTO workout_comments VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(session_id, author_id, client_id) DO NOTHING""",
                (workout["id"], user_id, client_id, comment, now()),
            )
        rows = db.execute(
            """SELECT c.rowid AS id, u.username AS author, c.comment AS text,
                c.created_at AS createdAt
            FROM workout_comments c JOIN users u ON u.id=c.author_id
            WHERE c.session_id=? ORDER BY c.rowid""",
            (workout["id"],),
        )
        return [dict(row) for row in rows]


def received_workout_comments(path, user_id):
    """List comments by other accounts on workouts owned by the signed-in user."""
    with connect(path) as db:
        rows = db.execute(
            """SELECT c.rowid AS id, s.id AS workoutId, s.document, u.username AS author
            FROM workout_comments c JOIN sessions s ON s.id=c.session_id
            JOIN users u ON u.id=c.author_id
            WHERE s.user_id=? AND c.author_id!=?
            ORDER BY c.rowid DESC LIMIT 100""",
            (user_id, user_id),
        ).fetchall()
        return [
            {
                "id": row["id"],
                "workoutId": row["workoutId"],
                "workoutName": json.loads(row["document"])["name"],
                "author": row["author"],
            }
            for row in rows
        ]


def share_goal_milestone(path, user_id, friendship_ids):
    """Share an achieved goal as a milestone without copying any weight measurements."""
    with connect(path) as db:
        db.execute("BEGIN IMMEDIATE")
        goal = db.execute(
            """SELECT g.kg AS goal, g.mode, w.kg AS latest FROM body_weight_goals g
            JOIN body_weights w ON w.user_id=g.user_id WHERE g.user_id=?
            ORDER BY w.day DESC LIMIT 1""",
            (user_id,),
        ).fetchone()
        if goal is None or not (
            (goal["mode"] == "lose" and goal["latest"] <= goal["goal"])
            or (goal["mode"] == "gain" and goal["latest"] >= goal["goal"])
        ):
            raise ValueError("Reach your current goal before sharing it.")
        friends = _accepted_friends(db, user_id)
        if friendship_ids is not None:
            selected = set(friendship_ids)
            friends = [friend for friend in friends if friend["id"] in selected]
            if len(friends) != len(selected):
                raise ValueError("Your friends list changed. Choose again.")
        if not friends:
            raise ValueError("Add a friend before sharing your milestone.")
        milestone = db.execute(
            "SELECT id FROM goal_milestones WHERE owner_id=? AND is_current=1", (user_id,)
        ).fetchone()
        if milestone is None:
            milestone_id = str(uuid4())
            db.execute(
                "INSERT INTO goal_milestones VALUES (?, ?, 1, ?)", (milestone_id, user_id, now())
            )
        else:
            milestone_id = milestone["id"]
        db.executemany(
            """INSERT INTO goal_milestone_shares VALUES (?, ?, ?, ?, ?, NULL)
            ON CONFLICT(milestone_id, friendship_id) DO NOTHING""",
            [
                (str(uuid4()), milestone_id, friend["id"], friend["recipient"], now())
                for friend in friends
            ],
        )


def goal_milestone_activity(path, user_id):
    """List received milestones and congratulations on this account's own milestones."""
    with connect(path) as db:
        shares = db.execute(
            """SELECT s.id, u.username AS sender,
                s.congratulated_at IS NOT NULL AS congratulated
            FROM goal_milestone_shares s JOIN goal_milestones m ON m.id=s.milestone_id
            JOIN friendships f ON f.id=s.friendship_id AND f.state='accepted'
            JOIN users u ON u.id=m.owner_id
            WHERE s.recipient_id=? ORDER BY s.shared_at DESC, s.rowid DESC""",
            (user_id,),
        ).fetchall()
        congratulations = db.execute(
            """SELECT s.id, u.username AS sender
            FROM goal_milestone_shares s JOIN goal_milestones m ON m.id=s.milestone_id
            JOIN users u ON u.id=s.recipient_id
            WHERE m.owner_id=? AND s.congratulated_at IS NOT NULL
            ORDER BY s.congratulated_at DESC, s.rowid DESC""",
            (user_id,),
        ).fetchall()
        return [{**dict(row), "congratulated": bool(row["congratulated"])} for row in shares], [
            dict(row) for row in congratulations
        ]


def congratulate_goal_milestone(path, user_id, share_id):
    """Send one congratulations from the still-authorized milestone recipient."""
    with connect(path) as db:
        return bool(
            db.execute(
                """UPDATE goal_milestone_shares
                SET congratulated_at=coalesce(congratulated_at, ?)
                WHERE id=? AND recipient_id=? AND EXISTS (
                    SELECT 1 FROM friendships f
                    WHERE f.id=goal_milestone_shares.friendship_id AND f.state='accepted'
                )""",
                (now(), share_id, user_id),
            ).rowcount
        )
