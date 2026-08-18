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
class ReviewEvent:
    """One (card, field) side of a review_log row. side says whether this event blends
    into prompt_mastery or answer_mastery; reviewed_at is carried through for the
    repository to stamp updated_at deterministically (rebuild replays must produce the
    same updated_at as the original incremental write), not for strategy arithmetic."""

    side: ReviewSide
    rating: int
    reviewed_at: datetime


@dataclass(frozen=True)
class CardScore:
    mastery: float
    reviewed_field_count: int
