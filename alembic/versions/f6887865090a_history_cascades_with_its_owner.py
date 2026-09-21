"""history cascades with its owner

Revision ID: f6887865090a
Revises: 9aaac4c2ea4e
Create Date: 2026-09-21 14:22:03.016830

ADR 047, ADR 048 (task 013 T4): review_log and practice_deck stop outliving the
persistent/owning row they're about — review_log.card_id/field_def_id and
practice_deck.deck_id become NOT NULL ON DELETE CASCADE, review_log.practice_card_id
is dropped (review_group_id was already the durable appearance identifier), and a run
left owning no practice_deck at all no longer has a reason to exist.

Upgrade, in order:
1. Drop every review_log row already orphaned under the old SET NULL regime — ADR
   048 cascades going forward, it doesn't reach back to redeem history that predates
   it, and there is nothing to cascade *from* once the row it was about is already
   gone.
2. Drop every practice_deck row whose deck is already gone, same reasoning.
3. Drop every practice_run left with zero practice_deck rows (already true before
   this migration, or made true by steps 1-2 just now) — ADR 048's "a run with no
   decks is deleted" rule, applied once to history instead of going forward through
   apply_deletion.
4. Drop the now-pointless review_log.practice_card_id.
5. review_log.card_id/field_def_id: SET NOT NULL, then drop and recreate each FK
   with ON DELETE CASCADE.
6. practice_deck.deck_id: SET NOT NULL, then drop and recreate the FK with ON DELETE
   CASCADE.

Downgrade reverses 4-6 (nullable again, ON DELETE SET NULL again, practice_card_id
re-added nullable). Rows removed by steps 1-3 are not restored — there is nothing to
restore them from; they were already unreachable history before this migration ran.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


import sqlmodel

# revision identifiers, used by Alembic.
revision: str = 'f6887865090a'
down_revision: Union[str, Sequence[str], None] = '9aaac4c2ea4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()

    # Step 1.
    bind.execute(sa.text("DELETE FROM review_log WHERE card_id IS NULL OR field_def_id IS NULL"))
    # Step 2.
    bind.execute(sa.text("DELETE FROM practice_deck WHERE deck_id IS NULL"))
    # Step 3.
    bind.execute(
        sa.text(
            """
            DELETE FROM practice_run
            WHERE NOT EXISTS (
                SELECT 1 FROM practice_deck
                WHERE practice_deck.practice_run_id = practice_run.id
            )
            """
        )
    )

    # Step 4.
    op.drop_constraint(
        op.f('fk_review_log_practice_card_id_practice_card'), 'review_log', type_='foreignkey'
    )
    op.drop_column('review_log', 'practice_card_id')

    # Step 5.
    op.alter_column('review_log', 'card_id', existing_type=sa.Uuid(), nullable=False)
    op.alter_column('review_log', 'field_def_id', existing_type=sa.Uuid(), nullable=False)
    op.drop_constraint(op.f('fk_review_log_card_id_card'), 'review_log', type_='foreignkey')
    op.drop_constraint(
        op.f('fk_review_log_field_def_id_field_def'), 'review_log', type_='foreignkey'
    )
    op.create_foreign_key(
        op.f('fk_review_log_card_id_card'), 'review_log', 'card', ['card_id'], ['id'],
        ondelete='CASCADE',
    )
    op.create_foreign_key(
        op.f('fk_review_log_field_def_id_field_def'), 'review_log', 'field_def',
        ['field_def_id'], ['id'], ondelete='CASCADE',
    )

    # Step 6.
    op.alter_column('practice_deck', 'deck_id', existing_type=sa.Uuid(), nullable=False)
    op.drop_constraint(op.f('fk_practice_deck_deck_id_deck'), 'practice_deck', type_='foreignkey')
    op.create_foreign_key(
        op.f('fk_practice_deck_deck_id_deck'), 'practice_deck', 'deck', ['deck_id'], ['id'],
        ondelete='CASCADE',
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Reverses step 6.
    op.drop_constraint(op.f('fk_practice_deck_deck_id_deck'), 'practice_deck', type_='foreignkey')
    op.create_foreign_key(
        op.f('fk_practice_deck_deck_id_deck'), 'practice_deck', 'deck', ['deck_id'], ['id'],
        ondelete='SET NULL',
    )
    op.alter_column('practice_deck', 'deck_id', existing_type=sa.Uuid(), nullable=True)

    # Reverses step 5.
    op.drop_constraint(op.f('fk_review_log_card_id_card'), 'review_log', type_='foreignkey')
    op.drop_constraint(
        op.f('fk_review_log_field_def_id_field_def'), 'review_log', type_='foreignkey'
    )
    op.create_foreign_key(
        op.f('fk_review_log_card_id_card'), 'review_log', 'card', ['card_id'], ['id'],
        ondelete='SET NULL',
    )
    op.create_foreign_key(
        op.f('fk_review_log_field_def_id_field_def'), 'review_log', 'field_def',
        ['field_def_id'], ['id'], ondelete='SET NULL',
    )
    op.alter_column('review_log', 'field_def_id', existing_type=sa.Uuid(), nullable=True)
    op.alter_column('review_log', 'card_id', existing_type=sa.Uuid(), nullable=True)

    # Reverses step 4.
    op.add_column(
        'review_log', sa.Column('practice_card_id', sa.Uuid(), autoincrement=False, nullable=True)
    )
    op.create_foreign_key(
        op.f('fk_review_log_practice_card_id_practice_card'), 'review_log', 'practice_card',
        ['practice_card_id'], ['id'], ondelete='SET NULL',
    )

    # Steps 1-3 are not reversed — see the module docstring.
