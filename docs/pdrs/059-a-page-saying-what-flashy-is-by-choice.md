# PDR 059: A page saying what Flashy is, by choice

## Status

Active

## Context

A user who meets Flashy may want to look up what it is: what it is for, why it works as it does, and how to use it. They want to look it up when they choose, and not before they meet the app.

Google's sign-in review asks an app for a public page that says what the app does.

PDR 060 shows a visitor who is not logged in, a guest, the example library on whatever address they opened, and lands a user who logs in or out on Home. A page met before the app stands between a visitor and it.

Flashy is built on ideas a newcomer does not expect of flashcards. A card holds one value for each named field of its deck, often more than two. PDR 008 lets a field be drawn at random, so what a card asks changes from one attempt to the next. PDR 021 keeps a mastery for each field of a card.

A user goes from making a deck and its cards, to a practice of decks, to its runs and the summary each run leaves.

A guest never sees the account, and a logged-in user sees no guest's banner. The menu is on every page, for guest and user alike.

PDR 001 lets only the vocabulary's words appear on a screen.

Flashy's description for those who build it holds its one-line description, its ideas and how it works, beside how to set it up and how it is built, and parts of it no longer match the app.

## Decision

We will have a page that says what Flashy is, and let no one meet it before the app: it takes the place of no address a visitor opens and of no page a user lands on.

We will let anyone, guest or user, reach it from every page.

We will have it say what Flashy is for, the ideas it is built on, and how the user goes from making things to practicing them, true to the app as it works, and nothing about how Flashy is built or run.

## Alternatives considered

### No page that says what Flashy is

Rejected because a user who wants to know what Flashy is would have nowhere to look, and Google's sign-in review asks for one.

### A page met before the app

Rejected because it stands between the visitor and the app they came to see.

### A way to it from the account alone

Rejected because a guest never sees the account.

### A way to it from Home alone

Rejected because it is reached from one page, and missed below the runs.

### A way to it in the guest's banner

Rejected because a logged-in user has no banner.

### A comparison with another flashcard app

Rejected because a user who does not know that app reads about another product.

### How Flashy is built

Rejected because it is not about the user.

### The one-line description alone

Rejected because the user would not learn what a practice or a run is.

### The whole of Flashy's description for its builders

Rejected because the user would meet set-up steps and tables they cannot use.

## Consequences

**Positive**

- The user who wants to know what Flashy is reads it from any page, whenever they choose.
- The user who is not logged in reads what Flashy is without making an account.
- The user learns why a Flashy card differs from a two-sided card, and how to go from a deck to a run.
- The user meets the app itself first, with no page before it.

**Negative**

- The user who never opens the page learns Flashy's ideas only by using it.

**Neutral**

- The user reads on the page the words the screens already show.
