# 002 — App shell rebuild

## Goal

Outcome: The frontend is rebuilt as a mobile-first app shell: top bar, sidebar drawer, login, account sheet.

Scope: The teardown of the existing frontend, then the top bar and its search row, the sidebar drawer, Clerk login in the auth slot, the account sheet, placeholder pages for the four routes, the colour tokens, and an acceptance pass. Not covered: desktop-specific layout; the real palette and dark/light mode; search behaviour (debounced query, results dropdown, Enter → results page, recent searches); the real Home, Library, Practice and Notifications pages and the Create flow; the final logo mark.

Judgement: None.

## Records

- ADR 005: Tailwind CSS for styling
- ADR 006: openapi-fetch and generated types for the API client
- ADR 007: Clerk as the authentication provider
- ADR 016: Radix Dialog for modal overlays
- ADR 017: React Testing Library with a per-file jsdom environment

## Tasks

### T1 — Teardown

**Status**

- [x]

**Goal**

The existing frontend is torn down to a bootable empty shell, keeping only the listed non-UI infrastructure.

**Dependencies**

None.

**Files**

- Everything under `frontend/src/` except the keep-list (deleted): all pages, components (including `EntityCard`), layouts, existing router config, existing `App.tsx`/`main.tsx` wiring, styles beyond the Tailwind entry, assets, and their tests.

**Details**

This is a rebuild, not a refactor: the existing frontend is torn down. Only the items in the keep-list survive; nothing else is preserved or adapted. After this task, there must be exactly one router and one Clerk provider, both created fresh.

This task must be its own PR, reviewed before anything else. Keep (move to a stable location if needed, do not modify contents):

- Generated OpenAPI types (`src/api/schema.d.ts` or equivalent) and the script that regenerates them.
- The `openapi-fetch` client instance and the Clerk-token-attaching middleware/fetch wrapper.
- Any TanStack Query hooks that are thin wrappers over those API calls (one hook per endpoint, no UI logic). If a hook contains UI state or component-specific shaping, it goes.
- Project config that isn't UI: `package.json`, lockfile, `vite.config.ts`, `tsconfig*.json`, Tailwind v4 entry, Vitest config, MSW setup file (`test/setup.ts`) and the `mocks/server.ts` scaffold, `vercel.json`/env examples, `.gitignore`, ADRs.
- Existing MSW handlers **only** if they mirror backend endpoints generically; delete any that exist to serve a specific deleted component's test.

Before running the teardown, print the proposed keep and delete lists and **wait for confirmation**; borderline items are decided there. Existing TanStack Query hooks and MSW handlers are kept only if they're UI-agnostic; anything borderline is listed in that confirmation step for the reviewer to decide.

**Out of scope**

- Building anything new.
- Modifying the contents of kept files.

**Done when**

- The app boots to a blank `<div id="root">` with `ClerkProvider` + `QueryClientProvider` + an empty router.
- The commit message lists every kept file explicitly.

**Debrief**

None.

### T2 — Shell skeleton

**Status**

- [x]

**Goal**

The `AppShell` layout route, routing, placeholder pages, top bar skeleton, search bar, and colour tokens stand, with no Clerk and no drawer behaviour yet.

**Dependencies**

- T1

**Files**

- `frontend/src/components/shell/AppShell.tsx` (new)
- `frontend/src/components/shell/TopBar.tsx` (new)
- `frontend/src/components/shell/Logo.tsx` (new)
- `frontend/src/components/shell/SearchBar.tsx` (new)
- `frontend/src/pages/HomePage.tsx` (new)
- `frontend/src/pages/LibraryPage.tsx` (new)
- `frontend/src/pages/PracticePage.tsx` (new)
- `frontend/src/pages/NotificationsPage.tsx` (new)
- The colour tokens file (new)
- Router wiring
- Each component's test file (new)

**Details**

`AppShell` layout route, 4 placeholder pages and routing per the architecture below. The top bar per the table below with the hamburger (a no-op for now), `Logo`, `Create` (a no-op), and a static `Log in` button (no Clerk yet). `SearchBar` typeable. A colour tokens file with the token names below.

The visual and behavioural reference is Quizlet's mobile web UI (see `reference/` screenshots if present; otherwise the descriptions here are authoritative).

Design for a ~360–430px viewport. Desktop must only _not be broken_; no desktop-specific layout work.

No new heavy deps without stating why. Prefer: React Router (if already present), Clerk React SDK, Tailwind v4, `lucide-react` for icons (acceptable to add if not present).

Each component ships with a Vitest + RTL test covering its acceptance criteria.

Styling: Tailwind v4 utilities. All colours must go through a small set of CSS custom properties defined in one place. Values are **temporary** and may be ugly.

The logo must be a plain link to `/`. The search placeholder text defaults to `Search`.

Top bar, all states. Layout, left → right, single row, fixed to top, full width:

| Slot | Element | Behaviour |
| --- | --- | --- |
| 1 | **Hamburger** (circular outline button) | Toggles the sidebar drawer. `aria-label="Open menu"` / `"Close menu"`, `aria-expanded` reflects state. |
| 2 | **Logo** | Placeholder mark. Renders as a link to `/`. Nothing else. |
| 3 | _(spacer)_ |  |
| 4 | **Create** (`+ Create`) | Visible, focusable, clickable, does nothing. |
| 5 | **Auth slot** | Signed out → `Log in` pill button (primary). Signed in → circular profile avatar button. |

Second row (below the bar, part of the same header region):

| Element | Behaviour |
| --- | --- |
| **Search input** | Real `<input type="search">` with leading search icon, placeholder text configurable through a prop (default `Search`). Fully typeable (controlled state). **Enter does nothing** (`preventDefault`, no navigation, no submit). **No results dropdown.** |

Keep `Create` as text on mobile for now, for parity with the signed-out bar; the icon-only variant is a later tweak. The header must not shift layout when the auth slot swaps between `Log in` and avatar: reserve a fixed-width slot.

Architecture:

```
<ClerkProvider>            (already exists — find it)
  <QueryClientProvider>    (already exists)
    <Router>
      <AppShell>           ← new: owns drawer/sheet open state, renders header + <Outlet/>
        <TopBar/>
        <SearchBar/>
        <SideDrawer/>
        <AccountSheet/>
        <main><Outlet/></main>
      </AppShell>
```

- Routing: one layout route (`AppShell`) with child routes for `/`, `/library`, `/practice`, `/notifications`. Unknown routes → existing 404 behaviour or a minimal placeholder.
- Colour tokens (one definition site): `--color-surface`, `--color-surface-elevated`, `--color-text`, `--color-text-muted`, `--color-primary`, `--color-primary-contrast`, `--color-scrim`.

Components. Adjust paths to match the repo's existing conventions.

- `components/shell/AppShell.tsx`. Props: none (layout route). Owns drawer and sheet state; renders `TopBar`, `SearchBar`, `SideDrawer`, `AccountSheet`, `<Outlet/>`. Test: `AppShell.test.tsx`: hamburger toggles drawer; avatar opens sheet; drawer and sheet are never open simultaneously.
- `components/shell/TopBar.tsx`. Props: `onMenuClick(): void`, `isMenuOpen: boolean`, `onAvatarClick(): void`. Renders hamburger, `Logo`, `Create`, auth slot (`AuthSlot`). Test: signed-out renders `Log in`; signed-in renders avatar `img` with `alt` containing user name; layout slot widths stable across states (assert on a fixed-width wrapper class or style).
- `components/shell/Logo.tsx`. Props: `className?`. `<Link to="/">` wrapping a placeholder SVG/text mark ("F" in a rounded square is fine). Test: renders link with `href="/"`.
- `components/shell/SearchBar.tsx`. Props: `placeholder?: string`. Controlled input, search icon, `onKeyDown` Enter → `preventDefault()`. No submit handler, no results UI. Test: typing updates value; pressing Enter does not navigate (assert `location` unchanged) and does not throw.
- Placeholder pages, `pages/{Home,Library,Practice,Notifications}Page.tsx`. Each renders an `<h1>` with the page name and a one-line "Coming soon" body. Test: smoke render only.

Accessibility baseline, non-negotiable even in skeleton:

- Hamburger: `<button aria-label aria-expanded aria-controls="side-drawer">`.
- Drawer: `role="dialog" aria-modal="true" aria-label="Main menu"`.
- Account sheet: `role="dialog" aria-modal="true" aria-labelledby=<profile name id>`.
- All icon-only buttons have `aria-label`.
- Tap targets ≥ 44×44px.
- `Esc` closes any open overlay; focus returns to the invoking control.

**Out of scope**

- Drawer behaviour: T3.
- Any Clerk wiring: T4.
- The account sheet: T5.

**Done when**

- The test files for these components pass.
- Routes `/`, `/library`, `/practice`, `/notifications` render their placeholder pages.
- Logo links to `/` and does nothing else.
- Create is clickable and does nothing.
- The search input accepts text, and Enter does not navigate, submit, or render results.

**Debrief**

None.

### T3 — SideDrawer

**Status**

- [x]

**Goal**

The sidebar drawer is wired to the hamburger with full focus, scroll and Esc behaviour.

**Dependencies**

- T2: `AppShell`, `TopBar`

**Files**

- `frontend/src/components/shell/SideDrawer.tsx` (new)
- `frontend/src/components/shell/SideDrawer.test.tsx` (new)
- `frontend/src/components/ui/Sheet.tsx` / `frontend/src/components/ui/Drawer.tsx`, the shared primitive wrapper, if one is adopted (new)
- `frontend/src/components/shell/AppShell.tsx`
- `frontend/src/components/shell/TopBar.tsx`

**Details**

State ownership: `AppShell` holds `isDrawerOpen` and `isAccountSheetOpen` (two booleans, `useState`). No global store. Open and close callbacks are passed down as props. If prop drilling gets past two levels, introduce a tiny `AppShellContext`, not before.

A headless dialog/sheet primitive is acceptable if it materially reduces a11y work; state the choice in the PR description.

The sidebar drawer:

- Opens from the **left** as an overlay drawer over the page, with a dim scrim. Tapping the scrim or pressing `Esc` closes it. Focus is trapped inside while open; focus returns to the hamburger on close. Body scroll locked while open.
- Drawer header: the real top bar stays visible above the drawer; the hamburger becomes the close control.
- Items, exactly these, in this order, each with an icon:
  1. **Home** → `/`
  2. **Your library** → `/library`
  3. **Practice** → `/practice`
  4. **Notifications** → `/notifications`
- Each item is a router link to a **placeholder page**. Selecting an item closes the drawer. The active item gets the highlighted pill treatment (as in the reference, "Home" is highlighted).
- The drawer is available in both signed-out and signed-in states (Quizlet shows the hamburger before login too).

`components/shell/SideDrawer.tsx`. Props: `open: boolean`, `onClose(): void`. Left overlay drawer + scrim, nav list from a `NAV_ITEMS` constant (`{ label, to, icon }[]`), active-state styling through the router's `NavLink`. Closes on item select, scrim, Esc. Focus trap + body scroll lock. Test: renders 4 items in order; clicking an item navigates and calls `onClose`; Esc calls `onClose`; focus returns to the trigger.

Optional `components/ui/Sheet.tsx` / `components/ui/Drawer.tsx`: if a headless primitive is adopted, wrap it once here so `SideDrawer` and `AccountSheet` share scrim, focus and scroll-lock behaviour. If hand-rolled, put the shared scrim + focus-trap + scroll-lock logic in a `useModalBehaviour(open, onClose)` hook instead.

Exactly four nav items, in order, from `NAV_ITEMS`; scrim and Esc close; focus trap; body scroll lock; focus returns to the hamburger; `aria-expanded` correct.

**Out of scope**

- Auth: T4.
- The account sheet: T5.

**Done when**

- The `SideDrawer` tests pass: renders 4 items in order; clicking an item navigates and closes; Esc closes; focus returns to the trigger; body doesn't scroll while open.

**Debrief**

`@radix-ui/react-dialog` adopted here per ADR 016. Post-manual-testing bugfix `bde01a4`: the drawer clipped "Home" and the hamburger silently stopped closing the drawer on a second click (neither trigger is a `Dialog.Trigger` descendant).

### T4 — AuthSlot

**Status**

- [x]

**Goal**

The auth slot is wired to Clerk: modal sign-in, signed-in avatar, loading placeholder.

**Dependencies**

- T2

**Files**

- `frontend/src/components/shell/AuthSlot.tsx` (new)
- `frontend/src/components/shell/AuthSlot.test.tsx` (new)
- `frontend/src/test/mocks/clerk.ts` (new)

**Details**

Login UI must be Clerk's: never a custom login form. Use Clerk's modal sign-in (`openSignIn()` from `useClerk()`, or `<SignInButton mode="modal">`). Quizlet's login sheet is the _vibe_, but Clerk's component is the implementation. Google is already configured in Clerk for Flashy.

Auth:

- The signed-in avatar comes from Clerk: `useUser().user?.imageUrl`. Fallback: initials from `user.firstName`/`user.lastName`/`primaryEmailAddress`, or a neutral placeholder.
- Tapping the avatar opens the Account Sheet. It does _not_ navigate.
- Branch the auth slot on the signed-in state, and handle the `!isLoaded` state with a same-size placeholder circle so the bar doesn't jump.

`components/shell/AuthSlot.tsx`. Props: `onAvatarClick(): void`. Signed out → `LoginButton` (calls Clerk `openSignIn`). Signed in → `AvatarButton`. `!isLoaded` → placeholder circle. Test: clicking `Log in` calls mocked `openSignIn`; clicking the avatar calls `onAvatarClick`.

`openSignIn` on `Log in`, avatar from `user.imageUrl` with the stated fallbacks, `!isLoaded` → same-size placeholder circle so the bar doesn't jump.

Testing:

- Mock the Clerk package at module level in a shared `test/mocks/clerk.ts` (it mocks `@clerk/react`'s exports; ADR 007):
  - `useUser` → `{ isLoaded, isSignedIn, user }` (configurable per test).
  - `useClerk` → `{ openSignIn: vi.fn(), signOut: vi.fn() }`.
  - The signed-in/signed-out branching is driven by the mocked `isSignedIn`.
- Wrap renders in a `MemoryRouter` helper with `initialEntries`.
- MSW is not needed for this feature (no API calls); don't add handlers.

**Out of scope**

- The account sheet the avatar opens: T5. Here the avatar only fires `onAvatarClick`.

**Done when**

- The `AuthSlot` tests pass: clicking `Log in` calls mocked `openSignIn`; clicking the avatar calls `onAvatarClick`.
- The `TopBar` tests for both auth states pass.

**Debrief**

The installed package is `@clerk/react`, which has no `<SignedIn>`/`<SignedOut>` — shipped code branches on `useUser()`'s `isLoaded`/`isSignedIn` directly, and the mock targets `@clerk/react` (ADR 007).

### T5 — AccountSheet

**Status**

- [x]

**Goal**

The account sheet is wired to the avatar, with `Log out` through `signOut`.

**Dependencies**

- T4

**Files**

- `frontend/src/components/shell/AccountSheet.tsx` (new)
- `frontend/src/components/shell/AccountSheet.test.tsx` (new)
- `frontend/src/components/shell/AppShell.tsx`

**Details**

The same bottom sheet is used everywhere, desktop included, for now.

Account sheet:

- A modal **bottom sheet** sliding up from the bottom, drag-handle pill at top, dim scrim behind. Closes on scrim tap, `Esc`, or after `Log out`. Focus trapped while open.
- Content, top → bottom:
  1. **Profile row:** avatar (larger), username/display name, email. Source: Clerk `user.username ?? user.fullName`, `user.primaryEmailAddress.emailAddress`.
  2. Divider.
  3. **Log out**: calls `signOut()` from `useClerk()`, then closes the sheet and routes to `/`.
- **Nothing else.** No Achievements / Settings / Light mode / Privacy / Help rows. Leave a clearly delimited slot in the JSX (a commented block or an empty `children` region) so rows can be added later without restructuring.
- A drag-to-dismiss gesture is **not** required; the handle is visual only.

`components/shell/AccountSheet.tsx`. Props: `open: boolean`, `onClose(): void`. Bottom sheet + scrim, profile row from Clerk `useUser`, `Log out` → `signOut()` then `onClose()` then navigate `/`. Test: renders name + email from the mocked user; `Log out` calls mocked `signOut` and `onClose`.

Only that one action row, with a delimited slot for future rows; drag handle visual only.

**Out of scope**

- Any additional sheet rows.
- Drag-to-dismiss.

**Done when**

- The `AccountSheet` tests pass: renders name + email from the mocked user; `Log out` calls mocked `signOut` and `onClose`.
- The `AppShell` test that drawer and sheet are never open simultaneously passes.

**Debrief**

None.

### T6 — Acceptance pass

**Status**

- [x]

**Goal**

Every acceptance criterion is verified and accessibility is swept.

**Dependencies**

- T3
- T4
- T5

**Files**

- Test files across `frontend/src/`; no new components.

**Details**

None.

**Out of scope**

- New features.
- Visual polish.

**Done when**

- Top bar: a fixed header with hamburger, logo, Create, auth slot; search row beneath.
- Top bar: Logo links to `/` and does nothing else.
- Top bar: Create is clickable and does nothing.
- Top bar: no horizontal layout shift when the auth slot changes state.
- Search: the input accepts text; the value persists while typing.
- Search: Enter does not navigate, submit, or render any results.
- Sidebar: the hamburger opens and closes the drawer; `aria-expanded` correct.
- Sidebar: exactly four items: Home, Your library, Practice, Notifications, in that order.
- Sidebar: an item click navigates to its route and closes the drawer; the active item is visibly highlighted.
- Sidebar: scrim tap and Esc close; focus returns to the hamburger; body doesn't scroll while open.
- Auth: signed out, `Log in` opens Clerk's sign-in modal (Google login works end-to-end).
- Auth: signed in, the avatar shows Clerk `imageUrl`; tapping it opens the account sheet (no navigation).
- Auth: while Clerk is loading, a same-size placeholder occupies the slot.
- Account sheet: shows avatar, username/display name, email.
- Account sheet: only one action row, `Log out`.
- Account sheet: `Log out` signs out, closes the sheet, lands on `/`, and the top bar then shows `Log in`.
- Account sheet: scrim tap and Esc close.

**Debrief**

Every criterion above was either covered by an automated Vitest+RTL test in this pass, or manually confirmed by the user in a real browser (Google sign-in end-to-end; the top bar flipping back to `Log in` after Log out — both are real-Clerk-reactivity behaviour a mock can't exercise). Every criterion was checked except "No horizontal layout shift when auth slot changes state", left unchecked.
