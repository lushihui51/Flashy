import random
import uuid
from collections import defaultdict
from collections.abc import Sequence
from datetime import UTC, datetime

from sqlmodel import Session

from app.database_ops.card import (
    db_read_card,
    db_read_card_ids_for_deck,
    db_read_cards_with_values,
    db_read_deck_id_by_card,
)
from app.database_ops.deck_practice_config import db_read_deck_practice_config
from app.database_ops.field_def import db_read_field_defs, db_read_field_defs_for_decks
from app.database_ops.mastery_log import (
    db_fetch_mastery_before_bound,
    db_fetch_mastery_read_rows,
    db_fetch_run_mastery_log_rows,
)
from app.database_ops.practice_card import (
    db_stage_create_practice_card,
    db_read_current_practice_card,
    db_read_max_practice_card_position,
    db_read_pending_practice_cards,
    db_read_practice_card,
    db_read_practice_cards_for_run,
    db_read_ratings_by_review_group,
    db_stage_renumber_pending_practice_cards,
    db_stage_update_practice_card_status,
    db_try_stage_create_practice_card,
)
from app.database_ops.practice_deck import (
    db_stage_create_practice_deck,
    db_read_practice_deck_for_deck,
    db_read_practice_decks_for_run,
)
from app.database_ops.practice_run import (
    db_stage_create_practice_run,
    db_read_practice_run,
    db_update_practice_run_status,
)
from app.mastery.readiness import classify_change, fold_card_readiness
from app.mastery.strategy import MasteryStrategy
from app.mastery.types import FieldMasteryState, ReviewGroup
from app.models.field_def import FieldDef
from app.models.practice_card import PracticeCard, PracticeCardStatus
from app.models.practice_deck import PracticeDeck
from app.models.practice_run import PracticeRun, RunStatus
from app.models.practice_run_payloads import (
    BreakdownAttempt,
    BreakdownCard,
    CurrentRunCard,
    FieldReadinessDelta,
    FieldSide,
    PracticeRunState,
    PracticeRunBreakdown,
    RatedFieldValue,
    ResolvedFieldValue,
    RunProgress,
)
from app.refusals import Refusal
from app.services.deck_practice_config import validate_deck_practice_config
from app.services.mastery import card_readiness, record_review_group
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
# A retry may not surface until this many other pending cards have had their turn,
# clamping the readiness-ordered insertion point rather than replacing it — a card whose
# readiness already puts it deeper than the floor stays at its deeper slot (ADR 037).
# Must stay >= 1: _insertion_position always reads a predecessor.
RETRY_SPACING_FLOOR = 3


class RunStartError(Exception):
    """A session-start failure that names the config responsible.

    The creation page lists several configs at once and must render a failure against
    the offending row rather than as a bare toast — a stale config (a field deleted
    since it was saved) is fixable, but only if the user is told *which* one to fix. A
    plain message string can't carry that, so the id travels on the exception and is
    serialized into the error body by the router. Codes: `config_not_found`,
    `duplicate_deck`, `stale_config`, and `no_cards` when generation wrote no practice
    card across every selected deck — that one names no config, since
    emptiness is a property of the whole practice."""

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


class RunActiveError(Exception):
    """Raised by get_practice_run_breakdown for a session that hasn't completed
    yet (the router answers 409 `run_active`): the summary's terminal-only attempts only
    make sense once nothing is pending — mid-run, there is no in-app history view at all."""

    code = "run_active"

    def __init__(self, practice_run_id: uuid.UUID):
        message = f"practice_run {practice_run_id} is still active"
        super().__init__(message)
        self.message = message

    @property
    def detail(self) -> dict:
        return {"code": self.code, "message": self.message}


class RerunError(Exception):
    """A re-run failure, detail = `{code, message}`: `run_active` when
    the session hasn't completed yet; `nothing_to_rerun` when every one of its
    practice_deck snapshots has field ids that no longer validate against its deck's
    live fields, and nothing survived to rebuild a session from. A snapshot naming a
    deleted deck never reaches this check at all — its row cascaded away with the
    deck, and a run left owning no snapshot is deleted alongside its last one, so
    there is no rerun call left to make against it. `no_cards` when
    the surviving snapshots generated no practice card at all — a completed
    practice whose cards were deleted since would otherwise rerun into an empty one."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message

    @property
    def detail(self) -> dict:
        return {"code": self.code, "message": self.message}


class ChosenCardsError(Exception):
    """A failure to start a practice of chosen cards, detail `{code, message}`:
    `run_active` while the practice has not completed; `nothing_to_practice` when no
    snapshot holding a chosen card still validates against its deck's live fields;
    `no_cards` when the surviving snapshots generated no practice card."""

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
    source_config_id: uuid.UUID | None,
    source_config_name: str | None,
    card_ids: list[uuid.UUID] | None,
    rng: random.Random,
    next_position: int,
) -> int:
    """One deck's worth of session-start work: cut an immutable practice_deck snapshot
    from `array_values` (already validated by the caller), then generate its
    practice_cards ordered unseen-first-then-ascending-readiness with sparse positions
    starting at `next_position`. Returns the position to continue from for
    the next deck. Shared by start_practice_run (fed from a live
    deck_practice_config), the re-run path and a practice of chosen cards (both fed from
    a completed session's own frozen practice_deck arrays) — all need exactly this step,
    just from different sources. `source_config_id` rides along into the snapshot purely
    for attribution — start_practice_run passes the live config's id, the other two
    the original snapshot's value verbatim — and is never read back by anything below this
    function. `source_config_name` rides into the snapshot next to it, the
    same way, and is likewise read by nothing below. `card_ids` is written onto the
    snapshot and selects the cards generated: null is every card of the deck, a list is
    those of the deck's cards it names, and an id naming no card of the deck selects
    nothing."""
    practice_deck = db_stage_create_practice_deck(
        db,
        {
            "practice_run_id": session_id,
            "deck_id": deck_id,
            "source_config_id": source_config_id,
            "source_config_name": source_config_name,
            "card_ids": card_ids,
            **array_values,
        },
    )

    selected_card_ids = db_read_card_ids_for_deck(db, deck_id)
    if card_ids is not None:
        chosen = set(card_ids)
        selected_card_ids = [cid for cid in selected_card_ids if cid in chosen]
    field_ids = _config_field_ids(practice_deck)
    readiness = card_readiness(db, strategy, selected_card_ids, field_ids)
    ordered_card_ids = sorted(
        selected_card_ids,
        key=lambda cid: (readiness[cid].reviewed, readiness[cid].readiness),
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
        db_stage_create_practice_card(
            db,
            {
                "practice_run_id": session_id,
                "card_id": card_id,
                "position": next_position,
                "prompts": prompts,
                "answers": answers,
            },
        )
        next_position += _POSITION_GAP

    return next_position


def start_practice_run(
    db: Session,
    strategy: MasteryStrategy,
    user_id: uuid.UUID,
    name: str,
    deck_practice_config_ids: list[uuid.UUID],
    rng: random.Random | None = None,
) -> PracticeRun:
    """One explicit transaction: the session, one practice_deck per config (a
    revalidated, immutable snapshot), and the generated practice_cards, ordered
    unseen-first-then-ascending-readiness per deck with sparse positions. `name` is
    stored verbatim; the client formats it. Raises
    RunStartError — `config_not_found` for an unknown config id, `duplicate_deck`
    for two configs naming the same deck, `stale_config` for a config that no longer
    validates against its deck's live fields, `no_cards` when generation produced
    nothing across all of them."""
    rng = rng or random.Random()

    configs = []
    for config_id in deck_practice_config_ids:
        config = db_read_deck_practice_config(db, config_id, user_id)
        if not config:
            raise RunStartError(
                "config_not_found",
                f"deck_practice_config {config_id} not found",
                config_id,
            )
        configs.append(config)

    seen_deck_ids: set[uuid.UUID] = set()
    for config in configs:
        if config.deck_id in seen_deck_ids:
            raise RunStartError(
                "duplicate_deck",
                "cannot start a session with two configs for the same deck",
                config.id,
            )
        seen_deck_ids.add(config.deck_id)

    session = db_stage_create_practice_run(db, user_id, name)

    next_position = 0
    for config in configs:
        # Session start is the second of the two call sites that must validate — a
        # config can go stale (a field deleted) between template save and now, and
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
            raise RunStartError("stale_config", str(e), config.id) from e

        array_values = {field: getattr(config, field) for field in _ARRAY_FIELDS}
        next_position = _snapshot_and_generate_deck(
            db,
            strategy,
            session.id,
            config.deck_id,
            array_values,
            config.id,
            config.name,
            None,
            rng,
            next_position,
        )

    # Emptiness is a property of the whole practice, not of one deck, and it is only
    # knowable once generation has run — a card can be legal yet blank in every field
    # one side shows. Raised before the commit, so the refused run and its snapshots
    # are discarded with the session, exactly as `stale_config` above.
    if next_position == 0:
        raise RunStartError(
            "no_cards", "generation produced no practice cards across the selected decks"
        )

    db.commit()
    db.refresh(session)
    return session


def rerun_practice_run(
    db: Session,
    strategy: MasteryStrategy,
    user_id: uuid.UUID,
    practice_run_id: uuid.UUID,
    name: str,
    rng: random.Random | None = None,
) -> PracticeRun:
    """Creates a new run from the completed run's own frozen practice_deck
    snapshots — never a deck_practice_config lookup (practice_deck has no behavioral
    coupling to its source config). Per snapshot: dropped if its field ids no
    longer validate against the deck's live fields; the rest are re-snapshotted and
    regenerated exactly like session start, via the same _snapshot_and_generate_deck
    helper, each carrying its old snapshot's `source_config_id` forward verbatim
    (attribution only, possibly already null; never looked up fresh), and its
    `source_config_name` and `card_ids` likewise. `name` is stored verbatim on the new run —
    the client formats it, same as start_practice_run. Raises LookupError for an
    unknown/foreign session (the router 404s); RerunError('run_active') if the session
    hasn't completed; RerunError('nothing_to_rerun') if every snapshot was dropped;
    RerunError('no_cards') if the survivors generated nothing. A plain
    create: the original run is never touched, so there is nothing to order against a
    delete — one explicit commit at the end, same shape as start_practice_run."""
    rng = rng or random.Random()

    session = db_read_practice_run(db, practice_run_id, user_id)
    if session is None:
        raise LookupError(f"practice_run {practice_run_id} not found")
    if session.status != RunStatus.completed:
        raise RerunError("run_active", "practice is still active")

    surviving_decks: list[
        tuple[uuid.UUID, dict[str, list], uuid.UUID | None, str | None, list[uuid.UUID] | None]
    ] = []
    for practice_deck in db_read_practice_decks_for_run(db, practice_run_id):
        array_values = {field: getattr(practice_deck, field) for field in _ARRAY_FIELDS}
        try:
            validate_deck_practice_config(db, practice_deck.deck_id, **array_values)
        except ValueError:
            continue
        surviving_decks.append(
            (
                practice_deck.deck_id,
                array_values,
                practice_deck.source_config_id,
                practice_deck.source_config_name,
                practice_deck.card_ids,
            )
        )

    if not surviving_decks:
        raise RerunError(
            "nothing_to_rerun",
            "no deck from this session still has a live, valid snapshot to rerun",
        )

    new_session = db_stage_create_practice_run(db, user_id, name)

    next_position = 0
    for deck_id, array_values, source_config_id, source_config_name, card_ids in surviving_decks:
        next_position = _snapshot_and_generate_deck(
            db,
            strategy,
            new_session.id,
            deck_id,
            array_values,
            source_config_id,
            source_config_name,
            card_ids,
            rng,
            next_position,
        )

    # Same check as start: a snapshot can survive validation and still have nothing
    # left to generate from, once its deck's cards are gone.
    if next_position == 0:
        raise RerunError(
            "no_cards", "generation produced no practice cards across the surviving decks"
        )

    db.commit()
    db.refresh(new_session)
    return new_session


def start_chosen_cards_run(
    db: Session,
    strategy: MasteryStrategy,
    user_id: uuid.UUID,
    practice_run_id: uuid.UUID,
    name: str,
    card_ids: list[uuid.UUID],
    rng: random.Random | None = None,
) -> PracticeRun:
    """A new practice of exactly `card_ids`, each asked through the snapshot its deck had in
    the completed practice `practice_run_id`. Raises LookupError for an unknown or foreign
    practice, ValueError when `card_ids` is empty or names a card the practice did not
    hold, and ChosenCardsError for the three coded refusals."""
    rng = rng or random.Random()

    session = db_read_practice_run(db, practice_run_id, user_id)
    if session is None:
        raise LookupError(f"practice_run {practice_run_id} not found")
    if session.status != RunStatus.completed:
        raise ChosenCardsError("run_active", "practice is still active")

    if not card_ids:
        raise ValueError("no cards chosen")
    held_card_ids = {card.card_id for card in db_read_practice_cards_for_run(db, practice_run_id)}
    if not held_card_ids.issuperset(card_ids):
        raise ValueError("a chosen card is not a card of this practice")

    chosen_by_deck: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)
    deck_id_by_card = db_read_deck_id_by_card(db, card_ids)
    for card_id in dict.fromkeys(card_ids):
        chosen_by_deck[deck_id_by_card[card_id]].append(card_id)

    surviving_decks: list[PracticeDeck] = []
    for practice_deck in db_read_practice_decks_for_run(db, practice_run_id):
        if practice_deck.deck_id not in chosen_by_deck:
            continue
        array_values = {field: getattr(practice_deck, field) for field in _ARRAY_FIELDS}
        try:
            validate_deck_practice_config(db, practice_deck.deck_id, **array_values)
        except ValueError:
            continue
        surviving_decks.append(practice_deck)

    if not surviving_decks:
        raise ChosenCardsError(
            "nothing_to_practice",
            "no deck holding a chosen card still has a live, valid snapshot",
        )

    new_session = db_stage_create_practice_run(db, user_id, name)

    next_position = 0
    for practice_deck in surviving_decks:
        next_position = _snapshot_and_generate_deck(
            db,
            strategy,
            new_session.id,
            practice_deck.deck_id,
            {field: getattr(practice_deck, field) for field in _ARRAY_FIELDS},
            practice_deck.source_config_id,
            practice_deck.source_config_name,
            chosen_by_deck[practice_deck.deck_id],
            rng,
            next_position,
        )

    # Same check as start: every chosen card can be blank on one side of its snapshot, and
    # only generation knows. Raised before the commit, so nothing of the run persists.
    if next_position == 0:
        raise ChosenCardsError(
            "no_cards", "generation produced no practice cards from the chosen cards"
        )

    db.commit()
    db.refresh(new_session)
    return new_session


def get_current_practice_card(
    db: Session, practice_run_id: uuid.UUID, user_id: uuid.UUID
) -> PracticeCard | None:
    """The derived current card — never stored, always this query (invariant, see
    PracticeRun's docstring). If none remain for a still-active session, it
    transitions to completed rather than leaving the caller to 404 against it forever.
    This doesn't distinguish *why* nothing remains: a run rated to genuine completion
    looks the same here as one stranded because its cards were deleted, or because one
    deck of a multi-deck run was deleted and took that deck's cards' practice_card rows
    with it. The blur is accepted rather than tracking a third status nothing could
    set reliably."""
    card = db_read_current_practice_card(db, practice_run_id, user_id)
    if card is None:
        session = db_read_practice_run(db, practice_run_id, user_id)
        if session is not None and session.status == RunStatus.active:
            db_update_practice_run_status(db, session, RunStatus.completed)
    return card


def _chains_by_card_id(cards: list[PracticeCard]) -> dict[uuid.UUID, list[PracticeCard]]:
    """Groups a session's rows by card_id, preserving `cards`' own order within each
    group. Callers (run_progress, the run-state attempt count, and the breakdown) all
    require `cards` to already be created_at-ascending — the ordering
    db_read_practice_cards_for_run returns — so a chain's last item is always its
    last-written row and its index is a 1-based attempt count."""
    chains: dict[uuid.UUID, list[PracticeCard]] = {}
    for card in cards:
        chains.setdefault(card.card_id, []).append(card)
    return chains


def run_progress(cards: list[PracticeCard]) -> RunProgress:
    """The chain-bucket fold, pure, behind the run state's progress: `cards` — every practice_card row a session has produced, created_at
    ascending (db_read_practice_cards_for_run) — is grouped into chains by card_id,
    and each chain's *last* row decides its bucket: pending with one row is unseen,
    pending with more is a retry, passed is passed, failed is failed. `total_cards` is
    the chain count, fixed for the
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
    return RunProgress(total_cards=len(chains), **counts)


def _resolve_field_values(
    field_defs_by_id: dict[uuid.UUID, FieldDef],
    values_by_field: dict[uuid.UUID, str],
    field_ids: list[uuid.UUID],
) -> list[ResolvedFieldValue]:
    """One side (prompts or answers) of a practice_card's stored id array, resolved
    against this deck's field_defs and this card's current values, then reordered to
    field_def.position ascending regardless of what order the ids were stored in. An id
    with no field_def row is dropped."""
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
    (run_progress's same grouping) rather than stored anywhere, and field
    resolution goes through the card's own deck."""
    chain = _chains_by_card_id(cards)[current.card_id]
    attempt = chain.index(current) + 1

    card = db_read_card(db, current.card_id, user_id)
    assert card is not None, "a practice_card's card_id cascades on card delete"
    values_by_field = {v.field_def_id: v.value for v in card.values}
    field_defs_by_id = {
        fd.id: fd for fd in db_read_field_defs(db, card.deck_id, user_id)
    }

    return CurrentRunCard(
        practice_card_id=current.id,
        card_id=current.card_id,
        attempt=attempt,
        prompts=_resolve_field_values(field_defs_by_id, values_by_field, current.prompts),
        answers=_resolve_field_values(field_defs_by_id, values_by_field, current.answers),
    )


def get_practice_run_state(
    db: Session, practice_run_id: uuid.UUID, user_id: uuid.UUID
) -> PracticeRunState | None:
    """The whole `GET .../state` payload: session name/status, the progress fold, and
    the resolved current card, if any. None for an unknown or
    foreign session (the router 404s). Delegates to get_current_practice_card for the
    active->completed transition and reads `session.status` only afterward, so a
    session that just ran out of pending cards reports "completed" in this same
    response rather than a stale "active"."""
    session = db_read_practice_run(db, practice_run_id, user_id)
    if session is None:
        return None

    current = get_current_practice_card(db, practice_run_id, user_id)
    cards = db_read_practice_cards_for_run(db, practice_run_id)
    progress = run_progress(cards)
    current_run_card = (
        _resolve_current_run_card(db, user_id, current, cards) if current is not None else None
    )

    return PracticeRunState(
        session_name=session.name,
        session_status=session.status,
        progress=progress,
        current_card=current_run_card,
    )


def _resolve_rated_field_values(
    field_defs_by_id: dict[uuid.UUID, FieldDef],
    values_by_field: dict[uuid.UUID, str],
    ratings_by_field: dict[uuid.UUID, int],
    field_ids: list[uuid.UUID],
) -> list[RatedFieldValue]:
    """The breakdown's answer-side resolution: the same id->field_def->value join as
    _resolve_field_values, with each entry's rating attached from the review_log join
    (db_read_ratings_by_review_group). Every answer field a completed practice card
    holds was rated, so a missing rating raises KeyError rather than resolving."""
    resolved = _resolve_field_values(field_defs_by_id, values_by_field, field_ids)
    return [
        RatedFieldValue(**value.model_dump(), rating=ratings_by_field[value.field_def_id])
        for value in resolved
    ]


def _row_to_field_state(row) -> FieldMasteryState | None:
    """Row -> FieldMasteryState, for the raw material db_fetch_mastery_read_rows
    hands back (prompt_mastery NULL means never reviewed). A private mirror of
    app.services.mastery._row_state — small enough, and mastery-log-specific enough
    to this module's own delta computation, not to import across module boundaries."""
    if row.prompt_mastery is None:
        return None
    return FieldMasteryState(
        prompt_mastery=row.prompt_mastery,
        answer_mastery=row.answer_mastery,
        prompt_review_count=row.prompt_review_count,
        answer_review_count=row.answer_review_count,
    )


def _compute_field_readiness_deltas(
    db: Session,
    strategy: MasteryStrategy,
    practice_run_id: uuid.UUID,
    domain: list[tuple[uuid.UUID, uuid.UUID]],
) -> dict[tuple[uuid.UUID, uuid.UUID], tuple[float, float, float]]:
    """{(card_id, field_def_id): (before, after, delta)} of readiness for every pair in
    `domain`, under the breakdown's delta semantics for a run R:

    - The domain is every card in R's breakdown × every active field of that card's
      deck, whether or not R touched the pair.
    - attributed(c, f) is R's own mastery_log rows for the pair; first(R) is the
      earliest reviewed_at over all of R's rows.
    - bound(c, f) is the earliest reviewed_at of attributed(c, f) when it is
      non-empty, else first(R).
    - before(c, f) is the pair's latest row with reviewed_at < bound(c, f); absent
      means never reviewed, readiness 0.
    - after(c, f) is the latest row of attributed(c, f) when it is non-empty, else
      before(c, f).
    - before and after are each `strategy.readiness` of the state selected, and delta
      is after − before. Exact floats, never rounded here.
    - If R has no rows at all, before = after = the pair's overall latest row and
      every delta is 0.

    The caller's card-level readiness and delta are `fold_card_readiness` over the
    domain's befores and afters respectively. Reads only R's own rows plus one bounded
    before-lookup covering every pair at once — never a history replay — so the
    statement count against mastery_log is fixed at 2 regardless of len(domain)."""
    run_rows = db_fetch_run_mastery_log_rows(db, practice_run_id)

    if not run_rows:
        # The degenerate case: this run's own attribution is empty (only reachable via
        # an all-retry submission history — every rating a client resubmit of an
        # already-logged group). before = after = the overall latest row per pair;
        # every delta is 0.
        card_ids = list({card_id for card_id, _ in domain})
        read_rows = db_fetch_mastery_read_rows(db, card_ids)
        readiness_by_pair = {
            (row.card_id, row.field_def_id): strategy.readiness(_row_to_field_state(row))
            for row in read_rows
        }
        return {pair: (readiness_by_pair[pair], readiness_by_pair[pair], 0.0) for pair in domain}

    attributed_by_pair: dict[tuple[uuid.UUID, uuid.UUID], list] = defaultdict(list)
    for row in run_rows:
        attributed_by_pair[(row.card_id, row.field_def_id)].append(row)
    first_reviewed_at = min(row.reviewed_at for row in run_rows)

    bounds: list[tuple[uuid.UUID, uuid.UUID, datetime]] = []
    after_state_by_pair: dict[tuple[uuid.UUID, uuid.UUID], FieldMasteryState] = {}
    for pair in domain:
        rows_for_pair = attributed_by_pair.get(pair)
        if rows_for_pair:
            bound = min(r.reviewed_at for r in rows_for_pair)
            after_row = max(rows_for_pair, key=lambda r: r.reviewed_at)
            after_state_by_pair[pair] = FieldMasteryState(
                prompt_mastery=after_row.prompt_mastery,
                answer_mastery=after_row.answer_mastery,
                prompt_review_count=after_row.prompt_review_count,
                answer_review_count=after_row.answer_review_count,
            )
        else:
            bound = first_reviewed_at
        bounds.append((pair[0], pair[1], bound))

    before_state_by_pair = db_fetch_mastery_before_bound(db, bounds)

    result: dict[tuple[uuid.UUID, uuid.UUID], tuple[float, float, float]] = {}
    for pair in domain:
        before_state = before_state_by_pair.get(pair)
        # Untouched by this run: after == before by construction, not a fallback —
        # this run contributed no movement to this pair, so its "after" is whatever
        # the field already was.
        after_state = after_state_by_pair.get(pair, before_state)
        before = strategy.readiness(before_state)
        after = strategy.readiness(after_state)
        result[pair] = (before, after, after - before)
    return result


def get_practice_run_breakdown(
    db: Session, strategy: MasteryStrategy, practice_run_id: uuid.UUID, user_id: uuid.UUID
) -> PracticeRunBreakdown | None:
    """The whole `GET .../breakdown` payload: every card's resolved, rated attempts, and the
    readiness, delta and kind of change of the card and of each field its attempts showed or
    asked. None for an unknown or foreign session (the router 404s). Raises RunActiveError if
    the session hasn't completed yet (the router 409s): terminal-only attempts only make
    sense once nothing is pending."""
    session = db_read_practice_run(db, practice_run_id, user_id)
    if session is None:
        return None
    if session.status == RunStatus.active:
        raise RunActiveError(practice_run_id)

    cards = db_read_practice_cards_for_run(db, practice_run_id)
    chains = _chains_by_card_id(cards)
    ratings_by_group = db_read_ratings_by_review_group(db, [c.id for c in cards])

    card_rows = db_read_cards_with_values(db, chains.keys())
    card_row_by_id = {card.id: card for card in card_rows}
    active_field_defs_by_deck: dict[uuid.UUID, list[FieldDef]] = defaultdict(list)
    for fd in db_read_field_defs_for_decks(db, {card.deck_id for card in card_rows}):
        active_field_defs_by_deck[fd.deck_id].append(fd)

    # Built in two passes: this one resolves everything but the readiness figures, which need
    # every card's active-field domain gathered first, so the delta computation below can
    # read mastery_log in one fixed-size batch instead of once per card.
    raw_cards = []
    for card_id, chain in chains.items():
        card = card_row_by_id[card_id]
        active_fields = active_field_defs_by_deck[card.deck_id]
        field_defs_by_id = {fd.id: fd for fd in active_fields}
        primary = active_fields[0]
        values_by_field = {v.field_def_id: v.value for v in card.values}

        attempts = [
            BreakdownAttempt(
                practice_card_id=pc.id,
                prompts=_resolve_field_values(field_defs_by_id, values_by_field, pc.prompts),
                answers=_resolve_rated_field_values(
                    field_defs_by_id, values_by_field, ratings_by_group.get(pc.id, {}), pc.answers
                ),
            )
            for pc in chain
        ]

        raw_cards.append(
            {
                "card_id": card_id,
                "primary_field": ResolvedFieldValue(
                    field_def_id=primary.id,
                    name=primary.name,
                    type=primary.type,
                    value=values_by_field.get(primary.id, ""),
                ),
                "attempts": attempts,
            }
        )

    domain = [
        (card.id, fd.id)
        for card in card_rows
        for fd in active_field_defs_by_deck[card.deck_id]
    ]
    field_deltas = _compute_field_readiness_deltas(db, strategy, practice_run_id, domain)

    breakdown_cards = []
    for raw in raw_cards:
        card_id = raw["card_id"]
        shown = {f.field_def_id for a in raw["attempts"] for f in a.prompts}
        asked = {f.field_def_id for a in raw["attempts"] for f in a.answers}
        fields = []
        befores = []
        afters = []
        for fd in active_field_defs_by_deck[card_row_by_id[card_id].deck_id]:
            before, after, delta = field_deltas[(card_id, fd.id)]
            befores.append(before)
            afters.append(after)
            if fd.id in shown or fd.id in asked:
                fields.append(
                    FieldReadinessDelta(
                        field_def_id=fd.id,
                        name=fd.name,
                        type=fd.type,
                        side=FieldSide.prompt if fd.id in shown else FieldSide.answer,
                        readiness=after,
                        delta=delta,
                        change=classify_change(delta, strategy.reach),
                    )
                )
        card_before = fold_card_readiness(befores)
        card_after = fold_card_readiness(afters)
        card_delta = card_after - card_before
        breakdown_cards.append(
            BreakdownCard(
                **raw,
                readiness=card_after,
                delta=card_delta,
                change=classify_change(card_delta, strategy.reach),
                fields=fields,
            )
        )

    # First attempt's position ascending — a chain's first row's position never moves
    # once written (only pending rows are ever renumbered, db_stage_renumber_pending_practice_cards).
    breakdown_cards.sort(key=lambda bc: chains[bc.card_id][0].position)

    return PracticeRunBreakdown(total_cards=len(chains), cards=breakdown_cards)


def _end_of_queue_position(run_max_position: int) -> int:
    """Fewer than RETRY_SPACING_FLOOR cards pending: the retry goes above every row the
    run has placed, at the same +500 the no-successor case uses, so it cannot
    collide."""
    return run_max_position + _POSITION_GAP // 2


def _insertion_position(pending: list[tuple[PracticeCard, float]], new_readiness: float) -> int:
    """pending: a run's pending cards in position order, each paired with its current
    readiness; at least RETRY_SPACING_FLOOR of them (with fewer, the retry goes to
    `_end_of_queue_position` instead). Four steps:

    1. `readiness_index`, the count of pending cards whose readiness is strictly below
       `new_readiness`, is where the ascending-readiness order alone would insert.
    2. The index is clamped up to at least RETRY_SPACING_FLOOR: a clamp, not a
       fixed placement, so a card whose readiness already puts it deeper stays at that
       deeper slot.
    3. With no successor at the resulting index, the retry goes 500 above the last
       pending card.
    4. Otherwise it takes the midpoint between its predecessor and successor. A
       predecessor always exists because RETRY_SPACING_FLOOR >= 1."""
    assert len(pending) >= RETRY_SPACING_FLOOR
    readiness_index = sum(1 for _, readiness in pending if readiness < new_readiness)
    final_index = max(readiness_index, RETRY_SPACING_FLOOR)

    if final_index == len(pending):
        return pending[-1][0].position + _POSITION_GAP // 2
    return (pending[final_index - 1][0].position + pending[final_index][0].position) // 2


def _requeue_failed_card(
    db: Session,
    strategy: MasteryStrategy,
    old_card: PracticeCard,
    practice_deck: PracticeDeck,
    rng: random.Random,
    failed_field_ids: Sequence[uuid.UUID] = (),
) -> PracticeCard | None:
    """Inserts a fresh practice_card row for the same card_id — never mutates
    old_card, which stays 'failed'. Position reflects the card's readiness *after* this
    submission's blend, so a badly-missed card resurfaces sooner, when at least
    RETRY_SPACING_FLOOR cards are pending; with fewer, the retry goes to the end of the
    queue. `failed_field_ids` (the answer fields rated "Again") are forced into the new
    row's answer set ahead of pool sampling, so the retry always re-asks what was
    missed — a failed
    field deleted or blanked since drops out of the generation filters like any other.
    Returns None if the card can no longer be generated at all (e.g. every remaining
    field deleted since the snapshot was cut) — nothing to requeue with, same as at
    session start."""
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
        forced_answer_pool_ids=failed_field_ids,
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
    # earlier in this same transaction. db_try_stage_create_practice_card owns the
    # fix: SET CONSTRAINTS ... IMMEDIATE forces *this* insert's check back to statement
    # time, inside a savepoint, so a collision is catchable, only the failed insert
    # rolls back, and it returns None for the loop below to renumber and retry.
    for _attempt in range(2):
        pending = db_read_pending_practice_cards(db, old_card.practice_run_id)
        if len(pending) < RETRY_SPACING_FLOOR:
            run_max = db_read_max_practice_card_position(db, old_card.practice_run_id)
            assert run_max is not None, "the row just rated exists in this transaction"
            position = _end_of_queue_position(run_max)
        else:
            readiness = card_readiness(
                db, strategy, [c.card_id for c in pending] + [old_card.card_id], field_ids
            )
            position = _insertion_position(
                [(c, readiness[c.card_id].readiness) for c in pending],
                readiness[old_card.card_id].readiness,
            )

        new_card = db_try_stage_create_practice_card(
            db,
            {
                "practice_run_id": old_card.practice_run_id,
                "card_id": old_card.card_id,
                "position": position,
                "prompts": prompts,
                "answers": answers,
            },
        )
        if new_card is not None:
            return new_card
        db_stage_renumber_pending_practice_cards(db, old_card.practice_run_id)

    raise RuntimeError(
        f"could not find a free position for a requeued card in session "
        f"{old_card.practice_run_id} after renumbering"
    )


def submit_rating(
    db: Session,
    strategy: MasteryStrategy,
    user_id: uuid.UUID,
    practice_card_id: uuid.UUID,
    ratings: dict[uuid.UUID, int],
    rng: random.Random | None = None,
) -> tuple[PracticeCard, PracticeCard | None]:
    """One explicit transaction, in this order: record_review_group, then update
    practice_card.status, then — if failed — requeue a new row. Raises
    LookupError if the practice_card doesn't exist (including: exists but belongs to
    another user — a foreign id 404s, it doesn't 403), a `card_already_rated` or
    `not_current_card` Refusal if it's already been rated or is not its run's current
    card, and ValueError if the ratings don't cover exactly its answer fields."""
    rng = rng or random.Random()

    practice_card = db_read_practice_card(db, practice_card_id, user_id)
    if not practice_card:
        raise LookupError(f"practice_card {practice_card_id} not found")
    if practice_card.status != PracticeCardStatus.pending:
        raise Refusal("card_already_rated", "practice_card is no longer pending")
    current = db_read_current_practice_card(db, practice_card.practice_run_id, user_id)
    if current is None or current.id != practice_card.id:
        raise Refusal("not_current_card", "practice_card is not its run's current card")
    if set(ratings.keys()) != set(practice_card.answers):
        raise ValueError("ratings must cover exactly this practice_card's answer fields")

    group = ReviewGroup(
        review_group_id=practice_card.id,
        card_id=practice_card.card_id,
        reviewed_at=datetime.now(UTC),
        ratings=tuple(ratings.items()),
        shown_prompt_ids=tuple(practice_card.prompts),
    )
    record_review_group(db, strategy, user_id, group, practice_card.practice_run_id)

    failed = any(rating == 1 for rating in ratings.values())
    new_status = PracticeCardStatus.failed if failed else PracticeCardStatus.passed
    db_stage_update_practice_card_status(db, practice_card, new_status)

    requeued = None
    if failed:
        failed_field_ids = [fid for fid, r in ratings.items() if r == 1]
        card = db_read_card(db, practice_card.card_id, user_id)
        assert card is not None, "the practice_card fetch above already confirmed ownership"
        practice_deck = db_read_practice_deck_for_deck(
            db, practice_card.practice_run_id, card.deck_id
        )
        assert practice_deck is not None, "every deck used in a session has a snapshot"
        requeued = _requeue_failed_card(
            db, strategy, practice_card, practice_deck, rng, failed_field_ids
        )

    db.commit()
    db.refresh(practice_card)
    if requeued:
        db.refresh(requeued)
    return practice_card, requeued
