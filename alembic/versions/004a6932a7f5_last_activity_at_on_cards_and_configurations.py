"""last_activity_at on cards and configurations

Revision ID: 004a6932a7f5
Revises: 45fe82fb6098
Create Date: 2026-11-04 15:12:31.606289

card and deck_practice_config each gain last_activity_at, the recency sort key that
subject and deck already carry. An existing row's value is its created_at: creation
counts as activity, and the column's own default would otherwise stamp every
pre-existing row with the migration's run time, tying them all at "just now".
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '004a6932a7f5'
down_revision: Union[str, Sequence[str], None] = '45fe82fb6098'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLES = ("card", "deck_practice_config")


def upgrade() -> None:
    """Upgrade schema."""
    for table in _TABLES:
        op.add_column(
            table, sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=True)
        )
        op.execute(f"UPDATE {table} SET last_activity_at = created_at")
        op.alter_column(
            table,
            "last_activity_at",
            nullable=False,
            server_default=sa.text("now()"),
        )


def downgrade() -> None:
    """Downgrade schema."""
    for table in reversed(_TABLES):
        op.drop_column(table, "last_activity_at")
