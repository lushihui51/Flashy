# ADR 113: A table of the cards a run could ask, written when the run is cut, for its count

## Status

Active

## Context

PDR 040 has every run say how many of its practice's cards it practiced, so the user knows whether it covered the whole practice. A run's count reads as N of M cards. M is the cards its practice held when the run started, leaving out any card blank in every field one side shows as its deck is asked; N is the cards the run reached; and both leave out any card the user has since deleted. A card added to one of the practice's decks during a run does not join that run.

A blank-valued field is excluded from generation, so a card can have nothing to show on a side and is skipped (ADR 026).

Every run belongs to exactly one practice (ADR 105). Each run is cut from the practice's configurations, and a run of chosen cards narrows each copy to its chosen cards (ADR 112).

Ending a run deletes its pending card rows (ADR 111), so an ended run's `run_card` rows hold only the cards it reached.

`run_card.card_id` is `ON DELETE CASCADE`, so a deleted card's rows leave every run.

Every read that returns a collection derives its per-row figures in a number of statements fixed regardless of row count (ADR 091).

## Decision

We will write, when a run is cut, one `run_counted_card (run_id, card_id)` row for each card of the practice that the run's copies could ask, judged by the same askability test generation uses, held in one function that both call. Its primary key is `pk_run_counted_card` on both columns, each column is `ON DELETE CASCADE`, and an index `ix_run_counted_card_card_id` serves the card's cascade.

We will read a run's M as its count of `run_counted_card` rows, and its N as its count of distinct `card_id` among its `run_card` rows that are not `pending`. A read of a list of runs reads each in one grouped statement.

## Alternatives considered

### M counted over `run_card`

Rejected because an ended run and a run of chosen cards hold only some of the practice's cards, so every one would read full.

### A `run.counted_card_ids` array

Rejected because a reader that takes its length counts deleted cards.

### A `run.card_total` count

Rejected because a deleted card leaves it too high, or the deletion closure must decrement it and still cannot tell which runs counted the card.

## Consequences

**Positive**

- The user reads a count that describes the run as it was cut, less what they have since deleted, so a run that reached every card it could ask reads full for good.
- The developer keeps M and N right through every card deletion with no deletion code.

**Negative**

- The database stores one row per counted card for every run.
- The developer keeps the askability test in the one function generation and the count share, or M counts cards generation skips.

**Neutral**

- The developer reads N from the run's card rows and M from a table of its own.
