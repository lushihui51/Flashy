import uuid
from collections import defaultdict

from sqlmodel import Session, col, func, select

from app.models.card import Card
from app.models.deck import Deck, DeckSummary
from app.models.field_def import FieldDef
from app.models.subject import Subject
from app.services.activity import touch


def db_read_deck(db: Session, deck_id: uuid.UUID, user_id: uuid.UUID) -> Deck | None:
    return db.exec(
        select(Deck)
        .join(Subject, Subject.id == Deck.subject_id)
        .where(Deck.id == deck_id, Subject.user_id == user_id)
    ).first()


def db_read_deck_for_copy(db: Session, deck_id: uuid.UUID) -> Deck | None:
    """Deliberately unscoped — Phase 6's copy_deck reads the source deck as raw copy
    material, not as the caller's own data (invariant 7 protects the latter). Whether
    the caller may copy from this particular source is a question for whatever
    authorizes the call (a future share-link check), not this fetch."""
    return db.get(Deck, deck_id)


def db_read_decks(
    db: Session, user_id: uuid.UUID, subject_id: uuid.UUID | None = None
) -> list[Deck]:
    # D13: recency order, server-side — the frontend never sorts this list.
    query = (
        select(Deck)
        .join(Subject, Subject.id == Deck.subject_id)
        .where(Subject.user_id == user_id)
    )
    if subject_id is not None:
        query = query.where(Deck.subject_id == subject_id)
    query = query.order_by(col(Deck.last_activity_at).desc(), col(Deck.id))
    return list(db.exec(query).all())


def db_read_decks_with_summary(
    db: Session, user_id: uuid.UUID, subject_id: uuid.UUID | None = None
) -> list[DeckSummary]:
    """Same decks as db_read_decks, plus each one's card_count and field_names
    (position order, active fields only) — via two grouped queries regardless of how
    many decks there are, never one query per deck (Phase 2.6)."""
    decks = db_read_decks(db, user_id, subject_id)
    if not decks:
        return []
    deck_ids = [deck.id for deck in decks]

    card_counts = dict(
        db.exec(
            select(Card.deck_id, func.count())
            .where(col(Card.deck_id).in_(deck_ids))
            .group_by(col(Card.deck_id))
        ).all()
    )

    field_names_by_deck: dict[uuid.UUID, list[str]] = defaultdict(list)
    field_rows = db.exec(
        select(FieldDef.deck_id, FieldDef.name)
        .where(col(FieldDef.deck_id).in_(deck_ids), col(FieldDef.archived_at).is_(None))
        .order_by(col(FieldDef.deck_id), col(FieldDef.position))
    ).all()
    for deck_id, name in field_rows:
        field_names_by_deck[deck_id].append(name)

    return [
        DeckSummary(
            **deck.model_dump(),
            card_count=card_counts.get(deck.id, 0),
            field_names=field_names_by_deck.get(deck.id, []),
        )
        for deck in decks
    ]


def db_delete_deck(db: Session, deck: Deck) -> None:
    # D13: the deck itself is gone, but its subject's activity still bubbles.
    subject = db.get(Subject, deck.subject_id)
    if subject:
        touch(db, subject)
    db.delete(deck)
    db.commit()
