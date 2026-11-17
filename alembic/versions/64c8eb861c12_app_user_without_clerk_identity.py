"""app_user_without_clerk_identity

Revision ID: 64c8eb861c12
Revises: 2691a674095a
Create Date: 2026-11-16 20:25:11.348876

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '64c8eb861c12'
down_revision: Union[str, Sequence[str], None] = '2691a674095a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column("app_user", "clerk_user_id", existing_type=sa.VARCHAR(), nullable=True)
    op.create_index(
        "uq_app_user_example",
        "app_user",
        [sa.literal_column("(clerk_user_id IS NULL)")],
        unique=True,
        postgresql_where=sa.text("clerk_user_id IS NULL"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("uq_app_user_example", table_name="app_user")
    op.alter_column("app_user", "clerk_user_id", existing_type=sa.VARCHAR(), nullable=False)
