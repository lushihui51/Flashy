import pytest
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from app.database_ops.app_user import db_read_app_user_by_clerk_id, db_read_example_app_user
from app.models.app_user import AppUser
from app.models.deck import Deck
from app.scripts import example_user
from app.scripts.example_user import ExampleUserError, attach, detach
from tests import conftest


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


def _account(db, clerk_user_id, timezone="UTC"):
    user = AppUser(clerk_user_id=clerk_user_id, timezone=timezone)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _example(db):
    return _account(db, None)


def test_detach_makes_the_account_the_example_user(db):
    user = _account(db, "clerk-a", timezone="America/Los_Angeles")
    deck = Deck(user_id=user.id, name="Verbs")
    db.add(deck)
    db.commit()
    created_at = user.created_at

    detached = detach(db, "clerk-a")

    example = db_read_example_app_user(db)
    assert detached.id == example.id == user.id
    assert example.timezone == "America/Los_Angeles"
    assert example.created_at == created_at
    decks = db.exec(select(Deck).where(Deck.user_id == user.id)).all()
    assert [d.id for d in decks] == [deck.id]


def test_detach_is_refused_for_an_unknown_id_and_when_an_example_user_exists(db):
    with pytest.raises(ExampleUserError):
        detach(db, "clerk-unknown")

    user = _account(db, "clerk-a")
    example = _example(db)
    with pytest.raises(ExampleUserError):
        detach(db, "clerk-a")

    db.refresh(user)
    assert user.clerk_user_id == "clerk-a"
    assert db_read_example_app_user(db).id == example.id


def test_attach_gives_the_example_user_an_identity(db):
    example = _example(db)

    attached = attach(db, "clerk-new")

    assert attached.id == example.id
    assert db_read_example_app_user(db) is None
    assert db_read_app_user_by_clerk_id(db, "clerk-new").id == example.id


def test_attach_is_refused_with_no_example_user_and_for_an_id_in_use(db):
    user = _account(db, "clerk-a")
    with pytest.raises(ExampleUserError):
        attach(db, "clerk-new")

    example = _example(db)
    with pytest.raises(ExampleUserError):
        attach(db, "clerk-a")

    db.refresh(user)
    assert user.clerk_user_id == "clerk-a"
    assert db_read_example_app_user(db).id == example.id


@pytest.fixture
def script_on_the_test_database(monkeypatch):
    """Points `main` at the test database, never the one `DATABASE_URL` names."""
    monkeypatch.setattr(example_user, "engine", conftest.engine)


def test_main_exits_1_and_writes_nothing_on_a_refusal(db, script_on_the_test_database, capsys):
    assert example_user.main(["attach", "clerk-new"]) == 1
    assert example_user.main(["detach", "clerk-unknown"]) == 1

    user = _account(db, "clerk-a")
    example = _example(db)
    assert example_user.main(["detach", "clerk-a"]) == 1
    assert example_user.main(["attach", "clerk-a"]) == 1

    captured = capsys.readouterr()
    assert captured.out == ""
    assert len(captured.err.splitlines()) == 4
    db.refresh(user)
    db.refresh(example)
    assert user.clerk_user_id == "clerk-a"
    assert example.clerk_user_id is None


def test_main_prints_the_rows_id_and_exits_0(db, script_on_the_test_database, capsys):
    user = _account(db, "clerk-a")

    assert example_user.main(["detach", "clerk-a"]) == 0
    assert capsys.readouterr().out == f"{user.id}\n"
    assert db_read_example_app_user(db).id == user.id

    assert example_user.main(["attach", "clerk-b"]) == 0
    assert capsys.readouterr().out == f"{user.id}\n"
    db.refresh(user)
    assert user.clerk_user_id == "clerk-b"
