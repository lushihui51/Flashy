# PDR 055: A card practiced in a run as a prompt zone above a list of rated answers

## Status

Active

## Context

PDR 008 gives a card a prompt side and an answer side, each with fields every card shows and fields drawn at random, so the fields a card shows can differ between its attempts.

PDR 021 keeps a mastery for each field of a card, built from the ratings given that field, so each answer field takes a rating of its own.

The app is used on phones held upright and on wide screens.

A paper flashcard has two faces and one answer, and the user turns it over. A card whose answer side is several fields, each rated, has a list where the paper card has a back.

Revealing one answer at a time lets the user test each before seeing the next, at a tap per field. Revealing all at once costs one tap and shows every answer together.

PDR 052 shows every page on a wide screen in the phone's layout, in one column in the middle of the window, about one and a half times as wide as a phone's screen.

The app is not yet published, and it is to be published as soon as it can be. A layout made for a wide screen waits until then.

Today a run sets a card's two zones side by side on a wide screen.

PDR 036 decided how a card is practiced in a run, and set its two zones side by side on a wide screen. This record replaces PDR 036 to set one above the other on every screen, and restates the rest unchanged.

## Decision

We will show a card during a run as two zones, a prompt zone above an answer zone, on every screen. The prompt zone is always visible.

We will keep every answer field hidden until one action reveals them all at once. Answers are never revealed one by one.

We will have the user rate each answer on its own, then move on to the next card.

## Alternatives considered

### A card with two faces that flips over

Rejected because the back would have to hold a list of separately rated fields rather than one answer.

### Revealing answers one at a time

Rejected because it costs the user a tap per field before rating.

### The two zones side by side on a wide screen

Rejected because it belongs to a layout made for a wide screen, which waits until the app is published.

## Consequences

**Positive**

- The user sees what is being asked before revealing, and the prompt stays in view while they rate.
- The user reveals every answer in one tap and rates each.

**Negative**

- The user who wanted to test one answer before seeing the next sees them all together.
- The user on a wide screen reads a card's answers beneath its prompt, though the window has room for them beside it.

**Neutral**

- The user reads a card's prompt above its answers on a wide screen as on a phone.
