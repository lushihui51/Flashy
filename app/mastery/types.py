import uuid
from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class ReviewSide(str, Enum):
    prompt = "prompt"
    answer = "answer"


@dataclass(frozen=True)
class FieldMasteryState:
    """Mirrors card_field_mastery's value columns exactly. No card_id/field_def_id —
    identity is the caller's concern, not the strategy's."""

    prompt_mastery: float
    answer_mastery: float
    prompt_review_count: int
    answer_review_count: int


@dataclass(frozen=True)
class ReviewGroup:
    """One appearance: every review_log row sharing a review_group_id, collapsed. This
    is the unit mastery math operates on, not the raw row — a prompt shown alongside n
    rated answers in the same appearance is one piece of evidence of variable strength,
    not n independent ones. Requires the appearance to have been logged atomically: a
    group must never be assembled from a partial, still-growing set of rows."""

    review_group_id: uuid.UUID
    card_id: uuid.UUID
    reviewed_at: datetime
    ratings: tuple[tuple[uuid.UUID, int], ...]  # (field_def_id, rating) per rated answer
    shown_prompt_ids: tuple[uuid.UUID, ...]


@dataclass(frozen=True)
class MasteryUpdate:
    """One (card, field, side)'s decided update, produced by MasteryStrategy.expand.
    target_score is what to blend toward; breadth is the evidence count behind it
    (always 1 on the answer side — each answer field is rated exactly once per
    appearance; the number of rated answers a prompt was shown for, on the prompt
    side). apply_review is the only place breadth becomes an effective weight."""

    side: ReviewSide
    target_score: float
    breadth: int


@dataclass(frozen=True)
class CardScore:
    mastery: float
    reviewed_field_count: int
