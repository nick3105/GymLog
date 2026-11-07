"""Single-owner GymLog web app. Run via run.py or import with WSGI."""
from datetime import date, timedelta
from functools import wraps
import hashlib
import hmac
import json
import os
from pathlib import Path
import secrets

from flask import Flask, jsonify, request, send_from_directory, session
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash

import storage
from models import best_1rm, number, validate_session, validate_template

ROOT = Path(__file__).resolve().parent


def create_app(config=None):
    app = Flask(__name__, static_folder="static", static_url_path="/assets")
    instance = Path(os.environ.get("GYMLOG_INSTANCE", str(ROOT / "instance"))).resolve()
    settings = instance / "settings.json"
    owner = json.loads(settings.read_text(encoding="utf-8")) if settings.exists() else {}
    app.config.update(
        SECRET_KEY=owner.get("secret_key"),
        OWNER_PASSWORD_HASH=owner.get("password_hash"),
        DATABASE=str(instance / "gymlog.sqlite3"),
        SESSION_COOKIE_NAME="gymlog_owner",
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=True,
        PERMANENT_SESSION_LIFETIME=timedelta(days=7),
        MAX_CONTENT_LENGTH=128 * 1024,
    )
    if config:
        app.config.update(config)
    if not app.config["SECRET_KEY"] or not app.config["OWNER_PASSWORD_HASH"]:
        raise RuntimeError("Run python setup_owner.py before starting GymLog.")
    storage.initialize(app.config["DATABASE"])
    catalogue = json.loads((ROOT / "exercises.json").read_text(encoding="utf-8"))
    if not isinstance(catalogue, list) or not catalogue or len({e["id"] for e in catalogue}) != len(catalogue):
        raise RuntimeError("exercises.json must contain unique exercise IDs.")
    catalogue_by_id = {e["id"]: e for e in catalogue}
    auth_version = hashlib.sha256(app.config["OWNER_PASSWORD_HASH"].encode()).hexdigest()

    def signed_in():
        return session.get("owner") == auth_version

    def authenticated(function):
        @wraps(function)
        def wrapper(*args, **kwargs):
            if not signed_in():
                return jsonify(error="Please sign in to your GymLog."), 401
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
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
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

    @app.get("/api/session")
    def session_status():
        if "csrf" not in session:
            session["csrf"] = secrets.token_urlsafe(32)
        return jsonify(authenticated=signed_in(), csrf=session["csrf"])

    @app.post("/api/login")
    def login():
        address = hmac.new(app.config["SECRET_KEY"].encode(), (request.remote_addr or "unknown").encode(), hashlib.sha256).hexdigest()
        if storage.login_blocked(app.config["DATABASE"], address):
            return jsonify(error="Too many sign-in attempts. Try again in 15 minutes."), 429
        body = request.get_json()
        password = body.get("password") if isinstance(body, dict) else None
        valid = isinstance(password, str) and len(password) <= 1024 and check_password_hash(app.config["OWNER_PASSWORD_HASH"], password)
        storage.record_login(app.config["DATABASE"], address, valid)
        if not valid:
            return jsonify(error="That password was not recognised."), 401
        session.clear()
        session.permanent = True
        session["owner"] = auth_version
        session["csrf"] = secrets.token_urlsafe(32)
        return jsonify(authenticated=True, csrf=session["csrf"])

    @app.post("/api/logout")
    def logout():
        session.clear()
        return jsonify(ok=True)

    @app.get("/api/state")
    @authenticated
    def state():
        return jsonify(exercises=catalogue, templates=storage.documents(app.config["DATABASE"], "templates"), sessions=storage.documents(app.config["DATABASE"], "sessions"), weights=storage.weights(app.config["DATABASE"]))

    @app.post("/api/templates")
    @authenticated
    def create_template():
        document = validate_template(request.get_json(), catalogue_by_id)
        return jsonify(storage.add_template(app.config["DATABASE"], document)), 201

    @app.post("/api/sessions")
    @authenticated
    def finish_session():
        body = request.get_json()
        if not isinstance(body, dict):
            raise ValueError("A session object is required.")
        template_id = body.get("templateId")
        if not isinstance(template_id, str):
            raise ValueError("Select a workout template.")
        template = storage.get_template(app.config["DATABASE"], template_id)
        if template is None:
            return jsonify(error="That workout template could not be found."), 404
        document = validate_session(body, template)
        existing = storage.existing_session(app.config["DATABASE"], document["clientId"])
        if existing:
            comparable = {key: existing[key] for key in document}
            for exercise in comparable["exercises"]:
                exercise["estimated1rm"] = best_1rm(exercise["sets"])
            if comparable != document:
                return jsonify(error="This session was already saved with different values. Reload your history."), 409
            return jsonify(existing)
        return jsonify(storage.add_session(app.config["DATABASE"], document)), 201

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
        return jsonify(storage.save_weight(app.config["DATABASE"], day, kg))

    return app
