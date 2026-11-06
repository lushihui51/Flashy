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

- [ ]

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

None.

### T3 — The configuration form's and New practice's tap of Create or Save

**Status**

- [ ]

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

None.
