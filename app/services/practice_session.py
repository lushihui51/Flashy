import random
import uuid
from datetime import UTC, datetime

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.database_ops.card import db_read_card, db_read_card_ids_for_deck
from app.database_ops.deck_practice_config import db_read_deck_practice_config
from app.database_ops.field_def import db_read_field_defs
from app.database_ops.practice_card import (
    db_create_practice_card,
    db_read_current_practice_card,
    db_read_pending_practice_cards,
    db_read_practice_card,
    db_read_practice_cards_for_session,
    db_read_ratings_by_review_group,
    db_renumber_pending_practice_cards,
    db_update_practice_card_status,
)
from app.database_ops.practice_deck import (
    db_create_practice_deck,
    db_read_practice_deck_for_deck,
    db_read_practice_decks_for_session,
)
from app.database_ops.practice_session import (
    db_create_practice_session,
    db_delete_practice_session,
    db_read_practice_session,
    db_update_practice_session_status,
)
from app.mastery.strategy import MasteryStrategy
from app.mastery.types import ReviewGroup
from app.models.field_def import FieldDef
from app.models.practice_card import (
    BreakdownAttempt,
    BreakdownBucket,
    BreakdownCard,
    CurrentRunCard,
    PracticeCard,
    PracticeCardStatus,
    PracticeRunState,
    PracticeSessionBreakdown,
    RatedFieldValue,
    ResolvedFieldValue,
    SessionProgress,
)
from app.models.practice_deck import PracticeDeck
from app.models.practice_session import PracticeSession, SessionStatus
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


class SessionStartError(Exception):
    """A session-start failure that names the config responsible.

    The creation page lists several configs at once and must render a failure against
    the offending row rather than as a bare toast — a stale config (a field archived
    since it was saved) is fixable, but only if the user is told *which* one to fix. A
    plain message string can't carry that, so the id travels on the exception and is
    serialized into the error body by the router."""

    def __init__(self, code: str, message: str, config_id: uuid.UUID | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.config_id = config_id

    @property
    def detail(self) -> dict:
        return {
            "code": self.code,
            "message": self.message,
            "config_id": str(self.config_id) if self.config_id else None,
        }


class SessionActiveError(Exception):
    """Raised by get_practice_session_breakdown for a session that hasn't completed
    yet (ADR 029/031's 409 `session_active`): the breakdown's bucket refinement and
    terminal-only attempts only make sense once nothing is pending — mid-run, there is
    no in-app history view at all (ADR 029)."""

    code = "session_active"

    def __init__(self, practice_session_id: uuid.UUID):
        message = f"practice_session {practice_session_id} is still active"
        super().__init__(message)
        self.message = message

    @property
    def detail(self) -> dict:
        return {"code": self.code, "message": self.message}


class RerunError(Exception):
    """A re-run failure (ADR 030), detail = `{code, message}`: `session_active` when
    the session hasn't completed yet; `nothing_to_rerun` when every one of its
    practice_deck snapshots was dropped (a deleted deck, or field ids no longer live)
    and nothing survived to rebuild a session from."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message

    @property
    def detail(self) -> dict:
        return {"code": self.code, "message": self.message}


def _config_field_ids(config) -> list[uuid.UUID]:
    return list(
        set(config.prompt_field_ids)
        | set(config.answer_field_ids)
        | set(config.prompt_pool_ids)
        | set(config.answer_pool_ids)
    )


def _snapshot_and_generate_deck(
    db: Session,
    strategy: MasteryStrategy,
    session_id: uuid.UUID,
    deck_id: uuid.UUID,
    array_values: dict[str, list],
    rng: random.Random,
    next_position: int,
) -> int:
    """One deck's worth of session-start work: cut an immutable practice_deck snapshot
    from `array_values` (already validated by the caller), then generate its
    practice_cards ordered unseen-first-then-ascending-mastery with sparse positions
    starting at `next_position` (ADR-008). Returns the position to continue from for
    the next deck. Shared by start_practice_session (fed from a live
    deck_practice_config) and the re-run path (ADR 030, fed from a completed session's
    own frozen practice_deck arrays) — both need exactly this step, just from different
    sources."""
    practice_deck = db_create_practice_deck(
        db, {"practice_session_id": session_id, "deck_id": deck_id, **array_values}
    )

    card_ids = db_read_card_ids_for_deck(db, deck_id)
    field_ids = _config_field_ids(practice_deck)
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
                "practice_session_id": session_id,
                "card_id": card_id,
                "position": next_position,
                "prompts": prompts,
                "answers": answers,
            },
        )
        next_position += _POSITION_GAP

    return next_position


def start_practice_session(
    db: Session,
    strategy: MasteryStrategy,
    user_id: uuid.UUID,
    name: str,
    deck_practice_config_ids: list[uuid.UUID],
    rng: random.Random | None = None,
) -> PracticeSession:
    """One explicit transaction: the session, one practice_deck per config (a
    revalidated, immutable snapshot — invariant 5), and the generated practice_cards,
    ordered unseen-first-then-ascending-mastery per deck with sparse positions
    (ADR-008). `name` is stored verbatim; the client formats it. Raises
    SessionStartError — `config_not_found` for an unknown config id, `duplicate_deck`
    for two configs naming the same deck, `stale_config` for a config that no longer
    validates against its deck's live fields."""
    rng = rng or random.Random()

    configs = []
    for config_id in deck_practice_config_ids:
        config = db_read_deck_practice_config(db, config_id, user_id)
        if not config:
            raise SessionStartError(
                "config_not_found",
                f"deck_practice_config {config_id} not found",
                config_id,
            )
        configs.append(config)

    seen_deck_ids: set[uuid.UUID] = set()
    for config in configs:
        if config.deck_id in seen_deck_ids:
            raise SessionStartError(
                "duplicate_deck",
                "cannot start a session with two configs for the same deck",
                config.id,
            )
        seen_deck_ids.add(config.deck_id)

    session = db_create_practice_session(db, user_id, name)

    next_position = 0
    for config in configs:
        # Session start is the second of the two call sites that must validate — a
        # config can go stale (a field archived) between template save and now, and
        # the snapshot about to become immutable must be valid at the moment it's cut.
        try:
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
        except ValueError as e:
            raise SessionStartError("stale_config", str(e), config.id) from e

        array_values = {field: getattr(config, field) for field in _ARRAY_FIELDS}
        next_position = _snapshot_and_generate_deck(
            db, strategy, session.id, config.deck_id, array_values, rng, next_position
        )

    db.commit()
    db.refresh(session)
    return session


def rerun_practice_session(
    db: Session,
    strategy: MasteryStrategy,
    user_id: uuid.UUID,
    practice_session_id: uuid.UUID,
    rng: random.Random | None = None,
) -> PracticeSession:
    """ADR 030: recreates a completed session from its own frozen practice_deck
    snapshots — never a deck_practice_config lookup (practice_deck has no
    source_config_id by design, ADR 013). Per snapshot: dropped if its deck was
    deleted (deck_id null) or its field ids no longer validate against the deck's live
    fields; the rest are re-snapshotted and regenerated exactly like session start,
    via the same _snapshot_and_generate_deck helper. Raises LookupError for an
    unknown/foreign session (the router 404s); RerunError('session_active') if the
    session hasn't completed; RerunError('nothing_to_rerun') if every snapshot was
    dropped. One transaction: the new session is created and populated first, and the
    old one is deleted only once that has fully succeeded — db_delete_practice_session's
    own commit is the single commit for both halves, so a failure partway through
    leaves the original session untouched rather than deleting it first and risking
    ending up with neither (ADR 030)."""
    rng = rng or random.Random()

    session = db_read_practice_session(db, practice_session_id, user_id)
    if session is None:
        raise LookupError(f"practice_session {practice_session_id} not found")
    if session.status != SessionStatus.completed:
        raise RerunError("session_active", "practice session is still active")

    surviving_decks: list[tuple[uuid.UUID, dict[str, list]]] = []
    for practice_deck in db_read_practice_decks_for_session(db, practice_session_id):
        if practice_deck.deck_id is None:
            continue
        array_values = {field: getattr(practice_deck, field) for field in _ARRAY_FIELDS}
        try:
            validate_deck_practice_config(db, practice_deck.deck_id, **array_values)
        except ValueError:
            continue
        surviving_decks.append((practice_deck.deck_id, array_values))

    if not surviving_decks:
        raise RerunError(
            "nothing_to_rerun",
            "no deck from this session still has a live, valid snapshot to rerun",
        )

    new_session = db_create_practice_session(db, user_id, session.name)

    next_position = 0
    for deck_id, array_values in surviving_decks:
        next_position = _snapshot_and_generate_deck(
            db, strategy, new_session.id, deck_id, array_values, rng, next_position
        )

    db_delete_practice_session(db, session)
    db.refresh(new_session)
    return new_session


def get_current_practice_card(
    db: Session, practice_session_id: uuid.UUID, user_id: uuid.UUID
) -> PracticeCard | None:
    """The derived current card — never stored, always this query (invariant, see
    PracticeSession's docstring). If none remain for a still-active session, it
    transitions to completed rather than leaving the caller to 404 against it forever.
    This doesn't distinguish *why* nothing remains — genuine completion and
    practice_card rows cascade-deleted out from under the session by a card deletion
    look the same here. ADR 015 as amended accepts that blur rather than tracking a third status
    nothing could set reliably; the client tells the second case apart by the session's
    "deleted deck" chips."""
    card = db_read_current_practice_card(db, practice_session_id, user_id)
    if card is None:
        session = db_read_practice_session(db, practice_session_id, user_id)
        if session is not None and session.status == SessionStatus.active:
            db_update_practice_session_status(db, session, SessionStatus.completed)
    return card


def _chains_by_card_id(cards: list[PracticeCard]) -> dict[uuid.UUID, list[PracticeCard]]:
    """Groups a session's rows by card_id, preserving `cards`' own order within each
    group. Callers (session_progress, the run-state attempt count, and eventually the
    breakdown) all require `cards` to already be created_at-ascending — the ordering
    db_read_practice_cards_for_session returns — so a chain's last item is always its
    last-written row and its index is a 1-based attempt count."""
    chains: dict[uuid.UUID, list[PracticeCard]] = {}
    for card in cards:
        chains.setdefault(card.card_id, []).append(card)
    return chains


def session_progress(cards: list[PracticeCard]) -> SessionProgress:
    """The ADR 028 chain-bucket fold, pure and shared by the run state and the
    breakdown's counts: `cards` — every practice_card row a session has produced,
    created_at ascending (db_read_practice_cards_for_session) — is grouped into chains
    by card_id, and each chain's *last* row decides its bucket (docs/tasks/006-
    practice-run.md's Contracts). `total_cards` is the chain count, fixed for the
    session's lifetime by construction: it can only equal however many distinct
    card_ids ever got a row, which is set once at session start and never grows."""
    counts = {"unseen": 0, "retry_pending": 0, "passed": 0, "still_failed": 0}
    chains = _chains_by_card_id(cards)
    for chain in chains.values():
        last = chain[-1]
        if last.status == PracticeCardStatus.pending:
            counts["unseen" if len(chain) == 1 else "retry_pending"] += 1
        elif last.status == PracticeCardStatus.passed:
            counts["passed"] += 1
        else:
            counts["still_failed"] += 1
    return SessionProgress(total_cards=len(chains), **counts)


def _resolve_field_values(
    field_defs_by_id: dict[uuid.UUID, FieldDef],
    values_by_field: dict[uuid.UUID, str],
    field_ids: list[uuid.UUID],
) -> list[ResolvedFieldValue]:
    """One side (prompts or answers) of a practice_card's stored id array, resolved
    against this deck's field_defs (archived included — a field only drops out here if
    its row no longer exists at all) and this card's current values, then reordered to
    field_def.position ascending regardless of what order the ids were stored in."""
    live = (fd for fid in field_ids if (fd := field_defs_by_id.get(fid)) is not None)
    return [
        ResolvedFieldValue(
            field_def_id=fd.id, name=fd.name, type=fd.type, value=values_by_field.get(fd.id, "")
        )
        for fd in sorted(live, key=lambda fd: fd.position)
    ]


def _resolve_current_run_card(
    db: Session, user_id: uuid.UUID, current: PracticeCard, cards: list[PracticeCard]
) -> CurrentRunCard:
    """Builds the run payload's one live card: attempt is read off the chain fold
    (session_progress's same grouping) rather than stored anywhere, and field
    resolution goes through the card's own deck so archived prompt/answer fields still
    resolve (ADR 031's resolution rule)."""
    chain = _chains_by_card_id(cards)[current.card_id]
    attempt = chain.index(current) + 1

    card = db_read_card(db, current.card_id, user_id)
    assert card is not None, "a practice_card's card_id cascades on card delete"
    values_by_field = {v.field_def_id: v.value for v in card.values}
    field_defs_by_id = {
        fd.id: fd for fd in db_read_field_defs(db, card.deck_id, user_id, include_archived=True)
    }

    return CurrentRunCard(
        practice_card_id=current.id,
        card_id=current.card_id,
        attempt=attempt,
        prompts=_resolve_field_values(field_defs_by_id, values_by_field, current.prompts),
        answers=_resolve_field_values(field_defs_by_id, values_by_field, current.answers),
    )


def get_practice_run_state(
    db: Session, practice_session_id: uuid.UUID, user_id: uuid.UUID
) -> PracticeRunState | None:
    """The whole `GET .../run` payload (ADR 031): session name/status, the ADR 028
    progress fold, and the resolved current card, if any. None for an unknown or
    foreign session (the router 404s). Delegates to get_current_practice_card for the
    active->completed transition and reads `session.status` only afterward, so a
    session that just ran out of pending cards reports "completed" in this same
    response rather than a stale "active"."""
    session = db_read_practice_session(db, practice_session_id, user_id)
    if session is None:
        return None

    current = get_current_practice_card(db, practice_session_id, user_id)
    cards = db_read_practice_cards_for_session(db, practice_session_id)
    progress = session_progress(cards)
    current_run_card = (
        _resolve_current_run_card(db, user_id, current, cards) if current is not None else None
    )

    return PracticeRunState(
        session_name=session.name,
        session_status=session.status,
        progress=progress,
        current_card=current_run_card,
    )


def _breakdown_bucket(chain: list[PracticeCard]) -> BreakdownBucket:
    """The ADR 029 completion-time refinement of the chain fold — only ever applied to
    a completed session's chains, where the last row is always `passed` or `failed`
    (never `pending`: a session can't be completed while anything is still queued, per
    get_current_practice_card's transition)."""
    last = chain[-1]
    if last.status == PracticeCardStatus.failed:
        return BreakdownBucket.still_failed
    if len(chain) == 1:
        return BreakdownBucket.passed_first_try
    if len(chain) == 2:
        return BreakdownBucket.passed_after_one_fail
    return BreakdownBucket.passed_after_many_fails


def _resolve_rated_field_values(
    field_defs_by_id: dict[uuid.UUID, FieldDef],
    values_by_field: dict[uuid.UUID, str],
    ratings_by_field: dict[uuid.UUID, int],
    field_ids: list[uuid.UUID],
) -> list[RatedFieldValue]:
    """The breakdown's answer-side resolution: the same id->field_def->value join as
    _resolve_field_values, with each entry's rating attached from the review_log join
    (db_read_ratings_by_review_group). A field_def_id absent from ratings_by_field means
    that review_log row was orphaned (contract: `rating: None`) — never that it wasn't
    rated, since a passed/failed practice_card was rated on every answer field by
    construction (submit_rating)."""
    resolved = _resolve_field_values(field_defs_by_id, values_by_field, field_ids)
    return [
        RatedFieldValue(**value.model_dump(), rating=ratings_by_field.get(value.field_def_id))
        for value in resolved
    ]


def get_practice_session_breakdown(
    db: Session, practice_session_id: uuid.UUID, user_id: uuid.UUID
) -> PracticeSessionBreakdown | None:
    """The whole `GET .../breakdown` payload (ADR 029, ADR 031): every card's full
    resolved, rated attempt history, grouped into the completion-time buckets. None for
    an unknown or foreign session (the router 404s). Raises SessionActiveError if the
    session hasn't completed yet (the router 409s) — the bucket refinement and
    terminal-only attempts below only make sense once nothing is pending."""
    session = db_read_practice_session(db, practice_session_id, user_id)
    if session is None:
        return None
    if session.status == SessionStatus.active:
        raise SessionActiveError(practice_session_id)

    cards = db_read_practice_cards_for_session(db, practice_session_id)
    chains = _chains_by_card_id(cards)
    ratings_by_group = db_read_ratings_by_review_group(db, [c.id for c in cards])

    # Per-deck caches: a session's cards cluster onto however many decks it snapshotted
    # (practice_deck), not one per card, so this keeps field resolution to one pair of
    # queries per deck rather than per card.
    field_defs_by_deck: dict[uuid.UUID, dict[uuid.UUID, FieldDef]] = {}
    primary_field_by_deck: dict[uuid.UUID, FieldDef] = {}

    counts = dict.fromkeys(BreakdownBucket, 0)
    breakdown_cards = []
    for card_id, chain in chains.items():
        bucket = _breakdown_bucket(chain)
        counts[bucket] += 1

        card = db_read_card(db, card_id, user_id)
        assert card is not None, "a practice_card's card_id cascades on card delete"
        deck_id = card.deck_id
        if deck_id not in field_defs_by_deck:
            field_defs_by_deck[deck_id] = {
                fd.id: fd
                for fd in db_read_field_defs(db, deck_id, user_id, include_archived=True)
            }
            # ADR 032: the deck's primary field is its active field_def at position 0 —
            # db_read_field_defs is already active-only and position-sorted.
            primary_field_by_deck[deck_id] = db_read_field_defs(db, deck_id, user_id)[0]
        field_defs_by_id = field_defs_by_deck[deck_id]
        primary = primary_field_by_deck[deck_id]
        values_by_field = {v.field_def_id: v.value for v in card.values}

        attempts = [
            BreakdownAttempt(
                practice_card_id=pc.id,
                status=pc.status,
                created_at=pc.created_at,
                prompts=_resolve_field_values(field_defs_by_id, values_by_field, pc.prompts),
                answers=_resolve_rated_field_values(
                    field_defs_by_id, values_by_field, ratings_by_group.get(pc.id, {}), pc.answers
                ),
            )
            for pc in chain
        ]

        breakdown_cards.append(
            BreakdownCard(
                card_id=card_id,
                bucket=bucket,
                attempt_count=len(chain),
                primary_field=ResolvedFieldValue(
                    field_def_id=primary.id,
                    name=primary.name,
                    type=primary.type,
                    value=values_by_field.get(primary.id, ""),
                ),
                attempts=attempts,
            )
        )

    # First attempt's position ascending — a chain's first row's position never moves
    # once written (only pending rows are ever renumbered, db_renumber_pending_practice_cards).
    breakdown_cards.sort(key=lambda bc: chains[bc.card_id][0].position)

    return PracticeSessionBreakdown(
        total_cards=len(chains),
        passed_first_try=counts[BreakdownBucket.passed_first_try],
        passed_after_one_fail=counts[BreakdownBucket.passed_after_one_fail],
        passed_after_many_fails=counts[BreakdownBucket.passed_after_many_fails],
        still_failed=counts[BreakdownBucket.still_failed],
        cards=breakdown_cards,
    )


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
