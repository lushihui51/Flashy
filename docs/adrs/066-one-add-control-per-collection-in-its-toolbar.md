# ADR 066: One add control per collection, in its toolbar

## Status

Deprecated by the record rules' Type test

## Context

A screenshot review on 2026-09-22 of a deck with no cards showed two identical "Add card" buttons on one screen: the Cards tab's toolbar button, and the empty state's own a few lines below it. The same pair rendered on the deck page's Configurations tab, on both Library tabs, and on the New practice page when the user has no configurations — five surfaces, each with a test asserting two buttons.

The pair was deliberate. ADR 023 moved collection actions out of the page header into the collection's content area and wrote them as "labeled buttons, repeated in the collection's empty state"; its Consequences say "empty states own their add affordances". Every surface built since followed it. The day before that ADR, `8c7120f` had removed the same repeat from the practice overview ("one New practice button per list, the one in the header that is always on screen"), and the overview has rendered one button since. The subject page took a third shape: one button, in the empty state, with the "Decks" row hidden while the list is empty.

So three answers to the same question were live at once: two buttons, one in the toolbar, or one in the empty state.

## Decision

We will put a collection's add control in its toolbar row, the labeled button inside the collection's content area, and render that row whenever the page body renders: while loading, once loaded, and when the load failed. It is the only add control on the surface.

The empty state is its text alone. Where filters, not an empty collection, produced the empty list, it offers "Clear filters", which the toolbar has no equivalent of.

The toolbar row renders regardless of count, its label included: the Library's count row reads "0 subjects" above "No subjects yet.", and the subject page's "Decks" row stays above "No decks in this subject yet.". This reverses the rule the subject page followed.

The rule binds every collection surface: the deck page's Cards and Configurations tabs, the Library's Subjects and Decks tabs, the New practice page's configuration list, and the subject page's deck list. The practice overview's header "New practice" is that page's toolbar and already complies.

## Alternatives considered

### The empty state keeps the button and the toolbar row hides while the collection is empty

The subject page's pattern. Rejected: the control's position then depends on the collection's count, and every surface needs a condition on its toolbar row. The empty state's text is one line, and the toolbar's button is one glance above it.

### Keep both, as the earlier placement rule wrote

Rejected: it is what shipped, and the screenshot showed two identical buttons with nothing between them.

### Hide the toolbar's label while the collection is empty, keep its button

Rejected: one more conditional, on every surface that has a label, to hide a line that is true. The Library's count row already renders "0 subjects" above its empty state.

## Consequences

**Positive**

- The user finds one add control per screen, in one place, whether the collection is empty or not.
- The developer writes no per-surface condition on the toolbar row; the empty state is a sentence.
- The user still reads a button's scope from where it sits, inside the collection it adds to.

**Negative**

- The user on the Cards tab finds the button above the column headers and the sentence below them, so the eye travels up from the text to the action.
- The user on an empty Library tab reads "0 subjects" directly above "No subjects yet.", and the subject page shows "Decks" above an empty list.
- The developer changes the six tests that pinned two buttons or the hidden "Decks" row.

**Neutral**
