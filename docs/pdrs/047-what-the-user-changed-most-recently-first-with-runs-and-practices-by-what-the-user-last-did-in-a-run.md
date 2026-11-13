# PDR 047: What the user changed most recently first, with runs and practices by what the user last did in a run

## Status

Active

## Context

A user often adds or fixes several things in a row, checking each one before going on to the next.

PDR 003 puts a list's one add button in its toolbar, at the top of the list.

PDR 034 opens a card's form wherever the user meets the card, and lands a deck just made on its own page. PDR 042 lets the user edit a card during a run and from its summary. A thing is often added or edited away from the collection that shows it.

The user meets the same things in many collections: the lists in Your library, on a deck's page and on All practices, the filters that narrow a list, and the pickers inside forms. A picker shows only some of its rows until the user types.

PDR 033 leaves a deck nothing above it, and a deck holds cards. Adding, fixing or clearing out a deck's cards is work on that deck. PDR 039 makes a deck's configuration a part of a practice rather than a thing of its own.

PDR 035 makes a practice a thing the user keeps for months and runs again and again. A practice has a name and, under PDR 039, configurations the user changes between runs.

A practice listed by when it was made sinks below every practice made since, however often the user runs it.

PDR 038 gives a practice at most one active run, which the user continues whenever they like and can end at any card. A run may be started on one day, continued on others, and ended on another.

PDR 040 starts a next run of a practice only while none of its runs is active, so one practice's runs never overlap.

PDR 048 lists on Home the active runs of several practices at once, and makes the play button of one of them Home's main action.

The moment a run started says nothing of whether the user has been in it since. A run may have nothing rated yet, and a run ended early has an ending with no rating at that moment.

A change can reach many items at once. PDR 044 deletes a field with its value on every card of its deck.

Some collections have an explicit order of their own: a deck's fields, in the order the user sets, and a run's summary, in the order PDR 041 lets the user choose.

One order cannot put first both what the user changed most recently and what they practiced most recently.

PDR 029 counted subjects and configurations among the things that change, and listed practices by when they were made because a practice was never edited. This record replaces PDR 029 to list runs and practices by what the user last did in a run, and restates the rest.

## Decision

We will put first, in every collection the user meets, whether a list, a group, a filter or a picker, what the user changed most recently, from the moment the change is saved, wherever the user made it. The order holds from one visit to the next.

A card changes when the user adds or edits it. A deck changes when the user adds or edits it, and when they add, edit or delete one of its cards.

Practicing changes no deck or card.

We will make a run as recent as the last thing the user did in it: starting it, rating a card in it, or ending it, and list runs by it, newest first.

We will list practices by the last thing the user did in any of their runs, newest first, and a practice never run by when it was made. Renaming a practice or changing its configurations moves it nowhere.

A change that reaches many items at once moves none of them.

A collection with an explicit order of its own keeps that order.

## Alternatives considered

### Only what was added comes first, not what was edited

Rejected because a user who fixes a thing expects to find it at the top, as they do a thing just made.

### An edit moving an item only when made from the collection's own page

Rejected because a user who fixes a card during a run looks for it at the top of its deck as well.

### New things pinned to the top for one visit only

Rejected because the same collection would read in a different order from visit to visit.

### Oldest first, with the page moving to the new item and marking it

Rejected because it leaves the user at the bottom of the list, with the add button at the top.

### Practicing counted as a change to a deck or a card

Rejected because the order would mean both "I changed this" and "I practiced this", and a deck just fixed would sink below decks only practiced since.

### Deleting a card not counting toward its deck

Rejected because a deck just cleared of mistakes would stay where it was.

### Decks moved only by their own adding or editing

Rejected because the filters and pickers would show a different order from Your library.

### Filters ordered by change, with pickers left alphabetical

Rejected because a picker would keep showing the alphabetically first rows, not what the user just made.

### Alphabetical everywhere

Rejected because it hides what was just made in a long list.

### Runs by when the user started them

Rejected because a run continued today would stay below one started yesterday, and the run the user is in the middle of would not come first.

### Runs by when the user last rated a card in them

Rejected because a run with nothing rated would have no moment to order it by, and a run ended early would be placed apart from when it ended.

### Practices by when they were made

Rejected because the practice the user runs daily would sink below every practice made since.

### Practices by their most recent change

Rejected because changing a configuration would move a practice, and running it daily would not.

## Consequences

**Positive**

- The user who adds or edits several things in a row sees each one land at the top, right under the add button, without scrolling.
- The user meets one order for decks and cards in every collection, and finds the deck they just added cards to or fixed first in Your library and in every filter and picker.
- The user finds what they just changed among a picker's first rows without typing.
- The user finds a collection in the same order from one visit to the next.
- The user finds the practice they last worked in at the top of their practices.
- The user finds the run they were last in first wherever runs are listed.

**Negative**

- The user sees a deck's cards reorder whenever one of them is fixed.
- The user who looks for a thing by its name in a filter or a picker finds it by when it was last changed, not alphabetically, until they type.

**Neutral**

- The user reads a deck's cards from the most recently added or edited.
- The user who renames a practice or changes how it asks finds it where it was.
- The user who goes back to an old active run for a single card brings it, and its practice, to the top.
