import random
import uuid
from collections.abc import Sequence

from sqlmodel import Session

from app.database_ops.practice_generation import db_fetch_generation_candidates
from app.mastery.strategy import MasteryStrategy
from app.mastery.types import FieldMasteryState

MASTERY_CEILING = 100.0
SAMPLING_EPSILON = 1.0


def _row_state(row) -> FieldMasteryState | None:
    if row.prompt_mastery is None:
        return None
    return FieldMasteryState(
        prompt_mastery=row.prompt_mastery,
        answer_mastery=row.answer_mastery,
        prompt_review_count=row.prompt_review_count,
        answer_review_count=row.answer_review_count,
    )


def weighted_low_mastery_sample(
    candidates: Sequence[tuple[uuid.UUID, float | None]], k: int, rng: random.Random
) -> list[uuid.UUID]:
    """Weighted sample of up to k ids from candidates, without replacement, biased
    toward low mastery — the lower the score, the higher the weight. None (never
    reviewed) is treated as the lowest possible score: maximal priority, the same
    "unseen sorts first" idea used for card ordering. The weighting formula lives here,
    in one place, so it's the only thing that needs tuning."""
    k = min(k, len(candidates))
    if k <= 0:
        return []

    pool = [(id_, (0.0 if score is None else score)) for id_, score in candidates]
    chosen: list[uuid.UUID] = []
    for _ in range(k):
        weights = [max(MASTERY_CEILING - score, SAMPLING_EPSILON) for _, score in pool]
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
) -> list[uuid.UUID]:
    """One side (prompts or answers) of pool resolution for one card. Fixed ids are
    always included if they survive filtering (still live, not blank on this card);
    pool ids are weighted-sampled from the survivors, with the drawn count — chosen
    from the config's allowed pool_counts — clamped to how many actually survive."""
    rows = db_fetch_generation_candidates(db, card_id, fixed_ids + pool_ids)
    scores = {row.field_def_id: strategy.field_score(_row_state(row)) for row in rows}

    surviving_fixed = [fid for fid in fixed_ids if fid in scores]
    surviving_pool = [(pid, scores[pid]) for pid in pool_ids if pid in scores]

    count = rng.choice(pool_counts) if pool_counts else 0
    sampled_pool = weighted_low_mastery_sample(surviving_pool, count, rng)

    return surviving_fixed + sampled_pool


def generate_practice_card_fields(
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
) -> tuple[list[uuid.UUID], list[uuid.UUID]] | None:
    """Resolves (prompts, answers) for one card under one config snapshot. Returns None
    — meaning skip this card — if zero prompts or zero answers survive, rather than
    generating an unrenderable practice_card."""
    prompts = resolve_prompts_or_answers(
        db, strategy, card_id, prompt_field_ids, prompt_pool_ids, prompt_pool_counts, rng
    )
    answers = resolve_prompts_or_answers(
        db, strategy, card_id, answer_field_ids, answer_pool_ids, answer_pool_counts, rng
    )
    if not prompts or not answers:
        return None
    return prompts, answers
