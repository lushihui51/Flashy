# ADR 085: Refusal of a practice that generates no cards, on every path that creates one

## Status

Active

## Context

A practice is created on three paths: `start_practice_run`, from the configurations the user picks; `rerun_practice_run`, from a completed practice's own snapshots (ADR 076); and a practice of chosen cards, started from a completed practice's summary by "Practice these", from that practice's snapshots narrowed to the cards the user chose (PDR 026).

Each path checks its snapshots, cuts them and generates its decks' cards; nothing before generation counts what will be written.

A practice spans one snapshot per deck (ADR 078), so whether it has cards is a property of the whole practice, not of one deck.

A blank-valued field is excluded from generation (ADR 026), so a card that holds a value somewhere can still have nothing for one side of its snapshot, and no count of cards sees it.

A rerun or a practice of chosen cards copies snapshots from an earlier practice, and the cards they would generate may have been deleted or blanked since.

A run with no practice card is created active and is marked completed on its first state read, when no pending card is found (ADR 073); it then lists among the user's practices with a summary of nothing.

Every refusal a user reaches carries a code, and the sentence the user reads is chosen in the frontend by that code (ADR 070).

ADR 056 refused a practice that wrote no card on start and on rerun; a practice of chosen cards is a third path that creates one.

## Decision

We will refuse to create a practice that writes no practice card, on every path that creates one. After every snapshot has been checked and cut and every deck generated, and before the single commit, we will check that at least one practice card was written across all decks, so nothing of a refused practice is persisted.

We will have run start refuse with `RunStartError("no_cards")`; rerun refuse with `RerunError("no_cards")` after its `nothing_to_rerun` check; and a practice of chosen cards refuse with `no_cards` after its `nothing_to_practice` check. The router maps each to 400 with the coded detail shape the other codes use, with `config_id` null on start.

## Alternatives considered

### Refusal on the decks' card counts before generating

Rejected because it misses the blank-field cause, and generation, which runs anyway, is the only place the condition is known.

### Configurations of cardless decks disabled in the picker

Rejected because the configuration summary carries no card count, the blank-field cause is invisible to a count, and a guard in the client leaves the API able to create the empty practice.

### The empty practice allowed, relying on its lazy completion

Rejected because every surface that lists or opens it would have nothing to show.

### A distinct code per cause

Rejected because telling the causes apart would expose generation details the API does not carry.

## Consequences

**Positive**

- The developer gets a practice with at least one card on every path that creates one, judged across all its decks.
- The user is refused before an empty practice exists, with what they chose still on screen.

**Negative**

- The server runs generation to completion before refusing, the same cost as a practice that succeeds.
- The developer who adds a path that creates a practice must apply the check, since nothing in the database holds it.
- The user discovers a deck with nothing to practice only when the practice is refused, not when picking it.

**Neutral**

- The developer renders `no_cards` wherever a practice is started: New practice, a practice's own page and its summary.
