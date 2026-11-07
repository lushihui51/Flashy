# 044 — A card edited mid-practice

Waits for: 040, its sheet in `RunBreakdown` and the `card` param; 041, with which it shares `frontend/src/components/practice/RunBreakdown.tsx` and `frontend/src/pages/PracticeRunPage.tsx`; 043, with which it shares `docs/vocabulary.md`.

Canvas: https://claude.ai/artifact/8evqmFpD9Xdz762KMXuMWL

## Goal

Outcome: The user edits the current card from the run page once its answers are shown, and a card opened from the summary from its sheet, and comes back to where they were with the card's new values.

Scope: The cycle covers the run page's place kept in its URL, the current card, whether its answers are shown and the ratings given so far; "Edit card" beside the card's main action on the run page, not usable while the answers are hidden, and "Edit card" under the record card of a card opened from the summary, each opening the card's form with both return addresses set to the page's full address; the run page refetching its state on return; the page dimmed while a rating chip's list is open; and the vocabulary's words. It leaves out the card's form itself, which already reads both addresses; any change to a rating from the form, which PDR 019 rules out; and the summary's sheet, cycle 040's.

Judgement: The engineer judges on the live server at 390 wide, on an active practice's run page: "Edit card" with a pencil sits beside "Show answer" and reads not ready, and tapping it does nothing, as drawing 18; after "Show answer" it is pressable beside "Next card", as drawing 19; rating one of two answers Good then tapping "Edit card" opens Edit card, and Save after a change returns to the run page on the same card with its answers shown, the Good kept and the new value showing, as does Cancel without the new value; reloading the run page keeps the card, the shown answers and the rating; "Next card" starts the next card with nothing shown and nothing rated; with a rating chip's list open the rest of the page is dimmed and a tap on the dimming closes the list without pressing "Edit card" or "Next card", as drawing 40; and on a completed practice's summary, a card's sheet shows "Edit card" under the record card, which opens the form and returns to the summary with that card open and its new value.

## Records

- PDR 019: A card edited where the user notices a mistake
- ADR 103: Two URL parameters, cancelTo and returnTo, for a form's return addresses

## Tasks

### T1 — The run page's place and Edit card

**Status**

- [x]

**Goal**

The run page keeps its place on the card in its URL, offers "Edit card" beside the card's main action once the answers are shown, returns from the card's form to the same card as it was left, and dims the page while a rating chip's list is open.

**Dependencies**

None.

**Files**

- `frontend/src/pages/PracticeRunPage.tsx`
- `frontend/src/pages/PracticeRunPage.test.tsx`
- `frontend/src/components/practice/RatingChip.tsx`
- `frontend/src/components/practice/RatingChip.test.tsx` (new)
- `docs/vocabulary.md`

**Details**

Drawings 18, 19 and 40 are the run page.

The place in the URL (LCD7, ADR 097):

- The run page must keep "answers shown" and the ratings chosen so far in its search params, tagged with their practice card: `card`, the practice card's id; `shown`, `1` when the answers are shown; and `rating.<fieldId>`, the rating 1 to 4 for each rated answer field, as `/practice/{id}/run?card=<practiceCardId>&shown=1&rating.<fieldId>=3`. It must read them only when `card` equals the current practice card's id, and write them through `setParams`, never `changeView`; `useState` for either goes.
- `RunCompletion` and its `rerunError` stay as they are; a failure's sentence is UI state (ADR 088), never a param.
- On a successful "Next card" the page must write the params without `card`, `shown` and any `rating.` key, so nothing carries to the next card; a `card` from an earlier card reads as nothing.
- `kind` and `order` from the summary, and `card` once the practice completes, are the summary's, written by `RunBreakdown`; the run page must not strip them.

"Edit card" (PDR 019, LPD4):

- A block button "Edit card" with a `Pencil` icon must sit to the left of the card's main action in the action row, both 3.375rem high, the main action growing, as drawings 18 and 19; it must be there while the answers are hidden, reading not ready through `aria-disabled` in the look the forms' not-ready buttons have, and a tap then does nothing; once the answers are shown it is pressable.
- A tap must navigate to `/cards/<cardId>/edit` with `cancelTo` and `returnTo` both set to the run page's full address, pathname and search, through `returnAddressParams` in `frontend/src/lib/returnTo.ts` (ADR 103). The card's form already saves and cancels to those addresses.
- On return the page mounts and its query refetches under TanStack Query's default staleness, so the card's new values show; the shown answers and the ratings come back from the URL. No other refetch is needed.

The rating chip's list (LPD25; drawing 40):

- While a `RatingChip`'s list is open, `RatingChip` must mount `Scrim` from `frontend/src/components/ui/Scrim.tsx` with the chip as its anchor, so the rest of the page is dimmed and the chip and its list stay bright; `Scrim`'s dismiss closes the list, and a tap on the dimming acts on nothing beneath. Guidance: render the scrim in the same portal as the list, as `PickerCombobox` does, so the list's `z-60` stands above the scrim's `z-50`.
- Tests in `RatingChip.test.tsx`: opening the list mounts the scrim, a pointerdown on the scrim closes the list and clicks nothing beneath, and choosing a rating closes both.

Tests in `PracticeRunPage.test.tsx`: "Edit card" reads `aria-disabled` before "Show answer" and a click then navigates nowhere; after "Show answer" a click navigates to `/cards/c1/edit` with both addresses equal to the run page's full address; "Show answer" writes `shown=1` and `card`; a rating writes `rating.<fieldId>`; mounting with `card`, `shown` and a rating in the URL renders the answers shown and the chip rated; mounting with another card's `card` renders the answers hidden; a successful "Next card" leaves none of the three in the URL; the existing rating tests keep passing.

`docs/vocabulary.md`:

- The row "The page where a card is changed" gains Where "the run page's button beside the card's main action, with a pencil, not ready while the answers are hidden" and keeps its words.
- The row "Rating an answer" gains, in User reads at the end, `; the page dimmed while the list is open`; Code gains `` `Scrim` ``.
- A new row in the Run area: Concept "The user's place on the card, in the address"; User reads "—"; Where "Run page"; Code `` `card`; `shown`; `rating.<fieldId>` ``.

**Out of scope**

- "Edit card" on the sheet: T2.
- The card's form as an overlay on the run page, or `sessionStorage` for the card's state: never, LCD7.
- A pencil on the prompt's heading or a button in the row of places: never, PDR 019.
- A button that works before the answers are shown: never, PDR 019.
- The list's `listbox` and `option` roles as drawing 40 writes them: never; the options stay the four buttons the tests name.
- A changed rating from the form: never, PDR 019.

**Done when**

- `cd frontend && npx vitest run src/pages/PracticeRunPage.test.tsx src/components/practice/RatingChip.test.tsx` passes.
- `grep -c "useState" frontend/src/pages/PracticeRunPage.tsx` prints `2`: the import and `rerunError`.
- `grep -c "Scrim" frontend/src/components/practice/RatingChip.tsx` prints `2` or more.
- At 390 wide on the live server, on an active practice: "Edit card" reads not ready beside "Show answer" and does nothing tapped, as drawing 18; after "Show answer" it opens Edit card, and Save after a change returns to the same card, answers shown, a rating given before kept, the new value showing, as does Cancel without it; a reload keeps the card, the shown answers and the rating; "Next card" shows the next card with nothing shown or rated; a rating chip's open list dims the page and a tap on the dimming closes it without pressing "Edit card" or "Next card", as drawing 40.

**Debrief**

Evidence, by Done-when line:

- `npx vitest run src/pages/PracticeRunPage.test.tsx src/components/practice/RatingChip.test.tsx`: 2 files and 40 tests passed.
- `grep -c "useState" frontend/src/pages/PracticeRunPage.tsx` prints `2`.
- `grep -c "Scrim" frontend/src/components/practice/RatingChip.tsx` prints `2`.
- Headless Chromium at 390 by 844, driven by a mouse, signed out of Clerk, on the active practice "Oct 1, 2026 at 1:18 PM", whose current card is the prompt "139" with the two answers Protocol Name and Protocol Function. With the answers hidden, "Edit card" with a pencil sits to the left of "Show answer", both 54px high, the main action the wider, with `aria-disabled="true"`, a line-coloured border, aside-coloured text and no shadow, as drawing 18; a tap on it leaves the URL and the two "Hidden" marks as they were. "Show answer" writes `?card=<practiceCardId>&shown=1`, and "Edit card" is then pressable, with its shadow, beside "Next card", as drawing 19. Rating Protocol Name Good writes `&rating.<fieldId>=3`. "Edit card" lands on `/cards/<cardId>/edit` with `cancelTo` and `returnTo` both the run page's pathname and search; Save after " (edited)" is appended to Protocol Function returns to that address with both answers shown, "Protocol Name: Good" kept and the new value showing; a reload keeps all three; Cancel returns the same way; a second Save with the seeded value returns the card to what it was. With both answers rated, a chip's open list dims the page, with the chip and its list bright, as drawing 40; a tap on the dimming over "Edit card" closes the list and stays on the run page, and a tap on the dimming over "Next card" closes the list and stays on the card. "Next card" shows the next card, "21", with "Hidden" marks, "Show answer", "Edit card" not ready and no `card`, `shown` or `rating.` key in the URL.

Checks for the commit: `npx vitest run` over the whole frontend, 70 files and 833 tests passed; `npm run lint` and `npm run build` both exit 0. The browser check rated the card "139" Good on both answers and moved the practice to the card "21", which stays, as an earlier run of the same check had rated "445" and moved it to "139".

Departures and additions: none from the Details. Beyond the tests Details names, `RatingChip.test.tsx` also checks that the scrim's pointerdown reaches `onSelect` nowhere, and the "Next card" test also checks the next card shows "Hidden" and "Show answer".

To read in the code:

- `PracticeCardView` in `frontend/src/pages/PracticeRunPage.tsx`: `rateMutation`'s `onSuccess` awaits the run query's invalidation and only then writes the params without the place. Written first, the card on screen would lose its shown answers and ratings for as long as the refetch takes. Details fixes no order.
- The same component: `rateMutation`'s failure sentence now renders under the action row rather than under "Next card" alone, since the row holds both buttons.
- `RatingChip` in `frontend/src/components/practice/RatingChip.tsx`: its interface comment no longer says a tap on another chip closes this one through Radix's outside dismissal; the scrim now takes that tap, and the other chip is not pressed.

### T2 — Edit card from the summary

**Status**

- [x]

**Goal**

A card opened from the summary offers "Edit card" under its record card, which opens the card's form and returns to the summary with the same card open and the card's new values.

**Dependencies**

- T1: `returnAddressParams` carrying the full address, which this task reuses.

**Files**

- `frontend/src/components/practice/RunBreakdown.tsx`
- `frontend/src/components/practice/RunBreakdown.test.tsx`
- `docs/vocabulary.md`

**Details**

Drawing 16 is the sheet.

- Under the record card, a `tappable-sm` white pill "Edit card" with a `Pencil` icon, left-aligned, as drawing 16 (LPD7, LPD8).
- A tap must navigate to `/cards/<cardId>/edit` with `cancelTo` and `returnTo` both the summary's full address, pathname and search, through `returnAddressParams`; the search already holds `card`, so the sheet reopens on return, and `kind` and `order`, so the list comes back as it was (PDR 019, ADR 103).
- On return the page mounts and the breakdown query refetches under the default staleness, so the sheet shows the card's new values; nothing else refetches.
- Tests in `RunBreakdown.test.tsx`: the sheet shows "Edit card", and a click navigates to `/cards/<id>/edit` with both addresses equal to the page's full address including `card`, `kind` and `order`.

`docs/vocabulary.md`: the row "The page where a card is changed" gains Where "the sheet's button under the record card".

**Out of scope**

- A changed rating or mastery from the form: never, PDR 019.
- The sheet's marks and key: cycle 040.

**Done when**

- `cd frontend && npx vitest run src/components/practice/RunBreakdown.test.tsx` passes.
- `grep -c "Edit card" frontend/src/components/practice/RunBreakdown.tsx` prints `1` or more.
- At 390 wide on the live server, on a completed practice's summary: a card's sheet shows "Edit card" under the record card; tapping it opens Edit card, and Save after a change returns to the summary with that card's sheet open and the new value showing, the chosen counts and order as they were.

**Debrief**

Evidence, by Done-when line:

- `npx vitest run src/components/practice/RunBreakdown.test.tsx`: 1 file and 35 tests passed.
- `grep -c "Edit card" frontend/src/components/practice/RunBreakdown.tsx` prints `1`.
- Headless Chromium at 390 by 844, driven by a mouse, signed out of Clerk, on the completed practice "Sep 29, 2026 at 8:41 AM" at its own page, with the count "53 no change" chosen and the order Drops, which wrote `?kind=no_change&order=drops`. The row "format" opened its sheet and wrote `&card=<cardId>`. "Edit card" with a pencil sits under the record card, 16px below its bottom edge and flush with its left edge, 120 by 40, as drawing 16. A tap landed on `/cards/<cardId>/edit` with `cancelTo` and `returnTo` both the summary's pathname and search, `kind`, `order` and `card` included. Save after " (edited)" was appended to Command purpose returned to that address with the sheet open on "format", the new value showing, "53 no change" still pressed, Drops still checked and the 53 rows beneath. After a reload of that address the sheet was open; Cancel from the form returned the same way with the value as saved; a second Save with the seeded value returned the card to what it was.

Checks for the commit: `npx vitest run` over the whole frontend, 70 files and 835 tests passed; `npm run lint` and `npm run build` both exit 0. The dev database holds the card as it was seeded.

Departures and additions: none from the Details. The pill sits after the record card's scrolling area rather than inside it, so it stays in reach under a card whose fields scroll; Details fixes neither. Beyond the tests Details names, the first also checks the pill's classes and that it follows the "Answer" heading.

To read in the code:

- `CardSheetContent` in `frontend/src/components/practice/RunBreakdown.tsx` takes `onEdit`, and `RunBreakdown` builds the address from `useLocation`, since `useViewParams` gives the search alone.

A finding outside this task's Files, raised and not fixed: `CardStandaloneForm` in `frontend/src/components/library/CardStandaloneForm.tsx` seeds its values from the cached card on mount, and its Save invalidates the deck queries but not the card's, so the form reopened straight after a Save, from the summary or the run page alike, seeds from the stale card, refetches, and then reads itself as dirty: Cancel with nothing changed asks "Discard this card?". Observed in Chromium; a reload between the Save and the reopening avoids it.
