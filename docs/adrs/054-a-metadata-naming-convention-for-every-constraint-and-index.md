# ADR 054: A metadata naming convention for every constraint and index

## Status

Active

## Context

`app/database.py` assigns `SQLModel.metadata.naming_convention` at import time, with one template per constraint kind: `ix_<column label>`, `uq_<table>_<first column>`, `ck_<table>_<constraint name>`, `fk_<table>_<first column>_<referred table>`, `pk_<table>`. `alembic/env.py` imports `app.database` before it reads `SQLModel.metadata` so that `alembic revision --autogenerate` compares the database against named constraints. Without the convention SQLAlchemy emits unnamed constraints and Postgres invents names such as `practice_deck_practice_run_id_key`; autogenerate cannot match those to the model, so every revision would propose spurious drops and creates, and `op.drop_constraint` would need a name nobody can derive without inspecting the database. The convention has been load-bearing since the schema rewrite but was never recorded. It also caught a real drift: the `practice_session` → `practice_run` column rename left `uq_practice_deck_practice_session_id` behind, and autogenerate flagged the mismatch against the derived `uq_practice_deck_practice_run_id`.

## Decision

We will make the naming convention in `app/database.py` the source of every constraint and index name. It is applied at import, and `alembic/env.py` imports `app.database` before reading the metadata. A migration names constraints exactly as the convention derives them, hand-written operations included, and a column rename renames the constraints derived from that column in the same migration. A multi-column constraint or index may carry an explicit `name=` where the derived name (first column only) would collide or mislead, as `uq_mastery_log_card_field_reviewed` and `ix_mastery_log_run` do; the explicit name still uses the convention's prefix.

## Alternatives considered

### Let Postgres name constraints

Rejected. Autogenerate cannot match database-assigned names to the model, and drops in migrations would need names read from a live database rather than derived from the code.

### Name every constraint by hand in the model

Rejected. The convention covers the single-column majority automatically and leaves explicit names for the cases that need them; naming all of them by hand is the same outcome with more chances to forget.

## Consequences

**Positive**

- The developer trusts autogenerate diffs, and derives a migration's drop names from the model alone.

**Negative**

- The developer who renames a column must rename its derived constraints in the same migration, or autogenerate proposes a drop-and-create.
- The developer keeps `alembic/env.py` importing `app.database` before it reads the metadata; a source-scan guard holds it.

**Neutral**
