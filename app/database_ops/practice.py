import uuid
from collections.abc import Collection

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, func, or_, select

from app.models.deck import Deck
from app.models.practice import Practice
from app.models.practice_configuration import PracticeConfiguration
from app.models.practice_payloads import DeckNameRead, PracticeListing
from app.models.run import Run, RunStatus


def db_try_stage_create_practice(
    db: Session, user_id: uuid.UUID, name: str
) -> Practice | None:
    """Adds and flushes a practice of user_id named `name`, or returns None when the user
    already has a practice of that name, owning its savepoint. No commit."""
    practice = Practice(user_id=user_id, name=name)
    try:
        with db.begin_nested():
            db.add(practice)
            db.flush()
    except IntegrityError:
        return None
    return practice


def db_read_practice(
    db: Session, practice_id: uuid.UUID, user_id: uuid.UUID
) -> Practice | None:
    return db.exec(
        select(Practice).where(Practice.id == practice_id, Practice.user_id == user_id)
    ).first()


def db_read_owned_deck_names(
    db: Session, user_id: uuid.UUID, deck_ids: Collection[uuid.UUID]
) -> dict[uuid.UUID, str]:
    """`{deck.id: deck.name}` for those of `deck_ids` that exist and belong to user_id."""
    if not deck_ids:
        return {}
    return dict(
        db.exec(
            select(Deck.id, Deck.name).where(
                col(Deck.id).in_(deck_ids), Deck.user_id == user_id
            )
        ).all()
    )


def db_read_practice_names_from(db: Session, user_id: uuid.UUID, name: str) -> set[str]:
    """The names of the user's practices that are `name` or `name` followed by " (", the
    only names a numbered suggestion of `name` can meet."""
    return set(
        db.exec(
            select(Practice.name).where(
                Practice.user_id == user_id,
                or_(
                    Practice.name == name,
                    col(Practice.name).startswith(f"{name} (", autoescape=True),
                ),
            )
        ).all()
    )


def db_read_practice_listings(
    db: Session, user_id: uuid.UUID, practice_id: uuid.UUID | None = None
) -> list[PracticeListing]:
    """The user's practices, or only `practice_id` when given, in two statements: by the
    latest `last_activity_at` of their runs, or `created_at` with none, newest first, then
    id; each with its decks, most recently changed first, and its active run."""
    owned_runs = select(Run).join(Practice, Practice.id == Run.practice_id).where(
        Practice.user_id == user_id
    )
    if practice_id is not None:
        owned_runs = owned_runs.where(Run.practice_id == practice_id)
    owned = owned_runs.subquery()
    latest_run = (
        select(owned.c.practice_id, func.max(owned.c.last_activity_at).label("latest"))
        .group_by(owned.c.practice_id)
        .subquery()
    )
    active_run = (
        select(owned.c.id, owned.c.practice_id)
        .where(owned.c.status == RunStatus.active)
        .subquery()
    )
    query = (
        select(Practice, active_run.c.id)
        .outerjoin(latest_run, latest_run.c.practice_id == Practice.id)
        .outerjoin(active_run, active_run.c.practice_id == Practice.id)
        .where(Practice.user_id == user_id)
        .order_by(
            func.coalesce(latest_run.c.latest, Practice.created_at).desc(), col(Practice.id)
        )
    )
    if practice_id is not None:
        query = query.where(Practice.id == practice_id)
    rows = db.exec(query).all()
    if not rows:
        return []

    decks_by_practice: dict[uuid.UUID, list[DeckNameRead]] = {}
    for owner_id, deck_id, deck_name in db.exec(
        select(PracticeConfiguration.practice_id, Deck.id, Deck.name)
        .join(Deck, Deck.id == PracticeConfiguration.deck_id)
        .where(col(PracticeConfiguration.practice_id).in_([p.id for p, _ in rows]))
        .order_by(col(Deck.last_activity_at).desc(), col(Deck.id))
    ).all():
        decks_by_practice.setdefault(owner_id, []).append(
            DeckNameRead(deck_id=deck_id, deck_name=deck_name)
        )

    return [
        PracticeListing(
            id=practice.id,
            name=practice.name,
            created_at=practice.created_at,
            decks=decks_by_practice.get(practice.id, []),
            active_run_id=active_run_id,
        )
        for practice, active_run_id in rows
    ]
