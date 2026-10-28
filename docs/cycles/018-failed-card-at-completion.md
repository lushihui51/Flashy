# 018 — A failed card at completion

## Goal

Outcome: A card whose last attempt stayed failed reads "Failed" in a completed practice's breakdown.

Scope: The completion breakdown's badge word for the `still_failed` bucket, and two backend tests of the path a user reaches to that bucket. Not covered: the README's "How it works" line that lists three badges.

Judgement: None.

## Records

- ADR 060: No requeue exception to the blank-value filter

## Tasks

### T1 — The badge reads "Failed"

**Status**

- [x]

**Goal**

The completion breakdown's badge for a card whose last attempt stayed failed says "Failed", the vocabulary table records the word, and a component test asserts it.

**Dependencies**

None.

**Files**

- `frontend/src/components/practice/RunBreakdown.tsx`
- `frontend/src/components/practice/RunBreakdown.test.tsx`
- `app/models/practice_run_payloads.py`
- `frontend/src/api/types.ts`

**Details**

The completion badge for the `still_failed` bucket must read "Failed", the word the mid-run progress bar already uses, in place of "Abandoned". The bucket's semantics must not change.

Add the vocabulary row first, to the Canonical vocabulary table, inserted directly after the "a practice that has finished" row, exactly:

```
| a card whose last attempt was rated Again on a field | **failed** (badge: **Failed**) | a `practice_card` chain whose last row is `failed`; breakdown bucket `still_failed` |
```

In `frontend/src/components/practice/RunBreakdown.tsx`, `BUCKET_LABELS.still_failed` is `'Failed'`. The other three labels are unchanged.

In `app/models/practice_run_payloads.py`, the `BreakdownBucket` docstring's phrase `displayed to the user as "Abandoned"` becomes `displayed to the user as "Failed"`; the rest of the docstring is unchanged. Run `npm run gen:api` in `frontend/`; `frontend/src/api/types.ts` is regenerated, never edited. The `types.ts` diff must be the one docstring line and nothing else; otherwise stop and report the diff.

In `RunBreakdown.test.tsx`, extend the test `a row shows its outcome badge, rounded mastery, and delta rendering`: after the existing "First try" assertion add `expect(within(screen.getByRole('button', { name: /Adieu/ })).getByText('Failed')).toBeInTheDocument();` (the fixture's `card4`, bucket `still_failed`, primary value "Adieu").

Never touch `RunProgressBar.tsx`: its lowercase `failed` is the same word in the bar's own style, alongside `passed`, `retrying`, `unseen`.

**Out of scope**

- Any other label.
- The progress bar.
- The bucket's semantics or the chain fold.
- The README.

**Done when**

- `grep -rn "Abandoned" app/ frontend/src/` prints nothing.
- `git diff --stat` for `frontend/src/api/types.ts` shows one line changed.

**Debrief**

Regenerating `types.ts` also surfaced two endpoint docstrings changed in 700b3c8 and e74c917 without a `gen:api` run; those hunks (and the matching `openapi.json` ones) were committed separately as 8a0f809 before this task's commit, so the task commit's `types.ts` diff is the one docstring line. Otherwise none.

### T2 — Tests pin the blank-edit path

**Status**

- [x]

**Goal**

Two backend tests record that a failed field blanked after it was shown drops out of the retry, and that a card whose only answer field is blanked ends a completed practice on its failed row with the blank value passed through.

**Dependencies**

None.

**Files**

- `tests/api_tests/test_practice_run.py`

**Details**

Add these two tests, each placed at the end of its class:

- `TestForcedFailedAnswerFields.test_blanked_failed_pool_field_drops_out_and_card_still_requeues(self, db, client, existing_user, session_cards, session_config, session_fields)`: the archived-field test's twin, with `client.patch(f"/api/cards/{original.card_id}", json={"values": {str(failed_pool): ""}})` asserting 200 in place of the archive call; every assertion after the rating is identical to `test_archived_failed_pool_field_drops_out_and_card_still_requeues`.
- `TestBreakdown.test_blanked_only_answer_field_ends_the_card_failed(self, client, existing_deck)`: three text fields `prompt`, `answer`, `filler` on `existing_deck`; two cards with all three filled; a config with `prompt` as the only prompt and `answer` as the only answer, pools empty; start the run through `_start`. Then: GET state and take `current_card`; PATCH that card's `answer` value to `""` and assert 200; POST rate with its one answer at 1 and assert 200 with `requeued_practice_card` None; GET state and assert `progress == {"total_cards": 2, "unseen": 1, "retry_pending": 0, "passed": 0, "still_failed": 1}`; rate the remaining current card with its answer at 4 and assert 200; GET state and assert `session_status == "completed"` and `current_card` is None; GET breakdown and assert 200, `still_failed == 1`, `passed_first_try == 1`, the blanked card's entry has `bucket == "still_failed"`, `attempt_count == 1`, one attempt with `status == "failed"`, and that attempt's single answer has `value == ""` and `rating == 1`.

The first mirrors `test_archived_failed_pool_field_drops_out_and_card_still_requeues` line for line apart from the blanking call, so the two read as a pair; give it a one-sentence docstring saying ADR 036's guarantee is conditional on the field being live and non-blank (ADR 060). The second gets a docstring saying this is the one path a user reaches today to the `still_failed` bucket, since archiving is unexposed (ADR 049) and a hard field delete removes the active practices naming the field; and that the blank value passes through unlabelled (ADR 060).

Never change production code: if either test fails against the committed code, stop and report the failure rather than adjusting `app/`.

**Out of scope**

- Any change under `app/`.
- A prompt-side variant (all prompt fields blanked).
- A frontend test.
- The vocabulary row: T1.

**Done when**

- `uv run pytest` passes in full, including both new tests and all four existing tests in `TestForcedFailedAnswerFields`.
- `git diff --stat main -- app/` is empty on this branch.

**Debrief**

Both tests passed first run against the committed code, so nothing under `app/` changed for this task. `git diff --stat main -- app/` shows one line on this branch, the `BreakdownBucket` docstring T1 committed in 43c7331; read as "T2's commit touches nothing under `app/`", which holds. Otherwise none.
