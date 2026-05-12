import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

from app.config import settings
from app.database import get_session
from app.main import app

engine = create_engine(settings.test_database_url, echo=True)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_session():
    with TestSessionLocal() as session:
        yield session


app.dependency_overrides[get_session] = override_get_session


@pytest.fixture()
def init_db():
    from app import models  # noqa: F401

    SQLModel.metadata.create_all(bind=engine)
    yield
    SQLModel.metadata.drop_all(bind=engine)


@pytest.fixture
def session(init_db):
    with TestSessionLocal() as session:
        yield session


@pytest.fixture()
def client(init_db):
    with TestClient(app) as client:
        yield client


@pytest.fixture()
def subject_path():
    return "/flashcards/subject"


@pytest.fixture
def existing_subject(client, subject_path):
    response = client.post(subject_path, json={"name": "Test Subject"})
    return response.json()


@pytest.fixture()
def deck_path():
    return "/decks/deck"


@pytest.fixture
def existing_deck(client, deck_path, existing_subject):
    response = client.post(
        deck_path,
        json={"name": "Test Deck", "subject_id": existing_subject["id"]},
    )
    return response.json()
