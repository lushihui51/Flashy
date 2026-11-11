import os
import uuid

# Force the dev-auth bypass (app/dependencies.py) off for tests regardless of what a
# developer has set in their local .env for `fastapi dev` — real OS env vars take
# priority over .env in pydantic-settings, and this must be set before app.config is
# imported anywhere below, since Settings() is instantiated at import time.
os.environ["DEV_AUTH_USER_ID"] = ""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine

from app.config import settings
from app.database import _CONNECT_ARGS, get_session
from app.dependencies import get_current_app_user
from app.main import app

engine = create_engine(settings.test_database_url, echo=False, connect_args=_CONNECT_ARGS)


def override_get_session():
    with Session(engine) as session:
        yield session


app.dependency_overrides[get_session] = override_get_session


@pytest.fixture()
def init_db():
    SQLModel.metadata.create_all(bind=engine)
    yield
    SQLModel.metadata.drop_all(bind=engine)


@pytest.fixture
def db(init_db):
    with Session(engine) as session:
        yield session


class _StatementCounter:
    """A resettable counter of statements whose compiled SQL names a given table,
    issued against the module-level test `engine`. For a statement-count test: reset
    immediately before the request under test, read immediately after, to prove a
    fixed statement count against that table regardless of run size."""

    def __init__(self, table_name: str):
        self._table_name = table_name
        self._count = 0

    def _before_cursor_execute(self, conn, cursor, statement, parameters, context, executemany):
        if self._table_name in statement:
            self._count += 1

    def reset(self) -> None:
        self._count = 0

    @property
    def count(self) -> int:
        return self._count


@pytest.fixture
def statement_counter():
    """A function from a table name to a new `_StatementCounter` listening on the engine."""
    counters = []

    def _make(table_name: str) -> _StatementCounter:
        counter = _StatementCounter(table_name)
        event.listen(engine, "before_cursor_execute", counter._before_cursor_execute)
        counters.append(counter)
        return counter

    yield _make
    for counter in counters:
        event.remove(engine, "before_cursor_execute", counter._before_cursor_execute)


@pytest.fixture
def mastery_log_statement_counter(statement_counter):
    return statement_counter("mastery_log")


@pytest.fixture
def existing_user(db):
    from app.models.app_user import AppUser

    user = AppUser(clerk_user_id="test-clerk-id")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def other_user(db):
    from app.models.app_user import AppUser

    user = AppUser(clerk_user_id="test-clerk-id-2")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def client(init_db, existing_user):
    """Requests through this client are authenticated as existing_user by default —
    real Clerk token verification is bypassed via a dependency override, the standard
    FastAPI testing pattern (same idea as get_session's override above). Use act_as to
    make specific requests as a different user."""
    app.dependency_overrides[get_current_app_user] = lambda: existing_user
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.pop(get_current_app_user, None)


@pytest.fixture
def act_as(client):
    def _act_as(user):
        app.dependency_overrides[get_current_app_user] = lambda: user

    return _act_as


@pytest.fixture
def existing_deck(db, existing_user):
    """Inserted directly, not via POST /api/decks — that endpoint creates the deck's
    field_defs atomically and requires at least two, since a deck always has at least
    two active fields, but most tests that depend on this fixture only care about
    having a deck to hang their own fields (via existing_field_defs) or other rows on,
    not about exercising deck-create validation. Bypassing the endpoint here keeps this
    fixture, and everything built on top of it, unaffected by that invariant — same
    idea as existing_user bypassing Clerk."""
    from app.models.deck import Deck

    deck = Deck(user_id=existing_user.id, name="Test Deck")
    db.add(deck)
    db.commit()
    db.refresh(deck)
    return {
        "id": str(deck.id),
        "name": deck.name,
        "created_at": deck.created_at.isoformat(),
    }


@pytest.fixture
def existing_field_defs(client, existing_deck):
    front = client.post(
        f"/api/decks/{existing_deck['id']}/fields", json={"name": "front", "type": "text"}
    )
    back = client.post(
        f"/api/decks/{existing_deck['id']}/fields", json={"name": "back", "type": "text"}
    )
    assert front.status_code == 201, front.text
    assert back.status_code == 201, back.text
    return [front.json(), back.json()]


@pytest.fixture
def existing_card(client, existing_deck, existing_field_defs):
    values = {fd["id"]: f"Value for {fd['name']}" for fd in existing_field_defs}
    response = client.post(
        "/api/cards", json={"deck_id": existing_deck["id"], "values": values}
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def two_deck_library(client):
    """Two decks of the requesting user, "Alpha" under key "a" and "Beta" under key
    "b", each with fields "front" and "back" and two cards — for the tests of lists and
    filters over more than one deck."""
    library = {"decks": {}, "fields": {}}

    for key, deck_name in (("a", "Alpha"), ("b", "Beta")):
        deck_res = client.post(
            "/api/decks",
            json={
                "name": deck_name,
                "field_defs": [
                    {"name": "front", "type": "text"},
                    {"name": "back", "type": "text"},
                ],
            },
        )
        assert deck_res.status_code == 201, deck_res.text
        deck = deck_res.json()
        fields = {fd["name"]: fd["id"] for fd in deck["field_defs"]}
        for front_value, back_value in (("q1", "a1"), ("q2", "a2")):
            card_res = client.post(
                "/api/cards",
                json={
                    "deck_id": deck["id"],
                    "values": {fields["front"]: front_value, fields["back"]: back_value},
                },
            )
            assert card_res.status_code == 201, card_res.text

        library["decks"][key] = deck
        library["fields"][key] = fields

    return library


def configuration(
    prompt=(), answer=(), prompt_pool=(), prompt_counts=(), answer_pool=(), answer_counts=()
) -> dict[str, list]:
    """A configuration's six columns from field ids given as strings or uuids, for
    make_practice."""

    def ids(values):
        return [uuid.UUID(str(value)) for value in values]

    return {
        "prompt_field_ids": ids(prompt),
        "answer_field_ids": ids(answer),
        "prompt_pool_ids": ids(prompt_pool),
        "prompt_pool_counts": list(prompt_counts),
        "answer_pool_ids": ids(answer_pool),
        "answer_pool_counts": list(answer_counts),
    }


def create_practice(client, decks: dict, name: str | None = None) -> dict:
    """Creates a practice of the client's user through `POST /api/practices` and returns
    its body. `decks` maps each deck id, in the order picked, to the configuration the
    practice asks it by, or to None for the one the create gave it; a configuration is
    written straight to the test database, standing in for the board's save."""
    from sqlmodel import select

    from app.models.practice_configuration import PracticeConfiguration

    res = client.post(
        "/api/practices", json={"name": name, "deck_ids": [str(deck_id) for deck_id in decks]}
    )
    assert res.status_code == 201, res.text
    practice = res.json()
    with Session(engine) as session:
        for deck_id, arrays in decks.items():
            if arrays is None:
                continue
            row = session.exec(
                select(PracticeConfiguration).where(
                    PracticeConfiguration.practice_id == uuid.UUID(practice["id"]),
                    PracticeConfiguration.deck_id == uuid.UUID(str(deck_id)),
                )
            ).one()
            for column, value in arrays.items():
                setattr(row, column, value)
            session.add(row)
        session.commit()
    return practice


def start_practice(client, decks: dict, name: str | None = None) -> dict:
    """Creates a practice as create_practice does, starts its run through
    `POST /api/practices/{id}/runs`, and returns the run's body."""
    practice = create_practice(client, decks, name)
    res = client.post(f"/api/practices/{practice['id']}/runs")
    assert res.status_code == 200, res.text
    return res.json()
