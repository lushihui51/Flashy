"""decks_owned_by_their_user

Revision ID: ef3634bbfc33
Revises: 50c257346dae
Create Date: 2026-11-11 00:07:39.959027

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


import sqlmodel

# revision identifiers, used by Alembic.
revision: str = 'ef3634bbfc33'
down_revision: Union[str, Sequence[str], None] = '50c257346dae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("deck", sa.Column("user_id", sa.Uuid(), nullable=True))
    op.execute(
        """
        UPDATE deck
        SET user_id = subject.user_id
        FROM subject
        WHERE subject.id = deck.subject_id
        """
    )
    op.alter_column("deck", "user_id", nullable=False)
    op.create_foreign_key(
        "fk_deck_user_id_app_user", "deck", "app_user", ["user_id"], ["id"], ondelete="CASCADE"
    )

    # A deck whose name another deck of its user also has takes its subject's name in
    # parentheses, so the unique constraint below can hold. A clash the rename leaves
    # fails that constraint and rolls the whole migration back (ADR 120).
    op.execute(
        """
        UPDATE deck
        SET name = deck.name || ' (' || subject.name || ')'
        FROM subject
        WHERE subject.id = deck.subject_id
          AND EXISTS (
              SELECT 1 FROM deck AS other
              WHERE other.user_id = deck.user_id
                AND other.name = deck.name
                AND other.id <> deck.id
          )
        """
    )
    op.create_unique_constraint("uq_deck_user_id", "deck", ["user_id", "name"])

    op.drop_constraint("uq_deck_subject_id", "deck", type_="unique")
    op.drop_constraint("fk_deck_subject_id_subject", "deck", type_="foreignkey")
    op.drop_column("deck", "subject_id")
    op.drop_table("subject")


def downgrade() -> None:
    """Downgrade schema."""
    raise NotImplementedError(
        "decks_owned_by_their_user drops every subject's name, description and icon; "
        "no downgrade restores them"
    )
