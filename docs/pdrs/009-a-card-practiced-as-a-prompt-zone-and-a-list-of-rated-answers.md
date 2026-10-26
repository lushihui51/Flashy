# PDR 009: A card practiced as a prompt zone and a list of rated answers

## Status

Active

## Context

PDR 008 gives a card a prompt side and an answer side from its configuration, each with fields every card shows and fields drawn at random, so the fields a card shows can differ between its attempts.

PDR 007 keeps mastery per field of a card, built from the ratings given that field, so each answer field takes a rating of its own.

The app is used on phones held upright and on wide screens.

A paper flashcard has two faces and one answer, and the user turns it over. A card whose answer side is several fields, each rated, has a list where the paper card has a back.

Revealing one answer at a time lets the user test each before seeing the next, at a tap per field. Revealing all at once costs one tap and shows every answer together.

## Decision

We will show a card during a practice as two zones, a prompt zone and an answer zone, stacked one above the other on a tall screen and side by side on a wide one. The prompt zone is always visible.

We will keep every answer field hidden until one action reveals them all at once. Answers are never revealed one by one.

We will have the user rate each answer on its own, then move on to the next card.

## Alternatives considered

### A card with two faces that flips over

Rejected because the back would have to hold a list of separately rated fields rather than one answer.

### Revealing answers one at a time

Rejected because it costs the user a tap per field before rating.

## Consequences

**Positive**

- The user sees what is being asked before revealing, and the prompt stays in view while they rate.
- The user reveals every answer in one tap and rates each.

**Negative**

- The user who wanted to test one answer before seeing the next sees them all together.

**Neutral**

- The user reads prompt and answers side by side on a wide screen and one above the other on a tall one.
