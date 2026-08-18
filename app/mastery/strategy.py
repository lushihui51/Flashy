from collections.abc import Sequence
from typing import Protocol

from app.mastery.types import CardScore, FieldMasteryState, ReviewEvent


class MasteryStrategy(Protocol):
    name: str  # persisted nowhere yet; used for logging and test parametrization

    def prior(self) -> FieldMasteryState:
        """State assumed for a (card, field) with no row. Lazy creation, invariant 4."""
        ...

    def apply_review(
        self, current: FieldMasteryState | None, event: ReviewEvent
    ) -> FieldMasteryState:
        """Pure function: (state-or-None, one review side) -> new state. `event.side`
        says whether this blends into prompt_mastery or answer_mastery; the other side
        of the returned state is carried over from `current` (or the prior) unchanged."""
        ...

    def field_score(self, state: FieldMasteryState | None) -> float | None:
        """Collapse one field's state to a scalar. None in, None out — a field with no
        mastery row has no score of its own; card_score decides how to fold that in."""
        ...

    def card_score(self, field_scores: Sequence[float | None]) -> CardScore:
        """Aggregate one card's per-field scores (None entries are fields with no
        mastery row) into (mastery, reviewed_field_count)."""
        ...
