# 047 — A form's way out

Waits for: 046, its three steps in `HomePage`, its three rows in `CreateSheet`, its one list in `LibraryPage`, its one place in `DeckDetailPage`'s breadcrumb, its deck form with no subject in `DeckEditor` and its test, its `CardStandaloneForm` and its test with no subject, `PracticeCreatePage.test.tsx`, and the deck-only filters of `PracticeOverviewPage` and `PracticeCreatePage`, files this cycle shares.

## Goal

Outcome: Every form backs out to the page that opened it, wherever it was opened from, and lands on what it made after Create; once the user has left a form by Cancel, Create or Save, the form is no longer in the browser's history, so the "<" on the page they land on never opens it again.

Scope: The cycle covers `useLeaveForm` under `frontend/src/lib/`, the one way New deck, Edit deck, New card, Edit card and New practice leave by Cancel, Create, Save, Done or Delete; New practice reading `cancelTo` and `returnTo` as every other form does; and every opener of those forms passing its own address as `cancelTo`: Home's steps and its New practice, the top bar's New sheet, Your library's Add deck, a deck's page's Add card, Edit deck and card rows, and the Practice page's Add practice. It leaves out New configuration and Edit configuration, which cycle 049 removes; and every form's look and words, which do not change.

Judgement: The engineer judges on the live server at 390 wide, by the mouse: on the run page, Edit card then Cancel lands on the run page on the same card, and its "<" then lands on the page the run page was reached from, not on Edit card; signed in as a user with no deck, Home's New deck step then Cancel lands on Home; the New sheet opened over a deck's page, New card, then Cancel lands on that deck's page; the Practice page narrowed to a deck, Add practice, then Cancel lands on the Practice page still narrowed; Your library, Add deck, a name and two fields, then Create lands on the new deck's page, and its "<" does not open New deck; New card, its Deck picker's "New deck…", then Create lands back on New card with the new deck chosen; and New deck opened from its address in a fresh tab, then Cancel, lands on Your library.

## Records

- ADR 124: Two URL parameters for a form's return addresses, and one function leaving every form by history
- ADR 099: The router's history index as the test for an earlier page
- ADR 097: One hook for a page's URL search params, that never resets scroll
- PDR 017: A row of the places above a page, led by a way back
- PDR 034: A form about one thing and nothing it holds, landing on the thing it made

## Tasks

### T1 — useLeaveForm and every form leaving through it

**Status**

- [x]

**Goal**

New deck, Edit deck, New card, Edit card and New practice leave by Cancel, Create, Save, Done and Delete only through `useLeaveForm`, so a form left with an earlier page in Flashy's history is gone from the history, and New practice's Cancel and Create read `cancelTo` and `returnTo`.

**Dependencies**

None.

**Files**

- `frontend/src/lib/leaveForm.ts` (new)
- `frontend/src/lib/leaveForm.test.tsx` (new)
- `frontend/src/components/library/DeckEditor.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`
- `frontend/src/components/library/CardStandaloneForm.tsx`
- `frontend/src/components/library/CardStandaloneForm.test.tsx`
- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`

**Details**

ADR 124 and ADR 099:

```ts
/** The way a form leaves for `target`, an app path, with `state` as a one-shot arrival
 * result for the page there. With an earlier page in Flashy's history (`hasEarlierPage()`),
 * it steps back one entry to the form's opener, then replaces that entry with `target` and
 * `state` when the opener's address differs from `target` or `state` is given; otherwise it
 * replaces the form's own entry with `target` and `state`. The promise settles once `target` is current. */
export function useLeaveForm(): (target: string, state?: Record<string, unknown>) => Promise<void>;
```

- The function `useLeaveForm()` returns is ADR 124's `leaveForm(target, state?)`; it comes from a hook because it needs the router's `navigate`.

- `useLeaveForm` must live in `frontend/src/lib/leaveForm.ts` and read the earlier page only through `hasEarlierPage()` in `frontend/src/lib/historyIndex.ts`. An address compares as `pathname + search`.
- Every way `DeckEditor`, `CardStandaloneForm` and `PracticeCreatePage` leave must go through it, with the address each chooses today: Cancel to `cancelTo`, else the default; Create, Edit card's Save and Edit deck's Done to `returnTo`, else the made or changed thing's page; Delete deck to `/library` and Delete card to its deck's page; an arrival result, such as the new deck's id for a picker, as `state`. Edit deck's Save does not leave: it stays on the form and shows "Saved ✓", as it does today. No `navigate` call in these three files may leave the form; a `navigate` that opens another form from inside one, such as "New deck…" from New card's picker, stays.
- Delete must remove the deleted thing's queries from the cache once its leave has settled, never before, since the form watches them until it unmounts. `DeckEditor`'s comment in `handleDeleteDeck` that names `navigate()` goes with the call.
- A form that receives an arrival result, `CardStandaloneForm` taking a new deck's id, must read it from the location each time the location changes, keyed by `location.key`, not once on mount, since the result arrives by a replace after the opener has mounted for the step back.
- `PracticeCreatePage` must read `cancelTo` and `returnTo` through `internalReturnTo`, as every other form does: Cancel to `cancelTo`, else `/practice` with no parameter, the deck and status it carries back today going; Create to `returnTo`, else the new practice's page.
- Guidance: under the data router, `await navigate(-1)` resolves once the opener's entry is current, and the opener's address is then `window.location.pathname + window.location.search`; a router whose history holds no index, such as `createMemoryRouter`, takes the replace branch.
- Tests, in `leaveForm.test.tsx` with `createBrowserRouter` over jsdom's history: from a form pushed over an opener, leaving for the opener's own address makes the opener's entry current, the router's location the opener's and `hasEarlierPage()` as it was there, with no replace; leaving for another address replaces the opener's entry with it; leaving with `state` delivers the state; with no earlier page, the form's entry is replaced. In the three forms' tests, Cancel, Create, Edit card's Save, Edit deck's Done and each Delete call the hook's function with the addresses above, and Edit deck's Save calls it not at all.

**Out of scope**

- `DeckConfigurationEditor`: never; cycle 049 deletes it. Until then it still leaves by a new entry, so a round trip from New practice through New configuration leaves its entries in the history, and its "New deck…" round trip may not choose the new deck while it reads the arrival result once on mount.
- Back and the breadcrumb reading `cancelTo` or `returnTo`: never, ADR 124.
- The openers passing `cancelTo`: T2.

**Done when**

- `cd frontend && npx vitest run src/lib/leaveForm.test.tsx src/components/library/DeckEditor.test.tsx src/components/library/CardStandaloneForm.test.tsx src/pages/PracticeCreatePage.test.tsx` passes.
- `grep -n "navigate(" frontend/src/components/library/DeckEditor.tsx frontend/src/components/library/CardStandaloneForm.tsx frontend/src/pages/PracticeCreatePage.tsx` prints exactly three lines: the call in `CardStandaloneForm`'s `goToCreateDeck`, and the calls in `PracticeCreatePage`'s `newConfiguration` and `editConfiguration`.
- On the live server at 390 wide: on the run page, Edit card then Cancel lands on the run page on the same card, and its "<" lands on the page the run page was reached from; New card, its Deck picker's "New deck…", then Create lands back on New card with the new deck chosen; New deck opened from its address in a fresh tab, then Cancel, lands on Your library.

**Debrief**

Evidence, in the order of Done when:

- The four files pass: `Test Files  4 passed (4)`, `Tests  147 passed (147)`.
- The grep prints exactly three lines: `PracticeCreatePage.tsx` in `newConfiguration` (`navigate({ pathname: '/deck-configurations/new', … })`) and in `editConfiguration` (`navigate({`), and `CardStandaloneForm.tsx` in `goToCreateDeck` (`navigate({ pathname: '/decks/new', … })`).
- Live server, headless Chromium at 390 by 844, mouse only, each check in a fresh tab:
  - From the practice "Overlap B 723016" page, Start practice, Show answer, then Edit card, at history index 2, then Cancel lands at index 1 on the same address, `…/run?card=5255503e-…&shown=1`, with the same card on screen. Its "<" then lands on `/practice/9d20eb8c-…` at index 0, the page the run page was reached from.
  - Your library, the top bar's New, New card (index 1), the picker's "New deck…" (index 2), a name, then Create lands on `/cards/new` at index 1, with the picker showing the new deck "Cycle 047 T1 picker 2026-11-11T06:02:14.369Z". That deck stays in the dev database.
  - `/decks/new` opened by its address (index 0), then Cancel, lands on `/library` at index 0 under the heading "Your library".

Departures from guidance: none.

Beyond the tests Details names:

- The three forms' tests wrap the real hook in a spy, so each existing landing check still runs alongside the call check.
- `CardStandaloneForm.test.tsx` has a test that delivers a deck id by a replace to the mounted form. It fails without the `key`.
- Both Delete tests check that the deleted thing's query is gone from the cache. The deck's check fails without `removeQueries`.
- "New deck…" in New card and the pencil in New practice are each shown not to call the hook.

Read in the code:

- `useLeaveForm` in `frontend/src/lib/leaveForm.ts`.
- The `key={location.key}` on `CardStandaloneFormBody` in `CardStandaloneForm`. It remounts the form's body whenever its location changes. The form writes nothing to its own URL, so only an arrival changes it.

### T2 — Every opener's own address

**Status**

- [ ]

**Goal**

Every page that opens New deck, Edit deck, New card, Edit card or New practice passes its own address as `cancelTo`, so the form's Cancel lands where the user opened it, Home's steps and the top bar's New sheet included.

**Dependencies**

- T1: `useLeaveForm`, and New practice's Cancel reading `cancelTo`.

**Files**

- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/HomePage.test.tsx`
- `frontend/src/components/shell/CreateSheet.tsx`
- `frontend/src/components/shell/CreateSheet.test.tsx`
- `frontend/src/pages/LibraryPage.tsx`
- `frontend/src/pages/LibraryPage.test.tsx`
- `frontend/src/pages/DeckDetailPage.tsx`
- `frontend/src/pages/DeckDetailPage.test.tsx`
- `frontend/src/pages/PracticeOverviewPage.tsx`
- `frontend/src/pages/PracticeOverviewPage.test.tsx`
- `frontend/src/pages/practicePrefilterChain.test.tsx`

**Details**

Under ADR 124:

- Every opener named in the Goal must open its form with `returnAddressParams(location, 'cancelTo')` from `frontend/src/lib/returnTo.ts`, its own `pathname + search`, beside any parameter or router state it passes today: Home's three steps and its New practice link; the New sheet's three rows, with the address of the page beneath the sheet; Your library's Add deck; a deck's page's Add card, its pencil to Edit deck, and its card rows to Edit card; and the Practice page's Add practice, beside the filter parameters it passes today.
- No opener passes `returnTo`, so Create still lands on the thing made.
- Tests: `HomePage.test.tsx` asserts, for each of the three states of the steps, that the next step's link carries `cancelTo=%2F`; `CreateSheet.test.tsx` asserts a row opens its form with the current page's address as `cancelTo`; `LibraryPage.test.tsx`, `DeckDetailPage.test.tsx` and `PracticeOverviewPage.test.tsx` assert their openers carry their own address, and `practicePrefilterChain.test.tsx`'s round trips expect the nested `cancelTo` Add practice now carries.

**Out of scope**

- The run page's and the summary's Edit card, which pass both addresses today: never changed here.
- New practice's "New configuration…" and pencil: never; cycle 049 removes them.

**Done when**

- `cd frontend && npx vitest run src/pages/HomePage.test.tsx src/components/shell/CreateSheet.test.tsx src/pages/LibraryPage.test.tsx src/pages/DeckDetailPage.test.tsx src/pages/PracticeOverviewPage.test.tsx` passes.
- The cycle's judgement holds.

**Debrief**

None.
