# PDR 039: A deck's configuration held by its practice and changed between runs

## Status

Active

## Context

PDR 008 lays a deck's fields out on a board: which are left out, which every card shows on its prompt side or its answer side, which are drawn at random, and how many. That layout is the deck's configuration.

Today a configuration is a thing of its own with a name, listed on its deck's Configurations tab, made and changed on two forms of its own, chosen one per deck on New practice, and copied into the practice when it starts. The user meets it in eleven sentences, three of them failures.

PDR 014 gives a configuration no page, has it deleted from its deck's list, and gives its form no delete.

Most users ask a deck one way at a time. Some ask one deck several ways, such as with its sides swapped.

PDR 035 makes a practice a set of decks the user keeps and runs many times.

A run goes card by card. A configuration changed in the middle of a run would ask its first cards one way and its last another, and its summary would speak of two ways of asking.

Two runs of one practice can ask a deck differently once its configuration can change between them.

Quizlet keeps how a set is asked as an option of the session, remembered for the set.

A board for twelve fields fills more than a phone screen.

This record replaces PDR 014, since a configuration stops being a thing the user deletes or edits on a form of its own.

## Decision

We will make a deck's configuration a part of a practice, never a thing of its own: it has no name, and it is made with its practice, kept with it and gone with it.

We will have a practice hold, for each of its decks, the configuration its next run asks that deck by, which the user sets and changes from the practice's page between runs.

We will give every deck of a new practice a configuration from the start, so the user can run the practice before touching a board.

We will have a run ask each deck as its configuration stood when the run started, to its end, and let the user read from a completed run's page how it asked each deck, without changing it.

We will take away the configurations the user made as things of their own, and keep in every practice the configurations it was made with.

## Alternatives considered

### Configurations as they are

Rejected because every user meets a kind to make, name and choose on every practice, for the sake of users who ask one deck several ways.

### One configuration per deck, kept like its fields

Rejected because a deck could then be asked only one way, short of a second copy of it and its cards.

### Configurations trimmed, with no tab and no typed name

Rejected because they stay a kind to choose and to tell apart.

### Configurations fixed for every run of a practice

Rejected because the user who swaps a deck's sides would keep one practice for each way of asking.

### Configurations chosen at the start of each run

Rejected because starting a run would stop at a board every time, or reuse a choice the user cannot see.

### Configurations set on New practice

Rejected because the user would set up what they can already run, before seeing the practice.

### Nothing showing how a completed run asked

Rejected because the user would have to work it out card by card.

## Consequences

**Positive**

- The user makes a first practice without making a configuration.
- The user changes how a practice asks between runs, and still starts a run in one tap.
- The user reads how any completed run asked each of its decks.
- The user never meets a sentence about a configuration's name or about choosing one.

**Negative**

- The user who wants one deck asked two ways at once makes two practices of it.
- The user who wants a practice to ask a deck differently partway through a run ends the run first.

**Neutral**

- The user sets how a deck is asked from the practice it is in, never from the deck.
- The user who made configurations finds them only in the practices made with them.
