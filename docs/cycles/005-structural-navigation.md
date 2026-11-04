# 005 — Structural navigation

## Goal

Outcome: Every non-top-level page shows where it sits and how to go up, and going back always restores what you were looking at.

Scope: A two-link breadcrumb on the deck page, the library's tab in the URL, and breadcrumbs on the practice detail and run pages. Not covered: a shared Breadcrumb component, a change to `SubjectDetailPage`'s existing crumb, a crumb on `PracticeOverviewPage` or `PracticeCreatePage`, and history-aware navigation of any kind.

Judgement: None.

## Records

None.

## Tasks

### T1 — Library ↔ deck navigation

**Status**

- [x]

**Goal**

The deck page always offers a way to the library, and any return to the library restores the tab.

**Dependencies**

None.

**Files**

- `frontend/src/pages/DeckDetailPage.tsx`
- `frontend/src/pages/LibraryPage.tsx`
- `frontend/src/pages/DeckDetailPage.test.tsx`
- `frontend/src/pages/LibraryPage.test.tsx`

**Details**

Build the breadcrumb grammar and the library tab in the URL below, nothing else.

There must be no shared Breadcrumb component; each instance is three lines of JSX, pinned by the grammar below.

Breadcrumb grammar:

- One row above the page's `<h1>`: `inline-flex items-center gap-1 text-[13px] text-(--color-text-secondary)`, leading `<ChevronLeft aria-hidden className="h-[15px] w-[15px]" />`, then the link content. Each crumb is a react-router `Link`.
- Labels are the parent's own title: the vocabulary table's **Practice** for `/practice`; **Your library** for `/library`; a subject crumb renders `[SubjectIcon] {subject.name}`.
- Two-link chain, deck page only: `[ChevronLeft] Your library › [SubjectIcon] {subject.name}`. The first link goes to `/library`, the separator is `<span aria-hidden="true">›</span>` in `text-(--color-text-muted)`, and the second link goes to `/subjects/{id}`. The "Your library" link renders immediately; the subject link appears when `subjectQuery` resolves (today's `{subject && …}` gate moves to just the second link).
- The deck crumb's library link must carry no `?tab`; browser back is what restores the exact tab.

Library tab in the URL:

- `?tab=decks` selects the Decks tab; absent or any other value selects Subjects (the same `isTab` guard pattern as `DeckDetailPage`). Switching tabs writes the param with `setSearchParams(..., { replace: true })`, deleting it when returning to Subjects, exactly `DeckDetailPage.setTab`'s shape. Row links and create buttons are unchanged.

`LibraryPage` swaps `useState<Tab>` for `useSearchParams`; the tab default stays Subjects.

**Out of scope**

- A shared Breadcrumb component.
- `?tab` on the crumb's library link.
- Any change to `SubjectDetailPage`'s existing crumb.
- History-aware navigation of any kind.

**Done when**

- A test asserts the deck page renders both links in one row, `Your library` navigating to `/library` and the subject link to `/subjects/{id}`.
- A test asserts the library link is present before the subject query resolves.
- A test asserts `/library?tab=decks` renders the Decks tab selected.
- A test asserts clicking Subjects removes the param and clicking Decks sets it, through a location probe.
- A test asserts an unknown `?tab=` value falls back to Subjects.

**Debrief**

No departures from Details. The crumb row is a `<div>` carrying the row's shared classes (matching the contract's "one row" wording literally), with `ChevronLeft` and both `Link`s as its children; the "Your library" `Link` renders unconditionally, the separator and subject `Link` render together once `subjectQuery` resolves, per the contract's gate placement.

### T2 — Practice-surface breadcrumbs

**Status**

- [x]

**Goal**

The two practice pages that lack any way up carry a breadcrumb: session detail → Practice, run stub → its session.

**Dependencies**

None.

**Files**

- `frontend/src/pages/PracticeDetailsPage.tsx`
- `frontend/src/pages/PracticeRunPage.tsx`
- `frontend/src/pages/PracticeDetailsPage.test.tsx`
- `frontend/src/pages/PracticeRunPage.test.tsx` (new)

**Details**

Practice crumbs: `PracticeDetailsPage` renders `[ChevronLeft] Practice` linking `/practice`. `PracticeRunPage` renders `[ChevronLeft] Practice session` linking `/practice/{practiceSessionId}`.

The run stub's crumb label must be the static "Practice session" until the run cycle fetches real data and can upgrade it to the session name.

On `PracticeDetailsPage` the crumb renders above the name/badge header row, inside the loaded body; the not-found and loading states are unchanged. `PracticeRunPage` reads `practiceSessionId` through `useParams` for its crumb target.

**Out of scope**

- Anything else on the run surface.
- A crumb on `PracticeOverviewPage` or `PracticeCreatePage`.
- Fetching the session in the stub just to name the crumb.

**Done when**

- A test asserts the detail page's crumb reads Practice and navigates to `/practice`.
- A test asserts the run page's crumb navigates to `/practice/{id}` for the id in its URL.
- A test asserts the not-found state still renders without a crumb.

**Debrief**

No departures from Details. `PracticeDetailsPage`'s crumb sits inside `PracticeDetailsPageBody`, above the header row, so the not-found early return in the outer component never renders one. `PracticeRunPage` reads `practiceSessionId` from `useParams` only, with no fetch added, for the static "Practice session" label.
