"""Deleting an account: every row of its user in Flashy, and the user at Clerk."""

import uuid

from sqlmodel import Session

from app.clerk_users import ClerkUnavailable, delete_clerk_user
from app.database_ops.app_user import db_stage_delete_app_user
from app.database_ops.deck import db_read_deck_ids
from app.mastery.strategy import MasteryStrategy
from app.services.deletion import apply_deletion, compute_deletion_impact


def delete_account(
    db: Session, strategy: MasteryStrategy, user_id: uuid.UUID, clerk_user_id: str
) -> None:
    """Deletes every row of the user and the user at Clerk, committing only once Clerk
    confirms. Raises ClerkUnavailable, having rolled back, when Clerk does not."""
    impact = compute_deletion_impact(db, user_id, deck_ids=db_read_deck_ids(db, user_id))
    apply_deletion(db, strategy, impact)
    db_stage_delete_app_user(db, user_id)
    # A row that still references the user fails here, before Clerk deletes anyone.
    db.flush()
    try:
        delete_clerk_user(clerk_user_id)
    except ClerkUnavailable:
        db.rollback()
        raise
    db.commit()
