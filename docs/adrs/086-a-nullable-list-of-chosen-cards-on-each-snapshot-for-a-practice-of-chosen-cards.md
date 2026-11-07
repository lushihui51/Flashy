# ADR 086: A nullable list of chosen cards on each snapshot, for a practice of chosen cards

## Status

Active

## Context

A run holds one `practice_deck` snapshot per deck (ADR 078), each a copy of one configuration's six arrays cut at run start, and generation reads only that row for the run's lifetime (ADR 013).

`_snapshot_and_generate_deck` in `app/services/practice_run.py` generates every card of the deck, read by `db_read_card_ids_for_deck`, and nothing records which cards a run covers.

PDR 026 lets the user start, from a completed practice's summary, a practice of exactly the cards they chose, each asked through the configuration it was practiced with, and makes it a practice like any other, which can be re-run.

The chosen cards are those the summary's chosen counts narrow its list to (PDR 024).

A rerun builds from the completed run's own snapshots, drops a snapshot whose arrays no longer validate against its deck's live fields, and refuses with `nothing_to_rerun` when none survives (ADR 076).

The one check of a snapshot against its deck's live fields is `validate_deck_practice_config` (ADR 077).

A rerun creates a new run and leaves the original in place (ADR 039).

A rerun copies each snapshot's `source_config_id`, its attribution link to the configuration, and its `source_config_name`, the configuration's name as last linked (ADR 040, ADR 068).

A completed run keeps a dead id in its snapshot arrays after the card or field it named is deleted (ADR 092).

A practice that writes no practice card is refused with `no_cards` on every path that creates one (ADR 085).

Every refusal a user reaches carries a code, and the sentence the user reads is chosen by that code (ADR 070); the sentence for `nothing_to_rerun` says the practice can't be re-run.

## Decision

We will give `practice_deck` a nullable `card_ids` uuid array. Null means every card of the deck; a list means only those of the deck's cards that still exist. Generation reads it from the frozen row, like the six arrays.

We will build a practice of chosen cards from the completed run's own snapshots: one new snapshot for each deck that holds a chosen card, its six arrays, `source_config_id` and `source_config_name` copied, and its `card_ids` set to that deck's chosen cards. We will check each with `validate_deck_practice_config` and drop one that fails, with its deck's chosen cards. If none survives, we will refuse with `nothing_to_practice` and write nothing.

We will have rerun copy `card_ids` verbatim, so a rerun covers the same cards as the practice it repeats.

We will leave a deleted card's id in `card_ids`, where it selects nothing.

## Alternatives considered

### A `practice_deck_card` table, cascading with the card

Rejected because an empty set would read as every card, so a deck whose chosen cards were all deleted would rerun whole.

### A rerun taking its cards from the run's own practice cards

Rejected because every rerun would drop the cards added to its decks since.

### A hidden configuration holding the chosen cards

Rejected because a configuration chooses fields, not cards, and would show in the deck's list of configurations.

### Snapshots copied without the check

Rejected because generation would skip a deleted field's id and ask the card through a layout it was not practiced with.

### Reusing `nothing_to_rerun`

Rejected because its sentence says the practice can't be re-run, which is not what the user asked for.

## Consequences

**Positive**

- The user's practice of chosen cards holds exactly those cards, and its rerun covers the same ones.
- The user's rerun of a practice of whole decks still takes in the cards added to its decks since.
- The developer treats a snapshot that names a deleted field the same way on a rerun and on a practice of chosen cards.

**Negative**

- The developer runs a migration that adds the column.
- The developer reading `card_ids` must expect dead ids, since no cascade removes them.

**Neutral**

- The developer meets a third path that copies `source_config_id` and `source_config_name`, beside run start and rerun.
