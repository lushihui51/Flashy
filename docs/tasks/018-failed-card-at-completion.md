# 018 — A failed card at completion

Fix cycle from the 2026-09-28 /investigate and /plan session, prompted by a README review that found the completion breakdown's fourth badge, "Abandoned", undocumented in the README and reachable through a path no decision record names. The investigation showed: the mid-run progress bar and the completed breakdown give the same outcome bucket two different words; ADR 013 and ADR 029 describe the bucket's trigger as a field archived mid-practice, but the archive endpoint is unexposed since ADR 049 and a hard field delete removes the active practices naming the field, so the one trigger a user reaches is clearing a card's value while a practice is using it (ADR 026's filter then drops the field from the retry); and no test, frontend or backend, pins either the badge text or that path. Branch: `fix/failed-card-at-completion`, cut from `main` once the `fix/requeue-end-of-queue` PR (task 017) has merged, since T2 edits the same test module.

Earlier task files affected by name only, for the next sync's Superseded bullets: task 006's "Chain and bucket rules" contract and T8's Details name the badge "Abandoned"; task 004's vocabulary table gains a row through T1 here. Recorded by /justify: ADR 029's display wording changes (MD-1); ADR 013's stale-snapshot consequence and ADR 029's trigger description carry Status notes naming the blank edit as the reachable trigger (ADR 060); ADR 036 is unchanged in substance, its "still live and non-blank" condition being exactly ADR 060's rule. The README's "How it works" line that lists three badges is /distill's, not a task here.

## ADRs

Decisions this file implements; full context and rejected alternatives live in the ADRs.

- **ADR 060 — A value cleared mid-practice drops out of the retry**: the blank-value filter (ADR 026) has no requeue exception; a failed field cleared after it was shown drops out of the retry, a side left with nothing produces no retry, the card ends the practice on its failed row, and a cleared value renders empty with no placeholder. Amends the trigger ADR 013 and ADR 029 describe; confirms ADR 036.

## Minor decisions

- **MD-1**: The completion badge for the `still_failed` bucket reads "Failed", the word the mid-run progress bar already uses, in place of "Abandoned"; "failed" means the user rated a field Again, and a card with any failed field is a failed card. Bucket semantics unchanged (ADR 028, ADR 029; ADR 029's Status records the wording). Rejected: keeping "Abandoned"; removing the bucket, which ADR 060 keeps reachable.

## Contracts

### Vocabulary (MD-1, ADR 021)

- New row in `docs/tasks/004-practice-setup.md`'s Canonical vocabulary table, inserted directly after the "a practice that has finished" row, exactly:
  `| a card whose last attempt was rated Again on a field | **failed** (badge: **Failed**) | a `practice_card` chain whose last row is `failed`; breakdown bucket `still_failed` |`
- `frontend/src/components/practice/RunBreakdown.tsx`: `BUCKET_LABELS.still_failed` is `'Failed'`. The other three labels are unchanged.
- `app/models/practice_run_payloads.py`, `BreakdownBucket` docstring: the phrase `displayed to the user as "Abandoned"` becomes `displayed to the user as "Failed"`; the rest of the docstring is unchanged. `frontend/src/api/types.ts` is regenerated, never edited.

### Tests that pin ADR 060

- `tests/api_tests/test_practice_run.py`, `TestForcedFailedAnswerFields.test_blanked_failed_pool_field_drops_out_and_card_still_requeues(self, db, client, existing_user, session_cards, session_config, session_fields)`: the archived-field test's twin, with `client.patch(f"/api/cards/{original.card_id}", json={"values": {str(failed_pool): ""}})` asserting 200 in place of the archive call; every assertion after the rating is identical to `test_archived_failed_pool_field_drops_out_and_card_still_requeues`.
- `tests/api_tests/test_practice_run.py`, `TestBreakdown.test_blanked_only_answer_field_ends_the_card_failed(self, client, existing_deck)`: three text fields `prompt`, `answer`, `filler` on `existing_deck`; two cards with all three filled; a config with `prompt` as the only prompt and `answer` as the only answer, pools empty; start the run through `_start`. Then: GET state and take `current_card`; PATCH that card's `answer` value to `""` and assert 200; POST rate with its one answer at 1 and assert 200 with `requeued_practice_card` None; GET state and assert `progress == {"total_cards": 2, "unseen": 1, "retry_pending": 0, "passed": 0, "still_failed": 1}`; rate the remaining current card with its answer at 4 and assert 200; GET state and assert `session_status == "completed"` and `current_card` is None; GET breakdown and assert 200, `still_failed == 1`, `passed_first_try == 1`, the blanked card's entry has `bucket == "still_failed"`, `attempt_count == 1`, one attempt with `status == "failed"`, and that attempt's single answer has `value == ""` and `rating == 1`.

## Tasks

T1 and T2 share no files and may run in parallel sessions.

### T1 — The badge reads "Failed" (MD-1) — no dependencies

- [x] **Goal:** the completion breakdown's badge for a card whose last attempt stayed failed says "Failed", the vocabulary table records the word, and a component test asserts it.
- **Files:** `docs/tasks/004-practice-setup.md`, `frontend/src/components/practice/RunBreakdown.tsx`, `frontend/src/components/practice/RunBreakdown.test.tsx`, `app/models/practice_run_payloads.py`, `frontend/src/api/types.ts` (regenerated).
- **Details:** Add the vocabulary row first, per the Contracts (ADR 021). Change `BUCKET_LABELS.still_failed` per the Contracts. Change the `BreakdownBucket` docstring per the Contracts and run `npm run gen:api` in `frontend/`; the `types.ts` diff must be the one docstring line and nothing else, otherwise stop and report the diff. In `RunBreakdown.test.tsx`, extend the test `a row shows its outcome badge, rounded mastery, and delta rendering`: after the existing "First try" assertion add `expect(within(screen.getByRole('button', { name: /Adieu/ })).getByText('Failed')).toBeInTheDocument();` (the fixture's `card4`, bucket `still_failed`, primary value "Adieu"). Do not touch `RunProgressBar.tsx`: its lowercase `failed` is the same word in the bar's own style, alongside `passed`, `retrying`, `unseen`.
- **Out of scope:** any other label; the progress bar; the bucket's semantics or the chain fold; the README (/distill); ADR 029's text (/justify); task 006's "Abandoned" mentions (/sync).
- **Done when:** in `frontend/`, `npx vitest run`, `npm run lint`, and `npm run build` are clean; `uv run pytest` passes; `grep -rn "Abandoned" app/ frontend/src/ docs/tasks/004-practice-setup.md` prints nothing; `git diff --stat` for `frontend/src/api/types.ts` shows one line changed; the commit contains only this task's hunks.
- Notes: regenerating `types.ts` also surfaced two endpoint docstrings changed in 700b3c8 and e74c917 without a `gen:api` run; those hunks (and the matching `openapi.json` ones) were committed separately as 8a0f809 before this task's commit, so the task commit's `types.ts` diff is the one docstring line. Otherwise none.

### T2 — Tests pin the blank-edit path (ADR 060) — no dependencies

- [x] **Goal:** two backend tests record that a failed field blanked after it was shown drops out of the retry, and that a card whose only answer field is blanked ends a completed practice on its failed row with the blank value passed through.
- **Files:** `tests/api_tests/test_practice_run.py`.
- **Details:** Add the two tests per the Contracts, each placed at the end of its class. The first mirrors `test_archived_failed_pool_field_drops_out_and_card_still_requeues` line for line apart from the blanking call, so the two read as a pair; give it a one-sentence docstring saying ADR 036's guarantee is conditional on the field being live and non-blank (ADR 060). The second gets a docstring saying this is the one path a user reaches today to the `still_failed` bucket, since archiving is unexposed (ADR 049) and a hard field delete removes the active practices naming the field; and that the blank value passes through unlabelled (ADR 060). No production code changes: if either test fails against the committed code, stop and report the failure rather than adjusting `app/`.
- **Out of scope:** any change under `app/`; a prompt-side variant (all prompt fields blanked), which ADR 060 covers by the same rule but no decision asked to pin; a frontend test; the vocabulary row (T1).
- **Done when:** `uv run pytest` passes in full, including both new tests and all four existing tests in `TestForcedFailedAnswerFields`; `git diff --stat main -- app/` is empty on this branch; the commit contains only this task's hunks.
- Notes: both tests passed first run against the committed code, so nothing under `app/` changed for this task. `git diff --stat main -- app/` shows one line on this branch, the `BreakdownBucket` docstring T1 committed in 43c7331; read as "T2's commit touches nothing under `app/`", which holds. Otherwise none.
