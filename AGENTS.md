# Project

- Flashy is a flashcard web app.
- The user is a person using the app, not the engineer or the product owner building it; there are none yet, so a product decision covers only what is built.
- Auth is Clerk, verified by CurrentUserDep in app/dependencies.py on every route but GET /api/health.
  - Reason: ADR 007, ADR 072
  - Guard: tests/api_tests/test_auth_scoping.py
- docs/rules/ holds the rules for every file an agent writes under docs/, for comments in code, and for this file.
- README.md is for a human reader and self-contained; it never points at AGENTS.md.

# Commands

- Run Python through `uv run` or inside .venv.
- Run frontend tests with `npx vitest run` in frontend/ rather than `npm run test`.
  - Reason: npm run test is watch mode and does not exit
- Dry-run a new migration on a `pg_dump` copy of the dev database, then apply it with `alembic upgrade head` in the task that writes it.
  - Reason: fastapi dev reloads new models before the schema
- Check a frontend change in headless Chromium through playwright-core, run from the session scratchpad against localhost:5173, signed out of Clerk with `DEV_AUTH_USER_ID` and `ENV=development` set.

# Hard rules

- Regenerate frontend/src/api/types.ts with `npm run gen:api` after any change under app/models/ or app/routers/, commit it with that change, and never edit it by hand.
  - Reason: ADR 006
- Commit a frontend change only when `npx vitest run`, `npm run lint` and `npm run build` are all clean over the whole frontend.
  - Reason: ADR 041
- Never push to main; a change reaches main only by a pull request with both CI checks green.
  - Reason: ADR 041
- Change a database's schema only through an alembic migration, never from code under app/.
  - Reason: ADR 045
  - Guard: tests/api_tests/test_schema_guard.py
- Keep mastery arithmetic only in a MasteryStrategy under app/mastery/, never in SQL, a SQLModel expression or a trigger.
  - Reason: ADR 012
  - Guard: tests/api_tests/test_mastery.py
- Append to review_log only through record_review_group in app/services/mastery.py, and never update or delete its rows outside the deletion closure.
  - Reason: ADR 011
- Delete a subject, deck, field or card only through compute_deletion_impact then apply_deletion in app/services/deletion.py, inside the deleting transaction.
  - Reason: ADR 051
- Take every instant from the server's clock in UTC, never from a caller, and use app_user.timezone only to render a user-facing date at read time, never to store, order or compare an instant.
  - Reason: ADR 019
  - Guard: tests/api_tests/test_user_timezone.py
- Stage with `git add -p` and commit only your task's hunks.
  - Reason: a peer session may share this checkout
- Start a full `pytest` only when `pg_stat_activity` shows no other connection to the TEST_DATABASE_URL database.
  - Reason: peer sessions share TEST_DATABASE_URL
- Never delete rows from the dev database as cleanup after a browser check; seeded data stays.
- Never report a touch-only interaction as checked; a browser check drives a mouse, and no device can reach the dev server.
- Never write under docs/ beyond what the running skill lists or the engineer orders.
  - Reason: every docs/ file records the human's decision
- Raise a finding that must outlive the session to the engineer for /code-decide; never fix it in passing.
  - Reason: a lasting finding is a decision for the docket
- Treat an explicit order from the engineer as overriding a rule for that one act: name the rule, show the old and new text of each edit, act after confirmation, and leave the rule as written.
- Number a new file under docs/ one above the highest its folder has ever held on any branch, read after `git fetch`; never reuse a number.
  - Reason: two branches must never take one number
- Never mark deferred work in code; raise it to the engineer as a question for docs/backlog.md.
  - Reason: the backlog is a kept question's one home
- Show on a screen only words docs/vocabulary.md gives, never a name from the code, and change a word there first, then on every surface.
  - Reason: PDR 001, ADR 069
- Name a concept in code by the name docs/vocabulary.md's Code column gives it, and change a code name there first, then in every file.
  - Reason: ADR 069
- Write no sentence a user reads in the backend; give every refusal a screen reaches a code, and choose its sentence from docs/vocabulary.md by that code, never by the error's message.
  - Reason: ADR 070
- Keep harshest-wins consistent between submit_rating in app/services/practice_run.py and the strategy's prompt-side target in app/mastery/.
  - Reason: ADR 012
- Never expose the field archive endpoints or build on archived_at; the archive code stays dormant.
  - Reason: ADR 049
- Write a "" card_field_value row for every existing card in the same transaction as any path that adds a field to a deck.
  - Reason: ADR 057
- Scope every read and write to the requesting user, so another user's resource returns 404.
  - Reason: ADR 034
  - Guard: tests/api_tests/test_auth_scoping.py
- Keep the three backend layers, app/routers/api/ over app/services/ over app/database_ops/, dependencies downward only, every statement and session call in a `db_*` function.
  - Reason: ADR 034, ADR 055
  - Guard: tests/api_tests/test_layering_guard.py
- Write last_activity_at only through touch() in app/services/activity.py, on every write that is user activity.
  - Reason: ADR 018
  - Guard: tests/api_tests/test_activity_tracking.py
- Carry a round-trip return address as the ?returnTo= URL parameter, read only through internalReturnTo in src/lib/returnTo.ts.
  - Reason: ADR 024
- Render every failure inline where it happened; AppShell's connectivity banner, the one reader of useConnectionStatus, is the only app-level error channel, with no error boundary, cache handler or toast.
  - Reason: PDR 002, ADR 063
- Carry a rename through every tracked file and path, quoted literals and generated files included; only an occurrence with a different meaning stays.
  - Reason: one word per concept, history included

# Conventions

- Scope ownership inside the query rather than in Python after the fetch.
  - Reason: ADR 034
- Return a whole collection from a list read and derive its per-row figures in a bounded number of statements rather than one per row.
  - Reason: ADR 082
- Fetch server data through TanStack Query in the page, hand it to reusable components, src/components/ui/ included, as props, and keep it in the query cache rather than long-lived component state.
  - Reason: ADR 033
- Keep page-view state, tabs and filters, in the URL rather than useState.
  - Reason: PDR 005
- Size a routed page to its content rather than the viewport height.
  - Reason: the page renders below AppShell's sticky header
- Declare a typing.Protocol attribute as a read-only property rather than a plain annotated field.
  - Reason: a plain field reads as settable to a type checker
