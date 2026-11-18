"""first_run_at_on_app_user

Revision ID: e91cd2d84924
Revises: 64c8eb861c12
Create Date: 2026-11-16 21:32:02.614231

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


import sqlmodel

# revision identifiers, used by Alembic.
revision: str = 'e91cd2d84924'
down_revision: Union[str, Sequence[str], None] = '64c8eb861c12'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column("app_user", "first_practice_at", new_column_name="first_run_at")
    op.execute(
        """
        UPDATE app_user
        SET first_run_at = (
            SELECT min(run.created_at) FROM run
            JOIN practice ON practice.id = run.practice_id
            WHERE practice.user_id = app_user.id
        )
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column("app_user", "first_run_at", new_column_name="first_practice_at")
