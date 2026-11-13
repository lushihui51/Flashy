import uuid
from collections.abc import Collection, Mapping

from sqlmodel import Session

from app.database_ops.field_def import db_read_field_ids_for_decks
from app.database_ops.practice_configuration import (
    db_read_practice_configuration,
    db_stage_update_practice_configuration,
)
from app.models.practice_payloads import PracticeConfigurationRead

ARRAY_COLUMNS = (
    "prompt_field_ids",
    "answer_field_ids",
    "prompt_pool_ids",
    "prompt_pool_counts",
    "answer_pool_ids",
    "answer_pool_counts",
)
_FIELD_ARRAYS = ("prompt_field_ids", "answer_field_ids", "prompt_pool_ids", "answer_pool_ids")
_COUNTS_OF_POOL = {"prompt_pool_ids": "prompt_pool_counts", "answer_pool_ids": "answer_pool_counts"}


def arrays_of(configuration) -> dict[str, list]:
    """The six array and count columns of a practice's configuration or a run's copy,
    keyed by column name."""
    return {column: list(getattr(configuration, column)) for column in ARRAY_COLUMNS}


def starting_configuration(live_field_ids: list[uuid.UUID]) -> dict[str, list]:
    """The six array and count columns, keyed by column name, for a deck whose live field ids are given in position order."""
    return {
        "prompt_field_ids": live_field_ids[:1],
        "answer_field_ids": live_field_ids[1:],
        "prompt_pool_ids": [],
        "prompt_pool_counts": [],
        "answer_pool_ids": [],
        "answer_pool_counts": [],
    }


def without_fields(
    arrays: Mapping[str, list], field_ids: Collection[uuid.UUID]
) -> dict[str, list]:
    """`arrays`, six columns keyed by column name, with every id of `field_ids` removed,
    each random-draw count lowered to its pool's size, and the counts of a pool left empty
    dropped. A side can be left naming no field."""
    gone = set(field_ids)
    pruned = {column: [fid for fid in arrays[column] if fid not in gone] for column in _FIELD_ARRAYS}
    for pool, counts in _COUNTS_OF_POOL.items():
        size = len(pruned[pool])
        pruned[counts] = [min(count, size) for count in arrays[counts]] if size else []
    return pruned


def has_empty_side(arrays: Mapping[str, list]) -> bool:
    """Whether the prompt side or the answer side of `arrays` names no field."""
    return not (arrays["prompt_field_ids"] or arrays["prompt_pool_ids"]) or not (
        arrays["answer_field_ids"] or arrays["answer_pool_ids"]
    )


def validate_configuration(db: Session, deck_id: uuid.UUID, arrays: Mapping[str, list]) -> None:
    """Raises ValueError naming the first rule `arrays`, six columns keyed by column
    name, breaks against the deck's live fields: a field in two arrays, an id that is no
    live field of the deck, a pool naming fields with no count or a count outside 1 to its
    pool's size, or a side naming no field."""
    groups = [(column, set(arrays[column])) for column in _FIELD_ARRAYS]
    for i, (name_a, set_a) in enumerate(groups):
        for name_b, set_b in groups[i + 1 :]:
            overlap = set_a & set_b
            if overlap:
                raise ValueError(
                    f"{name_a} and {name_b} overlap ({sorted(overlap)}) — the four "
                    "field arrays must be pairwise disjoint"
                )

    all_ids = set().union(*(ids for _, ids in groups))
    if all_ids:
        unknown = all_ids - db_read_field_ids_for_decks(db, [deck_id])
        if unknown:
            raise ValueError(f"field ids not live on this deck: {sorted(unknown)}")

    for pool, counts in _COUNTS_OF_POOL.items():
        size = len(arrays[pool])
        for count in arrays[counts]:
            if not (1 <= count <= size):
                raise ValueError(f"{counts} value {count} out of range 1..{size}")
        # A pool with no counts draws no field, so one that is a side's only source would
        # leave every card of the deck with nothing on that side.
        if size and not arrays[counts]:
            raise ValueError(f"{pool} requires at least one {counts} value")

    if not arrays["prompt_field_ids"] and not arrays["prompt_pool_ids"]:
        raise ValueError("at least one prompt field or prompt pool id is required")
    if not arrays["answer_field_ids"] and not arrays["answer_pool_ids"]:
        raise ValueError("at least one answer field or answer pool id is required")


def save_practice_configuration(
    db: Session,
    user_id: uuid.UUID,
    practice_id: uuid.UUID,
    deck_id: uuid.UUID,
    arrays: Mapping[str, list],
) -> PracticeConfigurationRead:
    """Replaces how the user's practice asks the deck with `arrays`, six columns keyed by
    column name, and commits. The practice's next run asks the deck so; a run already cut,
    active or completed, keeps its own copy. Touches nothing, so no list reorders. Raises
    LookupError when the practice is missing or not the user's, or the deck is not one of
    the practice's, and ValueError, writing nothing, as `validate_configuration` does."""
    configuration = db_read_practice_configuration(db, user_id, practice_id, deck_id)
    if configuration is None:
        raise LookupError(f"deck {deck_id} is not a deck of practice {practice_id}")
    validate_configuration(db, deck_id, arrays)
    db_stage_update_practice_configuration(
        db, configuration, {column: list(arrays[column]) for column in ARRAY_COLUMNS}
    )
    db.commit()
    db.refresh(configuration)
    return PracticeConfigurationRead.model_validate(configuration)
