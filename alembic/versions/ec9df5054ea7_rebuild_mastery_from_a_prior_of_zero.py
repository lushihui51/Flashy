"""rebuild mastery from a prior of zero

Revision ID: ec9df5054ea7
Revises: 004a6932a7f5
Create Date: 2026-11-05 11:17:01.744713

The strategy's prior moved from 50 to 0, so every stored mastery value was blended from a
starting point that no longer holds. Upgrade replays every value from the review log
through the live write path. No schema changes.
Accepted coupling: this upgrade imports app code as of this revision, so it replays
through whatever MasteryStrategy app.mastery.config.get_mastery_strategy() resolves to at
the time this migration runs (9aaac4c2ea4e's docstring makes the same assumption).
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'ec9df5054ea7'
down_revision: Union[str, Sequence[str], None] = '004a6932a7f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    from sqlmodel import Session

    from app.mastery.config import get_mastery_strategy
    from app.services.mastery import rebuild_mastery

    session = Session(bind=op.get_bind())
    rebuild_mastery(session, get_mastery_strategy())


def downgrade() -> None:
    """Changes nothing: the old values return only by a rebuild under the old constant."""
