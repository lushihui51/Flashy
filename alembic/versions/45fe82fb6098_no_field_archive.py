"""no field archive

Revision ID: 45fe82fb6098
Revises: 9de2fd4c3f06
Create Date: 2026-11-04 14:20:56.356419

A field is either in its deck or gone: field_def loses archived_at, and the unique
index on a field's name within its deck stops being conditioned on it.

The upgrade refuses to run while any field_def row has archived_at set, so that no
history is dropped unread; such rows are the engineer's decision, made by hand before
this migration runs again.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '45fe82fb6098'
down_revision: Union[str, Sequence[str], None] = '9de2fd4c3f06'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    archived_count = op.get_bind().execute(
        sa.text("SELECT count(*) FROM field_def WHERE archived_at IS NOT NULL")
    ).scalar_one()
    if archived_count:
        raise RuntimeError(
            f"{archived_count} field_def row(s) have archived_at set; decide what "
            "becomes of them by hand before dropping the column"
        )
    op.drop_index(
        'uq_field_def_deck_id_name_active',
        table_name='field_def',
        postgresql_where=sa.text('archived_at IS NULL'),
    )
    op.create_index('uq_field_def_deck_id_name', 'field_def', ['deck_id', 'name'], unique=True)
    op.drop_column('field_def', 'archived_at')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        'field_def', sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.drop_index('uq_field_def_deck_id_name', table_name='field_def')
    op.create_index(
        'uq_field_def_deck_id_name_active',
        'field_def',
        ['deck_id', 'name'],
        unique=True,
        postgresql_where=sa.text('archived_at IS NULL'),
    )
