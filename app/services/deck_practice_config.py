import uuid

from sqlmodel import Session, col, select

from app.models.field_def import FieldDef


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

    if not prompt_field_ids and not prompt_pool_ids:
        raise ValueError("at least one prompt field or prompt pool id is required")
    if not answer_field_ids and not answer_pool_ids:
        raise ValueError("at least one answer field or answer pool id is required")
