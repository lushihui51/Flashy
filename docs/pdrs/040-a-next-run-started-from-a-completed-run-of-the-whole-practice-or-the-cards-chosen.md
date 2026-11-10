# PDR 040: A next run started from a completed run, of the whole practice or the cards chosen

## Status

Active

## Context

After a run, a user wants a next step, most of all to practice again the cards that slipped.

PDR 037 leaves to the user what to practice and when, and every run is started by the user.

PDR 021 gives each card a mastery that says how ready the user is to recall it, so the cards whose mastery fell are among those to practice next.

A run's summary shows how many cards had each kind of change, and the user can choose one or more of these counts to narrow its list to their cards.

PDR 035 keeps every run under its practice. PDR 038 lets a practice have one active run at a time. PDR 039 makes a practice's configurations what its next run asks.

Today the summary offers "Re-run", which makes a new practice of the same decks after asking first, and, once a count is chosen, "Practice these", which makes a new practice of the cards shown, each asked by the configuration it was practiced with. Nothing on the new practice says it holds only some of the cards. PDR 026 decided these, and this record replaces it, since a next run now belongs to the practice it runs.

A run can hold fewer cards than its practice: one started over chosen cards, and one the user ended early under PDR 038.

## Decision

We will let the user start a next run of a practice from a completed run's page, over every card of the practice.

Once the user has chosen one or more counts on the summary, we will also let them start a run of exactly the cards the list then shows.

Both are runs of the same practice, kept under it, and both ask each deck by the practice's configurations as they stand.

While the practice has an active run, we will start neither, and tell the user so; the active run is gone on with only by continuing it.

We will have every run say how many of its practice's cards it practiced, whether it practiced all of them or some.

## Alternatives considered

### No next step from a completed run

Rejected because the user who wants to practice the cards that slipped would have to make a new practice of whole decks.

### Running again only from the practice's page

Rejected because the user who has just finished would leave the summary to do it.

### A run of chosen cards offered with no count chosen

Rejected because, with nothing chosen, it would practice every card, which running the whole practice again already does.

### A next run that continues the active run when there is one

Rejected because the user cannot tell from the button what it will do.

### A next run that ends the active run

Rejected because the user who meant to continue it would lose their place.

### The completed run's own configurations

Rejected because the next run would ask the old way while the practice's page shows the new one.

### Hiding the run of chosen cards while a run is active

Rejected because the user would choose a count and find nothing to start.

### Nothing saying how many cards a run practiced

Rejected because the user would open a run expecting the whole practice.

### A count only on a run of fewer cards than its practice

Rejected because a run with no count would mean "all" only once the user had learned it.

### A word instead of a count

Rejected because a run both narrowed and ended early would need two.

## Consequences

**Positive**

- The user goes straight from a completed run into the next one.
- The user practices again exactly the cards that slipped, and no others, under the same practice.
- The user never loses an active run by starting again.
- The user reads how much of its practice any run covered.

**Negative**

- The user who wants the chosen cards asked differently changes the practice's configurations first, which changes how its next whole run asks too.
- The user with an active run finishes or ends it before starting again from a completed run.

**Neutral**

- The user sees a count of cards on every run, on runs of the whole practice too.
