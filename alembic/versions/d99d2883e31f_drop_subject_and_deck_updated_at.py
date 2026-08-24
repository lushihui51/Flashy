"""drop subject and deck updated_at

Revision ID: d99d2883e31f
Revises: 053542e7d50b
Create Date: 2026-08-24 12:18:57.659300

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd99d2883e31f'
down_revision: Union[str, Sequence[str], None] = '053542e7d50b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """D13's `updated_at` (audit field) has zero consumers — nothing reads, displays,
    or sorts by it anywhere in the app. `last_activity_at` (the recency sort key) is
    unaffected and stays."""
    op.drop_column('deck', 'updated_at')
    op.drop_column('subject', 'updated_at')


def downgrade() -> None:
    """Re-adds the column with `server_default=now()`, which Postgres also applies to
    existing rows on this ADD COLUMN — there's no prior `updated_at` value worth
    restoring, so "now" is as good a backfill as any."""
    op.add_column('subject', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.add_column('deck', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
