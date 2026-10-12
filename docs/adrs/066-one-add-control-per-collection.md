# ADR 066: One add control per collection — the toolbar's, never the empty state's

## Status

Accepted. Implemented by task 021.

- **Amends ADR 023:** rule 2's "repeated in the collection's empty state" is superseded. The add control renders once, in the collection's toolbar row, and the empty state carries none. Rules 1 and 3, and the rest of rule 2 — labeled, inside the collection it adds to, never a header "+" whose meaning depends on invisible state — are unchanged.

## Context

A screenshot review on 2026-09-22 of a deck with no cards showed two identical "Add card" buttons on one screen: the Cards tab's toolbar button, and the empty state's own a few lines below it. The same pair rendered on the deck page's Configurations tab, on both Library tabs, and on the New practice page when the user has no configurations — five surfaces, each with a test asserting two buttons.

The pair was deliberate. ADR 023 (2026-08-25) moved collection actions out of the page header into the collection's content area and wrote them as "labeled buttons, repeated in the collection's empty state"; its Consequences say "empty states own their add affordances". Every surface built since followed it — task 004's New practice page cites rule 2 for the repeat. The day before that ADR, `8c7120f` had removed the same repeat from the practice overview ("one New practice button per list, the one in the header that is always on screen"), and the overview has rendered one button since. The subject page took a third shape from task 003 Phase 2.6: one button, in the empty state, with the "Decks" row hidden while the list is empty ("Do not render the section label above an empty list").

So three answers to the same question were live at once: two buttons, one in the toolbar, or one in the empty state.

## Decision

A collection's add control lives in its toolbar row — the labeled button inside the collection's content area that ADR 023 rule 2 placed there — and that row renders whenever the page body renders: while loading, once loaded, and when the load failed. It is the only add control on the surface.

The empty state is its text alone. Where filters, not an empty collection, produced the empty list, it offers "Clear filters", which the toolbar has no equivalent of.

The toolbar row renders regardless of count, its label included: the Library's count row reads "0 subjects" above "No subjects yet.", and the subject page's "Decks" row stays above "No decks in this subject yet.". This reverses task 003 Phase 2.6's rule for the subject page.

The rule binds every collection surface: the deck page's Cards and Configurations tabs, the Library's Subjects and Decks tabs, the New practice page's configuration list, and the subject page's deck list. The practice overview's header "New practice" is that page's toolbar and already complies.

## Alternatives considered

### The empty state keeps the button and the toolbar row hides while the collection is empty

The subject page's pattern. Rejected: the control's position then depends on the collection's count, and every surface needs a condition on its toolbar row. The empty state's text is one line, and the toolbar's button is one glance above it.

### Keep both, as ADR 023 rule 2 wrote

Rejected: it is what shipped, and the screenshot showed two identical buttons with nothing between them.

### Hide the toolbar's label while the collection is empty, keep its button

Rejected: one more conditional, on every surface that has a label, to hide a line that is true. The Library's count row already renders "0 subjects" above its empty state.

## Consequences

Benefits:

- One add control per screen, in one place, whether the collection is empty or not.
- No per-surface condition on the toolbar row; the empty state is a sentence.
- ADR 023's "a button's scope is self-evident from where it sits" still holds — the button sits inside the collection it adds to.

Costs:

- On the Cards tab the button sits above the column headers and the sentence below them, so the eye travels up from the text to the action.
- An empty Library tab reads "0 subjects" directly above "No subjects yet.", and the subject page shows "Decks" above an empty list.
- The six tests that pinned two buttons, or the hidden "Decks" row, change with the surfaces.
