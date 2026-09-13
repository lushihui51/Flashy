# 009 — Practice run mechanics: rename, CI, requeue rules, rerun, lineage

Groundwork cycle from the 2026-08-28/29 /plan session: the `practice_session` → `practice_run` rename, a CI workflow, the requeue guarantees (ADR 036/037), rerun without deletion (ADR 039), and config lineage (ADR 040). Branch: `feat/practice-run-mechanics`, from `main` after the 006 PR merges. The mastery ledger and delta UI from the same /plan session are task file 010, which depends on this cycle landing first.

Note on 006: ADR 039 deliberately reverses behavior 006's T4/T9 built and tested (rerun deleting the original session). Those tasks stay checked as history; T5 below supersedes their behavior and rewrites their tests.

## ADRs

Decisions this file implements; full context and rejected alternatives live in the ADRs.

- **ADR 036 — Failed answer fields are guaranteed on requeue**: the retry force-includes every "Again"-rated answer field that is still live and non-blank, filling the drawn pool count ahead of sampling; also records the weighted-not-argmin sampling principle from task 001.
- **ADR 037 — A spacing floor keeps retries from resurfacing immediately**: a retry surfaces only after `RETRY_SPACING_FLOOR = 3` other pending cards, as a clamp on mastery insertion; end-of-queue when fewer remain. Decides ADR 008's deferred minimum-gap follow-up.
- **ADR 038 — Rename practice_session to practice_run**: schema and code, one mechanical migration and sweep; `deck_practice_config` keeps its name; enum values and UI copy unchanged.
- **ADR 039 — Rerun keeps the original run**: rerun becomes a plain create from frozen snapshots with a client-supplied fresh name; supersedes ADR 030's delete half; runs stay user-deletable.
- **ADR 040 — Snapshots carry attribution-only config lineage, severed on material edit**: nullable `source_config_id` on `practice_deck`, never read by generation; material config edits null it, renames keep it; amends ADR 013.
- **ADR 041 — Use GitHub Actions for CI**: the existing test/lint/build ritual plus an alembic-from-zero check, on every PR and push to main.

## Minor decisions

- **MD-1**: The run-state endpoint becomes `GET /api/practice_runs/{practice_run_id}/state` (fixing the `/practice_runs/{id}/run` stutter); error codes `session_active` → `run_active` at both call sites. Status enum values `active`/`completed` unchanged.
- **MD-2**: Hosting + CD is deliberately out of this cycle — it gets its own /plan cycle after 010 lands (provider, managed Postgres, Clerk production keys, migrations-on-deploy, secrets are its decisions, not footnotes here).

## Contracts

### Rename map (ADR 038, MD-1)

DB (one migration, working downgrade): table `practice_session` → `practice_run`; columns `practice_card.practice_session_id` → `practice_run_id`, `practice_deck.practice_session_id` → `practice_run_id`; constraint `uq_practice_card_practice_session_id` → `uq_practice_card_practice_run_id` (the `_POSITION_CONSTRAINT` string constant must follow); index `ix_practice_card_session_status_position` → `ix_practice_card_run_status_position`. Stored status strings `active`/`completed` unchanged.

Python modules rename with their contents: `app/{models,services,database_ops,routers/api}/practice_session.py` → `practice_run.py`; `tests/api_tests/test_practice_session.py` → `test_practice_run.py`. Names: `PracticeSession→PracticeRun`, `SessionStatus→RunStatus`, `PracticeSessionCreate/Read/Summary/DeckSummary→PracticeRun…`, `PracticeSessionBreakdown→PracticeRunBreakdown`, `SessionProgress→RunProgress`, `SessionStartError→RunStartError`, `SessionActiveError→RunActiveError`, `session_progress→run_progress`, `start/rerun_practice_session→…_practice_run`, `get_practice_session_breakdown→get_practice_run_breakdown`, all `db_*_practice_session*` and `practice_session_id` parameters likewise.

API: every `/api/practice_sessions…` path → `/api/practice_runs…`; `/{id}/run` → `/{id}/state` (MD-1); detail codes `session_active` → `run_active`; the rerun endpoint's messages keep their wording otherwise.

Frontend: `src/api/practice_session.ts` → `practice_run.ts` with `readPracticeRuns/readPracticeRun/deletePracticeRun/readPracticeRunState/readPracticeRunBreakdown/rerunPracticeRun/createPracticeRun`; `SessionBreakdown.tsx`/`.test.tsx` → `RunBreakdown.tsx`/`.test.tsx` (component `RunBreakdown`); query keys `'practice_sessions'→'practice_runs'`, `'practice_breakdown'→'practice_run_breakdown'` (`'practice_run'` stays). UI copy and browser routes (`/practice/…`) unchanged — users never saw schema terms (ADR 021).

### Requeue answer resolution (ADR 036)

`generate_practice_card_fields` gains `forced_answer_pool_ids: Sequence[uuid.UUID] = ()`. `submit_rating` computes `failed_field_ids = [fid for fid, r in ratings.items() if r == 1]` and threads them through `_requeue_failed_card`. Answer-side resolution becomes:

```
surviving_fixed  = as today (live + non-blank, includes any failed fixed fields already)
forced           = [pid for pid in pool_ids if pid in scores and pid in forced_answer_pool_ids]
count            = rng.choice(pool_counts) if pool_counts else 0   # unchanged
sampled          = weighted_low_mastery_sample(surviving_pool minus forced,
                                               max(0, count - len(forced)), rng)
answers          = surviving_fixed + forced + sampled
```

Prompt-side resolution and session-start generation (empty `forced_answer_pool_ids`) are byte-for-byte today's behavior. A failed field that has since been archived or blanked simply drops out of `scores` and is not forced; if nothing survives on a side, the existing return-None skip applies unchanged.

### Retry insertion (ADR 037)

`RETRY_SPACING_FLOOR = 3`, module constant in `app/services/practice_run.py` next to `_POSITION_GAP`. With `pending` = the session's pending cards, position ascending, and `mastery_index` = today's insertion point (count of pending cards with score strictly below the new score):

```
final_index = max(mastery_index, min(RETRY_SPACING_FLOOR, len(pending)))
```

The sparse-position midpoint is then computed between `pending[final_index-1]` and `pending[final_index]` exactly as today (gap defaults at the ends, collision-renumber retry unchanged). `len(pending) < 3` therefore lands the retry at the end of the queue.

### Rerun (ADR 039, ADR 040)

`POST /api/practice_runs/{practice_run_id}/rerun`, body `PracticeRunRerun { name: str }` → 201 `PracticeRunRead` (the new run). The original run is not deleted, stays listed and readable. Errors unchanged in shape: 404 unknown/foreign; 400 `run_active`; 400 `nothing_to_rerun`. Service: `rerun_practice_run(db, strategy, user_id, practice_run_id, name, rng=None)` — validates as today, creates the new run named `name` verbatim, copies each surviving snapshot's `source_config_id` onto the new snapshot, commits explicitly (`db_delete_practice_run` no longer supplies the commit).

Frontend: the details-page ConfirmDialog reads — title `Re-run this practice?`, description `A new practice with the same decks is created. This practice and its reviews stay on record.`, confirm label `Re-run`, non-destructive. The client generates the fresh name with the same formatter the creation page uses to pre-fill its name field. On success: invalidate `['practice_runs']`, navigate to `/practice/{new_id}`.

### practice_deck.source_config_id (ADR 040)

`source_config_id: uuid.UUID | None`, FK `deck_practice_config.id`, ON DELETE SET NULL, default None. Written at run start with the id of the config the snapshot was cut from; rerun copies the old snapshot's value (possibly already null); never read by generation, validation, or rerun logic; not exposed on any API payload in this cycle.

### Config-edit unlink (ADR 040)

In the deck_practice_config update service: before applying the update, compare the six incoming array values (`prompt_field_ids`, `answer_field_ids`, `prompt_pool_ids`, `prompt_pool_counts`, `answer_pool_ids`, `answer_pool_counts`) against the stored row, as ordered lists. If any differs, issue one UPDATE setting `source_config_id = NULL` on all practice_deck rows whose `source_config_id` equals this config's id, inside the same transaction as the config update. Name-only updates issue no such UPDATE.

## Tasks

### T1 — CI workflow (ADR 041)

- [x] **Goal:** every PR runs the repo's full verification ritual on a clean machine.
- **Files:** `.github/workflows/ci.yml` (new).
- **Details:** Trigger on `pull_request` and `push` to `main`. Backend job: ubuntu-latest with a `postgres:16` service container; install via `uv sync` (the repo is uv-managed, Python per `requires-python`); export `DATABASE_URL`/`TEST_DATABASE_URL` pointing at two databases on the service (create the second with `psql` in a step); run `uv run alembic upgrade head` against `DATABASE_URL` (the from-zero migration check — pytest's create_all does not exercise migrations), then `uv run pytest`. Frontend job: setup-node (current LTS), `npm ci`, `npm run lint`, `npx vitest run`, `npm run build`, working-directory `frontend`. If `npm run build` needs a Clerk publishable key at build time, provide a dummy `VITE_*` env var in the workflow rather than a secret, and record it in Notes.
- **Out of scope:** deploy/CD steps (MD-2); branch-protection settings (flip manually in the GitHub UI after the workflow exists); caching beyond what setup-uv/setup-node do by default; a `gen:api` drift check.
- **Done when:** the workflow file lands on a branch, a draft PR shows both jobs running and green; a commit with a deliberately failing test turns the backend job red and its revert restores green (then drop those commits before review).
- Notes: implemented as specified, with three findings. (1) The Details' conditional dummy `VITE_*` var turned out unnecessary: `npm run build` succeeds with no Clerk publishable key set at all — `ClerkProvider` reads it at runtime, nothing requires it at build time (verified locally with the var explicitly unset, and in CI where no frontend-job env is set). (2) `astral-sh/setup-uv` had to be pinned to the exact tag `v10.0.1` (follow-up commit `e79295f`): the draft PR's first run failed at job setup because that action publishes no floating major tag, unlike `actions/checkout@v7`/`actions/setup-node@v7` which do. (3) The red→green cycle ran on PR #18 as: both jobs green at `e79295f`; backend red at `ef77f05` (the deliberate assertion break — job ran 1m8s and the log shows exactly the intended `test_start_session` failure, i.e. a real test failure, not a setup error); green restored at `a7cec92` rather than by a literal revert commit — a concurrent build session executing T2 in the same working tree had renamed the sabotaged test file and restored the assertion inside its commit, which made `git revert ef77f05` an empty diff, so the empty revert was skipped. Consequently the parenthetical "drop those commits before review" is **not yet done**: `ef77f05` sits in pushed history beneath T2's `a7cec92`, and removing it now requires a user-sequenced rebase + force-push of the shared branch. Pre-push local verification: the full alembic chain applied cleanly to a fresh scratch database (dropped afterward), `pytest` 258 passed, frontend lint/vitest/build clean. Branch protection (require the checks) is the manual UI step the Out-of-scope names — not flipped.

### T2 — The rename (ADR 038, MD-1) — first code task; everything else builds on it

- [x] **Goal:** `practice_session` becomes `practice_run` across schema, backend, API, and frontend, with `/{id}/state` and `run_active` per MD-1.
- **Files:** the four backend `practice_session.py` modules (renamed), models importing them (`practice_card.py`, `practice_deck.py`), a new alembic revision, `tests/api_tests/test_practice_run.py` (renamed) plus the other test files referencing routes, `frontend/src/api/practice_run.ts` (renamed), `RunBreakdown.tsx`(+test) (renamed), pages importing them, regenerated `openapi.json` + `types.ts`.
- **Details:** Apply the rename map exactly. The migration renames the table, both FK columns, the unique constraint, and the index, with a downgrade reversing all five. No behavior change of any kind rides along — this diff must be purely mechanical so it can be reviewed by pattern.
- **Out of scope:** AGENTS.md/ADR/task-file wording (existing docs keep the old names as history; /distill reconciles); any UI copy change; the `/rerun` behavior change (T5).
- **Done when:** `grep -ri practice_session app tests frontend/src` returns zero hits; `alembic upgrade head` then `alembic downgrade -1` then `upgrade head` succeeds on the dev DB; `pytest`, `npx vitest run`, `npm run lint`, `npm run build` all clean; `npm run gen:api` run.
- Notes: Two implementation calls not spelled out in the rename map. (1) `PracticeDetailsPage`'s single-run detail-fetch query key was `'practice_session'`; a literal `practice_session`→`practice_run` substitution would have collided with the run-state query's existing `'practice_run'` key (two different response shapes cached under one key), so it's named `'practice_run_summary'` instead — the map only enumerated the plural-list and breakdown key renames. (2) The router's rerun handler (`rerun_session`, distinct from the imported service function) is renamed to `rerun_run` for consistency with its renamed siblings, though the map's "Names:" list didn't call it out by name. Unrelated to this task's content: `tests/api_tests/test_practice_run.py`'s renamed copy carried forward task 009 T1's throwaway CI-red-check commit (`ef77f05`, a deliberately wrong assertion); restored it to the correct value so `pytest` passes — T1 owns reverting/dropping that commit from history.

### T3 — Forced failed answer fields on requeue (ADR 036) — after T2

- [x] **Goal:** the retry of a failed card always re-asks every still-askable answer field the user rated "Again".
- **Files:** `app/services/practice_generation.py`, `app/services/practice_run.py`, `tests/api_tests/test_practice_run.py`.
- **Details:** Per the requeue answer resolution contract. `submit_rating` derives `failed_field_ids` from the ratings dict and passes them to `_requeue_failed_card`, which passes them to `generate_practice_card_fields`. Session start and rerun generation pass nothing and are behaviorally untouched.
- **Out of scope:** prompt-side forcing; any change to the weighting formula; retry positioning (T4).
- **Done when:** tests (driving `submit_rating` with a seeded `random.Random`) cover — a failed pool answer field appears in the requeued row's `answers`; two failed pool fields both appear when the drawn count is 1 (overflow rule); a failed _fixed_ answer field still appears (regression guard); a failed pool field archived before the requeue is absent and the card still requeues from its remaining fields; `pytest` clean.
- Notes: implemented per contract; two small implementation choices. (1) The shared helper `resolve_prompts_or_answers` gained the pass-through parameter under the side-agnostic name `forced_pool_ids` (its whole signature is side-agnostic); the contract's `forced_answer_pool_ids` name sits on `generate_practice_card_fields`, which only ever forwards it to the answer-side call. (2) The overflow test can't reach its state naturally in one hop — a snapshot with `answer_pool_counts=[1]` never deals two pool answers — so it writes a two-pool-answer `answers` array onto the pending row directly (the state a chained retry can reach) before rating both "Again". Tests were additionally verified to go red without the implementation (the two forcing tests fail on stashed sources; the two guards pass by design, since they assert preserved behavior). All four Done-when cases pass; full `pytest` 262 green.

### T4 — Retry spacing floor (ADR 037) — after T3 (same functions)

- [x] **Goal:** a retry never surfaces before 3 other pending cards have their turn, falling to the end of the queue when fewer remain.
- **Files:** `app/services/practice_run.py`, `tests/api_tests/test_practice_run.py`.
- **Details:** Per the retry insertion contract: add `RETRY_SPACING_FLOOR` and the `final_index` clamp around today's mastery index; midpoint/collision mechanics untouched.
- **Out of scope:** changing `_POSITION_GAP`, the renumbering path, or session-start ordering; making n configurable anywhere user-visible.
- **Done when:** tests cover — with ≥4 pending cards, a hard-failed card (mastery index 0) reappears with exactly 3 pending cards positioned before it; with a mastery index deeper than 3 the deeper slot wins (clamp, not fixed placement); with 2 pending cards the retry is last; failing the same card again re-applies the rule; `pytest` clean.
- Notes: implemented per contract — `mastery_index` computed as `sum(1 for _, score in pending if score < new_score)` (equivalent to the old break-scan given the ascending-mastery invariant), then `final_index = max(mastery_index, min(RETRY_SPACING_FLOOR, len(pending)))` indexes into `pending` for the existing midpoint/gap-default logic, unchanged. The "2 pending cards → last" case was already exercised by the pre-existing `TestPracticeRunAcceptance.test_full_fail_requeue_cycle` and `TestRunState.test_attempt_increments_on_a_requeued_row` — both asserted the old (pre-floor) immediate-resurface behavior, which the floor now legitimately reverses for that fixture's 3-card, 2-pending-after-fail shape, so both were rewritten to assert the new behavior rather than left broken; that reversal is this task's point, not a regression (same treatment task 009 T5 used for its own reversal). New `TestRetrySpacingFloor` class covers the other three bullets, including a direct unit test of `_insertion_position` for the "deeper index wins" clamp property (precise and DB-free, following `TestBlankValueGenerationFilter`'s precedent of testing service functions directly). Verified the four changed/new assertions actually exercise the clamp by stashing `app/services/practice_run.py` back to its pre-T4 state and confirming all four fail. Full `pytest` 269 passed (includes a concurrent session's in-progress T6 tests sharing this working tree). Shared the working tree and the `flashy_test` database with a concurrent session executing T6; coordinated file ownership beforehand (no overlapping functions) and, after a full-suite run collided with a simultaneous run from that session, agreed to take turns on full-suite runs against the shared test database.

### T5 — Rerun keeps the original run (ADR 039) — after T2; rewrites 006 T4/T9 behavior

- [x] **Goal:** rerun creates a new run with a client-supplied name and the original run survives.
- **Files:** `app/models/practice_run.py` (`PracticeRunRerun`), `app/services/practice_run.py`, `app/routers/api/practice_run.py`, `tests/api_tests/test_practice_run.py`, `frontend/src/api/practice_run.ts`, `frontend/src/pages/PracticeDetailsPage.tsx` + `.test.tsx`, regenerated API files.
- **Details:** Per the rerun contract. The service drops the delete call and gains the `name` parameter; the router accepts the body; the dialog copy, name generation, invalidation, and navigation per contract. Existing tests asserting the original session is gone are rewritten to assert it survives — that reversal is this task's point, not a regression.
- **Out of scope:** `source_config_id` (T6, except that the copy hook lands there); rerun from the overview list; any archive/soft-delete mechanism (explicitly parked in /plan).
- **Done when:** tests cover — 201 with the posted name and `active` status; the original run still returns 200 and still appears in the list; `nothing_to_rerun` and `run_active` unchanged; frontend tests assert the request body carries the generated name and navigation targets the new id; dialog copy matches the contract string exactly; full suites + `npm run gen:api` clean.
- Notes: implemented as specified. `db_delete_practice_run` stays (the plain Delete action still uses it) — only the rerun path stopped calling it, per the contract's parenthetical. The `_ARRAY_FIELDS`/`array_values` copy mechanism T6 needs for `source_config_id` was already in place before this task (untouched), so no separate "hook" commit was needed. Remaining ADR 030 references in the touched files' docstrings/comments (this endpoint's own behavior description, not other ADR 030 content) were updated to ADR 039 for consistency while in there. Full suites clean: `pytest` 258 passed, `npx vitest run` 415 passed, `npm run lint` clean, `npm run build` clean, `npm run gen:api` run. This session shared the working tree with a concurrent session executing T3 (touches `app/services/practice_generation.py` and different functions in `app/services/practice_run.py`) — verified no overlap in the diffs before committing only this task's files.

### T6 — Config lineage on snapshots (ADR 040) — after T5 (touches the same service)

- [x] **Goal:** every snapshot records which config it was cut from, surviving config deletion as null.
- **Files:** `app/models/practice_deck.py`, new alembic revision, `app/services/practice_run.py`, `tests/api_tests/test_practice_run.py`.
- **Details:** Column per the ADR 040 contract. `start_practice_run` writes each config's id onto its snapshot; `rerun_practice_run` copies the old snapshot's value. `_snapshot_and_generate_deck` carries it as part of the values dict. Update the two docstrings that assert the column's nonexistence (`PracticeRunDeckSummary` in `app/models/practice_run.py`, `rerun_practice_run` in `app/services/practice_run.py`) to describe the attribution-only rule instead.
- **Out of scope:** reading the column anywhere (list filters, statistics — later cycles); exposing it on API payloads; backfilling lineage for pre-existing snapshots (impossible — the link was never recorded); unlink on config edit (T7).
- **Done when:** tests cover — create writes the config id on each snapshot; rerun copies it; deleting the config nulls it while the snapshot survives; migration upgrade/downgrade round-trips; `pytest` clean.
- Notes: implemented per contract; `source_config_id` threads through `_snapshot_and_generate_deck` as its own parameter (not folded into `array_values`, since it's a scalar, not one of the six array fields) but still lands in the same values dict passed to `db_create_practice_deck`, matching the Details' "carries it as part of the values dict." Both named docstrings updated, plus `PracticeDeck`'s own class docstring (in the Files list, previously asserted the column would never exist) and `_snapshot_and_generate_deck`'s docstring (not separately named, but it now takes the parameter so documenting it seemed necessary). Left `db_read_practice_decks_for_run`'s docstring in `app/database_ops/practice_deck.py` alone — it also asserted the column's nonexistence but wasn't one of the two named, and that file isn't in T6's Files list; still functionally accurate (rerun never looks up a live config through this column), just a stale clause not in scope here. Autogenerate additionally caught an unrelated pre-existing drift from task 009 T2: `practice_deck`'s own unique constraint had kept its pre-rename name (`uq_practice_deck_practice_session_id`) despite the column rename, out of step with what the model's naming convention now derives (`uq_practice_deck_practice_run_id`); folded the rename into this migration (same table, no behavior change, and reversible) rather than leaving a second empty-diff migration — documented in the migration's own upgrade docstring. Migration upgrade → downgrade → upgrade verified on the dev DB, and a follow-up `alembic revision --autogenerate` against the model produced an empty migration (no drift), confirming the round-trip and the model/DB match exactly; that throwaway check migration was deleted, not committed. `pytest` 269 passed (full suite). This session shared the working tree and `flashy_test` with a concurrent session executing T4 in the same service file — coordinated scope beforehand (different functions), survived one transient scare where my unstaged edits to three files briefly vanished from disk during the peer's `git add -p`/commit sequence and were confirmed gone via `grep`, not just a stale read; recovered instantly by re-applying from this session's own context (nothing was actually lost) after messaging the peer, who had by then already committed T4 (`4b09f77`) cleanly via `git add -p` and confirmed the working tree held only this task's changes afterward.

### T7 — Config edits sever lineage (ADR 040) — after T6

- [x] **Goal:** materially editing a config unlinks the runs cut from it; renaming does not.
- **Files:** `app/services/deck_practice_config.py`, `tests/api_tests/` (the config update tests' file, plus `test_practice_run.py` if the fixture helpers live there).
- **Details:** Per the config-edit unlink contract. The comparison runs against the stored row before mutation; the unlink UPDATE and the config update commit together.
- **Out of scope:** any UI notice that links were severed; unlink on config _delete_ (the FK's SET NULL already covers it, T6); treating pool-count-only changes as non-material (they are material — the arrays are compared verbatim).
- **Done when:** tests cover — editing one pool array nulls `source_config_id` on that config's snapshots while another config's snapshots keep theirs; a rename-only update leaves links intact; a failed validation on the update leaves links intact (rollback); `pytest` clean.
- Notes: implemented per contract, with one small structural addition beyond the Files list. A new `update_deck_practice_config` service function now owns the compare-then-unlink-then-apply flow (materiality checked as `field in data and data[field] != getattr(config, field)` over the six arrays, equivalent to the contract's "compare against the stored row" for exactly the fields the PATCH actually touches); the unlink is one bulk `UPDATE practice_deck SET source_config_id = NULL WHERE source_config_id = :id`, issued via `db.exec()` before delegating to the existing `db_update_deck_practice_config`, so both commit together in that call's transaction. This meant `app/routers/api/deck_practice_config.py` needed a small change too (not in the Files list): its PATCH handler now calls the new service function instead of the database_ops one, and — since the handler itself was already named `update_deck_practice_config`, colliding with the new service function of the same name — the handler was renamed to `patch_deck_practice_config` (route path/method unchanged; a FastAPI handler's Python name carries no API contract, same reasoning task 009 T2 used for `rerun_session`→`rerun_run`). "Failed validation leaves links intact" is satisfied by construction (validation runs and can raise before the new function is ever called) but still covered by an explicit test per Done-when, using a payload that's simultaneously material and validation-rejected to confirm the ordering actually holds. Verified the new tests exercise real logic by reverting the two source files and confirming the material-edit test goes red (the rename/failed-validation tests pass either way, as expected for negative-space guards). Full `pytest` 272 passed.
