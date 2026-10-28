# PDR 001: One vocabulary for every screen

## Status

Active

## Context

A user of Flashy names things to themselves by the words the screens show them. A word learned on one screen travels to the next.

The user meets both halves of the app in one sitting: they make a subject, a deck and its cards in the library, then practice them.

The screens are written one at a time, and their words differ in small ways: a thing is started with "New", "Add" or "Create", two of them side by side on the deck page; a thing's address runs subject-then-deck on most screens and deck-then-subject on New practice; the verb is "practiced" on one screen and "practised" on two.

A table of words covers practice alone, and the library's words are each screen's own.

Some words on the screens name nothing the user can see: the browser tab is titled "frontend", a hint says "config", the practice tabs carry the label "Session status", and a failed save can answer with a sentence such as "practice_card is not the current card".

A word chosen for one screen can fit that screen exactly. A word shared by every screen may fit one screen less well, but the user meets it everywhere and never has to ask whether two words mean one thing.

## Decision

We will keep one reference, docs/vocabulary.md, that gives the word for each concept the app shows and for each act on it, and says how words are joined when a screen names a thing by the places it belongs to. We will use those words wherever the user meets the concept or the act named. Only words the reference gives appear on a screen; a name from the code never does. We will write the app's words in American English. A word changes in the reference, not here.

## Alternatives considered

### Words chosen by each screen

Rejected because a user carries words between screens, and whoever writes a new sentence needs one place to look.

### Two word sets, one for the library and one for practice

Rejected because the user crosses both in one sitting, and the seam between them is where words would differ.

### The words inside this record

Rejected because a word changes more often than the decision to have one word for each thing, and every change would supersede this record.

### Two kinds of English at once

Rejected because the same word would then be spelled two ways on two screens.

## Consequences

**Positive**

- A user finds the same act under the same word on every screen.
- Whoever writes the next sentence has one reference to take its words from, and a reviewer has one reference to check it against.
- A name from the code that reaches a screen is a defect by this record, not a matter of taste.

**Negative**

- A concept new to the app cannot be named on a screen until the reference names it.
- A screen whose words differ from the reference contradicts this record until it is changed.

**Neutral**

- The reference begins as the practice table AGENTS.md points at, extended to the whole app.
