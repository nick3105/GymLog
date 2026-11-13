"""GymLog web app: the JSON API under /api and the React app at every other path."""

import hashlib
import hmac
import json
import os
import secrets
from datetime import date, timedelta
from functools import wraps
from pathlib import Path

from flask import Flask, g, jsonify, redirect, request, send_from_directory, session
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash, generate_password_hash

from . import storage
from .models import (
    best_1rm,
    exercise_stats,
    number,
    validate_registration,
    validate_session,
    validate_session_edit,
    validate_template,
    validate_weight_goal,
)

ROOT = Path(__file__).resolve().parent
FRONTEND_DIST = ROOT.parents[1] / "frontend" / "dist"


def create_app(config=None):
    app = Flask(__name__, static_folder=None)
    instance = Path(os.environ.get("GYMLOG_INSTANCE", str(ROOT.parent / "instance"))).resolve()
    settings = instance / "settings.json"
    secrets_file = json.loads(settings.read_text(encoding="utf-8")) if settings.exists() else {}
    app.config.update(
        SECRET_KEY=secrets_file.get("secret_key"),
        # Only read once, to turn Nick's pre-accounts journal into a user (see storage).
        OWNER_PASSWORD_HASH=secrets_file.get("password_hash"),
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
    if not app.config["SECRET_KEY"]:
        raise RuntimeError("Run `uv run python setup_secret.py` before starting GymLog.")
    database = app.config["DATABASE"]
    storage.initialize(database, app.config["OWNER_PASSWORD_HASH"])
    catalogue = json.loads((ROOT / "exercises.json").read_text(encoding="utf-8"))
    if (
        not isinstance(catalogue, list)
        or not catalogue
        or len({e["id"] for e in catalogue}) != len(catalogue)
    ):
        raise RuntimeError("exercises.json must contain unique exercise IDs.")
    catalogue_by_id = {e["id"]: e for e in catalogue}

    def version(digest):
        # Stored in the cookie so that changing a password signs out other devices.
        return hashlib.sha256(digest.encode()).hexdigest()

    def current_user():
        user = storage.get_user(database, session.get("user_id"))
        if user and hmac.compare_digest(session.get("auth", ""), version(user["password_hash"])):
            return user
        return None

    def login_session(user):
        session.clear()
        session.permanent = True
        session.update(
            user_id=user["id"],
            auth=version(user["password_hash"]),
            csrf=secrets.token_urlsafe(32),
        )
        return jsonify(authenticated=True, username=user["username"], csrf=session["csrf"])

    def authenticated(function):
        @wraps(function)
        def wrapper(*args, **kwargs):
            user = current_user()
            if user is None:
                return jsonify(error="Please sign in to your GymLog."), 401
            g.user_id = user["id"]
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

    @app.get("/next/", defaults={"path": ""})
    @app.get("/next/<path:path>")
    def old_preview(path):
        # React was previewed at /next/ before it became the app; keep old bookmarks working.
        return redirect("/" + path, code=301)

    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    def frontend(path):
        # Real files from the build are served as-is; any other path is a React route.
        if path.startswith("api/"):
            return jsonify(error="That API address does not exist."), 404
        dist = Path(app.config["FRONTEND_DIST"])
        if path and (dist / path).is_file():
            return send_from_directory(dist, path)
        if "." in path.rsplit("/", 1)[-1]:
            # A missing file (settings.json, an old script) is a 404, never the app.
            return "Not found.", 404
        if not (dist / "index.html").is_file():
            return "The app is not built yet. Run `npm run build` in frontend/.", 503
        return send_from_directory(dist, "index.html")

    @app.get("/api/health")
    def health():
        # The deploy workflow writes commit.txt into the build, so anyone can see what is live.
        commit_file = Path(app.config["FRONTEND_DIST"]) / "commit.txt"
        commit = commit_file.read_text().strip() if commit_file.is_file() else "local"
        return jsonify(status="ok", commit=commit)

    @app.get("/api/session")
    def session_status():
        if "csrf" not in session:
            session["csrf"] = secrets.token_urlsafe(32)
        user = current_user()
        return jsonify(
            authenticated=user is not None,
            username=user["username"] if user else None,
            csrf=session["csrf"],
        )

    @app.post("/api/register")
    def register():
        username, password = validate_registration(request.get_json())
        user_id = storage.create_user(database, username, generate_password_hash(password))
        if user_id is None:
            return jsonify(error="That username is taken. Choose another one."), 409
        return login_session(storage.get_user(database, user_id)), 201

    @app.post("/api/login")
    def login():
        address = hmac.new(
            app.config["SECRET_KEY"].encode(),
            (request.remote_addr or "unknown").encode(),
            hashlib.sha256,
        ).hexdigest()
        if storage.login_blocked(database, address):
            return jsonify(error="Too many sign-in attempts. Try again in 15 minutes."), 429
        body = request.get_json()
        username = body.get("username") if isinstance(body, dict) else None
        password = body.get("password") if isinstance(body, dict) else None
        user = None
        if isinstance(username, str) and len(username) <= 100:
            user = storage.find_user(database, username.strip())
        valid = (
            user is not None
            and isinstance(password, str)
            and len(password) <= 1024
            and check_password_hash(user["password_hash"], password)
        )
        storage.record_login(database, address, valid)
        if not valid:
            return jsonify(error="That username and password do not match."), 401
        return login_session(user)

    @app.post("/api/logout")
    def logout():
        session.clear()
        return jsonify(ok=True)

    @app.get("/api/state")
    @authenticated
    def state():
        return jsonify(
            exercises=[exercise for exercise in catalogue if not exercise.get("retired")],
            templates=storage.documents(database, g.user_id, "templates"),
            sessions=storage.documents(database, g.user_id, "sessions"),
            weights=storage.weights(database, g.user_id),
            weightGoal=storage.weight_goal(database, g.user_id),
        )

    @app.get("/api/exercises/<exercise_id>/stats")
    @authenticated
    def stats(exercise_id):
        if exercise_id not in catalogue_by_id:
            return jsonify(error="That exercise is not in the catalogue."), 404
        sessions = storage.documents(database, g.user_id, "sessions")
        return jsonify(exercise_stats(sessions, exercise_id))

    @app.post("/api/templates")
    @authenticated
    def create_template():
        document = validate_template(request.get_json(), catalogue_by_id)
        return jsonify(storage.add_template(database, g.user_id, document)), 201

    @app.post("/api/templates/<template_id>")
    @authenticated
    def edit_template(template_id):
        """Validate an owned routine and update it without rewriting history."""
        template = storage.get_template(database, g.user_id, template_id)
        if template is None:
            return jsonify(error="That workout template could not be found."), 404
        changes = validate_template(request.get_json(), catalogue_by_id)
        document = storage.update_template(database, g.user_id, {**template, **changes})
        return jsonify(document)

    @app.post("/api/templates/<template_id>/delete")
    @authenticated
    def delete_template(template_id):
        """Remove an owned template without changing completed workouts."""
        if not storage.delete_template(database, g.user_id, template_id):
            return jsonify(error="That workout template could not be found."), 404
        return jsonify(ok=True)

    @app.post("/api/sessions/<session_id>")
    @authenticated
    def edit_session(session_id):
        """Correct an owned completed workout independently of its routine."""
        saved = storage.get_session(database, g.user_id, session_id)
        if saved is None:
            return jsonify(error="That completed workout could not be found."), 404
        document = validate_session_edit(request.get_json(), saved)
        updated = storage.update_session(database, g.user_id, document)
        if updated is None:
            return jsonify(error="That completed workout could not be found."), 404
        return jsonify(updated)

    @app.post("/api/sessions")
    @authenticated
    def finish_session():
        body = request.get_json()
        if not isinstance(body, dict):
            raise ValueError("A session object is required.")
        template_id = body.get("templateId")
        if not isinstance(template_id, str):
            raise ValueError("Select a workout template.")
        template = storage.get_template(database, g.user_id, template_id)
        if template is None:
            return jsonify(error="That workout template could not be found."), 404
        document = validate_session(body, template)
        existing = storage.existing_session(database, g.user_id, document["clientId"])
        if existing:
            comparable = {key: existing[key] for key in document}
            for exercise in comparable["exercises"]:
                exercise["estimated1rm"] = best_1rm(exercise["sets"])
            if comparable != document:
                return jsonify(
                    error="This session was already saved with different values. Reload your history."
                ), 409
            return jsonify(existing)
        return jsonify(storage.add_session(database, g.user_id, document)), 201

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
        return jsonify(storage.save_weight(database, g.user_id, day, kg))

    @app.post("/api/weight-goal")
    @authenticated
    def set_weight_goal():
        body = request.get_json()
        entries = storage.weights(database, g.user_id)
        latest_weight = entries[-1]["kg"] if entries else None
        goal = validate_weight_goal(body, latest_weight)
        return jsonify(weightGoal=storage.save_weight_goal(database, g.user_id, goal))

    return app
