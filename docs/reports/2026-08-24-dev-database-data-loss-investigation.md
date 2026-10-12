# Dev database data loss — investigation

**Date:** 2026-08-24 **Prompted by:** the user asking whether local dev data (`Math`, `Science`, `string` subjects) had actually disappeared, or whether they'd misremembered it, after noticing only a `CompTIA A+` subject remained. **Outcome:** diagnosis only, no code changes. This session's own activity was ruled out; the most consistent explanation is a local action outside this session.

## What was checked

This session's own transcript was traced against the timestamps in the data itself, using the running Claude Code session's own tool-call history as the source of truth for what this session actually did to the database.

At 2026-08-22 16:54 EDT, a `GET /api/subjects` run as part of unrelated Phase 6 backend work returned `Math` (created 2026-08-19, description "I love math"), `Science` (created 2026-08-19, description "I hate science"), `string` (created 2026-08-21), plus three short-lived test artifacts from the same hour (`ZZDeleteTest`, `Chemistry Test`, `Biology Test`).

Between 16:55–16:57 EDT, this session deleted only those three named test artifacts by their specific ids (`DELETE /api/subjects/<id>`, one id at a time) — `Math`, `Science`, and `string` were never referenced in any delete this session ran. The session's next backend/database activity of any kind wasn't until 19:36 EDT (a subjects check starting Phase 5.5's live browser verification). In that ~2.5 hour gap, this session made zero backend or database calls — its own tool-call history for that window is entirely frontend file edits (`DeckEditor.tsx` and its tests for Phase 4), no `curl`, no `psql`, no `alembic`, no delete of any kind. A concurrent `ListAgents` check found no other Claude session running that could have acted on the database.

By 19:36 EDT, `Math`/`Science`/`string` were gone, and the only subject present was a single `CompTIA A+`, created at 19:04 EDT — inside the silent window. `CompTIA A+` isn't a name this session invented; it's the exact example name already present in the user's own edits to `docs/plans/003-frontend-rebuild-creation-flows.md`'s Phase 5.5 section at the time (read by this session only afterward, during Phase 5.5).

## Decision

No code change — this is a diagnosis, not a bug in the app. Based on this session's own tool-call history, this session's Claude Code activity did not remove `Math`/`Science`/`string`. The most consistent explanation is a local action outside this session — a migration reset, a Postgres restart against a fresh volume, a manual `DELETE`/truncate, or similar — run directly by the user (or some other local process) around 19:04 EDT on 2026-08-22, separately from anything this session did. The exact mechanism is outside what a Claude Code session transcript can observe, and was left for the user to pin down via their own shell history if they want to.

## Separate, unrelated finding surfaced during this check

This session's own "clean up after a browser check" pattern up to this point was to `DELETE` every subject currently in the database, not just the ones it created — that's a latent risk (if real data had been present when that cleanup ran, it would have been destroyed), even though this trace shows it isn't what happened in this specific incident. This was addressed as a standing rule, now recorded in `AGENTS.md`: "Never bulk-delete rows from the local dev database as 'cleanup' after seeding data for a live browser check... Leave seeded data in place once a browser check is done instead of removing it."
