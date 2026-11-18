# 061 — The row of places

## Goal

Outcome: No page shows a "<" above its heading.

Scope: The cycle covers `Breadcrumb` drawing only its places on a deck's page, a practice's page, the run page and a completed run's page, its tests, and the vocabulary's row for the row of places. It leaves out `hasEarlierPage()` and the leaving of a form, which stay as they are, and the places each page names, which stay as they are.

Judgement: The engineer opens a deck's page, a practice's page, an active run's page and a completed run's page on the dev servers, each once from inside the app and once by its address, at 390 by 844 and at 1440 by 900, and sees above each heading only the row of places, with no "<"; then opens Edit deck from a deck's page reached from Your library, presses Cancel, and is back on the deck's page.

## Records

- PDR 064: Places above a page, and the browser's back
- ADR 142: The router's history index for leaving a form

## Tasks

### T1 — A row of places with no "<"

**Status**

- [ ]

**Goal**

`Breadcrumb` draws only the places a page belongs to, widest first, and no page shows a "<" above its heading.

**Dependencies**

None.

**Files**

- `frontend/src/components/ui/Breadcrumb.tsx`
- `frontend/src/components/ui/Breadcrumb.test.tsx`
- `docs/vocabulary.md`

**Details**

- `Breadcrumb` must draw only its places, widest first, and must import neither `hasEarlierPage` nor `ChevronLeft` (PDR 064). Its props, `BreadcrumbPlace` and its drawing of each place stay as they are.
- `Breadcrumb`'s docstring must say nothing of a "<" or of going back.
- `Breadcrumb.test.tsx` must assert that `Breadcrumb` draws no button named "Back" under a browser router after a push, where `hasEarlierPage()` is true. Its three cases on the Back button give way to that one; `renderUnderBrowserRouter` stays for it, and its comment says why the case runs under a browser router.
- The vocabulary's row "The row above a page's heading naming the places it belongs to, widest first" must read, in its User reads column, exactly: `"Breadcrumb", spoken; "Your library" on a deck's page; "All practices" on a practice's page; "All practices › <Practice>" on the run page and a completed run's page`. Its other columns stay as they are.

**Out of scope**

- Any change to `hasEarlierPage()` in `frontend/src/lib/historyIndex.ts`, its test, or `useLeaveForm` in `frontend/src/lib/leaveForm.ts`: never, as ADR 142 keeps them for leaving a form.
- Any change to the places a page names, or a row on Home, Your library, All practices or a form: never.
- The pages that say what Flashy is and what it keeps about a person: cycle 063.

**Done when**

- `grep -cE "hasEarlierPage|ChevronLeft" frontend/src/components/ui/Breadcrumb.tsx` prints `0`.
- The case in `frontend/src/components/ui/Breadcrumb.test.tsx` asserting no button named "Back" after a push passes.
- `grep -c '"Back", spoken' docs/vocabulary.md` prints `0`.
- In headless Chromium against localhost:5173, as a user and as a guest as AGENTS.md gives them, at 390 by 844 and at 1440 by 900: a deck's page, a practice's page, an active run's page and a completed run's page, for the guest a run of the example library left partway and one completed, as PDR 060 fills it, each reached once by clicks from Your library or All practices and once by its address, hold no button named "Back" inside the navigation named "Breadcrumb", and the navigation's text is its places alone; and, as the user, Edit deck opened from a deck's page reached from Your library, then Cancel, lands on that deck's page.

**Debrief**

None.
