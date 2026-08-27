# 002 — Frontend rebuild: app shell

Covers the mobile-first app shell: top bar, sidebar drawer, login, account sheet. Visual/behavioural reference is Quizlet's mobile web UI (see `reference/` screenshots if present, otherwise the descriptions in Contracts are authoritative). Depends on: task file 001 (schema rewrite) complete through T9's contract regeneration.

Branch: `rewrite/frontend-shell`, merged via PR #11. **Status: every task below is executed** (commits P0 through P5, plus a post-manual-testing bugfix commit `bde01a4`). Two corrections surfaced during execution; see the ADRs section and the Notes on P2/P3. This file is the pre-workflow decompose document reformatted into the standard task-file structure (2026-08-25); content is unchanged, only presentation. The original wording is in git history as `docs/plans/002-frontend-rebuild-app-shell.md`.

Execution protocol (as run): one PR per task, each independently reviewable and mergeable, in dependency order.

## Superseded since (sync 2026-08-27)

Later work changed what parts of this file describe; contracts and checked boxes are left as written, with current truth here:

- **§1.1's Create no-op (and P5's "Create is clickable and does nothing" box)**: superseded by task 003 Phase 2 — Create opens `CreateSheet` (`AppShell.tsx`) and its `TODO(defer:nav-targets)` tag is gone. The checked box records what P5 verified at the time.
- **§2's provider nesting shipped inverted**: `main.tsx` has `QueryClientProvider` outermost, then `ClerkProvider`, then the router. Neither depends on the other; the diagram's order was never load-bearing.
- **§2's colour-token list has grown**: `index.css` also defines `--color-text-secondary`, `--color-danger`, `--color-danger-contrast`, with more arriving with task 006.
- **§3.8's `PracticePage.tsx`**: replaced by `PracticeOverviewPage.tsx` in task 004; `/practice` routes there (`App.tsx`). The other three placeholder pages kept their names.

## ADRs

Recorded post-execution by `12a9aa2` ("record app-shell rebuild decisions in ADRs, AGENTS.md, and plan 002"):

- **ADR 016 — Radix Dialog for modal overlays.** §3.9 offered a headless primitive as optional; `@radix-ui/react-dialog` was adopted for both `SideDrawer` and `AccountSheet`. The ADR records why, and a real gotcha it caused: the visible hamburger silently stopped closing the drawer on a second click, because neither trigger is a `Dialog.Trigger` descendant — fixed in `bde01a4`.
- **ADR 017 — React Testing Library with a per-file jsdom environment** (the test approach this rebuild established).
- **ADR 007 (amended) — the actual installed Clerk package is `@clerk/react`**, not `@clerk/clerk-react` as §1.2, §3.3, task P3, and §7 originally assumed. `@clerk/react` has neither `<SignedIn>` nor `<SignedOut>` — the shipped `AuthSlot.tsx` branches on `useUser()`'s `isLoaded`/`isSignedIn` fields directly instead, and `test/mocks/clerk.ts` mocks `@clerk/react`'s `useUser`/`useClerk`.
- ADRs 005 (Tailwind) and 006 (openapi-fetch client) received minor amendments in the same commit.

## Minor decisions

- **This is a rebuild, not a refactor.** The existing frontend is torn down (P0). Only the items in P0's keep-list survive; nothing else is preserved or adapted. After P0, there is exactly one router and one Clerk provider, both created fresh.
- **Mobile-first.** Design for ~360–430px viewport. Desktop only needs to _not be broken_ — no desktop-specific layout work in this phase of the rebuild.
- **Skeleton over polish.** Every deferred item gets a clearly marked `// TODO(defer:<tag>)` so it can be grepped later. Tags: `colors`, `search`, `nav-targets`, `logo`.
- **No new heavy deps without stating why.** Prefer: React Router (if already present), Clerk React SDK, Tailwind v4, `lucide-react` for icons (acceptable to add if not present). A headless dialog/sheet primitive is acceptable if it materially reduces a11y work — state the choice in the PR description. (Radix Dialog was chosen; ADR 016.)
- **Tests accompany components.** Each component in §3 ships with a Vitest + RTL test covering its acceptance criteria. Clerk is mocked at the module boundary (§7).
- **Login UI is Clerk's.** No custom login form. Clerk's modal sign-in (`openSignIn()` from `useClerk()`, or `<SignInButton mode="modal">`). Quizlet's login sheet is the _vibe_, but Clerk's component is the implementation. Google is already configured in Clerk for Flashy.
- **State ownership:** `AppShell` holds `isDrawerOpen` and `isAccountSheetOpen` (two booleans, `useState`). No global store. Open/close callbacks passed down as props. If prop drilling gets past two levels, introduce a tiny `AppShellContext` — not before.
- **Styling:** Tailwind v4 utilities. All colours go through a small set of CSS custom properties defined in one place. Values are **temporary** and may be ugly. `// TODO(defer:colors)` at the definition site only — not on every usage.
- Open questions, defaults applied (none were overridden):
  1. **Desktop behaviour of the account sheet** — Quizlet uses a dropdown on desktop. Default: same bottom sheet everywhere for now.
  2. **Sidebar nav items** — the brief said the logo is "dumb" but nav items should have "the skeleton there." Default: nav items navigate to placeholder pages; logo is a plain link to `/`.
  3. **Drawer header** — repeat hamburger+logo inside the drawer (Quizlet style) vs. keep the real top bar visible above the overlay. Default: keep real top bar visible; hamburger becomes the close control.
  4. **Search placeholder text** — Quizlet's `Search for practice tests` vs. something Flashy-specific. Default: `Search`.
  5. **Keep-list edge cases** — existing TanStack Query hooks and MSW handlers are kept only if they're UI-agnostic (P0). Anything borderline: listed in the P0 confirmation step for the reviewer to decide.

## Contracts

### 1. Target behaviour (source of truth)

#### 1.1 Top bar (all states)

Layout, left → right, single row, fixed to top, full width:

| Slot | Element | Behaviour |
| --- | --- | --- |
| 1 | **Hamburger** (circular outline button) | Toggles the sidebar drawer (§1.3). `aria-label="Open menu"` / `"Close menu"`, `aria-expanded` reflects state. |
| 2 | **Logo** | Placeholder mark. Renders as a link to `/`. Nothing else. `// TODO(defer:logo)` |
| 3 | _(spacer)_ |  |
| 4 | **Create** (`+ Create`) | Visible, focusable, clickable, does nothing. `// TODO(defer:nav-targets)` |
| 5 | **Auth slot** | Signed out → `Log in` pill button (primary). Signed in → circular profile avatar button. See §1.2. |

Second row (below the bar, part of the same header region):

| Element | Behaviour |
| --- | --- |
| **Search input** | Real `<input type="search">` with leading search icon, placeholder text configurable via prop (default per Minor decisions: `Search`). Fully typeable (controlled state). **Enter does nothing** (`preventDefault`, no navigation, no submit). **No results dropdown.** `// TODO(defer:search)` |

Notes:

- Signed-in reference (Quizlet Image 4) shows the hamburger, logo, a round `+` icon button, and the avatar. Keep `Create` as text on mobile for now for parity with the signed-out bar; the icon-only variant is a later tweak.
- The header must not shift layout when the auth slot swaps between `Log in` and avatar — reserve a fixed-width slot.

#### 1.2 Auth

- Login UI is Clerk's modal sign-in (see Minor decisions).
- **Signed-in avatar** comes from Clerk: `useUser().user?.imageUrl`. Fallback: initials from `user.firstName`/`user.lastName`/`primaryEmailAddress`, or a neutral placeholder.
- Tapping the avatar opens the **Account Sheet** (§1.4). It does _not_ navigate.
- Branch the auth slot on the signed-in state, and handle the `!isLoaded` state with a same-size placeholder circle so the bar doesn't jump. (As written this named `<SignedIn>`/`<SignedOut>`; the installed `@clerk/react` has neither, so the shipped code branches on `useUser()`'s fields directly — ADR 007.)

#### 1.3 Sidebar (drawer)

- Opens from the **left** as an overlay drawer over the page, with a dim scrim. Tapping scrim or pressing `Esc` closes it. Focus is trapped inside while open; focus returns to the hamburger on close. Body scroll locked while open.
- Drawer header: per Minor decisions default, the real top bar stays visible above the drawer; the hamburger becomes the close control.
- Items (exactly these, in this order, each with an icon):
  1. **Home** → `/`
  2. **Your library** → `/library`
  3. **Practice** → `/practice`
  4. **Notifications** → `/notifications`
- Each item is a router link to a **placeholder page** (§3.8). Selecting an item closes the drawer. Active item gets the highlighted pill treatment (as in the reference, "Home" is highlighted).
- Drawer is available in both signed-out and signed-in states (Quizlet shows the hamburger before login too).
- `// TODO(defer:nav-targets)` on the placeholder pages.

#### 1.4 Account Sheet (bottom sheet)

- Modal **bottom sheet** sliding up from the bottom, drag-handle pill at top, dim scrim behind. Closes on scrim tap, `Esc`, or after `Log out`. Focus trapped while open.
- Content, top → bottom:
  1. **Profile row:** avatar (larger), username/display name, email. Source: Clerk `user.username ?? user.fullName`, `user.primaryEmailAddress.emailAddress`.
  2. Divider.
  3. **Log out** — calls `signOut()` from `useClerk()`, then closes the sheet and routes to `/`.
- **Nothing else.** No Achievements / Settings / Light mode / Privacy / Help rows. Leave a clearly delimited slot in the JSX (a commented block or an empty `children` region) so rows can be added later without restructuring.
- Drag-to-dismiss gesture is **not** required in this phase; the handle is visual only.

### 2. Architecture

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

- **Routing:** one layout route (`AppShell`) with child routes for `/`, `/library`, `/practice`, `/notifications`. Unknown routes → existing 404 behaviour or a minimal placeholder.
- **Colour tokens** (one definition site): `--color-surface`, `--color-surface-elevated`, `--color-text`, `--color-text-muted`, `--color-primary`, `--color-primary-contrast`, `--color-scrim`.

### 3. Component inventory

Each entry: path, props, responsibilities, test file. Adjust paths to match the repo's existing conventions.

#### 3.1 `components/shell/AppShell.tsx`

- Props: none (layout route).
- Owns drawer + sheet state; renders `TopBar`, `SearchBar`, `SideDrawer`, `AccountSheet`, `<Outlet/>`.
- Test: `AppShell.test.tsx` — hamburger toggles drawer; avatar opens sheet; drawer and sheet are never open simultaneously.

#### 3.2 `components/shell/TopBar.tsx`

- Props: `onMenuClick(): void`, `isMenuOpen: boolean`, `onAvatarClick(): void`.
- Renders hamburger, `Logo`, `Create`, auth slot (`AuthSlot`).
- Test: signed-out renders `Log in`; signed-in renders avatar `img` with `alt` containing user name; layout slot widths stable across states (assert on a fixed-width wrapper class or style).

#### 3.3 `components/shell/AuthSlot.tsx`

- Props: `onAvatarClick(): void`.
- Signed out → `LoginButton` (calls Clerk `openSignIn`). Signed in → `AvatarButton`. `!isLoaded` → placeholder circle. (Branching per §1.2's `@clerk/react` note.)
- Test: clicking `Log in` calls mocked `openSignIn`; clicking avatar calls `onAvatarClick`.

#### 3.4 `components/shell/Logo.tsx`

- Props: `className?`.
- `<Link to="/">` wrapping a placeholder SVG/text mark ("F" in a rounded square is fine). `// TODO(defer:logo)`
- Test: renders link with `href="/"`.

#### 3.5 `components/shell/SearchBar.tsx`

- Props: `placeholder?: string`.
- Controlled input, search icon, `onKeyDown` Enter → `preventDefault()`. No submit handler, no results UI. `// TODO(defer:search)`
- Test: typing updates value; pressing Enter does not navigate (assert `location` unchanged) and does not throw.

#### 3.6 `components/shell/SideDrawer.tsx`

- Props: `open: boolean`, `onClose(): void`.
- Left overlay drawer + scrim, nav list from a `NAV_ITEMS` constant (`{ label, to, icon }[]`), active-state styling via router's `NavLink`. Closes on item select / scrim / Esc. Focus trap + body scroll lock.
- Test: renders 4 items in order; clicking item navigates and calls `onClose`; Esc calls `onClose`; focus returns to trigger.

#### 3.7 `components/shell/AccountSheet.tsx`

- Props: `open: boolean`, `onClose(): void`.
- Bottom sheet + scrim, profile row from Clerk `useUser`, `Log out` → `signOut()` then `onClose()` then navigate `/`.
- Test: renders name + email from mocked user; `Log out` calls mocked `signOut` and `onClose`.

#### 3.8 Placeholder pages — `pages/{Home,Library,Practice,Notifications}Page.tsx`

- Each renders an `<h1>` with the page name and a one-line "Coming soon" body. `// TODO(defer:nav-targets)`
- Test: smoke render only.

#### 3.9 (Optional) `components/ui/Sheet.tsx` / `components/ui/Drawer.tsx`

- If a headless primitive is adopted, wrap it once here so `SideDrawer` and `AccountSheet` share scrim/focus/scroll-lock behaviour. If hand-rolled, put the shared scrim + focus-trap + scroll-lock logic in a `useModalBehaviour(open, onClose)` hook instead. (Radix Dialog was adopted — ADR 016.)

### 4. Accessibility baseline (non-negotiable even in skeleton)

- Hamburger: `<button aria-label aria-expanded aria-controls="side-drawer">`.
- Drawer: `role="dialog" aria-modal="true" aria-label="Main menu"`.
- Account sheet: `role="dialog" aria-modal="true" aria-labelledby=<profile name id>`.
- All icon-only buttons have `aria-label`.
- Tap targets ≥ 44×44px.
- `Esc` closes any open overlay; focus returns to the invoking control.

### 7. Testing notes

- Mock the Clerk package at module level in a shared `test/mocks/clerk.ts` (mocks `@clerk/react`'s exports — see ADR 007):
  - `useUser` → `{ isLoaded, isSignedIn, user }` (configurable per test).
  - `useClerk` → `{ openSignIn: vi.fn(), signOut: vi.fn() }`.
  - The signed-in/signed-out branching is driven by the mocked `isSignedIn`.
- Wrap renders in a `MemoryRouter` helper with `initialEntries`.
- MSW is not needed for this feature (no API calls); don't add handlers.

## Tasks

### P0 — Teardown

- [x] **Goal:** tear the existing frontend down to a bootable empty shell, keeping only the listed non-UI infrastructure.
- **Files:** delete everything under `src/` except the keep-list: all pages, components (including `EntityCard`), layouts, existing router config, existing `App.tsx`/`main.tsx` wiring, styles beyond the Tailwind entry, assets, and their tests.
- **Details:** must be its own PR, reviewed before anything else. **Keep** (move to a stable location if needed, do not modify contents):
  - Generated OpenAPI types (`src/api/schema.d.ts` or equivalent) and the script that regenerates them.
  - The `openapi-fetch` client instance and the Clerk-token-attaching middleware/fetch wrapper.
  - Any TanStack Query hooks that are thin wrappers over those API calls (one hook per endpoint, no UI logic). If a hook contains UI state or component-specific shaping, it goes.
  - Project config that isn't UI: `package.json`, lockfile, `vite.config.ts`, `tsconfig*.json`, Tailwind v4 entry, Vitest config, MSW setup file (`test/setup.ts`) and the `mocks/server.ts` scaffold, `vercel.json`/env examples, `.gitignore`, ADRs.
  - Existing MSW handlers **only** if they mirror backend endpoints generically; delete any that exist to serve a specific deleted component's test.

  Before running the teardown, print the proposed keep/delete lists and **wait for confirmation** (borderline items decided here, per Minor decisions).

- **Out of scope:** building anything new; modifying the contents of kept files.
- **Done when:** app boots to a blank `<div id="root">` with `ClerkProvider` + `QueryClientProvider` + an empty router, type-checks, and `vitest` runs green (zero or near-zero tests). Commit message lists every kept file explicitly.
- **Commit:** `5f604fc` — `frontend: P0 teardown for app shell rebuild`
- Notes:

### P1 — Shell skeleton (depends on P0)

- [x] **Goal:** stand up the `AppShell` layout route, routing, placeholder pages, top bar skeleton, search bar, and colour tokens — no Clerk, no drawer behaviour yet.
- **Files:** §3.1 `AppShell.tsx`, §3.2 `TopBar.tsx`, §3.4 `Logo.tsx`, §3.5 `SearchBar.tsx`, §3.8 placeholder pages, the colour tokens file (§2), router wiring, and each component's test file.
- **Details:** `AppShell` layout route + 4 placeholder pages + routing per §2. Top bar per §1.1 with hamburger (no-op for now), `Logo`, `Create` (no-op), and a static `Log in` button (no Clerk yet). `SearchBar` typeable per §1.1/§3.5. Colour tokens file with the §2 token names, `// TODO(defer:colors)` at the definition site.
- **Out of scope:** drawer behaviour (P2); any Clerk wiring (P3); the account sheet (P4).
- **Done when:** the §3 test files for these components pass; routes `/`, `/library`, `/practice`, `/notifications` render their placeholder pages; Logo links to `/` and does nothing else; Create is clickable and does nothing; the search input accepts text and Enter does not navigate, submit, or render results.
- **Commit:** `1d80a4e` — `frontend: P1 — AppShell layout route, top bar skeleton, colour tokens`
- Notes:

### P2 — SideDrawer (depends on P1)

- [x] **Goal:** wire the sidebar drawer to the hamburger with full focus/scroll/Esc behaviour.
- **Files:** §3.6 `SideDrawer.tsx` + test; §3.9 shared primitive wrapper if adopted; `AppShell`/`TopBar` wiring.
- **Details:** per §1.3 and §3.6. Exactly four nav items, in order, from `NAV_ITEMS`; scrim + Esc close; focus trap; body scroll lock; focus returns to the hamburger; `aria-expanded` correct (§4).
- **Out of scope:** auth (P3); account sheet (P4).
- **Done when:** the §3.6 tests pass — renders 4 items in order; clicking an item navigates and closes; Esc closes; focus returns to the trigger; body doesn't scroll while open.
- **Commit:** `191982b` — `frontend: P2 — SideDrawer wired to hamburger`
- Notes: `@radix-ui/react-dialog` adopted here per ADR 016. Post-manual-testing bugfix `bde01a4`: the drawer clipped "Home" and the hamburger silently stopped closing the drawer on a second click (neither trigger is a `Dialog.Trigger` descendant).

### P3 — AuthSlot (depends on P1)

- [x] **Goal:** wire the auth slot to Clerk: modal sign-in, signed-in avatar, loading placeholder.
- **Files:** §3.3 `AuthSlot.tsx` + test; `test/mocks/clerk.ts` (§7).
- **Details:** per §1.2 and §3.3 — `openSignIn` on `Log in`, avatar from `user.imageUrl` with the stated fallbacks, `!isLoaded` → same-size placeholder circle so the bar doesn't jump.
- **Out of scope:** the account sheet the avatar opens (P4) — here the avatar only fires `onAvatarClick`.
- **Done when:** the §3.3 tests pass — clicking `Log in` calls mocked `openSignIn`; clicking the avatar calls `onAvatarClick`; the §3.2 TopBar tests for both auth states pass.
- **Commit:** `4113ebf` — `frontend: P3 — AuthSlot wired to Clerk`
- Notes: the installed package is `@clerk/react`, which has no `<SignedIn>`/`<SignedOut>` — shipped code branches on `useUser()`'s `isLoaded`/`isSignedIn` directly, and the mock targets `@clerk/react` (ADR 007).

### P4 — AccountSheet (depends on P3)

- [x] **Goal:** wire the account sheet to the avatar, with `Log out` via `signOut`.
- **Files:** §3.7 `AccountSheet.tsx` + test; `AppShell` wiring.
- **Details:** per §1.4 and §3.7 — profile row from Clerk `useUser`; `Log out` → `signOut()` then `onClose()` then navigate `/`; only that one action row, with a delimited slot for future rows; drag handle visual only.
- **Out of scope:** any additional sheet rows; drag-to-dismiss.
- **Done when:** the §3.7 tests pass — renders name + email from the mocked user; `Log out` calls mocked `signOut` and `onClose`; the §3.1 test that drawer and sheet are never open simultaneously passes.
- **Commit:** `49f7604` — `frontend: P4 — AccountSheet wired to the avatar`
- Notes:

### P5 — Acceptance pass (depends on P2–P4)

- [x] **Goal:** verify every acceptance criterion, sweep accessibility (§4), and audit that every deferred item carries its `TODO(defer:*)` tag.
- **Files:** test files across `src/`; no new components.
- **Details:** every box below was either covered by an automated Vitest+RTL test in this pass, or manually confirmed by the user in a real browser (Google sign-in end-to-end; the top bar flipping back to `Log in` after Log out — both are real-Clerk-reactivity behaviour a mock can't exercise). The one exception is noted inline.
- **Out of scope:** new features; visual polish.
- **Done when:**

  **Top bar**
  - [x] Fixed header with hamburger, logo, Create, auth slot; search row beneath.
  - [x] Logo links to `/` and does nothing else.
  - [x] Create is clickable and does nothing.
  - [ ] No horizontal layout shift when auth slot changes state. (structurally guaranteed by a static-width wrapper div, but never asserted by a test)

  **Search**
  - [x] Input accepts text; value persists while typing.
  - [x] Enter does not navigate, submit, or render any results.

  **Sidebar**
  - [x] Hamburger opens/closes drawer; `aria-expanded` correct.
  - [x] Exactly four items: Home, Your library, Practice, Notifications — in that order.
  - [x] Item click navigates to its route and closes drawer; active item visibly highlighted.
  - [x] Scrim tap / Esc closes; focus returns to hamburger; body doesn't scroll while open.

  **Auth**
  - [x] Signed out: `Log in` opens Clerk's sign-in modal (Google login works end-to-end).
  - [x] Signed in: avatar shows Clerk `imageUrl`; tapping it opens the account sheet (no navigation).
  - [x] While Clerk is loading, a same-size placeholder occupies the slot.

  **Account sheet**
  - [x] Shows avatar, username/display name, email.
  - [x] Only one action row: `Log out`.
  - [x] `Log out` signs out, closes sheet, lands on `/`, and the top bar now shows `Log in`.
  - [x] Scrim tap / Esc closes.

  **Deferral hygiene**
  - [x] `grep -r "TODO(defer:" src/` returns entries for `colors`, `search`, `nav-targets`, `logo` and nothing untagged.

- **Commit:** `b3b1c84` — `frontend: P5 — a11y sweep and test-coverage pass`
- Notes:

## Deferred — how to resume later

| Tag | What's parked | Resume by |
| --- | --- | --- |
| `colors` | Real palette, dark/light mode | Replace values in the tokens file; nothing else should change. |
| `search` | Debounced query, results dropdown, Enter → results page, recent searches | Add `onSubmit`/`onChange` props to `SearchBar`; build `SearchResults` as a sibling rendered by `AppShell`. |
| `nav-targets` | Real Home / Library / Practice / Notifications pages; Create flow | Replace placeholder page bodies; wire `Create` to a route or sheet. |
| `logo` | Final mark | Swap the SVG in `Logo.tsx`. |
