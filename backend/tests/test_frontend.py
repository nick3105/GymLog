"""The API answers and the built React app is served at /next/ with a router fallback."""

import pytest

from gymlog import create_app


@pytest.fixture
def client(tmp_path):
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<div id=root></div>")
    (dist / "assets" / "app.js").write_text("console.log('gymlog')")
    config = {
        "TESTING": True,
        "SECRET_KEY": "test-only-secret-key",
        "DATABASE": str(tmp_path / "test.sqlite3"),
        "FRONTEND_DIST": dist,
    }
    return create_app(config).test_client()


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json == {"status": "ok"}


def test_static_file_is_served(client):
    assert client.get("/next/assets/app.js").text == "console.log('gymlog')"


@pytest.mark.parametrize("path", ["/next/", "/next/workouts/new"])
def test_unknown_paths_fall_back_to_index(client, path):
    assert client.get(path).text == "<div id=root></div>"


def test_current_ui_stays_at_root(client):
    assert "Create an account" in client.get("/").text
