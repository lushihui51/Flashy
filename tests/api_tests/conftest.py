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
