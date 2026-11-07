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

- [x]

**Goal**

A reveal scrolls the nearest marked scroller of its sentence, the page or the overlay the form sits in, and reads only the marks inside it, so a tap of Create on New subject over the deck form moves the overlay and leaves the deck form where it was.

**Dependencies**

None.

**Files**

- `frontend/index.html`
- `frontend/src/components/ui/FullScreenDialog.tsx`
- `frontend/src/lib/revealDelta.ts`
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

Done when:

- `npx vitest run src/lib/viewParams.test.tsx src/components/library/SubjectForm.test.tsx src/components/library/DeckEditor.test.tsx`: 3 files passed, 116 tests passed.
- `grep -c "data-reveal-scroller"` printed `1` for each of `frontend/index.html`, `frontend/src/components/ui/FullScreenDialog.tsx` and `frontend/src/test/setup.ts`.
- `grep -n "window.scrollBy\|inOverlay"` over the three files printed nothing.
- Live, New deck with New subject opened over it, in headless Chromium, driven by the mouse. The page behind was first scrolled to 120, the overlay then scrolled to its foot.
  - At 390 by 500: the overlay overflows by only 9 pixels, so at its foot the Name input (96 to 142) already sits in the band above the bar (top 419). Create showed "Name is required." at 148 to 168, the scroll delta was 0 and the overlay stayed at 9. The overlay does not move at this size, because nothing it must show is off screen. The window stayed at 120 and was still at 120 after Cancel closed the overlay.
  - At 390 by 300, added because 500 tall cannot show movement: the overlay moved from 209 to 105, the Name input landed at 0 to 46 and the sentence at 52 to 72, above the bar (top 219). The window stayed at 120 and was still at 120 after the overlay closed.
  - Also added, the page as scroller: routed New subject at 390 by 300, scrolled to its foot, Create moved the window from 291 to 89 with the Name input at 114, under the header.

Commit checks over the whole frontend: `npx vitest run` 70 files and 838 tests passed; `npm run lint` clean; `npm run build` exit 0.

Departures from guidance: none. Additions the file does not state:

- `frontend/src/test/setup.ts` stubs `Element.prototype.scrollBy`, which jsdom lacks, and makes `document.documentElement.scrollBy` call `window.scrollBy`, as Chromium does. `CardStandaloneForm.test.tsx`, `DeckConfigurationEditor.test.tsx` and `PracticeCreatePage.test.tsx` spy on `window.scrollBy` and are outside these Files; they stay green unchanged, and their spies still see only a page reveal.
- `frontend/src/lib/revealDelta.ts` joined Files with the engineer's approval, for its interface comment alone, which named `window.scrollBy`.
- The existing DeckEditor test "moves nothing" is replaced by the overlay test the Details name. The "no marked ancestor" test calls `reveal` on a detached element through `renderHook`.

Read in the code: nothing beyond the Debrief. The 500-tall result above bears on the cycle's Judgement and on T3's Done when, whose New deck line says Create moves the overlay at 500 tall; the Name input and the sentence are on screen there, with no movement.

### T2 — FormPart and SubmitButton

**Status**

- [x]

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

Done when:

- `npx vitest run` over the seven named files: 7 files passed, 157 tests passed, 2 todo, the two being `DeckEditor.tsx` and `DeckConfigurationEditor.tsx` in `formParts.test.ts`.
- The `grep -n` over the three forms printed nothing, exit 1.

Commit checks over the whole frontend: `npx vitest run` 73 files passed, 857 tests passed, 2 todo; `npm run lint` clean; `npm run build` exit 0.

Live, in headless Chromium by the mouse at 390 by 300, the bar's top at 219, no page errors:

- New subject, scrolled to the foot: Create moved the window from 291 to 63, "Name is required." at 192 to 212. Enter in the Name input gave the same result and stayed on the page. A taken name gave the same place with "A subject with this name already exists."
- New subject over New deck: Create moved the overlay from 209 to 79, the sentence at 78, and the window stayed at 120.
- New card, at the foot: "Choose a deck to create a card." appeared at 193 to 213, in view, with the window unmoved at 37.
- New practice with a blank name, at the foot: Create moved the window from 1471 to 63, the name's sentence at 192 to 212, over the Selected sentence also showing. With a name and nothing selected, the Selected sentence was already in view at 181 to 203 and nothing moved.

Departures from guidance: none. Additions and consequences the file does not state:

- `FormPart`'s `aside` look is `text-sm`, but "Select at least one configuration to practice." is `text-body` today, and the file also says no sentence's look changes. Both constraints hold: `PracticeCreatePage` overrides the size on that one sentence through the wrapper's `className`, and Chromium measures it at 15px over 22.5px, its size before this task. A one-pixel change to `text-sm` would drop the override.
- The scan forbids `role="alert"` in the form files, so the sentences that are not about a part also go through `FormPart`, with no children: "Could not load this subject.", "Could not load this card." and "Could not load configurations."
- "Could not load configurations." therefore carries the sentence mark. With a name typed, nothing selected and the list failed, Create now brings that sentence on screen rather than the Selected section's.
- `ConfigurationPickList`'s row sentence, the stale configuration's, keeps its own `role="alert"` and no mark, since that file is outside Files. A tap never reveals it, as before; its refusal moved nothing before this task either.
- Two tests in `SubjectForm.test.tsx` asserted the sentence sits inside the label. The Details put it outside, so they now assert it sits in the Name input's part and outside the label.
- `handleSubmit` in `SubjectForm` no longer checks for a blank name: Enter reaches `SubmitButton` as a click on the form's default button, which the live run above shows.
- `revealFirstSentence` always asks for a commit through a reducer in `useViewParams`, and looks once on that commit. This chooses after a sentence set in the same tap, still scrolls on a tap that changes nothing, and never fires later when a sentence appears with no tap behind it.

Read in the code: the Selected section in `PracticeCreatePage`, for the size override above.

### T3 — The deck and configuration forms' parts

**Status**

- [x]

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

Done when:

- `npx vitest run` over the four named files: 4 files passed, 143 tests passed, no `todo`.
- `grep -rn "boardValidationError" frontend/src docs/vocabulary.md` printed nothing, exit 1.
- The `grep -n` over `DeckEditor.tsx` and `DeckConfigurationEditor.tsx` printed nothing, exit 1.
- Live, in headless Chromium by the mouse, no page errors. The header's bottom is at 114. Edit configuration ran at 390 by 844, its bar's top at 763:
  - Name cleared and the answer side emptied, at the foot: Save moved the window from 133 to 98, the Name input at 140 to 186 and "Give this configuration a name to save it." at 192 to 212. The answer side's sentence did not show.
  - With a name typed, at the foot: the Answer side's card at 515 to 747 and its sentence at 556 to 606, under the heading and above "Always shown". They were already on screen, so Save moved nothing. At 390 by 500 from the top of the page, Save moved the window from 0 to 485, the card's top at 187 and the sentence at 228 to 278, above the bar's top at 419.
  - A field in the answer side's random draw with no count checked: the "Each card shows" row at 669 to 688 and the sentence right under it at 700 to 740. From the top of the page, Save moved the window from 0 to 134, the sentence at 723 to 763.
  - **The 500-tall line does not hold as written; it needs your judgement.** New deck at 390 by 500, page at 120, New subject over it at its foot: the overlay overflows by 9 pixels, so the Name input (96 to 142) and "Name is required." (148 to 168) are on screen at its foot and Create moved it 0. A reveal moves only as far as it takes, so I changed no code for this. At 390 by 300 Create moved the overlay from 209 to 79, the Name input at 26 to 72 and the sentence at 78 to 98. The window stayed at 120 in both, and after the overlay closed.
  - A not-ready Create from the foot: New practice with the name cleared, 927 to 63, sentence at 192 to 212. New card at 300 tall, sentence at 193 to 213, in view, window unmoved. New subject at 300 tall, 291 to 63, sentence at 192 to 212. New deck at 500 tall, 194 to 63, sentence at 192 to 212. New deck with a field's name blanked, at 500 tall: the sentence at 247 to 279, in view, window unmoved.
  - The bar at the foot, lowest content against the bar's top: New practice 747 against 763, New card 187 against 219, New subject 170 against 219, New deck 338 against 419, Edit configuration 390 against 419. With a failed save's sentence in the bar: New deck 290 against 371, Edit configuration 342 against 371.
- `npx vitest run`: 73 files passed, 864 tests passed.

Commit checks over the whole frontend: `npx vitest run` as above; `npm run lint` clean; `npm run build` exit 0.

**A row the check wrote to the dev database.** My script tapped Create on New deck expecting it not to be ready, but the form starts with Term and Definition filled in, so it saved a deck: "X", id `064674c2-ffc3-4d41-8fbc-9284d5c04c0f`, in subject CompTIA A+, no cards. AGENTS.md forbids deleting rows after a browser check, so it is still there, for you to keep or delete. From then on the script failed every write in the browser with a 500, and the failed-save results above come from that.

How the check was set up: no seeded configuration belongs to a deck of five fields, and I wrote none. The browser served Edit configuration a made-up configuration on the real deck Reformer Repertoire, which has five fields, and no Save reached the server.

Departures from guidance: none. Consequences and additions the file does not state:

- New configuration now says the name first. A new form's name stays blank until both sides have a field, so with a deck chosen it reads "Give this configuration a name to create it." where it used to read the prompt side's sentence, and a tap with only the prompt side filled still asks for a name. The Details require this. "Create reads not ready…" in `DeckConfigurationEditor.test.tsx` now types a name first, to reach each board sentence.
- A side's sentence comes after the side's two areas in the DOM and is drawn above them through `order-1`. `FormPart` draws its sentence after its children, and the whole side card must be the part. A screen reader therefore reads the sentence after the areas, while the screen shows it under the heading. The other way to keep the sentence's place is a change to `FormPart`, which is outside Files.
- Each field's "Name is required." and "Duplicate name" now carry `role="alert"`, as `FormPart`'s `wrong` look has it; they had none, so a screen reader now announces them.
- The Name input on the configuration form lost `aria-describedby`, since `FormPart` gives its sentence no id. It keeps `aria-invalid`, and the sentence is still announced as an alert.
- "Could not load this deck." and "Could not load this deck configuration." go through `FormPart` with no children, since the scan forbids `role="alert"` in these files, so they carry the sentence mark.
- Drawings 4 and 31 draw the Name above the Deck and "Not used" below the sides. The form has the Deck first and "Not used" above the sides, and I left that order as it is: the Details place only the sentences, and cycle 027 kept the same order. Moving them would not change which sentence comes first.
- Two tests in `DeckEditor.test.tsx` asserted the sentence sits inside the label. They now assert it sits in the input's part and outside the label, as T2 did for `SubjectForm`. A new test covers a field's row as its part.
- `docs/vocabulary.md` quotes "Each card shows" inside the Where text, as `docs/rules/vocabulary-rules.md` requires of words on screen.

Read in the code: `sideCard` in `FieldAssignmentBoard.tsx`, for the `order-1` above.
