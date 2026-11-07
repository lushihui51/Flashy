# 023 — Shared breadcrumb row

## Goal

Outcome: One component renders the row of places above a page's heading, and every page below the main places lists its places to it instead of drawing a row of its own.

Scope: The component and its test; the four pages that draw their own row today, with the run page's row gaining the level above it; the row's spoken name; and browser back returning to the view the user left. Not covered: any other change to those pages, a heading for the run page, and the main places and the forms, which keep no row.

Judgement: On a live server, open a subject's page, a deck's page, a practice's own page and the run page, read each row and tap each of its places; check that the main places and the forms have none; go back from a deck's page and from a practice's page to the tab and filters they were opened from.

## Records

- PDR 005: A row of the places above a page, and browser back

## Tasks

### T1 — The breadcrumb component on the four pages

**Status**

- [x]

**Goal**

Every page below the main places renders one `Breadcrumb` component with its places, and the run page's row names Practice above the practice.

**Dependencies**

None.

**Files**

- `frontend/src/components/ui/Breadcrumb.tsx` (new)
- `frontend/src/components/ui/Breadcrumb.test.tsx` (new)
- `frontend/src/pages/DeckDetailPage.tsx`
- `frontend/src/pages/DeckDetailPage.test.tsx`
- `frontend/src/pages/SubjectDetailPage.tsx`
- `frontend/src/pages/SubjectDetailPage.test.tsx`
- `frontend/src/pages/PracticeDetailsPage.tsx`
- `frontend/src/pages/PracticeDetailsPage.test.tsx`
- `frontend/src/pages/PracticeRunPage.tsx`
- `frontend/src/pages/PracticeRunPage.test.tsx`

**Details**

The row above a page's heading must be one component under `frontend/src/components/ui/`, taking the places above the page as an ordered list, widest first, each with its label, its link and an optional leading icon, and rendering the links, the separators and the styling once. Every page below the main places must render it with its own places and render no row of its own; the main places, the destinations in `frontend/src/components/shell/navItems.ts`, and the forms render none (PDR 005).

The component's interface:

```tsx
// frontend/src/components/ui/Breadcrumb.tsx
import type { ReactNode } from "react";

export type BreadcrumbPlace = {
  label: string;
  to: string;
  icon?: ReactNode;
};

type BreadcrumbProps = {
  /** The places above the page, widest first. */
  places: BreadcrumbPlace[];
};

export default function Breadcrumb({ places }: BreadcrumbProps): ReactNode;
```

It must render a `<nav aria-label="Breadcrumb">`, each place as a react-router `Link` to its `to` with its icon, when given, before its label, and the separator "›" between consecutive places, never before the first or after the last. The row must show no text other than the places' labels and that separator. A place's link must be its address alone, never a remembered tab or filter (PDR 005). Keep the look of the row `DeckDetailPage.tsx` draws today: lift its markup, the leading `ChevronLeft`, the 13px secondary text and the muted separator, into the component.

The four pages must render these places and nothing else in the row:

- a subject's page: "Your library" → `/library`;
- a deck's page: "Your library" → `/library`, then the subject's name → `/subjects/<id>` with `<SubjectIcon icon={subject.icon} className="h-[15px] w-[15px]" />` as its icon, the second place present once the subject has loaded, as today;
- a practice's own page: "Practice" → `/practice`, rendered inside `PracticeDetailsPageBody` so the not-found branch renders no row, as today;
- the run page: "Practice" → `/practice`, then the practice's name from `runQuery.data.session_name` → `/practice/<practiceSessionId>`, the second place present once the run state has loaded; the row renders in the error state too, as the page's row does today.

Page-view state, tabs and filters, lives in the URL, never in `useState`; the pages' `useSearchParams` handling must not change, so browser back keeps returning to the view the user left (PDR 005).

`Breadcrumb.test.tsx` is a jsdom test on `renderWithRouter` from `src/test/testUtils.tsx`, as `ListRow.test.tsx` is. The page tests assert the row by role; keep every existing case passing, and add the run page's case named below.

**Out of scope**

- A heading for the run page: a later cycle.
- Any change to the four pages' copy, toolbars or titles: a later cycle.
- The page's own name as a last, unlinked item of the row, or `aria-current`: never; the row lists the places above the page, not the page.
- A row on a main place or a form: never.
- A link in the row carrying `?tab=` or a filter: never.

**Done when**

- In `frontend/`, `npx vitest run src/components/ui/Breadcrumb.test.tsx` passes with these four cases: "renders each place as a link to its address, in order, inside a navigation named Breadcrumb"; "puts one separator between places and none before the first"; "renders a place's icon inside its link"; "renders a single place with no separator".
- In `frontend/`, `npx vitest run src/pages` passes, including the new case in `PracticeRunPage.test.tsx` named "shows Practice above the practice's name, linking to the list of practices", which clicks the link named "Practice" and lands on `/practice`.
- `grep -rn "ChevronLeft" frontend/src/pages/` prints nothing, and `grep -rl "components/ui/Breadcrumb" frontend/src/pages/` prints exactly the four pages.
- At `localhost:5173` with the backend running: a deck's page shows "Your library › <subject>" with the subject's icon, a subject's page "Your library", a practice's own page "Practice", and the run page "Practice › <the practice's name>"; tapping each place opens it.
- At `localhost:5173`: the library, Practice, Home, and the New subject, New deck, New card, New configuration and New practice forms show no such row.
- At `localhost:5173`: opening a deck from the library's Decks tab and going back lands on the Decks tab; opening a practice from the Completed tab with a deck filter set and going back lands on that tab with that filter.

**Debrief**

Evidence, in the order of Done when:

- `npx vitest run src/components/ui/Breadcrumb.test.tsx --reporter=verbose` printed `Test Files 1 passed (1)`, `Tests 4 passed (4)`, with ✓ on "renders each place as a link to its address, in order, inside a navigation named Breadcrumb", "puts one separator between places and none before the first", "renders a place's icon inside its link" and "renders a single place with no separator".
- `npx vitest run src/pages --reporter=verbose` printed `Test Files 9 passed (9)`, `Tests 155 passed (155)`, with ✓ on `PracticeRunPage > shows Practice above the practice's name, linking to the list of practices`. That case clicks the link named "Practice" inside the row and asserts the location is exactly `/practice`.
- `grep -rn "ChevronLeft" frontend/src/pages/` printed nothing. `grep -rl "components/ui/Breadcrumb" frontend/src/pages/` printed `PracticeRunPage.tsx`, `DeckDetailPage.tsx`, `SubjectDetailPage.tsx` and `PracticeDetailsPage.tsx` under `frontend/src/pages/`, and nothing else.
- Headless Chromium through playwright-core at `localhost:5173`, signed out of Clerk, with the backend on `DEV_AUTH_USER_ID`:
  - The deck "Commands" showed the row "Your library › CompTIA A+": `/library`, then `/subjects/65f5…` with an svg icon inside its link.
  - The subject "CompTIA A+" showed "Your library": `/library`.
  - A practice's own page showed "Practice": `/practice`.
  - Its run page showed "Practice › Oct 1, 2026 at 1:18 PM": `/practice`, then `/practice/0ec5…`.
  - Clicking each place landed on its address. The screenshots match the row as `DeckDetailPage.tsx` drew it before: the leading chevron, 13px secondary text and the muted "›".
- At `localhost:5173`, the count of navigations named Breadcrumb was 0 on `/library`, `/practice`, `/`, `/subjects/new`, `/decks/new`, `/cards/new`, `/deck-configurations/new` and `/practice/new`.
- At `localhost:5173`, back navigation:
  - On `/library` I clicked the Decks tab, which made the URL `/library?tab=decks`, then opened a deck from the Decks section and went back. It landed on `/library?tab=decks` with the Decks tab selected.
  - On `/practice` I clicked the Completed tab and picked "Commands" in the deck filter, which made the URL `/practice?status=completed&subject=65f5…&deck=d82f…`. I then opened the practice `/practice/6b13…` and went back. It landed on the same URL, with the Completed tab selected and the deck filter showing "Commands".
  - The browser reported no page errors.
- Over the whole frontend, `npx vitest run` printed 47 files and 516 tests passed, `npm run lint` printed no problems, and `npm run build` built. The build's chunk-size warning is the one it already printed before this task.

Departures from Details and Files: none.

Changes to existing tests that the engineer should know about:

- `DeckDetailPage.test.tsx` "renders a two-link breadcrumb chain: library then subject, both in one row" used to assert that both links shared a `parentElement`. It now asserts, inside the navigation named Breadcrumb, the two links' order, addresses and labels.
- The row cases in `SubjectDetailPage.test.tsx`, `PracticeDetailsPage.test.tsx` and `PracticeRunPage.test.tsx` now find the row as the navigation named Breadcrumb.
- The not-found case in `PracticeDetailsPage.test.tsx` now asserts that no such navigation exists.
- The 404 case in `PracticeRunPage.test.tsx` now also asserts that the row's "Practice" link to `/practice` renders in the error state.
- `renderRun` gained a `/practice` route for the new case.

Behaviour change on the run page: before the run state loads, its row used to read "Practice" and link to `/practice/<id>`. It now reads "Practice" and links to `/practice`, as Details requires.

Code to read: none beyond `frontend/src/components/ui/Breadcrumb.tsx`, which is short.
