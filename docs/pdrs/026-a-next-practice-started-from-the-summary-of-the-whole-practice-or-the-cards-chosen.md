# PDR 026: A next practice started from the summary, of the whole practice or the cards chosen

## Status

Active

## Context

After a practice, a user wants a next step, most of all to practice again the cards that slipped.

PDR 027 leaves to the user what to practice and when, and every practice is started by the user.

PDR 021 gives each card a mastery that says how ready the user is to recall it, so the cards whose mastery fell are among those to practice next.

PDR 024 shows how many cards of a practice had each kind of change, and the user can choose one or more of these counts to narrow the list to their cards.

A practice is made on New practice, from one configuration per deck, and holds every card of its decks. A practice's own page already offers to run it again.

## Decision

We will let the user start their next practice from a practice's summary, by running the whole practice again.

Once the user has chosen one or more counts, we will also let them start a practice of exactly the cards the list then shows. Each card is asked through the configuration it was practiced with, and the new practice is a practice like any other.

## Alternatives considered

### No next step from the summary

Rejected because the user who wants to practice the cards that slipped would go to New practice, which practices whole decks.

### Running the practice again only from the practice's own page

Rejected because the user who has just finished would leave the summary to do it.

### A practice of chosen cards offered with no count chosen

Rejected because, with nothing chosen, it would practice every card, which running the practice again already does.

## Consequences

**Positive**

- The user goes straight from a practice into the next one.
- The user practices again exactly the cards that slipped, and no others.

**Negative**

- The user who wants the chosen cards asked through a different configuration goes to New practice, which practices whole decks.

**Neutral**

- The user finds a practice of chosen cards in Practice beside practices of whole decks.
