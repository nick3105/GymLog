"""The API answers and the built React app is served at / with a router fallback."""

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


def test_health_says_which_commit_runs(client, tmp_path):
    assert client.get("/api/health").json == {"status": "ok", "commit": "local"}
    (tmp_path / "dist" / "commit.txt").write_text("abc123\n")
    assert client.get("/api/health").json == {"status": "ok", "commit": "abc123"}


def test_static_file_is_served(client):
    assert client.get("/assets/app.js").text == "console.log('gymlog')"


@pytest.mark.parametrize("path", ["/", "/start", "/review/some-id"])
def test_react_routes_fall_back_to_index(client, path):
    assert client.get(path).text == "<div id=root></div>"


@pytest.mark.parametrize("path", ["/next/", "/next/weight"])
def test_old_preview_links_redirect(client, path):
    response = client.get(path)
    assert response.status_code == 301
    assert response.location == path.removeprefix("/next")


def test_unknown_api_path_is_a_json_404(client):
    response = client.get("/api/not-real")
    assert response.status_code == 404
    assert response.json["error"]


def test_missing_build_explains_itself(tmp_path):
    app = create_app(
        {
            "SECRET_KEY": "test-only-secret-key",
            "DATABASE": str(tmp_path / "test.sqlite3"),
            "FRONTEND_DIST": tmp_path / "missing",
        }
    )
    response = app.test_client().get("/")
    assert response.status_code == 503
    assert "npm run build" in response.text


@pytest.mark.parametrize("path", ["/assets/training.js", "/instance/settings.json"])
def test_missing_files_are_404_not_the_app(client, path):
    assert client.get(path).status_code == 404
