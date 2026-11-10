# PDR 038: One active run per practice, which the user can end at any card

## Status

Active

## Context

PDR 035 lets a practice have as many runs as the user gives it, each active until it ends and completed from then on.

Today a practice stays active until its last card is rated, or until the practice is deleted. A user who stops halfway leaves it active.

A user often stops partway through: the cards that matter to them are done, their time runs out, or the practice holds more cards than they meant to go through at once.

PDR 021 changes the user's mastery only when they practice, from the ratings they give.

Starting a practice can mean going on with a run left halfway or starting a new one. A single way to start must either choose between the two or ask.

## Decision

We will let a practice have at most one active run. Starting the practice continues its active run when it has one, and starts a new run only when none is active.

We will let the user end an active run before its last card. The run is then completed as it stands: what it did to the user's mastery stays, and its summary speaks only of the cards it reached.

## Alternatives considered

### Several active runs of one practice

Rejected because starting the practice would have to ask which run, and one practice would appear twice wherever active runs are listed.

### A new run ending the active one

Rejected because the user who meant to continue would lose their place.

### No way to end a run early

Rejected because a run left halfway would stay active, keeping a new run from starting, until the practice was deleted.

### Discarding the ended run as if it had never started

Rejected because its ratings would stay in the user's mastery with no run to show where they came from.

### Discarding the ended run and its ratings

Rejected because tidying up would unmake practice the user did.

## Consequences

**Positive**

- The user who starts a practice always gets the one thing left to do, and never chooses between continuing and starting over.
- The user makes a run as short as they want, and keeps what it did.

**Negative**

- The user who wants to start a practice afresh while a run of it is active ends that run first.

**Neutral**

- The user sees a run they ended early as completed, beside runs that reached every card.
- The user finds the cards an ended run never reached as they were before it.
