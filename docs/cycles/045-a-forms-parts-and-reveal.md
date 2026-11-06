# 045 — A form's parts and reveal

Waits for: 042, its `DeckPicker` in `CardStandaloneForm` and `DeckConfigurationEditor`; 044, with which it shares `docs/vocabulary.md`.

Canvas: https://claude.ai/artifact/RmdrGW45QPn93XXcTmbzrJ

## Goal

Outcome: Every form draws each part with its sentence beside it and finds the first part to show in what it has drawn, a reveal moves the page or overlay the part sits in, and the configuration form's sentences sit at the Name input, the top of each side and each "Each card shows" row.

Scope: The cycle covers the reveal scrolling the nearest marked scroller of its sentence, `<html>` or a full-screen dialog's content, and reading only the marks inside it; `FormPart` and `SubmitButton` under `frontend/src/components/ui/`, with every form's Create or Save and every part with a sentence moved to them and the forms' reveal refs and first-problem chains dropped; `boardProblem` in the board module, with the configuration form's sentences at their parts; and a source scan that holds the forms to the two components. It leaves out the bar, cycle 038's, which keeps its room under the content in every state; every sentence's words; and the look of a sentence, which does not change.

Judgement: The engineer judges on the live server at 390 wide: on Edit configuration of a deck of five fields with the name cleared and the answer side emptied, scrolled to the foot, tapping Save brings the Name input and "Give this configuration a name to save it." on screen under the header; with a name typed, tapping Save brings the Answer side's top and "The answer side needs at least one field — always shown or random draw." on screen; with a field moved to the answer side's random draw and no count checked, "Check how many random answer fields each card shows." sits at that "Each card shows" row and Save brings it on screen; on New deck, with the browser 500 tall, New subject opened from the Subject picker and scrolled down, tapping Create moves the overlay to the Name input and "Name is required." and the deck form behind is where it was; on New practice, New card, New subject and New deck a not-ready Create still brings the first part with a sentence on screen; and `npx vitest run` passes with the source scan among the tests.

## Records

- ADR 097: One hook for a page's URL search params, that never resets scroll
- ADR 100: A measured header height and one component for a form's bar at the foot
- PDR 031: Failures met in place, up to the whole page, with one banner for the connection
- PDR 032: Cancel and Create or Save in a bar at the foot of every form

## Tasks

### T1 — The reveal's scroller

**Status**

- [ ]

**Goal**

A reveal scrolls the nearest marked scroller of its sentence, the page or the overlay the form sits in, and reads only the marks inside it, so a tap of Create on New subject over the deck form moves the overlay and leaves the deck form where it was.

**Dependencies**

None.

**Files**

- `frontend/index.html`
- `frontend/src/components/ui/FullScreenDialog.tsx`
- `frontend/src/lib/viewParams.ts`
- `frontend/src/lib/viewParams.test.tsx`
- `frontend/src/test/setup.ts`
- `frontend/src/components/library/SubjectForm.tsx`
- `frontend/src/components/library/SubjectForm.test.tsx`
- `frontend/src/components/library/DeckEditor.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`

**Details**

LCD11 and LPD23, under ADR 097:

- `<html>` in `frontend/index.html` must carry `data-reveal-scroller`, and `FullScreenDialog`'s `Dialog.Content` must carry it too; `frontend/src/test/setup.ts` must set it on `document.documentElement` for jsdom.
- In `viewParams.ts`, a reveal or a view change must take the nearest ancestor of the list or sentence element carrying `data-reveal-scroller`, through `closest`, throw an `Error` naming the mark when none is found, scroll that element by the computed delta, and read only the `[data-reveal-clear]` elements inside it for the band. There is no fallback to the window. Guidance: `document.documentElement.scrollBy` moves the window in Chromium, so one `scrollBy` on the scroller serves both; the band's top and bottom stay in viewport coordinates, since the dialog covers the viewport.
- `revealName` in `SubjectForm.tsx` must drop its `inOverlay` early return, and the `inOverlay` prop goes from `SubjectFormBody` and from `DeckEditor`'s overlay, since the scroller decides.
- Tests in `viewParams.test.tsx`: a reveal whose sentence sits inside an element marked `data-reveal-scroller` scrolls that element, not the window, and ignores a `data-reveal-clear` mark outside it; a reveal with no marked ancestor throws; the existing tests spy on `document.documentElement.scrollBy` where they spied on `window.scrollBy`. In `SubjectForm.test.tsx` and `DeckEditor.test.tsx`, the overlay's blank-name Create scrolls the dialog's content once and the window not at all.

**Out of scope**

- A fallback to `document.documentElement`, a React context, the scroller from computed `overflow-y`, or the caller passing the scroller: never, LCD11.
- `scrollIntoView`: never, ADR 097.
- `FormPart` and `SubmitButton`: T2.

**Done when**

- `cd frontend && npx vitest run src/lib/viewParams.test.tsx src/components/library/SubjectForm.test.tsx src/components/library/DeckEditor.test.tsx` passes.
- `grep -c "data-reveal-scroller" frontend/index.html frontend/src/components/ui/FullScreenDialog.tsx frontend/src/test/setup.ts` prints `1` for each.
- `grep -n "window.scrollBy\|inOverlay" frontend/src/lib/viewParams.ts frontend/src/components/library/SubjectForm.tsx frontend/src/components/library/DeckEditor.tsx` prints nothing.
- At 390 wide and 500 tall on the live server, on New deck with New subject opened from the Subject picker and scrolled down: tapping Create moves the overlay to the Name input and "Name is required.", and closing the overlay finds the deck form where it was.

**Debrief**

None.

### T2 — FormPart and SubmitButton

**Status**

- [ ]

**Goal**

Every form draws a part and its sentence through `FormPart` and its Create or Save through `SubmitButton`, which reveals the first marked sentence in its own scroller in the DOM's order, and New subject, New card and New practice have dropped their reveal refs and first-problem chains.

**Dependencies**

- T1: the scroller mark and `closest('[data-reveal-scroller]')`.

**Files**

- `frontend/src/components/ui/FormPart.tsx` (new)
- `frontend/src/components/ui/FormPart.test.tsx` (new)
- `frontend/src/components/ui/SubmitButton.tsx` (new)
- `frontend/src/components/ui/SubmitButton.test.tsx` (new)
- `frontend/src/lib/viewParams.ts`
- `frontend/src/lib/viewParams.test.tsx`
- `frontend/src/components/library/SubjectForm.tsx`
- `frontend/src/components/library/SubjectForm.test.tsx`
- `frontend/src/components/library/CardStandaloneForm.tsx`
- `frontend/src/components/library/CardStandaloneForm.test.tsx`
- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`
- `frontend/src/test/formParts.test.ts` (new)

**Details**

LCD15, under ADR 097 and PDR 031. `FormPart` in `FormPart.tsx`:

```ts
type FormPartProps = {
  /** The sentence about this part, or null for none. */
  sentence: string | null;
  /** `wrong`: a refusal or a blank required field, red, spoken as an alert. `aside`: a hint,
   * muted. Which sentence takes which look is what each form has today. */
  look: 'wrong' | 'aside';
  /** The part itself: its label and control. */
  children: ReactNode;
  className?: string;
};
```

- It must render a wrapper carrying `data-reveal-part` around `children`, then, with a sentence, a `p` carrying `data-reveal-sentence`, `role="alert"` and `text-sm` wrong colour for `wrong` and `text-sm` aside colour for `aside`, inside the same wrapper so the sentence's part is its nearest `[data-reveal-part]`. A `label` wrapping a control may be the part's child, so a sentence stays outside the label's accessible name.

`useViewParams` gains one function:

```ts
/** Reveals the first element marked `data-reveal-sentence`, in DOM order, inside the
 * nearest marked scroller of `from`, with that sentence's part as the control; nothing
 * when no sentence shows. Waits for a commit as `reveal` does. */
revealFirstSentence: (from: Element | null) => void;
```

`SubmitButton` in `SubmitButton.tsx`:

```ts
type SubmitButtonProps = {
  /** False reads not ready through `aria-disabled`; the button stays pressable. */
  ready: boolean;
  /** True while the request is in flight; the one state that sets `disabled`. */
  busy?: boolean;
  /** Runs on a tap while not ready, before the reveal; the form sets its sentences here. */
  onNotReady?: () => void;
  /** Runs on a tap while ready. For a `form` submit, the form's `onSubmit` runs instead. */
  onPress?: () => void;
  form?: string;
  children: ReactNode;
};
```

- It must render the yellow block the forms draw today, with their not-ready and busy looks; `disabled` only while `busy` (ADR 097); on a tap while not ready, call `onNotReady` and then `revealFirstSentence` with its own element; on a tap while ready, submit its `form` or call `onPress`.
- A refusal that names a part must use the same reveal: the form sets the part's sentence and calls `revealFirstSentence` with its root element.
- `SubjectForm`, `CardStandaloneForm` and `PracticeCreatePage` must draw every part with a sentence through `FormPart` and their Create or Save through `SubmitButton`, keep each sentence's look as it is today, and drop their reveal refs, their `nameErrorRef`, `deckErrorRef`, `nameHintRef`, `selectedHeadingRef` and `selectedHintRef`, and their first-problem chains; New practice's "Select at least one configuration to practice." is the Selected section's part. `DeckEditor` and `DeckConfigurationEditor` move in T3.
- The source scan, `frontend/src/test/formParts.test.ts`: reads the five form files by path, `SubjectForm.tsx`, `CardStandaloneForm.tsx`, `DeckEditor.tsx`, `DeckConfigurationEditor.tsx` and `PracticeCreatePage.tsx`, and asserts none contains the text `role="alert"` or `aria-disabled` and each imports `SubmitButton`; `DeckEditor.tsx` and `DeckConfigurationEditor.tsx` are listed with a `todo` until T3.
- Tests: `FormPart.test.tsx` covers the marks and the two looks; `SubmitButton.test.tsx` covers `aria-disabled`, `disabled` only when busy, `onNotReady` then one scroll of the scroller, and the first sentence chosen by DOM order over two shown; `viewParams.test.tsx` covers `revealFirstSentence` finding the first sentence and the part, and nothing with none; the three forms' existing reveal tests keep passing with the refs gone.

**Out of scope**

- `DeckEditor` and `DeckConfigurationEditor`: T3.
- A form library, or `FormPart` registering through a context: never, LCD15.
- Any sentence's words or look changed: never; cycle 039 placed each.

**Done when**

- `cd frontend && npx vitest run src/components/ui/FormPart.test.tsx src/components/ui/SubmitButton.test.tsx src/lib/viewParams.test.tsx src/components/library/SubjectForm.test.tsx src/components/library/CardStandaloneForm.test.tsx src/pages/PracticeCreatePage.test.tsx src/test/formParts.test.ts` passes, with the two `todo` cases reported as such.
- `grep -n "nameErrorRef\|deckErrorRef\|nameHintRef\|selectedHintRef\|aria-disabled" frontend/src/components/library/SubjectForm.tsx frontend/src/components/library/CardStandaloneForm.tsx frontend/src/pages/PracticeCreatePage.tsx` prints nothing.

**Debrief**

None.

### T3 — The deck and configuration forms' parts

**Status**

- [ ]

**Goal**

The deck form and the configuration form draw every part and sentence through `FormPart` and their Save through `SubmitButton`, and the configuration form's sentences sit at the Name input, the top of each side and each "Each card shows" row, the first in page order brought on screen by a tap.

**Dependencies**

- T2: `FormPart`, `SubmitButton`, `revealFirstSentence`.

**Files**

- `frontend/src/lib/deckConfigurationBoard.ts`
- `frontend/src/lib/deckConfigurationBoard.test.ts`
- `frontend/src/components/library/FieldAssignmentBoard.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx`
- `frontend/src/components/library/DeckEditor.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`
- `frontend/src/test/formParts.test.ts`
- `docs/vocabulary.md`

**Details**

Drawings 4 and 31 are the configuration form. LCD14 and LPD21, in `deckConfigurationBoard.ts`:

```ts
export const BOARD_PARTS = ['prompt_side', 'prompt_counts', 'answer_side', 'answer_counts'] as const;
export type BoardPart = (typeof BOARD_PARTS)[number];
export type BoardProblem = { part: BoardPart; sentence: string };

/** The board's first problem in page order, prompt side, prompt counts, answer side,
 * answer counts, or null when the board can be saved. */
export function boardProblem(state: BoardState): BoardProblem | null;
```

- It replaces `boardValidationError`, which goes; the four sentences stay word for word. A side with no field is that side's problem; a random draw with no count checked is that side's counts' problem; the order is the page's, so an empty prompt side is reported before an unchecked answer count.
- `FieldAssignmentBoard` gains `problem: BoardProblem | null` and must draw the sentence in that part's place through `FormPart` with the `aside` look it has today: a side's at the top of its side card under the heading, with the side card as the part; a counts' at its "Each card shows" row, with the row as the part (LPD21; drawings 4 and 31).
- `DeckConfigurationEditor` must show a blank name's sentence under the Name input first, through `FormPart`, and otherwise hand `boardProblem(board)`'s result to the board; its `hintRef`, `boardRef`, `nameErrorRef` and the hint under the board go, its Create or Save is `SubmitButton`, and `configuration_name_taken` renders in the Name part and reveals through `revealFirstSentence`. A tap of a not-ready Create or Save brings the first part with a sentence on screen, with its sentence (LPD21).
- `DeckEditor` must draw the Deck name part, the Subject part and each field's sentence through `FormPart`, its Save through `SubmitButton`, and drop `nameErrorRef`, `subjectErrorRef`, `fieldsRef`'s `querySelector('[data-field-error]')` and the chain in `handleSaveClick`; a field's "Name is required." or "Duplicate name" is that field's row's part. Undo and Done keep their buttons.
- The bar's room under the content must keep holding in every state of the bar on both forms, as `FormBar` holds it today (LPD22).
- Tests: `deckConfigurationBoard.test.ts` replaces `boardValidationError`'s tests with `boardProblem`'s, order included; `DeckConfigurationEditor.test.tsx` adds that a blank name's sentence renders under the Name input and the side's at the top of the side, that with both wrong the name's is revealed first and, once a name is typed, the side's, and that a "Check how many…" sentence renders inside its "Each card shows" row; `DeckEditor.test.tsx`'s reveal tests keep passing with the refs gone; `formParts.test.ts` drops its two `todo`s.

`docs/vocabulary.md`: the four rows whose Code reads `` `boardValidationError` `` take `` `boardProblem` ``, and the rows "The prompt side with no field" and "The answer side with no field" gain Where "at the top of the side", the two "Check how many…" rows Where "at the side's Each card shows row", and the two "with a blank name" rows Where "under the Name input".

**Out of scope**

- One function answering for the Name part, or the board reporting problems by callback: never, LCD14.
- The sentence in the bar: never, LPD21.
- Repeated taps stepping through problems: never, LCD14; each tap shows the first.

**Done when**

- `cd frontend && npx vitest run src/lib/deckConfigurationBoard.test.ts src/components/library/DeckConfigurationEditor.test.tsx src/components/library/DeckEditor.test.tsx src/test/formParts.test.ts` passes with no `todo`.
- `grep -rn "boardValidationError" frontend/src docs/vocabulary.md` prints nothing.
- `grep -n "data-field-error\|aria-disabled\|role=\"alert\"" frontend/src/components/library/DeckEditor.tsx frontend/src/components/library/DeckConfigurationEditor.tsx` prints nothing.
- At 390 wide on the live server: on Edit configuration of a deck of five fields with the name cleared and the answer side emptied, scrolled to the foot, Save brings the Name input and "Give this configuration a name to save it." on screen under the header; with a name typed, Save brings the Answer side's top and its sentence on screen; with a field in the answer side's random draw and no count checked, "Check how many random answer fields each card shows." sits at that "Each card shows" row and Save brings it on screen; at 500 tall on New deck with New subject opened over it and scrolled down, Create moves the overlay to the Name input and the deck form behind stays; on New practice, New card, New subject and New deck a not-ready Create brings the first part with a sentence on screen; scrolled to the foot of each form, the bar covers nothing; and `cd frontend && npx vitest run` passes.

**Debrief**

None.
