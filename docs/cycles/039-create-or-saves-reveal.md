# 039 — Create or Save's reveal

## Goal

Outcome: When the user taps Create or Save while a sentence about one part of the form is off screen, the page moves just far enough to bring the first such part and its sentence on screen, clear of the header and of the bar; a Create or Save that is not ready stays pressable and reads not ready, and a refusal that names one part of the form, a subject's, a deck's or a configuration's name already taken, renders beside the Name input rather than in the bar.

Scope: The cycle covers `reveal` on the one hook for a page's URL search params, which scrolls the control and its sentence into the band between the header and the bar and writes nothing; every form's Create or Save kept pressable while not ready, reading not ready through `aria-disabled`, with `disabled` only while a request is in flight; each form calling `reveal` on a tap that is not ready, for the first part in document order whose sentence shows, and on a refusal that names one part; and the three refusals that name the Name input rendering beside it on New subject, Edit subject, New deck, Edit deck, New configuration and Edit configuration. It leaves out every sentence's words, but one new sentence for New card with no deck chosen, and the sentences for a blank Deck name and for no subject chosen on the deck form, and where each sentence already sits; the bar itself, cycle 38's; and every other refusal, which stays the bar's sentence.

Judgement: The engineer judges on the live server at 390 wide: on New practice with no configuration ticked, scrolled so "Select at least one configuration to practice." is above the screen, tapping Create brings that sentence and the Selected heading on screen below the header with nothing of them behind the bar, and tapping again moves the page by nothing; with the name cleared, tapping Create brings "Give this practice a name to create it." and the Name input on screen first; on New subject with a blank name, tapping Create shows "Name is required." under the Name input and brings it on screen when it was off screen; on New card with no deck chosen, tapping Create shows "Choose a deck to create a card." under the Deck picker; on New deck with a name already taken, Create puts "A deck with this name already exists." under the Deck name input, not in the bar, and brings it on screen; with the connection cut, Create on the same form still puts its sentence in the bar; the reveal's arithmetic is pinned by unit tests, and lint still refuses any other import of React Router's search params.

## Records

- PDR 031: Failures met in place, up to the whole page, with one banner for the connection
- ADR 070: A frontend map from refusal code to sentence
- ADR 097: One hook for a page's URL search params, that never resets scroll
- ADR 100: A measured header height and one component for a form's bar at the foot

## Tasks

### T1 — The reveal on the hook

**Status**

- [x]

**Goal**

`useViewParams` offers `reveal`, which brings a part of a form and its sentence into the band between the header and the bar by the same arithmetic as a filter change, and writes nothing to the URL.

**Dependencies**

None.

**Files**

- `frontend/src/lib/viewParams.ts`
- `frontend/src/lib/viewParams.test.tsx`

**Details**

The interface, ADR 097, in `viewParams.ts`:

```ts
export type ViewParams = {
  params: URLSearchParams;
  setParams: (next: URLSearchParams) => void;
  changeView: (next: URLSearchParams, targets: ViewTargets) => void;
  /** Moves the page only as far as it takes to show the control and the rows, within the
   * band the marked elements leave clear, and writes nothing. `control` is the part of the
   * form, `listStart` the element holding its sentence, null until it is rendered. */
  reveal: (targets: ViewTargets) => void;
};
```

- `reveal` must scroll by `revealDelta` over the same band and the same rows as `changeView`, once: inside the call itself when `targets.listStart()` already returns an element, since a tap that changes no state causes no commit; otherwise on the first commit after the call where it does, which is how a form that sets a sentence's state on the tap is caught. Guidance: keep one pending slot, as `changeView` does, with no params key for a reveal, and let the layout effect fire a pending reveal whenever `listStart()` is not null.
- It must call `setSearchParams` never. A `changeView` made after a `reveal` and before its commit replaces it; a `reveal` made after a `changeView` replaces that.
- `rowsOf` serves both: a sentence element with no children is its own one row.

Tests in `viewParams.test.tsx`, with the file's `data-rect` stand-in: a stub whose button calls `reveal` with a control at `900,940` and a sentence at `950,970` scrolls once by `revealDelta`'s answer with the band read from the marked elements, and leaves the URL unchanged; a stub whose button sets state that renders the sentence and calls `reveal` in the same handler scrolls once, after the sentence has rendered; a control and sentence already in the band scroll by 0.

**Out of scope**

- Any form calling `reveal`: T2 and T3.
- A hook of its own for the reveal on Create or Save: never, ADR 097.
- A `scrollIntoView` on the target: never, ADR 097.

**Done when**

- `cd frontend && npx vitest run src/lib/viewParams.test.tsx src/lib/revealDelta.test.ts` passes, the three new reveal tests among them.
- `grep -c "reveal" frontend/src/lib/viewParams.ts` prints `3` or more.

**Debrief**

Evidence, in order:

- `cd frontend && npx vitest run src/lib/viewParams.test.tsx src/lib/revealDelta.test.ts` printed `Test Files  2 passed (2)`, `Tests  20 passed (20)`. The three reveal tests the Details name are "scrolls once inside the call when the sentence is rendered, and leaves the URL unchanged", "scrolls once after the sentence has rendered when the same handler sets its state" and "scrolls by 0 when the control and the sentence are already in the band".
- `grep -c "reveal" frontend/src/lib/viewParams.ts` printed `13`.

Commit checks over the whole frontend: `npx vitest run` printed `Test Files  61 passed (61)`, `Tests  699 passed (699)`; `npm run lint` printed no findings; `npm run build` built, with only the existing warning on chunk size.

Departures from guidance: none. Beyond the Details, the tests hold two more, "gives way to a changeView made before its commit" and "replaces a changeView made before its commit", pinning the constraint on which call replaces which. The stand-ins for `innerHeight`, `getBoundingClientRect` and `window.scrollBy` moved up from the `changeView` group to the file's outer `useViewParams` group, so the `reveal` group shares them; the `setParams` test runs under them too and reads none of them.

Read in the code: `reveal` and the layout effect in `useViewParams`. A reveal whose `listStart()` stays null stays pending until a later commit renders its element or a later `changeView` or `reveal` replaces it, as the Details state, so a form must pass a `listStart` that its own tap goes on to render.

### T2 — The library forms' tap of Create or Save

**Status**

- [x]

**Goal**

On New subject, Edit subject, New deck, Edit deck, New card and Edit card, Create or Save stays pressable while not ready, a tap brings the first part with a sentence on screen, and a subject's or a deck's name already taken renders beside the Name input and is brought on screen.

**Dependencies**

- T1: `reveal` on `useViewParams` in `frontend/src/lib/viewParams.ts`.

**Files**

- `frontend/src/components/library/SubjectForm.tsx`
- `frontend/src/components/library/SubjectForm.test.tsx`
- `frontend/src/components/library/DeckEditor.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`
- `frontend/src/components/library/CardStandaloneForm.tsx`
- `frontend/src/components/library/CardStandaloneForm.test.tsx`
- `docs/vocabulary.md`

**Details**

On every button in this task, ADR 097: Create or Save must carry `disabled` only while its request is in flight, `submitting`, `saving` or `checkingSaveImpact`, and `aria-disabled` whenever it is otherwise not ready, with the `aria-disabled:` classes `SubjectForm.tsx`'s button carries today, so a tap on a not-ready button fires.

New subject and Edit subject, in `SubjectForm.tsx`:

- `SubjectFormBody` reads `reveal` from `useViewParams`; the body is rendered inside a route in both its callers, the routed form and the deck form's overlay, so the hook is available. The form in the deck form's overlay must never call `reveal`, because the overlay scrolls on its own and `reveal` would scroll the deck form behind it.
- On submit with a blank name, the form must set `nameError` as today and then call `reveal` with the Name input as the control and the `nameError` element as the sentence.
- When the save is refused with the code `subject_name_taken`, the sentence `failureSentence` gives must render in `nameError`, beside the input, not in `formError`, and the form must call `reveal` for it; every other failure stays `formError`, the bar's sentence. Guidance: test `err instanceof ApiDetailError && err.detail.code === 'subject_name_taken'`, as `DeckConfigurationEditor.tsx` tests its own code.

New deck and Edit deck, in `DeckEditor.tsx`:

- Save must be `aria-disabled` while `!canSave`, and `disabled` only while `saving || checkingSaveImpact`. Undo keeps `disabled={!canUndo}`.
- On a tap of Save while `!valid`, a blank Deck name must set `nameError` to "Name is required.", and no subject chosen must set a new `subjectError` to "Choose a subject to create a deck.", rendered under the Subject picker as a `<span role="alert">` in `text-sm text-(--color-wrong)` and cleared when a subject is chosen. The form must call `reveal` for the first part in document order whose sentence shows: the Deck name input with `nameError`, else the Subject picker with `subjectError`, else the first field row whose error shows, with that row's "Field name" input as the control and its error `<p>` as the sentence. On a tap while valid and not dirty, it does nothing; the greyed Save already says nothing is unsaved.
- When the save is refused with the code `deck_name_taken`, its sentence must render under the Deck name input as a `<span role="alert">` in `text-sm text-(--color-wrong)`, held in a new `nameError` state cleared when the name is edited, as `DeckConfigurationEditor.tsx` holds its own, and the form must call `reveal` for it; every other failure stays `saveError`.

New card and Edit card, in `CardStandaloneForm.tsx`:

- Create or Save must be `aria-disabled` while `!canSubmit` and `disabled` only while `submitting`. On a tap of Create while `deckId` is null, the form must set a new `deckError` state and render it under the Deck picker as a `<span role="alert">` in `text-sm text-(--color-wrong)` reading "Choose a deck to create a card.", cleared when a deck is chosen, and call `reveal` with the picker's element as the control and the sentence as its row, both before `handleSubmit`'s early return, which stays. While a chosen deck's fields are still loading, no sentence shows and the tap moves nothing.
- `docs/vocabulary.md` gains one row, after the row for "Delete card", exactly:

```
| Card | A card's deck left unchosen | "Choose a deck to create a card." | New card | `deckError` |
```

Tests: in `SubjectForm.test.tsx`, a blank-name Create renders "Name is required." inside the Name input's label and calls `window.scrollBy` once, through a `vi.spyOn(window, 'scrollBy')`; a `subject_name_taken` refusal renders its sentence inside the label and not inside `[data-testid="form-bar"]`, and `scrollBy` is called once; a 500 renders in the bar and `scrollBy` is not called. In `DeckEditor.test.tsx`, Save on Edit deck with a blank field name is pressable, `aria-disabled="true"`, and a click calls `scrollBy` once; a `deck_name_taken` refusal renders under the Deck name input with `role="alert"` and not in the bar. In `DeckEditor.test.tsx`, Create on New deck with a blank Deck name and no subject chosen is `aria-disabled="true"`, and a click renders "Name is required." under the Deck name input and "Choose a subject to create a deck." under the Subject picker, each with `role="alert"`, and calls `scrollBy` once. In `CardStandaloneForm.test.tsx`, Create with no deck chosen is `aria-disabled="true"` and not `disabled`, and a click posts nothing, renders "Choose a deck to create a card." under the Deck picker with `role="alert"`, and calls `scrollBy` once. In all three test files, every existing assertion that Create or Save is disabled while not ready, `toBeDisabled()`, becomes an assertion of `aria-disabled="true"`, the "Saved ✓" button's included; Undo's stays.

**Out of scope**

- New card's sentence shown before the tap, as New practice shows its hints: never; it appears on the tap, as "Name is required." does.
- A sentence for Edit deck's Save when nothing has changed: never; the greyed Save says it.
- Moving "Name is required." or a field's error from where it sits: never here.
- New configuration, Edit configuration and New practice: T3.

**Done when**

- `cd frontend && npx vitest run src/components/library` passes, the new tests among them.
- `grep -c "aria-disabled" frontend/src/components/library/DeckEditor.tsx frontend/src/components/library/CardStandaloneForm.tsx` prints `1` or more for each file, and `grep -c "deck_name_taken" frontend/src/components/library/DeckEditor.tsx` prints `1`.

**Debrief**

Evidence, in order:

- `cd frontend && npx vitest run src/components/library` printed `Test Files  9 passed (9)`, `Tests  202 passed (202)`. The new tests are in the groups "SubjectForm — bringing the Name input and its sentence on screen", "DeckEditor — bringing a part of the form and its sentence on screen", and in "CardStandaloneForm — create mode", "a tap on Create with no deck chosen posts nothing, says so under the picker and moves the page once". Every `toBeDisabled()` on Create or Save in the three files is now `aria-disabled="true"`, "Saved ✓" included; Undo's stay. `SubjectForm.test.tsx` held none.
- `grep -c "aria-disabled" frontend/src/components/library/DeckEditor.tsx frontend/src/components/library/CardStandaloneForm.tsx` printed `2` for each file; `grep -c "deck_name_taken" frontend/src/components/library/DeckEditor.tsx` printed `1`.

Commit checks over the whole frontend: `npx vitest run` printed `Test Files  61 passed (61)`, `Tests  715 passed (715)`; `npm run lint` printed no findings; `npm run build` built, with only the existing warning on chunk size.

Browser check, headless Chromium against `localhost:5173`, by mouse, 390 wide, header bottom 114:

- `/subjects/new` at height 400, scrolled to the bottom, blank name: Create moved `scrollY` from 191 to 89, Name input at 114 to 160, "Name is required." at 166 to 186, bar top 319; a second tap moved the page by 0. A name a subject already has moved the page the same way, with the sentence under the input and not in the bar.
- `/decks/new` at height 844, name "Commands": the sentence rendered at 255 to 275 under the Deck name input and not in the bar, and left when the name was edited. With `POST /api/decks` aborted, "Couldn't reach Flashy. Check your connection and try again." rendered in the bar.
- `/decks/new` at height 400, scrolled to the bottom, blank Deck name and no subject: Create moved `scrollY` from 294 to 89, Deck name input at 114 to 160, "Name is required." at 166 to 186, "Choose a subject to create a deck." at 250 to 270, bar top 319; a second tap moved the page by 0. With a name typed, the first sentence left, and from the bottom Create moved `scrollY` from 320 to 147, the Subject picker at 114 to 160, its sentence at 166 to 186; choosing a subject cleared it. Nothing was posted.
- `/decks/{id}/edit`, "Commands", twelve fields, the last one's name cleared, from the top: Save moved `scrollY` from 0 to 523, the input at 673 to 719, "Name is required." at 731 to 763, bar top 763; a second tap moved the page by 0.
- `/cards/new`, no deck: Create rendered "Choose a deck to create a card." at 230 to 250, under the picker at 178 to 224, and posted nothing; choosing a deck cleared it.
- Screenshots: /tmp/claude-1000/-home-jadenlu-Projects-Flashy/a5cf6fb5-0dda-4784-b447-e36d1b55418a/scratchpad/deck-taken.png and /tmp/claude-1000/-home-jadenlu-Projects-Flashy/a5cf6fb5-0dda-4784-b447-e36d1b55418a/scratchpad/card-nodeck.png and /tmp/claude-1000/-home-jadenlu-Projects-Flashy/a5cf6fb5-0dda-4784-b447-e36d1b55418a/scratchpad/deck-unchosen.png.

Departures from guidance: none. Beyond the Details, the tests also pin a blank-name Save on Edit subject, Edit deck's Save with nothing changed moving nothing, the taken deck name's sentence leaving on an edit, a 500 on Edit deck, a chosen deck clearing the card's sentence, a tap while a chosen deck's fields load saying and moving nothing, a blank-name Create in the deck form's overlay showing its sentence and moving nothing, and an edit of the subject's name clearing its sentence.

The deck form's overlay, on the engineer's order, which added the Details' constraint: `FullScreenDialog` scrolls inside itself and `reveal` scrolls only the window, so `SubjectFormBody` takes `inOverlay`, which `DeckEditor` sets and which skips `reveal`. Measured after the change, a blank-name Create in the overlay left the deck form behind it where it was: at height 844, 261 before and after, with the sentence on screen at 157 to 177; at height 300 with the overlay scrolled to its foot, 394 before and after, with the sentence off screen at -78 to -58. That short-screen miss is what remains, and it stands open for a decision outside this cycle.

On the engineer's order, beyond the Details, editing a subject's name clears `nameError`, so both "Name is required." and "A subject with this name already exists." leave on an edit.

On the engineer's order, `docs/vocabulary.md` holds, beyond the row the Details give, one "A name left blank" row in place of the subject's and the field's, and a row for a subject left unchosen. `nameError` on the deck form also clears on Undo, which restores the name. A sentence for a taken name that still shows counts as the first part on a later not-ready tap.

For T3's browser check: Playwright's `locator.click` refuses an `aria-disabled` button and times out, so the script must click its coordinates through `page.mouse.click`.

Read in the code: `handleSaveClick` in `DeckEditor.tsx`, where a not-ready tap sets the name's and the subject's sentences and reveals the first part in order, and the first `[data-field-error]` under the field list gives a field's sentence and its row's `input` its control, and `SubjectFormBody`'s `revealName` in `SubjectForm.tsx`, for the overlay's exception.

### T3 — The configuration form's and New practice's tap of Create or Save

**Status**

- [x]

**Goal**

On New configuration, Edit configuration and New practice, Create or Save stays pressable while not ready, a tap brings the first part with a sentence on screen, a configuration's name already taken is brought on screen beside the Name input, and the cycle's judgement holds.

**Dependencies**

- T1: `reveal` on `useViewParams` in `frontend/src/lib/viewParams.ts`.
- T2: the `aria-disabled` pattern and the tests' `scrollBy` spy, which this task repeats.

**Files**

- `frontend/src/components/library/DeckConfigurationEditor.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx`
- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`

**Details**

New configuration and Edit configuration, in `DeckConfigurationEditor.tsx`, ADR 097:

- Create or Save must be `aria-disabled` while `!canSave` and `disabled` only while `saveMutation.isPending`.
- On a tap while not ready with a deck chosen, the form must call `reveal` for the hint `<p>` below the board: with the Name input as the control when the hint is the blank-name sentence, and the `div` wrapping `FieldAssignmentBoard` as the control when it is `validationError`. With no deck chosen no sentence shows, and the tap does nothing.
- On a `configuration_name_taken` refusal, which already renders in `nameError` beside the Name input, the form must call `reveal` for it.

New practice, in `PracticeCreatePage.tsx`:

- Create must be `aria-disabled` while `!canCreate` and `disabled` only while `createMutation.isPending`.
- On a tap while not ready, the form must call `reveal` for the first part in document order whose sentence shows: the Name input with "Give this practice a name to create it." when the name is blank; else the Selected heading with "Select at least one configuration to practice." when nothing is ticked. The sentences stay where they are.

Tests: in `DeckConfigurationEditor.test.tsx`, Create with a blank name on a chosen deck is `aria-disabled="true"` and a click calls `scrollBy` once; a `configuration_name_taken` refusal calls `scrollBy` once. In `PracticeCreatePage.test.tsx`, the test that Create is disabled with each unmet condition becomes that it is `aria-disabled="true"` and pressable, and a click with nothing ticked calls `scrollBy` once while posting nothing. In both test files, every other existing assertion that Create or Save is disabled while not ready, `toBeDisabled()`, becomes an assertion of `aria-disabled="true"`.

**Out of scope**

- "Give this configuration a name to create it." moved beside the Name input: never here; the reveal brings the input and the sentence on screen together.
- The sentence for "Select at least one configuration to practice." moved out of Selected: never here.

**Done when**

- `cd frontend && npx vitest run` passes over the whole frontend, and `grep -rl "useSearchParams" frontend/src --include=*.ts --include=*.tsx` prints `frontend/src/lib/viewParams.ts` alone.
- The cycle's judgement, in headless Chromium against `localhost:5173`, signed out of Clerk with `DEV_AUTH_USER_ID` and `ENV=development`, at 390 by 844, by mouse. The script prints each check and its output is the evidence:
  - On `/practice/new` with configurations in three or more decks and nothing ticked, scrolled so that the Selected heading's `getBoundingClientRect().top` is below `innerHeight`, a click on Create leaves the Selected heading's top at or below the header's bottom and the hint's bottom at or above the bar's top; a second click leaves `window.scrollY` unchanged.
  - On `/practice/new` with the Name input cleared and the page scrolled to the bottom, a click on Create leaves the Name input's top at or below the header's bottom and "Give this practice a name to create it." on screen.
  - On `/subjects/new` at a viewport height of 400, with the name blank and the page scrolled to the bottom, a click on Create renders "Name is required." under the Name input with its bottom at or above the bar's top.
  - On `/decks/new` with a name a deck already has and two fields, a click on Create renders "A deck with this name already exists." under the Deck name input and not inside `[data-testid="form-bar"]`; with `POST /api/decks` aborted through `page.route`, a click on Create renders "Couldn't reach Flashy. Check your connection and try again." inside the bar.
  - On `/decks/{id}/edit` with the deck "Commands", twelve fields, the last field's name cleared and the page scrolled to the top, a click on Save leaves that field's input top at or below the header's bottom and "Name is required." at or above the bar's top.
  - On `/cards/new` with no deck chosen, a click on Create renders "Choose a deck to create a card." under the Deck picker and posts nothing.
- A screenshot of `/decks/new` with the taken name's sentence under the input at 390 by 844, saved in the session scratchpad and named in the Debrief.

**Debrief**

Evidence, in order:

- `cd frontend && npx vitest run` printed `Test Files  61 passed (61)`, `Tests  722 passed (722)`; `grep -rl "useSearchParams" frontend/src --include=*.ts --include=*.tsx` printed `frontend/src/lib/viewParams.ts` alone.
- The cycle's judgement, in headless Chromium against `localhost:5173`, by mouse at 390 by 844 unless stated, header bottom 114, bar top 763:
  - `/practice/new`, configurations in six decks, nothing ticked, Selected heading at 1380, below `innerHeight`: Create left the heading at 715 to 735 and the hint at 741 to 763; a second click moved `scrollY` by 0.
  - `/practice/new`, name cleared, from the bottom: Create moved `scrollY` from 707 to 89, Name input at 114 to 160, "Give this practice a name to create it." at 166 to 186. Nothing was posted on this page.
  - `/subjects/new` at height 400, from the bottom: "Name is required." at 166 to 186 under the Name input at 114 to 160, bar top 319.
  - `/decks/new`, "Commands", two fields: "A deck with this name already exists." at 255 to 275 under the Deck name input at 203 to 249, none inside the bar; with `POST /api/decks` aborted, "Couldn't reach Flashy. Check your connection and try again." inside the bar.
  - `/decks/{id}/edit`, "Commands", twelve fields, last name cleared, from the top: input at 673 to 719, "Name is required." at 731 to 763.
  - `/cards/new`, no deck: "Choose a deck to create a card." at 230 to 250 under the picker at 178 to 224, `role="alert"`, nothing posted.
- Screenshot: /tmp/claude-1000/-home-jadenlu-Projects-Flashy/5f7373d6-e03c-412b-a0ff-225c9af8cfd8/scratchpad/deck-taken.png.

Commit checks over the whole frontend: `npx vitest run` as above; `npm run lint` printed no findings; `npm run build` built, with only the existing warning on chunk size.

The configuration form, beyond the Done when, same browser: `/deck-configurations/new` with no deck, Create moved 0; Edit configuration at height 500, a taken name, from the bottom, Name input at 115 to 161, sentence at 167 to 187, none in the bar.

What remains, on the engineer's decision to raise it as a question for a later cycle rather than fix it here: when a configuration's board is too tall to fit in the band with its sentence, the tap leaves the sentence off screen, so this task's Goal and the cycle's Outcome do not hold on those decks, and the Out of scope's "the reveal brings the input and the sentence on screen together" is false there. `revealDelta` puts the control on the band's top and the hint sits below the whole board.

- Blank name, Edit configuration, from the bottom, with the deck's GET response cut through `page.route` and two fields assigned: the hint is on screen at 727 to 747 before every tap, stays on screen after it at 2 and 3 fields, and is pushed off from 4 fields, at 761 to 781, and at 12 fields at 1083 to 1103. The real "Ports" deck, four fields with three assigned, fits, so the point depends on the assignments as well as the count.
- A board with a problem, New configuration, empty board, from the top, cut the same way: the sentence is off screen before the tap, on screen after it at 2 to 4 fields, and still off screen from 5 fields, at 755 to 795, and at 12 fields at 1031 to 1071.
- At height 500, on the real "Practiced" deck of two fields, a blank name leaves the hint at 696 to 716, under the bar at 419.
- The 11 and 12 rows of both sweeps measured the same, and why was not looked into.

The Goal's judgement has the Selected sentence above the screen; Selected is the page's last section, so scrolling down never takes it there, and at height 300 from the bottom it stays on screen and Create moved 0. The check used the Done when's position, below `innerHeight`.

Departures from guidance: none. Beyond the Details, the tests also pin a tap with a board not yet valid moving the page once, a tap with no deck chosen moving nothing, a failed save moving nothing, and a blank-name tap on New practice moving the page once, and the existing `toBeEnabled()` on Create or Save became an assertion that `aria-disabled` is absent, since `toBeEnabled()` no longer tells ready from not ready.

Read in the code: `handleSaveClick` in `DeckConfigurationEditor.tsx`, whose early return on a null `hintRef` keeps a tap while a chosen deck's fields load from leaving a reveal pending, and `submit` in `PracticeCreatePage.tsx`.
