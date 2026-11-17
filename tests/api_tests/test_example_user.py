import pytest
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from app.database_ops.app_user import db_read_example_app_user
from app.models.app_user import AppUser


def test_a_second_row_without_a_clerk_id_is_refused(db):
    db.add(AppUser(clerk_user_id=None))
    db.commit()

    db.add(AppUser(clerk_user_id=None))
    with pytest.raises(IntegrityError):
        db.commit()


def test_rows_with_a_clerk_id_stand_beside_the_one_without(db):
    db.add(AppUser(clerk_user_id=None))
    db.add(AppUser(clerk_user_id="clerk-a"))
    db.add(AppUser(clerk_user_id="clerk-b"))
    db.commit()

    assert len(db.exec(select(AppUser)).all()) == 3


def test_db_read_example_app_user_returns_the_row_or_none(db, existing_user):
    assert db_read_example_app_user(db) is None

    example = AppUser(clerk_user_id=None)
    db.add(example)
    db.commit()

    assert db_read_example_app_user(db).id == example.id
