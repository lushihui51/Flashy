from collections.abc import Sequence


def fold_card_readiness(field_readiness: Sequence[float]) -> float:
    """A card's readiness: the average over every field of its deck, each already a
    strategy's readiness, so a field never reviewed arrives as 0."""
    # A card can reach here with no field at all when a practice's snapshot names only
    # fields since deleted; nothing has been practiced there, so it is not ready.
    if not field_readiness:
        return 0.0
    return sum(field_readiness) / len(field_readiness)


def fold_collection_readiness(card_readiness: Sequence[float]) -> float | None:
    """A deck's or a subject's readiness: the average over its cards, each card once;
    None with no card."""
    if not card_readiness:
        return None
    return sum(card_readiness) / len(card_readiness)
