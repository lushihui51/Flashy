"""subject description and icon not null with server defaults

Revision ID: b3d79da5084b
Revises: 23b80bff5ca6
Create Date: 2026-08-21 15:45:30.463302

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


import sqlmodel

# revision identifiers, used by Alembic.
revision: str = 'b3d79da5084b'
down_revision: Union[str, Sequence[str], None] = '23b80bff5ca6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


DEFAULT_SUBJECT_ICON = "📚"
DEFAULT_SUBJECT_DESCRIPTION = ""


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        sa.text("UPDATE subject SET icon = :icon WHERE icon IS NULL").bindparams(
            icon=DEFAULT_SUBJECT_ICON
        )
    )
    op.execute(
        sa.text(
            "UPDATE subject SET description = :description WHERE description IS NULL"
        ).bindparams(description=DEFAULT_SUBJECT_DESCRIPTION)
    )
    op.alter_column(
        'subject', 'icon',
        existing_type=sa.VARCHAR(),
        nullable=False,
        server_default=DEFAULT_SUBJECT_ICON,
    )
    op.alter_column(
        'subject', 'description',
        existing_type=sa.VARCHAR(),
        nullable=False,
        server_default=DEFAULT_SUBJECT_DESCRIPTION,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        'subject', 'description',
        existing_type=sa.VARCHAR(),
        nullable=True,
        server_default=None,
    )
    op.alter_column(
        'subject', 'icon',
        existing_type=sa.VARCHAR(),
        nullable=True,
        server_default=None,
    )
