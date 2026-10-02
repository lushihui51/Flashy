# 022 — Practice rows name their configurations, and configurations name themselves

Fix cycle from the 2026-10-01 /code-plan session, prompted by `docs/cc/2026-09-29-practice-row-configuration-label.md`: each practice row shows subject · deck chips and a date, and both a practice and a configuration default to a timestamp, so neither says what it contains. Backend and frontend: one new nullable column on `practice_deck`, one migration, one new payload field, and a regenerated `frontend/src/api/types.ts`. Branch: `fix/practice-row-configuration-label`, cut from `main`.

Earlier task files affected, recorded here for the next sync's Superseded bullets; this file does not edit them:

- Task 004 T5's Done-when on `SessionDeckChips` ("Alpha · Shared Deck Name" chips with a created date on the row) is replaced by MD-2, MD-3 and MD-4.
- Task 004's carried invariant 3, "Editing or deleting a `deck_practice_config` never touches any practice; the UI never implies otherwise", keeps its behavioural half (generation and rerun still read only the snapshot, ADR 013) and loses its display half: under ADR 066 a rename reaches the practice's label.
- Task 004's Canonical vocabulary table gains no row: the label uses "configuration", already in the table, and "+N" is punctuation.

AGENTS.md's `practice_deck` entity line gains the stored name through /distill. That is not a task here.

## ADRs

Decisions this file implements; full context and rejected alternatives live in the ADRs.

- **ADR 066 — A snapshot carries its configuration's name, live while linked and stored as the fallback**: the practice summary's per-deck `configuration_name` is the live configuration name through `source_config_id`, else the snapshot's `source_config_name`, else null; the stored name is written at start, rewritten on every linked snapshot by a non-material rename, copied verbatim by rerun, and backfilled by the migration for linked snapshots. Amends ADR 013 and ADR 040.
- **ADR 067 — A configuration's default name is derived from its layout**: prompt-side names, "→", answer-side names, always-shown before random-draw in deck order, two names per side then "+N", empty while a side is empty; create mode follows the board until typed, edit mode keeps the stored name; a same-layout duplicate hits the existing inline error.

## Minor decisions

- **MD-1**: A practice's default name stays the date; `PracticeCreatePage` and rerun keep `formatDateTime(new Date())`. Rejected: deriving it from the practice's decks or configurations.
- **MD-2**: Each practice row lists one "Deck · Configuration" entry per deck, at most two then "+N", in the server's subject → deck order; an entry whose snapshot has no name shows the deck alone, and the subject leaves the row. Derived default names repeat across decks (ADR 067), so a configuration name alone cannot tell two practices apart, and the overview's filters already narrow by subject. Rejected: configuration names only; configuration names beside the existing deck chips.
- **MD-3**: The practice detail page lists every deck uncapped as "Subject · Deck · Configuration", deck alone when there is no name; it is the one place the whole practice is spelled out. Rejected: the row's capped entries; the full list without the subject.
- **MD-4**: The created-date chip leaves the practice row; under MD-1 the name is that date-time unless typed, there is no rename, so the date appeared twice, and the detail page prints the full date-time. Rejected: keeping it.

## Contracts

### `practice_deck.source_config_name` (ADR 066)

- `app/models/practice_deck.py`, directly after `source_config_id`:
  ```python
  source_config_name: str | None = Field(default=None)
  ```
  Nullable `VARCHAR`. Four rules, stated in the comment above it: written at run start with `config.name`; set to the new name on every linked snapshot by a non-material update that carries a name (ADR 066); copied verbatim by rerun, possibly null; touched by nothing else. A material edit and a delete only null the link.
- `_snapshot_and_generate_deck` in `app/services/practice_run.py` gains a parameter directly after `source_config_id`: `source_config_name: str | None`. It is written into the `db_stage_create_practice_deck` dict and read by nothing below that call. `start_practice_run` passes `config.name`; `rerun_practice_run` reads `practice_deck.source_config_name` into its `surviving_decks` tuple, which becomes `tuple[uuid.UUID, dict[str, list], uuid.UUID | None, str | None]`, and passes it through.
- **Migration**, generated with `alembic revision --autogenerate -m "practice_deck source_config_name"` and then edited:
  - `upgrade()`: the generated `op.add_column('practice_deck', sa.Column('source_config_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True))`, then the ADR 066 backfill, exactly:
    ```sql
    UPDATE practice_deck
    SET source_config_name = deck_practice_config.name
    FROM deck_practice_config
    WHERE deck_practice_config.id = practice_deck.source_config_id
    ```
  - `downgrade()`: `op.drop_column('practice_deck', 'source_config_name')`. The backfill is not reversed; dropping the column removes it.
  - Module docstring in the style of `f6887865090a`: what the column is, the two upgrade steps, and that it implements ADR 066.

### Rename propagation (ADR 066) — `app/database_ops/practice_deck.py`, `app/services/deck_practice_config.py`

```python
def db_stage_set_practice_deck_source_config_name(
    db: Session, config_id: uuid.UUID, name: str
) -> None:
    """ADR 066: every snapshot still linked to this configuration takes its new name. No
    commit — the caller's update commits both."""
```

- Body: `update(PracticeDeck).where(col(PracticeDeck.source_config_id) == config_id).values(source_config_name=name)`, the shape of `db_stage_unlink_practice_decks_from_config`.
- `update_deck_practice_config` becomes:
  ```python
  if material:
      db_stage_unlink_practice_decks_from_config(db, config.id)
  elif "name" in data:
      db_stage_set_practice_deck_source_config_name(db, config.id, data["name"])
  return db_update_deck_practice_config(db, config, data)
  ```
  A material update never propagates, even when it also carries a name. A non-material update carrying an unchanged name runs the UPDATE to the same value; no comparison is made. A validation failure never reaches this function, as today.

### `PracticeRunDeckSummary` (ADR 066) — `app/models/practice_run_payloads.py`

```python
class PracticeRunDeckSummary(AppModel):
    deck_id: uuid.UUID
    deck_name: str
    subject_id: uuid.UUID
    subject_name: str
    configuration_name: str | None
```

- `configuration_name` is the live `deck_practice_config.name` when `practice_deck.source_config_id` resolves to a row, else `practice_deck.source_config_name`, else `None`.
- `_summaries_for_runs` in `app/database_ops/practice_run.py` keeps its two-queries-regardless shape: the deck query adds `.outerjoin(DeckPracticeConfig, DeckPracticeConfig.id == PracticeDeck.source_config_id)` and selects `func.coalesce(DeckPracticeConfig.name, PracticeDeck.source_config_name)` as the fifth column. No new `db_*` function.
- The class docstring is rewritten: the `practice_deck → deck → subject` chain is still the only link between a session and a subject/deck and the only thing the filters use; `source_config_id` is read here for the label only (ADR 066), never for filtering, generation, validation or rerun.
- `frontend/src/api/types.ts` is regenerated with `npm run gen:api` in the same commit (T3).

### `frontend/src/lib/capList.ts` (new, T4; ADR 067, MD-2)

```ts
/** How many names a capped list shows before the rest become "+N" (ADR 067, MD-2). */
export const CAP = 2;

/** The first `CAP` items and how many were left out. `overflow` is 0 when nothing was. */
export function capList<T>(items: readonly T[]): { shown: T[]; overflow: number };

/** `shown` comma-joined, then " +N" when anything overflowed: "Word, Example +1". "" for an empty list. */
export function formatCappedNames(names: readonly string[]): string;
```

### `defaultConfigurationName` (T4; ADR 067) — `frontend/src/lib/deckConfigurationBoard.ts`

```ts
/** The ADR 067 default: "<prompt names> → <answer names>", each side `formatCappedNames` over
 * always-shown then random-draw fields in deck order (ADR 067). "" while either side is empty. */
export function defaultConfigurationName(state: BoardState, fieldDefs: DeckFieldDef[]): string;
```

- Prompt-side names: `fieldsIn(state, 'prompt_fields')` then `fieldsIn(state, 'prompt_pool')`, each id mapped to its `fieldDefs` name. Answer side likewise with `answer_fields` then `answer_pool`.
- Returns `""` if either side has no field; otherwise `` `${formatCappedNames(prompt)} → ${formatCappedNames(answer)}` `` with the arrow U+2192 and one space on each side.
- Examples against the test fixture (Term 0, Meaning 1, Reading 2): Term always-shown prompt, Meaning always-shown answer → `Term → Meaning`; Reading always-shown prompt, Term random-draw prompt, Meaning answer → `Reading, Term → Meaning`; Term, Meaning, Reading all prompt always-shown and no answer → `""`.

### Editor name state (T5; ADR 067) — `frontend/src/components/library/DeckConfigurationEditor.tsx`

```ts
// null until the user types (create mode); the stored name from the start (edit mode).
const [typedName, setTypedName] = useState<string | null>(config?.name ?? null);
const name =
  typedName ?? (deck && board ? defaultConfigurationName(board, deck.field_defs) : '');
```

- The input's `value` is `name`; its `onChange` sets `typedName` to the event value, so a typed-then-cleared name is `""`, not null, and stays the user's.
- Save sends `name.trim()`, as today. `canSave` and the "Give this config a name to save it." hint read `name`, as today.
- Changing deck in create mode leaves `typedName` as it is: null keeps following the new board; a typed name stays.
- The `formatDateTime` import and the timestamp comment leave the file.

### `SessionDeckChips` props (T6; MD-2, MD-3) — `frontend/src/components/practice/SessionDeckChips.tsx`

```ts
type SessionDeckChipsProps = {
  decks: PracticeRunDeckSummary[];
  /** 'summary' (MD-2): "Deck · Configuration" per deck, at most CAP chips, then one "+N" chip.
   *  'full' (MD-3): "Subject · Deck · Configuration" per deck, every deck. */
  variant: 'summary' | 'full';
};
```

- Chip text, `configuration_name` present: summary `{deck_name} · {configuration_name}`; full `{subject_name} · {deck_name} · {configuration_name}`.
- Chip text, `configuration_name` null: summary `{deck_name}`; full `{subject_name} · {deck_name}`.
- Summary applies `capList(decks)`; when `overflow > 0` one more chip reads `+{overflow}`, styled like the others, keyed `"overflow"`. Full renders every deck and never a "+N" chip.
- Order is the array's order (the server's subject → deck, MD-2). No wrapping element, no fetching, as today.

### Row and detail (T6; MD-2, MD-3, MD-4)

- `PracticeRunRow`: the second line is `<SessionDeckChips decks={session.decks} variant="summary" />` and nothing else. The `formatDate` import and the date span leave the file. The name line and the delete button are unchanged.
- `PracticeDetailsPage`: `<SessionDeckChips decks={session.decks} variant="full" />` in the existing wrapper. The `formatDateTime(session.created_at)` line stays.

### Copy (ADR 021 checked)

No new user-facing word. Strings that change: the row's chips and the detail page's chips per the contracts above; `+N`.

## Tasks

Two chains: T1 → T2 → T3 → T6 on the backend side (T2 and T3 share `test_practice_run.py`, so they run in order), and T4 → T5 on the frontend side; T6 also needs T4. T1 and T4 share no file and can run in parallel; so can T2 or T3 with T4 or T5, and T5 with T6.

### T1 — The snapshot stores the configuration's name (ADR 066) — no dependencies

- [x] **Goal:** `practice_deck` gains `source_config_name`, written at start, copied by rerun, and backfilled for linked snapshots by the migration.
- **Files:**
  - `app/models/practice_deck.py`
  - `alembic/versions/<generated>_practice_deck_source_config_name.py` (new)
  - `app/services/practice_run.py`
  - `tests/api_tests/test_practice_run.py`
- **Details:**
  - Add the column per Contracts with its four-rule comment; rule two names T2 as where it is implemented. Extend the class docstring's `source_config_id` sentence: the stored name is the ADR 066 fallback for the label, read only by the summary query (T3).
  - Generate and edit the migration per Contracts. Verify it per AGENTS.md's Migrations line: on a `pg_dump` copy of the dev database first, then `alembic upgrade head` against the dev database, with `alembic heads` showing one head before and after. On the copy, confirm with one `SELECT` that a snapshot with a non-null `source_config_id` received its configuration's name and one with a null link stayed null; record both in Notes. If the dev database has no snapshot in one of those states, say so in Notes instead.
  - Thread `source_config_name` through `_snapshot_and_generate_deck`, `start_practice_run` and `rerun_practice_run` per Contracts. Update the helper's docstring: it rides into the snapshot next to `source_config_id` and is read by nothing below.
  - **Tests, in `TestConfigLineage`:**
    - `test_start_writes_the_configs_name_onto_the_snapshot`: after `_start` with `session_config`, the snapshot's `source_config_name == "Session Config"`.
    - `test_rerun_copies_the_old_snapshots_source_config_name_verbatim`: start, set the snapshot's `source_config_name` to `"Stored Name"` directly (bypassing the API, as the existing null-lineage test does), finish, rerun; the new snapshot's `source_config_name == "Stored Name"`, proving a copy rather than a lookup.
    - `test_a_snapshot_without_a_stored_name_reruns_with_it_null`: start, set the snapshot's `source_config_name` to `None` directly, finish, rerun; the new snapshot's `source_config_name is None`.
- **Out of scope:**
  - Rename propagation (T2).
  - Reading the name on any payload (T3).
  - Any frontend file, `types.ts` included (T3 regenerates it).
  - Backfilling snapshots with a null link: there is nothing to copy from (ADR 066).
- **Done when:**
  - `grep -n "source_config_name" app/models/practice_deck.py app/services/practice_run.py` shows the column and the four service sites (helper parameter, its dict, start's `config.name`, rerun's tuple).
  - `alembic heads` prints one head; the migration's upgrade and downgrade both ran on the `pg_dump` copy, and the two `SELECT` outcomes are in Notes.
  - `uv run pytest tests/api_tests/test_practice_run.py` passes with the three tests above; a full `uv run pytest` passes, started only when no peer session is mid-run.
  - The commit contains only this task's hunks.
- **Commit:** `feat: practice_deck stores its configuration's name at start (task 022 T1)`
- Notes: Migration `9de2fd4c3f06`. On a `pg_dump` copy of the dev database, upgrade backfilled all 12 linked snapshots with their configuration's current name, and the 1 unlinked snapshot stayed null; downgrade removed the column and a second upgrade ran clean. The dev database is at `9de2fd4c3f06`, and `alembic heads` showed one head before and after. Start's `config.name` sits in the helper call's positional arguments, so the Done-when grep for `source_config_name` shows it only by its parameter position, not by name. The two rerun tests share one class helper, `_rerun_with_stored_name`. Otherwise none.

### T2 — A rename reaches every linked snapshot (ADR 066) — depends on T1

- [ ] **Goal:** a non-material configuration update that carries a name writes it onto every snapshot still linked, in the update's transaction; a material update severs and propagates nothing.
- **Files:**
  - `app/database_ops/practice_deck.py`
  - `app/services/deck_practice_config.py`
  - `tests/api_tests/test_practice_run.py`
- **Details:**
  - Add the `db_stage_*` function and the `elif` branch per Contracts. Extend `update_deck_practice_config`'s docstring: the rename branch, that a material update takes precedence, and that both UPDATEs commit with the config update in `db_update_deck_practice_config`'s own transaction.
  - **Tests, a new class `TestConfigRenamePropagates` next to `TestConfigEditSeversLineage`, reusing its `_second_config` and `_snapshot` helpers by moving them to module level:**
    - `test_a_rename_updates_the_stored_name_on_linked_snapshots`: start, `PATCH` the configuration's name to `"Renamed"`, the snapshot's `source_config_name == "Renamed"` and its `source_config_id` is still the configuration's id.
    - `test_a_rename_reaches_only_snapshots_still_linked`: start run A, set A's snapshot `source_config_id` to `None` directly, start run B, `PATCH` name to `"Renamed"`; A's stored name is `"Session Config"`, B's is `"Renamed"`.
    - `test_a_material_edit_with_a_name_severs_and_does_not_propagate`: start, `PATCH` `{"name": "Renamed", "prompt_pool_ids": [pool_p1]}`; the snapshot's `source_config_id is None` and `source_config_name == "Session Config"`.
    - `test_a_rename_touches_no_other_configs_snapshots`: with `_second_config`, start one run per configuration, rename the first; the second's snapshot keeps `"Second Config"`.
- **Out of scope:**
  - Propagating a name on a material update (ADR 066 says never).
  - Any payload or frontend change.
- **Done when:**
  - `grep -n "db_stage_set_practice_deck_source_config_name" app/` shows the definition and exactly one call, in `update_deck_practice_config`.
  - `uv run pytest tests/api_tests/test_practice_run.py tests/api_tests/test_layering_guard.py` passes with the four tests above; a full `uv run pytest` passes.
  - The commit contains only this task's hunks.
- **Commit:** `feat: a configuration rename updates its linked snapshots' stored name (task 022 T2)`
- Notes:

### T3 — The summary carries each deck's configuration label (ADR 066) — depends on T2

- [ ] **Goal:** `PracticeRunDeckSummary` gains `configuration_name`, live through the link and otherwise the stored name, on both the list and the detail reads.
- **Files:**
  - `app/models/practice_run_payloads.py`
  - `app/database_ops/practice_run.py`
  - `tests/api_tests/test_practice_run.py`
  - `frontend/src/api/types.ts` (regenerated)
- **Details:**
  - Add the field and rewrite the docstring per Contracts; change the query per Contracts, importing `DeckPracticeConfig` from `app.models.deck_practice_config` and `func` from `sqlalchemy`.
  - Rewrite `TestConfigLineage`'s class docstring sentence "not exposed on any payload here": the name is surfaced as `configuration_name` (ADR 066); the link itself still is not.
  - Run `npm run gen:api` in `frontend/` and commit `types.ts` with the model change (AGENTS.md).
  - **Tests:**
    - `test_detail_with_every_deck_intact`: the expected deck dict gains `"configuration_name": "Config A"`.
    - New class `TestConfigurationLabel`, using `session_cards` and `session_config` unless stated:
      - `test_label_is_the_live_name_after_a_rename`: start, `PATCH` name to `"Renamed"`, `GET /api/practice_runs/{id}` → `decks[0]["configuration_name"] == "Renamed"`.
      - `test_label_keeps_the_last_linked_name_after_a_material_edit`: start, `PATCH` name to `"Renamed"`, then `PATCH` `prompt_pool_ids` to `[pool_p1]` (the severing edit `TestConfigEditSeversLineage` uses), `GET` → `"Renamed"`.
      - `test_label_keeps_the_last_linked_name_after_the_config_is_deleted`: start, `PATCH` name to `"Renamed"`, `DELETE` the configuration, `GET` → `"Renamed"`.
      - `test_label_is_null_without_link_or_stored_name`: start, set the snapshot's `source_config_id` and `source_config_name` to `None` directly, `GET` → `None`.
      - `test_list_carries_each_decks_label` (with `multi_subject_library`): start one run on both configurations, `GET /api/practice_runs` → that run's `decks` carry `"Config A"` then `"Config B"`.
- **Out of scope:**
  - Any component or page change (T6).
  - Filtering by configuration; `source_config_id` stays out of the filters (ADR 040).
- **Done when:**
  - `uv run pytest tests/api_tests/test_practice_run.py` passes with the tests above; the full `uv run pytest` passes, including `test_layering_guard.py` and `test_models_layout_guard.py`.
  - After `npm run gen:api`, `git diff --exit-code frontend/src/api/types.ts` is clean against the commit, and `types.ts` shows `configuration_name: string | null` on `PracticeRunDeckSummary`.
  - In `frontend/`, `npx vitest run`, `npm run lint`, and `npm run build` are clean.
  - The commit contains only this task's hunks.
- **Commit:** `feat: practice summaries carry each deck's configuration name (task 022 T3)`
- Notes:

### T4 — The capped-list helper and the derived configuration name (ADR 067) — no dependencies

- [x] **Goal:** two pure functions, `capList`/`formatCappedNames` and `defaultConfigurationName`, with tests, for T5 and T6 to use.
- **Files:**
  - `frontend/src/lib/capList.ts` (new)
  - `frontend/src/lib/capList.test.ts` (new)
  - `frontend/src/lib/deckConfigurationBoard.ts`
  - `frontend/src/lib/deckConfigurationBoard.test.ts`
- **Details:**
  - Implement both modules per Contracts. `defaultConfigurationName` builds its name lookup from `fieldDefs` by id; an id with no `fieldDefs` entry cannot occur (the board is built from the same `fieldDefs`) and needs no branch.
  - **Tests in `capList.test.ts`:** two items → both shown, overflow 0; three → two shown, overflow 1; empty → `[]`, 0. `formatCappedNames`: `["Word"]` → `"Word"`; `["Word", "Example"]` → `"Word, Example"`; `["Word", "Example", "Reading"]` → `"Word, Example +1"`; `[]` → `""`.
  - **Tests in `deckConfigurationBoard.test.ts`,** a `describe('defaultConfigurationName')` against the file's `fieldDefs`: the three examples in Contracts; an empty board → `""`; prompt fields only → `""`; four names on one side (add a fourth field def inside the test) → `"+2"` after the second name.
- **Out of scope:**
  - Wiring either function into a component (T5, T6).
  - Marking random-draw fields in the name (ADR 067).
- **Done when:**
  - Every test above passes under `npx vitest run src/lib`.
  - In `frontend/`, `npx vitest run`, `npm run lint`, and `npm run build` are clean.
  - The commit contains only this task's hunks.
- **Commit:** `feat: capped name list and derived configuration name helpers (task 022 T4)`
- Notes: the "+2" test adds two field defs inside the test (Example, Note), not one: four names on the prompt side need a fifth field on the answer side, or the name is "" by the empty-side rule. `defaultConfigurationName` keeps a `?? ''` on the name lookup because `noUncheckedIndexedAccess` types it as possibly undefined; it is never reached.

### T5 — The configuration builder derives its default name (ADR 067) — depends on T4

- [ ] **Goal:** New configuration's Name input follows the board until the user types; Edit configuration keeps the stored name.
- **Files:**
  - `frontend/src/components/library/DeckConfigurationEditor.tsx`
  - `frontend/src/components/library/DeckConfigurationEditor.test.tsx`
- **Details:**
  - Replace the `name` state with the Contracts' `typedName`/`name` pair; the input binds to `name` and `onChange` sets `typedName` (and clears `nameError`, as today). Replace the timestamp comment with one stating ADR 067's tracking rule. Remove the `formatDateTime` import.
  - **Tests:** replace `prefills the name with the current local date-time, editable` with:
    - `the name follows the board until it is typed in`: at `/deck-configurations/new?deck=d1`, the Name input is `""`; assign Term → `prompt_fields`: still `""`; assign Meaning → `answer_fields`: `"Term → Meaning"`; assign Reading → `answer_pool`: `"Term → Meaning, Reading"`.
    - `a typed name stays through further assignments`: assign Term → `prompt_fields`, type `Recall` into Name, assign Meaning → `answer_fields`: the input reads `"Recall"`; clear it: it reads `""` and the "Give this config a name" hint shows.
    - `a typed name survives a deck change`: assign Term → `prompt_fields`, type `Recall`, pick Beta Deck and confirm: the input still reads `"Recall"`.
    - In `pre-populates the name and every row from the saved config`, add: after moving Reading to `answer_fields`, the input still reads `"Recall"`.
    - In `Save stays disabled with the reason shown…`, reword the comment on `expect(save).toBeEnabled()`: the name is derived once both sides have a field.
  - **Browser check** per AGENTS.md's Browser checks line, against the dev servers, at 390px: Library → a deck → Configurations → New configuration; the Name reads empty; assign one field to each side; the Name reads `<prompt> → <answer>`; assign a third field; the Name updates; type into Name; assign a fourth; the Name keeps the typed text; press Cancel. Nothing is saved or deleted. Record the outcome in Notes.
- **Out of scope:**
  - `PracticeCreatePage`'s name and rerun's name (MD-1).
  - Keeping a typed name across the "New deck…" round trip (lost today as well; the editor remounts).
  - Automatic numbering for a same-layout duplicate (ADR 067).
- **Done when:**
  - `grep -n "formatDateTime" frontend/src/components/library/DeckConfigurationEditor.tsx` prints nothing.
  - Every test named in Details passes; the duplicate-name test still passes unchanged.
  - The browser walk's outcome is in Notes.
  - In `frontend/`, `npx vitest run`, `npm run lint`, and `npm run build` are clean.
  - The commit contains only this task's hunks.
- **Commit:** `feat: new configuration derives its name from the board (task 022 T5)`
- Notes:

### T6 — Practice rows and the detail page name their configurations (MD-2, MD-3, MD-4) — depends on T3 and T4

- [ ] **Goal:** the overview row lists capped "Deck · Configuration" entries and no date; the detail page lists every deck as "Subject · Deck · Configuration".
- **Files:**
  - `frontend/src/components/practice/SessionDeckChips.tsx`
  - `frontend/src/components/practice/PracticeRunRow.tsx`
  - `frontend/src/pages/PracticeDetailsPage.tsx`
  - `frontend/src/pages/PracticeOverviewPage.test.tsx`
  - `frontend/src/pages/PracticeDetailsPage.test.tsx`
- **Details:**
  - Implement `SessionDeckChips`, the row and the detail page per Contracts. Rewrite the chips' doc comment for the two variants, and the row's ("carries deck/subject chips" becomes the MD-2 entries).
  - Both test files' `session()` fixtures gain `configuration_name: 'Config A'` on their deck entry.
  - **Tests in `PracticeOverviewPage.test.tsx`:**
    - Retitle `lists sessions with their status badge, deck/subject chips and created date` to `…deck · configuration entries and no date`: asserts `Shared Deck Name · Config A` and `Shared Deck Name · Config B` (give `betaRun`'s deck `configuration_name: 'Config B'`), and `queryByText('Aug 24, 2026')` is absent.
    - `a practice over three decks shows two entries and +1`: a session with three deck entries renders two chips and a chip reading `+1`, and the third deck's name is absent.
    - `a deck whose snapshot has no configuration name shows the deck alone`: `configuration_name: null` → a chip reading exactly `Shared Deck Name`.
  - **Tests in `PracticeDetailsPage.test.tsx`:**
    - In `renders the name, status, created date and deck chips`: the chip reads `Alpha · Shared Deck Name · Config A`; the date assertion stays.
    - `lists every deck with no cap`: three deck entries → three chips, no `+1`.
    - `a deck with no configuration name shows subject and deck`: `configuration_name: null` → `Alpha · Shared Deck Name`.
  - **Browser check** at 390px against the dev servers: Practice shows each row's name, badge and entries with no date; a row with a date-named configuration shows that name; open one practice: every deck listed with its subject. Create and delete nothing. Record the outcome in Notes.
- **Out of scope:**
  - A link from a chip to its configuration.
  - Changing `ConfigurationPickList`, `SelectedConfigurationList` or `DeckConfigurationRow`.
  - Renaming `SessionDeckChips`.
- **Done when:**
  - `grep -n "formatDate\b" frontend/src/components/practice/PracticeRunRow.tsx` prints nothing.
  - `grep -n "variant=" frontend/src/components/practice/PracticeRunRow.tsx frontend/src/pages/PracticeDetailsPage.tsx` shows `"summary"` in the row and `"full"` on the page.
  - Every test named in Details passes; the browser walk's outcome is in Notes.
  - `grep -rn "TODO(defer:" app/ frontend/src/` shows no new entry.
  - In `frontend/`, `npx vitest run`, `npm run lint`, and `npm run build` are clean.
  - The commit contains only this task's hunks.
- **Commit:** `feat: practice rows and detail name their configurations (task 022 T6)`
- Notes:

## Deferred — do not build

- None.
