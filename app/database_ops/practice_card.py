import uuid
from collections.abc import Collection

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, func, select

from app.models.practice_card import PracticeCard, PracticeCardStatus
from app.models.practice_run import PracticeRun
from app.models.review_log import ReviewLog


# The practice_card position UNIQUE constraint, by its ADR 054 derived name. It is
# DEFERRABLE INITIALLY DEFERRED so a bulk renumber can pass through intermediate
# collisions; db_try_stage_create_practice_card switches it to IMMEDIATE for one insert.
POSITION_CONSTRAINT = "uq_practice_card_practice_run_id"


def db_stage_create_practice_card(db: Session, data: dict) -> PracticeCard:
    """Does not commit — see db_stage_create_practice_run."""
    card = PracticeCard(**data)
    db.add(card)
    db.flush()
    return card


def db_try_stage_create_practice_card(db: Session, data: dict) -> PracticeCard | None:
    """Inserts at `data["position"]`, or reports that the position is taken by returning
    None — the requeue's one operation, owning its savepoint (ADR 055).

    The position constraint is deferred, so a colliding insert would otherwise surface
    only at COMMIT, too late to retry without losing the rating already written earlier
    in the caller's transaction. Switching it to IMMEDIATE inside a savepoint makes the
    collision raise at the flush, where rolling back the savepoint discards only this
    insert. On a collision the constraint is set back to DEFERRED so the caller's
    renumber can pass through intermediate states. On success it is deliberately left
    IMMEDIATE, exactly as the inline code this replaced behaved: ADR 055 records that
    asymmetry rather than changing it."""
    try:
        with db.begin_nested():
            db.execute(text(f"SET CONSTRAINTS {POSITION_CONSTRAINT} IMMEDIATE"))
            return db_stage_create_practice_card(db, data)
    except IntegrityError:
        db.execute(text(f"SET CONSTRAINTS {POSITION_CONSTRAINT} DEFERRED"))
        return None


def db_read_run_ids_for_practice_cards(
    db: Session, practice_card_ids: Collection[uuid.UUID]
) -> dict[uuid.UUID, uuid.UUID | None]:
    """`{practice_card.id: practice_run_id}` for the ids that still exist; a missing id
    simply has no entry."""
    if not practice_card_ids:
        return {}
    return dict(
        db.exec(
            select(PracticeCard.id, PracticeCard.practice_run_id).where(
                col(PracticeCard.id).in_(practice_card_ids)
            )
        ).all()
    )


def db_read_practice_card(
    db: Session, practice_card_id: uuid.UUID, user_id: uuid.UUID
) -> PracticeCard | None:
    return db.exec(
        select(PracticeCard)
        .join(PracticeRun, PracticeRun.id == PracticeCard.practice_run_id)
        .where(PracticeCard.id == practice_card_id, PracticeRun.user_id == user_id)
    ).first()


def db_read_current_practice_card(
    db: Session, practice_run_id: uuid.UUID, user_id: uuid.UUID
) -> PracticeCard | None:
    """The derived current card — invariant: never stored, always this query."""
    return db.exec(
        select(PracticeCard)
        .join(PracticeRun, PracticeRun.id == PracticeCard.practice_run_id)
        .where(
            PracticeCard.practice_run_id == practice_run_id,
            PracticeRun.user_id == user_id,
            PracticeCard.status == PracticeCardStatus.pending,
        )
        .order_by(PracticeCard.position)
        .limit(1)
    ).first()


def db_read_practice_cards_for_run(
    db: Session, practice_run_id: uuid.UUID
) -> list[PracticeCard]:
    """Every row a session has ever produced, in every status, oldest first — the raw
    material for the ADR 028/029 chain fold: grouping consecutive same-card_id rows in
    this order reconstructs each card's chain, and a chain's last item is its current
    bucket. Unscoped by user, like db_read_cards_with_values_for_deck — every call site
    reaches this session through an ownership-checked lookup first."""
    return list(
        db.exec(
            select(PracticeCard)
            .where(PracticeCard.practice_run_id == practice_run_id)
            .order_by(PracticeCard.created_at)
        ).all()
    )


def db_read_pending_practice_cards(
    db: Session, practice_run_id: uuid.UUID
) -> list[PracticeCard]:
    return list(
        db.exec(
            select(PracticeCard)
            .where(
                PracticeCard.practice_run_id == practice_run_id,
                PracticeCard.status == PracticeCardStatus.pending,
            )
            .order_by(PracticeCard.position)
        ).all()
    )


def db_stage_renumber_pending_practice_cards(
    db: Session, practice_run_id: uuid.UUID
) -> list[PracticeCard]:
    """Fresh 1000-spaced positions for a session's pending cards, preserving their
    relative order — the position-collision fallback. Starts strictly above the
    session's current max position (across *every* status, not just pending) rather
    than restarting at 0: passed/failed rows keep their old position forever, so
    renumbering from 0 would routinely collide with one of them."""
    cards = db_read_pending_practice_cards(db, practice_run_id)
    max_position = db.exec(
        select(func.max(PracticeCard.position)).where(
            PracticeCard.practice_run_id == practice_run_id
        )
    ).one()
    base = (max_position or 0) + 1000
    for i, card in enumerate(cards):
        card.position = base + i * 1000
        db.add(card)
    db.flush()
    return cards


def db_read_ratings_by_review_group(
    db: Session, review_group_ids: list[uuid.UUID]
) -> dict[uuid.UUID, dict[uuid.UUID, int]]:
    """Ratings for a batch of practice_cards at once, keyed `review_group_id ->
    {field_def_id: rating}` — a practice_card's id *is* its review_group_id
    (submit_rating), so this is the completion breakdown's per-answer rating join
    (ADR 029/031). A field deleted after the run has no review rows left (they
    cascaded with it, ADR 048), so its id is simply absent from the result; the
    breakdown renders that id as a removed-field placeholder with `rating: None`
    (ADR 052)."""
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


def db_stage_update_practice_card_status(
    db: Session, card: PracticeCard, status: PracticeCardStatus
) -> PracticeCard:
    card.status = status
    db.add(card)
    db.flush()
    return card
