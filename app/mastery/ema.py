import uuid
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field, replace

from app.mastery.types import (
    CardScore,
    FieldMasteryState,
    MasteryUpdate,
    ReviewGroup,
    ReviewSide,
)

MASTERY_PRIOR = 50.0
EMA_ALPHA = 0.3
# Damping on breadth's effect on the effective weight: alpha_eff = 1-(1-alpha)^(n^beta).
# beta=0 ignores breadth entirely (plain alpha regardless of n); beta=1 is exactly n
# sequential plain-alpha blends toward the same target (their closed form); 0.5 is
# sqrt(n) damping, the usual "diminishing evidence" choice, and where this starts.
EMA_BETA = 0.5
RATING_SCORES: dict[int, float] = {1: 0.0, 2: 33.0, 3: 67.0, 4: 100.0}


@dataclass(frozen=True)
class EmaStrategy:
    """Exponential moving average toward the normalized rating. Constants live here,
    not in a shared module — invariant 8: no other module may import them, consumers go
    through the strategy."""

    name: str = "ema"
    prior_value: float = MASTERY_PRIOR
    alpha: float = EMA_ALPHA
    beta: float = EMA_BETA
    rating_scores: dict[int, float] = field(default_factory=lambda: dict(RATING_SCORES))

    def prior(self) -> FieldMasteryState:
        return FieldMasteryState(
            prompt_mastery=self.prior_value,
            answer_mastery=self.prior_value,
            prompt_review_count=0,
            answer_review_count=0,
        )

    def expand(
        self, group: ReviewGroup
    ) -> dict[tuple[uuid.UUID, uuid.UUID, ReviewSide], MasteryUpdate]:
        updates: dict[tuple[uuid.UUID, uuid.UUID, ReviewSide], MasteryUpdate] = {}

        for field_def_id, rating in group.ratings:
            updates[(group.card_id, field_def_id, ReviewSide.answer)] = MasteryUpdate(
                side=ReviewSide.answer, target_score=self.rating_scores[rating], breadth=1
            )

        if group.shown_prompt_ids:
            breadth = len(group.ratings)
            target = self._aggregate_target(rating for _, rating in group.ratings)
            for prompt_id in group.shown_prompt_ids:
                updates[(group.card_id, prompt_id, ReviewSide.prompt)] = MasteryUpdate(
                    side=ReviewSide.prompt, target_score=target, breadth=breadth
                )

        return updates

    def _aggregate_target(self, ratings: Iterable[int]) -> float:
        """One appearance's answer-side ratings collapsed to a single prompt-side
        target: 1 (the harshest score) if any answer failed, else the mean of the
        normalized scores. Reuses the same harsher rule the deferred FSRS grade
        derivation uses, for consistency — pick one, reuse it everywhere."""
        scored = [self.rating_scores[r] for r in ratings]
        if any(r == 1 for r in ratings):
            return self.rating_scores[1]
        return sum(scored) / len(scored)

    def apply_review(
        self, current: FieldMasteryState | None, update: MasteryUpdate
    ) -> FieldMasteryState:
        base = current if current is not None else self.prior()
        alpha_eff = 1 - (1 - self.alpha) ** (update.breadth**self.beta)

        if update.side is ReviewSide.answer:
            blended = base.answer_mastery + alpha_eff * (
                update.target_score - base.answer_mastery
            )
            return replace(
                base, answer_mastery=blended, answer_review_count=base.answer_review_count + 1
            )

        blended = base.prompt_mastery + alpha_eff * (update.target_score - base.prompt_mastery)
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
