import dataclasses
import uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import timedelta

from sqlmodel import Session

from app.database_ops.mastery_log import (
    db_stage_append_mastery_log,
    db_stage_clear_mastery,
    db_stage_clear_mastery_for_deck,
    db_fetch_deck_mastery_read_rows,
    db_fetch_latest_mastery_states,
    db_fetch_mastery_read_rows,
    db_fetch_subject_mastery_read_rows,
    db_lock_card,
)
from app.database_ops.practice_card import db_read_run_ids_for_practice_cards
from app.database_ops.review_log import (
    ReviewGroupWriteOutcome,
    db_fetch_review_log_for_rebuild,
    db_stage_log_review_group,
    db_read_latest_reviewed_at,
)
from app.mastery.readiness import fold_card_readiness, fold_collection_readiness
from app.mastery.strategy import MasteryStrategy
from app.mastery.types import FieldMasteryState, ReviewGroup
from app.models.review_log import ReviewLog


def apply_rating(
    db: Session,
    strategy: MasteryStrategy,
    group: ReviewGroup,
    practice_run_id: uuid.UUID | None,
) -> None:
    """Unconditionally blends one appearance into mastery — the pure write-path
    primitive. Assumes the caller has already established that this group is new to
    the log (record_review_group does that for the live write path; rebuild_mastery
    doesn't need to, since it only ever replays rows that are already on record). Not
    idempotent on its own: calling it twice for the same group blends toward the same
    target twice and appends twice, which is exactly why record_review_group exists as
    the safe entry point instead of calling this directly from a request handler.

    expand() decides every (card, field, side) update up front — including the prompt
    side's breadth, which needs the whole group, not one row, hence taking a
    ReviewGroup rather than a raw log row. `practice_run_id` attributes the appended
    rows to the run this appearance happened in (None for a rebuild replay that can't
    reconstruct one, e.g. the run itself no longer exists).

    Because append-only rows give a row lock nothing to serialize a read-modify-append
    against, this takes a per-card Postgres advisory lock before fetching latest
    states — the same pattern db_stage_log_review_group uses for review_group_id,
    scoped here to card_id instead. Does not commit — the caller owns the
    transaction."""
    db_lock_card(db, group.card_id)

    updates = strategy.expand(group)
    affected_field_ids = {field_def_id for _, field_def_id, _ in updates}
    states = dict(db_fetch_latest_mastery_states(db, group.card_id, list(affected_field_ids)))

    # Applied sequentially onto an evolving working state (not a one-pass collapse) so
    # that if an update set ever legitimately touched both sides of the same field
    # within one group, the second apply_review would compound onto the first's result
    # instead of clobbering it.
    for (_, field_def_id, _side), update in updates.items():
        states[field_def_id] = strategy.apply_review(states.get(field_def_id), update)

    db_stage_append_mastery_log(
        db, group.card_id, states, group.reviewed_at, group.review_group_id, practice_run_id
    )


def record_review_group(
    db: Session,
    strategy: MasteryStrategy,
    user_id: uuid.UUID,
    group: ReviewGroup,
    practice_run_id: uuid.UUID | None,
) -> ReviewGroupWriteOutcome:
    """The retry-safe write-path entry point for one appearance — what the rating
    endpoint calls, not apply_rating directly. Logs the group, then blends it
    into mastery only when the log didn't already have it:

    - NEW: the group was written for the first time; apply_rating runs.
    - RETRY: review_log already had exactly this group's rated fields on record.
      Mastery is deliberately *not* re-blended, and no ledger row is appended. This
      looks like a bug at a glance — "we skipped the update" — but it is exactly what
      follows from mastery being a disposable, faithful function of the log: if the
      log already reflects this appearance, the ledger append that happened when it
      was first logged already reflects it too. Re-appending
      here would move mastery toward the same target a second time for a client-side
      retry that changed nothing. Because record_review_group recomputes a stamp
      before every attempt, a retry recomputes one too — but since nothing is written
      on a RETRY, the persisted stamp from the first attempt is untouched.
    - Raises ReviewGroupInconsistent (propagated from db_stage_log_review_group) if the log
      has a different set of rated fields on record for this review_group_id already.

    Lock order: takes the per-card advisory lock first — before
    db_stage_log_review_group's own review_group_id lock and before apply_rating's — then
    replaces `group.reviewed_at` with the greater of the proposed stamp and the
    card's latest review timestamp plus one microsecond, so the stamp is strictly
    increasing across this card's appearances (a card with no reviews yet keeps the
    proposed stamp). The read and the write happen under one lock and one
    READ COMMITTED transaction, so a second transaction for the same card blocks at
    the lock until this one commits and then sees this stamp. Every transaction takes
    the card lock before any group lock, in this function or in apply_rating's
    re-entry of the same transaction-scoped lock, so this ordering cannot deadlock.

    Does not commit — the caller owns the transaction."""
    db_lock_card(db, group.card_id)
    latest_reviewed_at = db_read_latest_reviewed_at(db, group.card_id)
    if latest_reviewed_at is not None:
        group = dataclasses.replace(
            group,
            reviewed_at=max(group.reviewed_at, latest_reviewed_at + timedelta(microseconds=1)),
        )

    rows = [
        {
            "user_id": user_id,
            "card_id": group.card_id,
            "field_def_id": field_def_id,
            "review_group_id": group.review_group_id,
            "rating": rating,
            "shown_prompt_ids": list(group.shown_prompt_ids),
            "reviewed_at": group.reviewed_at,
        }
        for field_def_id, rating in group.ratings
    ]
    outcome = db_stage_log_review_group(db, group.review_group_id, rows)
    if outcome is ReviewGroupWriteOutcome.new:
        apply_rating(db, strategy, group, practice_run_id)
    return outcome


def _row_state(row) -> FieldMasteryState | None:
    if row.prompt_mastery is None:
        return None
    return FieldMasteryState(
        prompt_mastery=row.prompt_mastery,
        answer_mastery=row.answer_mastery,
        prompt_review_count=row.prompt_review_count,
        answer_review_count=row.answer_review_count,
    )


@dataclass(frozen=True)
class CardReadiness:
    readiness: float
    reviewed: bool  # some field of the card has a mastery_log row


def card_readiness(
    db: Session,
    strategy: MasteryStrategy,
    card_ids: list[uuid.UUID],
    field_ids: list[uuid.UUID] | None = None,
) -> dict[uuid.UUID, CardReadiness]:
    """Each asked-for card's readiness and whether it has been reviewed, over every field
    of its deck or, given `field_ids`, over those alone. Every id in `card_ids` has an
    entry; a card with no field among them reads 0, not reviewed."""
    rows = db_fetch_mastery_read_rows(db, card_ids, field_ids)
    field_readiness_by_card: dict[uuid.UUID, list[float]] = {cid: [] for cid in card_ids}
    reviewed_cards: set[uuid.UUID] = set()
    for row in rows:
        state = _row_state(row)
        field_readiness_by_card[row.card_id].append(strategy.readiness(state))
        if state is not None:
            reviewed_cards.add(row.card_id)
    return {
        cid: CardReadiness(readiness=fold_card_readiness(values), reviewed=cid in reviewed_cards)
        for cid, values in field_readiness_by_card.items()
    }


def _fold_collections(
    strategy: MasteryStrategy, rows: list, owner_ids: list[uuid.UUID]
) -> dict[uuid.UUID, float | None]:
    field_readiness: dict[uuid.UUID, dict[uuid.UUID, list[float]]] = defaultdict(
        lambda: defaultdict(list)
    )
    for row in rows:
        field_readiness[row.owner_id][row.card_id].append(strategy.readiness(_row_state(row)))
    return {
        owner_id: fold_collection_readiness(
            [fold_card_readiness(values) for values in field_readiness[owner_id].values()]
        )
        for owner_id in owner_ids
    }


def deck_readiness(
    db: Session, strategy: MasteryStrategy, deck_ids: list[uuid.UUID]
) -> dict[uuid.UUID, float | None]:
    """Each deck's readiness: every card's fold over every field of the deck, then the
    deck's fold over its cards; None for a deck with no card."""
    return _fold_collections(strategy, db_fetch_deck_mastery_read_rows(db, deck_ids), deck_ids)


def subject_readiness(
    db: Session, strategy: MasteryStrategy, subject_ids: list[uuid.UUID]
) -> dict[uuid.UUID, float | None]:
    """Each subject's readiness: the fold over every card of its decks, each card once;
    None for a subject whose decks hold no card."""
    return _fold_collections(
        strategy, db_fetch_subject_mastery_read_rows(db, subject_ids), subject_ids
    )


def _group_review_log_rows(rows: list[ReviewLog]) -> list[ReviewGroup]:
    """Collapses flat review_log rows into ReviewGroups, one per review_group_id,
    ordered by (reviewed_at, review_group_id) for a deterministic replay order — the
    id tiebreak matters when two appearances share a timestamp. Relies on the
    atomicity invariant: every row for a given review_group_id must already be
    present, never a partial subset."""
    by_group: dict[uuid.UUID, list[ReviewLog]] = defaultdict(list)
    for row in rows:
        by_group[row.review_group_id].append(row)

    groups = [
        ReviewGroup(
            review_group_id=review_group_id,
            card_id=group_rows[0].card_id,
            reviewed_at=min(r.reviewed_at for r in group_rows),
            ratings=tuple((r.field_def_id, r.rating) for r in group_rows),
            shown_prompt_ids=tuple(group_rows[0].shown_prompt_ids),
        )
        for review_group_id, group_rows in by_group.items()
    ]
    groups.sort(key=lambda g: (g.reviewed_at, g.review_group_id))
    return groups


def _fetch_run_attribution(
    db: Session, review_group_ids: list[uuid.UUID]
) -> dict[uuid.UUID, uuid.UUID | None]:
    """Reconstructs run attribution for a rebuild replay: a group's review_group_id is
    the practice_card.id it was submitted against (submit_rating's construction), so a
    still-existing practice_card row gives back its practice_run_id; a group whose run
    was deleted gets no entry here and rebuild_mastery treats that as None — an
    accepted asymmetry, which no breakdown can show anyway. (A deleted card's review
    rows cascade with it, so they never reach a replay.)"""
    return db_read_run_ids_for_practice_cards(db, review_group_ids)


def _replay_review_groups(db: Session, strategy: MasteryStrategy, rows: list[ReviewLog]) -> None:
    """The replay core shared by every rebuild scope: collapses the given
    review_log rows into ReviewGroups (oldest first, `review_group_id` a
    deterministic tiebreak for groups of different pairs sharing a timestamp),
    reconstructs each group's run attribution, and calls apply_rating per group —
    the same write path a live rating goes through. Never re-stamps: apply_rating
    receives each group's already-persisted `reviewed_at` unchanged, so a rebuild of
    any scope reproduces every row's order position. Does not clear
    mastery_log and does not commit — the caller owns both, since a full rebuild's
    clear scope (every row, or one user's) and a deck-scoped rebuild's (one deck's
    cards) are different calls to different database_ops functions."""
    groups = _group_review_log_rows(rows)
    run_ids_by_review_group = _fetch_run_attribution(
        db, [group.review_group_id for group in groups]
    )
    for group in groups:
        practice_run_id = run_ids_by_review_group.get(group.review_group_id)
        apply_rating(db, strategy, group, practice_run_id)


def rebuild_mastery(
    db: Session, strategy: MasteryStrategy, user_id: uuid.UUID | None = None
) -> None:
    """Truncates (or delete-scopes) mastery_log and replays review_log through the same
    write path apply_rating uses, one appearance at a time, oldest first, reconstructing
    each group's run attribution along the way. Because the strategy is a parameter,
    changing strategies is not a migration — it's a rebuild. Slow is fine."""
    db_stage_clear_mastery(db, user_id)
    rows = db_fetch_review_log_for_rebuild(db, user_id=user_id)
    _replay_review_groups(db, strategy, rows)
    db.commit()


def rebuild_deck_mastery(db: Session, strategy: MasteryStrategy, deck_id: uuid.UUID) -> None:
    """Deck-scoped counterpart to rebuild_mastery: clears and replays only this deck's
    cards' mastery_log rows, reproducing exactly what a user-wide rebuild would produce
    for this deck (safe because the ledger's order is `reviewed_at`, not an identity
    id, so deleting and re-inserting one deck's rows cannot disturb any other deck's
    order). Every other deck's rows, including their ids, are untouched. Does not
    commit — apply_deletion calls this inside its own transaction."""
    db_stage_clear_mastery_for_deck(db, deck_id)
    rows = db_fetch_review_log_for_rebuild(db, deck_id=deck_id)
    _replay_review_groups(db, strategy, rows)
