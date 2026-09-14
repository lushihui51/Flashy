"""mastery_log replaces card_field_mastery

Revision ID: 795ede6a41c4
Revises: 4c84ec429933
Create Date: 2026-09-14 15:29:07.960929

ADR 042: replaces the disposable card_field_mastery cache with an append-only ledger.
Upgrade creates mastery_log, then backfills and retroactively attributes the whole
history by importing and calling app.services.mastery.rebuild_mastery (task 010 T1)
against this migration's own connection — the same replay every live rating goes
through, run globally (every user) via review_log, the true source of truth (ADR 011)
— before dropping card_field_mastery. Accepted coupling: this upgrade imports app code
as of this revision, so it will replay through whatever MasteryStrategy
app.mastery.config.get_mastery_strategy() resolves to at the time this migration runs,
not necessarily the strategy in force when review_log's rows were first written (the
same replay-determinism assumption rebuild_mastery always makes).

Downgrade recreates card_field_mastery and repopulates it from mastery_log's own
latest-row-per-pair with a plain DISTINCT ON — no strategy math, no app import — since
that direction only needs to reconstruct a disposable cache's shape, not replay
history.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '795ede6a41c4'
down_revision: Union[str, Sequence[str], None] = '4c84ec429933'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('mastery_log',
    sa.Column('id', sa.BigInteger(), sa.Identity(always=False), nullable=False),
    sa.Column('card_id', sa.Uuid(), nullable=False),
    sa.Column('field_def_id', sa.Uuid(), nullable=False),
    sa.Column('practice_run_id', sa.Uuid(), nullable=True),
    sa.Column('prompt_mastery', sa.REAL(), nullable=False),
    sa.Column('answer_mastery', sa.REAL(), nullable=False),
    sa.Column('prompt_review_count', sa.Integer(), nullable=False),
    sa.Column('answer_review_count', sa.Integer(), nullable=False),
    sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['card_id'], ['card.id'], name=op.f('fk_mastery_log_card_id_card'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['field_def_id'], ['field_def.id'], name=op.f('fk_mastery_log_field_def_id_field_def'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['practice_run_id'], ['practice_run.id'], name=op.f('fk_mastery_log_practice_run_id_practice_run'), ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_mastery_log'))
    )
    op.create_index('ix_mastery_log_card_field', 'mastery_log', ['card_id', 'field_def_id', 'id'], unique=False)
    op.create_index('ix_mastery_log_run', 'mastery_log', ['practice_run_id', 'id'], unique=False)

    # Data-only: replay review_log (ADR 011's source of truth) through the app's write
    # path to backfill mastery_log for every pre-existing appearance, with attribution
    # reconstructed the same way rebuild_mastery always does it (task 010 T1). Imports
    # app code as of this revision — see the module docstring.
    from sqlmodel import Session

    from app.mastery.config import get_mastery_strategy
    from app.services.mastery import rebuild_mastery

    bind = op.get_bind()
    session = Session(bind=bind)
    rebuild_mastery(session, get_mastery_strategy())

    op.drop_table('card_field_mastery')


def downgrade() -> None:
    """Downgrade schema."""
    op.create_table('card_field_mastery',
    sa.Column('card_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('field_def_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('prompt_mastery', sa.REAL(), autoincrement=False, nullable=False),
    sa.Column('answer_mastery', sa.REAL(), autoincrement=False, nullable=False),
    sa.Column('prompt_review_count', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('answer_review_count', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['card_id'], ['card.id'], name=op.f('fk_card_field_mastery_card_id_card'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['field_def_id'], ['field_def.id'], name=op.f('fk_card_field_mastery_field_def_id_field_def'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('card_id', 'field_def_id', name=op.f('pk_card_field_mastery'))
    )

    # Data-only: current state = latest row per (card, field), taken straight off
    # mastery_log with a DISTINCT ON — no MasteryStrategy, no app import. updated_at
    # takes reviewed_at, the value the old write path always supplied for it anyway
    # (its server_default of now() never actually fired on the live write path).
    op.execute(
        """
        INSERT INTO card_field_mastery
            (card_id, field_def_id, prompt_mastery, answer_mastery,
             prompt_review_count, answer_review_count, updated_at)
        SELECT DISTINCT ON (card_id, field_def_id)
            card_id, field_def_id, prompt_mastery, answer_mastery,
            prompt_review_count, answer_review_count, reviewed_at
        FROM mastery_log
        ORDER BY card_id, field_def_id, id DESC
        """
    )

    op.drop_index('ix_mastery_log_run', table_name='mastery_log')
    op.drop_index('ix_mastery_log_card_field', table_name='mastery_log')
    op.drop_table('mastery_log')
