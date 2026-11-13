import random
import uuid
from collections.abc import Mapping, Sequence

from sqlmodel import Session

from app.database_ops.run_generation import db_fetch_generation_candidates
from app.mastery.strategy import MasteryStrategy
from app.mastery.types import FieldMasteryState
from app.models.run_configuration import RunConfiguration

READINESS_CEILING = 1.0
SAMPLING_EPSILON = 0.01


def _row_state(row) -> FieldMasteryState | None:
    if row.prompt_mastery is None:
        return None
    return FieldMasteryState(
        prompt_mastery=row.prompt_mastery,
        answer_mastery=row.answer_mastery,
        prompt_review_count=row.prompt_review_count,
        answer_review_count=row.answer_review_count,
    )


def weighted_low_readiness_sample(
    candidates: Sequence[tuple[uuid.UUID, float]], k: int, rng: random.Random
) -> list[uuid.UUID]:
    """Weighted sample of up to k ids from candidates, without replacement, biased
    toward low readiness — the lower the readiness, the higher the weight. The weighting
    formula lives here, in one place, so it's the only thing that needs tuning."""
    k = min(k, len(candidates))
    if k <= 0:
        return []

    pool = list(candidates)
    chosen: list[uuid.UUID] = []
    for _ in range(k):
        weights = [max(READINESS_CEILING - readiness, SAMPLING_EPSILON) for _, readiness in pool]
        total = sum(weights)
        r = rng.uniform(0, total)
        upto = 0.0
        for i, w in enumerate(weights):
            upto += w
            if upto >= r:
                chosen.append(pool[i][0])
                pool.pop(i)
                break
    return chosen


def resolve_prompts_or_answers(
    db: Session,
    strategy: MasteryStrategy,
    card_id: uuid.UUID,
    fixed_ids: list[uuid.UUID],
    pool_ids: list[uuid.UUID],
    pool_counts: list[int],
    rng: random.Random,
    forced_pool_ids: Sequence[uuid.UUID] = (),
) -> list[uuid.UUID]:
    """One side (prompts or answers) of pool resolution for one card. Fixed ids are
    always included if they survive filtering (still live, not blank on this card).
    Any `forced_pool_ids` that survive the same filtering are included next, ahead of
    sampling (the requeue's guarantee that a field rated "Again" is re-asked);
    the remaining pool ids are weighted-sampled from the rest, with the drawn count —
    chosen from the config's allowed pool_counts — reduced by however many were forced
    and floored at zero, so a card with more forced fields than the drawn count simply
    carries all of them rather than dropping one to make room."""
    rows = db_fetch_generation_candidates(db, card_id, fixed_ids + pool_ids)
    readiness = {row.field_def_id: strategy.readiness(_row_state(row)) for row in rows}

    surviving_fixed = [fid for fid in fixed_ids if fid in readiness]
    forced = [pid for pid in pool_ids if pid in readiness and pid in forced_pool_ids]
    forced_set = set(forced)
    surviving_pool = [
        (pid, readiness[pid]) for pid in pool_ids if pid in readiness and pid not in forced_set
    ]

    count = rng.choice(pool_counts) if pool_counts else 0
    sampled_pool = weighted_low_readiness_sample(surviving_pool, max(0, count - len(forced)), rng)

    return surviving_fixed + forced + sampled_pool


def generate_run_card_fields(
    db: Session,
    strategy: MasteryStrategy,
    card_id: uuid.UUID,
    prompt_field_ids: list[uuid.UUID],
    answer_field_ids: list[uuid.UUID],
    prompt_pool_ids: list[uuid.UUID],
    prompt_pool_counts: list[int],
    answer_pool_ids: list[uuid.UUID],
    answer_pool_counts: list[int],
    rng: random.Random,
    forced_answer_pool_ids: Sequence[uuid.UUID] = (),
) -> tuple[list[uuid.UUID], list[uuid.UUID]] | None:
    """Resolves (prompts, answers) for one card under one run's copy of its deck. Returns
    None — meaning skip this card — if zero prompts or zero answers survive, rather than
    generating an unrenderable run_card. `forced_answer_pool_ids` only ever applies to the
    answer side, and only a requeue passes any."""
    prompts = resolve_prompts_or_answers(
        db, strategy, card_id, prompt_field_ids, prompt_pool_ids, prompt_pool_counts, rng
    )
    answers = resolve_prompts_or_answers(
        db,
        strategy,
        card_id,
        answer_field_ids,
        answer_pool_ids,
        answer_pool_counts,
        rng,
        forced_pool_ids=forced_answer_pool_ids,
    )
    if not prompts or not answers:
        return None
    return prompts, answers


def card_is_askable(values: Mapping[uuid.UUID, str], configuration: RunConfiguration) -> bool:
    """Whether a card with these values, by field id, has a non-blank value among the fields each side of the configuration names."""

    def side_has_value(field_ids: list[uuid.UUID]) -> bool:
        return any(values.get(field_id, "") != "" for field_id in field_ids)

    return side_has_value(
        [*configuration.prompt_field_ids, *configuration.prompt_pool_ids]
    ) and side_has_value([*configuration.answer_field_ids, *configuration.answer_pool_ids])
