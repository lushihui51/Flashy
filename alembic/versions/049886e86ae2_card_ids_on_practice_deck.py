"""card_ids_on_practice_deck

Revision ID: 049886e86ae2
Revises: ec9df5054ea7
Create Date: 2026-11-06 16:20:33.932662

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '049886e86ae2'
down_revision: Union[str, Sequence[str], None] = 'ec9df5054ea7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("practice_deck", sa.Column("card_ids", sa.ARRAY(sa.Uuid()), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("practice_deck", "card_ids")
