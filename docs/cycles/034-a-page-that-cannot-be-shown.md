# 034 — A page that cannot be shown

## Goal

Outcome: An address that leads to no page shows "Page not found." in the place of the page's content, and a page that fails while it is being drawn shows "Could not load this page." there, each under the top bar, the menu and the connection banner, which stay; the user goes on by the menu or the browser's back, and the page is never drawn again on its own.

Scope: The cycle covers the route tree in `frontend/src/App.tsx`: one pathless route carrying an `errorElement` between the `AppShell` layout route and the pages, and one last route with path `*`; the two pages those routes render, each one sentence of the vocabulary and nothing else; the two Failure rows of `docs/vocabulary.md` that gain the whole page as a place their sentence is shown; and a test of the tree's shape and of both screens under the shell. It leaves out every failure smaller than the page, which stays inline where it happened; a reset key, retry or reload on the boundary, which ADR 104 rejects; any change to `AppShell`; and a page name for the browser tab, which stays "Flashy" on both pages since neither page has a name.

Judgement: The engineer judges on the live server: opening `/nowhere` shows the top bar, the menu button and "Page not found." under them, inside Flashy's frame, with the menu still reaching Home, Your library and Practice, and the browser's back returning to the page before it; and reads `frontend/src/App.test.tsx`, where a page made to throw while rendering shows "Could not load this page." under the same shell and the next navigation leaves it behind.

## Records

- PDR 031: Failures met in place, up to the whole page, with one banner for the connection
- ADR 089: A data router without loaders, for scroll restoration
- ADR 104: An error boundary and a catch-all route for a page that cannot be shown

## Tasks

### T1 — The boundary route and the catch-all route

**Status**

- [ ]

**Goal**

The route tree holds one error boundary and one catch-all route, each rendering its vocabulary sentence in the place of the page's content under the shell, and the vocabulary names both places.

**Dependencies**

None.

**Files**

- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx` (new)
- `frontend/src/pages/NotFoundPage.tsx` (new)
- `frontend/src/pages/FailedPage.tsx` (new)
- `docs/vocabulary.md`

**Details**

The tree, ADR 104 and ADR 089, in `frontend/src/App.tsx`:

- The route elements must be built once and exported, so a test can mount them on a memory router:

```tsx
export const appRoutes = createRoutesFromElements(
  <Route element={<AppShell />}>
    <Route errorElement={<FailedPage />}>
      {/* every page route, as today */}
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Route>,
);
```

- `App` builds `createBrowserRouter(appRoutes)` and mounts it as today. The pathless route must be the only child of the shell's route, the pages its children, and the `*` route its last child, so the sentence renders where the page's content would, under the top bar, the menu and the banner.
- The boundary must carry no reset key, no retry and no reload: the router resets it on the next navigation and never retries a render, ADR 104. It must read nothing from the error: `useRouteError` appears nowhere, since the only words a screen shows are the vocabulary's.
- No other `errorElement` and no other `*` route exist.

The pages, PDR 031 and LPD15:

- `NotFoundPage.tsx` renders the sentence "Page not found." as a not-found sentence is rendered today, aside-coloured text in a `p-4` container, and nothing else: no heading, no way to Home, since the menu is the way on.
- `FailedPage.tsx` renders "Could not load this page." as a could-not-load sentence is rendered today, `role="alert"` in the wrong colour at `text-sm`, in a `p-4` container, and nothing else.
- Neither calls `usePageTitle`, so the tab reads "Flashy", the vocabulary's title for a page without a name.

The vocabulary, LPD15, in `docs/vocabulary.md`, two rows of the Failure area, exactly these edits and no other:

- The row "A thing that is gone": its Where gains "; the whole content of the page, for an address that leads to no page", and its Code gains `` `NotFoundPage` ``.
- The row "A thing that will not load": its Where gains "; the whole content of a page that failed while it was being drawn", and its Code gains `` `FailedPage` ``; `` `errorElement` ``.

The test, new at `frontend/src/App.test.tsx`, mounting `appRoutes` on `createMemoryRouter` inside a `QueryClientProvider` with Clerk signed out, as `AppShell.test.tsx` does:

- The tree's shape: the shell route has one child, that child has no `path` and has an `errorElement`, and its last child has `path: '*'`.
- At `/nowhere`: "Page not found." and the "Open menu" button are on screen, and `document.title` is `Flashy`.
- With `src/pages/HomePage` mocked by `vi.mock` to throw while rendering, at `/`: "Could not load this page." and the "Open menu" button are on screen; `router.navigate('/nowhere')` then shows "Page not found.", so the boundary reset on navigation.

**Out of scope**

- A sentence or boundary for a failed request: never; a query's or mutation's failure stays the page's inline state, ADR 104.
- A way to Home beside the sentence: never, PDR 031.
- A page name for the tab on either page: never in this cycle; the vocabulary gives none.

**Done when**

- `grep -c "errorElement" frontend/src/App.tsx` prints `1`, `grep -c 'path="\*"' frontend/src/App.tsx` prints `1`, and `grep -rn "useRouteError" frontend/src` prints nothing.
- `grep -c "NotFoundPage\|FailedPage" docs/vocabulary.md` prints `2`.
- `cd frontend && npx vitest run src/App.test.tsx src/components/shell/AppShell.test.tsx src/pages/placeholderPages.test.tsx` passes.
- The cycle's judgement, in headless Chromium against `localhost:5173`, signed out of Clerk with `DEV_AUTH_USER_ID` and `ENV=development`, at 390 wide: open `/library`, then navigate to `/nowhere`; the page shows the "Open menu" button and the text "Page not found.", `document.title` reads `Flashy`, and no element links to `/` outside the menu; opening the menu by mouse and clicking "Your library" lands on `/library`; back on `/nowhere`, `history.back()` lands on `/library`; with `/api/health` aborted through `page.route`, `/nowhere` shows the banner above the sentence. The script prints each check, and its output is the evidence.
- A screenshot of `/nowhere` at 390 wide, with the banner showing, saved in the session scratchpad and named in the Debrief.

**Debrief**

None.
