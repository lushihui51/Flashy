# 036 — New practice's sections

Canvas: https://claude.ai/artifact/8nVevDcZiSgnQcxc7HcuiA

## Goal

Outcome: On New practice the order down the page is Name, then the filters, then the configurations, then Selected, so the filters and their list stay in place however many configurations the user picks, and the user scrolls past the list to Selected; the Practice page's filters stay where they are, directly above their list.

Scope: The cycle covers the order of New practice's sections below its sticky row: Name, the two filters, "New configuration…" with the configurations under their decks, and Selected last with its heading, its hint, its failure sentence and its rows. It leaves out every word on the page, the draft riding the URL, the reveal after a filter change, the count beside Create and the Practice page, none of which changes.

Judgement: The engineer judges on the live server at 390 wide: New practice matches drawing 23, with Name, the two filters, the configurations under their decks and Selected last, and "N selected" beside Create; picking several configurations moves neither the filters nor the configurations' first rows; removing a pick in Selected changes nothing above it; the Practice page is unchanged.

## Records

- PDR 017: A row of the places above a page, led by a way back

## Tasks

### T1 — The order of New practice's sections

**Status**

- [ ] [BLOCKED]

**Goal**

New practice reads Name, then the filters, then the configurations, then Selected, with nothing that grows as the user picks sitting above the filters.

**Dependencies**

None.

**Files**

- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`

**Details**

The order, LPD11 and drawing 23, in `PracticeCreatePage.tsx`, below the sticky row of Cancel, "New practice", "N selected" and Create, which stays:

- Name, with its label and its blank-name sentence, as today.
- The filters, `PracticeFilterBar`, in the element `filtersRef` marks.
- The row holding "New configuration…", then the sentences for a failed load of the configurations, `topError` and `saveError`, then the configurations under their decks or the empty state, exactly as they sit today relative to one another: the add control sits with the collection it adds to, and it does not grow.
- Selected last: its heading, and under it the hint when nothing is chosen, the failure sentence when the selected configurations will not load, or the rows.

Nothing else changes: every word, the draft in the URL, `setFilters`'s reveal with the filters as its control and the list's start as its target, the refs the reveal reads, and "N selected" beside Create stay as they are. Selected moving below the list changes no ref, since the reveal never anchored on it.

Tests, in `PracticeCreatePage.test.tsx`, with the page's `precedes` helper: the Name input precedes the "All subjects" filter, as the existing test has it; the "All subjects" filter precedes the first configuration group; the last configuration group precedes the Selected region; and with three configurations ticked, the filters still precede the first group and the Selected region still follows it.

**Out of scope**

- The filters as a panel over a dimmed page: a later cycle.
- Any word on the page, or the Practice page's own order: never here.
- Selected folded into its count or kept on screen while scrolling: never, LPD11.

**Done when**

- `cd frontend && npx vitest run src/pages/PracticeCreatePage.test.tsx src/pages/practicePrefilterChain.test.tsx` passes, the three new order tests among them.
- The cycle's judgement, in headless Chromium against `localhost:5173`, signed out of Clerk with `DEV_AUTH_USER_ID` and `ENV=development`, at 390 wide, on `/practice/new` with three or more configurations across two decks: the script prints the `getBoundingClientRect().top` of the "All subjects" filter and of the first configuration row, ticks three configurations by mouse, and prints both again; the four numbers are two equal pairs; the Selected region's top is greater than the last configuration group's bottom; "3 selected" is beside Create; removing one pick by its "Remove" button in Selected leaves the two tops unchanged. The output is the evidence.
- A screenshot of `/practice/new` with three configurations ticked at 390 wide, scrolled so Selected is in view, saved in the session scratchpad and named in the Debrief, for the engineer to set beside drawing 23.

**Debrief**

Attempted: I moved the Selected `section` to the end of `PracticeCreatePage`'s JSX and added the three order tests. Every Done-when line held: the two test files passed, the filter and first-row tops stayed 281.5 and 460.5 through three ticks and one removal at 390 wide, Selected's top was below the last group's bottom, and "3 selected" sat beside Create. I raised the drawing's differences only after building, not before.

Found: drawing 23, now lettered 23A, is a constraint, and the page the Details keep differs from it in six things, shown in 23B:

- Cancel, the count and Create sit in the sticky row, where 23A has a bar at the foot.
- The "New configuration…" row is there, where 23A has none.
- Each deck's name sits inside its block, where 23A has it above.
- The ticks are square, where 23A's are round.
- Each row in Selected has two lines, where 23A's have one.
- Selected sits 12px below the list, where 23A's sections are 16px apart.

The Done-when line also asks for three ticks across two decks, and `toggleConfig` allows one tick per deck, so three ticks need three decks.

Why the file cannot settle it: the Details keep the sticky row and the "New configuration…" row, the Goal's scope limits the cycle to the order, and the cited drawing says otherwise. The engineer agreed to 23B. The file must cite 23B and name three decks before the task can be built.
