# PDR 053: The working app for anyone who opens it, with no invitation, no account and no page before it

## Status

Active

## Context

The app is published for the people its owner gives its link to, and anyone else who finds it is welcome to use it.

No one has yet used the app to study.

Some visitors come only to look, a recruiter among them.

A visitor asked for an account before seeing anything is likely to leave, and may distrust typing an email and a password into a site they do not know.

Today a visitor who is not logged in is given only "Log in", and sees nothing of the app until they have an account.

An invitation lets an app's owner choose who has an account, and has the person invited wait for it. A page that says what an app is tells a visitor about the app before they use it, and stands between them and it.

PDR 012 keeps every deck to the user who made it, so a new account holds nothing until its user makes a deck.

PDR 057 has Home show a user who has not started a run the steps to a first practice.

## Decision

We will let anyone who opens the app make an account and use it. No invitation is needed.

We will let a visitor who is not logged in use the app as a new user does, with no account. They land on the address they opened, Home shows the steps to a first practice, and everything a logged-in user can do is open to them.

We will have no page that says what Flashy is.

We will keep "Log in" in the top bar for a visitor who wants an account.

## Alternatives considered

### Accounts only for people who are invited

Rejected because a person handed the link would wait for an invitation before starting, and a stranger who found the app would meet a closed door.

### An account before anything is shown

Rejected because a visitor who came to look leaves having seen nothing.

### A page that says what Flashy is, with a way to try it and a way in

Rejected because it puts a page and a sentence between the visitor and the app.

### A welcome page of pictures

Rejected because the visitor sees the app but cannot use it, and the pictures go out of date.

### Example decks in the library of a visitor who is not logged in

Rejected because their Home would differ from a new user's.

## Consequences

**Positive**

- The user given the link makes an account on their own and starts at once, and so does the user who found the address.
- The user who is not logged in is inside the working app the moment the page opens, with nothing to read or press first.
- The user who is not logged in meets exactly what a new user with an account meets.

**Negative**

- The user who came only to look meets an empty app, and makes a deck, a card and a practice before they see a card practiced.

**Neutral**

- The user who logs out lands in an empty app.
