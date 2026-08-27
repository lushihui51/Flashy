# 005 — Structural navigation: breadcrumbs and URL-held tabs

Makes the app fully navigable per the 2026-08-26 /plan session: every non-top-level page shows where it sits and how to go up, and going back always restores what you were looking at. Branch: `rewrite/practice-setup`; start after 004's T6 lands (T6 is in flight and this file's tests touch neighboring surfaces).

## ADRs

Decisions this file implements; full context and rejected alternatives live in the ADRs.

- **ADR 025 — Every non-top-level page carries a structural breadcrumb, never a history-aware one**: one crumb row per page pointing at its nearest hierarchy parent (chained when there's more than one level, as on the deck page); structural, not origin-tracking — the same page always shows the same crumb regardless of how it was reached, and page-view state (tabs, filters) belongs in the URL instead, which is what makes browser back correct. Top-level shell destinations and creation/edit forms (which keep Cancel) are exempt.

## Minor decisions

- **MD-1**: the deck crumb's library link carries no `?tab` — a structural link goes to the place, not a remembered view; browser back is what restores the exact tab.
- **MD-2**: the run stub's crumb label is the static "Practice session" until the run task fetches real data and can upgrade it to the session name.
- **MD-3**: no shared Breadcrumb component — each instance is three lines of JSX, pinned by the Breadcrumb grammar contract below; extracting a primitive for that is premature.

## Contracts

### Breadcrumb grammar (ADR 025; matches what SubjectDetailPage/DeckDetailPage already render)

- One row above the page's `<h1>`: `inline-flex items-center gap-1 text-[13px] text-(--color-text-secondary)`, leading `<ChevronLeft aria-hidden className="h-[15px] w-[15px]" />`, then the link content. Each crumb is a react-router `Link`.
- Labels are the parent's own title: the vocabulary table's **Practice** for `/practice`; **Your library** for `/library`; a subject crumb renders `[SubjectIcon] {subject.name}`.
- **Two-link chain (deck page only):** `[ChevronLeft] Your library › [SubjectIcon] {subject.name}` — first link to `/library` (no `?tab`, per MD-1), separator `<span aria-hidden="true">›</span>` in `text-(--color-text-muted)`, second link to `/subjects/{id}`. The "Your library" link renders immediately; the subject link appears when `subjectQuery` resolves (today's `{subject && …}` gate moves to just the second link).
- **Practice crumbs:** `PracticeDetailsPage` → `[ChevronLeft] Practice` linking `/practice`. `PracticeRunPage` → `[ChevronLeft] Practice session` linking `/practice/{practiceSessionId}` — a static label per MD-2; the run task replaces it with the session name once that page fetches real data (note left in its TODO comment).

### Library tab in the URL

- `?tab=decks` selects the Decks tab; absent or any other value → Subjects (same `isTab` guard pattern as `DeckDetailPage`). Switching tabs writes the param with `setSearchParams(..., { replace: true })`, deleting it when returning to Subjects — exactly `DeckDetailPage.setTab`'s shape. Row links and create buttons are unchanged.

## Tasks

### T1 — Library ↔ deck navigation

- [x] **Goal:** two-link breadcrumb on the deck page and the library's tab in the URL, so the deck page always offers a way to the library and any return to the library restores the tab.
- **Files:** `frontend/src/pages/DeckDetailPage.tsx`, `frontend/src/pages/LibraryPage.tsx`, `frontend/src/pages/DeckDetailPage.test.tsx`, `frontend/src/pages/LibraryPage.test.tsx`.
- **Details:** Implement the two contract sections above, nothing else. `LibraryPage` swaps `useState<Tab>` for `useSearchParams`; the tab default stays Subjects.
- **Out of scope:** a shared Breadcrumb component (three lines of JSX per page — the contract pins the grammar, no primitive); `?tab` on the crumb's library link; any change to `SubjectDetailPage`'s existing crumb; history-aware navigation of any kind.
- **Done when:** tests cover — the deck page renders both links in one row, `Your library` navigating to `/library` and the subject link to `/subjects/{id}`; the library link is present even before the subject query resolves; `/library?tab=decks` renders the Decks tab selected; clicking Subjects removes the param, clicking Decks sets it (asserted via a location probe); an unknown `?tab=` value falls back to Subjects; `npx vitest run`, `npm run lint`, `npm run build` clean.
- **Commit:** `feat: deck page breadcrumb chain, library tab in the url`
- Notes: none — built exactly to spec. The crumb row is a `<div>` carrying the row's shared classes (matching the contract's "one row" wording literally), with `ChevronLeft` and both `Link`s as its children; the "Your library" `Link` renders unconditionally, the separator and subject `Link` render together once `subjectQuery` resolves, per the contract's gate placement.

### T2 — Practice-surface breadcrumbs (independent of T1)

- [x] **Goal:** apply ADR 025 to the two practice pages that lack any way up: session detail → Practice, run stub → its session.
- **Files:** `frontend/src/pages/PracticeDetailsPage.tsx`, `frontend/src/pages/PracticeRunPage.tsx`, `frontend/src/pages/PracticeDetailsPage.test.tsx`, `frontend/src/pages/PracticeRunPage.test.tsx` (new).
- **Details:** Per the Practice-crumbs contract line. On `PracticeDetailsPage` the crumb renders above the name/badge header row, inside the loaded body (the not-found and loading states are unchanged). `PracticeRunPage` reads `practiceSessionId` via `useParams` for its crumb target and keeps its `TODO(defer:practice-run)` comment, extended with the session-name note from the contract.
- **Out of scope:** anything else on the run surface; a crumb on `PracticeOverviewPage` or `PracticeCreatePage` (top-level destination and creation form — both exempt per ADR 025); fetching the session in the stub just to name the crumb.
- **Done when:** tests cover — the detail page's crumb reads Practice and navigates to `/practice`; the run page's crumb navigates to `/practice/{id}` for the id in its URL; the not-found state still renders without a crumb; `grep -r "TODO(defer:" frontend/src/` still shows the run stub tagged; `npx vitest run`, `npm run lint`, `npm run build` clean.
- **Commit:** `feat: breadcrumbs on the practice detail and run pages`
- Notes: none — built exactly to spec. `PracticeDetailsPage`'s crumb sits inside `PracticeDetailsPageBody`, above the header row, so the not-found early return in the outer component never renders one. `PracticeRunPage` reads `practiceSessionId` from `useParams` only — no fetch added — for the static "Practice session" label per MD-2.
