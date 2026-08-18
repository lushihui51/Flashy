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


@pytest.fixture
def existing_user(db):
    from app.models.app_user import AppUser

    user = AppUser(clerk_user_id="test-clerk-id")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def existing_subject(client, existing_user):
    response = client.post(
        "/api/subjects", json={"user_id": str(existing_user.id), "name": "Test Subject"}
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def existing_deck(client, existing_subject):
    response = client.post(
        "/api/decks",
        json={"subject_id": existing_subject["id"], "name": "Test Deck"},
    )
    assert response.status_code == 201, response.text
    return response.json()


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
