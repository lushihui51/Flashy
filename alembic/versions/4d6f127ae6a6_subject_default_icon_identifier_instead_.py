"""subject default icon: identifier instead of emoji

Revision ID: 4d6f127ae6a6
Revises: 222b03167a84
Create Date: 2026-08-21 22:26:22.353033

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '4d6f127ae6a6'
down_revision: Union[str, Sequence[str], None] = '222b03167a84'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """subject.icon is now an identifier into a curated frontend icon set, not emoji
    (see docs/plans/003-frontend-rebuild-creation-flows.md, Phase 2.5's icon-rendering
    decision, superseded). Updates the server default and backfills rows that are
    still on the old emoji default — values that were deliberately set to something
    else (e.g. 'brain', 'atom') are untouched."""
    op.alter_column("subject", "icon", server_default="book-open")
    op.execute("UPDATE subject SET icon = 'book-open' WHERE icon = '📚'")


def downgrade() -> None:
    """Reverts the server default. Does not un-backfill rows — a 'book-open' value is
    indistinguishable from one a user typed on purpose after this migration ran, same
    reasoning as the card_field_value backfill migration's downgrade."""
    op.alter_column("subject", "icon", server_default="📚")
