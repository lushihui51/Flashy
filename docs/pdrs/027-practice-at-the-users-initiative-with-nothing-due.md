# PDR 027: Practice at the user's initiative, with nothing due

## Status

Active

## Context

The user opens the app when they feel like it and picks what to go over.

A practice is made on New practice, from the configurations the user picks. PDR 026 also lets the user start one from a practice they have done, by running it again or by practicing the cards they chose on its summary. A practice begins when the user starts it.

PDR 021 gives a card one mastery, saying how ready the user is to recall it, built from the ratings the user gives its fields and changed only when they practice. From a card's ratings and the time since them, an app can work out when the card is likely to be forgotten and name the day to review it. A deck worked toward a date, with practices paced to reach it, would draw on the same ratings.

A schedule would show itself across the app: a count of what is due, a next review date beside a card or a deck, a day to come back on at the end of a practice, a notification.

An app that schedules spares the user the choice of what to go over and asks them to trust its timing. An app that does not leaves the choice to the user, who chooses by what the app shows them.

No one has yet used the app to study. A schedule is built from a history of ratings no user has yet made, and what the app's users want told to them, and when, can be learned only from users.

## Decision

We will leave to the user what to practice and when. Every practice is started by the user.

We will mark no card as due and name no day to come back on, on any screen.

## Alternatives considered

### A schedule of reviews built from the user's ratings

Rejected because no user has yet made the ratings it would be built from, and what the app's users want told to them can be learned only once some have practiced on their own terms.

### A deck worked toward a date, with practices paced to reach it

Rejected because it paces the user from the same ratings none has yet made, toward a date the app does not yet ask for.

## Consequences

**Positive**

- The user goes over what they choose, when they choose, and is never told by the app that they are behind.

**Negative**

- The user with many decks gets no cue from the app about which to return to, beyond the mastery it shows.
- The user who stops opening the app is not reminded to come back.

**Neutral**

- The user sees no due count and no next review date on any screen.
