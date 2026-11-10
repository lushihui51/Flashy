# PDR 035: A practice kept as a named set of decks, run as many times as the user likes

## Status

Active

## Context

A user goes over the same decks again and again: every day before an exam, or whenever they come back to a topic.

Today a practice is made on New practice, named by the moment it was made unless the user types a name, and gone through once. It is active until its last card is rated and completed from then on, and the Practice page and Home read those states.

Today running a completed practice again, whole or over cards the user chose, makes a new practice named by its date. A month of daily practice of one set of decks is thirty practices, each deleted on its own.

PDR 033 gives decks nothing above them, so a practice of several decks is the one thing that gathers decks the user studies together.

Today a deck's page offers to practice that deck.

A thing the user keeps is one they name, come back to and tell apart from others. A thing over in one sitting is one they look back on by when it happened.

## Decision

We will make a practice a thing the user keeps: the named set of decks they chose, which they run as many times as they like, until they delete it.

We will make each go through a practice a run of it, and give every run to one practice. Running a practice again, whole or over chosen cards, adds a run to it and makes no new practice.

We will give a run no name of its own: the user knows a run by the day it was run, and never names one.

We will make active and completed states of a run alone: a run is active until it ends, and completed from then on. A practice has no state.

We will have the user practice a deck only through a practice, which may hold that deck alone, and give a deck's page no way to practice it.

## Alternatives considered

### One sitting per practice

Rejected because the user's practices fill with dated copies of one set of decks, and a practice the user renamed loses its name when it is run again.

### One sitting per practice, named after the one it came from

Rejected because it still makes a row for every sitting, each deleted on its own.

### The user naming each run

Rejected because starting a run would stop at a name box for a thing over in one sitting.

### A dated run the user can rename

Rejected because it adds a form most users would never open.

### A practice taking its latest run's state

Rejected because "completed" would then be said of a practice the user runs again tomorrow.

### Three states for a practice: not started, active and completed

Rejected because it adds a word, and still puts a sitting's state on a thing the user keeps.

### A deck carrying its own runs, with practices only for several decks

Rejected because the user would meet two kinds of run and two places for a summary, and would leave a deck's history behind when they add a second deck.

### A deck's page that practices the deck by making a practice unseen

Rejected because a practice the user never made would appear among their practices.

## Consequences

**Positive**

- The user keeps one practice for each set of decks they study together, and finds every run of it under its name.
- The user names a practice once, and never names a run.
- The user reads "active" and "completed" only of a run, never of a thing they keep.
- The user learns one thing to make and run.

**Negative**

- The user who wants to practice a single deck makes a practice of it first.
- The user cannot name a run, and tells two runs of one day apart only by their order.

**Neutral**

- The user sees a practice's history grow as runs under it, rather than as new practices.
- The user meets a deck as material, made and changed in Your library and practiced only through a practice.
