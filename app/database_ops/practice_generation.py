import uuid

from sqlalchemy import Row, desc
from sqlmodel import Session, col, select

from app.models.card_field_value import CardFieldValue
from app.models.field_def import FieldDef
from app.models.mastery_log import MasteryLog


def db_fetch_generation_candidates(
    db: Session, card_id: uuid.UUID, field_ids: list[uuid.UUID]
) -> list[Row]:
    """Raw material for pool resolution: one row per id in field_ids that is still live
    (drops archived ids left in stale snapshots) and not blank on this card (drops
    fields this card left unset). LEFT JOIN mastery — a DISTINCT ON subquery of
    mastery_log's latest row per field, scoped to this one card — no ordering or
    scoring; the caller folds scores in Python via strategy.field_score."""
    if not field_ids:
        return []
    latest_mastery = (
        select(
            MasteryLog.field_def_id,
            MasteryLog.prompt_mastery,
            MasteryLog.answer_mastery,
            MasteryLog.prompt_review_count,
            MasteryLog.answer_review_count,
        )
        .where(MasteryLog.card_id == card_id, col(MasteryLog.field_def_id).in_(field_ids))
        .distinct(MasteryLog.field_def_id)
        .order_by(MasteryLog.field_def_id, desc(MasteryLog.reviewed_at))
        .subquery()
    )
    query = (
        select(
            FieldDef.id.label("field_def_id"),
            latest_mastery.c.prompt_mastery,
            latest_mastery.c.answer_mastery,
            latest_mastery.c.prompt_review_count,
            latest_mastery.c.answer_review_count,
        )
        .select_from(FieldDef)
        .join(
            CardFieldValue,
            (CardFieldValue.field_def_id == FieldDef.id)
            & (CardFieldValue.card_id == card_id)
            & (CardFieldValue.value != ""),
        )
        .outerjoin(latest_mastery, latest_mastery.c.field_def_id == FieldDef.id)
        .where(col(FieldDef.id).in_(field_ids), col(FieldDef.archived_at).is_(None))
    )
    return list(db.exec(query).all())
