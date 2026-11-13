"""a_practice_above_its_runs

Revision ID: 2691a674095a
Revises: ef3634bbfc33
Create Date: 2026-11-11 15:03:18.339548

"""
import uuid
from collections import defaultdict
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '2691a674095a'
down_revision: Union[str, Sequence[str], None] = 'ef3634bbfc33'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_UUIDS = postgresql.ARRAY(sa.Uuid())
_INTS = postgresql.ARRAY(sa.Integer())
_FIELD_ARRAYS = ("prompt_field_ids", "answer_field_ids", "prompt_pool_ids", "answer_pool_ids")
_COUNT_OF_POOL = {"prompt_pool_ids": "prompt_pool_counts", "answer_pool_ids": "answer_pool_counts"}
_COLUMNS = (*_FIELD_ARRAYS, "prompt_pool_counts", "answer_pool_counts")


def _array_columns() -> list[sa.Column]:
    return [
        sa.Column(name, _INTS if name.endswith("counts") else _UUIDS, nullable=False)
        for name in _COLUMNS
    ]


def _pruned(row, live: set[uuid.UUID]) -> dict[str, list]:
    """The six arrays of `row` with every id not in `live` removed, each random-draw count
    lowered to its pool's size, and the counts of a pool left empty dropped."""
    arrays = {name: [fid for fid in getattr(row, name) if fid in live] for name in _FIELD_ARRAYS}
    for pool, counts in _COUNT_OF_POOL.items():
        size = len(arrays[pool])
        arrays[counts] = [min(count, size) for count in getattr(row, counts)] if size else []
    return arrays


def _side_is_empty(arrays: dict[str, list]) -> bool:
    return not (arrays["prompt_field_ids"] or arrays["prompt_pool_ids"]) or not (
        arrays["answer_field_ids"] or arrays["answer_pool_ids"]
    )


def _starting(fields_in_position_order: list[uuid.UUID]) -> dict[str, list]:
    """The deck's first live field always shown on the prompt side, every other always
    shown on the answer side."""
    return {
        "prompt_field_ids": fields_in_position_order[:1],
        "answer_field_ids": fields_in_position_order[1:],
        "prompt_pool_ids": [],
        "prompt_pool_counts": [],
        "answer_pool_ids": [],
        "answer_pool_counts": [],
    }


def _numbered(name: str, taken: set[str]) -> str:
    """`name`, or with the first number from 1 in parentheses that `taken` lacks."""
    if name not in taken:
        return name
    number = 1
    while f"{name} ({number})" in taken:
        number += 1
    return f"{name} ({number})"


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()

    # 1. The practice and its configurations.
    op.create_table(
        "practice",
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["app_user.id"], name="fk_practice_user_id_app_user", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_practice"),
        sa.UniqueConstraint("user_id", "name", name="uq_practice_user_id"),
    )
    op.create_table(
        "practice_configuration",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("practice_id", sa.Uuid(), nullable=False),
        sa.Column("deck_id", sa.Uuid(), nullable=False),
        *_array_columns(),
        sa.ForeignKeyConstraint(
            ["practice_id"],
            ["practice.id"],
            name="fk_practice_configuration_practice_id_practice",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["deck_id"],
            ["deck.id"],
            name="fk_practice_configuration_deck_id_deck",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_practice_configuration"),
        sa.UniqueConstraint(
            "practice_id", "deck_id", name="uq_practice_configuration_practice_id"
        ),
    )

    # 2. One practice per run, under the run's user, name and start.
    op.add_column("practice_run", sa.Column("practice_id", sa.Uuid(), nullable=True))
    practice_run = sa.table(
        "practice_run",
        sa.column("id", sa.Uuid()),
        sa.column("user_id", sa.Uuid()),
        sa.column("name", sa.String()),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("practice_id", sa.Uuid()),
    )
    practice = sa.table(
        "practice",
        sa.column("id", sa.Uuid()),
        sa.column("user_id", sa.Uuid()),
        sa.column("name", sa.String()),
        sa.column("created_at", sa.DateTime(timezone=True)),
    )
    runs = bind.execute(
        sa.select(
            practice_run.c.id,
            practice_run.c.user_id,
            practice_run.c.name,
            practice_run.c.created_at,
        ).order_by(practice_run.c.created_at, practice_run.c.id)
    ).all()
    taken_by_user: dict[uuid.UUID, set[str]] = defaultdict(set)
    practice_id_by_run: dict[uuid.UUID, uuid.UUID] = {}
    for run in runs:
        name = _numbered(run.name, taken_by_user[run.user_id])
        taken_by_user[run.user_id].add(name)
        practice_id = uuid.uuid4()
        practice_id_by_run[run.id] = practice_id
        bind.execute(
            sa.insert(practice).values(
                id=practice_id, user_id=run.user_id, name=name, created_at=run.created_at
            )
        )
        bind.execute(
            sa.update(practice_run)
            .where(practice_run.c.id == run.id)
            .values(practice_id=practice_id)
        )
    op.alter_column("practice_run", "practice_id", nullable=False)
    op.create_foreign_key(
        "fk_run_practice_id_practice",
        "practice_run",
        "practice",
        ["practice_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # 3. Each practice's configurations from its run's copies, pruned to live fields with a
    # side left naming no field reset to the deck's starting configuration; every copy
    # pruned the same way with no reset; and every card row left naming only live fields.
    field_def = sa.table(
        "field_def",
        sa.column("id", sa.Uuid()),
        sa.column("deck_id", sa.Uuid()),
        sa.column("position", sa.Integer()),
    )
    live_by_deck: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)
    for row in bind.execute(
        sa.select(field_def.c.id, field_def.c.deck_id).order_by(
            field_def.c.deck_id, field_def.c.position
        )
    ):
        live_by_deck[row.deck_id].append(row.id)

    practice_deck = sa.table(
        "practice_deck",
        sa.column("id", sa.Uuid()),
        sa.column("practice_run_id", sa.Uuid()),
        sa.column("deck_id", sa.Uuid()),
        *(sa.column(name, _INTS if name.endswith("counts") else _UUIDS) for name in _COLUMNS),
    )
    practice_configuration = sa.table(
        "practice_configuration",
        sa.column("id", sa.Uuid()),
        sa.column("practice_id", sa.Uuid()),
        sa.column("deck_id", sa.Uuid()),
        *(sa.column(name, _INTS if name.endswith("counts") else _UUIDS) for name in _COLUMNS),
    )
    for copy in bind.execute(sa.select(practice_deck)).all():
        live = live_by_deck[copy.deck_id]
        pruned = _pruned(copy, set(live))
        bind.execute(
            sa.update(practice_deck).where(practice_deck.c.id == copy.id).values(**pruned)
        )
        bind.execute(
            sa.insert(practice_configuration).values(
                id=uuid.uuid4(),
                practice_id=practice_id_by_run[copy.practice_run_id],
                deck_id=copy.deck_id,
                **(_starting(live) if _side_is_empty(pruned) else pruned),
            )
        )
    op.execute(
        """
        UPDATE practice_card
        SET prompts = ARRAY(
                SELECT id FROM unnest(prompts) WITH ORDINALITY AS p(id, n)
                WHERE EXISTS (SELECT 1 FROM field_def WHERE field_def.id = p.id)
                ORDER BY n
            ),
            answers = ARRAY(
                SELECT id FROM unnest(answers) WITH ORDINALITY AS a(id, n)
                WHERE EXISTS (SELECT 1 FROM field_def WHERE field_def.id = a.id)
                ORDER BY n
            )
        WHERE EXISTS (
            SELECT 1 FROM unnest(prompts || answers) AS f(id)
            WHERE NOT EXISTS (SELECT 1 FROM field_def WHERE field_def.id = f.id)
        )
        """
    )

    # 4. A run is as recent as its start or its latest rating.
    op.add_column(
        "practice_run",
        sa.Column(
            "last_activity_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
    )
    op.execute(
        """
        UPDATE practice_run
        SET last_activity_at = GREATEST(
            practice_run.created_at,
            (
                SELECT max(review_log.reviewed_at)
                FROM review_log
                JOIN practice_card ON practice_card.id = review_log.review_group_id
                WHERE practice_card.practice_run_id = practice_run.id
            )
        )
        """
    )
    op.alter_column("practice_run", "last_activity_at", nullable=False)

    # 5. What a practice now holds instead.
    op.drop_constraint("fk_practice_session_user_id_app_user", "practice_run", type_="foreignkey")
    op.drop_column("practice_run", "name")
    op.drop_column("practice_run", "user_id")
    op.drop_constraint(
        "fk_practice_deck_source_config_id_deck_practice_config", "practice_deck", type_="foreignkey"
    )
    op.drop_column("practice_deck", "source_config_id")
    op.drop_column("practice_deck", "source_config_name")
    op.drop_table("deck_practice_config")

    # 6. The run's tables, columns, constraints and indexes under the run's names.
    op.rename_table("practice_run", "run")
    op.rename_table("practice_deck", "run_configuration")
    op.rename_table("practice_card", "run_card")
    op.alter_column("run_configuration", "practice_run_id", new_column_name="run_id")
    op.alter_column("run_card", "practice_run_id", new_column_name="run_id")
    op.alter_column("mastery_log", "practice_run_id", new_column_name="run_id")
    for table, old, new in (
        ("run", "pk_practice_session", "pk_run"),
        ("run", "ck_practice_session_status_valid", "ck_run_status_valid"),
        ("run_configuration", "pk_practice_deck", "pk_run_configuration"),
        ("run_configuration", "uq_practice_deck_practice_run_id", "uq_run_configuration_run_id"),
        ("run_configuration", "fk_practice_deck_deck_id_deck", "fk_run_configuration_deck_id_deck"),
        (
            "run_configuration",
            "fk_practice_deck_practice_session_id_practice_session",
            "fk_run_configuration_run_id_run",
        ),
        ("run_card", "pk_practice_card", "pk_run_card"),
        ("run_card", "uq_practice_card_practice_run_id", "uq_run_card_run_id"),
        ("run_card", "ck_practice_card_status_valid", "ck_run_card_status_valid"),
        ("run_card", "fk_practice_card_card_id_card", "fk_run_card_card_id_card"),
        (
            "run_card",
            "fk_practice_card_practice_session_id_practice_session",
            "fk_run_card_run_id_run",
        ),
        ("mastery_log", "fk_mastery_log_practice_run_id_practice_run", "fk_mastery_log_run_id_run"),
    ):
        op.execute(f"ALTER TABLE {table} RENAME CONSTRAINT {old} TO {new}")
    op.execute("ALTER INDEX ix_practice_card_run_status_position RENAME TO ix_run_card_run_status_position")
    # PostgreSQL names a NOT NULL constraint after the table and column it was made under.
    not_null = bind.execute(
        sa.text(
            """
            SELECT c.conrelid::regclass::text AS table_name, c.conname, a.attname
            FROM pg_constraint c
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
            WHERE c.contype = 'n'
              AND c.conrelid IN ('run'::regclass, 'run_configuration'::regclass,
                                 'run_card'::regclass, 'mastery_log'::regclass)
            """
        )
    ).all()
    for row in not_null:
        wanted = f"{row.table_name}_{row.attname}_not_null"
        if row.conname != wanted:
            op.execute(f"ALTER TABLE {row.table_name} RENAME CONSTRAINT {row.conname} TO {wanted}")

    # 7. The cards each run could ask, as the distinct cards it holds rows for.
    op.create_table(
        "run_counted_card",
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("card_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["run_id"], ["run.id"], name="fk_run_counted_card_run_id_run", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["card_id"], ["card.id"], name="fk_run_counted_card_card_id_card", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("run_id", "card_id", name="pk_run_counted_card"),
    )
    op.create_index("ix_run_counted_card_card_id", "run_counted_card", ["card_id"])
    op.execute(
        "INSERT INTO run_counted_card (run_id, card_id) SELECT DISTINCT run_id, card_id FROM run_card"
    )

    # 8. One active run per practice, and practices ordered by their runs.
    op.create_index(
        "uq_run_practice_id_active",
        "run",
        ["practice_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )
    op.create_index("ix_run_practice_id", "run", ["practice_id", "last_activity_at"])


def downgrade() -> None:
    """Downgrade schema."""
    raise NotImplementedError(
        "a_practice_above_its_runs drops every run's name, deck_practice_config and every "
        "copy's link to it; no downgrade restores them"
    )
