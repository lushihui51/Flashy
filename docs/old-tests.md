# Phase 0 — old test scenarios retired for re-coverage

Captured from the deleted `tests/api_tests/test_*.py` before Phase 0 removed them, so
later phases can re-derive equivalent coverage against the new field-based schema. Old
routes/fixtures no longer exist; this is scenario intent, not code to restore verbatim.

## Subjects (`test_subjects.py`)

- Create a subject, response has `id` and `name`.
- Read a subject by id.
- Update (`PATCH`) a subject's name.
- Delete a subject; subsequent read 404s.

## Decks (`test_decks.py`)

- Create a deck under a subject with a schema (old free-form `deck_schema` dict — maps to
  `field_def` rows now).
- Read a deck; response includes resolved schema and `subject_id`.
- Update deck name / subject.
- Delete a deck; subsequent read 404s.

## Cards (`test_cards.py`)

- Create a card with `fields` matching the deck's schema; response echoes `fields` and
  includes `last_modified`. → new schema: card creation writes N `card_field_value` rows.
- Read a card; fields match what was stored.
- Update (`PUT`) a card's fields.
- Delete a card; subsequent read 404s.
- (Not previously tested but relevant now: field type validation, archived-field exclusion
  from create/edit forms — new invariants, no old equivalent.)

## Deck config (`test_deck_config.py`)

- Create a deck config: happy path.
- Reject creation when `deck_id` doesn't resolve (404 "Deck not found").
- Reject creation when prompt/answer/pool fields overlap ("Duplicated deck fields") — maps
  to new "four field arrays are pairwise disjoint" validation.
- Reject creation when a field name isn't part of the deck schema ("Unknown deck fields")
  — maps to new "every id resolves to a live field_def of that deck".
- Reject invalid `prompt_pool_counts` / `answer_pool_counts` (count exceeds pool size) —
  maps to new "pool_counts values within 1..len(pool_ids)".
- Read a deck config by id; 404 when missing.
- Update (`PATCH`) a deck config; same validation rules re-run on update.
- Delete a deck config; 404 on subsequent read/delete.

## Practice sessions (`test_practice.py`)

- Create a practice session from one or more deck config ids; starts with `curr == -1`
  (old cursor-based model — replaced by `practice_card.status`-derived "current card").
- Read practice cards moving forward (`forward=True`) through the session; 404 once
  exhausted.
- Read practice cards moving backward (`forward=False`) after seeding an extra
  out-of-order `PracticeCard` row; forward/backward traversal via `position`. → new model
  has no bidirectional cursor; replaced by position-ordered pending-card queries and the
  requeue-on-fail flow (Phase 4).

## Fixtures retired from `conftest.py`

(`subject_path`, `deck_path`, `card_path`, `deck_config_path`, `practice_path`,
`existing_subject`, `existing_deck`, `existing_card`, `valid_create_deck_config_payload`,
`existing_deck_config`, `existing_practice_session`) — all built on the old route shapes
and payload keys (`deck_schema`, `fields`, `prompt_fields`, `prompt_pool`, etc.) and will
need field-based equivalents once Phase 1+ routers exist.

Kept: engine setup, `get_session` override, `init_db`, `db`, `client` — generic test-DB
scaffolding with no domain shape baked in.
