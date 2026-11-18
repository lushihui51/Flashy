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

- [x]

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

- `grep -cE "hasEarlierPage|ChevronLeft" frontend/src/components/ui/Breadcrumb.tsx` printed `0`.
- `shows no Back button after a push, with an earlier page in Flashy` in `frontend/src/components/ui/Breadcrumb.test.tsx` passes (5 of 5 in the file; 785 of 785 across the frontend). Against the `Breadcrumb.tsx` of the branch's last commit, the same case fails, finding the Back button.
- `grep -c '"Back", spoken' docs/vocabulary.md` printed `0`.
- Browser check, headless Chromium against localhost:5173, both screen sizes. As the guest: the "Common words + Capitals" practice, its active run at 8 of 70 cards and its completed run, and the deck "Capitals". As the user: the "Commands: Basic" practice, its active and completed runs, and the deck "Virtualization and Cloud". Each of the four pages was reached once by clicks from Your library or All practices, with the router's history index at 1 or 2, so the old row would have drawn its "<". Each was reached once by its address, at index 0. All 32 page visits passed: the navigation named "Breadcrumb" held no button at all, and its text was "Your library", "All practices" or "All practices› <Practice>" alone.
- Edit deck, opened from a deck's page reached from Your library, landed back on that deck's page at the same history index at both sizes, both ways out. An untouched Edit deck shows "Done", not "Cancel"; "Cancel" shows only once a change is unsaved. So the check pressed Done on an untouched form, and separately changed the name, pressed Cancel and then Discard. The deck's name afterwards was unchanged.
- The user pass ran with `DEV_AUTH_USER_ID` uncommented in the root `.env` and `VITE_DEV_AUTH=1` added to `frontend/.env`, on the engineer's order. Both files, which are gitignored, were restored byte for byte afterwards.
- Departures: none from the Details. `renderUnderBrowserRouter` stays, now drawing the row alone, since no case reads the location any more. The test imports `hasEarlierPage` to assert that it is true after the push, so the case shows that the condition under which the old "<" appeared held.
- Read: the new case and the comment above `renderUnderBrowserRouter` in `frontend/src/components/ui/Breadcrumb.test.tsx`.
