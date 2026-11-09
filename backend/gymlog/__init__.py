"""GymLog Flask app: JSON API under /api, the built React frontend everywhere else."""

from pathlib import Path

from flask import Flask, jsonify, send_from_directory

FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


def create_app(config: dict | None = None) -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config.update(FRONTEND_DIST=FRONTEND_DIST)
    if config:
        app.config.update(config)

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")

    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    def frontend(path: str):
        # Real files (JS, CSS, icons) are served as-is; every other path is a
        # React route, so it gets index.html and the client router takes over.
        dist = Path(app.config["FRONTEND_DIST"])
        if path and (dist / path).is_file():
            return send_from_directory(dist, path)
        return send_from_directory(dist, "index.html")

    return app
