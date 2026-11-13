# PDR 016: Home as what the user can do next

## Status

Superseded by PDR 048

## Context

A user opens Home to start something. Home shows only that it is not built yet.

Before a first practice, a user makes a subject, a deck in it, a card in the deck, a configuration of the deck, and then a practice from that configuration, each on its own page.

PDR 018 lands a subject or deck made from its own entry on its page, and brings one made from a picker inside another form back to that form. The top bar's New starts a subject, a deck, a card or a practice from any page. A user making their first things moves from page to page without passing Home.

A practice stays active until it is finished, and a user may start several and leave them. The Practice page's Active tab lists every active practice.

A practice holds one or more decks, and one deck can be in several practices, active and completed.

PDR 027 leaves to the user what to practice and when, marks nothing as due, and never tells the user they are behind. A count that grows while the user is away, a mark of days practiced in a row, or the time since something was last done each change without the user acting.

PDR 015 marks at most one action on a screen as its main one, in yellow.

PDR 023 shows the mastery of every subject and deck as a circle, in Your library and wherever a deck is listed. PDR 021 counts a deck never practiced as not ready, so the least ready deck in the library is nearly always one just made or one set aside.

A user who has never practiced and a user who has practiced before come to Home needing different next steps.

## Decision

We will make Home show what the user can do next, and nothing on it will say how long ago anything happened or that anything is waiting.

Until the user has made a practice, Home shows the five steps to a first one, making a subject, a deck, a card, a configuration and a practice, with how many of the five are done. A step is ticked as soon as its thing exists, wherever the user made it. The first step not yet ticked is Home's main action. The steps leave Home once the user has made a practice, and never come back, even if the user later deletes everything.

Once the user has made a practice, Home shows up to three of their active practices, most recent first, each with its progress, and starting the most recent one is Home's main action. Home neither counts nor mentions any further active practice; the Practice page's Active tab holds them all.

Below the active practices, Home shows the three decks of the user's most recently completed practices, newest first, each deck once and each with its way to practice it. A practice still active counts none of its decks. With no active practice, practicing the first of these decks is Home's main action.

Last, Home offers a way to New practice.

## Alternatives considered

### Home as it is, saying it is not built yet

Rejected because it is a dead end.

### The decks practiced most recently, alone

Rejected because it leaves a user who has not practiced yet with nothing that works.

### Quotes

Rejected because they are not the user's own material.

### A quick way to a new card

Rejected because the top bar's New already offers one from every page.

### Days practiced in a row

Rejected because it punishes the user for missing a day.

### A step ticked only when done from Home

Rejected because a user making their first things does not come back to Home between steps, and would find steps they had done still unticked.

### Every active practice, with no limit

Rejected because a long list of unfinished practices reads as a backlog.

### Only the most recent active practice

Rejected because a user who left several practices would find only one of them on Home.

### The decks whose cards were rated most recently

Rejected because it repeats the decks of active practices, which Home already shows above them.

### The least ready deck in the library

Rejected because it nearly always points at a deck just made or set aside on purpose, and nags until it is practiced.

### The least ready subject

Rejected because one new deck drags a subject down.

### A mark on the least ready of the recent decks

Rejected because their circles already show it, and it competes with Home's one main action.

### A line saying how many more active practices there are

Rejected because a count that grows reads as being behind.

## Consequences

**Positive**

- The user who has not practiced yet sees on Home how far they are from a first practice and what to make next.
- The user who makes their first things from the top bar or from inside another form finds them ticked when they come back to Home.
- The user who has practiced before goes back into a practice they left, or practices a deck they are working on, straight from Home.
- The user is never told by Home that they are behind or that something is waiting.
- The user never finds a practice they are still working through repeated in the decks below it.
- The user is shown only what they have chosen to work on, and finds any other deck in Your library.

**Negative**

- The user with more than three active practices finds the rest only on the Practice page, and Home does not say there are more.
- The user who deletes everything after a first practice does not see the steps again.

**Neutral**

- The user sees the steps to a first practice only until they make one, and a different Home from then on.
- The user who deletes a completed practice sees its decks leave Home, unless another completed practice holds them.
