import dataclasses
import uuid
from collections import defaultdict
from datetime import timedelta

from sqlalchemy import text
from sqlmodel import Session, col, select

from app.database_ops.mastery_log import (
    db_append_mastery_log,
    db_clear_mastery,
    db_clear_mastery_for_deck,
    db_fetch_latest_mastery_states,
    db_fetch_mastery_read_rows,
)
from app.database_ops.review_log import (
    ReviewGroupWriteOutcome,
    db_fetch_review_log_for_rebuild,
    db_log_review_group,
    db_read_latest_reviewed_at,
)
from app.mastery.strategy import MasteryStrategy
from app.mastery.types import CardScore, FieldMasteryState, ReviewGroup
from app.models.card import Card
from app.models.practice_card import PracticeCard
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

    Because append-only rows can't serialize a read-modify-append the way the old row
    lock did, this takes a per-card Postgres advisory lock before fetching latest
    states — the same pattern db_log_review_group already uses for review_group_id,
    scoped here to card_id instead. Does not commit — the caller owns the
    transaction."""
    db.execute(
        text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": str(group.card_id)}
    )

    updates = strategy.expand(group)
    affected_field_ids = {field_def_id for _, field_def_id, _ in updates}
    states = dict(db_fetch_latest_mastery_states(db, group.card_id, list(affected_field_ids)))

    # Applied sequentially onto an evolving working state (not a one-pass collapse) so
    # that if an update set ever legitimately touched both sides of the same field
    # within one group, the second apply_review would compound onto the first's result
    # instead of clobbering it.
    for (_, field_def_id, _side), update in updates.items():
        states[field_def_id] = strategy.apply_review(states.get(field_def_id), update)

    db_append_mastery_log(
        db, group.card_id, states, group.reviewed_at, group.review_group_id, practice_run_id
    )


def record_review_group(
    db: Session,
    strategy: MasteryStrategy,
    user_id: uuid.UUID,
    group: ReviewGroup,
    practice_run_id: uuid.UUID | None,
) -> ReviewGroupWriteOutcome:
    """The retry-safe write-path entry point for one appearance — what Phase 4's rating
    endpoint should call, not apply_rating directly. Logs the group, then blends it
    into mastery only when the log didn't already have it:

    - NEW: the group was written for the first time; apply_rating runs.
    - RETRY: review_log already had exactly this group's rated fields on record.
      Mastery is deliberately *not* re-blended, and no ledger row is appended. This
      looks like a bug at a glance — "we skipped the update" — but it's invariant 2
      doing exactly the work it exists for: mastery is a disposable, faithful function
      of the log, so if the log already reflects this appearance, the ledger append
      that happened when it was first logged already reflects it too. Re-appending
      here would move mastery toward the same target a second time for a client-side
      retry that changed nothing. Because record_review_group recomputes a stamp
      before every attempt, a retry recomputes one too — but since nothing is written
      on a RETRY, the persisted stamp from the first attempt is untouched.
    - Raises ReviewGroupInconsistent (propagated from db_log_review_group) if the log
      has a different set of rated fields on record for this review_group_id already.

    Order contract (ADR 050): takes the per-card advisory lock first — before
    db_log_review_group's own review_group_id lock and before apply_rating's — then
    replaces `group.reviewed_at` with the greater of the proposed stamp and the
    card's latest review timestamp plus one microsecond, so the stamp is strictly
    increasing across this card's appearances (a card with no reviews yet keeps the
    proposed stamp). The read and the write happen under one lock and one
    READ COMMITTED transaction, so a second transaction for the same card blocks at
    the lock until this one commits and then sees this stamp. Every transaction takes
    the card lock before any group lock, in this function or in apply_rating's
    re-entry of the same transaction-scoped lock, so this ordering cannot deadlock
    against the old group-then-card order.

    Does not commit — the caller owns the transaction."""
    db.execute(
        text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": str(group.card_id)}
    )
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
    outcome = db_log_review_group(db, group.review_group_id, rows)
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


def card_mastery(
    db: Session,
    strategy: MasteryStrategy,
    card_ids: list[uuid.UUID],
    field_ids: list[uuid.UUID] | None = None,
) -> dict[uuid.UUID, CardScore]:
    """Read path. The fetch drives from field_def (invariant 4); this function only
    folds the already-fetched rows through the strategy — no scoring in SQL."""
    rows = db_fetch_mastery_read_rows(db, card_ids, field_ids)
    scores_by_card: dict[uuid.UUID, list[float | None]] = {cid: [] for cid in card_ids}
    for row in rows:
        scores_by_card[row.card_id].append(strategy.field_score(_row_state(row)))
    return {cid: strategy.card_score(scores) for cid, scores in scores_by_card.items()}


def deck_mastery(
    db: Session, strategy: MasteryStrategy, deck_ids: list[uuid.UUID]
) -> dict[uuid.UUID, CardScore]:
    """Same fetch as card_mastery, grouped by deck in Python. Display-only — never
    stored, never a trigger."""
    if not deck_ids:
        return {}
    card_ids = list(db.exec(select(Card.id).where(col(Card.deck_id).in_(deck_ids))).all())
    rows = db_fetch_mastery_read_rows(db, card_ids)
    scores_by_deck: dict[uuid.UUID, list[float | None]] = {did: [] for did in deck_ids}
    for row in rows:
        scores_by_deck[row.deck_id].append(strategy.field_score(_row_state(row)))
    return {did: strategy.card_score(scores) for did, scores in scores_by_deck.items()}


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
    still-existing practice_card row gives back its practice_run_id; a group whose
    practice_card is gone (its card, or its whole run, was deleted) gets no entry here
    and rebuild_mastery treats that as None — the accepted asymmetry ADR 042 calls
    out: live writes keep attribution when a card is later deleted, a rebuild loses it,
    which no breakdown can show anyway."""
    if not review_group_ids:
        return {}
    return dict(
        db.exec(
            select(PracticeCard.id, PracticeCard.practice_run_id).where(
                col(PracticeCard.id).in_(review_group_ids)
            )
        ).all()
    )


def _replay_review_groups(db: Session, strategy: MasteryStrategy, rows: list[ReviewLog]) -> None:
    """The replay core shared by every rebuild scope (ADR 049): collapses the given
    review_log rows into ReviewGroups (oldest first, `review_group_id` a
    deterministic tiebreak for groups of different pairs sharing a timestamp),
    reconstructs each group's run attribution, and calls apply_rating per group —
    the same write path a live rating goes through. Never re-stamps: apply_rating
    receives each group's already-persisted `reviewed_at` unchanged, so a rebuild of
    any scope reproduces every row's order position (ADR 050). Does not clear
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
    db_clear_mastery(db, user_id)
    rows = db_fetch_review_log_for_rebuild(db, user_id=user_id)
    _replay_review_groups(db, strategy, rows)
    db.commit()


def rebuild_deck_mastery(db: Session, strategy: MasteryStrategy, deck_id: uuid.UUID) -> None:
    """Deck-scoped counterpart to rebuild_mastery (ADR 049): clears and replays only
    this deck's cards' mastery_log rows, reproducing exactly what a user-wide rebuild
    would produce for this deck (ADR 050 makes this safe — the ledger's order is
    `reviewed_at`, not an identity id, so deleting and re-inserting one deck's rows
    cannot disturb any other deck's order). Every other deck's rows, including their
    ids, are untouched. Does not commit — apply_deletion (task 013 T3) calls this
    inside its own transaction."""
    db_clear_mastery_for_deck(db, deck_id)
    rows = db_fetch_review_log_for_rebuild(db, deck_id=deck_id)
    _replay_review_groups(db, strategy, rows)
