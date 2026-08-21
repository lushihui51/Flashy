import uuid
from collections.abc import Sequence
from typing import Protocol

from app.mastery.types import (
    CardScore,
    FieldMasteryState,
    MasteryUpdate,
    ReviewGroup,
    ReviewSide,
)


class MasteryStrategy(Protocol):
    @property
    def name(self) -> str:
        """Persisted nowhere yet; used for logging and test parametrization."""
        ...

    def prior(self) -> FieldMasteryState:
        """State assumed for a (card, field) with no row. Lazy creation, invariant 4."""
        ...

    def expand(
        self, group: ReviewGroup
    ) -> dict[tuple[uuid.UUID, uuid.UUID, ReviewSide], MasteryUpdate]:
        """The single place that decides targets and breadths for one appearance:
        one MasteryUpdate per rated answer field (breadth 1) and one per shown prompt
        field (breadth = how many answers it was shown alongside, same target for all
        of them since it's evidence about the same appearance). Keyed by
        (card_id, field_def_id, side)."""
        ...

    def apply_review(
        self, current: FieldMasteryState | None, update: MasteryUpdate
    ) -> FieldMasteryState:
        """Pure function: (state-or-None, one decided update) -> new state. Blends
        toward update.target_score with a weight derived from update.breadth; the
        updated side's review_count always increments by exactly 1 — breadth affects
        the weight, never the count."""
        ...

    def field_score(self, state: FieldMasteryState | None) -> float | None:
        """Collapse one field's state to a scalar. None in, None out — a field with no
        mastery row has no score of its own; card_score decides how to fold that in."""
        ...

    def card_score(self, field_scores: Sequence[float | None]) -> CardScore:
        """Aggregate one card's per-field scores (None entries are fields with no
        mastery row) into (mastery, reviewed_field_count)."""
        ...
