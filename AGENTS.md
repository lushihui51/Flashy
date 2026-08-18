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
- Never edit documents in docs/
- Always read the generated migration before applying it
- Always manage Python dependencies with `uv`
- Always manage Node dependencies with `npm` (in /frontend)

## Conventions

- Frontend server fetch through TanStack Query, no raw fetch in components
- Reusable components do not fetch, all data are passed down as props

## Context

- Design decisions: see docs/adr/
