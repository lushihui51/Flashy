"""A guest's request is one with no Authorization header. These tests remove both of the
`client` fixture's overrides, so the real get_viewer and get_current_app_user answer it,
against an example library: a library built as existing_user through the client, whose
Clerk identity is then taken off."""

import re
import uuid

import jwt
import pytest
from fastapi.routing import APIRoute
from sqlalchemy.exc import DBAPIError

from app import dependencies
from app.database_ops.app_user import db_update_app_user_clerk_id, db_update_app_user_timezone
from app.dependencies import get_current_app_user, get_viewer
from app.main import app
from app.models.app_user import AppUser
from app.models.deck import Deck


def _remove_auth_overrides():
    app.dependency_overrides.pop(get_current_app_user, None)
    app.dependency_overrides.pop(get_viewer, None)


def _rate_until_done(client, run_id):
    for _ in range(10):
        card = client.get(f"/api/runs/{run_id}/state").json()["current_card"]
        if card is None:
            return
        res = client.post(
            f"/api/run_cards/{card['run_card_id']}/rate",
            json={"ratings": {a["field_def_id"]: 4 for a in card["answers"]}},
        )
        assert res.status_code == 200, res.text
    raise AssertionError(f"run {run_id} never finished")


@pytest.fixture
def example_library(client, db, existing_user):
    """The ids of a deck "Verbs" of two cards and a practice of it with one completed run
    and one active run, owned by existing_user, who is then made the example user. The
    client's requests are a guest's from here on."""
    deck_res = client.post(
        "/api/decks",
        json={
            "name": "Verbs",
            "field_defs": [{"name": "front", "type": "text"}, {"name": "back", "type": "text"}],
        },
    )
    assert deck_res.status_code == 201, deck_res.text
    deck = deck_res.json()
    fields = [fd["id"] for fd in deck["field_defs"]]
    card_ids = []
    for front, back in (("q1", "a1"), ("q2", "a2")):
        card_res = client.post(
            "/api/cards", json={"deck_id": deck["id"], "values": {fields[0]: front, fields[1]: back}}
        )
        assert card_res.status_code == 201, card_res.text
        card_ids.append(card_res.json()["id"])

    practice_res = client.post("/api/practices", json={"deck_ids": [deck["id"]]})
    assert practice_res.status_code == 201, practice_res.text
    practice_id = practice_res.json()["id"]
    completed_res = client.post(f"/api/practices/{practice_id}/runs")
    assert completed_res.status_code == 200, completed_res.text
    completed_run_id = completed_res.json()["id"]
    _rate_until_done(client, completed_run_id)
    active_res = client.post(f"/api/runs/{completed_run_id}/rerun")
    assert active_res.status_code == 201, active_res.text
    active_run_id = active_res.json()["id"]
    current_card = client.get(f"/api/runs/{active_run_id}/state").json()["current_card"]

    db_update_app_user_clerk_id(db, existing_user, None)
    _remove_auth_overrides()
    return {
        "deck_id": deck["id"],
        "field_id": fields[0],
        "card_id": card_ids[0],
        "practice_id": practice_id,
        "run_id": active_run_id,
        "completed_run_id": completed_run_id,
        "run_card_id": current_card["run_card_id"],
    }


# One request per GET route under /api but health, by the route's path, from the
# example library's ids.
READ_REQUESTS = {
    "/api/decks": lambda lib: "/api/decks",
    "/api/decks/{deck_id}": lambda lib: f"/api/decks/{lib['deck_id']}",
    "/api/decks/{deck_id}/fields": lambda lib: f"/api/decks/{lib['deck_id']}/fields",
    "/api/fields/{field_id}": lambda lib: f"/api/fields/{lib['field_id']}",
    "/api/cards": lambda lib: f"/api/cards?deck_id={lib['deck_id']}",
    "/api/cards/{card_id}": lambda lib: f"/api/cards/{lib['card_id']}",
    "/api/deletion-impact": lambda lib: f"/api/deletion-impact?deck_ids={lib['deck_id']}",
    "/api/practices": lambda lib: "/api/practices",
    "/api/practices/suggested-name": (
        lambda lib: f"/api/practices/suggested-name?deck_ids={lib['deck_id']}"
    ),
    "/api/practices/{practice_id}": lambda lib: f"/api/practices/{lib['practice_id']}",
    "/api/runs/{run_id}": lambda lib: f"/api/runs/{lib['run_id']}",
    "/api/runs/{run_id}/state": lambda lib: f"/api/runs/{lib['run_id']}/state",
    "/api/runs/{run_id}/breakdown": lambda lib: f"/api/runs/{lib['completed_run_id']}/breakdown",
    "/api/home": lambda lib: "/api/home",
}


def _api_routes() -> list[APIRoute]:
    return [r for r in app.routes if isinstance(r, APIRoute) and r.path.startswith("/api/")]


def test_the_read_test_covers_every_get_route_in_the_route_table():
    get_paths = {
        r.path for r in _api_routes() if "GET" in r.methods and r.path != "/api/health"
    }
    assert set(READ_REQUESTS) == get_paths


def test_every_get_route_answers_a_guest_200(client, example_library):
    for path, url in READ_REQUESTS.items():
        res = client.get(url(example_library))
        assert res.status_code == 200, f"{path}: {res.status_code} {res.text}"

    assert [d["name"] for d in client.get("/api/decks").json()] == ["Verbs"]
    home = client.get("/api/home").json()
    assert [r["id"] for r in home["active_runs"]] == [example_library["run_id"]]


def test_every_writing_route_answers_a_guest_401(client, example_library):
    writing = [(m, r.path) for r in _api_routes() for m in sorted(r.methods) if m != "GET"]
    assert writing, "the route table holds no writing route"
    home_before = client.get("/api/home").json()

    for method, path in writing:
        url = re.sub(
            r"\{(\w+)\}", lambda m: str(example_library.get(m.group(1), uuid.uuid4())), path
        )
        res = client.request(method, url)
        assert res.status_code == 401, f"{method} {path}: {res.status_code} {res.text}"

    assert client.get("/api/home").json() == home_before


def test_a_token_that_fails_verification_is_401_on_a_read(client, example_library, monkeypatch):
    def _refuse(token: str) -> dict:
        raise jwt.InvalidTokenError("not a session")

    monkeypatch.setattr(dependencies, "verify_clerk_session", _refuse)
    res = client.get("/api/decks", headers={"Authorization": "Bearer not-a-session"})
    assert res.status_code == 401


def test_a_read_with_no_header_is_401_in_a_database_with_no_example_user(client):
    _remove_auth_overrides()
    assert client.get("/api/decks").status_code == 401


def test_a_guests_transaction_refuses_a_write_and_the_next_one_writes(db):
    example = AppUser(clerk_user_id=None, timezone="UTC")
    db.add(example)
    db.commit()

    viewer = get_viewer(db)
    assert viewer.id == example.id
    with pytest.raises(DBAPIError) as refused:
        db_update_app_user_timezone(db, viewer, "Europe/London")
    assert refused.value.orig.pgcode == "25006"  # read_only_sql_transaction

    db.rollback()
    assert db_update_app_user_timezone(db, viewer, "Europe/London").timezone == "Europe/London"


def test_the_bypass_answers_a_read_with_no_header_as_its_user(
    client, db, example_library, other_user, monkeypatch
):
    db.add(Deck(user_id=other_user.id, name="Nouns"))
    db.commit()
    monkeypatch.setattr(dependencies, "_DEV_AUTH_BYPASS_ENABLED", True)
    monkeypatch.setattr(dependencies, "_DEV_AUTH_USER_ID", other_user.clerk_user_id)

    res = client.get("/api/decks")
    assert res.status_code == 200
    assert [d["name"] for d in res.json()] == ["Nouns"]
