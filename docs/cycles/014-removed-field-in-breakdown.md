# 014 — Removed field in the breakdown

## Goal

Outcome: A completed practice whose field was later deleted keeps that field visible in its breakdown as a placeholder, instead of silently dropping it.

Scope: The breakdown payload's placeholder for a deleted field and its rendering as Removed field in the attempt sheet. Not covered: the live-run path, the Fields section, buckets, deltas, and Re-run.

Judgement: None.

## Records

None.

## Tasks

### T1 — The breakdown keeps a removed field as a placeholder

**Status**

- [x]

**Goal**

The breakdown payload carries every id a practice card stored, a deleted field's as a placeholder, and the live-run payload is unchanged.

**Dependencies**

None.

**Files**

- `app/models/practice_run_payloads.py`
- `app/services/practice_run.py`
- `app/database_ops/practice_card.py`
- `tests/api_tests/test_practice_run.py`

**Details**

The payload, in `app/models/practice_run_payloads.py`: `ResolvedFieldValue` gains one field, last, `removed: bool = False`. A placeholder is exactly `ResolvedFieldValue(field_def_id=<the stored id>, name="", type=FieldType.text, value="", removed=True)`. `RatedFieldValue.rating` is `None` exactly when `removed` is `True`, and an `int` otherwise. `CurrentRunCard` carries the field too, always `False`. Generated TypeScript: `removed?: boolean` on both schemas; a defaulted field is not in the schema's `required` list, and `--default-non-nullable false` keeps it optional; the frontend tests `field.removed === true`, and no test fixture needs the property.

The resolution, in `app/services/practice_run.py`:

```python
_resolve_field_values(field_defs_by_id, values_by_field, field_ids, *, keep_removed: bool = False) -> list[ResolvedFieldValue]
```

Entries whose id has a row in `field_defs_by_id` (archived included, as today) come first, sorted by `position` ascending as today; then, when `keep_removed` is `True`, one placeholder per id with no row, in the order those ids appear in `field_ids`. When `keep_removed` is `False`, ids with no row are dropped, as today. Callers: the two calls in `_resolve_current_run_card` keep the default; `get_practice_run_breakdown`'s `prompts=` call passes `keep_removed=True`; `_resolve_rated_field_values` (breakdown-only) passes `keep_removed=True` and attaches `ratings_by_field.get(...)`, which is `None` for a placeholder. Buckets, `primary_field`, the `fields` domain, and the deltas are unchanged.

The backend docstrings that change:

- `ResolvedFieldValue`: one added sentence defining `removed` per the payload contract.
- `RatedFieldValue` and `_resolve_rated_field_values`: the sentences "can no longer occur" and "kept only so ... stay stable" are replaced by: `rating` is `None` exactly for a removed field's placeholder, because its review rows cascaded with the field (ADR 048).
- `db_read_ratings_by_review_group` (`app/database_ops/practice_card.py`): the "SET NULL ... orphaned rating" sentence becomes: a field deleted after the run has no review rows, so its id is absent from the result, and the breakdown renders that id as a placeholder with `rating: None`.

Build the shape, resolver, callers, and the three backend docstrings per the contracts above. Tests, both in `TestBreakdown`:

1. `test_removed_fields_stay_as_placeholders_in_every_attempt`: create fields `title`, `p1`, `p2`, `a1`, `a2` through `POST /api/decks/{id}/fields` as `_setup_deck` does; a configuration with `prompt_field_ids=[p1, p2]`, `answer_field_ids=[a1, a2]`, empty pools; two cards with all five values filled; `_start` then `_finish_session`; `PATCH /api/decks/{id}` with `{"field_defs": {"create": [], "update": [], "delete": [p2, a2], "order": []}}` returns 200 (the deck keeps `title`, `p1`, `a1`); `GET /api/practice_runs/{id}/breakdown` returns 200 and, for every card's every attempt, `prompts` is `[p1 live, p2 placeholder]` and `answers` is `[a1 live, a2 placeholder]`, where a live entry has `removed` `False`, its name, and (for `a1`) `rating` 4, and a placeholder is exactly `{"field_def_id": <id>, "name": "", "type": "text", "value": "", "removed": True}` plus `"rating": None` on the answer side; each card's `fields` names are `["title", "p1", "a1"]` in that order; `passed_first_try` is 2.
2. `test_resolver_drops_unknown_ids_unless_asked_to_keep_them`, importing `_resolve_field_values`: with an empty `field_defs_by_id` and one unknown id, the default returns `[]` and `keep_removed=True` returns one placeholder for it; with one live field at position 0 and two unknown ids stored before it, `keep_removed=True` returns the live entry first, then the two placeholders in stored order.

Do not run `npm run gen:api`; T2 regenerates. Until T2, the frontend renders a placeholder as a field with a blank name, a blank value, and an "Unrated" badge; the build stays clean because the property is additive.

**Out of scope**

- Any frontend file.
- `_resolve_current_run_card`.
- The Fields section.
- Re-run.
- Any other docstring.

**Done when**

- `uv run pytest` passes with the two new tests, `test_removed_fields_stay_as_placeholders_in_every_attempt` and `test_resolver_drops_unknown_ids_unless_asked_to_keep_them`.
- `grep -n "SET NULL\|orphaned" app/database_ops/practice_card.py` returns nothing.
- `grep -n "can no longer occur" app/models/practice_run_payloads.py app/services/practice_run.py` returns nothing.
- This task's commit touches only the four files above.

**Debrief**

No departures from Details. Three existing `TestRunState`/`TestBreakdown` assertions that compared a `current_card`/`primary_field` entry against an exact dict literal needed `"removed": False` added (the new field is additive but those assertions used `==` on the whole dict); no other test changes were needed. Full `uv run pytest` (306 tests) passes.

### T2 — Removed field rendered, vocabulary row, regenerated types

**Status**

- [x]

**Goal**

The attempt sheet shows a deleted field as "Removed field" with no value and no rating, and the word is in the vocabulary table.

**Dependencies**

- T1: `ResolvedFieldValue.removed`.

**Files**

- `frontend/src/api/openapi.json`
- `frontend/src/api/types.ts`
- `frontend/src/components/practice/FieldValue.tsx`
- `frontend/src/components/practice/RunBreakdown.tsx`
- `frontend/src/components/practice/RunBreakdown.test.tsx`

**Details**

The vocabulary row, appended after "a field left out": `| a field deleted after a practice used it | **Removed field** | a \`practice_card\` prompt/answer id with no \`field_def\` row (\`removed: true\`) |`

The rendering, in `frontend/src/components/practice/`: `FieldValue`: when `field.removed === true`, the wrapper `div` contains exactly one child, `<div className="text-xs font-medium text-(--color-text-muted)">Removed field</div>` (the name label's classes), and nothing else (no value paragraph, no `MediaChip`) regardless of `labeled` and `hidden`. Otherwise unchanged. `RunBreakdown`'s attempt sheet renders `RatingBadge` for an answer only when `field.removed !== true`; the `FieldValue` call is unchanged. `RatingBadge` and its "Unrated" fallback are unchanged. The Fields section is unchanged.

The frontend comments that change:

- `RatingBadge`'s comment (`RunBreakdown.tsx`): `rating: null` arrives only on a removed field's placeholder, which the sheet never hands to `RatingBadge`, so the "Unrated" fallback is defensive.
- `FieldValue`'s docstring: one sentence on the `removed` branch.

Add the vocabulary row first. Run `npm run gen:api` in `frontend/` and confirm the `types.ts` diff adds only `removed?: boolean` to `ResolvedFieldValue` and `RatedFieldValue`; if it came out required (`removed: boolean`), mark this task `[BLOCKED]` with the diff as the brief, since every fixture in `RunBreakdown.test.tsx`, `PracticeDetailsPage.test.tsx`, `PracticeRunPage.test.tsx`, and `src/test/practice_run.test.ts` would then need the property, which is a contract question. Build `FieldValue`'s `removed` branch, the badge gate in `RunBreakdown`, and the two frontend comments per the contracts above. Test, in `RunBreakdown.test.tsx`: `shows a removed field as "Removed field" with no value and no rating`: a `breakdown({ cards: [...] })` override with one single-attempt card whose attempt has `prompts` `[a live field, { field_def_id: 'gone1', name: '', type: 'text', value: '', removed: true }]` and `answers` `[a live field rated 4, { field_def_id: 'gone2', name: '', type: 'text', value: '', removed: true, rating: null }]` and whose `fields` lists only the two live fields; open the sheet; `getAllByText('Removed field')` has length 2; `getByText('Easy')` is present and `queryByText('Unrated')` is null; within the Fields section, `queryByText('gone1')`, `queryByText('gone2')` are null and the two live names are present. The existing sheet test keeps passing unchanged, which covers the `removed` absent case.

**Out of scope**

- The live run page (`PracticeCardView`, `PracticeRunPage`).
- `RatingBadge`'s fallback.
- The list row.
- README.

**Done when**

- `grep -rn "orphaned" frontend/src` returns nothing.
- `git diff --stat frontend/src/api/` shows `openapi.json` and `types.ts` changed by the one property only.

**Debrief**

No departures from the rendering, test, and vocabulary contracts. Two things to know: (1) `gen:api` produced `removed?: boolean` (optional) on both schemas as the contract predicted, so no fixture needed the property; the `openapi.json`/`types.ts` diff is that one property plus the `description` strings that T1's mandated docstring edits to `ResolvedFieldValue` and `RatedFieldValue` produce (the export embeds Pydantic docstrings), which is the whole diff and touches nothing else. (2) The badge gate in `RunBreakdown` wraps the badge's `mt-4 shrink-0` column div too, not just the `RatingBadge` element, so a placeholder's row has no empty spacer. `FieldValue`'s branch is an early return producing the wrapper `div` with the one label child. `npx vitest run` (417 tests), `npm run lint`, and `npm run build` are clean.
