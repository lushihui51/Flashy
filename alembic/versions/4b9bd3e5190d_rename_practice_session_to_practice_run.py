"""rename practice_session to practice_run

Revision ID: 4b9bd3e5190d
Revises: be04155785d4
Create Date: 2026-09-10 13:09:22.144692

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '4b9bd3e5190d'
down_revision: Union[str, Sequence[str], None] = 'be04155785d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ADR 038 / MD-1: practice_session becomes practice_run — table, both FK
    # columns, the position unique constraint, and its covering index. A pure
    # rename, no data or structural change: Postgres tracks foreign keys and check
    # constraints by OID, not by name, so they follow the table automatically.
    op.rename_table("practice_session", "practice_run")
    op.alter_column("practice_card", "practice_session_id", new_column_name="practice_run_id")
    op.alter_column("practice_deck", "practice_session_id", new_column_name="practice_run_id")
    op.execute(
        "ALTER TABLE practice_card RENAME CONSTRAINT uq_practice_card_practice_session_id "
        "TO uq_practice_card_practice_run_id"
    )
    op.execute(
        "ALTER INDEX ix_practice_card_session_status_position "
        "RENAME TO ix_practice_card_run_status_position"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        "ALTER INDEX ix_practice_card_run_status_position "
        "RENAME TO ix_practice_card_session_status_position"
    )
    op.execute(
        "ALTER TABLE practice_card RENAME CONSTRAINT uq_practice_card_practice_run_id "
        "TO uq_practice_card_practice_session_id"
    )
    op.alter_column("practice_deck", "practice_run_id", new_column_name="practice_session_id")
    op.alter_column("practice_card", "practice_run_id", new_column_name="practice_session_id")
    op.rename_table("practice_run", "practice_session")
