# 036 — New practice's sections

Canvas: https://claude.ai/artifact/8nVevDcZiSgnQcxc7HcuiA

## Goal

Outcome: On New practice the order down the page is Name, then the filters, then the configurations, then Selected, so the filters and their list stay in place however many configurations the user picks, and the user scrolls past the list to Selected; the Practice page's filters stay where they are, directly above their list.

Scope: The cycle covers the order of New practice's sections below its sticky row: Name, the two filters, "New configuration…" with the configurations under their decks, and Selected last with its heading, its hint, its failure sentence and its rows. It leaves out every word on the page, the draft riding the URL, the reveal after a filter change, the count beside Create, the sticky row itself, which a later cycle moves into a bar at the foot, and the Practice page, none of which changes.

Judgement: The engineer judges on the live server at 390 wide: New practice matches drawing 27 in the order of its sections, Name, the two filters, "New configuration…", the configurations under their decks and Selected last, with the sticky row of Cancel, "New practice", "N selected" and Create in place of the drawing's bar; picking three configurations across three decks moves neither the filters nor the configurations' first rows; removing a pick in Selected changes nothing above it; the Practice page is unchanged.

## Records

- PDR 017: A row of the places above a page, led by a way back

## Tasks

### T1 — The order of New practice's sections

**Status**

- [ ]

**Goal**

New practice reads Name, then the filters, then the configurations, then Selected, with nothing that grows as the user picks sitting above the filters.

**Dependencies**

None.

**Files**

- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`

**Details**

The order down the page, drawings 27, 32 and 33, in `PracticeCreatePage.tsx`, below the sticky row of Cancel, "New practice", "N selected" and Create, which stays as it is:

- Name must come first, with its label and its blank-name sentence, as today.
- The filters, `PracticeFilterBar` in the element `filtersRef` marks, must come second, directly above the list they narrow, and nothing that grows while the user picks may sit above them.
- The row holding "New configuration…", then the sentences for a failed load of the configurations, `topError` and `saveError`, then the configurations under their decks or the empty state must come third, exactly as they sit today relative to one another: the add control sits with the collection it adds to, and it does not grow.
- Selected must come last: its heading, and under it the hint when nothing is chosen, the failure sentence when the selected configurations will not load, or the rows.

Nothing else changes: every word, the draft in the URL, `setFilters`'s reveal with the filters as its control and the list's start as its target, the refs the reveal reads, and "N selected" beside Create stay as they are. Selected moving below the list changes no ref, since the reveal never anchored on it.

Tests, in `PracticeCreatePage.test.tsx`, with the page's `precedes` helper: the Name input precedes the "All subjects" filter, as the existing test has it; the "All subjects" filter precedes the first configuration group; the last configuration group precedes the Selected region; and with three configurations ticked across three decks, the filters still precede the first group and the Selected region still follows it.

**Out of scope**

- Cancel, "N selected" and Create in a bar at the foot of the screen, as drawings 27, 32 and 33 draw them: the next cycle. The sticky row stays.
- The heading "New practice" at the top of the page in place of the sticky row, as the three drawings have it: the next cycle.
- The filters as a panel over a dimmed page: cycle 37.
- Any word on the page, or the Practice page's own order: never here.
- Selected folded into its count or kept on screen while scrolling: never. The user scrolls past the list to review or remove a pick, and the count beside Create says how many.

**Done when**

- `cd frontend && npx vitest run src/pages/PracticeCreatePage.test.tsx src/pages/practicePrefilterChain.test.tsx` passes, the three new order tests among them.
- The cycle's judgement, in headless Chromium against `localhost:5173`, signed out of Clerk with `DEV_AUTH_USER_ID` and `ENV=development`, at 390 wide, on `/practice/new` with configurations in three or more decks: the script prints the `getBoundingClientRect().top` of the "All subjects" filter and of the first configuration row, ticks one configuration in each of three decks by mouse, and prints both again; the four numbers are two equal pairs; the Selected region's top is greater than the last configuration group's bottom; "3 selected" is beside Create; removing one pick by its "Remove" button in Selected leaves the two tops unchanged. The output is the evidence.
- A screenshot of `/practice/new` with three configurations ticked at 390 wide, scrolled so Selected is in view, saved in the session scratchpad and named in the Debrief, for the engineer to set beside drawing 27.

**Debrief**

None.
