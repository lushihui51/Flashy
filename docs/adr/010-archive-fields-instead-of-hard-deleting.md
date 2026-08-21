# ADR 010: Archive fields instead of hard-deleting

## Status

Accepted

## Context

Once `field_def` became the sole source of truth a field is referenced by
(ADR 009), deleting a `field_def` row is no longer a local, contained operation —
other tables point at it. The foreign-key shapes make the risk concrete:

- `card_field_value.field_def_id` and `card_field_mastery.field_def_id` are both
  `ON DELETE CASCADE` (`app/models/card_field_value.py:9-11`,
  `app/models/card_field_mastery.py:14-16`) — a hard delete would silently wipe
  every card's stored value for that field, and its mastery cache.
- `review_log.field_def_id` has **no** `ondelete` clause at all
  (`app/models/review_log.py:26`), so Postgres defaults to `RESTRICT` — a hard
  delete of a field that still has review history is rejected at the database
  level, because destroying that history would corrupt the append-only log that
  mastery is rebuilt from (ADR 011).

A field needs to be able to stop being usable — excluded from new cards, new
configs, new practice generation — without ever touching that irreversible history.

## Decision

Field "deletion" sets `field_def.archived_at`, never destroys the row. Hard delete
is a separate, explicitly gated operation, permitted only when it's actually safe.

Mechanism:

- `db_archive_field_def` (`app/database_ops/field_def.py`) is idempotent — archiving
  an already-archived field is a no-op, never an error.
- Archived fields are excluded at every read site that matters, each with its own
  reasoning documented inline: deck field listing (unless `include_archived` is
  requested), deck copy (`app/database_ops/field_def.py:39-43` — "there's no
  review_log/mastery history for them to protect on the new deck"), config
  validation (`app/services/deck_practice_config.py:19-21` — a config can go stale
  if a field is archived after it was saved), mastery reads
  (`app/database_ops/card_field_mastery.py:104`), and practice card generation
  (`app/database_ops/practice_generation.py:15,38` — "drops archived ids left in
  stale snapshots").
- Archiving does **not** retroactively clean up already-generated `practice_card`
  rows — an in-flight session can still reference an archived field's id in its
  frozen `prompts`/`answers` arrays; new generation just never selects it again.
- A hard-delete endpoint exists (`DELETE /fields/{field_id}/hard`,
  `app/routers/api/field_def.py:106-119`), gated: the field must already be
  archived, and must have zero `card_field_value` rows
  (`db_count_card_field_values`), or it 400s.

## Alternatives considered

### Hard-delete on request, rely on the FK constraints to catch problems

Rejected. `review_log`'s `RESTRICT` would catch a delete with review history, but
`card_field_value` and `card_field_mastery`'s `CASCADE` would silently destroy data
with no chance to warn the caller first. Archival makes "stop using this field"
a reversible-in-spirit, always-safe operation, and hard delete an explicit,
separately-gated escape hatch for when a field truly has no data left.

## Consequences

Benefits:

- A field can be retired from active use without any risk to historical data,
  regardless of how much review/mastery/value data references it.
- Hard delete is available for the case that actually is safe (an unused field with
  no values ever recorded), without being the default path.

Costs:

- **Known gap, not yet fixed as of this writing.** The rewrite's invariant calls for
  checking four things before hard delete: `card_field_value`, `card_field_mastery`,
  `review_log`, and all six `deck_practice_config` uuid[] arrays across the deck.
  The shipped endpoint (`app/routers/api/field_def.py:106-119`) only checks
  `card_field_value` via `db_count_card_field_values`. In practice `review_log`'s
  `RESTRICT` FK still stops a delete with review history at the database level, and
  `card_field_mastery` CASCADEs silently (acceptable — it's a disposable cache, see
  ADR 011) — but a stale `deck_practice_config` array reference to the deleted
  field's id is checked nowhere at hard-delete time. This is a real discrepancy
  between the stated invariant and the implementation, left as a follow-up rather
  than fixed here.
