# ADR 102: Bands as fractions of the strategy's reach, for the kinds of change in readiness

## Status

Active

## Context

A practice's summary lists every card once, with its mastery after the practice and its change as one of five kinds, up a lot, up, no change, down or down a lot; it counts the cards of each kind, and orders the list by mastery, by gains or by drops (PDR 024). A row shows no number.

A card opened from the summary shows each field the practice showed or asked, with its own mastery and its own change (PDR 025).

A field the user has never practiced counts as not ready, and a card's mastery runs over every field of its deck (PDR 021).

All mastery arithmetic sits under `app/mastery/`. Readiness, the figure every circle shows, runs from 0 to 1 under every strategy; `app/mastery/readiness.py` is the one module that folds readiness above the field and belongs to no strategy; and each strategy keeps its constants in its own module, where no other code can compute with them (ADR 083).

The breakdown read returns, for every card and every field, its readiness after the practice, its kind of change and its signed change, and the client counts the kinds and orders the cards from that payload and classifies nothing (ADR 084).

A run's deltas are read by attribution with per-field bounds, never by replaying history (ADR 042). For each field of each card the bounds select the ledger row before the practice and the row after it, or none when the field has never been reviewed; `_compute_field_mastery_deltas` in `app/services/practice_run.py` finds those two rows today.

The product side has placed the five kinds on a scale from 0 to 100 where 50 is no change: 80 and above is up a lot, 55 up to 80 is up, 45 to 55 is no change, 20 up to 45 is down, and below 20 is down a lot. Where that scale sits over readiness is left to the code side.

The strategy in use blends a side's stored value toward a rating's score by a fixed weight α and reads a side's readiness as its stored value over Good's score, capped at 1. One rating therefore moves a side's readiness by at most α × Easy's score ⁄ Good's score, about 0.45, and a field reviewed on both sides, whose readiness averages its sides, by half that. A rise of 0.6 in readiness is out of one rating's range.

A boundary between two kinds can be written as an amount of readiness or as a fraction of what one rating can do. An amount written as a number is tied to nothing: when α or a score changes, the number stays where it was.

Another strategy has a step of its own, which only its own constants give.

## Decision

We will measure a change in readiness as its value after minus its value before, for a card and for each of its fields, with a field never reviewed counting 0 on either side. The before and after are the readiness of the two rows the breakdown's per-field bounds select.

We will have every strategy state its reach, the furthest one rating can move a side's readiness, as a read-only property of the `MasteryStrategy` Protocol in `app/mastery/strategy.py`, computed from the strategy's own constants.

We will sort a change into the five kinds in `app/mastery/readiness.py` by laying the product's scale over the reach: the scale's middle is no change, its top a rise of one reach and its bottom a fall of one reach, so a point p on the scale stands at (p − 50) ⁄ 50 of the reach. We will write those fractions once, in that module, and write no boundary as an amount of readiness.

## Alternatives considered

### The scale laid over one whole point of readiness

Rejected because one rating moves a side by less than half a point, so up a lot and down a lot would never appear.

### Boundaries written as amounts of readiness

Rejected because they go stale silently when α or a score changes.

### A kind read from the rating alone

Rejected because a rating is not a change on the product's scale.

### The scale laid over a field's reach with both sides reviewed

Rejected because one Hard on an empty field would read up a lot.

### The change measured against the room a card had

Rejected because the badge would mostly say where the card started.

### The bands in the frontend

Rejected because it puts mastery arithmetic outside `app/mastery/`.

## Consequences

**Positive**

- The user meets every one of the five kinds within one practice, since the outer kinds sit within one rating's range.
- The developer adding a strategy states its reach and nothing else changes: the fractions stay as written and the kinds keep their meaning relative to what that strategy can do in one rating.
- The developer who changes α or a score moves every boundary with it, with no number to find and update.

**Negative**

- The developer implementing a strategy must compute its reach correctly, and a wrong reach sorts every change into the wrong kind with no check outside the strategy.
- The user whose field has history on both sides sees it read one kind lower per rating than a field with one side, since one rating moves it by half the reach.

**Neutral**

- The developer finds the product's four boundaries at +0.6, +0.1, −0.1 and −0.6 of the reach.
- The developer finds the frontend counting and ordering from the payload as before, with no band to compare against.
