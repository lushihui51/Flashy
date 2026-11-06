# 040 — The practice summary

Canvas: https://claude.ai/artifact/KVE41kmrFPufVvcaGyCqbf

## Goal

Outcome: A completed practice's summary, on the run page when nothing is left and on the practice's own page from then on, lists every card once with its circle and its kind of change, counts the cards of each kind, narrows the list to the kinds chosen, orders it by mastery, gains or drops, and opens a card as the fields the practice showed or asked, each with its value, its own circle and change and one mark per attempt, with a key that names every mark.

Scope: The cycle covers the breakdown read, which returns every card and each field the practice showed or asked with its readiness, its kind of change and its signed change, sorted into the five kinds under `app/mastery/`, in a fixed number of statements, and nothing of buckets, attempt counts or passing; the mark components, one inline SVG each, for the circle at the summary's two sizes, the change badge, a prompt field's mark, an answer field's mark and the key's "i"; the summary's counts, its "Order by" and its rows on both pages, with the chosen kinds and the order in the page's URL; the sheet a row opens, with the key; and the vocabulary's words for all of it. It leaves out "Re-run" and "Practice these" on the summary and "Done" turning white, cycle 041's; "Edit card" on the sheet, cycle 044's; and the circle on the library, subject and deck pages, which the branch already has.

Judgement: The engineer judges on the live server at 390 wide, on a completed practice that holds a card rated Again and retried, at `/practice/{id}/run` and at `/practice/{id}`: both show the five counts under their badges, "Order by:" with Mastery, Gains and Drops as blocks with Mastery pressed in, and one row per card with its name, its circle and its badge, as drawings 14 and 15; tapping "down" and "down a lot" narrows the list to their cards, with the counts still on screen, and tapping them again shows every card; Gains puts the card that rose most first and Drops the card that fell most; no row shows a number, an attempt count, "Failed" or "First try"; tapping the retried card's row opens its sheet as drawing 16, its fields under Prompt and Answer, each with one mark per attempt, so that a field rated Again then Good shows a red dot then an ink ring with a dot; the "i" opens the key as drawing 17, dimming the rest of the sheet, and closes on a second tap or a tap on the dimming; going back from the sheet with the browser closes it; and the breakdown's statement count against `card`, `field_def` and `mastery_log` is pinned the same for a small and a large practice.

## Records

- PDR 023: Mastery shown as a circle filled as far as the user is ready
- PDR 024: One summary of what a practice did to each card's mastery
- PDR 025: A card opened from the summary as its fields, with a mark for each attempt
- ADR 084: Server-composed reads for a practice's run page and its summary
- ADR 091: Whole collections in bounded statements for every collection read
- ADR 095: No requeue exception to the blank-value filter
- ADR 102: Bands as fractions of the strategy's reach, for the kinds of change in readiness

## Tasks

### T1 — The marks on and around a circle

**Status**

- [ ]

**Goal**

Every mark the summary and a card opened from it draw, the circle at its two new sizes with a change badge off its top-right, a prompt field's mark, an answer field's mark and the key's "i", is one inline SVG component under `frontend/src/components/ui/` with the canvas's geometry.

**Dependencies**

None.

**Files**

- `frontend/src/components/ui/MasteryCircle.tsx`
- `frontend/src/components/ui/MasteryCircle.test.tsx`
- `frontend/src/components/ui/ChangeBadge.tsx` (new)
- `frontend/src/components/ui/ChangeBadge.test.tsx` (new)
- `frontend/src/components/ui/PromptMark.tsx` (new)
- `frontend/src/components/ui/PromptMark.test.tsx` (new)
- `frontend/src/components/ui/RatingMark.tsx` (new)
- `frontend/src/components/ui/RatingMark.test.tsx` (new)
- `frontend/src/components/ui/KeyButton.tsx` (new)
- `frontend/src/components/ui/KeyButton.test.tsx` (new)
- `frontend/src/lib/changeKinds.ts` (new)

**Details**

Drawings 11, 12, 13, 14, 15, 16 and 17 are the geometry of every mark here: each component must draw the shapes, radii, stroke widths and colours its drawing holds, as one `<svg>` on a fixed `viewBox`, with its paths written in the SVG and no lucide icon inside it (LCD3). Every colour is one of the tokens in `frontend/src/index.css`, written as `var(--color-ink)`, `var(--color-surface)`, `var(--color-wrong)`, `var(--color-line)` or `var(--color-aside)`. Every rendered size is a class in rem, as `MasteryCircle`'s sizes are. Guidance: give every outline stroke `vectorEffect="non-scaling-stroke"`, as `MasteryCircle` does, so an outline stays 1.5px at every text size.

The kinds, in `frontend/src/lib/changeKinds.ts`:

```ts
export const CHANGE_KINDS = ['up_a_lot', 'up', 'no_change', 'down', 'down_a_lot'] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];
/** The words a kind is spoken by, after "Mastery N%" on a row and before a count. */
export const CHANGE_WORDS: Record<ChangeKind, string> = {
  up_a_lot: 'up a lot',
  up: 'up',
  no_change: 'no change',
  down: 'down',
  down_a_lot: 'down a lot',
};
```

`MasteryCircle` in `MasteryCircle.tsx` gains two sizes and a change:

```ts
type MasteryCircleProps = {
  readiness: number;
  /** `row`: 22 on a 22 viewBox, 1.375rem. `heading`: 30, 1.875rem. `summary`: a row on the
   * summary, 26, 1.625rem. `sheet`: beside the heading of a card opened from the summary,
   * 34, 2.125rem. */
  size: 'row' | 'heading' | 'summary' | 'sheet';
  /** With a kind, the badge of that kind sits off the circle's top-right and the circle is
   * spoken as "Mastery N%, up a lot". */
  change?: ChangeKind;
  className?: string;
};
```

- The `summary` size must be a 26 viewBox with radius 11.5, the `sheet` size a 34 viewBox with radius 15.5, each with the 1.5 outline; drawings 14 and 16. Guidance: draw the outline circle after the wedge, as the canvas does, so the wedge never covers half the stroke.
- With `change`, the wrapping `span` must be `relative` with a right margin of 0.75rem, the badge must be `ChangeBadge` positioned absolutely at `right: -0.9375rem; top: -0.375rem` of the circle, and the `aria-label` must read `Mastery N%, ` then `CHANGE_WORDS[change]`; drawings 14 and 16 place it so for every size.

`ChangeBadge` in `ChangeBadge.tsx`, `aria-hidden`, 1.1875rem square on a `0 0 19 19` viewBox:

```ts
export default function ChangeBadge({ kind, className }: { kind: ChangeKind; className?: string }): ReactNode;
```

- `up_a_lot`, `up`, `down` and `down_a_lot` must draw a surface circle of radius 9.5 under a circle of radius 7.5 filled ink for the two up kinds and wrong for the two down kinds, and over it a path with no fill, a surface stroke of 1.8 and round caps and joins: `M6.6 8.6 9.5 6 12.4 8.6 M6.6 13 9.5 10.4 12.4 13` for up a lot, `M6.6 10.8 9.5 8.2 12.4 10.8` for up, `M6.6 8.2 9.5 10.8 12.4 8.2` for down, `M6.6 6 9.5 8.6 12.4 6 M6.6 10.4 9.5 13 12.4 10.4` for down a lot.
- `no_change` must draw a surface circle of radius 8.75 with an aside stroke of 1.5 and the dash `M7 9.5h5` with an aside stroke of 1.8 and round caps.

`PromptMark` and `RatingMark`, each `aria-hidden`, 0.8125rem square on a `0 0 13 13` viewBox:

```ts
export default function PromptMark({ shown }: { shown: boolean }): ReactNode;
/** `rating` is 1 to 4 as the API gives it, or null when the attempt did not ask the field. */
export default function RatingMark({ rating }: { rating: number | null }): ReactNode;
```

- Shown must be a circle of radius 6.5 filled ink; not shown a circle of radius 5.75 with no fill and a line stroke of 1.5; drawing 16.
- Again must be a circle of radius 6.5 filled wrong; Hard a circle of radius 5.75 with a wrong stroke of 1.5 over a circle of radius 3.25 filled wrong; Good the same with ink; Easy a circle of radius 6.5 filled ink; not asked a circle of radius 5.75 with no fill and a line stroke of 1.5; drawings 16 and 17. A rating no tier matches must draw as not asked.

`KeyButton` in `KeyButton.tsx`, a `button` of `type="button"` spoken "Key":

```ts
export default function KeyButton({ open, onClick }: { open: boolean; onClick: () => void }): ReactNode;
```

- It must carry `aria-label="Key"` and `aria-expanded={open}`, and hold one SVG 1.625rem wide and 1.75rem tall on a `0 0 26 28` viewBox: a circle at (13, 15) of radius 12.25 filled ink, the press shadow; a circle at (13, 13) of radius 12.25 with an ink stroke of 1.5, filled surface when closed and ink when open; and, in a group translated by (5.38, 5), the dot at (9.2, 3) of radius 1.7 and the stroke `M5.6 7.2 C6.6 6.8 8.3 6.6 8.1 7.8 L6.4 12.6 C6.1 13.6 6.9 14 8.4 12.9` of width 2 with round caps and joins, both ink when closed and surface when open; drawings 16 and 17.

Tests, one file per component: `MasteryCircle.test.tsx` adds that `summary` and `sheet` draw their viewBox, radius and class, and that `change="down_a_lot"` at 0.24 speaks "Mastery 24%, down a lot" and renders a badge; `ChangeBadge.test.tsx` checks each kind's fill colour, its number of chevron paths and the dash for no change; `PromptMark.test.tsx` and `RatingMark.test.tsx` check each state's radii and colours, null included; `KeyButton.test.tsx` checks the label, `aria-expanded` following `open`, and the face's fill swapping with it.

**Out of scope**

- Any use of these components on a screen: T2 and T3.
- The spoken words of a row of marks: T3.
- A lucide chevron, arrow or info icon inside a badge or the key: never, LCD3.
- `ChangeKind` as the generated type: T2, once the API carries it.

**Done when**

- `cd frontend && npx vitest run src/components/ui/MasteryCircle.test.tsx src/components/ui/ChangeBadge.test.tsx src/components/ui/PromptMark.test.tsx src/components/ui/RatingMark.test.tsx src/components/ui/KeyButton.test.tsx` passes.
- `grep -l "lucide" frontend/src/components/ui/MasteryCircle.tsx frontend/src/components/ui/ChangeBadge.tsx frontend/src/components/ui/PromptMark.tsx frontend/src/components/ui/RatingMark.tsx frontend/src/components/ui/KeyButton.tsx` prints nothing.
- `grep -c "<svg" frontend/src/components/ui/ChangeBadge.tsx frontend/src/components/ui/PromptMark.tsx frontend/src/components/ui/RatingMark.tsx frontend/src/components/ui/KeyButton.tsx` prints `1` for each file.

**Debrief**

None.

### T2 — The breakdown read and the summary's list

**Status**

- [ ]

**Goal**

The breakdown read returns every card and each field the practice showed or asked with its readiness, its kind of change and its signed change in a fixed number of statements, and the summary on the run page and on the practice's own page lists every card once with its circle and badge, counts the kinds, narrows the list to the kinds chosen and orders it by mastery, gains or drops.

**Dependencies**

- T1: `MasteryCircle`'s `summary` size and `change`, `ChangeBadge`, `CHANGE_KINDS` and `CHANGE_WORDS`.

**Files**

- `app/mastery/readiness.py`
- `app/models/practice_run_payloads.py`
- `app/services/practice_run.py`
- `app/database_ops/card.py`
- `app/database_ops/field_def.py`
- `tests/conftest.py`
- `tests/api_tests/test_mastery.py`
- `tests/api_tests/test_practice_run.py`
- `frontend/src/api/openapi.json` (generated)
- `frontend/src/api/types.ts` (generated)
- `frontend/src/lib/changeKinds.ts`
- `frontend/src/components/practice/RunBreakdown.tsx`
- `frontend/src/components/practice/RunBreakdown.test.tsx`
- `frontend/src/pages/PracticeRunPage.tsx`
- `frontend/src/pages/PracticeRunPage.test.tsx`
- `frontend/src/pages/PracticeDetailsPage.tsx`
- `frontend/src/pages/PracticeDetailsPage.test.tsx`
- `frontend/src/test/practice_run.test.ts`
- `docs/vocabulary.md`

**Details**

The kinds, in `app/mastery/readiness.py` (ADR 102):

```python
class ChangeKind(str, Enum):
    up_a_lot = "up_a_lot"
    up = "up"
    no_change = "no_change"
    down = "down"
    down_a_lot = "down_a_lot"


def classify_change(delta: float, reach: float) -> ChangeKind:
    """The kind of a change in readiness, `delta` being its value after minus its value
    before, against the strategy's `reach`: up a lot from 0.6 of the reach, up from 0.1,
    no change from −0.1, down from −0.6, and down a lot below that."""
```

- The four fractions 0.6, 0.1, −0.1 and −0.6 must be written once, in that module, each band closed at its lower bound, so a delta of exactly 0.6 × reach is up a lot and exactly −0.1 × reach is no change, and no boundary may be written as an amount of readiness.
- `reach` must come from `strategy.reach` at the call site, never from a strategy's constants.

The payload, in `app/models/practice_run_payloads.py` (ADR 084):

```python
class FieldSide(str, Enum):
    prompt = "prompt"
    answer = "answer"


class BreakdownAttempt(AppModel):
    practice_card_id: uuid.UUID
    prompts: list[ResolvedFieldValue]
    answers: list[RatedFieldValue]


class FieldReadinessDelta(AppModel):
    field_def_id: uuid.UUID
    name: str
    type: FieldType
    side: FieldSide
    readiness: float
    delta: float
    change: ChangeKind


class BreakdownCard(AppModel):
    card_id: uuid.UUID
    primary_field: ResolvedFieldValue
    readiness: float
    delta: float
    change: ChangeKind
    fields: list[FieldReadinessDelta]
    attempts: list[BreakdownAttempt]


class PracticeRunBreakdown(AppModel):
    total_cards: int
    cards: list[BreakdownCard]
```

- `BreakdownBucket`, `attempt_count`, the four counts, and an attempt's `status` and `created_at` must leave; nothing in the payload may say how many attempts a card took or whether it passed (PDR 024, ADR 095). `attempts` stays in chain order, oldest first.
- `fields` must hold only the fields that at least one of the card's attempts names in `prompts` or `answers`, in `field_def.position` order, with `side` prompt when any attempt's `prompts` names it and answer otherwise (PDR 025). The card's `readiness` and `delta` must still fold over every live field of its deck, as `_compute_field_readiness_deltas`'s domain does today; only the list narrows.
- `change` must be `classify_change(delta, strategy.reach)` for the card and for each field.
- `cards` keeps today's order, by each card's first attempt's position.
- The read must issue a number of statements against `card`, `card_field_value` and `field_def` that does not change with the number of cards or decks (ADR 091): replace the per-card `db_read_card` with one `db_read_cards_with_values(db, card_ids: Collection[uuid.UUID]) -> list[Card]` in `app/database_ops/card.py`, unscoped like `db_read_cards_with_values_for_deck` because the run's own ownership read comes first, loading `values` with `selectinload`; and the two per-deck `db_read_field_defs` calls with one `db_read_field_defs_for_decks(db, deck_ids: Collection[uuid.UUID]) -> list[FieldDef]` in `app/database_ops/field_def.py`, ordered by deck then position. Guidance: group both results by deck in Python once, before the per-card loop.
- `tests/conftest.py` must offer a `statement_counter` fixture returning a function from a table name to a `_StatementCounter` listening on the engine, every counter removed at teardown; `mastery_log_statement_counter` may stay as a call of it.
- Tests: in `test_mastery.py`, a `TestClassifyChange` with one test per boundary, at the bound and just below it, for a reach of 0.45; in `test_practice_run.py`, `test_full_breakdown_all_four_buckets` becomes a test of the new shape, every card once, no bucket, the retried card's two attempts in order, `fields` holding only the shown or asked fields with their sides and the never-named `filler` absent; `test_delta_computation_statement_count_is_fixed` becomes `test_breakdown_statement_count_is_fixed`, asserting equal counts for `card`, `field_def` and `mastery_log` between the small and the large run; `test_payload_carries_readiness_within_the_scale_and_no_mastery_key` also asserts `change` on the card and on each field equals `classify_change` of its `delta`; the stuck card of `test_blanked_only_answer_field_ends_the_card_failed` still lists once with its attempts and no outcome.

After the backend, `cd frontend && npm run gen:api`. In `changeKinds.ts`, `ChangeKind` must become `components['schemas']['ChangeKind']` and `CHANGE_KINDS` must be declared `satisfies readonly ChangeKind[]`, so a kind added on the server without a word here fails the build.

`RunBreakdown` in `RunBreakdown.tsx`, rewritten, with the same prop:

```ts
export default function RunBreakdown({ breakdown }: { breakdown: PracticeRunBreakdown }): ReactNode;
```

- The chosen kinds and the order must live in the page's URL, read through `useViewParams`: `kind`, repeated, one of `CHANGE_KINDS`, and `order`, `gains` or `drops`, absent for mastery; never in `useState`. A `kind` or `order` the lists do not hold must read as absent. Both pages render this component and neither may strip these params.
- Every write of them must go through `changeView` with the counts group as the control for a count and the "Order by" group for an order, and the list block as `listStart`, so the new list's first rows and the control just tapped come on screen and the page moves no further (LPD6).
- Order: absent or `mastery` is readiness ascending, the default; `gains` is `delta` descending; `drops` is `delta` ascending; ties keep the payload's order (PDR 024).
- The counts: one `div` with `role="group"` holding five `button`s in the order up a lot, up, no change, down, down a lot, each `aria-pressed` when chosen and `aria-label` of the count then the kind's word, as "9 up a lot", each showing its `ChangeBadge` over its number; every one drawn as a block, `tappable-sm` with a rounded outline, the chosen one `tappable-pressed` on ink with surface text and its badge unchanged (LPD5, drawings 14 and 15). With one or more chosen the list holds only their cards; with none, every card (PDR 024). A count of zero stays pressable, and the list it narrows to is empty with no sentence.
- "Order by:" then the three choices, a `div` with `role="radiogroup"` and `aria-label="Order by"` holding three `role="radio"` buttons with `aria-checked`, each a block as the counts are, the chosen one pressed in (LPD5, LPD8; drawing 14). The group sits below the counts.
- The rows, in one block (`tappable rounded-block bg-(--color-surface)` with rows divided by a line): each a full-width `button` holding the card's name (`cardTitle` as today, "Untitled card" for a blank one), `MasteryCircle` at `size="summary"` with `change={card.change}`, and a `ChevronRight` from lucide in aside colour, as drawing 14. A row shows no number, no attempt count and no outcome word. The row's `onClick` opens nothing in this task.
- "N cards practiced" is not drawn by this component: the run page draws it under its heading and the practice's own page draws it above this component.

The pages:

- `PracticeRunPage.tsx`'s completion must read, under the progress bar, as drawing 14: "Practice complete" as the page's `h1` at the page heading's size, "N cards practiced" under it, then the action row with "Done" alone, yellow and full width, then `RunBreakdown`.
- `PracticeDetailsPage.tsx` must draw "N cards practiced" and then `RunBreakdown` where it draws the breakdown today, below the chips.
- Tests in `RunBreakdown.test.tsx`, rendered with `renderWithProviders`: the default order is readiness ascending; Gains and Drops order by delta; the five counts speak their count and word and show the number; choosing two counts narrows to their cards and writes `kind` twice to the URL, read from a `useLocation` probe; choosing an order writes `order`; a row speaks "Mastery N%, down a lot" and shows no "+", "−", "±", "First try" or "Attempt" text; a `kind` in the URL on first render already narrows. The tests of `PracticeRunPage.test.tsx`, `PracticeDetailsPage.test.tsx` and `src/test/practice_run.test.ts` that build a breakdown move to the new shape, and the run page's test of the completion heading checks the `h1` and the count line.

`docs/vocabulary.md` (LPD5, LPD8), each row edited in place:

- The row "A card rated Again on a field at its last attempt" keeps its words and its Where becomes "Run page".
- The row "Sorting the cards" becomes: Concept "Ordering the cards"; User reads `"Order by", spoken; "Order by:"; "Mastery"; "Gains"; "Drops"`; Where unchanged; Code `` `OrderKey`; `order`; `mastery`; `gains`; `drops` ``.
- The row "A change in mastery" becomes: Concept "A change in mastery, one of five kinds"; User reads `a badge off the circle's top-right; "up a lot", "up", "no change", "down" or "down a lot", spoken after "Mastery N%"`; Where "Run page; a practice's page"; Code `` `ChangeKind`; `change`; `delta`; `classify_change`; `ChangeBadge`; `CHANGE_WORDS` ``.
- The row "A card's outcome" becomes: Concept "How many cards had each kind of change"; User reads `the number under its kind's badge; "N up a lot", "N up", "N no change", "N down" or "N down a lot", spoken`; Where "Run page; a practice's page"; Code `` `kind` ``.

**Out of scope**

- The sheet a row opens, and the `card` param: T3.
- "Re-run" beside "Done", "Practice these" under the counts and "Done" turning white: cycle 041.
- "Edit card" on the sheet: cycle 044.
- A sentence for a list narrowed to nothing: an unsettled decision; none is drawn.
- A kind read from the rating alone, or bands in the frontend: never, ADR 102.
- The bands as amounts of readiness: never, ADR 102.

**Done when**

- `uv run pytest tests/api_tests/test_mastery.py tests/api_tests/test_practice_run.py` passes, `TestClassifyChange` and `test_breakdown_statement_count_is_fixed` among them.
- `grep -c "Bucket\|still_failed\|passed_first_try\|attempt_count" app/models/practice_run_payloads.py` prints `0`.
- `cd frontend && npm run gen:api && git status --porcelain src/api` prints nothing after the task's commit.
- `cd frontend && npx vitest run src/components/practice/RunBreakdown.test.tsx src/pages/PracticeRunPage.test.tsx src/pages/PracticeDetailsPage.test.tsx src/test/practice_run.test.ts` passes.
- `grep -rn "First try\|One retry\|Gains first\|Drops first\|±0\|Attempt \|useState<SortKey" frontend/src --include=*.tsx --include=*.ts | grep -v "\.test\."` prints nothing.
- `grep -c "Sort\", spoken\|First try\|±0" docs/vocabulary.md` prints `0`.
- At 390 wide on the live server, on a completed practice's run page and on its own page: the five counts under their badges, "Order by:" with its three blocks, and one row per card with its circle and badge, as drawing 14; tapping "down" narrows the list and the counts stay on screen; tapping Gains and then Drops reorders the rows.

**Debrief**

None.

### T3 — A card opened from the summary

**Status**

- [ ]

**Goal**

A row on the summary opens the card as a sheet showing its name, its circle and change, each field the practice showed or asked under Prompt or Answer with its value, its own circle and change and one mark per attempt, and a key, opened from the "i", that names every mark.

**Dependencies**

- T1: `MasteryCircle`'s `sheet` size and `change`, `PromptMark`, `RatingMark`, `KeyButton`.
- T2: `BreakdownCard.fields` with `side`, `BreakdownAttempt`, `RunBreakdown`'s rows and its `useViewParams`.

**Files**

- `frontend/src/components/practice/RunBreakdown.tsx`
- `frontend/src/components/practice/RunBreakdown.test.tsx`
- `frontend/src/components/practice/FieldValue.tsx`
- `docs/vocabulary.md`

**Details**

- The open card must live in the page's URL as `card`, the card's id, written with `setParams` on a row's tap and removed on close; absent, or naming no card of the payload, the sheet is closed. So a reload keeps the card open and the browser's back closes it (PDR 017).
- The sheet is `BottomSheet`, as today, and must read as drawing 16: the card's name as its `h2` at 1.5rem bold with `MasteryCircle` at `size="sheet"` and `change={card.change}` beside it; then one record card, a block with an ink outline, no shadow, surface background and `px-4`, holding "Prompt", then each prompt-side field, then "Answer", then each answer-side field, the sides read from `field.side` and the fields in the payload's order; "Prompt" is a heading at `text-sm font-semibold` ruled below in ink, "Answer" the same with a line above; each field is a row divided from the next by a line, holding a top line and then its value.
- A field's top line must hold, left to right: its name in `text-label` aside colour, growing; its marks, one per attempt in attempt order, each centred in a 0.8125rem slot with 0.25rem between; a 0.25rem gap; and `MasteryCircle` at `size="row"` with `change={field.change}`. A prompt field's mark for an attempt is `PromptMark` with `shown` true when that attempt's `prompts` names the field; an answer field's mark is `RatingMark` with the rating that attempt's `answers` gives it, or null when it does not name it (PDR 025).
- The marks must sit in one `span` with `role="img"` whose `aria-label` is the field's name, a colon, then each mark's word joined by `, then `: "shown" or "not shown" for a prompt field, the rating's label from `RATING_TIERS` or "not asked" for an answer field, as "OS: shown, then not shown, then shown" (LPD8).
- The value must render below the top line at full width through `FieldValue` with `labeled={false}` and no `zone`, so a picture or audio value keeps its chip; `FieldValue`'s text class with no `zone` becomes `text-base leading-[1.35] font-semibold`, which only this sheet uses.
- The "i" is `KeyButton`, placed on the record card's top-left corner as drawing 16: absolutely at `-0.8125rem` left and top, in a surface-coloured pill with 0.125rem padding and a 0.9375rem radius. Its open state is component state.
- Open, the key must read as drawing 17: a layer covering the whole sheet in ink at 35% opacity with the sheet's top radius, `aria-hidden`, above the sheet's content and below the "i" and the panel, which closes the key on a tap; and the panel, `role="dialog"` with `aria-label="Key"`, absolutely 0.75rem from the record card's left and 0.875rem from its top, 15rem wide, a `tappable` block with a 1rem radius and `text-label`, holding "Prompt" over "shown" and "not shown" and "Answer" over "Again", "Hard", "Good", "Easy" and "not asked", each as its mark then its word, wrapping with 0.375rem by 0.875rem gaps. Tapping the "i" again closes it. Guidance: draw the layer and the panel inside the sheet's content rather than through a portal; a panel portalled outside the sheet's dialog does not receive pointer events while that dialog is modal.
- The sheet's content must scroll within the sheet, as today, so a card of many fields stays reachable, with the key's layer covering the scrolling area.
- Tests in `RunBreakdown.test.tsx`: tapping a row writes `card` to the URL and opens the sheet with the name and its spoken circle; a `card` in the URL on first render opens it; closing removes `card`; a two-attempt card's prompt field speaks "shown, then not shown" and its answer field "Again, then Good" with the matching marks, and a field no attempt names is absent; the "i" opens the key, which names the seven marks, and a tap on the layer closes it.

`docs/vocabulary.md` (LPD8), each row edited in place or added at the end of its area:

- The row "One go at a card" becomes: User reads `"attempt"`; Where "A card opened from the summary, as one mark per attempt"; Code `` `practice_card`; `PracticeCard`; `attempt`; `BreakdownAttempt` ``.
- The row "The current card's two zones" gains Where "a card opened from the summary" and Code `` `side` ``.
- New rows in the Summary area:
  - Concept "A card opened from the summary"; User reads `its name heading a sheet, its circle and badge beside it`; Where "Run page; a practice's page"; Code `` `card`; `BreakdownCard` ``.
  - Concept "A prompt field's mark"; User reads `a solid ink dot when the attempt showed it; an empty light-grey ring when it did not; "shown"; "not shown"`; Where "A card opened from the summary; the key"; Code `` `PromptMark`; `shown` ``.
  - Concept "An answer field's mark"; User reads `a solid red dot for Again; a red ring with a dot for Hard; an ink ring with a dot for Good; a solid ink dot for Easy; an empty light-grey ring when the attempt did not ask it; "not asked"`; Where "A card opened from the summary; the key"; Code `` `RatingMark`; `rating` ``.
  - Concept "A field's marks, spoken"; User reads `its name, then each mark in turn joined by "then", as "OS: shown, then not shown, then shown" or "Privilege needed: Easy, then not asked, then Good"`; Where "A card opened from the summary"; Code `` `role="img"` ``.
  - Concept "The key to the marks"; User reads `"Key", spoken, on the "i"; "Prompt" over "shown" and "not shown"; "Answer" over "Again", "Hard", "Good", "Easy" and "not asked"`; Where "A card opened from the summary"; Code `` `KeyButton`; `keyOpen` ``.

**Out of scope**

- "Edit card" under the record card, which drawing 16 shows: cycle 044.
- A field the practice never showed or asked: never, PDR 025.
- A count of attempts or a passed or failed word on the sheet: never, PDR 025.
- The key always shown: never, PDR 025.
- The mastery before and after on the sheet's heading: never, LPD7.

**Done when**

- `cd frontend && npx vitest run src/components/practice/RunBreakdown.test.tsx src/pages/PracticeRunPage.test.tsx src/pages/PracticeDetailsPage.test.tsx` passes.
- `grep -c "role=\"dialog\"" frontend/src/components/practice/RunBreakdown.tsx` prints `1`.
- At 390 wide on the live server, on a completed practice that holds a card rated Again and retried, at `/practice/{id}/run` and at `/practice/{id}`: the five counts under their badges, "Order by:" with Mastery pressed in, and one row per card with its circle and badge; tapping "down" and "down a lot" narrows the list with the counts on screen, tapping them again shows every card, and Gains and Drops reorder the rows; no row shows a number, an attempt count, "Failed" or "First try"; the retried card's row opens its sheet as drawing 16, the field rated Again then Good showing a red dot then an ink ring with a dot; the "i" opens the key as drawing 17 and a second tap or a tap on the dimming closes it; the browser's back closes the sheet; and `uv run pytest tests/api_tests/test_practice_run.py -k test_breakdown_statement_count_is_fixed` passes.

**Debrief**

None.
