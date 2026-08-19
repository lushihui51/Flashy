# AGENTS.md

## Project

- Name: Flashy
- Description: Flashcard SaaS
- Frontend: React/TypeScript/Vite
- Backend: FastAPI/SQLModel/PostgreSQL
- Auth: Clerk (planned, not yet integrated — no auth checks exist in the API currently)

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

## Conventions

- Frontend server fetch through TanStack Query, no raw fetch in components
- Reusable components do not fetch, all data are passed down as props
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

## Context

- Design decisions: see docs/adr/
