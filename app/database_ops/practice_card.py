import uuid

from sqlmodel import Session, col, func, select

from app.models.practice_card import PracticeCard, PracticeCardStatus
from app.models.practice_session import PracticeSession
from app.models.review_log import ReviewLog


def db_create_practice_card(db: Session, data: dict) -> PracticeCard:
    """Does not commit — see db_create_practice_session."""
    card = PracticeCard(**data)
    db.add(card)
    db.flush()
    return card


def db_read_practice_card(
    db: Session, practice_card_id: uuid.UUID, user_id: uuid.UUID
) -> PracticeCard | None:
    return db.exec(
        select(PracticeCard)
        .join(PracticeSession, PracticeSession.id == PracticeCard.practice_session_id)
        .where(PracticeCard.id == practice_card_id, PracticeSession.user_id == user_id)
    ).first()


def db_read_current_practice_card(
    db: Session, practice_session_id: uuid.UUID, user_id: uuid.UUID
) -> PracticeCard | None:
    """The derived current card — invariant: never stored, always this query."""
    return db.exec(
        select(PracticeCard)
        .join(PracticeSession, PracticeSession.id == PracticeCard.practice_session_id)
        .where(
            PracticeCard.practice_session_id == practice_session_id,
            PracticeSession.user_id == user_id,
            PracticeCard.status == PracticeCardStatus.pending,
        )
        .order_by(PracticeCard.position)
        .limit(1)
    ).first()


def db_read_practice_cards_for_session(
    db: Session, practice_session_id: uuid.UUID
) -> list[PracticeCard]:
    """Every row a session has ever produced, in every status, oldest first — the raw
    material for the ADR 028/029 chain fold: grouping consecutive same-card_id rows in
    this order reconstructs each card's chain, and a chain's last item is its current
    bucket. Unscoped by user, like db_read_cards_with_values_for_deck — every call site
    reaches this session through an ownership-checked lookup first."""
    return list(
        db.exec(
            select(PracticeCard)
            .where(PracticeCard.practice_session_id == practice_session_id)
            .order_by(PracticeCard.created_at)
        ).all()
    )


def db_read_pending_practice_cards(
    db: Session, practice_session_id: uuid.UUID
) -> list[PracticeCard]:
    return list(
        db.exec(
            select(PracticeCard)
            .where(
                PracticeCard.practice_session_id == practice_session_id,
                PracticeCard.status == PracticeCardStatus.pending,
            )
            .order_by(PracticeCard.position)
        ).all()
    )


def db_renumber_pending_practice_cards(
    db: Session, practice_session_id: uuid.UUID
) -> list[PracticeCard]:
    """Fresh 1000-spaced positions for a session's pending cards, preserving their
    relative order — the position-collision fallback. Starts strictly above the
    session's current max position (across *every* status, not just pending) rather
    than restarting at 0: passed/failed rows keep their old position forever, so
    renumbering from 0 would routinely collide with one of them."""
    cards = db_read_pending_practice_cards(db, practice_session_id)
    max_position = db.exec(
        select(func.max(PracticeCard.position)).where(
            PracticeCard.practice_session_id == practice_session_id
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
    (ADR 029/031). A `review_log` row whose `field_def_id` went `SET NULL` (the field
    was hard-deleted) can't be matched back to a specific field and is simply absent
    from the result — the caller reads a missing entry as an orphaned rating (contract:
    `rating: None`)."""
    if not review_group_ids:
        return {}
    rows = db.exec(
        select(ReviewLog.review_group_id, ReviewLog.field_def_id, ReviewLog.rating).where(
            col(ReviewLog.review_group_id).in_(review_group_ids)
        )
    ).all()
    ratings: dict[uuid.UUID, dict[uuid.UUID, int]] = {}
    for review_group_id, field_def_id, rating in rows:
        if field_def_id is None:
            continue
        ratings.setdefault(review_group_id, {})[field_def_id] = rating
    return ratings


def db_update_practice_card_status(
    db: Session, card: PracticeCard, status: PracticeCardStatus
) -> PracticeCard:
    card.status = status
    db.add(card)
    db.flush()
    return card
