"""two session statuses and session-owned cascades

Revision ID: be04155785d4
Revises: 5507dcc945a5
Create Date: 2026-08-24 18:23:01.769236

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


import sqlmodel

# revision identifiers, used by Alembic.
revision: str = 'be04155785d4'
down_revision: Union[str, Sequence[str], None] = '5507dcc945a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ADR 015 as amended: `abandoned` is gone. Autogenerate does not diff CHECK constraints, so the
    # status narrowing is written by hand — and the surviving rows are folded into
    # `completed`, which is what `abandoned` always meant in practice (nothing left to
    # practice; nothing recorded *why*).
    op.execute("UPDATE practice_session SET status = 'completed' WHERE status = 'abandoned'")
    op.drop_constraint(op.f('ck_practice_session_status_valid'), 'practice_session', type_='check')
    op.create_check_constraint(
        'status_valid', 'practice_session', "status IN ('active', 'completed')"
    )

    op.drop_constraint(op.f('fk_practice_card_practice_session_id_practice_session'), 'practice_card', type_='foreignkey')
    op.create_foreign_key(op.f('fk_practice_card_practice_session_id_practice_session'), 'practice_card', 'practice_session', ['practice_session_id'], ['id'], ondelete='CASCADE')
    op.drop_constraint(op.f('fk_practice_deck_practice_session_id_practice_session'), 'practice_deck', type_='foreignkey')
    op.create_foreign_key(op.f('fk_practice_deck_practice_session_id_practice_session'), 'practice_deck', 'practice_session', ['practice_session_id'], ['id'], ondelete='CASCADE')
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # Widens the CHECK back; the folded-in rows stay `completed`, since nothing recorded
    # which of them had been `abandoned`.
    op.drop_constraint(op.f('ck_practice_session_status_valid'), 'practice_session', type_='check')
    op.create_check_constraint(
        'status_valid', 'practice_session', "status IN ('active', 'completed', 'abandoned')"
    )

    op.drop_constraint(op.f('fk_practice_deck_practice_session_id_practice_session'), 'practice_deck', type_='foreignkey')
    op.create_foreign_key(op.f('fk_practice_deck_practice_session_id_practice_session'), 'practice_deck', 'practice_session', ['practice_session_id'], ['id'])
    op.drop_constraint(op.f('fk_practice_card_practice_session_id_practice_session'), 'practice_card', type_='foreignkey')
    op.create_foreign_key(op.f('fk_practice_card_practice_session_id_practice_session'), 'practice_card', 'practice_session', ['practice_session_id'], ['id'])
    # ### end Alembic commands ###
