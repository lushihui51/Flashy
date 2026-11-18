"""The route that serves a built frontend, over a folder each test writes, so no test
reads the repository's own frontend/dist."""

import os

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.frontend import add_frontend

INDEX_HTML = '<!doctype html><div id="root"></div>'
SCRIPT = "console.log('app');"
SECRET = "outside dist"


@pytest.fixture
def client(tmp_path) -> TestClient:
    """A client of an app serving a dist folder that holds index.html and assets/app.js,
    beside a file secret.txt outside it and linked from inside it as assets/link.txt."""
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text(INDEX_HTML)
    (dist / "assets" / "app.js").write_text(SCRIPT)
    (tmp_path / "secret.txt").write_text(SECRET)
    os.symlink(tmp_path / "secret.txt", dist / "assets" / "link.txt")
    app = FastAPI()
    add_frontend(app, dist)
    return TestClient(app)


def test_a_path_that_names_a_file_answers_the_file(client):
    response = client.get("/assets/app.js")
    assert response.status_code == 200
    assert response.text == SCRIPT
    assert "javascript" in response.headers["content-type"]


@pytest.mark.parametrize("path", ["/", "/library"])
def test_any_other_path_answers_index_html(client, path):
    response = client.get(path)
    assert response.status_code == 200
    assert response.text == INDEX_HTML


@pytest.mark.parametrize("path", ["/api", "/api/nope"])
def test_a_path_under_api_answers_404_and_no_page(client, path):
    response = client.get(path)
    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}


@pytest.mark.parametrize(
    "path",
    [
        "/..%2Fsecret.txt",
        "/assets/..%2F..%2Fsecret.txt",
        "/%2E%2E/secret.txt",
        "/assets/link.txt",
        "/%00",
    ],
)
def test_a_path_that_climbs_out_of_dist_answers_no_file_outside_it(client, path):
    """Each path decodes to one that leaves dist, by `..`, by a link, or by a character no
    file name holds; each answers the app's page and never the file it reaches."""
    response = client.get(path)
    assert response.status_code == 200
    assert response.text == INDEX_HTML


def test_another_method_answers_405_and_no_page(client):
    response = client.post("/library")
    assert response.status_code == 405
    assert response.json() == {"detail": "Method Not Allowed"}
