import uuid
from collections import defaultdict
from collections.abc import Collection

from sqlalchemy import delete
from sqlmodel import Session, col, func, select

from app.models.card import Card
from app.models.deck import Deck, DeckListing
from app.models.field_def import FieldDef


def db_stage_create_deck(db: Session, user_id: uuid.UUID, name: str) -> Deck:
    """Adds and flushes a deck of user_id inside the caller's transaction, so its id is
    available for the fields and cards that follow. An `IntegrityError` on the per-user
    name constraint propagates: each caller turns it into its own message."""
    deck = Deck(user_id=user_id, name=name)
    db.add(deck)
    db.flush()
    return deck


def db_read_deck(db: Session, deck_id: uuid.UUID, user_id: uuid.UUID) -> Deck | None:
    return db.exec(select(Deck).where(Deck.id == deck_id, Deck.user_id == user_id)).first()


def db_read_deck_for_copy(db: Session, deck_id: uuid.UUID) -> Deck | None:
    """Deliberately unscoped — copy_deck reads the source deck as raw copy material,
    not as the caller's own data, which every other read scopes by ownership. Whether
    the caller may copy from this particular source is a question for whatever
    authorizes the call (a future share-link check), not this fetch."""
    return db.get(Deck, deck_id)


def db_read_deck_listings(
    db: Session,
    user_id: uuid.UUID,
    deck_ids: Collection[uuid.UUID] | None = None,
) -> list[DeckListing]:
    """The user's decks, among deck_ids when those are given, most recently active
    first, each with its card_count and field_names (position order, active fields
    only) — via two grouped queries regardless of how many decks there are, never one
    query per deck."""
    # Recency order, server-side — the frontend never sorts this list.
    query = select(Deck).where(Deck.user_id == user_id)
    if deck_ids is not None:
        query = query.where(col(Deck.id).in_(deck_ids))
    query = query.order_by(col(Deck.last_activity_at).desc(), col(Deck.id))
    decks = db.exec(query).all()
    if not decks:
        return []
    listed_ids = [deck.id for deck in decks]

    card_counts = dict(
        db.exec(
            select(Card.deck_id, func.count())
            .where(col(Card.deck_id).in_(listed_ids))
            .group_by(col(Card.deck_id))
        ).all()
    )

    field_names_by_deck: dict[uuid.UUID, list[str]] = defaultdict(list)
    field_rows = db.exec(
        select(FieldDef.deck_id, FieldDef.name)
        .where(col(FieldDef.deck_id).in_(listed_ids))
        .order_by(col(FieldDef.deck_id), col(FieldDef.position))
    ).all()
    for deck_id, name in field_rows:
        field_names_by_deck[deck_id].append(name)

    return [
        DeckListing(
            **deck.model_dump(),
            card_count=card_counts.get(deck.id, 0),
            field_names=field_names_by_deck.get(deck.id, []),
        )
        for deck in decks
    ]


def db_read_owned_deck_ids(
    db: Session, user_id: uuid.UUID, ids: Collection[uuid.UUID]
) -> set[uuid.UUID]:
    """The subset of `ids` that exist and belong to user_id —
    compute_deletion_impact's ownership check."""
    if not ids:
        return set()
    return set(
        db.exec(select(Deck.id).where(col(Deck.id).in_(ids), Deck.user_id == user_id)).all()
    )


def db_stage_delete_decks(db: Session, ids: Collection[uuid.UUID]) -> None:
    """Bulk delete by id, no commit — apply_deletion owns the transaction."""
    if not ids:
        return
    db.execute(delete(Deck).where(col(Deck.id).in_(ids)))
