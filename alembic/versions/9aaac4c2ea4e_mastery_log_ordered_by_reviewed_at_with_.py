"""mastery_log ordered by reviewed_at with uuid id

Revision ID: 9aaac4c2ea4e
Revises: 795ede6a41c4
Create Date: 2026-09-21 09:22:31.052511

ADR 050 (task 013 T1): the ledger's order becomes `reviewed_at`, not the identity
`id` — a deck-scoped rebuild (task 013 T2) deletes and re-inserts one deck's rows,
which would otherwise land them above every row other decks wrote later in time. `id`
becomes an app-supplied uuid that identifies a row and orders nothing.

Upgrade, in order:
1. A tie check on review_log: two appearances of one card rated in the same
   microsecond would leave mastery_log's order unrecoverable (their application
   order, not their timestamp, decided which state was latest, and that information
   lives only in the old mastery_log's identity ids, which this migration does not
   reconstruct). If any such pair exists, the migration raises and changes nothing.
2. A scrub of review_log.shown_prompt_ids down to live field_def ids only —
   establishes invariant 1 (task 013's Contracts) before the replay below, which
   would otherwise try to log a mastery_log row against a field that no longer
   exists.
3. Drop and recreate mastery_log under the new shape, then import and call
   app.services.mastery.rebuild_mastery against this migration's own connection —
   the same replay every live rating goes through, run globally via review_log (ADR
   011's source of truth) — exactly as 795ede6a41c4 first backfilled this table.
   Accepted coupling: this upgrade imports app code as of this revision, so it
   replays through whatever MasteryStrategy app.mastery.config.get_mastery_strategy()
   resolves to at the time this migration runs (795ede6a41c4's docstring makes the
   same assumption).

Downgrade recreates the old identity-ordered shape and repopulates it by numbering
mastery_log's own rows off the new order (reviewed_at, with review_group_id as a
deterministic tiebreak for rows of different pairs that share a timestamp) — plain
SQL, no MasteryStrategy, no app import. Step 2's scrub is not reversed: a
shown_prompt_ids array once pruned of dead field ids is not un-pruned.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '9aaac4c2ea4e'
down_revision: Union[str, Sequence[str], None] = '795ede6a41c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()

    # Step 1: tie check, before any other statement. A row here means two
    # appearances of the same card were rated within the same microsecond; nothing
    # below can recover which one actually happened last.
    tie_rows = bind.execute(
        sa.text(
            """
            SELECT card_id, reviewed_at, count(DISTINCT review_group_id) AS n
            FROM review_log
            GROUP BY card_id, reviewed_at
            HAVING count(DISTINCT review_group_id) > 1
            """
        )
    ).all()
    if tie_rows:
        details = "; ".join(
            f"card_id={row.card_id} reviewed_at={row.reviewed_at} groups={row.n}"
            for row in tie_rows
        )
        raise RuntimeError(
            "mastery_log order migration aborted: review_log has tied "
            f"(card_id, reviewed_at) pairs across distinct review_group_ids: {details}. "
            "This means two appearances of one card were rated in the same "
            "microsecond; recovering their true order requires reconstruction from "
            "the old mastery_log's identity ids, which this migration does not do. "
            "No statement has been executed."
        )

    # Step 2: scrub every shown_prompt_ids array down to live field_def ids, so the
    # replay in step 3 never tries to log a row against a field that's already gone.
    op.execute(
        """
        UPDATE review_log
        SET shown_prompt_ids = ARRAY(
            SELECT x FROM unnest(shown_prompt_ids) AS x
            WHERE EXISTS (SELECT 1 FROM field_def WHERE field_def.id = x)
        )
        WHERE EXISTS (
            SELECT 1 FROM unnest(shown_prompt_ids) AS x
            WHERE NOT EXISTS (SELECT 1 FROM field_def WHERE field_def.id = x)
        )
        """
    )

    # Step 3: drop the identity-ordered table and recreate it under the new shape.
    op.drop_table('mastery_log')

    op.create_table(
        'mastery_log',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('card_id', sa.Uuid(), nullable=False),
        sa.Column('field_def_id', sa.Uuid(), nullable=False),
        sa.Column('practice_run_id', sa.Uuid(), nullable=True),
        sa.Column('review_group_id', sa.Uuid(), nullable=False),
        sa.Column('prompt_mastery', sa.REAL(), nullable=False),
        sa.Column('answer_mastery', sa.REAL(), nullable=False),
        sa.Column('prompt_review_count', sa.Integer(), nullable=False),
        sa.Column('answer_review_count', sa.Integer(), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ['card_id'], ['card.id'],
            name=op.f('fk_mastery_log_card_id_card'), ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['field_def_id'], ['field_def.id'],
            name=op.f('fk_mastery_log_field_def_id_field_def'), ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['practice_run_id'], ['practice_run.id'],
            name=op.f('fk_mastery_log_practice_run_id_practice_run'), ondelete='SET NULL',
        ),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_mastery_log')),
        sa.UniqueConstraint(
            'card_id', 'field_def_id', 'reviewed_at',
            name='uq_mastery_log_card_field_reviewed',
        ),
    )
    op.create_index(
        'ix_mastery_log_run', 'mastery_log', ['practice_run_id', 'reviewed_at'], unique=False
    )

    # Data-only: replay review_log through the app's write path to repopulate
    # mastery_log under the new shape — see the module docstring.
    from sqlmodel import Session

    from app.mastery.config import get_mastery_strategy
    from app.services.mastery import rebuild_mastery

    session = Session(bind=bind)
    rebuild_mastery(session, get_mastery_strategy())


def downgrade() -> None:
    """Downgrade schema."""
    op.create_table(
        'mastery_log_old',
        sa.Column('id', sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column('card_id', sa.Uuid(), nullable=False),
        sa.Column('field_def_id', sa.Uuid(), nullable=False),
        sa.Column('practice_run_id', sa.Uuid(), nullable=True),
        sa.Column('prompt_mastery', sa.REAL(), nullable=False),
        sa.Column('answer_mastery', sa.REAL(), nullable=False),
        sa.Column('prompt_review_count', sa.Integer(), nullable=False),
        sa.Column('answer_review_count', sa.Integer(), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ['card_id'], ['card.id'],
            name='fk_mastery_log_old_card_id_card', ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['field_def_id'], ['field_def.id'],
            name='fk_mastery_log_old_field_def_id_field_def', ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['practice_run_id'], ['practice_run.id'],
            name='fk_mastery_log_old_practice_run_id_practice_run', ondelete='SET NULL',
        ),
        sa.PrimaryKeyConstraint('id', name='pk_mastery_log_old'),
    )

    # Data-only: reconstructs an identity order off the new ledger's own order
    # (reviewed_at, with review_group_id as a deterministic tiebreak across
    # different (card, field) pairs that happen to share a timestamp) — plain SQL,
    # no MasteryStrategy, no app import. The shown_prompt_ids scrub from the upgrade
    # is not reversed.
    op.execute(
        """
        INSERT INTO mastery_log_old
            (id, card_id, field_def_id, practice_run_id, prompt_mastery, answer_mastery,
             prompt_review_count, answer_review_count, reviewed_at)
        OVERRIDING SYSTEM VALUE
        SELECT row_number() OVER (ORDER BY reviewed_at, review_group_id),
            card_id, field_def_id, practice_run_id, prompt_mastery, answer_mastery,
            prompt_review_count, answer_review_count, reviewed_at
        FROM mastery_log
        """
    )

    op.drop_table('mastery_log')
    op.rename_table('mastery_log_old', 'mastery_log')
    op.create_index(
        'ix_mastery_log_card_field', 'mastery_log', ['card_id', 'field_def_id', 'id'],
        unique=False,
    )
    op.create_index(
        'ix_mastery_log_run', 'mastery_log', ['practice_run_id', 'id'], unique=False
    )
