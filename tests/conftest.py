import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from app.config import settings
from app.database import get_session
from app.main import app

engine = create_engine(settings.test_database_url, echo=False)


def override_get_session():
    with Session(engine) as session:
        yield session


app.dependency_overrides[get_session] = override_get_session


@pytest.fixture()
def init_db():
    from app import models  # noqa: F401

    SQLModel.metadata.create_all(bind=engine)
    yield
    SQLModel.metadata.drop_all(bind=engine)


@pytest.fixture
def db(init_db):
    with Session(engine) as session:
        yield session


@pytest.fixture()
def client(init_db):
    with TestClient(app) as client:
        yield client


@pytest.fixture()
def subject_path():
    return "/flashcards/subject"


@pytest.fixture()
def deck_path():
    return "/decks/deck"


@pytest.fixture()
def card_path():
    return "/cards/card"


@pytest.fixture
def deck_config_path():
    return "/deck_configs/deck_config"


@pytest.fixture
def practice_path():
    return "/practice"


@pytest.fixture
def existing_subject(client, subject_path):
    response = client.post(subject_path, json={"name": "Test Subject"})
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def existing_deck(client, deck_path, existing_subject):
    response = client.post(
        deck_path,
        json={
            "name": "Test Deck",
            "subject_id": existing_subject["id"],
            "deck_schema": {
                "front": "str",
                "back": "str",
                "top": "str",
                "bottom": "str",
                "left": "str",
                "right": "str",
            },
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def existing_card(client, card_path, existing_deck):
    response = client.post(
        card_path,
        json={
            "deck_id": existing_deck["id"],
            "fields": {
                "front": "Front Value",
                "back": "Back Value",
                "top": "Top Value",
                "bottom": "Bottom Value",
                "left": "Left Value",
                "right": "Right Value",
            },
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def valid_create_deck_config_payload(existing_card):
    return {
        "deck_id": existing_card["deck_id"],
        "static_reveals": ["front"],
        "dynamic_reveals": ["top", "left"],
        "static_conceals": ["back"],
        "dynamic_conceals": ["bottom", "right"],
        "dynamic_reveal_quantity": [1, 2],
        "dynamic_conceal_quantity": [1],
    }


@pytest.fixture
def existing_deck_config(client, deck_config_path, valid_create_deck_config_payload):
    response = client.post(deck_config_path, json=valid_create_deck_config_payload)
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def existing_practice_session(client, practice_path, existing_deck_config):
    response = client.post(
        practice_path, json={"deck_config_ids": [existing_deck_config["id"]]}
    )
    assert response.status_code == 201, response.text
    return response.json()
