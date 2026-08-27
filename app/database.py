from typing import Annotated

from fastapi import Depends
from sqlmodel import Session, SQLModel, create_engine

from app.config import settings

SQLModel.metadata.naming_convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

# ADR 019: pin every connection's session TimeZone to UTC. Postgres returns a
# `timestamptz` in whatever zone the session is set to — by default the server's own
# local zone — so without this the same instant is emitted as `...-04:00` on one deploy
# host and `...+00:00` on another. The instant is identical either way, but pinning it
# keeps the API's representation deterministic and stops a host's local zone from
# leaking into responses. The user's zone is applied at render time, never here.
_CONNECT_ARGS = {"options": "-c timezone=utc"}

engine = create_engine(settings.database_url, echo=False, connect_args=_CONNECT_ARGS)


def init_db():
    SQLModel.metadata.create_all(bind=engine)


def reset_db():
    SQLModel.metadata.drop_all(bind=engine)


def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]
