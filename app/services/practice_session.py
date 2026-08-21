import random
import uuid
from datetime import UTC, datetime

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.database_ops.card import db_read_card, db_read_card_ids_for_deck
from app.database_ops.deck_practice_config import db_read_deck_practice_config
from app.database_ops.practice_card import (
    db_create_practice_card,
    db_read_pending_practice_cards,
    db_read_practice_card,
    db_renumber_pending_practice_cards,
    db_update_practice_card_status,
)
from app.database_ops.practice_deck import (
    db_create_practice_deck,
    db_read_practice_deck_for_deck,
)
from app.database_ops.practice_session import db_create_practice_session
from app.mastery.strategy import MasteryStrategy
from app.mastery.types import ReviewGroup
from app.models.practice_card import PracticeCard, PracticeCardStatus
from app.models.practice_deck import PracticeDeck
from app.models.practice_session import PracticeSession
from app.services.deck_practice_config import validate_deck_practice_config
from app.services.mastery import card_mastery, record_review_group
from app.services.practice_generation import generate_practice_card_fields

_ARRAY_FIELDS = (
    "prompt_field_ids",
    "answer_field_ids",
    "prompt_pool_ids",
    "prompt_pool_counts",
    "answer_pool_ids",
    "answer_pool_counts",
)

_POSITION_GAP = 1000
_POSITION_CONSTRAINT = "uq_practice_card_practice_session_id"


def _config_field_ids(config) -> list[uuid.UUID]:
    return list(
        set(config.prompt_field_ids)
        | set(config.answer_field_ids)
        | set(config.prompt_pool_ids)
        | set(config.answer_pool_ids)
    )


def start_practice_session(
    db: Session,
    strategy: MasteryStrategy,
    user_id: uuid.UUID,
    deck_practice_config_ids: list[uuid.UUID],
    rng: random.Random | None = None,
) -> PracticeSession:
    """One explicit transaction: the session, one practice_deck per config (a
    revalidated, immutable snapshot — invariant 5), and the generated practice_cards,
    ordered unseen-first-then-ascending-mastery per deck with sparse positions
    (ADR-008). Raises LookupError for an unknown config id, ValueError for two configs
    naming the same deck or a config that's gone stale since it was saved."""
    rng = rng or random.Random()

    configs = []
    for config_id in deck_practice_config_ids:
        config = db_read_deck_practice_config(db, config_id, user_id)
        if not config:
            raise LookupError(f"deck_practice_config {config_id} not found")
        configs.append(config)

    deck_ids = [c.deck_id for c in configs]
    if len(set(deck_ids)) != len(deck_ids):
        raise ValueError("cannot start a session with two configs for the same deck")

    session = db_create_practice_session(db, user_id)

    next_position = 0
    for config in configs:
        # Session start is the second of the two call sites that must validate — a
        # config can go stale (a field archived) between template save and now, and
        # the snapshot about to become immutable must be valid at the moment it's cut.
        validate_deck_practice_config(
            db,
            config.deck_id,
            config.prompt_field_ids,
            config.answer_field_ids,
            config.prompt_pool_ids,
            config.prompt_pool_counts,
            config.answer_pool_ids,
            config.answer_pool_counts,
        )

        practice_deck = db_create_practice_deck(
            db,
            {
                "practice_session_id": session.id,
                "deck_id": config.deck_id,
                **{field: getattr(config, field) for field in _ARRAY_FIELDS},
            },
        )

        card_ids = db_read_card_ids_for_deck(db, config.deck_id)
        field_ids = _config_field_ids(config)
        scores = card_mastery(db, strategy, card_ids, field_ids)
        ordered_card_ids = sorted(
            card_ids,
            key=lambda cid: (scores[cid].reviewed_field_count != 0, scores[cid].mastery),
        )

        for card_id in ordered_card_ids:
            resolved = generate_practice_card_fields(
                db,
                strategy,
                card_id,
                practice_deck.prompt_field_ids,
                practice_deck.answer_field_ids,
                practice_deck.prompt_pool_ids,
                practice_deck.prompt_pool_counts,
                practice_deck.answer_pool_ids,
                practice_deck.answer_pool_counts,
                rng,
            )
            if resolved is None:
                continue
            prompts, answers = resolved
            db_create_practice_card(
                db,
                {
                    "practice_session_id": session.id,
                    "card_id": card_id,
                    "position": next_position,
                    "prompts": prompts,
                    "answers": answers,
                },
            )
            next_position += _POSITION_GAP

    db.commit()
    db.refresh(session)
    return session


def _insertion_position(pending: list[tuple[PracticeCard, float]], new_score: float) -> int:
    """pending: a session's pending cards in position order, each paired with its
    current mastery score. Finds the midpoint position (ADR-008) that keeps the
    ascending-mastery invariant this function itself maintains by construction."""
    lower: PracticeCard | None = None
    upper: PracticeCard | None = None
    for card, score in pending:
        if score >= new_score:
            upper = card
            break
        lower = card

    if lower:
        lower_pos = lower.position
    else:
        lower_pos = upper.position - 2 * _POSITION_GAP if upper else -_POSITION_GAP

    if upper:
        upper_pos = upper.position
    else:
        upper_pos = lower.position + _POSITION_GAP if lower else _POSITION_GAP

    return (lower_pos + upper_pos) // 2


def _requeue_failed_card(
    db: Session,
    strategy: MasteryStrategy,
    old_card: PracticeCard,
    practice_deck: PracticeDeck,
    rng: random.Random,
) -> PracticeCard | None:
    """Inserts a fresh practice_card row for the same card_id — never mutates
    old_card, which stays 'failed'. Position reflects the card's mastery *after* this
    submission's blend, so a badly-missed card resurfaces sooner. Returns None if the
    card can no longer be generated at all (e.g. every remaining field archived since
    the snapshot was cut) — nothing to requeue with, same as at session start."""
    resolved = generate_practice_card_fields(
        db,
        strategy,
        old_card.card_id,
        practice_deck.prompt_field_ids,
        practice_deck.answer_field_ids,
        practice_deck.prompt_pool_ids,
        practice_deck.prompt_pool_counts,
        practice_deck.answer_pool_ids,
        practice_deck.answer_pool_counts,
        rng,
    )
    if resolved is None:
        return None
    prompts, answers = resolved
    field_ids = _config_field_ids(practice_deck)

    # One retry: if the computed position collides with an existing row, renumber the
    # session's pending cards to fresh 1000-spaced gaps and recompute. Must not be
    # discovered in production, but is cheap and rare enough that two attempts suffice.
    #
    # The position UNIQUE constraint is DEFERRABLE INITIALLY DEFERRED (bulk renumbering
    # needs to pass through intermediate collisions with not-yet-updated rows) — which
    # means a violation from a single bad insert wouldn't surface until COMMIT, too
    # late to retry without losing the review_log insert and mastery blend already done
    # earlier in this same transaction. SET CONSTRAINTS ... IMMEDIATE forces *this*
    # insert's check back to statement time, inside a savepoint, so a collision is
    # catchable and only the failed insert rolls back.
    for _attempt in range(2):
        pending = db_read_pending_practice_cards(db, old_card.practice_session_id)
        scores = card_mastery(
            db, strategy, [c.card_id for c in pending] + [old_card.card_id], field_ids
        )
        position = _insertion_position(
            [(c, scores[c.card_id].mastery) for c in pending], scores[old_card.card_id].mastery
        )

        try:
            with db.begin_nested():
                db.execute(text(f"SET CONSTRAINTS {_POSITION_CONSTRAINT} IMMEDIATE"))
                new_card = db_create_practice_card(
                    db,
                    {
                        "practice_session_id": old_card.practice_session_id,
                        "card_id": old_card.card_id,
                        "position": position,
                        "prompts": prompts,
                        "answers": answers,
                    },
                )
            return new_card
        except IntegrityError:
            db.execute(text(f"SET CONSTRAINTS {_POSITION_CONSTRAINT} DEFERRED"))
            db_renumber_pending_practice_cards(db, old_card.practice_session_id)

    raise RuntimeError(
        f"could not find a free position for a requeued card in session "
        f"{old_card.practice_session_id} after renumbering"
    )


def submit_rating(
    db: Session,
    strategy: MasteryStrategy,
    user_id: uuid.UUID,
    practice_card_id: uuid.UUID,
    ratings: dict[uuid.UUID, int],
    rng: random.Random | None = None,
) -> tuple[PracticeCard, PracticeCard | None]:
    """One explicit transaction, in the order the plan specifies: record_review_group,
    then update practice_card.status, then — if failed — requeue a new row. Raises
    LookupError if the practice_card doesn't exist (including: exists but belongs to
    another user — a foreign id 404s, it doesn't 403), ValueError if it's already been
    rated or the ratings don't cover exactly its answer fields."""
    rng = rng or random.Random()

    practice_card = db_read_practice_card(db, practice_card_id, user_id)
    if not practice_card:
        raise LookupError(f"practice_card {practice_card_id} not found")
    if practice_card.status != PracticeCardStatus.pending:
        raise ValueError("practice_card has already been rated")
    if set(ratings.keys()) != set(practice_card.answers):
        raise ValueError("ratings must cover exactly this practice_card's answer fields")

    group = ReviewGroup(
        review_group_id=practice_card.id,
        card_id=practice_card.card_id,
        reviewed_at=datetime.now(UTC),
        ratings=tuple(ratings.items()),
        shown_prompt_ids=tuple(practice_card.prompts),
    )
    record_review_group(db, strategy, user_id, group)

    failed = any(rating == 1 for rating in ratings.values())
    new_status = PracticeCardStatus.failed if failed else PracticeCardStatus.passed
    db_update_practice_card_status(db, practice_card, new_status)

    requeued = None
    if failed:
        card = db_read_card(db, practice_card.card_id, user_id)
        assert card is not None, "the practice_card fetch above already confirmed ownership"
        practice_deck = db_read_practice_deck_for_deck(
            db, practice_card.practice_session_id, card.deck_id
        )
        assert practice_deck is not None, "every deck used in a session has a snapshot"
        requeued = _requeue_failed_card(db, strategy, practice_card, practice_deck, rng)

    db.commit()
    db.refresh(practice_card)
    if requeued:
        db.refresh(requeued)
    return practice_card, requeued
