# ADR 025: Every non-top-level page carries a structural breadcrumb, never a history-aware one

## Status

Accepted

## Context

Task 003 gave `SubjectDetailPage` and `DeckDetailPage` a breadcrumb — `[chevron-left] <parent>` — so each page shows where it sits: a deck under its subject, a subject under the library. That decision was never written down anywhere but that one task file, so it carried no force outside it.

Manual verification of task 004's practice surfaces (2026-08-26) surfaced the gap this left. Two separate failures, same root cause:

1. **`DeckDetailPage`'s crumb pointed somewhere the user never asked to go.** The library's Decks tab is a flat, cross-subject list — a lateral shortcut that jumps straight to a deck two hierarchy levels deep. Landing there via that shortcut, the crumb (correctly, by the existing design) points at the deck's subject — a page the user never visited — and nothing on screen mentions the library at all. `LibraryPage` compounded it: its Subjects/Decks tab lives in `useState`, the outlier among its own siblings (`PracticeOverviewPage` and `DeckDetailPage` both hold equivalent view state in the URL precisely so returning restores it), so _any_ return to the library — browser back included — silently drops back to Subjects regardless of which tab was open.
2. **Three new pages in task 004 (`PracticeCreatePage`, `PracticeDetailsPage`, `PracticeRunPage`) shipped with no breadcrumb at all**, because the rule that Subject/Deck pages follow was never captured as a rule — it was two pages that happened to look alike. `PracticeDetailsPage` in particular has no way up except a destructive Delete button or starting the practice.

This is the same decay pattern ADR 024 fixed for `returnTo`: a correct pattern shipped once, undocumented, and silently violated by the next task file that needed the same shape.

## Decision

**Every non-top-level detail/read page carries exactly one breadcrumb row above its `<h1>`, pointing at its nearest parent in the entity hierarchy** — `Subject` for a deck, `Practice` for a practice session, a session's own detail page for its run page. Multi-level parents chain as multiple links in one row (the deck page: library → subject), not as multiple stacked rows.

The crumb is **structural, not historical**: it always points at the same place regardless of how the page was reached, exactly like `SubjectDetailPage`'s and `DeckDetailPage`'s crumbs already did before this ADR gave the pattern a name. It carries no memory of the specific view (filters, tabs, scroll position) the user came from — that is what browser back is for, and Continuing to route page-view state through the URL (as `PracticeOverviewPage` and `DeckDetailPage`'s own tab already do) is what makes browser back correct. `LibraryPage`'s tab moves into the URL to close the one place this app's own convention had drifted from it.

Two categories are exempt:

- **Top-level shell destinations** — Home, Library, Practice, Notifications: the pages reachable directly from the top bar or the drawer. They are roots of their own navigation tree by construction; a breadcrumb on a root points at nothing.
- **Creation/edit forms** — `SubjectForm`, `DeckEditor`, `CardStandaloneForm`, `DeckConfigurationEditor`, `PracticeCreatePage`. These already carry a sticky-header **Cancel** button, which answers the same "how do I leave" question for a different situation: abandoning a draft, not viewing a hierarchy. Cancel and a breadcrumb are two legitimate idioms for two different kinds of page, not a gap to unify.

### Alternative considered: a history-aware breadcrumb (`?from=`, or reading router state)

Rejected. The same URL would render a different crumb depending on how it was reached, defeating the "a URL is just a URL" property this app otherwise holds to (ADR 024 rejected exactly this shape for `returnTo`, for the identical reasons): a shared or bookmarked link would carry origin junk with no obvious meaning, and every entry point into a page would need to remember to thread its own origin forward, the precise fragility that let the deck page's return path go silently missing in the first place.

### Alternative considered: patch only the two broken pages, leave the rule unwritten

Rejected. This is exactly what happened after task 003 — the pattern existed, wasn't written down, and task 004 rebuilt three pages without it. Writing the rule down is what makes the next task file inherit it instead of rediscovering the gap.

### Alternative considered: a shared `Breadcrumb` component

Rejected for now. Every instance is two or three lines of JSX (an icon, a link, an optional separator and second link); the grammar is pinned once in the governing task file's Contracts instead. Revisit if a fourth or fifth shape shows up that a prop-driven component would actually simplify.

## Consequences

Benefits:

- One question — "what does this page's crumb point at?" — has one answer everywhere: the nearest parent, always, regardless of entry point. A future page just asks that question instead of re-deriving a design.
- Pairs with the URL-holds-view-state convention (`PracticeOverviewPage`, `DeckDetailPage`, now `LibraryPage`) to make browser back correct almost everywhere in the app: the crumb gets you _up_, back gets you to _where you were_, and neither has to fake the other's job.
- No new component, no new state-management surface — every instance is inline JSX and an existing `Link`.

Costs:

- A lateral shortcut (like the library's Decks tab) will still land a user on a page whose crumb doesn't match the path they took to get there — this ADR makes that predictable and consistent, not invisible. The crumb was never meant to answer "how did I get here," only "where is this."
- The rule has to be applied by hand on every new page a future task adds; nothing enforces it structurally (no lint rule, no shared component to opt into). Regressing this again is possible the same way `returnTo`'s state-based design regressed — the mitigation is the same: write it into the task file's Contracts so a builder reads it before shipping the page, not after.
