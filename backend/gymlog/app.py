"""GymLog web app: JSON API, the current UI at / and the React preview at /next/."""

import hashlib
import hmac
import json
import os
import secrets
import time
from datetime import date, timedelta
from functools import wraps
from pathlib import Path

from flask import Flask, g, jsonify, request, send_from_directory, session
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash, generate_password_hash

from . import storage
from .models import best_1rm, number, validate_session, validate_template

ROOT = Path(__file__).resolve().parent
FRONTEND_DIST = ROOT.parents[1] / "frontend" / "dist"


def create_app(config=None):
    app = Flask(__name__, static_folder="static", static_url_path="/assets")
    instance = Path(os.environ.get("GYMLOG_INSTANCE", str(ROOT.parent / "instance"))).resolve()
    settings = instance / "settings.json"
    owner = json.loads(settings.read_text(encoding="utf-8")) if settings.exists() else {}
    app.config.update(
        SECRET_KEY=owner.get("secret_key"),
        OWNER_PASSWORD_HASH=owner.get("password_hash"),
        DATABASE=str(instance / "gymlog.sqlite3"),
        SESSION_COOKIE_NAME="gymlog_owner",
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        # `flask run --debug` serves plain HTTP locally; production is HTTPS only.
        SESSION_COOKIE_SECURE=not app.debug,
        PERMANENT_SESSION_LIFETIME=timedelta(days=7),
        MAX_CONTENT_LENGTH=128 * 1024,
        FRONTEND_DIST=FRONTEND_DIST,
    )
    if config:
        app.config.update(config)
    if not app.config["SECRET_KEY"] or not app.config["OWNER_PASSWORD_HASH"]:
        raise RuntimeError("Run `uv run python setup_owner.py` before starting GymLog.")
    storage.initialize(app.config["DATABASE"])
    catalogue = json.loads((ROOT / "exercises.json").read_text(encoding="utf-8"))
    if (
        not isinstance(catalogue, list)
        or not catalogue
        or len({e["id"] for e in catalogue}) != len(catalogue)
    ):
        raise RuntimeError("exercises.json must contain unique exercise IDs.")
    catalogue_by_id = {e["id"]: e for e in catalogue}
    profiles = ("nick", "martin", "anna-lisa", "gaia")
    main_db = app.config["DATABASE"]
    with storage.connect(main_db) as db:
        db.execute(
            "CREATE TABLE IF NOT EXISTS accounts (profile TEXT PRIMARY KEY, password_hash TEXT, invite_hash TEXT, expires REAL)"
        )

    def password_hash(profile):
        if profile == "nick":
            return app.config["OWNER_PASSWORD_HASH"]
        with storage.connect(main_db) as db:
            row = db.execute(
                "SELECT password_hash FROM accounts WHERE profile=?", (profile,)
            ).fetchone()
            return row[0] if row else None

    def version(digest):
        return hashlib.sha256(digest.encode()).hexdigest()

    def signed_in():
        profile = session.get("profile", "nick")
        digest = password_hash(profile) if profile in profiles else None
        return bool(digest and session.get("owner") == version(digest))

    def login_session(profile, digest):
        session.clear()
        session.permanent = True
        session.update(profile=profile, owner=version(digest), csrf=secrets.token_urlsafe(32))
        return jsonify(authenticated=True, profile=profile, csrf=session["csrf"])

    def authenticated(function):
        @wraps(function)
        def wrapper(*args, **kwargs):
            if not signed_in():
                return jsonify(error="Please sign in to your GymLog."), 401
            profile = session.get("profile", "nick")
            if request.headers.get("X-GymLog-Profile", profile) != profile:
                return jsonify(error="Please sign in to the selected profile."), 401
            g.database = (
                main_db
                if profile == "nick"
                else str(Path(main_db).with_name(f"gymlog-{profile}.sqlite3"))
            )
            return function(*args, **kwargs)

        return wrapper

    @app.before_request
    def protect_writes():
        if request.path.startswith("/api/") and request.method not in ("GET", "HEAD", "OPTIONS"):
            if not request.is_json:
                return jsonify(error="Send a JSON request."), 415
            expected = session.get("csrf", "")
            supplied = request.headers.get("X-CSRF-Token", "")
            if not expected or not hmac.compare_digest(expected, supplied):
                return jsonify(error="Your session changed. Reload and try again."), 403

    @app.after_request
    def headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "same-origin"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        )
        if request.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.errorhandler(ValueError)
    def invalid_input(error):
        return jsonify(error=str(error)), 400

    @app.errorhandler(HTTPException)
    def http_error(error):
        if request.path.startswith("/api/"):
            return jsonify(error=error.description), error.code
        return error

    @app.get("/")
    def home():
        return send_from_directory(ROOT / "static", "index.html")

    @app.get("/next/", defaults={"path": ""})
    @app.get("/next/<path:path>")
    def frontend(path):
        # The React app replaces the UI above screen by screen. Real files are
        # served as-is; any other path is a React route and gets index.html.
        dist = Path(app.config["FRONTEND_DIST"])
        if path and (dist / path).is_file():
            return send_from_directory(dist, path)
        return send_from_directory(dist, "index.html")

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")

    @app.get("/api/session")
    def session_status():
        if "csrf" not in session:
            session["csrf"] = secrets.token_urlsafe(32)
        return jsonify(
            authenticated=signed_in(),
            profile=session.get("profile", "nick") if signed_in() else None,
            csrf=session["csrf"],
        )

    @app.post("/api/login")
    def login():
        address = hmac.new(
            app.config["SECRET_KEY"].encode(),
            (request.remote_addr or "unknown").encode(),
            hashlib.sha256,
        ).hexdigest()
        if storage.login_blocked(app.config["DATABASE"], address):
            return jsonify(error="Too many sign-in attempts. Try again in 15 minutes."), 429
        body = request.get_json()
        password = body.get("password") if isinstance(body, dict) else None
        profile = body.get("profile", "nick") if isinstance(body, dict) else "nick"
        digest = password_hash(profile) if profile in profiles else None
        valid = (
            bool(digest)
            and isinstance(password, str)
            and len(password) <= 1024
            and check_password_hash(digest, password)
        )
        storage.record_login(app.config["DATABASE"], address, valid)
        if not valid:
            return jsonify(error="That password was not recognised."), 401
        return login_session(profile, digest)

    @app.post("/api/invite")
    @authenticated
    def invite():
        if session.get("profile", "nick") != "nick":
            return jsonify(error="Only Nick can issue invitations."), 403
        body = request.get_json()
        profile = body.get("profile") if isinstance(body, dict) else None
        if profile not in profiles[1:]:
            raise ValueError("Choose a guest profile.")
        code = secrets.token_urlsafe(18)
        with storage.connect(main_db) as db:
            result = db.execute(
                """INSERT INTO accounts VALUES (?, NULL, ?, ?)
                ON CONFLICT(profile) DO UPDATE SET invite_hash=excluded.invite_hash,
                expires=excluded.expires WHERE accounts.password_hash IS NULL""",
                (profile, version(code), time.time() + 86400),
            )
            if not result.rowcount:
                return jsonify(error="This profile already has a password."), 409
        return jsonify(code=code)

    @app.post("/api/activate")
    def activate():
        body = request.get_json()
        if not isinstance(body, dict):
            raise ValueError("Enter an invitation code and password.")
        profile, code, password = (body.get(key) for key in ("profile", "code", "password"))
        if profile not in profiles[1:] or not isinstance(code, str) or len(code) > 128:
            raise ValueError("Invalid invitation.")
        if not isinstance(password, str) or not 12 <= len(password) <= 1024:
            raise ValueError("Choose a password of at least 12 characters.")
        candidate = version(code.strip())
        with storage.connect(main_db) as db:
            row = db.execute(
                "SELECT 1 FROM accounts WHERE profile=? AND invite_hash=? AND expires>? AND password_hash IS NULL",
                (profile, candidate, time.time()),
            ).fetchone()
        if not row:
            return jsonify(error="Invalid or expired invitation."), 403
        digest = generate_password_hash(password)
        storage.initialize(Path(main_db).with_name(f"gymlog-{profile}.sqlite3"))
        with storage.connect(main_db) as db:
            result = db.execute(
                "UPDATE accounts SET password_hash=?, invite_hash=NULL, expires=NULL WHERE profile=? AND invite_hash=? AND expires>? AND password_hash IS NULL",
                (digest, profile, candidate, time.time()),
            )
            if not result.rowcount:
                return jsonify(error="Invalid or expired invitation."), 403
        return login_session(profile, digest)

    @app.post("/api/logout")
    def logout():
        session.clear()
        return jsonify(ok=True)

    @app.get("/api/state")
    @authenticated
    def state():
        return jsonify(
            exercises=catalogue,
            templates=storage.documents(g.database, "templates"),
            sessions=storage.documents(g.database, "sessions"),
            weights=storage.weights(g.database),
        )

    @app.post("/api/templates")
    @authenticated
    def create_template():
        document = validate_template(request.get_json(), catalogue_by_id)
        return jsonify(storage.add_template(g.database, document)), 201

    @app.post("/api/sessions")
    @authenticated
    def finish_session():
        body = request.get_json()
        if not isinstance(body, dict):
            raise ValueError("A session object is required.")
        template_id = body.get("templateId")
        if not isinstance(template_id, str):
            raise ValueError("Select a workout template.")
        template = storage.get_template(g.database, template_id)
        if template is None:
            return jsonify(error="That workout template could not be found."), 404
        document = validate_session(body, template)
        existing = storage.existing_session(g.database, document["clientId"])
        if existing:
            comparable = {key: existing[key] for key in document}
            for exercise in comparable["exercises"]:
                exercise["estimated1rm"] = best_1rm(exercise["sets"])
            if comparable != document:
                return jsonify(
                    error="This session was already saved with different values. Reload your history."
                ), 409
            return jsonify(existing)
        return jsonify(storage.add_session(g.database, document)), 201

    @app.post("/api/weights")
    @authenticated
    def record_weight():
        body = request.get_json()
        if not isinstance(body, dict):
            raise ValueError("A weight entry is required.")
        try:
            day = date.fromisoformat(body.get("day", "")).isoformat()
        except (ValueError, TypeError):
            raise ValueError("Choose a valid date.") from None
        kg = number(body.get("kg"), "Body weight", 1, 700)
        return jsonify(storage.save_weight(g.database, day, kg))

    return app
