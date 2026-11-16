# PDR 053: An example library for anyone not logged in to look through

## Status

Active

## Context

The app is published for the people its owner gives its link to, and anyone else who finds it is welcome to use it.

No one has yet used the app to study.

Some visitors come only to look, a recruiter among them. The owner wants a visitor who is not logged in to see how the app runs, and nothing more.

A visitor asked for an account before seeing anything is likely to leave, and may distrust typing an email and a password into a site they do not know.

Today a visitor who is not logged in is given only "Log in", and sees nothing of the app until they have an account. This record calls such a visitor a guest.

An invitation lets an app's owner choose who has an account, and has the person invited wait for it. A page that says what an app is tells a visitor about the app before they use it, and stands between them and it.

PDR 012 keeps every deck to the user who made it, so a new account holds nothing until its user makes a deck, and no user's deck can be shown to a guest.

A card is practiced only in a run of a practice, and a practice is made of decks, so an app with nothing in it shows a card practiced only after a deck, a card and a practice have been made.

A library filled in advance has something on every page from the first moment, and is the same for everyone who sees it. A library a guest fills is their own, and starts empty.

Pages that show a library read as the user's own, "Your library" among them.

Rating a card changes its mastery.

PDR 057 has Home show a user who has not started a run the steps to a first practice, which count what the user has made, and list the user's runs from their first run on.

PDR 031 says in one banner at the top of every page when the connection is lost.

PDR 054 gives yellow to the one main action a screen is for and to "Log in", and ink to what is said.

"Log in" sits in the top bar of every page, directly beneath any banner, so a guest logs in from whatever page they are on. An account holds only what its user made, and PDR 031 answers the address of a thing the user does not have with a sentence saying it was not found.

## Decision

We will let anyone who opens the app make an account and use it. No invitation is needed.

We will show a visitor who is not logged in, a guest, one example library, the same for every guest, to look through with no account. A guest lands on the address they opened, and every page shows the example library as it shows a user their own.

We will fill the example library with what a user who has practiced for a while has: decks with their cards, practices of those decks, completed runs, and runs left partway, so that every page of the app has something to show. Home lists the example library's runs, and a guest never sees the steps to a first practice.

We will let a guest change nothing. Whatever would make, change or delete something, or rate a card, tells them to log in instead.

We will tell a guest on every page, in a banner in ink across the top, that what they see is an example and that logging in opens all of Flashy.

We will have no page that says what Flashy is.

We will keep "Log in" in the top bar for a guest who wants an account.

We will land a guest who logs in on Home, in their account, whatever page they were on, and a user who logs out on Home, in the example library.

## Alternatives considered

### Accounts only for people who are invited

Rejected because a person handed the link would wait for an invitation before starting, and a stranger who found the app would meet a closed door.

### An account before anything is shown

Rejected because a visitor who came to look leaves having seen nothing.

### A page that says what Flashy is, with a way to try it and a way in

Rejected because it puts a page and a sentence between the visitor and the app.

### A Home of its own for a guest, saying what Flashy is

Rejected because it puts a page and a sentence between the guest and the app, and the banner carries that sentence.

### A welcome page of pictures

Rejected because the pictures go out of date.

### The working app, empty, for a guest to use as a new user does

Rejected because it is too much to build for what it gives, and the guest would make a deck, a card and a practice before seeing a card practiced, and lose them when the page is loaded again.

### An example library a guest can also practice

Rejected because the owner wants a guest only to see how the app runs.

### An example library with no run left partway

Rejected because the guest would have no way to reach the screen where a card is practiced.

### An example library whose practices were never run

Rejected because every mastery circle would be empty, and the guest would see no card practiced and no summary.

### An example library of decks and cards only

Rejected because the guest would learn nothing of practices, runs or mastery.

### The steps to a first practice on a guest's Home

Rejected because they count what the user has made, and the example library holds all of it.

### Telling the guest nothing

Rejected because they find decks and runs they never made, with nothing saying whose they are.

### A quiet grey line in place of the banner

Rejected because it is easy to miss.

### A yellow banner

Rejected because a page with a main action of its own would then show three yellow things.

### A button to log in inside the banner

Rejected because "Log in" already sits directly under it.

### A banner saying only that it is an example

Rejected because a guest who presses nothing would never be told what logging in gives.

### The same address after logging in

Rejected because a guest who logs in from an example deck's page would read that the deck was not found as the first screen of their new account.

### The same page where the account has it, and Home otherwise

Rejected because the landing would then differ by the page the guest was on.

## Consequences

**Positive**

- The user given the link makes an account on their own and starts at once, and so does the user who found the address.
- The user who is not logged in sees a filled app the moment the page opens, with nothing to read or press first.
- The user who is not logged in finds something to look at on every kind of page the app has, and reaches a card in a run in one press from Home.
- The user who is not logged in reads on every page that what they see is an example, and how to get past it.
- The user who is not logged in makes nothing, so nothing of theirs can be lost.

**Negative**

- The user makes no deck and practices no card before they have an account.
- The user who makes an account goes from a filled app to an empty one.
- The user who is not logged in gives up the top of every page to the banner.
- The user who opened an address of their own while logged out opens it again after logging in.

**Neutral**

- The user lands on Home at every log-in and every log-out.
- The user who logs out lands in the example library.
- The user first meets the steps to a first practice on Home, after logging in to a new account.
