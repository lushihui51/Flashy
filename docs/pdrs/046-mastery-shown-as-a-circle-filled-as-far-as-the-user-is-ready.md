# PDR 046: Mastery shown as a circle filled as far as the user is ready

## Status

Active

## Context

PDR 021 gives a card one mastery that says how ready the user is to recall it, from not ready to ready, and the same wherever the card appears. PDR 045 gives a deck and a practice the average mastery of their cards, none to a deck or a practice with no cards, and none to a run.

A number tells a user little about how ready they are.

A user meets decks, cards and practices as rows: in Your library, on a deck's page, on All practices and on a run's summary. A deck's page and a practice's page are headed by its name. Down a list, a user compares rows to choose what to practice next.

On the run page the user practices one card at a time, and their mastery changes with every rating they give. The run page shows the run's progress as a bar, and a run's row can show its progress as a bar too.

A ring that fills is how many screens show something still loading. A word repeated on every row takes room on every row.

PDR 015 gives every color one meaning: yellow the main action, ink what is said and done, red what went wrong or was a struggle. Most mastery sits in the middle, between not ready and ready.

PDR 023 showed the circle on subjects, decks and cards, and none on a practice's row, where a practice was one go through it. PDR 033 takes subjects away and PDR 045 gives a practice a mastery. This record replaces PDR 023 to show a practice's mastery, and restates the rest.

## Decision

We will show mastery as a small circle, outlined in ink and filled in ink as far as the user is ready, with no number. An empty circle is not ready, and a full one is ready.

We will show the circle for every deck, card and practice on its row wherever it is listed, and beside the heading of a deck's page and of a practice's page. A deck or a practice with no mastery shows no circle.

We will show no circle on the run page, and none on a run's row.

## Alternatives considered

### A number

Rejected because a number tells the user little about how ready they are, and a labelled number repeats the word "Mastery" on every row.

### A ring that fills, with or without the number inside

Rejected because it reads as something loading.

### A bar

Rejected because it reads as a run's progress.

### A number colored red, yellow or green by how ready the user is

Rejected because it gives yellow and red meanings PDR 015 does not give them, and nearly every number would come out yellow.

### The circle on the run page too

Rejected because it would change in front of the user with every rating during the run.

### The circle on a run's row

Rejected because a circle and a progress bar would share one row, and the circle would move with every rating of an active run.

## Consequences

**Positive**

- The user finds what to practice next down any list as the emptiest circle.
- The user reads how ready they are at a glance, with no number to interpret.
- The user meets mastery drawn the same way on every screen that shows a deck, a card or a practice.

**Negative**

- The user cannot read an exact figure off the screen, and two circles filled almost the same look alike.
- The user sees no mastery while practicing.

**Neutral**

- The user sees no circle on a deck or a practice with no cards, and none on a run.
