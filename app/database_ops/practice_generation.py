import uuid

from sqlalchemy import Row
from sqlmodel import Session, col, select

from app.models.card_field_mastery import CardFieldMastery
from app.models.card_field_value import CardFieldValue
from app.models.field_def import FieldDef


def db_fetch_generation_candidates(
    db: Session, card_id: uuid.UUID, field_ids: list[uuid.UUID]
) -> list[Row]:
    """Raw material for pool resolution: one row per id in field_ids that is still live
    (drops archived ids left in stale snapshots) and not blank on this card (drops
    fields this card left unset). LEFT JOIN mastery, no ordering or scoring — the
    caller folds scores in Python via strategy.field_score."""
    if not field_ids:
        return []
    query = (
        select(
            FieldDef.id.label("field_def_id"),
            CardFieldMastery.prompt_mastery,
            CardFieldMastery.answer_mastery,
            CardFieldMastery.prompt_review_count,
            CardFieldMastery.answer_review_count,
        )
        .select_from(FieldDef)
        .join(
            CardFieldValue,
            (CardFieldValue.field_def_id == FieldDef.id) & (CardFieldValue.card_id == card_id),
        )
        .outerjoin(
            CardFieldMastery,
            (CardFieldMastery.card_id == card_id)
            & (CardFieldMastery.field_def_id == FieldDef.id),
        )
        .where(col(FieldDef.id).in_(field_ids), col(FieldDef.archived_at).is_(None))
    )
    return list(db.exec(query).all())
