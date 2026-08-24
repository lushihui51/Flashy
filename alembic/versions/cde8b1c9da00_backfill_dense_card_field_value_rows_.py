"""backfill dense card_field_value rows for active fields

Revision ID: cde8b1c9da00
Revises: b3d79da5084b
Create Date: 2026-08-21 17:11:16.453134

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


import sqlmodel

# revision identifiers, used by Alembic.
revision: str = 'cde8b1c9da00'
down_revision: Union[str, Sequence[str], None] = 'b3d79da5084b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Data-only: makes card_field_value dense over active fields retroactively
    (AGENTS.md). Inserts "" for every (card, active field_def) pair on the card's own
    deck that doesn't already have a row — pre-rewrite data, and any deck created
    before this invariant existed, can be sparse."""
    op.execute(
        """
        INSERT INTO card_field_value (card_id, field_def_id, value)
        SELECT c.id, fd.id, ''
        FROM card c
        JOIN field_def fd ON fd.deck_id = c.deck_id AND fd.archived_at IS NULL
        WHERE NOT EXISTS (
            SELECT 1 FROM card_field_value cfv
            WHERE cfv.card_id = c.id AND cfv.field_def_id = fd.id
        )
        """
    )


def downgrade() -> None:
    """No-op: a backfilled "" row is indistinguishable from a genuine "" a user typed
    (before or after this migration ran), so there's nothing safe to delete."""
    pass
