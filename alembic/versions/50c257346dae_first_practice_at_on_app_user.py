"""first_practice_at_on_app_user

Revision ID: 50c257346dae
Revises: 049886e86ae2
Create Date: 2026-11-06 17:19:55.577326

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '50c257346dae'
down_revision: Union[str, Sequence[str], None] = '049886e86ae2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "app_user",
        sa.Column("first_practice_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        """
        UPDATE app_user
        SET first_practice_at = COALESCE(
            (SELECT min(practice_run.created_at) FROM practice_run
             WHERE practice_run.user_id = app_user.id),
            (SELECT min(review_log.reviewed_at) FROM review_log
             WHERE review_log.user_id = app_user.id)
        )
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("app_user", "first_practice_at")
