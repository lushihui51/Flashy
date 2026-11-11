import random
import uuid
from collections import defaultdict
from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.database_ops.card import (
    db_read_card,
    db_read_card_ids_for_deck,
    db_read_cards_with_values,
    db_read_deck_id_by_card,
)
from app.database_ops.field_def import db_read_field_defs, db_read_field_defs_for_decks
from app.database_ops.mastery_log import (
    db_fetch_mastery_before_bound,
    db_fetch_mastery_read_rows,
    db_fetch_run_mastery_log_rows,
)
from app.database_ops.practice import db_read_practice
from app.database_ops.practice_configuration import db_read_practice_configurations
from app.database_ops.run import (
    db_read_active_run,
    db_read_run,
    db_read_run_read,
    db_stage_create_run,
    db_stage_update_run_status,
    db_try_stage_create_run,
    db_update_run_status,
)
from app.database_ops.run_card import (
    db_read_current_run_card,
    db_read_max_run_card_position,
    db_read_pending_run_cards,
    db_read_ratings_by_review_group,
    db_read_run_card,
    db_read_run_cards_for_run,
    db_stage_create_run_card,
    db_stage_renumber_pending_run_cards,
    db_stage_update_run_card_status,
    db_try_stage_create_run_card,
)
from app.database_ops.run_configuration import (
    db_read_run_configuration_for_deck,
    db_stage_create_run_configuration,
)
from app.database_ops.run_counted_card import db_stage_create_run_counted_cards
from app.mastery.readiness import classify_change, fold_card_readiness
from app.mastery.strategy import MasteryStrategy
from app.mastery.types import FieldMasteryState, ReviewGroup
from app.models.field_def import FieldDef
from app.models.practice import Practice
from app.models.run import Run, RunRead, RunStatus
from app.models.run_card import RunCard, RunCardStatus
from app.models.run_configuration import RunConfiguration
from app.models.run_payloads import (
    BreakdownAttempt,
    BreakdownCard,
    CurrentRunCard,
    FieldReadinessDelta,
    FieldSide,
    RatedFieldValue,
    ResolvedFieldValue,
    RunBreakdownRead,
    RunProgress,
    RunState,
)
from app.refusals import Refusal
from app.services.activity import touch
from app.services.mastery import card_readiness, record_review_group
from app.services.practice_configuration import arrays_of, validate_configuration
from app.services.run_generation import card_is_askable, generate_run_card_fields

_POSITION_GAP = 1000
# A retry may not surface until this many other pending cards have had their turn,
# clamping the readiness-ordered insertion point rather than replacing it — a card whose
# readiness already puts it deeper than the floor stays at its deeper slot (ADR 037).
# Must stay >= 1: _insertion_position always reads a predecessor.
RETRY_SPACING_FLOOR = 3


def _configuration_field_ids(configuration: RunConfiguration) -> list[uuid.UUID]:
    return list(
        set(configuration.prompt_field_ids)
        | set(configuration.answer_field_ids)
        | set(configuration.prompt_pool_ids)
        | set(configuration.answer_pool_ids)
    )


def _generate_deck(
    db: Session,
    strategy: MasteryStrategy,
    configuration: RunConfiguration,
    rng: random.Random,
    next_position: int,
) -> tuple[int, list[uuid.UUID]]:
    """Writes the run cards of one deck under its run's copy, unseen cards first, then by
    ascending readiness, with sparse positions from `next_position`. Returns the position
    to continue from and the cards the copy could ask, which are the cards it wrote."""
    selected = db_read_card_ids_for_deck(db, configuration.deck_id)
    if configuration.card_ids is not None:
        chosen = set(configuration.card_ids)
        selected = [card_id for card_id in selected if card_id in chosen]
    values_by_card = {
        card.id: {value.field_def_id: value.value for value in card.values}
        for card in db_read_cards_with_values(db, selected)
    }
    askable = [
        card_id for card_id in selected if card_is_askable(values_by_card[card_id], configuration)
    ]
    readiness = card_readiness(db, strategy, askable, _configuration_field_ids(configuration))
    ordered = sorted(askable, key=lambda cid: (readiness[cid].reviewed, readiness[cid].readiness))

    for card_id in ordered:
        resolved = generate_run_card_fields(
            db,
            strategy,
            card_id,
            configuration.prompt_field_ids,
            configuration.answer_field_ids,
            configuration.prompt_pool_ids,
            configuration.prompt_pool_counts,
            configuration.answer_pool_ids,
            configuration.answer_pool_counts,
            rng,
        )
        assert resolved is not None, "an askable card has a field on each side to show"
        prompts, answers = resolved
        db_stage_create_run_card(
            db,
            {
                "run_id": configuration.run_id,
                "card_id": card_id,
                "position": next_position,
                "prompts": prompts,
                "answers": answers,
            },
        )
        next_position += _POSITION_GAP

    return next_position, askable


def cut_run(
    db: Session,
    strategy: MasteryStrategy,
    practice: Practice,
    run: Run,
    card_ids: list[uuid.UUID] | None = None,
    *,
    rng: random.Random | None = None,
) -> None:
    """Fills `run`, staged by the caller and not yet committed, from the practice's
    configurations as they stand: one copy per deck, the copy's cards, and the cards it
    counts. With `card_ids`, each copy covers only its deck's cards among them, none for a
    deck that holds none. Touches the run. Raises `Refusal("no_cards")` when no card is
    written, leaving the caller to discard the transaction, and AssertionError when a
    configuration no longer passes `validate_configuration`. No commit."""
    rng = rng or random.Random()

    chosen_by_deck: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)
    if card_ids is not None:
        deck_id_by_card = db_read_deck_id_by_card(db, card_ids)
        for card_id in dict.fromkeys(card_ids):
            chosen_by_deck[deck_id_by_card[card_id]].append(card_id)

    next_position = 0
    counted: list[uuid.UUID] = []
    for configuration in db_read_practice_configurations(db, practice.id):
        arrays = arrays_of(configuration)
        try:
            validate_configuration(db, configuration.deck_id, arrays)
        except ValueError as e:
            # Every writer of a practice's configuration leaves it valid (ADR 109).
            raise AssertionError(
                f"practice_configuration {configuration.id} is invalid at the cut: {e}"
            ) from e
        copy = db_stage_create_run_configuration(
            db,
            {
                "run_id": run.id,
                "deck_id": configuration.deck_id,
                "card_ids": None if card_ids is None else chosen_by_deck[configuration.deck_id],
                **arrays,
            },
        )
        next_position, askable = _generate_deck(db, strategy, copy, rng, next_position)
        counted.extend(askable)

    # Only generation knows whether a card has something to show on each side, so an
    # empty run is found after every deck is cut, and refused before anything commits.
    if next_position == 0:
        raise Refusal("no_cards", "the run's copies generated no run card")

    db_stage_create_run_counted_cards(db, run.id, counted)
    touch(db, run)


def _read_run(db: Session, run_id: uuid.UUID, user_id: uuid.UUID) -> RunRead:
    run_read = db_read_run_read(db, run_id, user_id)
    assert run_read is not None, "the run was just read or written under its owner"
    return run_read


def start_run(
    db: Session,
    strategy: MasteryStrategy,
    user_id: uuid.UUID,
    practice_id: uuid.UUID,
    rng: random.Random | None = None,
) -> RunRead:
    """The practice's active run, or a new one cut from its configurations when it has
    none. An active run with no pending card is completed first. Two concurrent starts
    land on one run. Raises LookupError for an unknown or foreign practice and
    `Refusal("no_cards")` when a new run would have no card."""
    practice = db_read_practice(db, practice_id, user_id)
    if practice is None:
        raise LookupError(f"practice {practice_id} not found")

    active = db_read_active_run(db, practice.id)
    if active is not None:
        if db_read_current_run_card(db, active.id, user_id) is not None:
            return _read_run(db, active.id, user_id)
        db_stage_update_run_status(db, active, RunStatus.completed)

    run = db_try_stage_create_run(db, practice.id)
    if run is None:
        # A concurrent start created the practice's active run first. The commit keeps the
        # completion of a run with nothing pending, staged above.
        db.commit()
        concurrent = db_read_active_run(db, practice.id)
        assert concurrent is not None, "the index refused a second active run"
        return _read_run(db, concurrent.id, user_id)

    cut_run(db, strategy, practice, run, rng=rng)
    db.commit()
    return _read_run(db, run.id, user_id)


def _next_run_practice(db: Session, user_id: uuid.UUID, run_id: uuid.UUID) -> tuple[Run, Practice]:
    """The completed run a next run starts from and its practice. Raises LookupError for an
    unknown or foreign run, `Refusal("run_active")` while the run is active and
    `Refusal("practice_has_active_run")` while another run of its practice is."""
    run = db_read_run(db, run_id, user_id)
    if run is None:
        raise LookupError(f"run {run_id} not found")
    if run.status != RunStatus.completed:
        raise Refusal("run_active", "the run is still active")
    if db_read_active_run(db, run.practice_id) is not None:
        raise Refusal("practice_has_active_run", "the run's practice has an active run")
    practice = db_read_practice(db, run.practice_id, user_id)
    assert practice is not None, "a run's practice has the run's owner"
    return run, practice


def _stage_next_run(db: Session, practice: Practice) -> Run:
    """Stages a new active run of the practice for a re-run or a run of chosen cards.
    Raises `Refusal("practice_has_active_run")`, the transaction rolled back, when a
    concurrent start gave the practice an active run after `_next_run_practice` looked."""
    try:
        return db_stage_create_run(db, practice.id)
    except IntegrityError:
        db.rollback()
        raise Refusal("practice_has_active_run", "the run's practice has an active run") from None


def rerun(
    db: Session,
    strategy: MasteryStrategy,
    user_id: uuid.UUID,
    run_id: uuid.UUID,
    rng: random.Random | None = None,
) -> RunRead:
    """A new run of the whole practice of the completed run `run_id`, cut from the
    practice's configurations as they stand. Raises as `_next_run_practice` does, and
    `Refusal("no_cards")` when the new run would have no card."""
    _, practice = _next_run_practice(db, user_id, run_id)
    new_run = _stage_next_run(db, practice)
    cut_run(db, strategy, practice, new_run, rng=rng)
    db.commit()
    return _read_run(db, new_run.id, user_id)


def start_chosen_cards(
    db: Session,
    strategy: MasteryStrategy,
    user_id: uuid.UUID,
    run_id: uuid.UUID,
    card_ids: list[uuid.UUID],
    rng: random.Random | None = None,
) -> RunRead:
    """A new run of exactly `card_ids`, each a card of the completed run `run_id`, cut from
    its practice's configurations as they stand. Raises as `_next_run_practice` does,
    ValueError when `card_ids` is empty or names a card the run did not hold, and
    `Refusal("no_cards")` when the new run would have no card."""
    run, practice = _next_run_practice(db, user_id, run_id)
    if not card_ids:
        raise ValueError("no cards chosen")
    held_card_ids = {card.card_id for card in db_read_run_cards_for_run(db, run.id)}
    if not held_card_ids.issuperset(card_ids):
        raise ValueError("a chosen card is not a card of this run")

    new_run = _stage_next_run(db, practice)
    cut_run(db, strategy, practice, new_run, card_ids, rng=rng)
    db.commit()
    return _read_run(db, new_run.id, user_id)


def get_current_run_card(db: Session, run_id: uuid.UUID, user_id: uuid.UUID) -> RunCard | None:
    """The derived current card — never stored, always this query (invariant, see
    Run's docstring). If none remain for a still-active run, it transitions to completed rather than leaving the caller to 404 against it forever.
    This doesn't distinguish *why* nothing remains: a run rated to genuine completion
    looks the same here as one stranded because its cards were deleted, or because one
    deck of a multi-deck run was deleted and took that deck's cards' run_card rows
    with it. The blur is accepted rather than tracking a third status nothing could
    set reliably."""
    card = db_read_current_run_card(db, run_id, user_id)
    if card is None:
        run = db_read_run(db, run_id, user_id)
        if run is not None and run.status == RunStatus.active:
            db_update_run_status(db, run, RunStatus.completed)
    return card


def _chains_by_card_id(cards: list[RunCard]) -> dict[uuid.UUID, list[RunCard]]:
    """Groups a run's rows by card_id, preserving `cards`' own order within each
    group. Callers (run_progress, the run-state attempt count, and the breakdown) all
    require `cards` to already be created_at-ascending — the ordering
    db_read_run_cards_for_run returns — so a chain's last item is always its
    last-written row and its index is a 1-based attempt count."""
    chains: dict[uuid.UUID, list[RunCard]] = {}
    for card in cards:
        chains.setdefault(card.card_id, []).append(card)
    return chains


def run_progress(cards: list[RunCard]) -> RunProgress:
    """The chain-bucket fold, pure, behind the run state's progress: `cards` — every
    run_card row a run has produced, created_at ascending (db_read_run_cards_for_run) —
    is grouped into chains by card_id,
    and each chain's *last* row decides its bucket: pending with one row is unseen,
    pending with more is a retry, passed is passed, failed is failed. `total_cards` is
    the chain count, fixed for the
    run's lifetime by construction: it can only equal however many distinct card_ids
    ever got a row, which is set once when the run is cut and never grows."""
    counts = {"unseen": 0, "retry_pending": 0, "passed": 0, "still_failed": 0}
    chains = _chains_by_card_id(cards)
    for chain in chains.values():
        last = chain[-1]
        if last.status == RunCardStatus.pending:
            counts["unseen" if len(chain) == 1 else "retry_pending"] += 1
        elif last.status == RunCardStatus.passed:
            counts["passed"] += 1
        else:
            counts["still_failed"] += 1
    return RunProgress(total_cards=len(chains), **counts)


def _resolve_field_values(
    field_defs_by_id: dict[uuid.UUID, FieldDef],
    values_by_field: dict[uuid.UUID, str],
    field_ids: list[uuid.UUID],
) -> list[ResolvedFieldValue]:
    """One side (prompts or answers) of a run_card's stored id array, resolved
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
    db: Session, user_id: uuid.UUID, current: RunCard, cards: list[RunCard]
) -> CurrentRunCard:
    """Builds the run payload's one live card: attempt is read off the chain fold
    (run_progress's same grouping) rather than stored anywhere, and field
    resolution goes through the card's own deck."""
    chain = _chains_by_card_id(cards)[current.card_id]
    attempt = chain.index(current) + 1

    card = db_read_card(db, current.card_id, user_id)
    assert card is not None, "a run_card's card_id cascades on card delete"
    values_by_field = {v.field_def_id: v.value for v in card.values}
    field_defs_by_id = {
        fd.id: fd for fd in db_read_field_defs(db, card.deck_id, user_id)
    }

    return CurrentRunCard(
        run_card_id=current.id,
        card_id=current.card_id,
        attempt=attempt,
        prompts=_resolve_field_values(field_defs_by_id, values_by_field, current.prompts),
        answers=_resolve_field_values(field_defs_by_id, values_by_field, current.answers),
    )


def read_run_state(db: Session, run_id: uuid.UUID, user_id: uuid.UUID) -> RunState | None:
    """The whole `GET /api/runs/{id}/state` payload: the run's practice, day and status, the
    progress fold, and the resolved current card, if any. None for an unknown or foreign
    run (the router 404s). Delegates to get_current_run_card for the active->completed
    transition and reads the status only afterward, so a run that just ran out of pending
    cards reports "completed" in this same response rather than a stale "active"."""
    if db_read_run(db, run_id, user_id) is None:
        return None

    current = get_current_run_card(db, run_id, user_id)
    run = _read_run(db, run_id, user_id)
    practice = db_read_practice(db, run.practice_id, user_id)
    assert practice is not None, "a run's practice has the run's owner"
    cards = db_read_run_cards_for_run(db, run_id)
    current_run_card = (
        _resolve_current_run_card(db, user_id, current, cards) if current is not None else None
    )

    return RunState(
        practice_id=practice.id,
        practice_name=practice.name,
        day=run.day,
        day_index=run.day_index,
        status=run.status,
        progress=run_progress(cards),
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
    (db_read_ratings_by_review_group). Every answer field a completed run card
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
    run_id: uuid.UUID,
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
    run_rows = db_fetch_run_mastery_log_rows(db, run_id)

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


def read_run_breakdown(
    db: Session, strategy: MasteryStrategy, run_id: uuid.UUID, user_id: uuid.UUID
) -> RunBreakdownRead | None:
    """The whole `GET /api/runs/{id}/breakdown` payload: every card's resolved, rated
    attempts, and the readiness, delta and kind of change of the card and of each field its
    attempts showed or asked. None for an unknown or foreign run (the router 404s). Raises
    `Refusal("run_active")` if the run hasn't completed yet (the router 409s):
    terminal-only attempts only make sense once nothing is pending."""
    run = db_read_run(db, run_id, user_id)
    if run is None:
        return None
    if run.status == RunStatus.active:
        raise Refusal("run_active", f"run {run_id} is still active")

    cards = db_read_run_cards_for_run(db, run_id)
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
                run_card_id=pc.id,
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
    field_deltas = _compute_field_readiness_deltas(db, strategy, run_id, domain)

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
    # once written (only pending rows are ever renumbered, db_stage_renumber_pending_run_cards).
    breakdown_cards.sort(key=lambda bc: chains[bc.card_id][0].position)

    return RunBreakdownRead(total_cards=len(chains), cards=breakdown_cards)


def _end_of_queue_position(run_max_position: int) -> int:
    """Fewer than RETRY_SPACING_FLOOR cards pending: the retry goes above every row the
    run has placed, at the same +500 the no-successor case uses, so it cannot
    collide."""
    return run_max_position + _POSITION_GAP // 2


def _insertion_position(pending: list[tuple[RunCard, float]], new_readiness: float) -> int:
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
    old_card: RunCard,
    configuration: RunConfiguration,
    values_by_field: dict[uuid.UUID, str],
    rng: random.Random,
    failed_field_ids: Sequence[uuid.UUID] = (),
) -> RunCard | None:
    """Inserts a fresh run_card row for the same card_id — never mutates
    old_card, which stays 'failed'. Position reflects the card's readiness *after* this
    submission's blend, so a badly-missed card resurfaces sooner, when at least
    RETRY_SPACING_FLOOR cards are pending; with fewer, the retry goes to the end of the
    queue. `failed_field_ids` (the answer fields rated "Again") are forced into the new
    row's answer set ahead of pool sampling, so the retry always re-asks what was
    missed — a failed
    field deleted or blanked since drops out of the generation filters like any other.
    Returns None if the card is no longer askable under the run's copy (e.g. every
    remaining field of a side blanked since the copy was cut) — nothing to requeue with,
    as when the run is cut."""
    if not card_is_askable(values_by_field, configuration):
        return None
    resolved = generate_run_card_fields(
        db,
        strategy,
        old_card.card_id,
        configuration.prompt_field_ids,
        configuration.answer_field_ids,
        configuration.prompt_pool_ids,
        configuration.prompt_pool_counts,
        configuration.answer_pool_ids,
        configuration.answer_pool_counts,
        rng,
        forced_answer_pool_ids=failed_field_ids,
    )
    if resolved is None:
        return None
    prompts, answers = resolved
    field_ids = _configuration_field_ids(configuration)

    # One retry: if the computed position collides with an existing row, renumber the
    # run's pending cards to fresh 1000-spaced gaps and recompute. Must not be
    # discovered in production, but is cheap and rare enough that two attempts suffice.
    #
    # The position UNIQUE constraint is DEFERRABLE INITIALLY DEFERRED (bulk renumbering
    # needs to pass through intermediate collisions with not-yet-updated rows) — which
    # means a violation from a single bad insert wouldn't surface until COMMIT, too
    # late to retry without losing the review_log insert and mastery blend already done
    # earlier in this same transaction. db_try_stage_create_run_card owns the
    # fix: SET CONSTRAINTS ... IMMEDIATE forces *this* insert's check back to statement
    # time, inside a savepoint, so a collision is catchable, only the failed insert
    # rolls back, and it returns None for the loop below to renumber and retry.
    for _attempt in range(2):
        pending = db_read_pending_run_cards(db, old_card.run_id)
        if len(pending) < RETRY_SPACING_FLOOR:
            run_max = db_read_max_run_card_position(db, old_card.run_id)
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

        new_card = db_try_stage_create_run_card(
            db,
            {
                "run_id": old_card.run_id,
                "card_id": old_card.card_id,
                "position": position,
                "prompts": prompts,
                "answers": answers,
            },
        )
        if new_card is not None:
            return new_card
        db_stage_renumber_pending_run_cards(db, old_card.run_id)

    raise RuntimeError(
        f"could not find a free position for a requeued card in run "
        f"{old_card.run_id} after renumbering"
    )


def submit_rating(
    db: Session,
    strategy: MasteryStrategy,
    user_id: uuid.UUID,
    run_card_id: uuid.UUID,
    ratings: dict[uuid.UUID, int],
    rng: random.Random | None = None,
) -> tuple[RunCard, RunCard | None]:
    """One explicit transaction, in this order: record_review_group, then update
    run_card.status, then — if failed — requeue a new row; the run is touched. Raises
    LookupError if the run_card doesn't exist (including: exists but belongs to another
    user — a foreign id 404s, it doesn't 403), a `card_already_rated` or
    `not_current_card` Refusal if it's already been rated or is not its run's current
    card, and ValueError if the ratings don't cover exactly its answer fields."""
    rng = rng or random.Random()

    run_card = db_read_run_card(db, run_card_id, user_id)
    if not run_card:
        raise LookupError(f"run_card {run_card_id} not found")
    if run_card.status != RunCardStatus.pending:
        raise Refusal("card_already_rated", "run_card is no longer pending")
    current = db_read_current_run_card(db, run_card.run_id, user_id)
    if current is None or current.id != run_card.id:
        raise Refusal("not_current_card", "run_card is not its run's current card")
    if set(ratings.keys()) != set(run_card.answers):
        raise ValueError("ratings must cover exactly this run_card's answer fields")

    group = ReviewGroup(
        review_group_id=run_card.id,
        card_id=run_card.card_id,
        reviewed_at=datetime.now(UTC),
        ratings=tuple(ratings.items()),
        shown_prompt_ids=tuple(run_card.prompts),
    )
    record_review_group(db, strategy, user_id, group, run_card.run_id)

    failed = any(rating == 1 for rating in ratings.values())
    new_status = RunCardStatus.failed if failed else RunCardStatus.passed
    db_stage_update_run_card_status(db, run_card, new_status)

    requeued = None
    if failed:
        failed_field_ids = [fid for fid, r in ratings.items() if r == 1]
        card = db_read_card(db, run_card.card_id, user_id)
        assert card is not None, "the run_card fetch above already confirmed ownership"
        configuration = db_read_run_configuration_for_deck(db, run_card.run_id, card.deck_id)
        assert configuration is not None, "every deck of a run has its copy"
        requeued = _requeue_failed_card(
            db,
            strategy,
            run_card,
            configuration,
            {v.field_def_id: v.value for v in card.values},
            rng,
            failed_field_ids,
        )

    run = db_read_run(db, run_card.run_id, user_id)
    assert run is not None, "the run_card fetch above already confirmed ownership"
    touch(db, run)
    db.commit()
    db.refresh(run_card)
    if requeued:
        db.refresh(requeued)
    return run_card, requeued
