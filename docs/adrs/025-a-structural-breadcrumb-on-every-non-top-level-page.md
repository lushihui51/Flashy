# ADR 025: A structural breadcrumb on every non-top-level page

## Status

Deprecated by the record rules' Type test

## Context

`SubjectDetailPage` and `DeckDetailPage` carry a breadcrumb — `[chevron-left] <parent>` — so each page shows where it sits: a deck under its subject, a subject under the library. That decision was never recorded, so it carried no force beyond those two pages.

Manual verification of the practice surfaces (2026-08-26) surfaced the gap this left. Two separate failures, same root cause:

1. **`DeckDetailPage`'s crumb pointed somewhere the user never asked to go.** The library's Decks tab is a flat, cross-subject list — a lateral shortcut that jumps straight to a deck two hierarchy levels deep. Landing there via that shortcut, the crumb (correctly, by the existing design) points at the deck's subject — a page the user never visited — and nothing on screen mentions the library at all. `LibraryPage` compounded it: its Subjects/Decks tab lives in `useState`, the outlier among its own siblings (`PracticeOverviewPage` and `DeckDetailPage` both hold equivalent view state in the URL precisely so returning restores it), so _any_ return to the library — browser back included — silently drops back to Subjects regardless of which tab was open.
2. **Three new pages (`PracticeCreatePage`, `PracticeDetailsPage`, `PracticeRunPage`) shipped with no breadcrumb at all**, because the rule that Subject/Deck pages follow was never captured as a rule — it was two pages that happened to look alike. `PracticeDetailsPage` in particular has no way up except a destructive Delete button or starting the practice.

This is the same decay pattern ADR 024 fixed for `returnTo`: a correct pattern shipped once, undocumented, and silently violated by the next cycle file that needed the same shape.

## Decision

We will give every non-top-level detail page exactly one breadcrumb row above its `<h1>`, pointing at its nearest parent in the entity hierarchy — `Subject` for a deck, `Practice` for a practice session, a session's own detail page for its run page. Multi-level parents chain as multiple links in one row (the deck page: library → subject), not as multiple stacked rows.

The crumb is structural, not historical: it always points at the same place regardless of how the page was reached, exactly like `SubjectDetailPage`'s and `DeckDetailPage`'s crumbs already did before this record gave the pattern a name. It carries no memory of the specific view (filters, tabs, scroll position) the user came from — that is what browser back is for, and continuing to route page-view state through the URL (as `PracticeOverviewPage` and `DeckDetailPage`'s own tab already do) is what makes browser back correct. `LibraryPage`'s tab moves into the URL to close the one place this app's own convention had drifted from it.

Two categories are exempt:

- **Top-level shell destinations** — Home, Library, Practice, Notifications: the pages reachable directly from the top bar or the drawer. They are roots of their own navigation tree by construction; a breadcrumb on a root points at nothing.
- **Creation/edit forms** — `SubjectForm`, `DeckEditor`, `CardStandaloneForm`, `DeckConfigurationEditor`, `PracticeCreatePage`. These already carry a sticky-header **Cancel** button, which answers the same "how do I leave" question for a different situation: abandoning a draft, not viewing a hierarchy. Cancel and a breadcrumb are two legitimate idioms for two different kinds of page, not a gap to unify.

## Alternatives considered

### A history-aware breadcrumb (`?from=`, or reading router state)

Rejected. The same URL would render a different crumb depending on how it was reached, defeating the "a URL is just a URL" property this app otherwise holds to, as the round-trip address already rejected it: a shared or bookmarked link would carry origin junk with no obvious meaning, and every entry point into a page would need to remember to thread its own origin forward, the precise fragility that let the deck page's return path go silently missing in the first place.

### Patch only the two broken pages, leave the rule unwritten

Rejected. This is exactly what happened — the pattern existed, wasn't written down, and three new pages were built without it. Writing the rule down is what makes the next surface inherit it instead of rediscovering the gap.

### A shared `Breadcrumb` component

Rejected for now. Every instance is two or three lines of JSX (an icon, a link, an optional separator and second link); the grammar is pinned once in the governing cycle file's Contracts instead. Revisit if a fourth or fifth shape shows up that a prop-driven component would actually simplify.

## Consequences

**Positive**

- The developer answers "what does this page's crumb point at" once: the nearest parent, regardless of entry point.
- The user gets browser back that returns to where they were and a crumb that goes up, each doing one job, because page-view state rides the URL.
- The developer adds no component or state surface; every instance is inline JSX and a `Link`.

**Negative**

- The user who takes a lateral shortcut lands on a page whose crumb does not match the path they took; predictable, not invisible.
- The developer applies the rule by hand on every new page; nothing enforces it structurally, and the cycle file's Contracts are the mitigation.

**Neutral**
