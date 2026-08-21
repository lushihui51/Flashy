# Practice-card requeue spacing

**Date:** 2026-08-19
**Prompted by:** manual Phase 7 smoke testing — a practice session (6 cards, 4
field_defs, a `deck_practice_config` with 2 prompt fields + 2 answer fields) produced
a tight loop of 2 repeating cards. The user asked whether (a) a card failing when
*either* of its 2 answers is rated 1, and (b) a failed card reappearing immediately,
were intended.
**Outcome:** diagnosis confirmed both behaviors are intended; no change to the
requeue algorithm itself (deferred — the user is designing a replacement). The
investigation did produce three changes: `tests/api_tests/test_practice_session.py`
tightened, `docs/adr/008-use-sparse-positions-for-practice-card-ordering.md` amended,
`AGENTS.md` updated with the harshest-wins rule.

## Fail rule: any answer rated 1 fails the card

`app/services/practice_session.py:277-279`, inside `submit_rating`:

```python
failed = any(rating == 1 for rating in ratings.values())
new_status = PracticeCardStatus.failed if failed else PracticeCardStatus.passed
```

Any single answer-field rating of 1 fails the whole card — no averaging, no majority
vote. `grep -rn "PracticeCardStatus.failed" app/` turns up exactly one write site:
this one. Nothing else in the codebase ever sets a `practice_card.status` to `failed`
— confirmed, not just claimed.

The same "harshest wins" collapse is reused for the prompt-side mastery target in
`app/mastery/ema.py:63-71` (`EmaStrategy._aggregate_target`) — if any answer rating
in the appearance is 1, the prompt-side target is the harshest (rating-1) score,
otherwise the mean of the normalized scores. The plan doc's Phase 4.1 section
(`docs/plans/001-flashy-schema-rewrite.md`) is silent on this aggregation rule
entirely — it was an implementation decision, not a documented spec, until this
session's `AGENTS.md` edit recorded it under "Mastery model."

**Decision:** keep as-is. Consistent, deliberate, and now documented.

## Requeue position: no minimum spacing — contradicts ADR-008's stated intent

`_requeue_failed_card` → `_insertion_position`
(`app/services/practice_session.py:147-242`) does a pure mastery-ascending
merge-insertion of the requeued card against the session's current *pending* set.
There is no "reappear after N cards" offset anywhere; position is purely
rank-by-current-mastery.

Traced precisely why this produces "reappears immediately," with
`_POSITION_GAP = 1000` (`app/services/practice_session.py:41`):

1. `db_read_current_practice_card` always serves the lowest-position pending row
   (`app/database_ops/practice_card.py:27-39`) — the card being rated is, by
   construction, the front of the position-ordered queue.
2. A fail flips `practice_card.status` before requeue runs (line 279 before line
   289), so `db_read_pending_practice_cards` inside `_requeue_failed_card` returns
   everyone else, still position-ordered, with the just-failed card already excluded.
3. `_insertion_position` walks that list for the first card whose score is `>=` the
   new (just-blended-down) score. If the failed card's new score is below every
   remaining pending card — common for a card weak enough to draw a 1 — the loop
   never finds a `lower` neighbor: `lower_pos = upper.position - 2*_POSITION_GAP`,
   final position `= upper.position - _POSITION_GAP`.
4. `upper` is whatever pending card is now at the front of the queue, since the
   just-failed card (the previous front) was just removed.
5. The requeued card lands one `_POSITION_GAP` before that new front card — making
   it the new front. `db_read_current_practice_card` serves it next.

This is an exact consequence of the midpoint formula whenever a fail produces a new
session-wide-minimum score, not an approximation. Once several cards have passed and
left the pending set, the one or two persistently-weak cards left keep re-triggering
this branch against each other — the steady-state "2 repeating cards" observed — but
the "immediately next" mechanism is present from the very first failure.

Verified against live execution, not just derivation: in
`tests/api_tests/test_practice_session.py::TestPracticeSessionAcceptance::test_full_fail_requeue_cycle`,
the naive computed position for the requeued card collides with the just-failed row's
*own* position (never freed — the old row is marked `failed`, never deleted), which
triggers the position-collision fallback (`SET CONSTRAINTS ... DEFERRED` +
`db_renumber_pending_practice_cards`, same file, lines 235-237) before landing. The
exact numeric position is therefore an accident of the renumbering scheme, but the
guarantee that survives it — the requeued card becomes the new minimum position among
pending, i.e. what's served next — holds regardless.

**ADR-008** (`docs/adr/008-use-sparse-positions-for-practice-card-ordering.md`)
describes the intended model as "reappear after **x amount of cards**, x calculated
internally," but never defines `x`, and the shipped code substitutes pure
mastery-rank for it (`x` is effectively 0 in the common case above). Amended the ADR
today with a dated note stating this plainly rather than leaving the gap silent.

**Decision:** not a bug — no change to the algorithm this session. The user is
designing a replacement positioning algorithm separately.
**Revisit when:** that replacement algorithm is ready to implement.
`_insertion_position`/`_requeue_failed_card`
(`app/services/practice_session.py:147-242`) is what it will replace or extend, and
the ADR-008 amendment is where its actual `x` should get documented.

## Cross-run coupling — confirmed real, not a testing artifact

Mastery is never reset between sessions (only an explicit full `rebuild_mastery`
does that). Each fresh rating submission EMA-blends on top of whatever mastery state
already exists (`app/mastery/ema.py:73-90`). A card that failed in an earlier manual
run starts the next run already mastery-depressed, which sorts it earlier via
`_insertion_position` and biases `weighted_low_mastery_sample`'s field/pool choice
toward it in `generate_practice_card_fields`
(`app/services/practice_generation.py:26-51`). The user's own suspicion — that
repeated manual test runs aren't independent trials — is correct. No decision needed
here; noted for anyone re-running the same manual test and expecting fresh-state
results.

## Test changed as a result

`tests/api_tests/test_practice_session.py`, in `test_full_fail_requeue_cycle`: the
old assertion (`requeued.position != original_position`, with a comment hedging "at
or near the front") was weaker than the guarantee actually traced above. Tightened to
assert the guarantee itself:

```python
assert requeued.position == min(pending_positions)

current = db_read_current_practice_card(db, session.id, existing_user.id)
assert current is not None
assert current.id == requeued.id
```

`min(pending_positions)` rather than a hardcoded literal, because the exact number
depends on the renumbering fallback described above — asserting the invariant that
survives renumbering is correct; asserting a specific integer would have been
fragile. Full suite (109 tests) still passes.
