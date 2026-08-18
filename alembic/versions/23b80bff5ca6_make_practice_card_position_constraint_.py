"""make practice_card position constraint deferrable

Revision ID: 23b80bff5ca6
Revises: e52792c2937f
Create Date: 2026-08-18 19:23:46.476999

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '23b80bff5ca6'
down_revision: Union[str, Sequence[str], None] = 'e52792c2937f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Autogenerate doesn't detect deferrable-only changes on an existing constraint —
    # written by hand. Bulk renumbering a session's pending positions in one
    # transaction needs to pass through intermediate states that collide with
    # not-yet-updated rows; deferring the check to COMMIT is what field_def.position
    # already relies on for the same reason.
    op.drop_constraint(
        op.f("uq_practice_card_practice_session_id"), "practice_card", type_="unique"
    )
    op.create_unique_constraint(
        op.f("uq_practice_card_practice_session_id"),
        "practice_card",
        ["practice_session_id", "position"],
        deferrable=True,
        initially="DEFERRED",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        op.f("uq_practice_card_practice_session_id"), "practice_card", type_="unique"
    )
    op.create_unique_constraint(
        op.f("uq_practice_card_practice_session_id"),
        "practice_card",
        ["practice_session_id", "position"],
    )
