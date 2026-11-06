# 038 — Every form's bar

Canvas: https://claude.ai/artifact/2ngiLNda9GyuuMkty6fGtu

## Goal

Outcome: On every form, Cancel and Create or Save sit in one bar fixed at the foot of the screen, the same however the form was opened, with the form's heading at the top of the page scrolling with it; New practice's "N selected" sits on its own line above the buttons, a failed Create or Save puts its sentence in the bar above the buttons until the user tries again, and Edit deck's bar holds Done or Cancel, then Undo, then Save, which reads "Saved ✓" for a moment after a save.

Scope: The cycle covers one component for the bar, `FormBar`, fixed to the viewport's foot, measuring its own height for a spacer in the page's flow, carrying the mark a reveal clears, and holding the buttons, the count and the sentence; the nine routed forms, New subject, Edit subject, New deck, Edit deck, New card, Edit card, New configuration, Edit configuration and New practice, and New subject opened over the deck form, each rendering its buttons in that bar and its heading at the top of the page; the failed save's sentence moving from the top of the form, or from above New practice's list, into the bar; and the retirement of the sticky row component, which no page then uses. It leaves out the page moving to a sentence off screen when Create or Save is tapped, and a refusal that names one part of the form rendering beside that part, both the next cycle's; the filters' and pickers' open list, cycle 37's; the bar's width on a wide screen, an open question; and every word, return address and confirm, none of which changes.

Judgement: The engineer judges on the live server at 390 wide: each of the ten forms shows the bar at the foot as drawings 27 to 31 and 36 draw it, with the heading at the top of the page; on Edit card for a deck with twelve fields, scrolling to the last field keeps the bar at the foot and scrolls the heading away, and the last field is not hidden behind the bar; New subject, shorter than the screen, shows the bar at the foot too, and the same bar over New deck from "New subject…"; with the connection banner showing, the side menu still starts under the header; New practice reads "3 selected" above the buttons as drawings 32 and 33 have it, and a failed Create shows its sentence in the bar as drawings 34 and 35 have it; Edit deck matches drawings 36 and 37, and after a save its button reads "Saved ✓" then "Save" as drawing 38 has it; a filter change on New practice still brings the list's first rows into view clear of the bar.

## Records

- PDR 020: A block for everything that can be tapped
- PDR 032: Cancel and Create or Save in a bar at the foot of every form
- ADR 097: One hook for a page's URL search params, that never resets scroll
- ADR 100: A measured header height and one component for a form's bar at the foot
- ADR 101: Every length in a component measured, derived, or a fixed design size in rem

## Tasks

### T1 — The bar component and the band's foot

**Status**

- [ ]

**Goal**

The app has one `FormBar`, fixed to the viewport's foot, that holds a form's buttons, its count and its failed save's sentence, keeps a spacer of its own height in the page's flow, and is cleared by a reveal through the band's bottom.

**Dependencies**

None.

**Files**

- `frontend/src/components/ui/FormBar.tsx` (new)
- `frontend/src/components/ui/FormBar.test.tsx` (new)
- `frontend/src/index.css`
- `frontend/src/lib/viewParams.ts`
- `frontend/src/lib/viewParams.test.tsx`
- `frontend/src/lib/revealDelta.ts`
- `frontend/src/lib/revealDelta.test.ts`

**Details**

The component, ADR 100, new at `frontend/src/components/ui/FormBar.tsx`:

```tsx
type FormBarProps = {
  /** The sentence of a failed Create or Save, above the buttons, until the caller clears it. */
  sentence?: string | null;
  /** One line directly above the buttons, New practice's "N selected". */
  count?: string | null;
  /** The buttons, in reading order: Cancel or Done first, Create or Save last. */
  children: ReactNode;
};

export default function FormBar({ sentence, count, children }: FormBarProps): ReactNode;
```

- It must render two elements: a spacer in the page's flow where the component is placed, `aria-hidden`, whose height is the bar's measured height; and the bar itself, `fixed inset-x-0 bottom-0 z-10`, with `data-reveal-clear` and `data-testid="form-bar"`.
- The bar's look, drawings 27 to 38: ground background, `px-4 pt-3 pb-4`, a 1.5px line-coloured rule along its top through a new `index.css` utility, exactly:

```css
@utility ruled-top-line {
  border-top: 1.5px solid var(--color-line);
}
```

Its children stack in a column with `gap-2`: the sentence when set, `<p role="alert">` in `text-sm text-(--color-wrong) text-center`; the count when set, `text-label text-(--color-aside) text-center`; then the buttons in a row, `flex items-center gap-2.5`. The buttons are the callers'; the bar styles none of them.

- It must measure its own height with a `ResizeObserver` on the bar, inside `useLayoutEffect`, and write it to the spacer's inline height as `${height}px`, a measurement ADR 101 allows; the observer fires again as the sentence and the count come and go. It writes nothing to the document root.
- `z-10` keeps it beneath the drawer's and the sheets' scrims, `z-20` and above, as ADR 100 has it, and above the page's content.
- It renders no words of its own and takes no `className`.

The band's foot, ADR 097, in `viewParams.ts` and `revealDelta.ts`:

- `RevealInput` must lose `viewportHeight` and gain `bandBottom`, the band's bottom edge in viewport coordinates; `revealDelta` uses it everywhere it used `viewportHeight`, and its tests read `bandBottom`.
- `bandTop()` becomes a function returning both edges, `{ top, bottom }`, starting from `0` and `window.innerHeight`. For each `[data-reveal-clear]` element it reads `getComputedStyle`: when `bottom` is not `'auto'`, the element is stuck at the foot and lowers the band's bottom to its rect's top, taking the least; otherwise its numeric `top` plus its height raises the band's top, taking the greatest. The side must be read from `bottom` first, as ADR 097 decides.
- Tests in `viewParams.test.tsx`, with the file's `data-rect` stand-in for layout: a marked element with `style={{ bottom: '0px' }}` and `data-rect="754,844"` lowers the band's bottom to 754, so a row whose bottom is 800 scrolls into view above it; a marked element with both `top: '754px'` and `bottom: '0px'` is read as the foot and raises the band's top by nothing; the existing tests keep passing with `innerHeight` as the bottom when no element is marked at the foot.

**Out of scope**

- Any form rendering the bar: T2 and T3.
- `reveal()` for a tap of Create or Save, and the not-ready button's `aria-disabled`: the next cycle.
- A second mark for an element stuck at the foot: never, ADR 097.
- A root CSS variable for the bar's height: never, ADR 100.

**Done when**

- `cd frontend && npx vitest run src/components/ui/FormBar.test.tsx src/lib/viewParams.test.tsx src/lib/revealDelta.test.ts src/test/pxLiterals.test.ts src/test/theme.test.ts src/test/stickyOffset.test.ts` passes, with tests in `FormBar.test.tsx` that the bar carries `data-reveal-clear`, that the sentence renders with `role="alert"` above the count, which renders above the children, and that neither renders when null; and the two new band tests in `viewParams.test.tsx`.
- `grep -c "^@utility ruled-top-line" frontend/src/index.css` prints `1`, and `grep -c "viewportHeight" frontend/src/lib/revealDelta.ts frontend/src/lib/viewParams.ts` prints `0` for each file.

**Debrief**

None.

### T2 — The library and configuration forms' bars

**Status**

- [ ]

**Goal**

New subject, Edit subject, New subject over the deck form, New deck, Edit deck, New card, Edit card, New configuration and Edit configuration render Cancel and Create or Save in the bar, their heading at the top of the page, and their failed save's sentence in the bar.

**Dependencies**

- T1: `FormBar` in `frontend/src/components/ui/FormBar.tsx`.

**Files**

- `frontend/src/components/library/SubjectForm.tsx`
- `frontend/src/components/library/SubjectForm.test.tsx`
- `frontend/src/components/library/DeckEditor.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`
- `frontend/src/components/library/CardStandaloneForm.tsx`
- `frontend/src/components/library/CardStandaloneForm.test.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx`

**Details**

On each of the four forms, PDR 032 and ADR 100, drawings 28 to 31 and 35 to 38:

- The heading must be the first child of the form's page content, an `h1` with the classes the library page's heading has in `frontend/src/pages/LibraryPage.tsx`, and scroll with the page.
- `FormBar` must be the last child of the form's page container, after the Delete button where there is one, so its spacer sits where the content ends; the dialogs are portals and may stand after it. Its `sentence` is the form's failed save state, `formError` in `SubjectForm.tsx` and `CardStandaloneForm.tsx`, `saveError` in `DeckEditor.tsx` and `DeckConfigurationEditor.tsx`, and the `<p role="alert">` that renders it at the top of the form today leaves. `DeckConfigurationEditor.tsx`'s `nameError` stays beside the Name input, as it is.
- The buttons in the bar, drawings 28 to 31: Cancel as a white block, `tappable shrink-0 h-action rounded-2xl bg-(--color-surface) px-4.5 text-action font-semibold text-(--color-ink)`; Create or Save as the yellow block filling the rest, `tappable flex-1 h-action rounded-2xl bg-(--color-main-action) px-4.5 text-action font-semibold text-(--color-ink)`, with the same `disabled:` and `aria-disabled:` variants each button carries today. Which button is `disabled`, `aria-disabled` or pressable does not change in this cycle.
- Edit deck, drawings 36 to 38: Done or Cancel first, both as the white block, then Undo as a white block, then Save filling the rest; `showDone`, `canUndo`, `canSave` and `savedFlash` keep their meaning, so Undo and Save greyed read as drawing 38 has them and the button reads "Saved ✓" as today. New deck shows Cancel and Create only.
- `SubjectFormBody` loses its `stickyRow` prop; the routed form and the deck form's overlay render the same body, and the body's `FormBar` inside `FullScreenDialog`'s content is fixed to the viewport while its spacer sits in the overlay's own flow, ADR 100. `StickyPageRow` leaves every file in this task's Files; T3 deletes it.
- `CardStandaloneForm.tsx`'s and `SubjectForm.tsx`'s outer container keeps its `gap-4`, which now spaces the heading, the sentence's old place having left, and the fields.

Tests: in `SubjectForm.test.tsx` and `CardStandaloneForm.test.tsx`, the "heading row" tests become: the heading is not inside any `[data-reveal-clear]`, and the element `[data-testid="form-bar"]` holds Cancel and Create or Save; a failed save's sentence renders inside that element. In `DeckEditor.test.tsx`, the overlay test asserts the "New subject" dialog holds a `[data-testid="form-bar"]` with Cancel and Create, and a new test reads the bar's buttons on Edit deck in order as Done, Undo, Save, and as Cancel, Undo, Save once a field is renamed. In `DeckConfigurationEditor.test.tsx`, the failed save's `alert` is found inside the bar.

**Out of scope**

- A not-ready Create or Save kept pressable with `aria-disabled`, and the page moving to a sentence off screen: the next cycle.
- "A subject with this name already exists." and "A deck with this name already exists." beside the Name input: the next cycle; this cycle puts them in the bar with every other failed save.
- New practice: T3.
- The fields on New deck and Edit deck as drawings 29, 36, 37 and 38 draw them, one card per field with "Field name" and "Field type" labels in 29 and plain rows with "Text" as a word in 36 to 38, and "Add field" at the right in 29: never here; the drawings differ from each other and the fields' layout is an unsettled decision.
- A card's values as tall boxes, as drawings 30 and 35 draw them: never here, an unsettled decision.
- "Delete deck" at the size drawing 36 draws it: never here; it keeps today's size.
- The bar's width on a wide screen: an open question.

**Done when**

- `cd frontend && npx vitest run src/components/library src/components/ui/FormBar.test.tsx src/test/pxLiterals.test.ts` passes.
- `grep -c "StickyPageRow" frontend/src/components/library/SubjectForm.tsx frontend/src/components/library/DeckEditor.tsx frontend/src/components/library/CardStandaloneForm.tsx frontend/src/components/library/DeckConfigurationEditor.tsx` prints `0` for each file, and `grep -c "FormBar" frontend/src/components/library/SubjectForm.tsx frontend/src/components/library/DeckEditor.tsx frontend/src/components/library/CardStandaloneForm.tsx frontend/src/components/library/DeckConfigurationEditor.tsx` prints `2` or more for each.

**Debrief**

None.

### T3 — New practice's bar and the sticky row's retirement

**Status**

- [ ]

**Goal**

New practice renders Cancel and Create in the bar with "N selected" on its own line above them and a failed Create's sentence above that, its heading at the top of the page, no page uses the sticky row component, which leaves the repository, and the cycle's judgement holds.

**Dependencies**

- T1: `FormBar` in `frontend/src/components/ui/FormBar.tsx`.
- T2: the four other forms no longer import `StickyPageRow`.

**Files**

- `frontend/src/pages/PracticeCreatePage.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`
- `frontend/src/components/ui/StickyPageRow.tsx` (deleted)
- `frontend/src/components/ui/StickyPageRow.test.tsx` (deleted)

**Details**

New practice, PDR 032, drawings 27, 32, 33 and 34, in `PracticeCreatePage.tsx`:

- The heading must be the first child of the page's content, an `h1` with the library page's heading classes, as T2 has it, and the sections below it keep the order cycle 36 gave them.
- `FormBar` must be the last child of the page container, with Cancel as the white block and Create as the yellow block filling the rest, in T2's classes; Create's `disabled` handling does not change in this cycle.
- "N selected" must be the bar's `count`, `${selectedCount} selected` while one or more configurations are chosen and null with none, on its own line directly above the buttons, drawings 32 and 33; the count beside Create leaves.
- The bar's `sentence` must be `saveError ?? topError`: the failed Create's sentence and the sentence for a chosen configuration that no longer exists, both of which name no row still on the page; the two `<p role="alert">` above the list leave. With both the sentence and the count showing, the sentence stands above the count, drawing 34. `rowError` stays on its row, and "Could not load configurations." stays where the list would be.
- `StickyPageRow.tsx` and `StickyPageRow.test.tsx` are deleted; `src/test/stickyOffset.test.ts` stays, since the header is still sticky.

Tests, in `PracticeCreatePage.test.tsx`: the test that a failure renders as a banner above the list becomes that it renders inside `[data-testid="form-bar"]`; the selection-count tests find "3 selected" inside the bar; the three order tests from cycle 36 keep passing.

**Out of scope**

- Create kept pressable while not ready, and the page moving to "Give this practice a name to create it." or "Select at least one configuration to practice." when it is tapped: the next cycle.
- The filters as a panel over a dimmed page, drawings 27 and 32 to 34 showing them closed: cycle 37.
- Any word on the page: never here.

**Done when**

- `grep -rn "StickyPageRow" frontend/src` prints nothing.
- `cd frontend && npx vitest run` passes over the whole frontend.
- The cycle's judgement, in headless Chromium against `localhost:5173`, signed out of Clerk with `DEV_AUTH_USER_ID` and `ENV=development`, at 390 by 844, by mouse. The script prints each check and its output is the evidence:
  - On each of `/subjects/new`, `/subjects/{id}/edit`, `/decks/new`, `/decks/{id}/edit`, `/cards/new`, `/cards/{id}/edit`, `/deck-configurations/new`, `/deck-configurations/{id}/edit` and `/practice/new`: the element `[data-testid="form-bar"]` has `getBoundingClientRect().bottom` equal to `window.innerHeight`, the `h1`'s top is below the header's bottom, and the `h1` is the first heading on the page.
  - On `/cards/{id}/edit` for a card of the deck "Commands", twelve fields: after `window.scrollTo(0, document.body.scrollHeight)`, the bar's bottom still equals `innerHeight`, the last field input's bottom is at or above the bar's top, and the `h1`'s bottom is above the header's bottom.
  - On `/subjects/new`, `document.body.scrollHeight` is at most `innerHeight` and the bar's bottom equals `innerHeight`.
  - On `/decks/new`, a click on the Subject picker then on "New subject…" opens the dialog named "New subject", and the bar inside it has its bottom equal to `innerHeight`.
  - With `/api/health` aborted through `page.route` so the banner shows, on `/library` the menu button opens the side menu and its first item's top is at or below the header's bottom.
  - On `/practice/new` with configurations in three decks: ticking one in each puts "3 selected" inside the bar with its bottom at or above Create's top; with `POST /api/practice_runs` aborted through `page.route`, a click on Create puts "Couldn't reach Flashy. Check your connection and try again." inside the bar with its bottom at or above "3 selected"'s top.
  - On `/decks/{id}/edit`: the bar's buttons read Done, Undo, Save left to right; after typing one letter into the deck's name they read Cancel, Undo, Save; after a click on Save, the last button reads "Saved ✓" and, after 2.5 seconds, "Save"; the script then renames the deck back and saves again.
  - On `/practice/new` scrolled so the first configuration row is below the bar's top, choosing a subject in "All subjects" by mouse leaves the first two rows' bottoms at or above the bar's top and the filter's top at or below the header's bottom.
- Screenshots at 390 by 844, saved in the session scratchpad and named in the Debrief: New practice with three configurations ticked, for drawing 32; New card after the aborted Create, for drawing 35; Edit deck just after a save, for drawing 38; New subject open over New deck.

**Debrief**

None.
