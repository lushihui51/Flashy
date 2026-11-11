import uuid
from collections.abc import Collection

from sqlalchemy import insert
from sqlmodel import Session

from app.models.run_counted_card import RunCountedCard


def db_stage_create_run_counted_cards(
    db: Session, run_id: uuid.UUID, card_ids: Collection[uuid.UUID]
) -> None:
    """One row per card of `card_ids`, in one statement. No commit — the run is cut in
    one transaction."""
    if not card_ids:
        return
    db.execute(
        insert(RunCountedCard), [{"run_id": run_id, "card_id": card_id} for card_id in card_ids]
    )
