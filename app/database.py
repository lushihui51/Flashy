from typing import Annotated

from fastapi import Depends
from sqlmodel import Session, SQLModel, create_engine

from app.config import settings

engine = create_engine(settings.database_url, echo=False)


def init_db():
    from app.models import Card, Deck, Subject  # noqa: F401

    SQLModel.metadata.create_all(bind=engine)


def reset_db():
    SQLModel.metadata.drop_all(bind=engine)


def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]
