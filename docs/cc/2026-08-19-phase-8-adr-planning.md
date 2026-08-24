# Phase 8 documentation — ADR planning

**Date:** 2026-08-19 **Prompted by:** the user asking to execute Phase 8 of `docs/plans/001-flashy-schema-rewrite.md` ("Documentation"), noting it was written before any phase was executed and asking whether anything new had turned up worth documenting. **Outcome:** six ADRs and an AGENTS.md update written and committed in `b701fb1`.

## What this covers

Three Explore agents traced the reasoning behind Phase 8's seven named decisions (field promotion, lazy mastery, log-as-source-of-truth, the mastery strategy pattern, config snapshotting, archival over deletion, copy-not-share) with exact `file:line` citations, quoted docstrings/comments, and — for field promotion — the pre-rewrite shape via `git show 825e70c`. That research became the plan approved in plan mode, then executed directly.

This file exists only to satisfy the "plan-mode findings go in docs/cc/, never `~/.claude/plans/`" rule — the actual content lives in the ADRs themselves, which are the real, polished output and shouldn't be duplicated here. Read those instead of this file for the reasoning:

- `docs/adr/009-use-field-def-as-sole-source-of-truth-for-fields.md`
- `docs/adr/010-archive-fields-instead-of-hard-deleting.md` — includes a documented known gap: the hard-delete endpoint only checks `card_field_value` before allowing a hard delete, not `card_field_mastery`/`review_log`/the six `deck_practice_config` uuid[] arrays the plan's invariant calls for. `review_log`'s `RESTRICT` FK still catches history; the config-array case is unchecked. Left as a follow-up, not fixed in this documentation-only phase.
- `docs/adr/011-append-only-review-log-as-mastery-source-of-truth.md` (merges "lazy mastery" and "log-as-source-of-truth" — one decision viewed from two angles)
- `docs/adr/012-confine-mastery-arithmetic-to-a-strategy-pattern.md`
- `docs/adr/013-snapshot-practice-config-at-session-start.md`
- `docs/adr/014-copy-decks-before-building-share-links.md`

`AGENTS.md` gained an "Entity vocabulary" section (all 12 tables, one line each, cross-referencing the ADRs above) and had a stale line removed — the Project section still said Clerk auth was "planned, not yet integrated," false since Phase 5.

## Revisit when

The known gap in ADR 010 (hard-delete's incomplete guard checks) should be revisited if a hard delete of a field still referenced by a `deck_practice_config` array is ever attempted in practice — the fix is adding the missing three checks to `app/routers/api/field_def.py`'s `hard_delete_field_def`, mirroring the existing `db_count_card_field_values` pattern for the other three tables/arrays.
