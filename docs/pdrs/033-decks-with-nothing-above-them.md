# PDR 033: Decks with nothing above them

## Status

Active

## Context

A user makes decks to hold the cards of what they study, and practices them.

Today every deck sits in exactly one subject. A subject has a name, a description and a picture, and the user makes one before their first deck and chooses one on every deck's form.

A subject gives the user a page that lists its decks, a way to practice its decks in one tap, and a mastery over every card in them. It is also one more kind of thing to tell apart on every screen, and one more place in a deck's address.

Where two decks share a name today, the name of the subject beside each tells them apart.

A practice holds one or more decks the user chose, so a practice already gathers decks the user studies together.

Flashcard apps differ here: Anki has no kind of thing above the deck, and Quizlet's folders are optional.

No user has yet shown a need to group decks beyond what a practice of several decks gives.

## Decision

We will have the user make decks and nothing above them: no deck belongs to a subject, or to any other kind of thing that holds decks.

We will list every deck in Your library as one list, and name a deck wherever it appears by its own name alone.

We will keep a deck's name unique among the user's decks.

We will take away the subjects the user has made, and keep every deck they held.

## Alternatives considered

### Subjects as they are

Rejected because the user pays for a required kind, a required step and a page, for the sake of a topic's mastery alone.

### Optional labels on a deck

Rejected because, though nothing would require them, they stay a kind of thing to tell apart, with no need for grouping shown yet.

### A subject a deck may or may not have

Rejected because it keeps the kind and adds a "no subject" state to every list.

## Consequences

**Positive**

- The user makes a first practice without making a subject first.
- The user tells one kind of thing fewer apart on every screen.
- The user finds every deck in one list, and knows each by its own name.

**Negative**

- The user loses the description and the picture of every subject they made.
- The user who studies a topic across several decks has no mastery for the topic and no page that gathers its decks, short of a practice of them.
- The user who had two decks of one name in different subjects finds them renamed apart.

**Neutral**

- The user gathers decks they study together by making a practice of them.
