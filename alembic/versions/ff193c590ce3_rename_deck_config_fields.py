"""rename deck config fields

Revision ID: ff193c590ce3
Revises: bbb47b758364
Create Date: 2026-08-06 20:28:51.919648

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "ff193c590ce3"
down_revision: str | Sequence[str] | None = "bbb47b758364"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TABLE deck_config RENAME COLUMN static_reveals TO prompt_fields")
    op.execute("ALTER TABLE deck_config RENAME COLUMN static_conceals TO answer_fields")
    op.execute("ALTER TABLE deck_config RENAME COLUMN dynamic_reveals TO prompt_pool")
    op.execute(
        "ALTER TABLE deck_config RENAME COLUMN dynamic_reveal_quantities TO prompt_pool_counts"
    )
    op.execute("ALTER TABLE deck_config RENAME COLUMN dynamic_conceals TO answer_pool")
    op.execute(
        "ALTER TABLE deck_config RENAME COLUMN dynamic_conceal_quantities TO answer_pool_counts"
    )

    op.execute(
        "ALTER TABLE deck_config DROP CONSTRAINT IF EXISTS ck_deck_config_dynamic_reveals_len"
    )
    op.execute(
        "ALTER TABLE deck_config ADD CONSTRAINT ck_deck_config_prompt_pool_len CHECK (cardinality(prompt_pool) = cardinality(prompt_pool_counts))"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        "ALTER TABLE deck_config DROP CONSTRAINT IF EXISTS ck_deck_config_prompt_pool_len"
    )
    op.execute(
        "ALTER TABLE deck_config ADD CONSTRAINT ck_deck_config_dynamic_reveals_len CHECK (cardinality(dynamic_reveals) = cardinality(dynamic_reveal_quantities))"
    )

    op.execute("ALTER TABLE deck_config RENAME COLUMN prompt_fields TO static_reveals")
    op.execute("ALTER TABLE deck_config RENAME COLUMN answer_fields TO static_conceals")
    op.execute("ALTER TABLE deck_config RENAME COLUMN prompt_pool TO dynamic_reveals")
    op.execute(
        "ALTER TABLE deck_config RENAME COLUMN prompt_pool_counts TO dynamic_reveal_quantities"
    )
    op.execute("ALTER TABLE deck_config RENAME COLUMN answer_pool TO dynamic_conceals")
    op.execute(
        "ALTER TABLE deck_config RENAME COLUMN answer_pool_counts TO dynamic_conceal_quantities"
    )
