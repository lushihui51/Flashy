# Deleting a card the user is currently practicing

- **Date:** 2026-08-24
- **Prompted by:** while Phase 1 of `docs/plans/004-frontend-rebuild-practice-setup.md` was being scoped: when a user is sitting on a `practice_card` and the underlying `card` is deleted, what happens — and shouldn't `practice_session` advance a current-card pointer?
- **Outcome:** diagnosis only, no production code changes; one missing regression test added (`tests/api_tests/test_deck_delete_cascade.py`, `test_deleting_the_card_being_practiced_serves_the_next_pending_card`).

## What happens today

There is no current-card pointer to advance, and that is the point.

1. **The `practice_card` row disappears along with the card.** `practice_card.card_id` is `NOT NULL` with `ON DELETE CASCADE` (`app/models/practice_card.py:40`). ADR 015 chose this over `SET NULL` deliberately: a `practice_card` whose `card` is gone has nothing left to render or rate, so the schema removes the state rather than leaving a nullable reference every reader has to guard.
2. **The current card is derived, never stored.** `db_read_current_practice_card` (`app/database_ops/practice_card.py:27-40`) is `WHERE practice_session_id = ? AND status = 'pending' ORDER BY position LIMIT 1`, the invariant `PracticeSession`'s docstring states (`app/models/practice_session.py:18-21`) and that 001 fixed for this table: no `deck_id`, no `curr`. The deleted row simply stops matching the predicate, so the next-lowest-position pending card is served on the next read. Nothing is incremented, nothing is repaired, and no write happens at all.
3. **Rating a card that vanished** returns 404 `practice_card {id} not found`: `db_read_practice_card` finds nothing and `submit_rating` raises `LookupError` (`app/services/practice_session.py:319-324`). ADR 015 records that no special-case guard is needed here — the ordinary unknown-id check already covers it.
4. **If the deleted card was the last pending one,** `get_current_practice_card` (`app/services/practice_session.py:192-206`) transitions an `active` session to `abandoned` and returns None, so the endpoint 404s. It does not distinguish "the user genuinely finished" from "cascade-deleted cards stranded the session"; ADR 015 states that inventing a signal to tell them apart would be new state-tracking the decision does not need.

## Gap found and closed

Every existing mid-session-deletion test deleted the whole **deck**, i.e. exercised only the nothing-remains path (`test_rating_a_card_whose_deck_was_deleted_mid_session_is_rejected`, `test_current_card_read_abandons_session_when_nothing_remains`). The single-card-delete test (`test_single_card_delete_cascades_mastery_and_nulls_review_log_card_refs`) asserted the `practice_card` row was gone but never re-read `current_card`, so nothing pinned the behavior this investigation was about: **cards remain, so the session moves on**.

`test_deleting_the_card_being_practiced_serves_the_next_pending_card` now seeds a session with two pending cards (`_setup` grew an additive `extra_cards=0` parameter), deletes whichever card the session is actually serving rather than assuming which one the ordering put first, and asserts the next `current_card` read returns a different pending card and leaves the session `active`.

## Consequence for the practice overview (plan 004, Phase 1)

The `active → abandoned` transition is **read-triggered only** — it happens inside `get_current_practice_card`, nowhere else. A session stranded by a cascade therefore keeps its stored `active` status until somebody opens it, so the overview list will show a stale "Active" badge for it and the Active filter will include it. This compounds the separately raised finding that nothing in the codebase ever writes `SessionStatus.completed` (`docs/cc/2026-08-24-practice-setup-phase-0-backend.md`): as things stand, a genuinely finished session and a stranded one both end up `abandoned`, and only after a read. No change is proposed here — the run-flow task owns what "finished" means — but Phase 1 should not present stored status as if it were live.
