# 028 — Back navigation and scroll

## Goal

Outcome: A page reached inside Flashy shows a "<" in its row of places that takes the user back to where they came from, spoken "Back", and a page opened from an address, in a new tab or straight after signing in, shows only its places; going back lands the user where they were on the page they left; after a change to a tab or filter, the new list's first rows are on screen with the control just tapped still in view, and the page moves only as far as that takes; and every page's sticky row and the side menu sit below the header at its real height, with the connection banner showing or not.

Scope: The cycle covers the "<" in the row of places, scroll restoration on going back through a data router, one hook for a page's URL search params that never resets scroll, the scroll rule after a tab or filter change on Your library, a deck's page, the Practice page and New practice, the old list staying on screen while a filter's new list loads on the Practice page and New practice, the header's measured height, one component for a page's sticky row, and the removal of the hard-coded offsets on the sticky rows, the side menu and the pickers' chevrons. It leaves every other page element's look to cycle 027 and every list's order, the summary's counts and order, where New practice's filters sit, and sizing text in a scaling unit to a later cycle.

Judgement: The engineer judges by driving a mouse through going back from a deck page to Your library, reloading a page opened from its address, changing a tab on Your library with the list scrolled, changing a filter on New practice to a list not loaded before, and, with the connection banner showing at 390 and 1280 wide, scrolling New practice and the deck and configuration forms and opening the side menu, and seeing the page land where it was, show no "<", move only as far as the new list's first rows, keep the old list until the new one arrives, and hold each sticky row and the side menu's first item below the header.

## Records

- PDR 017: A row of the places above a page, led by a way back
- ADR 089: A data router without loaders, for scroll restoration
- ADR 097: One hook for a page's URL search params, that never resets scroll
- ADR 099: The router's history index as the test for an earlier page
- ADR 100: A measured header height and one component for a page's sticky row
- ADR 101: No hard-coded number standing for another element's size

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

### T3 — The measured header and the one sticky row

**Status**

- [x]

**Goal**

Every page's sticky row stops at the header's real height, with the connection banner showing or not, and a sticky row with a hard-coded `top` fails a test.

**Dependencies**

- T1: `DeckEditor.tsx`, `DeckConfigurationEditor.tsx` and `PracticeCreatePage.tsx` as it left them; no interface used.
- T2: `AppShell.tsx` as it left it; no interface used.

**Files**

- `frontend/src/components/shell/AppShell.tsx`
- `frontend/src/components/shell/AppShell.test.tsx`
- `frontend/src/components/ui/StickyPageRow.tsx` (new)
- `frontend/src/components/ui/StickyPageRow.test.tsx` (new)
- `frontend/src/components/library/DeckEditor.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.tsx`
- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/test/stickyOffset.test.ts` (new)

**Details**

The header's height, ADR 100:

- `AppShell` must measure its `<header>` with a `ResizeObserver` and write the height, in `px`, to `--app-header-height` on `document.documentElement`. The height must be the `height` of the header's `getBoundingClientRect()`.
- `AppShell` must also write the variable once in a layout effect on mount, so no frame draws a row with the variable unset, and must disconnect the observer on unmount.
- `ConnectionBanner` must stay in `AppShell`'s header, ADR 100.

The row, ADR 100:

```tsx
// frontend/src/components/ui/StickyPageRow.tsx
export default function StickyPageRow({
  children,
}: {
  children: ReactNode;
}): ReactNode;
```

- It must render one `<div data-reveal-clear>` holding `children`, with the class list of today's three rows and `top-(--app-header-height)` in place of `top-[114px]`: `sticky top-(--app-header-height) z-10 -mx-4 flex items-center justify-between gap-2 bg-(--color-ground) px-4 py-2`.
- `data-reveal-clear` must always be there, whether or not the page reveals a list, ADR 100.
- The rows in `DeckEditor`, `DeckConfigurationEditor` and `PracticeCreatePage` must each become a `StickyPageRow` with the same children, and the comment above each row that names 114px must go.

The guard, ADR 101, in `stickyOffset.test.ts`:

- It must export nothing and hold two tests. One passes a line holding `sticky top-[114px]` to the scan and sees it reported, and passes a line holding `sticky top-(--app-header-height)` and sees nothing reported. The other scans every non-test source file under `frontend/src` and expects no line holding both the word `sticky` and `top-[`, naming file and line on failure.
- `sourceFiles` in `frontend/src/test/theme.test.ts` is the best shape to copy for the walk.

The tests:

- `AppShell.test.tsx`: stub `ResizeObserver` with `vi.stubGlobal`, capturing its callback, and spy on the header's `getBoundingClientRect`. Assert the variable reads `114px` after mount and `172px` after the rect grows and the callback runs, and that `disconnect` was called after unmount. The stub in `src/test/setup.ts` stays as it is.
- `StickyPageRow.test.tsx`: the row renders its children and carries `data-reveal-clear`, and its class list holds `sticky` and `top-(--app-header-height)`.

**Out of scope**

- The side menu's padding and the pickers' chevrons: T4.
- `data-reveal-clear` on `AppShell`'s header: T6, the task that first reads it.
- Sizing text in a scaling unit: a later cycle.
- Moving the banner out of the header, or the page's scroll into `<main>`: never, ADR 100.
- Any change to a row's children or look: never.

**Done when**

- `cd frontend && npx vitest run src/components/shell/AppShell.test.tsx src/components/ui/StickyPageRow.test.tsx src/test/stickyOffset.test.ts` passes, with the new tests named in the output.
- `grep -rn "114px" frontend/src --include=*.ts --include=*.tsx --include=*.css --exclude=*.test.*` prints nothing.
- `grep -rln "data-reveal-clear" frontend/src --exclude=*.test.*` prints exactly one line, `frontend/src/components/ui/StickyPageRow.tsx`.
- With `<div className="sticky top-[114px]" />` added to `frontend/src/pages/LibraryPage.tsx` for the check and removed after it, `npx vitest run src/test/stickyOffset.test.ts` fails and names that file and line; the failure is the evidence.
- A script in headless Chromium against `localhost:5173`, signed out of Clerk, opens `/practice/new`, `/decks/new` and `/deck-configurations/new`, each at 390 wide and at 1280 wide, each with `/api/health` passing and with it aborted through `page.route` so the banner shows. Each run lowers the viewport's height from 300 until `window.scrollY` at the page's bottom is above `0`. Its output prints, at the bottom of each page, the header's `getBoundingClientRect().bottom`, the row's `getBoundingClientRect().top`, and whether they are within 1px of each other; every line reads true, and the header's bottom is greater with the banner than without.
- In the same script, on `/practice/new` at 390 wide with the banner showing, remove the abort and wait for the banner to go; the row's computed `top` follows the header's new height with no reload, and the output prints both values before and after.

**Debrief**

Evidence, in the order of Done when:

- `cd frontend && npx vitest run src/components/shell/AppShell.test.tsx src/components/ui/StickyPageRow.test.tsx src/test/stickyOffset.test.ts --reporter=verbose` passes, 14 of 14, the new tests named:
  ```
  ✓ src/test/stickyOffset.test.ts > sticky offsets > reports a hard-coded top beside sticky and passes a measured one
  ✓ src/test/stickyOffset.test.ts > sticky offsets > finds no hard-coded top beside sticky in any source file
  ✓ src/components/ui/StickyPageRow.test.tsx > StickyPageRow > renders its children in a row marked for a reveal to clear
  ✓ src/components/shell/AppShell.test.tsx > AppShell header height > writes the header height to --app-header-height, follows it, and stops on unmount
  ```
- `grep -rn "114px" frontend/src --include=*.ts --include=*.tsx --include=*.css --exclude=*.test.*` prints nothing, exit 1.
- `grep -rln "data-reveal-clear" frontend/src --exclude=*.test.*` prints one line:
  ```
  frontend/src/components/ui/StickyPageRow.tsx
  ```
- With `<div className="sticky top-[114px]" />` added to `LibraryPage.tsx` and removed after it, `npx vitest run src/test/stickyOffset.test.ts` fails, naming file and line; `git status` shows `LibraryPage.tsx` unchanged after it:
  ```
  FAIL  src/test/stickyOffset.test.ts > sticky offsets > finds no hard-coded top beside sticky in any source file
  AssertionError: expected [ 'pages/LibraryPage.tsx:55' ] to deeply equal []
  ```
- In headless Chromium against `localhost:5173`, signed out of Clerk, with the height lowered from 300 in steps of 40, at each page's bottom:
  ```
  /practice/new             w390 plain  h300 scrollY 625    headerBottom 114 rowTop 114 within1px true
  /practice/new             w390 banner h300 scrollY 683    headerBottom 172 rowTop 172 within1px true
  /practice/new             w1280 plain  h300 scrollY 625    headerBottom 114 rowTop 114 within1px true
  /practice/new             w1280 banner h300 scrollY 663    headerBottom 152 rowTop 152 within1px true
  /decks/new                w390 plain  h300 scrollY 338    headerBottom 114 rowTop 114 within1px true
  /decks/new                w390 banner h300 scrollY 396    headerBottom 172 rowTop 172 within1px true
  /decks/new                w1280 plain  h300 scrollY 338    headerBottom 114 rowTop 114 within1px true
  /decks/new                w1280 banner h300 scrollY 376    headerBottom 152 rowTop 152 within1px true
  /deck-configurations/new  w390 plain  h260 scrollY 26     headerBottom 114 rowTop 114 within1px true
  /deck-configurations/new  w390 banner h300 scrollY 44     headerBottom 172 rowTop 172 within1px true
  /deck-configurations/new  w1280 plain  h260 scrollY 26     headerBottom 114 rowTop 114 within1px true
  /deck-configurations/new  w1280 banner h300 scrollY 24     headerBottom 152 rowTop 152 within1px true
  /practice/new 390                header grows with banner: true (114 -> 172)
  /practice/new 1280               header grows with banner: true (114 -> 152)
  /decks/new 390                   header grows with banner: true (114 -> 172)
  /decks/new 1280                  header grows with banner: true (114 -> 152)
  /deck-configurations/new 390     header grows with banner: true (114 -> 172)
  /deck-configurations/new 1280    header grows with banner: true (114 -> 152)
  ```
- In the same script, on `/practice/new` at 390 wide, with the abort removed and the banner gone, with no navigation between the two lines:
  ```
  before {"computedTop":"172px","headerBottom":172,"rowTop":172,"scrollY":683,"variable":"172px"}
  after  {"computedTop":"114px","headerBottom":114,"rowTop":114,"scrollY":625,"variable":"114px"} navigations 0
  ```

Checks over the whole frontend: `npx vitest run` 56 files and 561 tests passed; `npm run lint` and `npm run build` exit 0.

Departures from Details or Files: none. The guard's walk copies `sourceFiles` from `theme.test.ts` without its exclusions of `test/` and the generated API files, so it scans every non-test file under `frontend/src`, as Details says.

The side menu still sits at its hard-coded padding, behind the header with the banner showing; that is T4's.

Read in the code: the layout effect in `AppShell`, the only logic here; the three rows are the same children inside `StickyPageRow`.

### T4 — Offsets with no number

**Status**

- [x]

**Goal**

The side menu's first item sits below the header at its real height, and each picker's chevron is centred on its input with no offset number.

**Dependencies**

- T3: `--app-header-height`, which `AppShell` writes on the document root.

**Files**

- `frontend/src/components/shell/SideDrawer.tsx`
- `frontend/src/components/shell/SideDrawer.test.tsx`
- `frontend/src/components/ui/PickerCombobox.tsx`
- `frontend/src/components/ui/PickerCombobox.test.tsx`
- `frontend/src/components/practice/PracticeFilterBar.tsx`

**Details**

The side menu, ADR 101:

- `SideDrawer`'s content must replace `pt-[7.875rem]` with `pt-[calc(var(--app-header-height)+0.75rem)]`, so the first item keeps its 0.75rem of space below the header, with the banner showing or not. Nothing else in its class list changes.

The chevron, ADR 101:

- `PickerCombobox`'s `ChevronDown` must be centred on the input by CSS, with no number standing for the input's height. `PracticeFilterBar`'s root must lose `[&_svg.absolute]:top-[13px]`.
- `top-1/2 -translate-y-1/2` on the chevron is the best way known. If an inline input leaves the wrapper taller than the input, adding `block` to the input is the best fix.
- `[&_input]:h-[42px]` and `h-[46px]` must stay. Each is a size chosen for how the input looks, which ADR 101 keeps.
- The comment above `PracticeFilterBar`'s root must stop saying the chevron is moved.

The tests, jsdom doing no layout (ADR 017), each a test of its own:

- `SideDrawer.test.tsx`: the dialog's class list holds `var(--app-header-height)`.
- `PickerCombobox.test.tsx`: with `purpose="filter"`, the chevron's class list holds no `top-[`.

**Out of scope**

- The filters' look, or their panel: a later cycle.
- A chevron on a form's picker: never; `PickerCombobox` draws one only as a filter.
- Any other arbitrary value in these files: never, since each one left is a size chosen for how a thing looks.

**Done when**

- `cd frontend && npx vitest run src/components/shell/SideDrawer.test.tsx src/components/ui/PickerCombobox.test.tsx` passes, with the two new tests named in the output.
- `grep -n "7.875rem" frontend/src/components/shell/SideDrawer.tsx` prints nothing.
- `grep -n "top-\[" frontend/src/components/ui/PickerCombobox.tsx frontend/src/components/practice/PracticeFilterBar.tsx` prints nothing.
- A script in headless Chromium against `localhost:5173`, signed out of Clerk, at 390 wide and at 1280 wide, with `/api/health` passing and with it aborted through `page.route` so the banner shows, opens the side menu with a mouse click on `/library` and prints the header's bottom and the first item's top. In all four runs, the first item's top minus the header's bottom is `12` within 1px.
- In the same script, on `/practice` and on `/practice/new`, it prints each filter's input top and bottom and its chevron's top and bottom. On every filter, the chevron's centre is within 1px of the input's centre.

**Debrief**

Evidence, in the order of Done when:

- `cd frontend && npx vitest run src/components/shell/SideDrawer.test.tsx src/components/ui/PickerCombobox.test.tsx --reporter=verbose` passes, 21 of 21, the new tests named:
  ```
  ✓ src/components/shell/SideDrawer.test.tsx > SideDrawer > pads its first item from the measured header height
  ✓ src/components/ui/PickerCombobox.test.tsx > PickerCombobox > purpose="filter" > draws a chevron with no hard-coded top
  ```
- `grep -n "7.875rem" frontend/src/components/shell/SideDrawer.tsx` prints nothing, exit 1.
- `grep -n "top-\[" frontend/src/components/ui/PickerCombobox.tsx frontend/src/components/practice/PracticeFilterBar.tsx` prints nothing, exit 1.
- In headless Chromium against `localhost:5173`, signed out of Clerk, the side menu opened with a mouse click on `/library`, no page errors in any run:
  ```
  menu w390 plain  headerBottom 114 firstItemTop 126 diff 12 ok true
  menu w390 banner headerBottom 172 firstItemTop 184 diff 12 ok true
  menu w1280 plain  headerBottom 114 firstItemTop 126 diff 12 ok true
  menu w1280 banner headerBottom 152 firstItemTop 164 diff 12 ok true
  ```
- In the same script, every filter's chevron against its input, at 390 and at 1280 wide:
  ```
  chevron w390 /practice "All subjects" input 184-226 chevron 197-213 wrapperH 42 centreDiff 0 ok true
  chevron w390 /practice "All decks" input 184-226 chevron 197-213 wrapperH 42 centreDiff 0 ok true
  chevron w390 /practice/new "All subjects" input 341.5-383.5 chevron 354.5-370.5 wrapperH 42 centreDiff 0 ok true
  chevron w390 /practice/new "All decks" input 341.5-383.5 chevron 354.5-370.5 wrapperH 42 centreDiff 0 ok true
  chevron w1280 /practice "All subjects" input 184-226 chevron 197-213 wrapperH 42 centreDiff 0 ok true
  chevron w1280 /practice "All decks" input 184-226 chevron 197-213 wrapperH 42 centreDiff 0 ok true
  chevron w1280 /practice/new "All subjects" input 341.5-383.5 chevron 354.5-370.5 wrapperH 42 centreDiff 0 ok true
  chevron w1280 /practice/new "All decks" input 341.5-383.5 chevron 354.5-370.5 wrapperH 42 centreDiff 0 ok true
  ```

Checks over the whole frontend: `npx vitest run` 56 files and 563 tests passed; `npm run lint` and `npm run build` exit 0.

Beyond Done when, the same script opened the first filter's list on each page: its top sits 4px below the input's bottom at both widths, the `mt-1` it had.

Departures from Details or Files: none. `block` on the input was not needed: the wrapper measures 42, the input's own height, so `top-1/2 -translate-y-1/2` centres the chevron alone. `PracticeFilterBar`'s root div fits one line once its class list shortens, so its tag is reflowed.

Read in the code: nothing; the diff is three class lists and one comment.


### T5 — The old list while a new one loads

**Status**

- [ ]

**Goal**

When a filter on the Practice page or New practice needs a list not loaded before, the old list stays on screen until the new one arrives, and the page stays where it was.

**Dependencies**

- T3: `PracticeCreatePage.tsx` as it left it; no interface used.

**Files**

- `frontend/src/pages/PracticeOverviewPage.tsx`
- `frontend/src/pages/PracticeOverviewPage.test.tsx`
- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`

**Details**

- `sessionsQuery` in `PracticeOverviewPage.tsx` and `configsQuery` in `PracticeCreatePage.tsx` must each carry `placeholderData: keepPreviousData`, imported from `@tanstack/react-query`.
- No other query may carry the option: not `allConfigsQuery`, and no default on the `QueryClient`.
- The old list must never be copied into component state, ADR 088.
- The old list must not be held after a failure: a new list that fails to load removes the old one, and the page shows its existing sentence, "Could not load practices." or "Could not load configurations.".
- A configuration ticked on the old list must stay ticked, and must show under Selected even if the new filter hides it.

The tests, each a test of its own, each holding the filtered response behind a promise the test releases:

- `PracticeOverviewPage.test.tsx`: after picking a subject, the URL holds the subject and the old practice's row is still on screen; after the release, the new list replaces it.
- `PracticeOverviewPage.test.tsx`: when the filtered response is a 500, the old row is gone and "Could not load practices." shows.
- `PracticeCreatePage.test.tsx`: after a filter set through a mouse-driven pick, the old configuration's row is still on screen; after the release, the new list replaces it.
- `PracticeCreatePage.test.tsx`: when the filtered response is a 500, the old row is gone and "Could not load configurations." shows.
- `PracticeCreatePage.test.tsx`: a configuration ticked while the response is held stays in the URL and shows under Selected after a new list that omits it arrives.

**Out of scope**

- `listStart` and `isPlaceholderData`: T6.
- A sign on screen that the list is loading: never unless a product decision asks for it, since none is decided.
- A tab change: never, since tabs show lists loaded with the page.
- Moving the page after the new list arrives: T6.

**Done when**

- `cd frontend && npx vitest run src/pages/PracticeOverviewPage.test.tsx src/pages/PracticeCreatePage.test.tsx` passes, with the five new tests named in the output.
- `grep -rn "keepPreviousData" frontend/src --exclude=*.test.*` prints exactly four lines: an import and an option in each of the two pages.
- A script in headless Chromium against `localhost:5173`, signed out of Clerk, at 390 by 500, runs the following on `/practice` and on `/practice/new`, in a fresh context each, with the list's responses for a filter held back 600ms through `page.route`:
  - It scrolls the window to a `scrollY` above `0` with the filter still on screen, and opens the filter with a mouse click.
  - It records `window.scrollY` and picks an option whose list has not been loaded in that context.
  - It samples `window.scrollY` and the first row's text until the response arrives.
  - Every sample holds the recorded `scrollY` and the old first row, and the first row's text changes after the response. If the new list is shorter than the page's position, the final `scrollY` may land on the page's bottom, and the output says so.
  - The output prints the samples.

**Debrief**

None.

### T6 — Moving only as far as the new list's first rows

**Status**

- [ ]

**Goal**

After a tab or filter change on Your library, a deck's page, the Practice page or New practice, the new list's first rows are on screen with the control just tapped still in view and clear of every sticky row, and the page has moved only as far as that took.

**Dependencies**

- T1: `useViewParams`, `ViewParams` and `setParams`, which this task extends with `changeView`.
- T3: `StickyPageRow`'s `data-reveal-clear` and `--app-header-height`, which set the band's top.
- T5: `placeholderData: keepPreviousData` on `sessionsQuery` and `configsQuery`, whose `isPlaceholderData` this task reads.

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
- `frontend/src/components/practice/ConfigurationPickList.tsx`

**Details**

The arithmetic, ADR 097:

```ts
// frontend/src/lib/revealDelta.ts
/** Edges in viewport coordinates, as `getBoundingClientRect` gives them. */
export type Edges = { top: number; bottom: number };

export type RevealInput = {
  viewportHeight: number;
  /** The top of the band in view: the greatest stuck bottom among the page's sticky elements. */
  bandTop: number;
  /** The control the user tapped; null when it is no longer rendered. */
  control: Edges | null;
  /** The list's first two rows, or fewer when the list has fewer. */
  rows: Edges[];
};

/** The smallest vertical scroll that puts the control and the rows in view, as a delta
 * for `window.scrollBy`: negative to scroll up, 0 when they are in view already. */
export function revealDelta(input: RevealInput): number;
```

- The band runs from `bandTop` to `viewportHeight`. Over the control and the rows together, `top` is the least top and `bottom` the greatest bottom.
- When `bottom - top` fits the band, the result must be `top - bandTop` when `top` is above the band, `bottom - viewportHeight` when `bottom` is below it, and `0` otherwise.
- When it does not fit, the result must be `control.top - bandTop`, so the control sits at the band's top and the rows follow as far as they fit. With a null control, it must be `rows[0].top - bandTop`. With a null control and no rows, it must be `0`.
- `revealDelta` must read nothing but its argument. `revealDelta.test.ts` runs under the `node` environment and must pin, each in a test of its own:
  - all in view gives `0`
  - targets above the band land `top` on `bandTop`
  - targets below land `bottom` on `viewportHeight`
  - targets that do not fit give `control.top - bandTop`
  - empty `rows` reveals the control alone, and is `0` with a null control too
  - a null control reveals the rows alone

The hook's second write, ADR 097, added to `viewParams.ts`:

```ts
export type ViewTargets = {
  /** The control the user tapped, as rendered after the change. */
  control: () => Element | null;
  /** The element holding the new list, once the page has rendered it for the hook's
   * current params; null until then. */
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

- `changeView` must write exactly as `setParams` does and keep the pending targets with `next.toString()`.
- On the first commit after the write where `params.toString()` equals it and `listStart()` returns an element, it must call `window.scrollBy(0, delta)` once and drop the pending targets. A second `changeView` before that commit replaces the pending targets.
- The commit check must run in a layout effect without a dependency list, so the scroll lands before the browser paints the new list.
- The rows must be the first two elements marked `data-reveal-row` inside `listStart()`, else that element's first two element children, else the element itself.
- `bandTop` must be the greatest, over every `[data-reveal-clear]` element on the page, of its computed `top` read as a number plus its `getBoundingClientRect().height`, and `0` when there is none, ADR 097. A row's current edges must never set it. `viewportHeight` is `window.innerHeight`.
- `AppShell`'s `<header>` must carry `data-reveal-clear`, ADR 097.
- Each configuration row in `ConfigurationPickList`, the `div` keyed by `config.id`, must carry `data-reveal-row`. No other list carries the mark.

What the pages pass:

- `changeView` keeps the closures of the render the user tapped in, so `listStart` must never read a query's state through its closure. It must read only what is current at the commit.
- The best way known is a ref attached to the list's element only while that element shows the new list, as in `ref={query.isPlaceholderData ? undefined : listRef}`, with `listStart` returning `listRef.current`.
- `listStart` must return null while the query that fills the list is pending or `isPlaceholderData` is true. It must never test `isFetching`, which is also true during a refresh of a list that is already right.
- When that query has failed, `listStart` must return the page's failure sentence, the `<p role="alert">`, so the pending targets cannot fire later when the app's recovery refetches the list.

| Page                       | Writes through `changeView`                                | Control                                                                                                                                           | `listStart` once the list is ready                                                                                                                                             |
| -------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `LibraryPage.tsx`          | `setTab`                                                   | The tab with `aria-selected="true"`, found through a ref on the `div` that already wraps `Tabs`                                                   | The open tab's `<ul>` or `EmptyState` element                                                                                                                                  |
| `DeckDetailPage.tsx`       | `setTab`                                                   | As on Your library                                                                                                                                | The `<ul>` `CardList` renders, found through a ref on a `div` that wraps it, or the "No cards in this deck yet." element; or the configurations' `<ul>` or empty-state element |
| `PracticeOverviewPage.tsx` | `setStatusTab`, `setFilters`, the Clear filters button     | The selected tab for a status tab; for a filter and Clear filters, the `PracticeFilterBar`'s root, found through a ref on the `div` that wraps it | The sessions' `<ul>` or empty-state element                                                                                                                                    |
| `PracticeCreatePage.tsx`   | `setFilters`, which the Clear filters button already calls | The filter bar's root, as on the Practice page                                                                                                    | `ConfigurationPickList`'s root, found through a ref on a `div` that wraps it, or the empty-state element                                                                       |

- `setParams` keeps every other write. On `PracticeCreatePage.tsx` that means `changeName`, `removeSelection`, the pick list's `onToggle`, the effect over `missingIds` and the `config_not_found` branch.
- `id="app-header"` must not be added. The band comes from the marks.

The tests, in `viewParams.test.tsx`, each a test of its own, under the memory data router from T1, with `getBoundingClientRect` stubbed, `window.innerHeight` set and `window.scrollBy` spied on:

- `changeView` on a page stub whose `listStart` returns null on the write's commit and an element on the next: `scrollBy` is called once, with the delta `revealDelta` gives, and only after `listStart` returned the element.
- Two `[data-reveal-clear]` elements, one with a computed `top` of `114px` and height `56`, its current edges far down the page: the delta uses a `bandTop` of `170`.
- A list with `data-reveal-row` elements nested inside groups: the rows are the first two marked elements, not the groups.
- A second `changeView` before the commit: only the second call's targets are measured.

**Out of scope**

- The summary's counts and "Order by": a later cycle.
- Smooth scrolling: never, since the page moves exactly the delta and no further.
- The look of tabs and filters as blocks: cycle 027.
- Filters placed directly above their list on New practice, and the scroll growing when a configuration is ticked: a later cycle.
- `overflow-anchor` on any element: never, since the reveal measures after the browser's anchoring has applied.
- `data-reveal-row` on any other list: never.

**Done when**

- `cd frontend && npx vitest run src/lib/revealDelta.test.ts` passes, with the six tests named in the output.
- `cd frontend && npx vitest run src/lib/viewParams.test.tsx` passes, with the four `changeView` tests named in the output.
- `grep -c "changeView(" frontend/src/pages/LibraryPage.tsx frontend/src/pages/DeckDetailPage.tsx frontend/src/pages/PracticeOverviewPage.tsx frontend/src/pages/PracticeCreatePage.tsx` prints `1`, `1`, `3` and `1` for the four files, in that order.
- `grep -rln "data-reveal-clear" frontend/src --exclude=*.test.*` prints exactly three lines: `AppShell.tsx`, `StickyPageRow.tsx` and `viewParams.ts`.
- `grep -rln "data-reveal-row" frontend/src --exclude=*.test.*` prints exactly two lines: `ConfigurationPickList.tsx` and `viewParams.ts`.
- A script in headless Chromium against `localhost:5173`, signed out of Clerk, at 390 by 500, whose output is the evidence, in which a tab click goes through `element.click()` in `page.evaluate`, so the driver does not scroll it into view:
  - On `/library` scrolled to its bottom, click the Decks tab: the tablist's top is at or below the header's bottom, the first two rows' bottoms are at most `500`, and `window.scrollY` is less than it was.
  - On `/library` at `window.scrollY` of `0`, click the Subjects tab: `window.scrollY` stays `0`.
  - On a deck's page scrolled to its bottom, click Configurations, then Cards: after each click, the tablist's top is at or below the header's bottom.
  - On `/practice` scrolled to its bottom, click Completed: the same check on the tablist, and the first two rows' bottoms are at most `500` when the rows fit below it.
- In the same script, on `/practice/new`, with a filter's response held back 600ms through `page.route` and a list not loaded before:
  - Pick the filter with the mouse: until the response arrives, `window.scrollY` holds and the old first row stays.
  - Once it arrives, the filter bar's top is at or below the sticky row's stuck bottom, and the second configuration's bottom is at most `500` when the bar and the rows fit the band.
  - The output prints the two `scrollY` values and the difference, against the `revealDelta` worked from the printed edges.
- In the same script, on `/practice/new`, with the filter's response a 500: "Could not load configurations." is on screen, with the filter bar's top at or below the sticky row's stuck bottom.
- In the same script, on `/practice/new` with `/api/health` aborted so the banner shows, the same filter change leaves the filter bar's top at or below the sticky row's stuck bottom.

**Debrief**

None.

### T7 — The "<" that goes back

**Status**

- [ ]

**Goal**

The "<" in the row of places is a button spoken "Back" that returns the user to the page they came from, shown exactly when there is an earlier page in Flashy.

**Dependencies**

- T2: the data router, which writes the position this task reads and restores the page's scroll on going back.
- T3: `StickyPageRow` and `--app-header-height`, for the judgement's banner path.
- T4: the side menu's padding, for the judgement's banner path.
- T6: `changeView`, for the judgement's reveal path.

**Files**

- `docs/vocabulary.md`
- `frontend/src/components/ui/Breadcrumb.tsx`
- `frontend/src/components/ui/Breadcrumb.test.tsx`
- `frontend/src/lib/historyIndex.ts` (new)
- `frontend/src/lib/historyIndex.test.tsx` (new)

**Details**

The word first: the vocabulary's "Places" row for the row above a page's heading, under User reads, gains `"Back", spoken, on the "<" that goes back`, before the row's other words. Its Where and Code columns stay.

The test for an earlier page, ADR 099:

```ts
// frontend/src/lib/historyIndex.ts
/** Whether the router's position in the browser's history is above 0. */
export function hasEarlierPage(): boolean;
```

- `hasEarlierPage` must read `window.history.state?.idx` and return true exactly when it is a number above `0`.
- No other code may read `history.state`, ADR 099.

The "<", PDR 017, in `Breadcrumb.tsx`:

- The "<" must be a `<button type="button" aria-label="Back">` holding the `ChevronLeft` icon, rendered before the places exactly when `hasEarlierPage()` is true, and its click must call `navigate(-1)` from `useNavigate`. Otherwise the row renders its places alone, with no chevron.
- The row's places, their links and their separators stay as they are, PDR 017; `places` keeps its type.
- The button must be at least 44px tall and wide in its hit area, as `TopBar.tsx`'s buttons are, with the icon's size unchanged. `h-11 w-11` with `-my-3.5 -ml-3.5` is the best way known to keep the icon and the places where they sit today.

The tests, each a test of its own:

- `historyIndex.test.tsx`, ADR 099, under a real `createBrowserRouter` in jsdom, with `window.history.replaceState(null, '', '/')` before each test: `hasEarlierPage` is false on the opened entry, false after a `replace` on that entry, true after a push, true after a `replace` on the pushed entry, and false again after going back.
- `Breadcrumb.test.tsx`: under `renderWithRouter`, the row has no button named Back, and the four tests the file holds today pass unchanged.
- `Breadcrumb.test.tsx`: under `createBrowserRouter`, on the opened entry after a `replace`, the row has no button named Back.
- `Breadcrumb.test.tsx`: under `createBrowserRouter`, after a push, the row has a button named Back; after a click on it, a `useLocation` probe shows the first address.

**Out of scope**

- A "<" on a main place or on a form: never, PDR 017.
- A "<" that goes to the nearest place when there is no earlier page: never, PDR 017.
- The row's look: cycle 027.
- A row on Home or on the summary: the cycles that build them.
- Moving the page tests off `MemoryRouter`: never, since the "<" simply does not show under it, ADR 099.
- What the user sees at an address with no page: a later cycle.

**Done when**

- `grep -n '"Back"' docs/vocabulary.md` prints one line, the "Places" row.
- `grep -rn "history.state" frontend/src --exclude=*.test.*` prints exactly one line, in `frontend/src/lib/historyIndex.ts`.
- `grep -n "navigate(-1)\|hasEarlierPage()" frontend/src/components/ui/Breadcrumb.tsx` prints two lines, and `grep -c "'default'" frontend/src/components/ui/Breadcrumb.tsx` prints `0`.
- `cd frontend && npx vitest run src/lib/historyIndex.test.tsx src/components/ui/Breadcrumb.test.tsx` passes, with the new tests named in the output.
- In headless Chromium against `localhost:5173`, signed out of Clerk, in a fresh context: open a deck's page by its address, and the row has a link named "Your library" and no button named Back. Click the Configurations tab, and there is still no button named Back. Reload, and there is still none. The output prints the count after each step.
- In the same script, in a second fresh context: open `/library`, click the first subject's row, and a button named Back is in the row, with a hit area at least 44 by 44. Reload, and it is still there. Click it, and the address is `/library`. The output prints each.
- The cycle's judgement: a script in the session scratchpad, run against `localhost:5173` at 390 by 500, prints each of the following, for the engineer to drive the same paths with a mouse. Its output is in the Debrief.
  - In a fresh context, `/library` scrolled to its bottom, a click on the last visible row, a click on Back on the page it reaches, and `window.scrollY` before leaving and after returning, equal and above `0`.
  - A deck's page opened by its address, with no button named Back after a reload.
  - `/library` scrolled to its bottom, the Decks tab clicked through `element.click()`, with the tablist's top, the header's bottom and the first two rows' bottoms: the tablist at or below the header, and the rows at most `500`.
  - `/practice/new`, a filter whose list has not been loaded, its response held back 600ms: the old first row until the response arrives, and `window.scrollY` held until then.
  - With `/api/health` aborted so the banner shows, at 390 and at 1280 wide: `/practice/new`, `/decks/new` and `/deck-configurations/new` at their bottoms, each with the row's top within 1px of the header's bottom, and the side menu open with its first item's top `12` within 1px below the header's bottom.

**Debrief**

None.
