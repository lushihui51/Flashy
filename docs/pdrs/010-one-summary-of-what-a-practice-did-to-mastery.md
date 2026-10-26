# PDR 010: One summary of what a practice did to mastery

## Status

Active

## Context

PDR 009 has the user rate each answer of a card during a practice and move on, so after a card is passed it is not seen again until the summary.

A rating cannot be changed once given. A failed card returns later in the same practice, so one card can have several attempts.

At the end of a practice the user asks two things: what happened to each card, and what the practice did to their mastery.

Nothing in a practice changes once it is complete.

A practice has a run page, where it is carried out, and its own page, reached from the list of practices.

PDR 006 names a card shown as a row by its primary field. PDR 007 gives a card one mastery and one change, and each of its fields their own.

## Decision

We will show only the current card during a practice. A rated card cannot be revisited, and its rating cannot be changed.

We will turn the run page into the practice's summary, in place, when nothing is left, and show the same summary on the practice's own page from then on.

We will list every card once in the summary, with its name, its mastery, its change and a badge for its outcome, sorted by what moved or by mastery, and say how many cards were practiced.

We will open a card's row into its detail: every attempt, each marked passed or failed, with its fields labeled and each answer's rating, followed by every field of the card's deck with its mastery and change.

## Alternatives considered

### Browsing already-rated cards mid-practice

Rejected because they could only be looked at.

### A summary at completion that differs from the one the practice's page shows later

Rejected because two views of the same facts drift apart.

### Four tabs by outcome as the summary's structure

Rejected because it answers what happened but not what it did to mastery.

### A row per attempt

Rejected because it fills the list with one card's retries.

### A detail showing only the fields the practice asked

Rejected because it hides that other fields moved too.

## Consequences

**Positive**

- The user reads one summary, at the end and whenever they return, ranked by what moved, with the outcome as a badge.
- The user who wants only the failed cards scans the badges.
- The user sees in a card's detail that fields the practice did not ask moved too.

**Negative**

- The user who misrated a card cannot go back and change it.
- The user who wants a card's retries in the list finds them only in the card's detail.

**Neutral**

- The user sees the count of cards practiced, not the count of attempts.
