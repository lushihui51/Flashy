# 057 — A guest's shell

Waits for: 054, its `ViewerDep` answering a request with no `Authorization` header as the example user, dev's example library, and `AGENTS.md` and `docs/vocabulary.md`, which it shares; 055, with which it shares `docs/vocabulary.md`; 056, its `<header>` held to the column, and `frontend/src/components/shell/AppShell.tsx`, which it shares.

Canvas: https://claude.ai/artifact/EhvcB5TGPYBgos29brgPz9

## Goal

Outcome: A visitor who is not logged in sees the example library on every page, under a banner that says it is an example, and lands on Home, loaded afresh, at every log-in and log-out.

Scope: The cycle covers the search taken out of the top bar; `useViewer` as the one place that says who is looking; the API client waiting for Clerk and sending no token only for a guest; the shell drawing a page only once it knows the viewer, and loading Home afresh between viewers; Clerk's addresses after signing in, up and out; the development switch `VITE_DEV_AUTH`; the banners' one frame; the guest's banner; "Log in" drawn as a block; the vocabulary's rows for the banner, the search and the example library; and the browser-check line of `AGENTS.md`. It leaves out what a guest's press on a control that would write does, and a form's look for a guest, which the next cycle builds.

Judgement: The engineer judges on the live server, at 390 by 844 and at 1440 by 900. As a guest, with the API started with the bypass off and the frontend started without `VITE_DEV_AUTH`, signed out of Clerk: Home, Your library, a deck's page and a practice's page show the example library; the banner reads "This is an example. Log in to use all of Flashy." in white on ink above the top bar, on one line at 390 wide and as wide as the column at 1440; "Log in" is a yellow block with an outline and a shadow; and the top bar holds no search. Logging in loads Home afresh in the engineer's own account, with no banner, whatever page they were on; logging out loads Home afresh in the example library. With the bypass on and `VITE_DEV_AUTH=1` in `frontend/.env`, the app reads as the bypass's account, with no banner.

## Records

- PDR 020: A block for everything that can be tapped
- PDR 031: Failures met in place, up to the whole page, with one banner for the connection
- PDR 052: Phone layout in one column on wide screens
- PDR 053: An example library for guests to look through
- PDR 054: One meaning per color, with "Log in" yellow
- ADR 007: Clerk as the authentication provider
- ADR 063: A polled health probe for outage detection and recovery
- ADR 065: A status-carrying ApiError for every non-ok response
- ADR 069: One vocabulary file for the user's words and the code's names
- ADR 088: TanStack Query for the frontend's server state, refetched on mount
- ADR 130: A health endpoint resolving no user, for probes
- ADR 131: Guest reads answered as the example user, read-only
- ADR 132: One viewer hook, and a reload between viewers
- ADR 136: One column token for shell and fixed elements

## Tasks

### T1 — The top bar without a search

**Status**

- [x]

**Goal**

The top bar holds no search on any page, and no component exists for one.

**Dependencies**

None.

**Files**

- `frontend/src/components/shell/SearchBar.tsx` (deleted)
- `frontend/src/components/shell/SearchBar.test.tsx` (deleted)
- `frontend/src/components/shell/AppShell.tsx`
- `frontend/src/components/shell/AppShell.test.tsx`
- `docs/vocabulary.md`

**Details**

- `SearchBar` and its test file must be deleted, with its mount in `AppShell` and the element that wraps it, so the header holds the banner and the top bar alone.
- The vocabulary's row "Searching" must read `Not shown yet` in Where and `—` in Code. Its User reads stays.

**Out of scope**

- The component kept and not mounted: never.
- What a search finds and where its results appear: an unsettled decision.
- `README.md`, which calls search a placeholder: never; it is not maintained.

**Done when**

- `ls frontend/src/components/shell | grep -c SearchBar` prints `0`, and `grep -rc "SearchBar" frontend/src | grep -v ":0"` prints nothing.
- In `frontend/src/components/shell/AppShell.test.tsx`, `renders the top bar and the routed page content, and no search` passes.
- `grep -c "| App | Searching | \"Search\" | Not shown yet | — |" docs/vocabulary.md` prints `1`.
- In headless Chromium at 390 by 844, Home's `<header>` holds no input, and its height is the top bar's plus the header's padding.

**Debrief**

- `ls frontend/src/components/shell | grep -c SearchBar` printed `0`, and `grep -rc "SearchBar" frontend/src | grep -v ":0"` printed nothing.
- `renders the top bar and the routed page content, and no search` passed; it asserts no `searchbox` and no `textbox` in the shell.
- `grep -c "| App | Searching | \"Search\" | Not shown yet | — |" docs/vocabulary.md` printed `1`.
- In headless Chromium at 390 by 844, signed out of Clerk, Home's `<header>` held 0 inputs and one child, the top bar, 58px tall; the header was 66px tall, with 0px top padding and 8px bottom padding.
- Departures from guidance: none; the Details hold constraints alone.
- Code to read: nothing beyond the diff. The header keeps its `gap-0.5`, which now spaces only the connection banner from the top bar.

### T2 — The viewer

**Status**

- [x]

**Goal**

One hook says whether a guest or a user is looking, no request leaves before Clerk has loaded, a guest's pages are drawn from the example library, and every log-in and log-out loads Home afresh.

**Dependencies**

- T1: `frontend/src/components/shell/AppShell.tsx`, `frontend/src/components/shell/AppShell.test.tsx` and `docs/vocabulary.md`, which it shares.

**Files**

- `frontend/src/lib/viewer.ts` (new)
- `frontend/src/lib/viewer.test.tsx` (new)
- `frontend/src/api/client.ts`
- `frontend/src/test/client.test.ts`
- `frontend/src/test/setup.ts`
- `frontend/src/main.tsx`
- `frontend/src/components/shell/AppShell.tsx`
- `frontend/src/components/shell/AppShell.test.tsx`
- `frontend/src/components/shell/AccountSheet.tsx`
- `frontend/src/components/shell/AccountSheet.test.tsx`
- `docs/vocabulary.md`
- `AGENTS.md`

**Details**

ADR 132. `frontend/src/lib/viewer.ts`:

```ts
export type Viewer = 'loading' | 'guest' | 'user';

/** Who is looking: `loading` until Clerk has loaded, then `guest` while Clerk holds no session and `user` while it holds one. */
export function useViewer(): Viewer;

/** Loads Home afresh in the browser, replacing the current address. */
export function loadHomeAfresh(): void;
```

- `useViewer` must take its answer from Clerk's `useUser`. In a development build with `VITE_DEV_AUTH` set to any value that is not empty, it must answer `user` wherever it would answer `guest`; a production build never reads `VITE_DEV_AUTH`.
- `AppShell` must read who is looking through `useViewer` alone. It draws the header at once, and draws the page, its `<Outlet />`, only once the answer is not `loading`.
- When the answer changes between `guest` and `user`, `AppShell` must stop drawing the page and call `loadHomeAfresh` once. Nothing else reacts to a log-in or a log-out: `AccountSheet`'s Log out calls Clerk's sign-out and closes the sheet, and no longer navigates.
- The query for the New sheet's decks in `AppShell` must run for a guest as for a user, once the answer is not `loading`.
- `ClerkProvider` in `frontend/src/main.tsx` must be given `/` as the address after signing in, after signing up and after signing out.
- `frontend/src/api/client.ts`, in its `onRequest`:
  - every request but the health probe must wait until Clerk has loaded;
  - it then carries `Authorization` when Clerk holds a session, and no token only when Clerk holds none;
  - a request whose session gives no token, or whose `getToken` rejects, must fail before it is sent, as a plain `Error` with `CONNECTION_FAILED_MESSAGE`, never an `ApiError`;
  - the health probe waits for nothing and carries no token, as today (ADR 130);
  - where there is no `window`, as in the node tests of `frontend/src/test/`, it sends at once with no token, as today;
  - its declaration of `Window.Clerk` gains `loaded` as an optional boolean, so `frontend/src/components/shell/useConnectionStatus.test.tsx` builds as it stands.
- `frontend/src/test/client.test.ts` must run under jsdom, by its `@vitest-environment` line, and each of its new cases sets `window.Clerk` itself.
- `frontend/src/test/setup.ts` must give jsdom a Clerk that has loaded and holds no session, so every page test sends its requests at once.
- The vocabulary's row "The example library a guest is shown" must read, in Code, `` `ViewerDep`; `get_viewer`; `db_read_example_app_user`; `useViewer` ``.
- The Commands line of `AGENTS.md` that begins "Run a browser check signed out of Clerk" must read:

```
- Run a browser check signed out of Clerk, at each of a drawing's screen sizes: as a user, with `DEV_AUTH_USER_ID` and `ENV=development` set for the API and `VITE_DEV_AUTH` set for the frontend; as a guest, with none of the three set.
  - Reason: ADR 131, ADR 132
```

Guidance: Clerk's `window.Clerk` exists once `ClerkProvider` has mounted and carries `loaded`; the client can await one promise that resolves when `window.Clerk?.loaded` is true. The provider's props in `@clerk/react` 6 are `signInForceRedirectUrl`, `signUpForceRedirectUrl` and `afterSignOutUrl`. `loadHomeAfresh` is `window.location.replace('/')`. A guest's browser check needs an API with the bypass off beside the dev server, `DEV_AUTH_USER_ID= uv run uvicorn app.main:app --port 8001`, and a frontend without `VITE_DEV_AUTH`; Playwright's `page.route` can send a page's `/api` requests to that port.

**Out of scope**

- The viewer in a query's key, a cache emptied by hand, or a refetch in place at a log-in: never; ADR 132 rejects each.
- A read that asks the server who it answered as: never; ADR 132 rejects it.
- `AuthSlot` and `AccountSheet` reading Clerk's `useUser` for the user's name and picture: they stay; `useViewer` says only who is looking.
- The guest's banner and "Log in" as a block: T3.
- A guest's press on a control that would write, and a form's look for a guest: a later cycle. Until then a guest's write fails as a 401 does today.
- Removing the local bypass, or the switch that matches it: never.

**Done when**

- In `frontend/src/lib/viewer.test.tsx`, `answers loading until Clerk has loaded, then guest with no session and user with one` passes.
- `answers user for a guest in development with VITE_DEV_AUTH set, and guest without it` passes.
- In `frontend/src/test/client.test.ts`, `sends nothing before Clerk has loaded, then sends with no token when Clerk holds no session` passes.
- `sends the session's token while a session exists` passes.
- `fails a request whose session gives no token as a lost connection, and sends nothing` passes.
- `sends the health probe before Clerk has loaded, with no token` passes.
- In `frontend/src/components/shell/AppShell.test.tsx`, `draws the header and no page while the viewer is loading` passes.
- `stops drawing the page and loads Home afresh once when the viewer changes between guest and user` passes.
- In `frontend/src/components/shell/AccountSheet.test.tsx`, `Log out calls signOut and onClose, and navigates nowhere` passes.
- `grep -c "useViewer" docs/vocabulary.md` prints `1`.
- In headless Chromium as a guest, at 390 by 844: Home lists three runs under Active and one under Recently completed, Your library lists "Common words" and "Capitals", and every `/api` request but `/api/health` carries no `Authorization` header.
- In headless Chromium with every request to Clerk's script blocked: the top bar is drawn, `<main>` is empty, and no `/api` request but `/api/health` is sent.
- In headless Chromium as a user, with `DEV_AUTH_USER_ID`, `ENV=development` and `VITE_DEV_AUTH` set: Your library lists the bypass account's decks.

**Debrief**

- `answers loading until Clerk has loaded, then guest with no session and user with one` passed.
- `answers user for a guest in development with VITE_DEV_AUTH set, and guest without it` passed; it also asserts a guest under `DEV` false with the switch set, and `loading` with the switch set while Clerk loads. A production build made with `VITE_DEV_AUTH=1` compiles `useViewer` to `if (isSignedIn) return "user"; return "guest";`.
- `sends nothing before Clerk has loaded, then sends with no token when Clerk holds no session` passed; nothing was sent with `window.Clerk` absent, nor with it present and not loaded, and one request with no `Authorization` left once `loaded` was true.
- `sends the session's token while a session exists` passed.
- `fails a request whose session gives no token as a lost connection, and sends nothing` passed, for a `getToken` that gives `null` and one that rejects.
- `sends the health probe before Clerk has loaded, with no token` passed; `getToken` was never called.
- `draws the header and no page while the viewer is loading` passed.
- `stops drawing the page and loads Home afresh once when the viewer changes between guest and user` passed, from guest to user and from user to guest; a change back and forth after the first left `loadHomeAfresh` called once.
- `Log out calls signOut and onClose, and navigates nowhere` passed; the location stayed `/library`.
- `grep -c "useViewer" docs/vocabulary.md` printed `1`.
- In headless Chromium as a guest at 390 by 844, against the dev server on 5173 with its `/api` routed to `DEV_AUTH_USER_ID= uv run uvicorn app.main:app --port 8001`: Home listed 3 runs under Active and 1 under Recently completed; Your library held "Common words" and "Capitals"; of the requests `/api/health`, `/api/home` and `/api/decks`, the 2 that were not `/api/health` carried no `Authorization` header.
- In headless Chromium with every request to a Clerk host aborted, 6 of them, `clerk.browser.js` first: after 6 seconds the top bar was drawn, `<main>`'s inner HTML was `""`, and the only `/api` request sent was 1 `/api/health`.
- In headless Chromium as a user, against a Vite started with `VITE_DEV_AUTH=1` on port 5180 and the API on 8000 with `DEV_AUTH_USER_ID` and `ENV=development`: Your library showed each of the bypass account's decks, "Commands", "Ports" and "Reformer Repertoire".
- Departures from guidance: none.
- Code to read: `clerkLoaded` in `frontend/src/api/client.ts`, which checks `window.Clerk?.loaded` every 50 ms on one shared promise and drops that promise once it resolves, so a request never waits on a Clerk that has already loaded and a test can set Clerk back to not loaded. `AppShell` keeps the viewer it first drew the page for in `pageViewer`, set during render, and draws the page only while `useViewer()` still answers the same. No browser check drove a real log-in or log-out through Clerk's dialog; the reload rests on the `AppShell` test and on `ClerkProvider`'s three addresses.

### T3 — The guest's banner and "Log in"

**Status**

- [x]

**Goal**

A guest reads on every page, in a banner in ink above the top bar, that what they see is an example, and "Log in" is drawn as a block.

**Dependencies**

- T2: `useViewer`; `frontend/src/components/shell/AppShell.tsx`, `frontend/src/components/shell/AppShell.test.tsx` and `docs/vocabulary.md`, which it shares.

**Files**

- `frontend/src/components/shell/Banner.tsx` (new)
- `frontend/src/components/shell/Banner.test.tsx` (new)
- `frontend/src/components/shell/ExampleBanner.tsx` (new)
- `frontend/src/components/shell/ConnectionBanner.tsx`
- `frontend/src/components/shell/AppShell.tsx`
- `frontend/src/components/shell/AppShell.test.tsx`
- `frontend/src/components/shell/AuthSlot.tsx`
- `frontend/src/components/shell/AuthSlot.test.tsx`
- `docs/vocabulary.md`

**Details**

PDR 053, with drawings 1 and 2 as constraints on the header:

- Both banners must be drawn through one frame, `Banner` in `frontend/src/components/shell/Banner.tsx`, which takes a colour, an optional icon and the words, and holds the padding, the text size and `role="status"` that `ConnectionBanner` writes today:

```tsx
type BannerProps = {
  /** The banner's ground: `wrong` for a failure, `ink` for what is said. */
  color: 'wrong' | 'ink';
  Icon?: LucideIcon;
  children: string;
};
export default function Banner({ color, Icon, children }: BannerProps): ReactNode;
```

- `ConnectionBanner` must give `Banner` its red, its icon and its sentence, and looks as it does today. It stays the only banner that reports a failure.
- `ExampleBanner`, in `frontend/src/components/shell/ExampleBanner.tsx`, takes no props and must give `Banner` ink, no icon and the words "This is an example. Log in to use all of Flashy."
- `AppShell` must render `ExampleBanner` in its header while `useViewer()` answers `guest`, beneath `ConnectionBanner` when both show and above the top bar.
- The guest's banner must sit on one line at 390 wide at the default text size.
- "Log in" in `AuthSlot` must be drawn as a block: its yellow, with the ink outline and the shadow of `tappable-sm` (PDR 020, PDR 054).
- The vocabulary gains one row, in the App area:

```
| App | Telling a guest they are looking at an example | "This is an example. Log in to use all of Flashy." | A banner across the top of every page, while not logged in | `ExampleBanner` |
```

**Out of scope**

- A form greyed with Done alone at its foot, which drawing 1's third screen and drawing 2's second show: a later cycle.
- A guest's state inside `ConnectionBanner`, or a frame of `ExampleBanner`'s own: never.
- A button to log in inside the banner, a yellow banner, or a way to dismiss it: never; PDR 053.
- The mastery the drawings' circles show: never built; a circle shows what dev's example library holds.
- Any length, weight or outline in a drawing that differs from what the app draws today: never. "Log in" takes the outline and the shadow of `tappable-sm` as `frontend/src/index.css` writes them, whatever width the drawings give its outline.
- The column on a wide screen: it stands; the banner is in the header and so in the column.

**Done when**

- In `frontend/src/components/shell/Banner.test.tsx`, `draws its words with role status, with an icon only when given one` passes.
- In `frontend/src/components/shell/AppShell.test.tsx`, `shows the example banner to a guest, beneath the connection banner, and to no user` passes.
- In `frontend/src/components/shell/AuthSlot.test.tsx`, `draws Log in as a block` passes.
- `grep -c "ExampleBanner" docs/vocabulary.md` prints `1`.
- In headless Chromium as a guest at 390 by 844: on Home, Your library and Edit card the banner reads "This is an example. Log in to use all of Flashy.", its box is 390 wide and 36px tall, and it sits above the top bar; with the connection lost, the connection banner sits above it.
- In headless Chromium as a guest at 1440 by 900: the banner's left and right edges are `<main>`'s.
- Screenshots as a guest of Your library at 390 by 844 and at 1440 by 900, set beside drawing 2's first screen and drawing 1's first, differ in the header only in what Out of scope names.
- In headless Chromium as a user, with the three variables set: no page shows the banner.

**Debrief**

- `draws its words with role status, with an icon only when given one` passed; with no icon the status held no `svg`, and with `WifiOff` it held one, `aria-hidden`.
- `shows the example banner to a guest, beneath the connection banner, and to no user` passed; as a guest with the probe answering 503 the header held two statuses, the connection banner first and the example banner second, both before the top bar's "Open menu", and as a user with the same probe it held the connection banner and no example banner.
- `draws Log in as a block` passed; "Log in" carries `tappable-sm` and `bg-(--color-main-action)`.
- `grep -c "ExampleBanner" docs/vocabulary.md` printed `1`.
- In headless Chromium as a guest at 390 by 844, against the dev server on 5173 with its `/api` routed to `DEV_AUTH_USER_ID= uv run uvicorn app.main:app --port 8001`: on Home, Your library and Edit card, the banner read "This is an example. Log in to use all of Flashy.", its box was 390 by 36 at y 0, and the top bar began at y 38. With `/api/health` aborted, the header's children were the connection banner, y 0 to 56, the example banner, y 58 to 94, and the top bar, from y 96.
- In headless Chromium as a guest at 1440 by 900, on Your library: the banner's left and right edges were 400 and 1040, and `<main>`'s were 400 and 1040.
- Your library as a guest, screenshotted at 390 by 844 and 1440 by 900, and drawing 2's first screen and drawing 1's first, rendered at the same sizes: the header measured the same in both at each size, the banner 390 by 36 at 0,0 and 640 by 36 at 400,0, the top bar 58 tall from y 38, and "Log in" 77 by 44 at 297,45 and 947,45, with a computed border of `1px solid rgb(23, 33, 43)` and a shadow of `0px 2px 0px 0px` in both, since Chromium draws `tappable-sm`'s 1.5px border as 1px at a device pixel ratio of 1. The banner is ink, `rgb(23, 33, 43)`, with white words at 14px on a 20px line. Set one above the other, the headers show no difference. Below the header, the two decks stand in the opposite order and the mastery circles differ, which Out of scope names.
- In headless Chromium as a user, against a Vite started with `VITE_DEV_AUTH=1` on port 5180 and the API on 8000 with `DEV_AUTH_USER_ID` and `ENV=development`: Your library, Home, a deck's page, All practices and Edit card each drew their page and showed no example banner and no status.
- Departures from guidance: none; the Details hold constraints alone.
- Code to read: in `frontend/src/components/shell/AppShell.test.tsx`, the cases under `AppShell connection banner` now run as a user, so the guest's banner, also `role="status"`, does not stand among the statuses they read.
