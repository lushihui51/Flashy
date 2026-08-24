import os
import uuid

# Force the dev-auth bypass (app/dependencies.py) off for tests regardless of what a
# developer has set in their local .env for `fastapi dev` — real OS env vars take
# priority over .env in pydantic-settings, and this must be set before app.config is
# imported anywhere below, since Settings() is instantiated at import time.
os.environ["DEV_AUTH_USER_ID"] = ""

import pytest
from fastapi.testclient import TestClient
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
def existing_subject(client):
    response = client.post("/api/subjects", json={"name": "Test Subject"})
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def existing_deck(db, existing_subject):
    """Inserted directly, not via POST /api/decks — that endpoint now requires
    field_defs atomically (D3: a deck always has >=2 field_defs), but most tests that
    depend on this fixture only care about having a deck to hang their own fields (via
    existing_field_defs) or other rows on, not about exercising deck-create validation.
    Bypassing the endpoint here keeps this fixture, and everything built on top of it,
    unaffected by that invariant — same idea as existing_user bypassing Clerk."""
    from app.models.deck import Deck

    deck = Deck(subject_id=uuid.UUID(existing_subject["id"]), name="Test Deck")
    db.add(deck)
    db.commit()
    db.refresh(deck)
    return {
        "id": str(deck.id),
        "subject_id": str(deck.subject_id),
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
def multi_subject_library(client):
    """Two subjects, each owning a deck with the *same name* and one practice config.

    Two decks can share a name across subjects (uniqueness is per `(subject_id, name)`),
    which is exactly why the practice filters key on deck **id** with the subject
    alongside for disambiguation. Every list/filter test needs that collision to be real
    rather than assumed, so it lives here."""
    library = {"subjects": {}, "decks": {}, "fields": {}, "configs": {}}

    for key, subject_name in (("a", "Alpha"), ("b", "Beta")):
        subject_res = client.post("/api/subjects", json={"name": subject_name})
        assert subject_res.status_code == 201, subject_res.text
        subject = subject_res.json()

        deck_res = client.post(
            "/api/decks",
            json={
                "name": "Shared Deck Name",
                "subject_id": subject["id"],
                "field_defs": [
                    {"name": "front", "type": "text"},
                    {"name": "back", "type": "text"},
                ],
                "cards": [
                    {"values": ["q1", "a1"]},
                    {"values": ["q2", "a2"]},
                ],
            },
        )
        assert deck_res.status_code == 201, deck_res.text
        deck = deck_res.json()
        fields = {fd["name"]: fd["id"] for fd in deck["field_defs"]}

        config_res = client.post(
            "/api/deck_practice_configs",
            json={
                "deck_id": deck["id"],
                "name": f"Config {key.upper()}",
                "prompt_field_ids": [fields["front"]],
                "answer_field_ids": [fields["back"]],
                "prompt_pool_ids": [],
                "prompt_pool_counts": [],
                "answer_pool_ids": [],
                "answer_pool_counts": [],
            },
        )
        assert config_res.status_code == 201, config_res.text

        library["subjects"][key] = subject
        library["decks"][key] = deck
        library["fields"][key] = fields
        library["configs"][key] = config_res.json()

    return library
