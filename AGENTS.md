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
- Migrations: `alembic revision --autogenerate -m "message"` to generate migration, then `alembic upgrade head` to apply,

## Hard rules

- Never run commands if not in venv, activate with `source .venv/bin/activate`
- Never edit frontend/src/api/types.ts by hand, regenerate with `npm run gen:api` (in /frontend)
- Only edit documents in docs/ after given explicit permissions to do so
- Always read the generated migration before applying it
- Always manage Python dependencies with `uv`
- Always manage Node dependencies with `npm` (in /frontend)
- Mastery arithmetic (blending, scoring, aggregation) lives only inside `MasteryStrategy`
  implementations under `app/mastery/` — never in SQL, a SQLModel expression, or a
  trigger, in any phase
- A `review_group_id`'s rows must be logged atomically, in one transaction, and never
  appended to afterward. The mastery write path computes the prompt side's breadth from
  the whole group; a group submitted partially and completed later would make the
  incremental write and a later `rebuild_mastery` replay disagree

## Conventions

- Frontend server fetch through TanStack Query, no raw fetch in components
- Reusable components do not fetch, all data are passed down as props

## Mastery model

- `card_field_mastery` is a disposable cache, fully rebuildable from `review_log`
- The database stores mastery state, it never computes it
- One `review_group_id` is one appearance: a `ReviewGroup` bundling every rated answer field and the prompt fields shown alongside them.
- `MasteryStrategy.expand(group)` decides one `MasteryUpdate` per `(card_id, field_def_id, side)` up front, because the prompt side needs the whole group to know its breadth — it can't be decided one log row at a time.
- Breadth (how many rated answers a prompt was shown for in one appearance) changes the _weight_ of the prompt-side update, not its _target_ — the 0-100 mastery scale has no room to express "more evidence" through the target once it's already saturated. `EmaStrategy`'s effective weight is `alpha_eff = 1-(1-alpha)^(breadth^beta)`; `beta` (default `0.5`) is the diminishing-evidence knob, tunable on the strategy like `alpha`. `prompt_review_count` `answer_review_count` increment by exactly 1 per appearance regardless of breadth

## Context

- Design decisions: see docs/adr/
