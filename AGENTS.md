# AGENTS.md

## Project

- Name: Flashy
- Description: Flashcard SaaS
- Frontend: React/TypeScript/Vite
- Backend: FastAPI/SQLModel/PostgreSQL
- Auth: Clerk, integrated — every router depends on `CurrentUserDep`
  (`app/dependencies.py`), which verifies the session JWT and scopes ownership in
  the query, not in Python after the fetch
- Frontend auth: `@clerk/react` (not `@clerk/clerk-react`) — no `<SignedIn>`/`<SignedOut>` components exist in this package; branch on `useUser()`'s `isLoaded`/`isSignedIn` fields instead (ADR 007)

## Commands

- Toggle venv: `source .venv/bin/activate`
- Frontend dev server: `npm run dev` (in /frontend)
- Backend dev server: `fastapi dev`
- Tests: `pytest` , `npm run test` (in /frontend)
- Regenerate API types: `npm run gen:api` (in /frontend)
- Migrations: `alembic revision --autogenerate -m "message"` to generate migration, then `alembic upgrade head` to apply

## Hard rules

- Never run commands if not in venv, activate with `source .venv/bin/activate`
- Never edit frontend/src/api/types.ts by hand, regenerate with `npm run gen:api` (in /frontend)
- Before committing any frontend change, run `npx vitest run`, `npm run lint`, and `npm run build` (in /frontend) — all three clean, not just the file(s) you touched. `npm run build` already runs `tsc -b` before bundling, so this covers typecheck + tests + lint + bundle
- Always read the generated migration before applying it
- Always manage Python dependencies with `uv`
- Always manage Node dependencies with `npm` (in /frontend)
- Mastery arithmetic (blending, scoring, aggregation) lives only inside `MasteryStrategy`
  implementations under `app/mastery/` — never in SQL, a SQLModel expression, or a
  trigger, in any phase
- A `review_group_id`'s rows must be logged atomically, in one transaction, and never appended to afterward. The mastery write path computes the prompt side's breadth from the whole group; a group submitted partially and completed later would make the incremental write and a later `rebuild_mastery` replay disagree
- Diagnostic reports, investigation traces, and plan-mode findings go in `docs/cc/`, never `~/.claude/plans/` or any path outside the repository. If plan mode wrote a file elsewhere, copy it into `docs/cc/` before ending the session and reference the repo path in your summary
- Never write findings only into a chat summary. If an investigation produced a trace worth referencing later, it goes in `docs/cc/` as a file
- `cc` is the only directory under `docs/` that you may create or edit files in without asking, everything else needs explicit permissions
- Never bulk-delete rows from the local dev database as "cleanup" after seeding data for a live browser check (e.g. deleting every subject/deck currently present). The dev database can hold real data at any time, and a delete-everything cleanup can't tell that apart from what was just seeded. Leave seeded data in place once a browser check is done instead of removing it

## Conventions

- Frontend server fetch through TanStack Query, no raw fetch in components
- Reusable components do not fetch, all data are passed down as props
- Frontend component/page layout: one directory per functional area under `frontend/src/components/` (e.g. `shell/` for the app-shell chrome — TopBar, SideDrawer, AccountSheet, AuthSlot, Logo, SearchBar), not a flat `components/`. Pages are `frontend/src/pages/<Name>Page.tsx`
- Modals/sheets: use Radix Dialog primitives (`@radix-ui/react-dialog`, ADR 016), not a hand-rolled focus trap/scroll-lock. If the trigger button isn't a `Dialog.Trigger` descendant (e.g. it lives in a sibling component), thread a `triggerRef` for `onCloseAutoFocus`-based focus restoration and give the trigger an inline `pointerEvents: 'auto'` + a matching `onPointerDownOutside` exemption, or Radix's `disableOutsidePointerEvents` silently blocks it while the dialog is open (see `SideDrawer.tsx`)
- API layer error handling: `src/api/*.ts` functions throw via `unwrap`/`unwrapVoid` (`src/api/unwrap.ts`), never side-effect (no `console.error`, no toast) — display is a UI-edge concern, not the data layer's (ADR 006)
- `// TODO(defer:<tag>)` marks deliberately-deferred skeleton work; `grep -r "TODO(defer:" frontend/src/` before considering a phase/PR done — every deferred item must be tagged, nothing untagged
- Component tests: default Vitest environment is `node`; a test needing a DOM opts in per-file with a `// @vitest-environment jsdom` docblock at the top, not a global config change (ADR 017). Reuse `frontend/src/test/testUtils.tsx` (`renderWithRouter`, `renderWithProviders`) and `frontend/src/test/mocks/clerk.ts` (mocks `@clerk/react`'s `useUser`/`useClerk`) rather than re-mocking per file. RTL doesn't auto-cleanup here (only fires under Vitest's `globals: true`, which this repo doesn't set) — `test/setup.ts`'s `afterEach(() => cleanup())` does it instead; don't remove it
- For files written to `docs/cc/`:
  - Filename: `YYYY-MM-DD-short-slug.md` (e.g. `2026-08-19-practice-card-requeue-spacing.md`)
  - Open with a metadata block: date, what prompted the investigation, and the outcome in one line (`diagnosis only, no code changes` / `bug found and fixed in <commit>` / `deferred, see <plan>`).
  - Cite code as `path/to/file.py:LINE-LINE`. State what the code does now; do not restate what it should do unless a decision was made.
  - Record the decision and its reasoning, not just the trace. A report whose conclusion is "deferred" must say what would need to be true to revisit it.
  - Cross-reference: if the finding contradicts or extends an ADR or a plan phase, name it. If it makes an existing test's assertion look wrong, name the test and line.
  - One file per investigation. Do not append to an earlier report; write a new one and link back.

## Mastery model

- `card_field_mastery` is a disposable cache, fully rebuildable from `review_log`
- The database stores mastery state, it never computes it
- One `review_group_id` is one appearance: a `ReviewGroup` bundling every rated answer field and the prompt fields shown alongside them.
- `MasteryStrategy.expand(group)` decides one `MasteryUpdate` per `(card_id, field_def_id, side)` up front, because the prompt side needs the whole group to know its breadth — it can't be decided one log row at a time.
- Breadth (how many rated answers a prompt was shown for in one appearance) changes the _weight_ of the prompt-side update, not its _target_ — the 0-100 mastery scale has no room to express "more evidence" through the target once it's already saturated. `EmaStrategy`'s effective weight is `alpha_eff = 1-(1-alpha)^(breadth^beta)`; `beta` (default `0.5`) is the diminishing-evidence knob, tunable on the strategy like `alpha`. `prompt_review_count` `answer_review_count` increment by exactly 1 per appearance regardless of breadth
- **Harshest-wins** is the rule for collapsing multiple per-field answer ratings into one signal, and it is applied in two separate places that must stay consistent: a `practice_card` is marked failed if _any_ one of its answer fields is rated 1 (`app/services/practice_session.py`, `submit_rating`), and the prompt-side mastery target for that same appearance is the harshest (rating-1) score if any answer failed, otherwise the mean of the normalized scores (`app/mastery/ema.py`, `EmaStrategy._aggregate_target`). Changing one site's aggregation rule without the other would make a card's pass/fail outcome silently disagree with the mastery value driving its own resurfacing.

## Entity vocabulary

All 12 tables under `app/models/`. When suggesting code, use these — not
`deck_schema`, per-card `fields` dicts, or any other pre-rewrite shape.

- `app_user` — the authenticated end user (keyed by `clerk_user_id`); root of every
  per-user ownership chain.
- `subject` — a user's top-level grouping of decks (e.g. a course or topic); owns
  `deck` rows, unique per `(user_id, name)`, and deleting a subject cascades every
  deck it owns (and, transitively, everything the deck-delete cascade below already
  cascades from there). `icon` is a kebab-case identifier into a
  small curated icon set (`frontend/src/lib/subjectIcon.ts`, ~25 entries from
  `lucide-react`) — not emoji, and not the full icon library. An unrecognized,
  blank, or legacy value (the pre-rewrite default was the emoji `"📚"`) falls back to
  `BookOpen`. Default is `"book-open"` (`DEFAULT_SUBJECT_ICON`,
  `app/models/subject.py`). `last_activity_at` is the sort key every subject list
  orders by descending; it bubbles from owned decks (a deck created/deleted/moved
  under this subject) as well as the subject's own edits, written only by `touch()`
  (`app/services/activity.py`). There is no `updated_at` — a prior version had one and
  it was removed for having zero consumers (ADR 018).
- `deck` — a named collection of cards under one `subject`; owns `card`, `field_def`,
  and `deck_practice_config` rows, unique per `(subject_id, name)`. Deleting a deck
  cascades all three — and, transitively, `card_field_value`, `card_field_mastery`,
  and `practice_card` — but never touches `review_log` or `practice_deck`, which
  outlive it (ADR 015). Always has **≥2 active `field_def` rows** (D3 in the creation-
  flows plan) — a practice session needs at least one prompt field and one answer
  field, and a field is one or the other, never both, so fewer than two makes a deck
  unpractisable. Enforced on create, on the batch-edit endpoint, and on archiving a
  field (archiving counts as removing for this purpose). `last_activity_at` is the
  same sort-key mechanism as `subject`'s — bumps on the deck's own edits and on any
  field/card write under it — and likewise has no `updated_at` (ADR 018).
- `field_def` — the sole source of truth for what a field is (name, `FieldType`,
  display `position`); archived via `archived_at`, never hard-deleted by default
  (ADR 009, ADR 010). Every other table references a field only by `field_def.id`.
- `card` — one flashcard belonging to a `deck`; holds no content itself.
- `card_field_value` — a card's actual per-field content: exactly one row per
  `(card_id, field_def_id)` for every field_def **active** on the card's deck — dense,
  never sparse. An unfilled field stores `""`, not a missing row, so "does this card
  have a value for field X" is never ambiguous between empty and never-written. A card
  whose values are all blank is dropped at create time rather than persisted with
  all-`""` rows — that's a different concern (not persisting a card the user never
  filled in) from the density invariant. Whatever creates or edits a deck's fields is
  responsible for keeping this true over time: adding a field backfills a `""` row for
  every existing card in the same transaction; archiving a field is not a field-set
  change the invariant tracks (below), and deleting a field's row via FK cascade
  handles itself. Archived fields keep their existing `card_field_value` rows forever
  (`field_def.archived_at` never cascades a delete) as inert history, but an archived
  field is excluded from the density invariant going forward and from every read path
  — a card's returned `values` and a deck's returned `field_defs` only ever reflect
  active fields.
- `review_log` — append-only, immutable ledger of every rated field review; the
  single source of truth mastery is rebuildable from (ADR 011). Never deleted, ever —
  its `card_id`, `practice_card_id`, and `field_def_id` foreign keys are all nullable
  with `ON DELETE SET NULL`, so a row survives the deletion of anything it references
  as orphaned history (ADR 015). `rebuild_mastery` excludes rows with a null
  `card_id`/`field_def_id` from its replay — there's no live `(card, field)` left to
  rebuild `card_field_mastery` for.
- `card_field_mastery` — disposable, lazily-created cache of per-(card, field)
  mastery scores, computed by a `MasteryStrategy` and fully rebuildable from
  `review_log` (ADR 011, ADR 012).
- `deck_practice_config` — a saved, named template describing which fields are
  prompts/answers and pool-sampling rules; mutable.
- `practice_session` — one user's practice run (`active`/`completed`/`abandoned`);
  spans one or more `practice_deck`s. Status is never inferred except on the
  current-card read path: `get_current_practice_card` transitions an `active` session
  to `abandoned` if no pending `practice_card` remains, whether because the user
  genuinely finished or because cascade-deleted cards stranded it — that distinction
  isn't tracked (ADR 015).
- `practice_deck` — an immutable snapshot of a `deck_practice_config`, copied at
  session start; editing or deleting the source config never affects it (ADR 013).
  `deck_id` is nullable with `ON DELETE SET NULL` — the snapshot survives deleting the
  source deck too, since it copies the config's field/pool ids into its own arrays
  rather than referencing the deck live (ADR 015).
- `practice_card` — one generated card instance within a session
  (`pending`/`passed`/`failed`); a failed card is requeued as a new row, never
  mutated in place. `card_id` is `NOT NULL` with `ON DELETE CASCADE` — a practice_card
  without a card is meaningless, so deleting the card deletes it too, rather than
  leaving a nullable reference every reader would have to guard against (ADR 015).

## Context

- Design decisions: see docs/adr/
