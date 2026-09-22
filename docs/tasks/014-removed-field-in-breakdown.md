# 014 — Removed field in the breakdown

The follow-up cycle from the 2026-09-22 /plan session: a completed practice whose field was later deleted keeps that field visible in its breakdown as a placeholder, instead of silently dropping it. Branch: `feat/removed-field-in-breakdown`, cut from `feat/deletion-drops-influence` at `b0b1e44` or later (or from `main` once that branch's PR merges); it needs task 013 T1–T8 present.

What the page shows today, verified in code on 2026-09-22 (this is the finding the cycle answers): a field delete leaves a completed practice's run, snapshot, and practice cards in place, and the practice cards still hold the dead field id in `prompts`/`answers`. The breakdown resolves each attempt's ids against the deck's field rows and drops any id with no row (`app/services/practice_run.py:405-420`), so the field vanishes from every attempt with no marker; its ratings went with its review rows (ADR 048). Attempt status is stored on the practice card, so a Failed attempt whose only Again was on the deleted field shows only Good/Easy badges, and an attempt whose sole answer was that field shows no answers. The Fields section lists the deck's current active fields with mastery from the rebuilt ledger, re-attributed to the run through its surviving practice cards (`app/services/mastery.py:210-243`). Re-run of a single-deck practice whose snapshot names the field fails with `nothing_to_rerun` (`app/services/practice_run.py:318-330`). ADR 049's Consequences accept the changed history but its Decision says the breakdown "tolerates" the dead id, which understates the gap.

## ADRs

Decisions this file implements; full context and rejected alternatives live in the ADRs.

- **ADR 052 — A removed field stays visible in a completed practice's breakdown**: the breakdown's resolution keeps an attempt field whose row no longer exists as a placeholder (`removed: true`, empty name and value, `rating: null`) after the live fields on its side, rendered as **Removed field** with no value and no rating badge; the live-run path keeps dropping unknown ids; the Fields section, buckets, deltas, and Re-run are unchanged. Amends ADR 049.

## Minor decisions

- **MD-1**: The deck editor's save confirm keeps the clause `deletes {n} active practices`, because under ADR 052 only active practices are deleted on a field delete and the qualifier tells the user their completed practices survive. Already applied in commit `50266ae` and recorded in task 013's Superseded since; no task here. Rejected: dropping the qualifier, proposed on the premise that completed practices are deleted too, which they are not.

## Contracts

### Payload (`app/models/practice_run_payloads.py`)

`ResolvedFieldValue` gains one field, last, `removed: bool = False`. A placeholder is exactly `ResolvedFieldValue(field_def_id=<the stored id>, name="", type=FieldType.text, value="", removed=True)`. `RatedFieldValue.rating` is `None` exactly when `removed` is `True`, and an `int` otherwise. `CurrentRunCard` carries the field too, always `False`. Generated TypeScript: `removed?: boolean` on both schemas — a defaulted field is not in the schema's `required` list (as `SubjectRead.description` shows today), and `--default-non-nullable false` keeps it optional; the frontend tests `field.removed === true`, and no test fixture needs the property.

### Resolution (`app/services/practice_run.py`)

`_resolve_field_values(field_defs_by_id, values_by_field, field_ids, *, keep_removed: bool = False) -> list[ResolvedFieldValue]`: entries whose id has a row in `field_defs_by_id` (archived included, as today) come first, sorted by `position` ascending as today; then, when `keep_removed` is `True`, one placeholder per id with no row, in the order those ids appear in `field_ids`. When `keep_removed` is `False`, ids with no row are dropped, as today. Callers: the two calls in `_resolve_current_run_card` keep the default; `get_practice_run_breakdown`'s `prompts=` call passes `keep_removed=True`; `_resolve_rated_field_values` (breakdown-only) passes `keep_removed=True` and attaches `ratings_by_field.get(...)`, which is `None` for a placeholder. Buckets, `primary_field`, the `fields` domain, and the deltas are unchanged.

### Rendering (`frontend/src/components/practice/`)

`FieldValue`: when `field.removed === true`, the wrapper `div` contains exactly one child, `<div className="text-xs font-medium text-(--color-text-muted)">Removed field</div>` (the name label's classes), and nothing else — no value paragraph, no `MediaChip` — regardless of `labeled` and `hidden`. Otherwise unchanged. `RunBreakdown`'s attempt sheet renders `RatingBadge` for an answer only when `field.removed !== true`; the `FieldValue` call is unchanged. `RatingBadge` and its "Unrated" fallback are unchanged. The Fields section is unchanged.

### Vocabulary (`docs/tasks/004-practice-setup.md`, ADR 021)

Row appended after "a field left out": `| a field deleted after a practice used it | **Removed field** | a \`practice_card\` prompt/answer id with no \`field_def\` row (\`removed: true\`) |`

### Docstrings and comments that change

- `ResolvedFieldValue`: one added sentence defining `removed` per the payload contract.
- `RatedFieldValue` and `_resolve_rated_field_values`: the task 013 MD-4 sentences ("can no longer occur", "kept only so ... stay stable") are replaced by: `rating` is `None` exactly for a removed field's placeholder, because its review rows cascaded with the field (ADR 048).
- `db_read_ratings_by_review_group` (`app/database_ops/practice_card.py`): the "SET NULL ... orphaned rating" sentence becomes: a field deleted after the run has no review rows, so its id is absent from the result, and the breakdown renders that id as a placeholder with `rating: None`.
- `RatingBadge`'s comment (`RunBreakdown.tsx`): `rating: null` arrives only on a removed field's placeholder, which the sheet never hands to `RatingBadge`, so the "Unrated" fallback is defensive.
- `FieldValue`'s docstring: one sentence on the `removed` branch.

## Tasks

T2 depends on T1; nothing runs in parallel.

### T1 — The breakdown keeps a removed field as a placeholder (ADR 052) — no dependencies

- [x] **Goal:** the breakdown payload carries every id a practice card stored, a deleted field's as a placeholder, and the live-run payload is unchanged.
- **Files:** `app/models/practice_run_payloads.py`, `app/services/practice_run.py`, `app/database_ops/practice_card.py`, `tests/api_tests/test_practice_run.py`.
- **Details:** Shape, resolver, callers, and the three backend docstrings per Contracts. Tests, both in `TestBreakdown`: (1) `test_removed_fields_stay_as_placeholders_in_every_attempt`: create fields `title`, `p1`, `p2`, `a1`, `a2` through `POST /api/decks/{id}/fields` as `_setup_deck` does; a configuration with `prompt_field_ids=[p1, p2]`, `answer_field_ids=[a1, a2]`, empty pools; two cards with all five values filled; `_start` then `_finish_session`; `PATCH /api/decks/{id}` with `{"field_defs": {"create": [], "update": [], "delete": [p2, a2], "order": []}}` returns 200 (the deck keeps `title`, `p1`, `a1`); `GET /api/practice_runs/{id}/breakdown` returns 200 and, for every card's every attempt, `prompts` is `[p1 live, p2 placeholder]` and `answers` is `[a1 live, a2 placeholder]`, where a live entry has `removed` `False`, its name, and (for `a1`) `rating` 4, and a placeholder is exactly `{"field_def_id": <id>, "name": "", "type": "text", "value": "", "removed": True}` plus `"rating": None` on the answer side; each card's `fields` names are `["title", "p1", "a1"]` in that order; `passed_first_try` is 2. (2) `test_resolver_drops_unknown_ids_unless_asked_to_keep_them`, importing `_resolve_field_values`: with an empty `field_defs_by_id` and one unknown id, the default returns `[]` and `keep_removed=True` returns one placeholder for it; with one live field at position 0 and two unknown ids stored before it, `keep_removed=True` returns the live entry first, then the two placeholders in stored order. Do not run `npm run gen:api`; T2 regenerates. Until T2, the frontend renders a placeholder as a field with a blank name, a blank value, and an "Unrated" badge; the build stays clean because the property is additive.
- **Out of scope:** any frontend file; `_resolve_current_run_card`; the Fields section; Re-run; any other docstring.
- **Done when:** `uv run pytest` passes with the two new tests; `grep -n "SET NULL\|orphaned" app/database_ops/practice_card.py` returns nothing; `grep -n "can no longer occur" app/models/practice_run_payloads.py app/services/practice_run.py` returns nothing; this task's commit touches only the four files above.
- Notes: none — implemented per Contracts and Details as written. Three existing `TestRunState`/`TestBreakdown` assertions that compared a `current_card`/`primary_field` entry against an exact dict literal needed `"removed": False` added (the new field is additive but those assertions used `==` on the whole dict); no other test changes were needed. Full `uv run pytest` (306 tests) passes.

### T2 — Removed field rendered, vocabulary row, regenerated types (ADR 052) — after T1

- [x] **Goal:** the attempt sheet shows a deleted field as "Removed field" with no value and no rating, and the word is in the vocabulary table.
- **Files:** `docs/tasks/004-practice-setup.md`, `frontend/src/api/openapi.json`, `frontend/src/api/types.ts`, `frontend/src/components/practice/FieldValue.tsx`, `frontend/src/components/practice/RunBreakdown.tsx`, `frontend/src/components/practice/RunBreakdown.test.tsx`.
- **Details:** Add the vocabulary row first (ADR 021). Run `npm run gen:api` in `frontend/` and confirm the `types.ts` diff adds only `removed?: boolean` to `ResolvedFieldValue` and `RatedFieldValue`; if it came out required (`removed: boolean`), mark this task `[BLOCKED]` with the diff as the brief, since every fixture in `RunBreakdown.test.tsx`, `PracticeDetailsPage.test.tsx`, `PracticeRunPage.test.tsx`, and `src/test/practice_run.test.ts` would then need the property, which is a contract question. `FieldValue`'s `removed` branch, the badge gate in `RunBreakdown`, and the two frontend comments per Contracts. Test, in `RunBreakdown.test.tsx`: `shows a removed field as "Removed field" with no value and no rating` — a `breakdown({ cards: [...] })` override with one single-attempt card whose attempt has `prompts` `[a live field, { field_def_id: 'gone1', name: '', type: 'text', value: '', removed: true }]` and `answers` `[a live field rated 4, { field_def_id: 'gone2', name: '', type: 'text', value: '', removed: true, rating: null }]` and whose `fields` lists only the two live fields; open the sheet; `getAllByText('Removed field')` has length 2; `getByText('Easy')` is present and `queryByText('Unrated')` is null; within the Fields section, `queryByText('gone1')`, `queryByText('gone2')` are null and the two live names are present. The existing sheet test keeps passing unchanged, which covers the `removed` absent case.
- **Out of scope:** the live run page (`PracticeCardView`, `PracticeRunPage`); `RatingBadge`'s fallback; the list row; README.
- **Done when:** in `frontend/`, `npx vitest run`, `npm run lint`, and `npm run build` are clean; `grep -rn "orphaned" frontend/src` returns nothing; `git diff --stat frontend/src/api/` shows `openapi.json` and `types.ts` changed by the one property only; `grep -c "Removed field" docs/tasks/004-practice-setup.md` prints 1.
- Notes: none against the rendering, test, and vocabulary contracts. Two things to know: (1) `gen:api` produced `removed?: boolean` (optional) on both schemas as the contract predicted, so no fixture needed the property; the `openapi.json`/`types.ts` diff is that one property plus the `description` strings that T1's mandated docstring edits to `ResolvedFieldValue` and `RatedFieldValue` produce (the export embeds Pydantic docstrings), which is the whole diff and touches nothing else. (2) The badge gate in `RunBreakdown` wraps the badge's `mt-4 shrink-0` column div too, not just the `RatingBadge` element, so a placeholder's row has no empty spacer. `FieldValue`'s branch is an early return producing the wrapper `div` with the one label child. `npx vitest run` (417 tests), `npm run lint`, and `npm run build` are clean.
