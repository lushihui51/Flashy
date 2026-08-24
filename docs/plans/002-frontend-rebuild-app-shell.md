# Flashy Frontend Decompose — App Shell (Top Bar, Sidebar, Login, Account Sheet)

**Status:** Executed — see `rewrite/frontend-shell` (commits P0 through P5, plus a post-manual-testing bugfix commit). Two corrections surfaced during execution; see "Post-execution notes" below.
**Scope:** Mobile-first app shell. Visual/behavioural reference is Quizlet's mobile web UI (see `reference/` screenshots if present, otherwise the descriptions below are authoritative).
**Out of scope (deferred, see §8):** colour system, search behaviour, destination content for nav items, final logo.

**Post-execution notes (2026-08-24):**

- **Clerk package.** §1.2, §3.3, the P3 row of §5, and §7 all assume `@clerk/clerk-react` and its `<SignedIn>`/`<SignedOut>` components. The actual installed package is `@clerk/react` (`package.json`), which has neither component — the shipped `AuthSlot.tsx` branches on `useUser()`'s `isLoaded`/`isSignedIn` fields directly instead, and `test/mocks/clerk.ts` mocks `@clerk/react`'s `useUser`/`useClerk`, not `@clerk/clerk-react`. See ADR 007.
- **Radix Dialog.** §3.9 offered a headless primitive as optional; `@radix-ui/react-dialog` was adopted for both `SideDrawer` and `AccountSheet`. See ADR 016 for why, and for a real gotcha it caused (the visible hamburger silently stopped closing the drawer on a second click, because neither trigger is a `Dialog.Trigger` descendant — fixed, see the bugfix commit on `rewrite/frontend-shell`).

Acceptance criteria (§6): every box below was either covered by an automated Vitest+RTL test in this session, or manually confirmed by the user in a real browser (Google sign-in end-to-end; the top bar flipping back to `Log in` after Log out — both are real-Clerk-reactivity behavior a mock can't exercise). The one exception is noted inline.

---

## 0. Ground rules for the executing agent

1. **This is a rebuild, not a refactor.** The existing frontend is being torn down (see P0 in §5). Only the items in the §5 keep-list survive. Do not try to preserve or adapt anything else. After P0, there is exactly one router and one Clerk provider, both created fresh.
2. **Mobile-first.** Design for ~360–430px viewport. Desktop only needs to _not be broken_ — no desktop-specific layout work in this phase.
3. **Skeleton over polish.** Every deferred item gets a clearly marked `// TODO(defer:<tag>)` so it can be grepped later. Tags: `colors`, `search`, `nav-targets`, `logo`.
4. **No new heavy deps** without stating why. Prefer: React Router (if already present), Clerk React SDK, Tailwind v4, `lucide-react` for icons (if not already present, it's acceptable to add). A headless dialog/sheet primitive (e.g. Radix `Dialog`) is acceptable if it materially reduces a11y work — state the choice in the PR description.
5. **Tests accompany components.** Each component in §3 ships with a Vitest + RTL test covering the acceptance criteria in §6. Clerk is mocked at the module boundary (see §7).
6. **One PR per phase** in §5, each independently reviewable and mergeable.

---

## 1. Target behaviour (source of truth)

### 1.1 Top bar (all states)

Layout, left → right, single row, fixed to top, full width:

| Slot | Element                                 | Behaviour                                                                                                     |
| ---- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1    | **Hamburger** (circular outline button) | Toggles the sidebar drawer (§1.3). `aria-label="Open menu"` / `"Close menu"`, `aria-expanded` reflects state. |
| 2    | **Logo**                                | Placeholder mark. Renders as a link to `/`. Nothing else. `// TODO(defer:logo)`                               |
| 3    | _(spacer)_                              |                                                                                                               |
| 4    | **Create** (`+ Create`)                 | Visible, focusable, clickable, does nothing. `// TODO(defer:nav-targets)`                                     |
| 5    | **Auth slot**                           | Signed out → `Log in` pill button (primary). Signed in → circular profile avatar button. See §1.2.            |

Second row (below the bar, part of the same header region):

| Element          | Behaviour                                                                                                                                                                                                                                                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Search input** | Real `<input type="search">` with leading search icon, placeholder `Search for practice tests` (keep placeholder text configurable via prop; default can be Flashy-appropriate, e.g. `Search`). Fully typeable (controlled state). **Enter does nothing** (`preventDefault`, no navigation, no submit). **No results dropdown.** `// TODO(defer:search)` |

Notes:

- Signed-in reference (Quizlet Image 4) shows the hamburger, logo, a round `+` icon button, and the avatar. Keep `Create` as text on mobile for now for parity with the signed-out bar; the icon-only variant is a later tweak.
- The header must not shift layout when the auth slot swaps between `Log in` and avatar — reserve a fixed-width slot.

### 1.2 Auth

- **Login UI is Clerk's.** Do not build a custom login form. Use Clerk's modal sign-in (`openSignIn()` from `useClerk()`, or `<SignInButton mode="modal">`). Quizlet's login sheet (Sign up / Log in tabs, Google/Facebook/Apple/WhatsApp, or email) is the _vibe_, but Clerk's component is the implementation. Google is already configured in Clerk for Flashy.
- **Signed-in avatar** comes from Clerk: `useUser().user?.imageUrl`. Fallback: initials from `user.firstName`/`user.lastName`/`primaryEmailAddress`, or a neutral placeholder.
- Tapping the avatar opens the **Account Sheet** (§1.4). It does _not_ navigate.
- Use `<SignedIn>` / `<SignedOut>` from Clerk to branch the auth slot. Handle the `!isLoaded` state with a same-size placeholder circle so the bar doesn't jump.

### 1.3 Sidebar (drawer)

- Opens from the **left** as an overlay drawer over the page, with a dim scrim. Tapping scrim or pressing `Esc` closes it. Focus is trapped inside while open; focus returns to the hamburger on close. Body scroll locked while open.
- Drawer header repeats the hamburger (now acting as close) and the logo, matching Quizlet Image 4 — acceptable to simply keep the real top bar visible above the drawer instead, if that's simpler. Pick one and note it.
- Items (exactly these, in this order, each with an icon):
  1. **Home** → `/`
  2. **Your library** → `/library`
  3. **Practice** → `/practice`
  4. **Notifications** → `/notifications`
- Each item is a router link to a **placeholder page** (see §3.4). Selecting an item closes the drawer. Active item gets the highlighted pill treatment (as in the reference, "Home" is highlighted).
- Drawer is available in both signed-out and signed-in states (Quizlet shows the hamburger before login too).
- `// TODO(defer:nav-targets)` on the placeholder pages.

### 1.4 Account Sheet (bottom sheet)

- Modal **bottom sheet** sliding up from the bottom, drag-handle pill at top, dim scrim behind. Closes on scrim tap, `Esc`, or after `Log out`. Focus trapped while open.
- Content, top → bottom:
  1. **Profile row:** avatar (larger), username/display name, email. Source: Clerk `user.username ?? user.fullName`, `user.primaryEmailAddress.emailAddress`.
  2. Divider.
  3. **Log out** — calls `signOut()` from `useClerk()`, then closes the sheet and routes to `/`.
- **Nothing else.** No Achievements / Settings / Light mode / Privacy / Help rows. Leave a clearly delimited slot in the JSX (a commented block or an empty `children` region) so rows can be added later without restructuring.
- Drag-to-dismiss gesture is **not** required in this phase; the handle is visual only.

---

## 2. Architecture

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

- **State ownership:** `AppShell` holds `isDrawerOpen` and `isAccountSheetOpen` (two booleans, `useState`). No global store. Pass open/close callbacks down as props. If prop drilling gets past two levels, introduce a tiny `AppShellContext` — not before.
- **Routing:** one layout route (`AppShell`) with child routes for `/`, `/library`, `/practice`, `/notifications`. Unknown routes → existing 404 behaviour or a minimal placeholder.
- **Styling:** Tailwind v4 utilities. All colours go through a small set of CSS custom properties defined in one place (e.g. `--color-surface`, `--color-surface-elevated`, `--color-text`, `--color-text-muted`, `--color-primary`, `--color-primary-contrast`, `--color-scrim`). Values are **temporary** and may be ugly. `// TODO(defer:colors)` at the definition site only — not on every usage.

---

## 3. Component inventory

Each entry: path, props, responsibilities, test file. Adjust paths to match the repo's existing conventions.

### 3.1 `components/shell/AppShell.tsx`

- Props: none (layout route).
- Owns drawer + sheet state; renders `TopBar`, `SearchBar`, `SideDrawer`, `AccountSheet`, `<Outlet/>`.
- Test: `AppShell.test.tsx` — hamburger toggles drawer; avatar opens sheet; drawer and sheet are never open simultaneously.

### 3.2 `components/shell/TopBar.tsx`

- Props: `onMenuClick(): void`, `isMenuOpen: boolean`, `onAvatarClick(): void`.
- Renders hamburger, `Logo`, `Create`, auth slot (`AuthSlot`).
- Test: signed-out renders `Log in`; signed-in renders avatar `img` with `alt` containing user name; layout slot widths stable across states (assert on a fixed-width wrapper class or style).

### 3.3 `components/shell/AuthSlot.tsx`

- Props: `onAvatarClick(): void`.
- `<SignedOut>` → `LoginButton` (calls Clerk `openSignIn`). `<SignedIn>` → `AvatarButton`. `!isLoaded` → placeholder circle.
- Test: clicking `Log in` calls mocked `openSignIn`; clicking avatar calls `onAvatarClick`.

### 3.4 `components/shell/Logo.tsx`

- Props: `className?`.
- `<Link to="/">` wrapping a placeholder SVG/text mark ("F" in a rounded square is fine). `// TODO(defer:logo)`
- Test: renders link with `href="/"`.

### 3.5 `components/shell/SearchBar.tsx`

- Props: `placeholder?: string`.
- Controlled input, search icon, `onKeyDown` Enter → `preventDefault()`. No submit handler, no results UI. `// TODO(defer:search)`
- Test: typing updates value; pressing Enter does not navigate (assert `location` unchanged) and does not throw.

### 3.6 `components/shell/SideDrawer.tsx`

- Props: `open: boolean`, `onClose(): void`.
- Left overlay drawer + scrim, nav list from a `NAV_ITEMS` constant (`{ label, to, icon }[]`), active-state styling via router's `NavLink`. Closes on item select / scrim / Esc. Focus trap + body scroll lock.
- Test: renders 4 items in order; clicking item navigates and calls `onClose`; Esc calls `onClose`; focus returns to trigger.

### 3.7 `components/shell/AccountSheet.tsx`

- Props: `open: boolean`, `onClose(): void`.
- Bottom sheet + scrim, profile row from Clerk `useUser`, `Log out` → `signOut()` then `onClose()` then navigate `/`.
- Test: renders name + email from mocked user; `Log out` calls mocked `signOut` and `onClose`.

### 3.8 Placeholder pages — `pages/{Home,Library,Practice,Notifications}Page.tsx`

- Each renders an `<h1>` with the page name and a one-line "Coming soon" body. `// TODO(defer:nav-targets)`
- Test: smoke render only.

### 3.9 (Optional) `components/ui/Sheet.tsx` / `components/ui/Drawer.tsx`

- If a headless primitive is adopted, wrap it once here so `SideDrawer` and `AccountSheet` share scrim/focus/scroll-lock behaviour. If hand-rolled, put the shared scrim + focus-trap + scroll-lock logic in a `useModalBehaviour(open, onClose)` hook instead.

---

## 4. Accessibility baseline (non-negotiable even in skeleton)

- Hamburger: `<button aria-label aria-expanded aria-controls="side-drawer">`.
- Drawer: `role="dialog" aria-modal="true" aria-label="Main menu"`.
- Account sheet: `role="dialog" aria-modal="true" aria-labelledby=<profile name id>`.
- All icon-only buttons have `aria-label`.
- Tap targets ≥ 44×44px.
- `Esc` closes any open overlay; focus returns to the invoking control.

---

## 5. Phases (one PR each)

### P0 — Teardown (must be its own PR, reviewed before anything else)

**Keep (move to a stable location if needed, do not modify contents):**

- Generated OpenAPI types (`src/api/schema.d.ts` or equivalent) and the script that regenerates them.
- The `openapi-fetch` client instance and the Clerk-token-attaching middleware/fetch wrapper.
- Any TanStack Query hooks that are thin wrappers over those API calls (one hook per endpoint, no UI logic). If a hook contains UI state or component-specific shaping, it goes.
- Project config that isn't UI: `package.json`, lockfile, `vite.config.ts`, `tsconfig*.json`, Tailwind v4 entry, Vitest config, MSW setup file (`test/setup.ts`) and the `mocks/server.ts` scaffold, `vercel.json`/env examples, `.gitignore`, ADRs.
- Existing MSW handlers **only** if they mirror backend endpoints generically; delete any that exist to serve a specific deleted component's test.

**Delete everything else under `src/`:** all pages, components (including `EntityCard`), layouts, existing router config, existing `App.tsx`/`main.tsx` wiring, styles beyond the Tailwind entry, assets, and their tests.

**Deliverable:** app boots to a blank `<div id="root">` with `ClerkProvider` + `QueryClientProvider` + an empty router, type-checks, and `vitest` runs green (zero or near-zero tests). Commit message lists every kept file explicitly.

Before running P0, the agent must print the proposed keep/delete lists and **wait for confirmation**.

### P1–P5

| #   | Deliverable                                                                                                                                                                                               | Depends on |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| P1  | `AppShell` layout route + 4 placeholder pages + routing. Top bar with hamburger (no-op), `Logo`, `Create` (no-op), and a static `Log in` button (no Clerk yet). `SearchBar` typeable. Colour tokens file. | P0         |
| P2  | `SideDrawer` wired to hamburger, with focus/scroll/Esc behaviour.                                                                                                                                         | P1         |
| P3  | `AuthSlot` wired to Clerk: `openSignIn`, `SignedIn`/`SignedOut`, avatar from `user.imageUrl`, loading placeholder.                                                                                        | P1         |
| P4  | `AccountSheet` wired to avatar, `Log out` via `signOut`.                                                                                                                                                  | P3         |
| P5  | Test pass: all §6 criteria green; a11y sweep (§4); `TODO(defer:*)` audit — every deferred item tagged.                                                                                                    | P2–P4      |

---

## 6. Acceptance criteria

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

---

## 7. Testing notes

- Mock `@clerk/clerk-react` at module level in a shared `test/mocks/clerk.ts`:
  - `useUser` → `{ isLoaded, isSignedIn, user }` (configurable per test).
  - `useClerk` → `{ openSignIn: vi.fn(), signOut: vi.fn() }`.
  - `SignedIn` / `SignedOut` → render children based on the mocked `isSignedIn`.
- Wrap renders in a `MemoryRouter` helper with `initialEntries`.
- MSW is not needed for this phase (no API calls); don't add handlers.

---

## 8. Deferred — how to resume later

| Tag           | What's parked                                                            | Resume by                                                                                                  |
| ------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `colors`      | Real palette, dark/light mode                                            | Replace values in the tokens file; nothing else should change.                                             |
| `search`      | Debounced query, results dropdown, Enter → results page, recent searches | Add `onSubmit`/`onChange` props to `SearchBar`; build `SearchResults` as a sibling rendered by `AppShell`. |
| `nav-targets` | Real Home / Library / Practice / Notifications pages; Create flow        | Replace placeholder page bodies; wire `Create` to a route or sheet.                                        |
| `logo`        | Final mark                                                               | Swap the SVG in `Logo.tsx`.                                                                                |

---

## 9. Open questions (defaults applied unless overridden)

1. **Desktop behaviour of the account sheet** — Quizlet uses a dropdown on desktop. _Default:_ same bottom sheet everywhere for now.
2. **Sidebar nav items: navigate or no-op?** The brief says the logo is "dumb" but nav items should have "the skeleton there." _Default:_ nav items navigate to placeholder pages; logo is a plain link to `/`.
3. **Drawer header** — repeat hamburger+logo inside the drawer (Quizlet style) vs. keep the real top bar visible above the overlay. _Default:_ keep real top bar visible; hamburger becomes the close control.
4. **Search placeholder text** — Quizlet's `Search for practice tests` vs. something Flashy-specific. _Default:_ `Search`.
5. **Keep-list edge cases** — existing TanStack Query hooks and MSW handlers are kept only if they're UI-agnostic (§5 P0). Anything borderline: the agent lists it in the P0 confirmation step and you decide.
