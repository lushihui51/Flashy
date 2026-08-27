"""practice_session name

Revision ID: 5507dcc945a5
Revises: 8b87efa6aa86
Create Date: 2026-08-24 14:17:25.470555

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '5507dcc945a5'
down_revision: Union[str, Sequence[str], None] = '8b87efa6aa86'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Added nullable, backfilled, then tightened — the column is NOT NULL with no
    # server default (every insert supplies it; the client formats the name), so a
    # straight NOT NULL add would fail against any pre-existing session. Rows written
    # before names existed get a placeholder rather than a date string: rendering a
    # date here would have to pick a timezone, and the server has no business doing
    # that (ADR 019).
    op.add_column('practice_session', sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.execute("UPDATE practice_session SET name = 'Untitled practice' WHERE name IS NULL")
    op.alter_column('practice_session', 'name', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('practice_session', 'name')
