import uuid
from collections.abc import Collection

from sqlalchemy import delete, or_, text, update
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, func, select

from app.models.card import Card
from app.models.practice import Practice
from app.models.run import Run
from app.models.run_card import RunCard, RunCardStatus
from app.models.review_log import ReviewLog


# The run_card position UNIQUE constraint, by the name app/database.py's naming
# convention derives for it. It is DEFERRABLE INITIALLY DEFERRED so a bulk renumber
# can pass through intermediate collisions; db_try_stage_create_run_card switches
# it to IMMEDIATE for one insert.
POSITION_CONSTRAINT = "uq_run_card_run_id"


def db_stage_create_run_card(db: Session, data: dict) -> RunCard:
    """Does not commit — the caller owns the transaction."""
    card = RunCard(**data)
    db.add(card)
    db.flush()
    return card


def db_try_stage_create_run_card(db: Session, data: dict) -> RunCard | None:
    """Inserts at `data["position"]`, or reports that the position is taken by returning
    None — the requeue's one operation, owning its savepoint.

    The position constraint is deferred, so a colliding insert would otherwise surface
    only at COMMIT, too late to retry without losing the rating already written earlier
    in the caller's transaction. Switching it to IMMEDIATE inside a savepoint makes the
    collision raise at the flush, where rolling back the savepoint discards only this
    insert. On a collision the constraint is set back to DEFERRED so the caller's
    renumber can pass through intermediate states. On success it is deliberately left
    IMMEDIATE."""
    try:
        with db.begin_nested():
            db.execute(text(f"SET CONSTRAINTS {POSITION_CONSTRAINT} IMMEDIATE"))
            return db_stage_create_run_card(db, data)
    except IntegrityError:
        db.execute(text(f"SET CONSTRAINTS {POSITION_CONSTRAINT} DEFERRED"))
        return None


def db_read_run_ids_for_run_cards(
    db: Session, run_card_ids: Collection[uuid.UUID]
) -> dict[uuid.UUID, uuid.UUID | None]:
    """`{run_card.id: run_id}` for the ids that still exist; a missing id simply has no
    entry."""
    if not run_card_ids:
        return {}
    return dict(
        db.exec(
            select(RunCard.id, RunCard.run_id).where(
                col(RunCard.id).in_(run_card_ids)
            )
        ).all()
    )


def db_read_run_card(
    db: Session, run_card_id: uuid.UUID, user_id: uuid.UUID
) -> RunCard | None:
    return db.exec(
        select(RunCard)
        .join(Run, Run.id == RunCard.run_id)
        .join(Practice, Practice.id == Run.practice_id)
        .where(RunCard.id == run_card_id, Practice.user_id == user_id)
    ).first()


def db_read_current_run_card(
    db: Session, run_id: uuid.UUID, user_id: uuid.UUID
) -> RunCard | None:
    """The derived current card — invariant: never stored, always this query."""
    return db.exec(
        select(RunCard)
        .join(Run, Run.id == RunCard.run_id)
        .join(Practice, Practice.id == Run.practice_id)
        .where(
            RunCard.run_id == run_id,
            Practice.user_id == user_id,
            RunCard.status == RunCardStatus.pending,
        )
        .order_by(RunCard.position)
        .limit(1)
    ).first()


def db_read_run_cards_for_run(
    db: Session, run_id: uuid.UUID
) -> list[RunCard]:
    """Every row a run has ever produced, in every status, oldest first — the raw
    material for the chain fold (run_progress): grouping consecutive same-card_id rows
    in this order reconstructs each card's chain, and a chain's last item is its current
    bucket. Unscoped by user — every call site reaches this run through an
    ownership-checked lookup first."""
    return list(
        db.exec(
            select(RunCard)
            .where(RunCard.run_id == run_id)
            .order_by(RunCard.created_at)
        ).all()
    )


def db_read_run_cards_for_runs(
    db: Session, run_ids: Collection[uuid.UUID]
) -> dict[uuid.UUID, list[RunCard]]:
    """db_read_run_cards_for_run over several runs in one statement, keyed by run; a
    run with no row has no entry. Unscoped by user likewise."""
    if not run_ids:
        return {}
    cards_by_run: dict[uuid.UUID, list[RunCard]] = {}
    for card in db.exec(
        select(RunCard)
        .where(col(RunCard.run_id).in_(run_ids))
        .order_by(RunCard.created_at)
    ).all():
        cards_by_run.setdefault(card.run_id, []).append(card)
    return cards_by_run


def db_read_pending_run_cards(
    db: Session, run_id: uuid.UUID
) -> list[RunCard]:
    return list(
        db.exec(
            select(RunCard)
            .where(
                RunCard.run_id == run_id,
                RunCard.status == RunCardStatus.pending,
            )
            .order_by(RunCard.position)
        ).all()
    )


def db_stage_delete_pending_run_cards(db: Session, run_id: uuid.UUID) -> None:
    """Deletes every pending row of the run, leaving every rated one. No commit."""
    db.execute(
        delete(RunCard).where(
            RunCard.run_id == run_id, RunCard.status == RunCardStatus.pending
        )
    )


def db_read_max_run_card_position(db: Session, run_id: uuid.UUID) -> int | None:
    """Highest position among every row of the run, in every status, or None for a run
    with no rows. The end of the queue for a retry and the base of a renumber
    both start above it."""
    return db.exec(
        select(func.max(RunCard.position)).where(
            RunCard.run_id == run_id
        )
    ).one()


def db_stage_renumber_pending_run_cards(
    db: Session, run_id: uuid.UUID
) -> list[RunCard]:
    """Fresh 1000-spaced positions for a run's pending cards, preserving their
    relative order — the position-collision fallback. Starts strictly above the
    run's current max position (across *every* status, not just pending) rather
    than restarting at 0: passed/failed rows keep their old position forever, so
    renumbering from 0 would routinely collide with one of them."""
    cards = db_read_pending_run_cards(db, run_id)
    max_position = db_read_max_run_card_position(db, run_id)
    base = (max_position or 0) + 1000
    for i, card in enumerate(cards):
        card.position = base + i * 1000
        db.add(card)
    db.flush()
    return cards


def db_read_ratings_by_review_group(
    db: Session, review_group_ids: list[uuid.UUID]
) -> dict[uuid.UUID, dict[uuid.UUID, int]]:
    """Ratings for a batch of run_cards at once, keyed `review_group_id ->
    {field_def_id: rating}` — a run_card's id *is* its review_group_id (submit_rating),
    so this is the completion breakdown's per-answer rating join."""
    if not review_group_ids:
        return {}
    rows = db.exec(
        select(ReviewLog.review_group_id, ReviewLog.field_def_id, ReviewLog.rating).where(
            col(ReviewLog.review_group_id).in_(review_group_ids)
        )
    ).all()
    ratings: dict[uuid.UUID, dict[uuid.UUID, int]] = {}
    for review_group_id, field_def_id, rating in rows:
        ratings.setdefault(review_group_id, {})[field_def_id] = rating
    return ratings


def db_stage_scrub_run_card_field_ids(
    db: Session, deck_id: uuid.UUID, field_ids: Collection[uuid.UUID]
) -> None:
    """Removes each of field_ids from `prompts` and from `answers` on every run card
    of this deck's cards, one UPDATE per id narrowed to the rows that name it in
    either array, so an id no run card holds touches nothing. No commit —
    apply_deletion owns the transaction."""
    if not field_ids:
        return
    deck_card_ids = select(Card.id).where(Card.deck_id == deck_id)
    for field_id in field_ids:
        db.execute(
            update(RunCard)
            .where(
                col(RunCard.card_id).in_(deck_card_ids),
                or_(RunCard.prompts.any(field_id), RunCard.answers.any(field_id)),
            )
            .values(
                prompts=func.array_remove(RunCard.prompts, field_id),
                answers=func.array_remove(RunCard.answers, field_id),
            )
        )


def db_stage_update_run_card_status(
    db: Session, card: RunCard, status: RunCardStatus
) -> RunCard:
    card.status = status
    db.add(card)
    db.flush()
    return card
