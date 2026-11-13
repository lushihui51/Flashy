import uuid
from collections.abc import Collection

from sqlalchemy import Date, and_, cast, delete, distinct, exists, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import aliased
from sqlmodel import Session, col, select

from app.models.app_user import AppUser
from app.models.deck import Deck
from app.models.practice import Practice
from app.models.practice_payloads import DeckNameRead, RunListing
from app.models.run import Run, RunRead, RunStatus
from app.models.run_card import RunCard, RunCardStatus
from app.models.run_configuration import RunConfiguration
from app.models.run_counted_card import RunCountedCard


def db_try_stage_create_run(db: Session, practice_id: uuid.UUID) -> Run | None:
    """Adds and flushes an active run of the practice, or returns None when the practice
    already has an active run, owning its savepoint. No commit."""
    run = Run(practice_id=practice_id)
    try:
        with db.begin_nested():
            db.add(run)
            db.flush()
    except IntegrityError:
        return None
    return run


def db_stage_create_run(db: Session, practice_id: uuid.UUID) -> Run:
    """Adds and flushes an active run of the practice. No commit: the run, its copies and
    its card rows are one transaction."""
    run = Run(practice_id=practice_id)
    db.add(run)
    db.flush()
    return run


def db_read_run(db: Session, run_id: uuid.UUID, user_id: uuid.UUID) -> Run | None:
    return db.exec(
        select(Run)
        .join(Practice, Practice.id == Run.practice_id)
        .where(Run.id == run_id, Practice.user_id == user_id)
    ).first()


def db_read_active_run(db: Session, practice_id: uuid.UUID) -> Run | None:
    """Unscoped: the caller has already ownership-checked the practice."""
    return db.exec(
        select(Run).where(Run.practice_id == practice_id, Run.status == RunStatus.active)
    ).first()


def _run_days(practice_filter):
    """Each run of the practices `practice_filter` admits, with its `day`, the date of its
    `created_at` in its user's zone, and its `day_index`, its place from 0 among its
    practice's runs of that day by `created_at` then id."""
    day = cast(func.timezone(AppUser.timezone, Run.created_at), Date)
    return (
        select(
            Run.id,
            day.label("day"),
            (
                func.row_number().over(
                    partition_by=(Run.practice_id, day), order_by=(Run.created_at, Run.id)
                )
                - 1
            ).label("day_index"),
        )
        .join(Practice, Practice.id == Run.practice_id)
        .join(AppUser, AppUser.id == Practice.user_id)
        .where(practice_filter)
        .subquery()
    )


def _run_read(run: Run, day, day_index: int) -> RunRead:
    # model_validate over the ORM row rather than **model_dump(): `status` is stored in a
    # plain String column, so dumping the table model hands back a bare str.
    return RunRead.model_validate(run, update={"day": day, "day_index": day_index})


def db_read_run_read(db: Session, run_id: uuid.UUID, user_id: uuid.UUID) -> RunRead | None:
    days = _run_days(
        Practice.id == select(Run.practice_id).where(Run.id == run_id).scalar_subquery()
    )
    row = db.exec(
        select(Run, days.c.day, days.c.day_index)
        .join(days, days.c.id == Run.id)
        .join(Practice, Practice.id == Run.practice_id)
        .where(Run.id == run_id, Practice.user_id == user_id)
    ).first()
    return _run_read(*row) if row else None


def _run_listings(practice_filter, run_filter):
    """Each run `run_filter` admits among the practices `practice_filter` admits, with its
    day, its day index and its counts of cards reached and counted, as RunListing's
    columns."""
    days = _run_days(practice_filter)
    runs = select(Run.id).where(run_filter)
    reached = (
        select(RunCard.run_id, func.count(distinct(RunCard.card_id)).label("n"))
        .where(col(RunCard.run_id).in_(runs), RunCard.status != RunCardStatus.pending)
        .group_by(RunCard.run_id)
        .subquery()
    )
    counted = (
        select(RunCountedCard.run_id, func.count().label("n"))
        .where(col(RunCountedCard.run_id).in_(runs))
        .group_by(RunCountedCard.run_id)
        .subquery()
    )
    return (
        select(
            Run,
            days.c.day,
            days.c.day_index,
            func.coalesce(reached.c.n, 0),
            func.coalesce(counted.c.n, 0),
        )
        .join(days, days.c.id == Run.id)
        .outerjoin(reached, reached.c.run_id == Run.id)
        .outerjoin(counted, counted.c.run_id == Run.id)
        .where(run_filter)
    )


def _run_listing(
    run: Run, day, day_index: int, reached_cards: int, counted_cards: int
) -> RunListing:
    return RunListing.model_validate(
        run,
        update={
            "day": day,
            "day_index": day_index,
            "reached_cards": reached_cards,
            "counted_cards": counted_cards,
        },
    )


def db_read_run_listing(db: Session, run_id: uuid.UUID, user_id: uuid.UUID) -> RunListing | None:
    row = db.exec(
        _run_listings(
            Practice.id == select(Run.practice_id).where(Run.id == run_id).scalar_subquery(),
            Run.id == run_id,
        ).join(Practice, Practice.id == Run.practice_id).where(Practice.user_id == user_id)
    ).first()
    return _run_listing(*row) if row else None


def db_read_run_reads_for_practice(db: Session, practice_id: uuid.UUID) -> list[RunListing]:
    """The practice's runs, newest `last_activity_at` first, then id, each with its counts
    of cards reached and counted. Unscoped: the caller has already ownership-checked the
    practice."""
    rows = db.exec(
        _run_listings(Practice.id == practice_id, Run.practice_id == practice_id).order_by(
            col(Run.last_activity_at).desc(), col(Run.id)
        )
    ).all()
    return [_run_listing(*row) for row in rows]


def _home_run_listings(
    db: Session, user_id: uuid.UUID, run_filter, limit: int
) -> list[tuple[RunListing, str]]:
    """Up to `limit` of the user's runs `run_filter` admits, newest `last_activity_at`
    first, then id, each with its counts and its practice's name, in one statement."""
    users_practices = select(Practice.id).where(Practice.user_id == user_id)
    rows = db.exec(
        _run_listings(
            Practice.user_id == user_id,
            and_(col(Run.practice_id).in_(users_practices), run_filter),
        )
        .join(Practice, Practice.id == Run.practice_id)
        .add_columns(Practice.name)
        .order_by(col(Run.last_activity_at).desc(), col(Run.id))
        .limit(limit)
    ).all()
    return [(_run_listing(*row[:-1]), row[-1]) for row in rows]


def db_read_active_run_listings(
    db: Session, user_id: uuid.UUID, limit: int
) -> list[tuple[RunListing, str]]:
    """Up to `limit` of the user's active runs, newest `last_activity_at` first, then id,
    each with its counts and its practice's name."""
    return _home_run_listings(db, user_id, Run.status == RunStatus.active, limit)


def db_read_recent_run_listings(
    db: Session, user_id: uuid.UUID, limit: int
) -> list[tuple[RunListing, str]]:
    """Up to `limit` completed runs of the user, the latest of each practice by
    `last_activity_at`, none of a practice that has an active run, newest first, then id,
    each with its counts and its practice's name."""
    users_practices = select(Practice.id).where(Practice.user_id == user_id)
    # Aliased so that neither subquery correlates to the outer statement's run.
    ranked_run = aliased(Run)
    active_run = aliased(Run)
    ranked = (
        select(
            ranked_run.id,
            func.row_number()
            .over(
                partition_by=ranked_run.practice_id,
                order_by=(col(ranked_run.last_activity_at).desc(), col(ranked_run.id)),
            )
            .label("rank"),
        )
        .where(
            ranked_run.status == RunStatus.completed,
            col(ranked_run.practice_id).in_(users_practices),
        )
        .subquery()
    )
    latest_of_its_practice = col(Run.id).in_(select(ranked.c.id).where(ranked.c.rank == 1))
    practice_has_no_active_run = col(Run.practice_id).not_in(
        select(active_run.practice_id).where(
            active_run.status == RunStatus.active,
            col(active_run.practice_id).in_(users_practices),
        )
    )
    return _home_run_listings(
        db, user_id, and_(latest_of_its_practice, practice_has_no_active_run), limit
    )


def db_read_run_decks(
    db: Session, run_ids: Collection[uuid.UUID]
) -> dict[uuid.UUID, list[DeckNameRead]]:
    """Each run's decks, most recently changed first, in one statement; a run with no
    deck has no entry. Unscoped: the caller has already ownership-checked the runs."""
    if not run_ids:
        return {}
    decks_by_run: dict[uuid.UUID, list[DeckNameRead]] = {}
    for run_id, deck_id, deck_name in db.exec(
        select(RunConfiguration.run_id, Deck.id, Deck.name)
        .join(Deck, Deck.id == RunConfiguration.deck_id)
        .where(col(RunConfiguration.run_id).in_(run_ids))
        .order_by(col(Deck.last_activity_at).desc(), col(Deck.id))
    ).all():
        decks_by_run.setdefault(run_id, []).append(
            DeckNameRead(deck_id=deck_id, deck_name=deck_name)
        )
    return decks_by_run


def db_read_run_ids_with_all_decks_in(
    db: Session, user_id: uuid.UUID, deck_ids: Collection[uuid.UUID]
) -> set[uuid.UUID]:
    """Runs of user_id with at least one run_configuration, none of whose
    run_configurations points at a deck outside deck_ids: a run entirely contained in
    this closure of decks, which the deletion closure deletes with them."""
    if not deck_ids:
        return set()
    has_a_deck = exists().where(RunConfiguration.run_id == Run.id)
    has_an_outside_deck = exists().where(
        RunConfiguration.run_id == Run.id,
        col(RunConfiguration.deck_id).not_in(deck_ids),
    )
    query = (
        select(Run.id)
        .join(Practice, Practice.id == Run.practice_id)
        .where(Practice.user_id == user_id, has_a_deck, ~has_an_outside_deck)
    )
    return set(db.exec(query).all())


def db_read_active_run_ids_naming_fields(
    db: Session, user_id: uuid.UUID, field_ids: Collection[uuid.UUID]
) -> set[uuid.UUID]:
    """Active runs of user_id with a run_configuration whose prompt/answer/pool field
    arrays overlap field_ids, which the deletion closure deletes. Completed runs are
    never touched by a field-only deletion: they still show their attempts, they just
    don't need to be rateable any more."""
    if not field_ids:
        return set()
    ids = list(field_ids)
    query = (
        select(Run.id)
        .join(Practice, Practice.id == Run.practice_id)
        .join(RunConfiguration, RunConfiguration.run_id == Run.id)
        .where(
            Practice.user_id == user_id,
            Run.status == RunStatus.active,
            or_(
                col(RunConfiguration.prompt_field_ids).op("&&")(ids),
                col(RunConfiguration.answer_field_ids).op("&&")(ids),
                col(RunConfiguration.prompt_pool_ids).op("&&")(ids),
                col(RunConfiguration.answer_pool_ids).op("&&")(ids),
            ),
        )
    )
    return set(db.exec(query).all())


def db_stage_delete_runs(db: Session, ids: Collection[uuid.UUID]) -> None:
    """Bulk delete by id, no commit — apply_deletion owns the transaction. Its
    copies, card rows and counted cards cascade away with it; every review and mastery
    value it produced stays."""
    if not ids:
        return
    db.execute(delete(Run).where(col(Run.id).in_(ids)))


def db_stage_update_run_status(db: Session, run: Run, status: RunStatus) -> Run:
    """No commit: the caller's transaction holds the change."""
    run.status = status
    db.add(run)
    db.flush()
    return run


def db_update_run_status(db: Session, run: Run, status: RunStatus) -> Run:
    run.status = status
    db.add(run)
    db.commit()
    db.refresh(run)
    return run
