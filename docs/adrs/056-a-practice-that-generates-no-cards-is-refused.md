# ADR 056: A practice that generates no cards is refused

## Status

Accepted

## Context

`start_practice_run` validated each configuration, cut its snapshot, and generated the deck's cards, but never counted what it wrote. A deck with no cards, or a deck whose every card was blank in all the fields one side of the configuration shows, produced a run with zero practice cards: created as `active`, then completed lazily on its first state read (ADR 015 as amended), a phantom in the practice list with a breakdown of nothing. The 2026-09-23 sync verified it with a scratch test: `POST /api/practice_runs` on a zero-card deck returned 201, and `GET .../state` returned `completed` with `total_cards: 0`. Task 004's carried invariant 2 said "no cardless session", and the configuration validator's own comment called an empty run "the one state that must never exist", but only the uncounted-pool case was guarded, at validation time. The create page had no guard either, and cannot have a cheap one: the configuration summary carries no card count.

Two facts shape the rule. A practice spans several decks, one configuration each, so emptiness is a property of the whole practice, not of one deck. And the second cause is invisible to a count: ADR 026 excludes a blank field from generation, so a card that is legal (at least one value somewhere) can still have nothing for a configuration's prompt side or answer side. The random draw cannot produce that case, since the blank filter runs in the candidate query before the draw, pool counts are validated to `1..n`, and the draw takes `min(k, eligible)`; a side is empty only when the card's values leave it nothing to show.

## Decision

Run start refuses with `RunStartError("no_cards")` when, after every selected configuration has been validated and snapshotted, zero practice cards were written across all decks. The check is `next_position == 0` after the per-deck loop and before the single commit, so the refused run, its snapshots, and nothing else are persisted, exactly as the existing `stale_config` refusal behaves. Rerun applies the same check with `RerunError("no_cards")` after its `nothing_to_rerun` check, since a completed practice whose cards were since deleted would otherwise rerun into an empty one. The router maps both to 400 with the `{code, message}` detail shape the other codes use (`config_id: null` on start). The message a user reads belongs to the frontend, keyed on the code, and names the two real causes: the selected decks have no cards, or every card is blank in every field its configuration shows on one side.

## Alternatives considered

### Refuse on deck card counts before generating

Rejected. It misses the blank-field cause entirely, and generation, which must run anyway, is the only place the condition is known.

### Disable configurations of cardless decks in the picker instead

Rejected as the invariant. The summary has no card count, the blank case is invisible to a count, and a client-side guard leaves the API able to create the phantom run. A picker hint remains a possible convenience on top of the refusal.

### Let the empty run exist and rely on lazy completion

Rejected. It is the state the invariant forbids, and every surface that lists or opens the run has to render nothing.

### A distinct code per cause

Rejected. Telling the two causes apart would mean exposing generation details the API does not carry, and one sentence names both.

## Consequences

Benefits:

- Invariant 2 holds again, for start and for rerun, and it holds collectively across a multi-deck practice.
- The failure is explained in the user's terms, with the selection still on screen to fix.

Costs:

- Generation runs to completion before the refusal, the same cost as a start that succeeds.
- One more error code for the create page and the details page to render (task 015 MD-2).
- A cardless deck is discovered on Create, not in the picker.
