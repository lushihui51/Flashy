from collections.abc import Sequence
from dataclasses import dataclass, field, replace

from app.mastery.types import CardScore, FieldMasteryState, ReviewEvent, ReviewSide

MASTERY_PRIOR = 50.0
EMA_ALPHA = 0.3
RATING_SCORES: dict[int, float] = {1: 0.0, 2: 33.0, 3: 67.0, 4: 100.0}


@dataclass(frozen=True)
class EmaStrategy:
    """Exponential moving average toward the normalized rating. Constants live here,
    not in a shared module — invariant 8: no other module may import them, consumers go
    through the strategy."""

    name: str = "ema"
    prior_value: float = MASTERY_PRIOR
    alpha: float = EMA_ALPHA
    rating_scores: dict[int, float] = field(default_factory=lambda: dict(RATING_SCORES))

    def prior(self) -> FieldMasteryState:
        return FieldMasteryState(
            prompt_mastery=self.prior_value,
            answer_mastery=self.prior_value,
            prompt_review_count=0,
            answer_review_count=0,
        )

    def apply_review(
        self, current: FieldMasteryState | None, event: ReviewEvent
    ) -> FieldMasteryState:
        base = current if current is not None else self.prior()
        score = self.rating_scores[event.rating]

        if event.side is ReviewSide.answer:
            blended = base.answer_mastery + self.alpha * (score - base.answer_mastery)
            return replace(
                base, answer_mastery=blended, answer_review_count=base.answer_review_count + 1
            )

        blended = base.prompt_mastery + self.alpha * (score - base.prompt_mastery)
        return replace(
            base, prompt_mastery=blended, prompt_review_count=base.prompt_review_count + 1
        )

    def field_score(self, state: FieldMasteryState | None) -> float | None:
        if state is None:
            return None
        return (state.prompt_mastery + state.answer_mastery) / 2

    def card_score(self, field_scores: Sequence[float | None]) -> CardScore:
        if not field_scores:
            return CardScore(mastery=self.prior_value, reviewed_field_count=0)

        reviewed_field_count = sum(1 for s in field_scores if s is not None)
        total = sum(s if s is not None else self.prior_value for s in field_scores)
        return CardScore(
            mastery=total / len(field_scores), reviewed_field_count=reviewed_field_count
        )
