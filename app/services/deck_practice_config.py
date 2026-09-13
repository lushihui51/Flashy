import uuid

from sqlmodel import Session, col, select, update

from app.database_ops.deck_practice_config import db_update_deck_practice_config
from app.models.deck_practice_config import DeckPracticeConfig
from app.models.field_def import FieldDef
from app.models.practice_deck import PracticeDeck

_ARRAY_FIELDS = (
    "prompt_field_ids",
    "answer_field_ids",
    "prompt_pool_ids",
    "prompt_pool_counts",
    "answer_pool_ids",
    "answer_pool_counts",
)


def validate_deck_practice_config(
    db: Session,
    deck_id: uuid.UUID,
    prompt_field_ids: list[uuid.UUID],
    answer_field_ids: list[uuid.UUID],
    prompt_pool_ids: list[uuid.UUID],
    prompt_pool_counts: list[int],
    answer_pool_ids: list[uuid.UUID],
    answer_pool_counts: list[int],
) -> None:
    """Raises ValueError (message describes the first rule violated) unless the config
    is valid. Run on both template save and session start (Phase 4.2) — a config can go
    stale between the two if a field gets archived after the config was saved, so both
    call sites need this, not just creation."""
    groups = [
        ("prompt fields", set(prompt_field_ids)),
        ("answer fields", set(answer_field_ids)),
        ("prompt pool", set(prompt_pool_ids)),
        ("answer pool", set(answer_pool_ids)),
    ]
    for i, (name_a, set_a) in enumerate(groups):
        for name_b, set_b in groups[i + 1 :]:
            overlap = set_a & set_b
            if overlap:
                raise ValueError(
                    f"{name_a} and {name_b} overlap ({sorted(overlap)}) — the four "
                    "field arrays must be pairwise disjoint"
                )

    all_ids = set().union(*(s for _, s in groups))
    if all_ids:
        live_ids = set(
            db.exec(
                select(FieldDef.id).where(
                    FieldDef.deck_id == deck_id,
                    col(FieldDef.id).in_(all_ids),
                    col(FieldDef.archived_at).is_(None),
                )
            ).all()
        )
        unknown = all_ids - live_ids
        if unknown:
            raise ValueError(
                f"field ids not live on this deck: {sorted(unknown)}"
            )

    for count in prompt_pool_counts:
        if not (1 <= count <= len(prompt_pool_ids)):
            raise ValueError(
                f"prompt_pool_counts value {count} out of range 1..{len(prompt_pool_ids)}"
            )
    for count in answer_pool_counts:
        if not (1 <= count <= len(answer_pool_ids)):
            raise ValueError(
                f"answer_pool_counts value {count} out of range 1..{len(answer_pool_ids)}"
            )

    # A pool with no counts draws zero fields per card (generation picks one count from
    # this array, or 0 when it's empty — app/services/practice_generation.py), so a pool
    # left uncounted is silently inert. If it's the only prompt source, every card
    # resolves to zero prompts, every card is skipped, and session start produces a
    # session with no practice_cards at all — the one state that must never exist.
    if prompt_pool_ids and not prompt_pool_counts:
        raise ValueError("prompt_pool_ids requires at least one prompt_pool_counts value")
    if answer_pool_ids and not answer_pool_counts:
        raise ValueError("answer_pool_ids requires at least one answer_pool_counts value")

    if not prompt_field_ids and not prompt_pool_ids:
        raise ValueError("at least one prompt field or prompt pool id is required")
    if not answer_field_ids and not answer_pool_ids:
        raise ValueError("at least one answer field or answer pool id is required")


def update_deck_practice_config(
    db: Session, config: DeckPracticeConfig, data: dict
) -> DeckPracticeConfig:
    """Applies an already-validated PATCH, severing config lineage first if the update
    is material (ADR 040): any of the six prompt/answer field or pool arrays actually
    present in `data` differs — compared as ordered lists, since a reordering is a
    different config even with the same members — from what's currently stored. A
    rename-only update (no array field in `data`) is therefore never material. The
    comparison runs against the stored row before `db_update_deck_practice_config`
    mutates it; the unlink UPDATE and the config update commit together in that call's
    own transaction, so a failure there (or a validation failure upstream, which never
    reaches this function at all) leaves every snapshot's source_config_id untouched."""
    material = any(
        field in data and data[field] != getattr(config, field) for field in _ARRAY_FIELDS
    )
    if material:
        db.exec(
            update(PracticeDeck)
            .where(col(PracticeDeck.source_config_id) == config.id)
            .values(source_config_id=None)
        )
    return db_update_deck_practice_config(db, config, data)
