import uuid
from typing import Protocol

from app.mastery.types import (
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

    @property
    def reach(self) -> float:
        """The furthest one rating can move one side's readiness, from this strategy's
        own constants."""
        ...

    def prior(self) -> FieldMasteryState:
        """State assumed for a (card, field) with no row, which means never reviewed."""
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

    def readiness(self, state: FieldMasteryState | None) -> float:
        """One field's readiness, 0 to 1: how likely the user is to recall it now. None,
        a field never reviewed, is 0."""
        ...
