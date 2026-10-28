# PDR 003: Header actions for the thing and one add button inside each list

## Status

Active

## Context

A page that shows a thing offers two kinds of act: acts on the thing itself, such as editing, deleting or practicing it, and acts that add to a list the page shows. The library shows subjects and decks on two tabs, a subject's page shows its decks, a deck's page shows its cards and its configurations on two tabs, the Practice page shows practices, and New practice shows configurations to choose from.

A list is empty before the user adds to it, and the user adds to a list most often when it is empty.

A list is at other moments still loading or failed to load, and a list narrowed by filters can be empty while the list itself is not.

A page with tabs shows one list at a time, and a button outside the tabs is seen whichever tab is open.

A button in the same place whether the list is empty or full is found by habit. A button inside the empty list's sentence is beside the words that invite it, and gone once the list has one thing.

PDR 002 replaces a list that will not load, in its own place, with its sentence.

## Decision

We will put what the user can do to the thing a page shows, such as edit it, delete it or practice it, in the page's header.

We will put what adds to a list the page shows inside that list, as the one labeled button in the list's toolbar row. The toolbar row, its button and label included, stays whether the list is empty, still loading or failed to load. A page that is itself one list has its header as that list's toolbar.

We will show an empty list as its sentence alone, and a list emptied by filters offers to clear them.

We will put no icon-only button whose meaning depends on the open tab on any page.

## Alternatives considered

### A header "+" that switches meaning with the open tab

Rejected because the user must guess what it adds.

### The button both in the toolbar and in the empty state

Rejected because it shows two identical buttons with nothing between them.

### The button in the empty state only, with the toolbar hidden while the list is empty

Rejected because the button moves depending on the count.

### Every action in the header

Rejected because it hides whether a button acts on the thing or on one of its lists.

## Consequences

**Positive**

- The user reads a button's scope from where it sits: the header for the thing, inside a list for that list.
- The user finds one add button per list, in the same place whether the list is empty or full.
- The user sees a list's label and count while it is empty, above the sentence that says so.

**Negative**

- The user who reads an empty list's sentence looks up, past any column headers, to find the button that fills it.

**Neutral**

- The user sees two add buttons on a deck's page, one on each tab's list.
- The user finds the add button of a page that is itself one list in its header, the one place where the two rules meet.
