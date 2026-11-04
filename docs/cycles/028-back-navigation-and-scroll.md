# 028 — Back navigation and scroll

## Goal

Outcome: A page reached inside Flashy shows a "<" in its row of places that takes the user back to where they came from, spoken "Back", and a page opened from an address, in a new tab or straight after signing in, shows only its places. Going back lands the user where they were on the page they left. After a change to a tab or filter, the new list's first rows are on screen with the control just tapped still in view, and the page moves only as far as that takes.

Scope: The cycle covers the "<" in the row of places, scroll restoration on going back through a data router, one hook for a page's URL search params that never resets scroll, and the scroll rule after a tab or filter change on Your library, a deck's page, the Practice page and New practice. It leaves every other page element's look to cycle 027 and every list's order to a later cycle.

Judgement: The engineer judges by driving a mouse through going back from a deck page to Your library, reloading a page opened from its address, and changing a tab on Your library with the list scrolled, and seeing the page land where it was, show no "<", and move only as far as the new list's first rows.

## Records

- PDR 017: A row of the places above a page, led by a way back
- ADR 089: A data router without loaders, for scroll restoration
- ADR 097: One hook for a page's URL search params, that never resets scroll

## Tasks

### T1 — One hook for a page's URL search params

**Status**

- [x]

**Goal**

Every read and write of a page's URL search params goes through one hook whose writes never reset scroll, and any other import of React Router's search params fails lint.

**Dependencies**

None.

**Files**

- `frontend/src/lib/viewParams.ts` (new)
- `frontend/src/lib/viewParams.test.tsx` (new)
- `frontend/eslint.config.js`
- `frontend/src/lib/practiceSelection.ts`
- `frontend/src/pages/LibraryPage.tsx`
- `frontend/src/pages/DeckDetailPage.tsx`
- `frontend/src/pages/PracticeOverviewPage.tsx`
- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`
- `frontend/src/components/library/DeckEditor.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx`

**Details**

The hook, ADR 097:

```ts
// frontend/src/lib/viewParams.ts
export type ViewParams = {
  /** The page's search params as the URL holds them now. */
  params: URLSearchParams;
  /** Writes `next` as the page's search params without moving the page. */
  setParams: (next: URLSearchParams) => void;
};

export function useViewParams(): ViewParams;
```

- `useViewParams` must be the only code that calls `useSearchParams`, and `setParams` must call it with `{ replace: true, preventScrollReset: true }` on every write.
- `params` must be the object `useSearchParams` returns, so a dependency list that holds it changes exactly when the URL does; `PracticeCreatePage.tsx`'s effect over `missingIds` lists it.

The lint rule, ADR 097:

- `frontend/eslint.config.js` must make an import of `useSearchParams` from `react-router-dom` an error through `no-restricted-imports`, with the message `read and write a page's search params through useViewParams in src/lib/viewParams.ts, whose writes never reset scroll (ADR 097)`, and must turn the rule off for `src/lib/viewParams.ts` alone, as it turns `no-restricted-syntax` off for `src/lib/datetime.ts`.
- The rule must hold for test files too: `NewConfigStub` in `PracticeCreatePage.test.tsx` and `ReturnToProbe` in `DeckConfigurationEditor.test.tsx` read `returnTo` through the hook's `params`.

The call sites:

- Every `setSearchParams(x, { replace: true })` becomes `setParams(x)`, and every read of `searchParams` becomes a read of the hook's `params`: `setTab` in `LibraryPage.tsx`; `setTab` in `DeckDetailPage.tsx`; `setFilters`, `setStatusTab` and the Clear filters button in `PracticeOverviewPage.tsx`; the effect over `missingIds`, the `config_not_found` branch, `setFilters`, `changeName`, `removeSelection` and `ConfigurationPickList`'s `onToggle` in `PracticeCreatePage.tsx`; the `returnTo` read in `DeckEditor.tsx`; and the `subject`, `deck` and `returnTo` reads in `DeckConfigurationEditor.tsx`.
- `navigate(...)` calls stay as they are; the hook covers only a page's own search params.
- Each comment that names `setSearchParams`, in `PracticeCreatePage.tsx` and `practiceSelection.ts`, names `setParams` instead.

The test, `viewParams.test.tsx`: mount a component that calls `useViewParams` under `createMemoryRouter` and `RouterProvider` from `react-router-dom`, at `/library`, with a button that calls `setParams` with `tab=decks`; after the click, assert `router.state.location.search` is `?tab=decks`, `router.state.historyAction` is `REPLACE` and `router.state.preventScrollReset` is `true`.

**Out of scope**

- A write that changes what a page's list shows, and the scroll it brings: T3.
- The data router and scroll restoration: T2.
- The run page's "answers shown" and ratings in its URL: a later cycle.
- Exempting test files from the lint rule: never.

**Done when**

- `cd frontend && npx vitest run src/lib/viewParams.test.tsx` passes, with the three assertions on `router.state` in one test named in the output.
- `grep -rn "useSearchParams" frontend/src` prints exactly two lines, both in `frontend/src/lib/viewParams.ts`: its import and its call.
- `grep -rln "setSearchParams" frontend/src` prints exactly one line, `frontend/src/lib/viewParams.ts`.
- With `import { useSearchParams } from 'react-router-dom';` added to `frontend/src/pages/LibraryPage.tsx` for the check and removed after it, `cd frontend && npm run lint` fails with the message that names `useViewParams`; the message line is the evidence.

**Debrief**

Evidence, in the order of Done when:

- `cd frontend && npx vitest run src/lib/viewParams.test.tsx --reporter=verbose` passes; the three assertions on `router.state` are in one test:
  ```
  ✓ src/lib/viewParams.test.tsx > useViewParams > setParams replaces the entry, writes the params and asks for no scroll reset
  Tests  1 passed (1)
  ```
- `grep -rn "useSearchParams" frontend/src` prints two lines:
  ```
  frontend/src/lib/viewParams.ts:2:import { useSearchParams } from 'react-router-dom';
  frontend/src/lib/viewParams.ts:14:  const [params, setSearchParams] = useSearchParams();
  ```
- `grep -rln "setSearchParams" frontend/src` prints one line:
  ```
  frontend/src/lib/viewParams.ts
  ```
- With the import added to `LibraryPage.tsx`, `npm run lint` exits 1 with this message line, and the import was removed after it; the same run also reports the unused import under `@typescript-eslint/no-unused-vars`:
  ```
  1:10  error  'useSearchParams' import from 'react-router-dom' is restricted. read and write a page's search params through useViewParams in src/lib/viewParams.ts, whose writes never reset scroll (ADR 097)  no-restricted-imports
  ```

Checks over the whole frontend: `npx vitest run` 54 files and 557 tests passed; `npm run lint` and `npm run build` exit 0.

Beyond Done when, a mouse-driven run in headless Chromium, signed out of Clerk, against `localhost:5173`, with no page errors; it wrote only URLs:

```
library Decks tab -> /library?tab=decks
library Subjects tab -> /library
practice Completed tab -> /practice?status=completed
new practice name -> /practice/new?name=T1+check
new practice tick -> /practice/new?name=T1+check&config=d6b5ecea-a581-45e9-933b-b2733b7bf8fa
deck 2nd tab -> /decks/d82f1a6b-0b7a-4144-ba4f-9b8e38ea93c0?tab=configurations
config editor heading New configuration
deck editor heading New deck
```

The scroll behaviour itself is not visible yet: `preventScrollReset` takes effect only under the data router T2 builds, so this task's evidence for it is the `router.state` assertion.

Departures from Details or Files: none. The hook's result is read as `params` at every call site, not aliased, so the local copies that held that name became `nextParams`, and in `PracticeCreatePage.tsx` the ones built for `navigate` became `builderParams` and `overviewParams`.

Read in the code: nothing beyond `frontend/src/lib/viewParams.ts`; the rest of the diff is the mechanical move to the hook.

### T2 — The data router with scroll restoration

**Status**

- [x]

**Goal**

Going back lands the user at the scroll position they left, restored by the router after the page has drawn.

**Dependencies**

- T1: `setParams`, whose `preventScrollReset` keeps every write to a page's own URL from scrolling to the top under the data router.

**Files**

- `frontend/src/App.tsx`
- `frontend/src/components/shell/AppShell.tsx`
- `frontend/src/components/shell/AppShell.test.tsx`

**Details**

The router, ADR 089:

```tsx
// frontend/src/App.tsx
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from "react-router-dom";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppShell />}>
      {/* the routes App.tsx holds today */}
    </Route>,
  ),
);

export default function App() {
  return <RouterProvider router={router} />;
}
```

- The route tree must be the one `App.tsx` holds when this task is built, each route's `path` and `element` unchanged, with `BrowserRouter` and `Routes` gone.
- No route may carry a `loader`, an `action` or an `errorElement`, ADR 089.
- `AppShell.tsx` must render `<ScrollRestoration />` from `react-router-dom` once, as a sibling of `<main>`, and nothing else in the shell changes.

The test, ADR 089: `renderShell` in `AppShell.test.tsx` builds its router with `createMemoryRouter(createRoutesFromElements(...))` over the same two routes it holds today, passing `initialEntries` as the router's option, and renders `<RouterProvider router={router} />` inside the `QueryClientProvider`; every assertion stays as it is.

**Out of scope**

- A loader or action on any route: never, ADR 089.
- Guarding a form's unsaved changes with `useBlocker`: a later cycle.
- The reveal after a tab or filter change: T3.
- The "<" in the row of places: T4.
- Moving the page tests off `MemoryRouter`: never, since they mount pages without `AppShell`.

**Done when**

- `grep -n "BrowserRouter\|<Routes\|loader=\|action=\|errorElement" frontend/src/App.tsx` prints nothing, and `grep -c "createBrowserRouter\|RouterProvider" frontend/src/App.tsx` prints `3` or more.
- `grep -n "ScrollRestoration" frontend/src/components/shell/AppShell.tsx` prints two lines, the import and the render.
- `cd frontend && npx vitest run src/components/shell/AppShell.test.tsx` passes, with no `MemoryRouter` import left in the file.
- In headless Chromium against `localhost:5173/library`, signed out of Clerk, at a 390 by 500 viewport: scroll the window to its bottom, record `window.scrollY`, click the first subject's row, wait for the subject page's heading, call `history.back()`, wait for the "Your library" heading, and read `window.scrollY` again; the two values are equal and above `0`, and the script's output is the evidence.
- In the same script, from the subject page, call `history.back()` and then `history.forward()`; the subject page's `window.scrollY` is `0`.

**Debrief**

Evidence, in the order of Done when:

- The first line does not hold as written, and no code can make it hold. Its first grep must print nothing, yet its pattern `BrowserRouter` matches inside `createBrowserRouter`, which Details requires and which the second grep counts. It prints:
  ```
  2:  createBrowserRouter,
  21:const router = createBrowserRouter(
  ```
  Those two lines are its only matches, so `<Routes`, `loader=`, `action=` and `errorElement` are absent. Read as a whole word, the old names are gone too: `grep -nw "BrowserRouter\|Routes" frontend/src/App.tsx` prints nothing. The second grep, `grep -c "createBrowserRouter\|RouterProvider" frontend/src/App.tsx`, prints `4`. The engineer accepted the word-bounded grep as the evidence for this line; the line itself stays as written.
- `grep -n "ScrollRestoration" frontend/src/components/shell/AppShell.tsx` prints two lines:
  ```
  2:import { Outlet, ScrollRestoration } from 'react-router-dom';
  70:      <ScrollRestoration />
  ```
- `cd frontend && npx vitest run src/components/shell/AppShell.test.tsx` passes, 10 of 10. `grep -nw MemoryRouter frontend/src/components/shell/AppShell.test.tsx` prints nothing; `createMemoryRouter` is the file's import, as Details requires.
- The scroll restore, in headless Chromium against `localhost:5173/library`, signed out of Clerk, at 390 by 500:
  ```
  library scrollHeight 602 rows 3
  library scrollY at bottom: 102
  clicked "Web" -> /subjects/:id
  new subject page scrollY: 0
  library scrollY after back: 102
  equal and above 0: true
  ```
- From the subject page, in the same script:
  ```
  subject scrollY after history.back() then history.forward(): 0
  ```

Checks over the whole frontend: `npx vitest run` 54 files and 557 tests passed; `npm run lint` and `npm run build` exit 0.

Beyond Done when, the same script clicked the Decks tab at the bottom of Your library, a `setParams` write under the data router: `tab write 102 -> 64 ?tab=decks`. The page did not jump to the top; it went to 64 because the Decks list is shorter and the page's bottom moved up. The reveal is T3's. Measured: the page's furthest scroll went from 102 to 64.

The engineer then ordered the same check on the other pages, at 390 by 500 (Clear filters at 390 by 300), with clicks that do not make the driver scroll. Before and after are `window.scrollY`; no write reached `0` from a page that stayed scrollable, except the first row below:

```
Practice, New practice: a filter whose list is not fetched yet   62 -> 0, 158 -> 0
deck: Cards to Configurations                                    32137 -> 122 (page's bottom)
deck: Configurations to Cards                                    122 -> 122, or 122 -> 32137
Practice: All to Completed, Completed to Active                  915 -> 570, 570 -> 156 (page's bottom)
Practice: Active to All                                          156 -> 156, or 156 -> 570
Practice: a filter whose list is fetched                         62 -> 62
New practice: a filter whose list is fetched                     158 -> 158, or 158 -> 94 (page's bottom)
Practice: Clear filters                                          135 -> 135
New practice: Clear filters                                      294 -> 294
New practice: typing the name                                    50 -> 50
New practice: ticking a configuration                            425 -> 466, 466 -> 529
New practice: removing a selection                               529 -> 466 (page's bottom)
```

- A filter whose list is not fetched: the router does not cause the `0`. With the answers held back 600ms on New practice, the trace of scroll and furthest scroll reads `[158,425] [0,0] [0,94]`: the page shrinks to nothing scrollable while the list loads, which forces the scroll to `0`, and it stays there. Practice shows the same numbers and was not held back. This bears on T3: `changeView` moves the page once the list has drawn and does not bring back a position lost while it loaded, so "only as far as that took" may not hold for such a filter. T3's Done when does not exercise it.
- The two "or" tab rows: the larger value appears only after the page had been scrolled further down earlier, and it is the browser's scroll anchoring, not the router. A log of `window.scrollTo` records no call by the app on any of these tab changes, and with `overflow-anchor: none` the same sequences hold at `122` and `156`.
- Ticking a configuration: the scroll grows as the selected list above it grows. Its cause was not isolated.
- Not exercised: the writes with no control of their own, the effect over `missingIds` and the `config_not_found` branch in `PracticeCreatePage.tsx`.
- Clear filters shows only over an empty list and no single filter in the dev data gives one, so each page was opened at an address holding a subject and a deck of another subject. The script wrote only URLs.

Finding, for the engineer: the data router brings its own default error screen, which `<Routes>` did not.

- Opening an address no route matches now shows the following, in place of the blank page `Routes` rendered (read from `_renderMatches` in react-router, which returns null without a data router; the old page was not run):
  ```
  Unexpected Application Error!
  404 Not Found

  💿 Hey developer 👋

  You can provide a way better UX than this when your app throws errors by providing your own ErrorBoundary or errorElement prop on your route.
  ```
- The same screen now catches an error thrown while a page renders, with its stack shown, since react-router's `_renderMatches` falls back to its `defaultErrorElement` under any data router. This was read from the source, not run.
- The script ran on the dev server only. `frontend/dist` holds both "Unexpected Application Error" and "Hey developer"; which of them a production build shows was not run.
- This meets two rules in AGENTS.md: a screen shows only words `docs/vocabulary.md` gives, and failures render inline with no error boundary. The task cannot resolve it: Details forbids an `errorElement` and keeps the route tree unchanged, which also rules out a catch-all route. The engineer entered it as B22 in `docs/backlog.md`.

Departures from Details or Files: none in the code. `App.tsx` uses the repository's single quotes and Prettier's line breaks rather than the quoting in Details' block.

`AppShell.test.tsx` now prints `Not implemented: Window's scrollTo() method` from jsdom, because `ScrollRestoration` scrolls on mount: 10 lines in that file's run, with no test failing. Details keeps the test to its router, so nothing stubs it.

Read in the code: nothing; the diff is the router swap, and `App.tsx`'s route tree is the old one re-indented.

### T3 — Moving only as far as the new list's first rows

**Status**

- [ ]

**Goal**

After a change to a tab or filter on Your library, a deck's page, the Practice page or New practice, the new list's first rows are on screen with the control just tapped still in view, and the page has moved only as far as that took.

**Dependencies**

- T1: `useViewParams`, `ViewParams` and `setParams`, which this task extends with `changeView`.
- T2: the data router, under which the hook's `preventScrollReset` is what keeps the write from scrolling, and `AppShell.tsx`, whose sticky header the reveal measures.

**Files**

- `frontend/src/lib/revealDelta.ts` (new)
- `frontend/src/lib/revealDelta.test.ts` (new)
- `frontend/src/lib/viewParams.ts`
- `frontend/src/lib/viewParams.test.tsx`
- `frontend/src/components/shell/AppShell.tsx`
- `frontend/src/pages/LibraryPage.tsx`
- `frontend/src/pages/DeckDetailPage.tsx`
- `frontend/src/pages/PracticeOverviewPage.tsx`
- `frontend/src/pages/PracticeCreatePage.tsx`

**Details**

The arithmetic, ADR 097:

```ts
// frontend/src/lib/revealDelta.ts
/** Edges in viewport coordinates, as `getBoundingClientRect` gives them. */
export type Edges = { top: number; bottom: number };

export type RevealInput = {
  viewportHeight: number;
  /** The bottom edge of AppShell's sticky header; content above it is hidden. */
  headerBottom: number;
  /** The control the user tapped. */
  control: Edges;
  /** The list's first two rows, or fewer when the list has fewer. */
  rows: Edges[];
};

/** The smallest vertical scroll that puts the control and the rows in view, as a delta
 * for `window.scrollBy`: negative to scroll up, 0 when they are in view already. */
export function revealDelta(input: RevealInput): number;
```

- The band in view runs from `headerBottom` to `viewportHeight`. Over the control and the rows together, `top` is the least top and `bottom` the greatest bottom. When `bottom - top` fits the band, the result must be `top - headerBottom` when `top` is above the band, `bottom - viewportHeight` when `bottom` is below it, and `0` otherwise. When it does not fit, the result must be `control.top - headerBottom`, so the control sits at the band's top and the rows follow as far as they fit.
- `revealDelta` must read nothing but its argument; `revealDelta.test.ts` runs under the `node` environment and must pin, each in a test of its own: all in view gives `0`; targets above the band give a negative delta that lands `top` on `headerBottom`; targets below give a positive delta that lands `bottom` on `viewportHeight`; targets that do not fit give `control.top - headerBottom`; an empty `rows` reveals the control alone.

The hook's second write, ADR 097, added to `ViewParams` in `viewParams.ts`:

```ts
export type ViewTargets = {
  /** The control the user tapped, as rendered after the change. */
  control: () => Element | null;
  /** The element whose children are the new list's rows, once the page has rendered the
   * list for the hook's current params; null until then. */
  listStart: () => Element | null;
};

export type ViewParams = {
  params: URLSearchParams;
  setParams: (next: URLSearchParams) => void;
  /** Writes `next` as a change to what the page's list shows, then moves the page only
   * as far as it takes to show the control and the list's first rows. */
  changeView: (next: URLSearchParams, targets: ViewTargets) => void;
};
```

- `changeView` must write exactly as `setParams` does, keep the pending targets with `next.toString()`, and on the first commit after the write where `params.toString()` equals it and `listStart()` returns an element, call `window.scrollBy(0, delta)` once with `delta` from `revealDelta` and drop the pending targets. A second `changeView` before that commit replaces the pending targets. A commit where `control()` returns null reveals the rows alone.
- The rows are the first two element children of the element `listStart()` returns, or that element itself when it has none. `headerBottom` is the bottom of the element with `id="app-header"`, which `AppShell.tsx` puts on its sticky `<header>`, and `0` when there is none. `viewportHeight` is `window.innerHeight`.
- The commit check runs in a layout effect without a dependency list, so the scroll lands before the browser paints the new list.

The pages: each tab and filter change below goes through `changeView`; `setParams` keeps every other write.

- `LibraryPage.tsx`, `setTab`: the control is the tab with `aria-selected="true"` inside the tablist, found through a ref on the tablist; `listStart` returns the open tab's `<ul>`, or the `EmptyState` element, once that tab's query has data, and null before.
- `DeckDetailPage.tsx`, `setTab`: the control as on Your library; `listStart` returns the `<tbody>` of the cards table, found through a ref on the `div` that wraps it, the "No cards in this deck yet." element when the deck has no cards, or the configurations' `<ul>` or empty-state element once `configurationsQuery` has data.
- `PracticeOverviewPage.tsx`, `setStatusTab`, `setFilters` and the Clear filters button: the control for a status tab is the selected tab; for a filter change and for Clear filters it is the `PracticeFilterBar`'s root element, found through a ref on the `div` that wraps it; `listStart` returns the sessions' `<ul>` or the empty-state element once `sessionsQuery` has data for the current filters, and null while it is fetching.
- `PracticeCreatePage.tsx`, `setFilters` and the Clear filters button: the control is the filter bar's root as on the Practice page; `listStart` returns `ConfigurationPickList`'s root element, found through a ref on a `div` that wraps it, or the empty-state element, once `configsQuery` has data for the current filters. `changeName`, `removeSelection`, the pick list's `onToggle`, the effect over `missingIds` and the `config_not_found` branch stay on `setParams`.

The test, `viewParams.test.tsx`: under the memory data router from T1, mount a page stub whose `listStart` returns null on the commit of the write and an element on the next, with `getBoundingClientRect` stubbed on the control, the rows and a `#app-header` element to place the rows below the viewport and `window.innerHeight` set; spy on `window.scrollBy`; call `changeView`; assert `scrollBy` was called once, with the delta `revealDelta` gives for those edges, and only after `listStart` returned the element.

**Out of scope**

- The summary's counts and "Order by": the summary's cycle.
- Smooth scrolling: never, since the page moves exactly the delta and no further.
- The look of tabs and filters as blocks: cycle 027.
- Filters placed directly above their list on New practice: a later cycle.

**Done when**

- `cd frontend && npx vitest run src/lib/revealDelta.test.ts` passes, with the five tests named in the output.
- `cd frontend && npx vitest run src/lib/viewParams.test.tsx` passes, with the `changeView` test named in the output.
- `grep -c "changeView(" frontend/src/pages/LibraryPage.tsx frontend/src/pages/DeckDetailPage.tsx frontend/src/pages/PracticeOverviewPage.tsx frontend/src/pages/PracticeCreatePage.tsx` prints `1`, `1`, `3` and `2` for the four files, in that order.
- `grep -n 'id="app-header"' frontend/src/components/shell/AppShell.tsx` prints one line.
- In headless Chromium against `localhost:5173/library`, signed out of Clerk, at a 390 by 500 viewport: scroll the window to its bottom, then click the Decks tab through `element.click()` in `page.evaluate`, so that the driver does not scroll it into view; afterwards the tablist's `getBoundingClientRect().top` is at or below the header's bottom edge, the first two deck rows' `bottom` edges are at most `500`, and `window.scrollY` is less than it was; the script's output is the evidence.
- In the same script, at `window.scrollY` of `0`, click the Subjects tab the same way; `window.scrollY` stays `0`.

**Debrief**

None.

### T4 — The "<" that goes back

**Status**

- [ ]

**Goal**

The "<" in the row of places is a button spoken "Back" that returns the user to the page they came from, shown exactly when there is an earlier page in Flashy, and absent when the page was opened from its address.

**Dependencies**

- T2: the data router, under which going back restores the page's scroll position; the "<" reads the router's location key, which both routers give.

**Files**

- `docs/vocabulary.md`
- `frontend/src/components/ui/Breadcrumb.tsx`
- `frontend/src/components/ui/Breadcrumb.test.tsx`

**Details**

The word first: the vocabulary's "Places" row, under User reads, gains `"Back", spoken, on the "<" that goes back`, before the row's other words; its Where and Code columns stay.

The "<", PDR 017, in `Breadcrumb.tsx`:

- The "<" must be a `<button type="button" aria-label="Back">` holding the `ChevronLeft` icon, rendered before the places exactly when `useLocation().key !== 'default'`, and its click must call `navigate(-1)` from `useNavigate`. When the key is `'default'`, the row renders its places alone and no chevron.
- The row's places, their links and their separators stay as they are, PDR 017; `places` keeps its type.
- The button must be at least 44px tall and wide in its hit area, as `TopBar.tsx`'s buttons are, with the icon's size unchanged.

The tests, `Breadcrumb.test.tsx`, each a test of its own:

- Rendered under `renderWithRouter` with one entry, the row has no button named Back, and the four tests the file holds today pass unchanged.
- Rendered under `MemoryRouter` with `initialEntries={['/library', '/subjects/s1']}` and `initialIndex={1}`, the row has a button named Back; after a click on it, a `useLocation` probe shows `/library`.

**Out of scope**

- A "<" on a main place or on a form: never, PDR 017.
- A "<" that goes to the nearest place when there is no earlier page: never, PDR 017.
- The row's look: cycle 027.
- A row on Home or on the summary: the cycles that build them.

**Done when**

- `grep -n '"Back"' docs/vocabulary.md` prints one line, the "Places" row.
- `grep -c "navigate(-1)\|'default'" frontend/src/components/ui/Breadcrumb.tsx` prints `2`.
- `cd frontend && npx vitest run src/components/ui/Breadcrumb.test.tsx` passes, with the two new tests named in the output.
- In headless Chromium against `localhost:5173`, signed out of Clerk, in a fresh browser context: open `/library`, click the first subject's row, and on the subject page a button named Back is in the row of places; click it, and the address is `/library`. Then, in a second fresh context, open that subject's page by its address: the row of places has a link named "Your library" and no button named Back. The script's output is the evidence.
- The cycle's judgement: a script in the session scratchpad, run against `localhost:5173` at a 390 by 500 viewport, in a fresh context, opens `/library`, scrolls to the bottom, clicks the last visible deck or subject row, clicks the Back button on the page it reaches, and prints `window.scrollY` before leaving and after returning, equal and above `0`; opens a deck's page by its address and prints that the row of places holds no button named Back; and on `/library` scrolled to the bottom clicks the Decks tab through `element.click()` and prints the tablist's top, the header's bottom and the first two rows' bottoms, with the tablist at or below the header and the rows at most `500`. The script's output is in the Debrief, for the engineer to drive the same three paths with a mouse.

**Debrief**

None.
