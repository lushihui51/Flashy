# PDR 012: A deck kept to the user who made it

## Status

Active

## Context

Every user builds their own decks: a deck is made in the library, given its fields, filled card by card, and practiced by the user who made it.

Two users studying the same material each build it from scratch. A deck built by another user would save its receiver the making of it.

Sharing could take two shapes: a copy, the receiver's own to change freely, parting from the original from the moment it is made; or a view of the original, following every change its maker makes, which the receiver cannot change. Each gives the receiver something the other does not.

Sharing would show itself across the app: an offer to share on a deck's page, a deck arriving in the receiver's library, a notification that one arrived. A page's address can be handed to anyone, in a message or a link, and is the one way a deck could reach another user with no such screen.

No one has yet used the app to study, so there are no two users to pass a deck between. Whether a receiver wants a copy of their own to change, or a view that follows its maker's changes, is a question about users that only users can answer.

## Decision

We will keep a deck to the user who made it. A deck reaches no other user, not even one handed its address.

We will offer on no screen to share a deck or to send a copy of one, and show on no screen a deck made by someone else.

## Alternatives considered

### A copy of a deck sent to another user

Rejected because there are no two users yet to pass a deck between, and whether a receiver wants a copy of their own to change, parting from the original, is a question only users can answer.

### A view of a deck's original shared with another user

Rejected because there are no two users yet, and whether a receiver wants a view that follows its maker's changes and that they cannot change is a question only users can answer.

## Consequences

**Positive**

- The user's decks are seen by no one else.

**Negative**

- The user who studies what another user has already built builds it again, card by card.
- The user who hands another user a deck's address gives them nothing they can open.

**Neutral**

- The user sees in the library only the subjects and decks they made.
