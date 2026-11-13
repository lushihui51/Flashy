from collections.abc import Sequence
from enum import Enum


class ChangeKind(str, Enum):
    up_a_lot = "up_a_lot"
    up = "up"
    no_change = "no_change"
    down = "down"
    down_a_lot = "down_a_lot"


# Each kind's lower bound as a fraction of the strategy's reach, highest first: the bands follow
# the strategy when its constants change, which an amount of readiness would not (ADR 102).
_CHANGE_BANDS = (
    (0.6, ChangeKind.up_a_lot),
    (0.1, ChangeKind.up),
    (-0.1, ChangeKind.no_change),
    (-0.6, ChangeKind.down),
)


def classify_change(delta: float, reach: float) -> ChangeKind:
    """The kind of a change in readiness, `delta` being its value after minus its value
    before, against the strategy's `reach`: up a lot from 0.6 of the reach, up from 0.1,
    no change from −0.1, down from −0.6, and down a lot below that."""
    for fraction, kind in _CHANGE_BANDS:
        if delta >= fraction * reach:
            return kind
    return ChangeKind.down_a_lot


def fold_card_readiness(field_readiness: Sequence[float]) -> float:
    """A card's readiness: the average over every field of its deck, each already a
    strategy's readiness, so a field never reviewed arrives as 0."""
    # A card can reach here with no field at all when a run's copy names only fields
    # since deleted; nothing has been practiced there, so it is not ready.
    if not field_readiness:
        return 0.0
    return sum(field_readiness) / len(field_readiness)


def fold_collection_readiness(card_readiness: Sequence[float]) -> float | None:
    """A deck's readiness: the average over its cards, each card once;
    None with no card."""
    if not card_readiness:
        return None
    return sum(card_readiness) / len(card_readiness)
