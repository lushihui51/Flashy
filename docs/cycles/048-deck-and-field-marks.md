# 048 — Deck and field marks

Waits for: 046, its `DeckRow` with no subject, `DeckPicker` with its item type `{ id: string; name: string }`, `DeckDetailPage` with one place in its breadcrumb, and `docs/vocabulary.md`, which it shares; 047, with which it shares `DeckDetailPage.tsx`, `CardStandaloneForm.tsx`, `PracticeCreatePage.tsx` and their tests, and `PracticeOverviewPage.test.tsx`.

Canvas: https://claude.ai/artifact/Mhz9bGtbce5kn8ZrD1RM8h

## Goal

Outcome: Every deck's name carries the stack mark and every field's name stands in square brackets, wherever the name appears outside the practice screens cycle 049 replaces, and neither mark stands beside the word "deck" or "field".

Scope: The cycle covers `DeckMark`, an inline SVG component under `frontend/src/components/ui/` drawn as the canvas draws it, beside the name on Your library's rows, a deck's page's heading and every deck picker's and filter's rows; `fieldLabel`, the one way a field's name is written for the user, on a deck's page's cards, the card form's labels, the run page's zones, a card opened from the summary and the board's chips and move sheet; and the vocabulary's two new rows. It leaves out the practice and run marks, which cycle 049 brings with the screens that show them; New practice's configuration groups and Selected rows, the Practice page's rows and a practice's page, which cycle 049 replaces; Home's recently practiced decks, which cycle 052 replaces; a field's name inside an input on the deck form, which is a value being typed; and every name only spoken.

Judgement: The engineer judges on the live server at 390 wide: Your library's rows and a deck's page's heading show the stack before the deck's name, in the color of the name, as drawings 9 and 7-deck draw it; New card's Deck picker and the Practice page's deck filter show it before every deck's name in their lists; a deck's page labels each value with its field's name in brackets, as "[Command]"; New card and Edit card label each input so; the run page's Prompt and Answer zones name their fields so; a card opened from a completed practice's summary names its fields so; New configuration's board chips read "[Term]" and its move sheet reads Move "[Term]" to…; and no heading or button that reads "deck" or "field" carries a mark.

## Records

- PDR 049: A drawn mark of its kind beside every name
- ADR 121: lucide-react as the icon set, imported by name

## Tasks

### T1 — The deck mark

**Status**

- [ ]

**Goal**

Every deck's name on Your library's rows, a deck's page's heading and every deck picker's and filter's rows carries the stack mark, drawn by one component, and the vocabulary has the deck mark's row.

**Dependencies**

None.

**Files**

- `frontend/src/components/ui/DeckMark.tsx` (new)
- `frontend/src/components/ui/DeckMark.test.tsx` (new)
- `frontend/src/components/library/DeckRow.tsx`
- `frontend/src/components/library/DeckRow.test.tsx`
- `frontend/src/components/library/DeckPicker.tsx`
- `frontend/src/components/library/DeckPicker.test.tsx`
- `frontend/src/pages/DeckDetailPage.tsx`
- `frontend/src/pages/DeckDetailPage.test.tsx`
- `frontend/src/components/library/CardStandaloneForm.tsx`
- `frontend/src/components/library/CardStandaloneForm.test.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx`
- `frontend/src/pages/PracticeOverviewPage.test.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`
- `frontend/src/pages/practicePrefilterChain.test.tsx`
- `docs/vocabulary.md`

**Details**

PDR 049:

```ts
/** A deck's mark: a stack of cards drawn as an outline in the color of the words beside it,
 * spoken "Deck". Sits inline before a deck's name, sized to the name's text. */
export default function DeckMark(): ReactNode;
```

- `DeckMark` must draw the geometry drawing 9 draws, a `rect` at 3,7 of 14 by 14 with a radius of 2 and the path `M7 3h12a2 2 0 0 1 2 2v12` on a 24 by 24 view box, stroke `currentColor` at width 2 with round caps and joins, no fill, `role="img"` and `aria-label="Deck"`. It is an inline SVG component like `PromptMark` and `RatingMark`, since lucide-react holds no icon of this geometry.
- Guidance: size it `0.9em`. Where it sits inline with a name, on a row's title and a page's heading, give it `vertical-align: -0.15em` and a right margin of `0.3em`, inside the element holding the name, the mark and the name's first word kept on one line, as drawings 9 and 7-deck place it; in a picker's rows it is `renderLeading`'s own item, spaced by the row's gap.
- `DeckRow`'s title, `DeckDetailPage`'s heading and every row `DeckPicker` draws must show `DeckMark` before the deck's name. `DeckPicker` passes it through `PickerCombobox`'s `renderLeading`, so the Practice page's filter, New card's picker and New configuration's picker carry it with no change of their own. Edit card, whose deck is locked and shown as the deck's name in `CardStandaloneForm`'s locked branch, must show `DeckMark` before that name too.
- A mark must never stand beside a word naming its kind: "Add deck", "New deck", "Edit deck", "Delete deck", "N decks" and "Deck" as a picker's label carry none.
- Tests: `DeckMark.test.tsx` asserts the image named "Deck"; `DeckRow.test.tsx`, `DeckPicker.test.tsx` and `DeckDetailPage.test.tsx` assert the mark comes before the deck's name, and `DeckDetailPage.test.tsx` that the pencil "Edit deck" carries none. A deck's option in a picker is then named "Deck <name>", so every test in Files that finds an option by the deck's name alone must find it by its new name.
- `docs/vocabulary.md` must gain a row in the Deck area: Concept "A deck's mark"; User reads a stack of cards, drawn as an outline in the color of the words beside it; "Deck", spoken; Where beside every deck's name, never beside the word "deck"; Code `DeckMark`.

**Out of scope**

- The deck's name on New practice's configuration groups and Selected rows, the Practice page's rows and a practice's page: cycle 049.
- Home's recently practiced decks: cycle 052.
- A name wrapping to two lines and shortened after that, in drawing 9, and everything drawing 7-deck shows of the largest text size: cycle 053.
- The deck page's tabs and its Practice button, absent from drawing 7-deck: cycle 049.
- A mark inside a picker's input once a deck is chosen: never; the input holds the text the user can edit.
- Edit configuration's deck name, shown in its locked span: never; cycle 049 deletes Edit configuration.

**Done when**

- `cd frontend && npx vitest run src/components/ui/DeckMark.test.tsx src/components/library/DeckRow.test.tsx src/components/library/DeckPicker.test.tsx src/pages/DeckDetailPage.test.tsx` passes.
- On the live server at 390 wide: Your library's rows and a deck's page's heading show the stack before the name, as drawings 9 and 7-deck draw it, and New card's Deck picker shows it before every deck in its list.

**Debrief**

None.

### T2 — The field mark

**Status**

- [ ]

**Goal**

Every field's name the user reads, on a deck's page's cards, the card form, the run page, a card opened from the summary and the board, stands in square brackets, written by one function, and the vocabulary has the field mark's row.

**Dependencies**

- T1: `docs/vocabulary.md`, which both tasks change.

**Files**

- `frontend/src/lib/fieldLabel.ts` (new)
- `frontend/src/lib/fieldLabel.test.ts` (new)
- `frontend/src/components/library/CardList.tsx`
- `frontend/src/components/library/CardList.test.tsx`
- `frontend/src/components/library/CardFieldsForm.tsx`
- `frontend/src/components/library/CardFieldsForm.test.tsx`
- `frontend/src/components/practice/FieldValue.tsx`
- `frontend/src/components/practice/RunBreakdown.tsx`
- `frontend/src/components/practice/RunBreakdown.test.tsx`
- `frontend/src/components/library/FieldAssignmentBoard.tsx`
- `frontend/src/pages/PracticeRunPage.test.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx`
- `frontend/src/components/library/CardStandaloneForm.test.tsx`
- `frontend/src/pages/DeckDetailPage.test.tsx`
- `frontend/src/pages/practicePrefilterChain.test.tsx`
- `docs/vocabulary.md`

**Details**

PDR 049:

```ts
/** A field's name as the user reads it: in square brackets, as "[Definition]". */
export function fieldLabel(name: string): string;
```

- Every place in Files that shows a field's name must show `fieldLabel(name)`: `CardList`'s label over each value, as drawing 7-deck draws "[Command]"; `CardFieldsForm`'s label over each input; `FieldValue`'s name in the run page's zones and a summary card's sheet, on its label, its media chip's text and its dialog's title; `RunBreakdown`'s field rows; and `FieldAssignmentBoard`'s chips and its move sheet's heading, which reads Move "[Term]" to….
- A name only spoken stays without brackets: "Move <field> up", "Remove <field>", "Rate <field>", a field's marks spoken as "OS: shown, then not shown" and an image's `alt`.
- The deck form's field name inputs hold the name as a value and take no brackets, as drawing 10 draws them.
- Tests: `fieldLabel.test.ts` covers a name with spaces; the other tests in Files assert the bracketed name where the field's name shows. `CardFieldsForm`'s label wraps its input, so an input is then named "[<field>]", and every test in Files that finds it by the field's name alone must find it by its new name.
- `docs/vocabulary.md` must gain a row in the Field area: Concept "A field's mark"; User reads its name in square brackets, as "[Definition]"; Where every field's name, never the word "field"; Code `fieldLabel`.
- `docs/vocabulary.md`'s row "Moving a field on the board" must read User reads "Move "[<field>]" to…", the field's name in its mark, every other column as it stands.

**Out of scope**

- A field's name on New practice: cycle 049. A practice's page shows a completed run's summary through `RunBreakdown`, so its field names take brackets here with the rest.
- Brackets in a name only spoken: never.

**Done when**

- `cd frontend && npx vitest run src/lib/fieldLabel.test.ts src/components/library/CardList.test.tsx src/components/library/CardFieldsForm.test.tsx src/components/practice/RunBreakdown.test.tsx src/pages/PracticeRunPage.test.tsx src/components/library/DeckConfigurationEditor.test.tsx` passes.
- The cycle's judgement holds.

**Debrief**

None.
