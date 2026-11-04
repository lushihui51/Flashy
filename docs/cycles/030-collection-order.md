# 030 — Collection order

## Goal

Outcome: In every collection the user meets, what they changed most recently comes first, from the moment the change is saved and wherever they made it: a deck's cards, a deck's configurations, New practice's configurations under their decks, and the subjects and decks in every list, filter and picker. A card or a configuration moves when it is added or edited; its deck moves with it, and when one of them is deleted; its subject moves with the deck. Practicing moves nothing, and a change that reaches many items at once moves none of them.

Scope: The cycle covers the `last_activity_at` column on cards and on configurations, filled from each row's creation and written only by `touch()`; every write that is the user's activity on a card or a configuration touching it, its deck and its subject; the order of a deck's cards and of configurations wherever they are listed; and the guard tests that hold all of it. It leaves Home's order to Home's cycle, the summary's order to the summary's cycle, and the look of every list to cycle 027.

Judgement: The engineer judges on the live server: editing a card from a deck's page and seeing it first among the deck's cards, the deck first on Your library's Decks tab and on its subject's page, and the subject first on the Subjects tab; then making a configuration for a deck and seeing it first under its deck at the top of New practice and first on the deck's Configurations tab.

## Records

- PDR 029: What the user changed most recently, first in every collection
- ADR 096: `last_activity_at` on cards and configurations, for the order of their lists

## Tasks

### T1 — The columns and every write that moves a thing

**Status**

- [ ]

**Goal**

Cards and configurations carry `last_activity_at`, and every write that is the user's activity on a card, a configuration, a field or a deck moves the thing, its deck and its subject, while a write that reaches many cards at once moves none of them.

**Dependencies**

None.

**Files**

- `alembic/versions/<revision>_last_activity_at_on_cards_and_configurations.py` (new, its revision id from `alembic revision`)
- `app/models/card.py`
- `app/models/deck_practice_config.py`
- `app/services/activity.py`
- `app/routers/api/card.py`
- `app/routers/api/field_def.py`
- `app/routers/api/deck_practice_config.py`
- `app/services/deck_batch_edit.py`
- `app/services/deletion.py`
- `app/services/field_def_create.py`
- `frontend/src/api/types.ts`
- `frontend/src/components/library/CardStandaloneForm.test.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx`
- `frontend/src/lib/deckEditorReducer.test.ts`
- `frontend/src/pages/DeckDetailPage.test.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`
- `frontend/src/pages/practicePrefilterChain.test.tsx`
- `tests/api_tests/test_activity_tracking.py`

**Details**

The schema, ADR 096:

- The migration must add `last_activity_at` to `card` and to `deck_practice_config` as a timezone-aware timestamp, nullable at first, set every row's value to its `created_at`, then make the column `NOT NULL` with the server default `now()`, as `deck.last_activity_at` has. Its downgrade drops both columns.
- `Card` in `app/models/card.py` and `DeckPracticeConfig` in `app/models/deck_practice_config.py` must declare the column exactly as `Deck` declares its own in `app/models/deck.py`, with the same comment and no `onupdate`, and `CardRead` and `DeckPracticeConfigRead` carry it as `DeckRead` does.

The writer, ADR 018 and ADR 096, in `app/services/activity.py`:

```python
def touch(db: Session, *rows: Subject | Deck | Card | DeckPracticeConfig) -> None:
```

- Its body and docstring stay; only the type and the import change. It must remain the only assignment to `last_activity_at` under `app/`.

What moves, PDR 029, each touch before the write's commit and inside its transaction:

- `create_card` in `app/routers/api/card.py` touches the deck and its subject, the new card's own column being its creation; `update_card` touches the card, the deck and the subject.
- `cards.update` in `_stage_deck_batch_edit` in `app/services/deck_batch_edit.py` touches each updated card, and `touch_subject_ids` gains `deck.subject_id` whenever `touch_deck` is set, so that every change to a deck reaches its subject.
- `create_deck_practice_config`, `patch_deck_practice_config` and `delete_deck_practice_config` in `app/routers/api/deck_practice_config.py` touch the deck and its subject; the patch touches the configuration too; the create's own column is its creation.
- `delete_card` in `app/services/deletion.py` touches the subject beside the deck, and so does `delete_field` where cycle 029 has added it.
- Every field write that touches the deck, in `app/routers/api/field_def.py` and `app/services/field_def_create.py`, touches the subject too.
- The subject is read through `db_read_subject` in `app/database_ops/subject.py` with the deck's `subject_id` and the user's id, as `delete_deck` does.
- No write that reaches every card of a deck touches a card: the batch edit's field operations, a field's creation writing a value row per card, and the deletion closure's scrub, ADR 096.

The guard, `tests/api_tests/test_activity_tracking.py`:

- The module docstring states the rules as PDR 029 has them: a card write reaches the deck and the subject, a configuration write reaches the configuration, the deck and the subject, and a write over every card of a deck moves no card.
- `TestTimestampsOnInsert` gains a test that a card's and a configuration's `last_activity_at` equal their `created_at` on insert.
- A class `TestCardWritesTouchCard` holds, each a test of its own: a card patch bumps the card; a batch edit's `cards.update` bumps the card; a field created on the deck leaves every card's `last_activity_at` as it was; a field deleted on the deck leaves every remaining card's as it was.
- A class `TestConfigurationWrites` holds: a configuration patch bumps the configuration, the deck and the subject; a configuration create bumps the deck and the subject; a configuration delete bumps the deck and the subject.
- `TestCardWritesTouchDeck`'s `test_card_edit_does_not_touch_subject` becomes `test_card_edit_touches_subject`, asserting the subject's `last_activity_at` rose; `TestDeckLifecycleBubblesToSubject` gains a test that a field create bumps the subject and one that a deck rename bumps the subject.

The frontend: after `npm run gen:api`, each card and configuration fixture the compiler requires `last_activity_at` on, in the seven test files listed, gains `last_activity_at: ''` as the deck fixtures hold it.

**Out of scope**

- The order of any list: T2.
- A stamp set by the database on every update: never, ADR 096.
- Practicing touching anything: never, PDR 029.
- `last_activity_at` on practices: never, PDR 029.

**Done when**

- `uv run alembic heads` prints one revision, the new one, and `uv run alembic current` prints the same.
- `uv run python -c "from sqlalchemy import inspect; from app.database import engine; i = inspect(engine); print([(c['name'], c['nullable']) for t in ('card', 'deck_practice_config') for c in i.get_columns(t) if c['name'] == 'last_activity_at'])"` prints `[('last_activity_at', False), ('last_activity_at', False)]`.
- `grep -rn "\.last_activity_at = " app` prints exactly one line, in `app/services/activity.py`.
- `cd frontend && grep -c "last_activity_at: string" src/api/types.ts` prints `7`.
- `uv run pytest tests/api_tests/test_activity_tracking.py` passes, with `test_card_edit_touches_subject` and the new classes' tests named in the output.
- `uv run pytest` passes.

**Debrief**

None.

### T2 — The order of cards and configurations

**Status**

- [ ]

**Goal**

A deck's cards, a deck's configurations and New practice's configurations under their decks each read most recently changed first, from the server, with the frontend sorting nothing.

**Dependencies**

- T1: `last_activity_at` on `Card` and `DeckPracticeConfig`, and the touches that move them, their decks and their subjects.

**Files**

- `app/database_ops/card.py`
- `app/database_ops/deck_practice_config.py`
- `frontend/src/lib/practiceConfigurationGroups.ts`
- `frontend/src/pages/PracticeCreatePage.test.tsx`
- `tests/api_tests/test_activity_tracking.py`
- `tests/api_tests/test_deck_practice_config.py`

**Details**

The order, ADR 096, each in the statement and nowhere after it:

- `db_read_cards_for_deck` in `app/database_ops/card.py` must order by `Card.last_activity_at` descending, then `Card.id`.
- `db_read_deck_practice_configs_with_context` in `app/database_ops/deck_practice_config.py` must order by `Deck.last_activity_at` descending, `Deck.id`, `DeckPracticeConfig.last_activity_at` descending, then `DeckPracticeConfig.id`, and its docstring says that a grouped list renders in this order without the client re-sorting; `db_read_deck_practice_configs` must order by `DeckPracticeConfig.last_activity_at` descending, then `DeckPracticeConfig.id`.
- The comment on `groupConfigurationsByDeck` in `frontend/src/lib/practiceConfigurationGroups.ts` states the contract as decks by their most recent change, then configurations by theirs, grouped by first-seen deck; the function's body stays.
- Every other collection PDR 029 orders keeps its statement as it is: subjects and decks by `last_activity_at` in `app/database_ops/subject.py` and `app/database_ops/deck.py`, practices by `created_at` descending in `app/database_ops/practice_run.py`, and fields by position.

The tests:

- `TestRecencyOrdering` in `tests/api_tests/test_activity_tracking.py` gains, each a test of its own: `test_deck_cards_ordered_by_last_activity_desc`, three cards made in turn, the first then patched, and the deck read listing the first, the third, then the second; `test_configurations_ordered_by_deck_recency_then_own`, two decks made in turn with two configurations each, a configuration of the first deck then patched, and the configurations read listing the first deck's two rows first, the patched one leading, then the second deck's with its later-made one leading; `test_deck_configurations_ordered_by_last_activity_desc`, the read narrowed to one deck listing its patched configuration first.
- `test_lists_every_config_with_deck_and_subject_context` in `tests/api_tests/test_deck_practice_config.py` finds each of its two rows by name instead of by position, so its assertions no longer fix an order.
- The test named `Selected lists every selection subject → deck → name, with its deck and subject (MD-5)` in `frontend/src/pages/PracticeCreatePage.test.tsx` is renamed `Selected lists every selection in the configurations' order, with its deck and subject`; its assertions stay, since the mock returns its rows in a fixed order.

**Out of scope**

- Home's three decks and their order: Home's cycle.
- The summary's "Order by": the summary's cycle.
- A sort in any component or page: never, ADR 096.
- Reordering the filters' first row or the pickers' last row: never; the task's Done when holds them where they are.

**Done when**

- `grep -n "order_by" app/database_ops/card.py app/database_ops/deck_practice_config.py` prints three lines, one per read named above.
- `grep -rn "\.sort(" frontend/src/pages frontend/src/components/library frontend/src/components/practice --include=*.tsx | grep -v "position\|delta\|mastery\|test"` prints nothing.
- `uv run pytest tests/api_tests/test_activity_tracking.py tests/api_tests/test_deck_practice_config.py` passes, with the three new ordering tests named in the output.
- `uv run pytest` passes.
- In headless Chromium against `localhost:5173`, signed out of Clerk: on `/practice` the subject filter's first option is "All subjects" and the deck filter's first option is "All decks"; on `/decks/new` the subject picker's last option is "New subject…"; on `/cards/new` the deck picker's last option is "New deck…". The script's output is the evidence.
- The cycle's judgement: a script in the session scratchpad, against `localhost:5173` at 390px width, opens a deck's page whose deck is not first on Your library's Decks tab, opens the edit of the deck's last-listed card from that page, changes one value and saves; then prints the first card on the deck's page, the first deck on `/library?tab=decks`, the first deck on the subject's page and the first subject on `/library`, each equal to the one just changed; then creates a configuration for that deck through its form and prints the first group on `/practice/new` with its first configuration, and the first configuration on the deck's Configurations tab, each the one just made. The script's output and screenshots of the deck's page, the Decks tab and New practice are named in the Debrief, for the engineer to drive the same path with a mouse.

**Debrief**

None.
