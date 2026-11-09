"""The API answers and the built frontend is served with a React-router fallback."""

import pytest

from gymlog import create_app


@pytest.fixture
def client(tmp_path):
    (tmp_path / "index.html").write_text("<div id=root></div>")
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "app.js").write_text("console.log('gymlog')")
    return create_app({"TESTING": True, "FRONTEND_DIST": tmp_path}).test_client()


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json == {"status": "ok"}


def test_static_file_is_served(client):
    assert client.get("/assets/app.js").text == "console.log('gymlog')"


@pytest.mark.parametrize("path", ["/", "/workouts/new"])
def test_unknown_paths_fall_back_to_index(client, path):
    assert client.get(path).text == "<div id=root></div>"
