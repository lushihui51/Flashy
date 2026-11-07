# PDR 029: What the user changed most recently, first in every collection

## Status

Active

## Context

A user often adds or fixes several things in a row, checking each one before going on to the next.

PDR 003 puts a list's one add button in its toolbar, at the top of the list.

PDR 018 opens a card's form wherever the user meets the card, and lands a subject or a deck just made on its own page. PDR 019 lets the user edit a card during a practice and from its summary. A thing is often added or edited away from the collection that shows it.

The user meets the same things in many collections: the lists in Your library and on a subject's and a deck's page, the Practice page, New practice's configurations grouped under their decks, the filters that narrow a list, and the pickers inside forms. A picker shows only some of its rows until the user types.

A subject holds decks, and a deck holds cards and configurations. Adding, fixing or clearing out a deck's cards or configurations is work on that deck.

Subjects and decks are listed by the user's most recent activity, and nothing says what counts as activity. A deck's cards are listed oldest first, so a new card lands at the bottom, away from the add button.

PDR 016 shows on Home the decks of the user's most recently completed practices, in the order they were practiced.

A practice is made, practiced and deleted, and never edited.

A change can reach many items at once. PDR 028 deletes a field with its value on every card of its deck.

Some collections have an explicit order of their own: a deck's fields, in the order the user sets, and a practice's summary, in the order PDR 024 lets the user choose.

One order cannot put first both what the user changed most recently and what they practiced most recently.

## Decision

We will put first, in every collection the user meets, whether a list, a group, a filter or a picker, what the user changed most recently, from the moment the change is saved, wherever the user made it. The order holds from one visit to the next.

A card or a configuration changes when the user adds or edits it. A deck changes when the user adds or edits it, and when they add, edit or delete one of its cards or configurations. A subject changes when the user adds or edits it, and when one of its decks changes.

Practicing changes nothing. A practice is never edited, so practices are listed by when they were made, most recent first.

A change that reaches many items at once moves none of them.

A collection with an explicit order of its own keeps that order.

## Alternatives considered

### Only what was added comes first, not what was edited

Rejected because a user who fixes a thing expects to find it at the top, as they do a thing just made.

### An edit moving an item only when made from the collection's own page

Rejected because a user who fixes a card during a practice looks for it at the top of its deck as well.

### New things pinned to the top for one visit only

Rejected because the same collection would read in a different order from visit to visit.

### Oldest first, with the page moving to the new item and marking it

Rejected because it leaves the user at the bottom of the list, with the add button at the top.

### Practicing counted as a change

Rejected because the order would mean both "I changed this" and "I practiced this", and a deck just fixed would sink below decks only practiced since.

### A deck's configurations not counting toward it

Rejected because a deck the user just made a configuration for would stay where it was.

### Deleting a card or a configuration not counting toward its deck

Rejected because a deck just cleared of mistakes would stay where it was.

### Subjects and decks moved only by their own adding or editing

Rejected because the filters and pickers would show a different order from Your library.

### Filters ordered by change, with pickers left alphabetical

Rejected because a picker would keep showing the alphabetically first rows, not what the user just made.

### Alphabetical everywhere

Rejected because it hides what was just made in a long list.

### "Most recent activity" left undefined

Rejected because each screen would read it its own way.

## Consequences

**Positive**

- The user who adds or edits several things in a row sees each one land at the top, right under the add button, without scrolling.
- The user meets one order in every collection, and finds the deck they just added cards to or fixed first in Your library, on its subject's page, in every filter and picker and on New practice.
- The user finds what they just changed among a picker's first rows without typing.
- The user finds a collection in the same order from one visit to the next.

**Negative**

- The user sees a deck's cards reorder whenever one of them is fixed.
- The user who looks for a thing by its name in a filter or a picker finds it by when it was last changed, not alphabetically, until they type.

**Neutral**

- The user reads a deck's cards from the most recently added or edited.
- The user who practices a deck finds it moved nowhere but on Home.
