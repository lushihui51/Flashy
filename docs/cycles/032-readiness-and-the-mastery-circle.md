# 032 — Readiness and the mastery circle

Canvas: https://claude.ai/artifact/3ResqTCgGzvKHFQ2xQzZ54

## Goal

Outcome: Every subject, deck and card the user meets on a row, and a subject's page and a deck's page beside their heading, shows its mastery as a small ink-outlined circle filled from the top, clockwise, as far as the user is ready, with no number anywhere; a card never practiced reads empty, a deck or subject with no card shows no circle; and the only mastery figure that leaves the server is readiness, from 0 to 1, with the stored state's prior at 0 and the stored history rebuilt once.

Scope: The cycle covers the strategy's contract, which loses `field_score` and `card_score` and gains the translation of a field's state into readiness and the strategy's reach; `EmaStrategy`'s prior at 0 on both sides and its readiness as the stored value over Good's score, capped at 1; one module, `app/mastery/readiness.py`, folding readiness above the field for a card, a deck and a subject; every reader of a mastery figure outside `app/mastery/`, the order at run start, the random draw's weights, a retry's placement and the breakdown's figures, reading readiness instead; readiness on every subject, deck and card the API lists or opens, in a bounded number of statements, and the per-card mastery route gone; the one rebuild of `mastery_log`; the circle as one SVG component, on every row and beside both headings; the "Mastery" row of `docs/vocabulary.md`; and README's paragraph on mastery. It leaves out the summary's layout, its badges and its kinds of change, which the summary's cycle draws, though its figures become readiness here and its mastery numbers become circles; Home's circles; and any change to the order a practice shows its cards in, which stays unseen first then least ready first.

Judgement: The engineer judges on the live server at 390 wide: Your library's Subjects and Decks tabs, a subject's page, a deck's page and its Cards tab each show the circle on every row and beside the heading as drawings 11, 12 and 13 draw it, spoken "Mastery N%"; a deck just made with cards shows an empty circle, and a deck with no cards none; after practicing one card Good once, its circle on the deck page has filled a little, and its deck's and subject's circles have moved up by less; and `GET /api/subjects`, `/api/decks` and `/api/decks/{id}` carry `readiness` and no other mastery figure.

## Records

- PDR 021: A card's mastery as how ready the user is to recall it
- PDR 022: A deck's and a subject's mastery as the average over their cards
- PDR 023: Mastery shown as a circle filled as far as the user is ready
- ADR 011: Append-only review_log as the mastery source of truth
- ADR 083: Readiness as the only mastery figure leaving the mastery module
- ADR 091: Whole collections in bounded statements for every collection read

## Tasks

### T1 — The strategy's readiness and the rebuild

**Status**

- [x]

**Goal**

Every mastery figure outside `app/mastery/` is readiness: the strategy's contract translates a field's state into readiness and states its reach, `EmaStrategy`'s prior is 0 on both sides, the order at run start, the random draw, a retry's placement and the breakdown read readiness, the per-card mastery route is gone, and `mastery_log` is rebuilt.

**Dependencies**

None.

**Files**

- `app/mastery/strategy.py`
- `app/mastery/ema.py`
- `app/mastery/types.py`
- `app/mastery/__init__.py`
- `app/mastery/readiness.py` (new)
- `app/services/mastery.py`
- `app/services/practice_run.py`
- `app/services/practice_generation.py`
- `app/database_ops/practice_generation.py`
- `app/database_ops/mastery_log.py`
- `app/routers/api/card.py`
- `app/models/card.py`
- `app/models/practice_run_payloads.py`
- `alembic/versions/<revision>_rebuild_mastery_from_a_prior_of_zero.py` (new, its revision id from `alembic revision`)
- `tests/api_tests/test_mastery.py`
- `tests/api_tests/test_cards.py`
- `tests/api_tests/test_practice_run.py`
- `frontend/src/api/openapi.json`
- `frontend/src/api/types.ts`
- `frontend/src/api/card.ts`
- `frontend/src/test/card.test.ts`
- `frontend/src/components/practice/RunBreakdown.tsx`
- `frontend/src/components/practice/RunBreakdown.test.tsx`
- `frontend/src/pages/PracticeRunPage.test.tsx`
- `frontend/src/pages/PracticeDetailsPage.test.tsx`
- `README.md`
- `docs/vocabulary.md`

**Details**

The contract, ADR 083, in `app/mastery/strategy.py`; `field_score` and `card_score` leave it, and `CardScore` leaves `app/mastery/types.py` and `app/mastery/__init__.py`:

```python
class MasteryStrategy(Protocol):
    @property
    def name(self) -> str: ...

    @property
    def reach(self) -> float:
        """The furthest one rating can move one side's readiness, from this strategy's
        own constants."""
        ...

    def prior(self) -> FieldMasteryState: ...
    def expand(self, group: ReviewGroup) -> dict[tuple[uuid.UUID, uuid.UUID, ReviewSide], MasteryUpdate]: ...
    def apply_review(self, current: FieldMasteryState | None, update: MasteryUpdate) -> FieldMasteryState: ...

    def readiness(self, state: FieldMasteryState | None) -> float:
        """One field's readiness, 0 to 1: how likely the user is to recall it now. None,
        a field never reviewed, is 0."""
        ...
```

`prior`, `expand` and `apply_review` keep their bodies and docstrings; `reach` is a read-only property, as AGENTS.md has a Protocol attribute.

`EmaStrategy` in `app/mastery/ema.py`, LCD10:

- `MASTERY_PRIOR` must be `0.0`, so `prior()` is 0 on both sides; no prior is removed at read time.
- Good's score must be a named constant, `GOOD_SCORE = RATING_SCORES[3]`, and `readiness` must read the stored state alone: a side's readiness is its stored value divided by `GOOD_SCORE`, capped at 1; a side counts as reviewed when its review count is above 0; a field's readiness is the average over its reviewed sides, and 0 with neither side reviewed or with `None`.
- `reach` must be `alpha × RATING_SCORES[4] ⁄ GOOD_SCORE`, capped at 1, ADR 083 and ADR 102.
- `EMA_ALPHA`, `EMA_BETA`, `RATING_SCORES`, `expand` and `apply_review` must not change: the blend is the same, only its starting point and its reading move.

The folds, ADR 083, PDR 021 and PDR 022, new at `app/mastery/readiness.py`, pure, belonging to no strategy:

```python
def fold_card_readiness(field_readiness: Sequence[float]) -> float:
    """A card's readiness: the average over every field of its deck, each already a
    strategy's readiness, so a field never reviewed arrives as 0."""

def fold_collection_readiness(card_readiness: Sequence[float]) -> float | None:
    """A deck's or a subject's readiness: the average over its cards, each card once;
    None with no card."""
```

The read path in `app/services/mastery.py`, replacing `card_mastery`; `deck_mastery`, which nothing calls, leaves:

```python
@dataclass(frozen=True)
class CardReadiness:
    readiness: float
    reviewed: bool  # some field of the card has a mastery_log row


def card_readiness(
    db: Session,
    strategy: MasteryStrategy,
    card_ids: list[uuid.UUID],
    field_ids: list[uuid.UUID] | None = None,
) -> dict[uuid.UUID, CardReadiness]:
```

It fetches through `db_fetch_mastery_read_rows` as today, translates each row through `strategy.readiness` and folds through `fold_card_readiness`; no arithmetic of its own. `reviewed` is whether any row of the card has a state, which a later task's folds do not need and generation does.

The callers, ADR 083; every name built on the old figure takes a readiness name, so that no `mastery`-named figure stays outside `app/mastery/`:

- `_snapshot_and_generate_deck` in `app/services/practice_run.py` must keep the order at run start as it is, unseen first then ascending, now by `(reviewed, readiness)`; `_insertion_position` and `_requeue_failed_card` take readiness where they took the score. The order of a practice's cards is an open question of the backlog and must not change here.
- `weighted_low_mastery_sample` in `app/services/practice_generation.py` becomes `weighted_low_readiness_sample`, taking `Sequence[tuple[uuid.UUID, float]]` with no `None`, since `strategy.readiness` has already read a missing row as 0; `MASTERY_CEILING` becomes `READINESS_CEILING = 1.0` and `SAMPLING_EPSILON` `0.01`, the same hundredth of the scale it is today; `resolve_prompts_or_answers` feeds it `strategy.readiness(_row_state(row))`.
- `_compute_field_mastery_deltas` becomes `_compute_field_readiness_deltas` and returns `(before, after, delta)` with before and after each `strategy.readiness` of the state the bounds select, so a never-reviewed state is 0 and `delta = after − before` in every case; the separate prior branch goes, since the prior now reads 0. The two statements against `mastery_log` stay two. The card's figures fold through `fold_card_readiness` over the fields' before and after.
- In `app/models/practice_run_payloads.py`, `FieldMasteryDelta` becomes `FieldReadinessDelta` with `readiness: float`, never `None`, and `delta: float`; `BreakdownCard.mastery` becomes `readiness: float`; `BreakdownCard.fields: list[FieldReadinessDelta]`. The buckets, the counts and the attempts stay as they are; the summary's cycle replaces them.
- `GET /api/cards/{card_id}/mastery` and `CardMasteryRead` leave `app/routers/api/card.py` and `app/models/card.py`; `readCardMastery` leaves `frontend/src/api/card.ts` and its tests leave `frontend/src/test/card.test.ts`. Nothing on a screen calls it.

The rebuild, ADR 011 and LCD10: a new alembic revision after `004a6932a7f5` that changes no schema. Its upgrade opens a `Session` on the migration's connection and calls `rebuild_mastery(session, get_mastery_strategy())`, as revision `9aaac4c2ea4e` does, with its docstring saying why: the prior moved to 0, and every stored value replays from the review log through the live write path. Its downgrade changes nothing and says that the old values return only by a rebuild under the old constant. AGENTS.md's dry run on a `pg_dump` copy of the dev database, then `alembic upgrade head`, belong to this task.

The frontend until the summary's cycle, kept green and honest: `RunBreakdown.tsx` reads `readiness` and `delta` as fractions, shows the card's and each field's readiness as `Math.round(readiness * 100)` with no `null` branch and no "—", shows `delta` as today's signed form over `Math.round(delta * 100)`, and orders by `readiness`; its tests, `PracticeRunPage.test.tsx` and `PracticeDetailsPage.test.tsx` carry fractions in their fixtures and drop the "—" expectation. No word and no layout on the summary changes here; T3 turns the two numbers into circles.

Tests:

- `tests/api_tests/test_mastery.py` gains tests of `EmaStrategy.readiness` and `reach`: `None` reads 0; one Good on the answer side from empty reads 0.3 within 1e-9; four Easy on one side read 1; eight Good on one side read above 0.94; a field reviewed on the prompt side alone reads that side alone; a side rated Easy until its value is 96 or more reads 1 before and after one Again; `reach` is `0.3 × 100 ⁄ 67` within 1e-9. The rebuild oracle tests stay and pass under the new prior.
- `tests/api_tests/test_cards.py` loses `TestCardMastery`.
- `tests/api_tests/test_practice_run.py`'s `TestBreakdownMastery` becomes `TestBreakdownReadiness`, its expectations through `strategy.readiness`, and gains one assertion that the breakdown payload's cards and fields carry `readiness` in `[0, 1]` and no key named `mastery`.

README's paragraph "Mastery is a ledger, not a number." must say the new truth in its own words: the prior is 0, the figure shown is readiness, a side's stored value over Good's score capped at 1, averaged over the sides reviewed, a card averaging every field of its deck with a never-reviewed field at 0, and a deck or subject averaging its cards. It cites no record and points at no other file.

`frontend/src/api/types.ts` and `openapi.json` are regenerated with `npm run gen:api` in this task's commit, AGENTS.md.

**Out of scope**

- Readiness on `SubjectSummary`, `DeckSummary`, `DeckDetail` or a card of a deck's page: T2.
- Any circle on any screen, and the vocabulary's "Mastery" row: T3.
- The bands, the kinds of change and `reach`'s use: the summary's cycle; `reach` is only stated here.
- Any change to the order a practice shows its cards in or where a retry lands: an open question of the backlog, never here.
- A new column, a schema change or a stored readiness: never, ADR 083 and LCD10.

**Done when**

- `grep -rnE "field_score|card_score|CardScore|card_mastery|deck_mastery|MASTERY_CEILING|FieldMasteryDelta|CardMasteryRead|readCardMastery" app tests frontend/src README.md` prints nothing.
- `grep -n "^MASTERY_PRIOR\|^GOOD_SCORE" app/mastery/ema.py` prints `MASTERY_PRIOR = 0.0` and `GOOD_SCORE = RATING_SCORES[3]`.
- `uv run pytest tests/api_tests/test_mastery.py tests/api_tests/test_cards.py tests/api_tests/test_practice_run.py tests/api_tests/test_layering_guard.py tests/api_tests/test_schema_guard.py` passes, the new readiness and reach tests among them.
- `uv run alembic upgrade head` against the `pg_dump` copy prints `Running upgrade 004a6932a7f5 -> <revision>`, and `uv run alembic current` against the dev database then prints the new revision as head; the dev database's `mastery_log` row count is the same before and after, and `SELECT max(answer_mastery), max(prompt_mastery) FROM mastery_log` prints values at or below 100, the output being the evidence.
- `cd frontend && npx vitest run src/components/practice src/pages/PracticeRunPage.test.tsx src/pages/PracticeDetailsPage.test.tsx src/test/card.test.ts` passes.
- On the live server, a completed practice's summary shows each card's mastery as a whole number from 0 to 100 beside its change, and `GET /api/practice_runs/{id}/breakdown` for it, read in the browser's network panel or with `curl` under `DEV_AUTH_USER_ID`, carries `readiness` on every card and field and no `mastery` key.

**Debrief**

Evidence, in the order of Done when:

- The grep, run with `\b` around its alternatives by the engineer's order, prints nothing and exits 1. As written it also matches `rebuild_deck_mastery`, whose name stays because it rebuilds the stored state.
- `grep -n "^MASTERY_PRIOR\|^GOOD_SCORE" app/mastery/ema.py` prints `MASTERY_PRIOR = 0.0` and `GOOD_SCORE = RATING_SCORES[3]`.
- The five named pytest files: `155 passed`. `TestReadiness` and `TestReadinessFolds` are among them, 13 tests. `TestBreakdownReadiness` holds the payload test, `test_payload_carries_readiness_within_the_scale_and_no_mastery_key`.
- On the `pg_dump` copy, `alembic upgrade head` printed `Running upgrade 004a6932a7f5 -> ec9df5054ea7, rebuild mastery from a prior of zero`, and the copy was dropped afterwards. On the dev database, `alembic current` prints `ec9df5054ea7 (head)`. `mastery_log` holds 1684 rows before and after. `SELECT max(answer_mastery), max(prompt_mastery) FROM mastery_log` printed 98.58762 and 97.98215 before, and 97.17525 and 97.37972 after. `alembic check` prints `No new upgrade operations detected.`
- The named vitest run: 4 files and 58 tests passed.
- Live, on the practice "Judgement practice" at `/practice/c4ea3fe6-cda6-494d-9ddc-7301578a3230` in headless Chromium at 390 wide, the rows read `holaaa | First try | 45 | +45`, `gracias (T2) | First try | 45 | +45` and `adiósssdd | First try | 45 | +45`, and the first card's sheet reads `Term | 45 | +45` and `Meaning | 45 | +45`. `curl` of its `/breakdown` under `DEV_AUTH_USER_ID` carries `readiness` in 0 to 1 on all 3 cards and every field, and the text `"mastery"` appears nowhere in it. `GET /api/cards/{id}/mastery` returns 404. The screenshots are `/tmp/claude-1000/-home-jadenlu-Projects-Flashy/99c528ec-e4ed-49ff-a1e0-3e78e62670f6/scratchpad/summary.png` and `summary-sheet.png` in the same folder.

Commit checks: full `pytest` 373 passed, with `pg_stat_activity` showing no other connection first; `npx vitest run` 59 files and 588 tests passed; `npm run lint` and `npm run build` clean.

Departures from Details or Files:

- Files gained `app/database_ops/practice_generation.py` and `app/database_ops/mastery_log.py`, whose docstrings named removed functions, and `docs/vocabulary.md`, whose rows "How well a card or field is known" and "A change in mastery" named removed code. The engineer approved each. T3 still replaces the first row.
- README's paragraph "The random draw favors weak fields." also changed, because "100 minus the field's mastery" stopped being true.
- `fold_card_readiness` returns 0.0 for an empty list, which its stated interface does not cover: a practice's snapshot can name only fields since deleted, and the retry path still asks for that card.
- `test_full_fail_requeue_cycle` draws its retry from seed 101 instead of 99, and `test_per_field_bound_excludes_a_different_runs_intervening_write` rates Hard instead of Again in its second run, because an Again from empty now reads 0, the same as never reviewed, and the test could no longer tell the two bounds apart.
- `SortKey`'s `mastery` value and `MasteryStrategy`'s `mastery`-named state stay: the first is the vocabulary row of the "Mastery" sort, which T3 leaves, and the second is the stored state.
- ADR 043, ADR 083 and ADR 102 still name `field_score`, `card_score` or `_compute_field_mastery_deltas`. They are records and were not edited.

Read in the code:

- `readiness` in `app/mastery/ema.py` with `weighted_low_readiness_sample` in `app/services/practice_generation.py`. A prompt field whose only review was a failure now reads 0, the same as a field never seen, so it draws at the same weight. In the fixture of `test_full_fail_requeue_cycle`, a pool of three fields, a retry repeats the failed prompt with chance 1 in 3, where it was 57.5 in 257.5, about 22%, under the old prior. The weights are as Details orders, and this is why that test's seed had to change.

### T2 — Readiness on every subject, deck and card the API returns

**Status**

- [ ]

**Goal**

`GET /api/subjects`, `/api/subjects/{id}`, `/api/decks` and `/api/decks/{id}` carry each subject's and deck's readiness, null with no card, and each card of a deck's page its own, each read in a number of statements fixed whatever the collection's size.

**Dependencies**

- T1: `strategy.readiness`, `fold_card_readiness` and `fold_collection_readiness` in `app/mastery/readiness.py`, and `card_readiness` in `app/services/mastery.py`.

**Files**

- `app/models/subject.py`
- `app/models/deck.py`
- `app/models/card.py`
- `app/models/deck_payloads.py`
- `app/database_ops/mastery_log.py`
- `app/services/mastery.py`
- `app/routers/api/subject.py`
- `app/routers/api/deck.py`
- `tests/api_tests/test_subjects.py`
- `tests/api_tests/test_decks.py`
- `frontend/src/api/openapi.json`
- `frontend/src/api/types.ts`
- `frontend/src/components/library/CardStandaloneForm.test.tsx`
- `frontend/src/components/library/DeckConfigurationEditor.test.tsx`
- `frontend/src/components/library/DeckEditor.test.tsx`
- `frontend/src/components/library/DeckRow.test.tsx`
- `frontend/src/lib/deckEditorDiff.test.ts`
- `frontend/src/lib/deckEditorReducer.test.ts`
- `frontend/src/pages/DeckDetailPage.test.tsx`
- `frontend/src/pages/LibraryPage.test.tsx`
- `frontend/src/pages/PracticeCreatePage.test.tsx`
- `frontend/src/pages/PracticeOverviewPage.test.tsx`
- `frontend/src/pages/practicePrefilterChain.test.tsx`
- `frontend/src/pages/SubjectDetailPage.test.tsx`
- `frontend/src/test/deck.test.ts`
- `frontend/src/test/subject.test.ts`

**Details**

The shapes, PDR 021, PDR 022 and ADR 083; `readiness` is the only mastery figure any of them carries:

- `SubjectSummary` in `app/models/subject.py` gains `readiness: float | None`, `None` when its decks hold no card. `GET /api/subjects/{subject_id}` must return `SubjectSummary`, since the subject's page shows the figure beside its heading; `POST` and `PATCH` keep `SubjectRead`.
- `DeckSummary` in `app/models/deck.py` gains `readiness: float | None`, `None` with no card.
- `CardSummary(CardRead)` in `app/models/card.py` gains `readiness: float`, 0 for a card never reviewed. `DeckDetail` in `app/models/deck_payloads.py` gains `readiness: float | None` and its `cards` become `list[CardSummary]`; every route that returns `DeckDetail` carries both.

The folds in `app/services/mastery.py`, ADR 083 and ADR 091, each one statement whatever the count, through a new fetch in `app/database_ops/mastery_log.py` that drives from `Card` joined to `FieldDef` over the decks or subjects asked for, outer-joined to the latest `mastery_log` row per pair as `db_fetch_mastery_read_rows` is, and returns the owning deck or subject id beside each row:

```python
def deck_readiness(
    db: Session, strategy: MasteryStrategy, deck_ids: list[uuid.UUID]
) -> dict[uuid.UUID, float | None]:
    """Each deck's readiness: every card's fold over every field of the deck, then the
    deck's fold over its cards; None for a deck with no card."""

def subject_readiness(
    db: Session, strategy: MasteryStrategy, subject_ids: list[uuid.UUID]
) -> dict[uuid.UUID, float | None]:
    """Each subject's readiness: the fold over every card of its decks, each card once;
    None for a subject whose decks hold no card."""
```

Each translates rows through `strategy.readiness`, folds a card through `fold_card_readiness` and the collection through `fold_collection_readiness`, and computes nothing else; a deck or subject absent from the rows is `None`.

The reads, composed in the routers as `_deck_detail` in `app/routers/api/deck.py` already composes: `read_subjects` and `read_decks` call their `db_read_*_with_summary` then `subject_readiness` or `deck_readiness` once over every id; `read_subject` builds one `SubjectSummary` with its deck count and readiness; `_deck_detail` adds `deck_readiness` for the deck and `card_readiness` over its cards, and builds `CardSummary` rows. Guidance: the one-subject deck count can reuse the grouped count restricted to one id rather than a new statement shape.

Tests, each counting statements as `TestDeckSummaryQueryBounds` in `tests/api_tests/test_decks.py` does:

- `GET /api/subjects` with five subjects runs at most 3 statements and carries `readiness`; a subject whose decks hold no card reads `null`.
- `GET /api/decks` with five decks runs at most 4 statements; a deck with no card reads `null`; a deck with one never-reviewed card reads `0.0`.
- `GET /api/decks/{id}` with five cards runs at most 6 statements, each card carrying `readiness`, and the deck's `readiness` the average of its cards'.
- `GET /api/subjects/{id}` carries `deck_count` and `readiness`.

The frontend: `npm run gen:api` regenerates the types; every fixture typed as `SubjectSummary`, `DeckSummary`, `DeckDetail` or a deck's card gains `readiness`, `null` or a fraction, so `tsc -b` passes; no component changes and no screen changes.

**Out of scope**

- Any circle or any change to what a screen shows: T3.
- Readiness on `PracticeRunSummary`, `PracticeRunDeckSummary` or Home: Home's cycle.
- A stored or cached readiness: never, ADR 083.

**Done when**

- `uv run pytest tests/api_tests/test_subjects.py tests/api_tests/test_decks.py tests/api_tests/test_cards.py tests/api_tests/test_auth_scoping.py tests/api_tests/test_layering_guard.py` passes, the four statement-count tests among them.
- `grep -c "readiness" frontend/src/api/types.ts` prints a number of at least `4`, and `git diff --stat HEAD -- frontend/src/api/types.ts frontend/src/api/openapi.json` shows both regenerated in the task's commit.
- On the live server, `curl` under `DEV_AUTH_USER_ID` to `/api/subjects`, `/api/decks` and `/api/decks/{id}` returns `readiness` on every subject, deck and card, `null` on a deck made in the check with no card, and the output is the evidence; no screen has changed.

**Debrief**

None.

### T3 — The circle on every row and heading

**Status**

- [ ]

**Goal**

Every subject, deck and card row, the summary's card rows and the sheet's field rows included, and the subject page's and deck page's headings show the mastery circle as drawings 11 to 13 draw it, spoken "Mastery N%", and the vocabulary's "Mastery" row says so.

**Dependencies**

- T2: `readiness` on `SubjectSummary`, `DeckSummary`, `DeckDetail` and `CardSummary`, and `GET /api/subjects/{id}` returning `SubjectSummary`.

**Files**

- `frontend/src/components/ui/MasteryCircle.tsx` (new)
- `frontend/src/components/ui/MasteryCircle.test.tsx` (new)
- `frontend/src/components/ui/ListRow.tsx`
- `frontend/src/components/ui/ListRow.test.tsx`
- `frontend/src/components/library/DeckRow.tsx`
- `frontend/src/components/library/DeckRow.test.tsx`
- `frontend/src/components/library/CardList.tsx`
- `frontend/src/components/library/CardList.test.tsx`
- `frontend/src/components/practice/RunBreakdown.tsx`
- `frontend/src/components/practice/RunBreakdown.test.tsx`
- `frontend/src/pages/LibraryPage.tsx`
- `frontend/src/pages/LibraryPage.test.tsx`
- `frontend/src/pages/SubjectDetailPage.tsx`
- `frontend/src/pages/SubjectDetailPage.test.tsx`
- `frontend/src/pages/DeckDetailPage.tsx`
- `frontend/src/pages/DeckDetailPage.test.tsx`
- `docs/vocabulary.md`

**Details**

The component, PDR 023, LPD7 and LCD3, drawings 11, 12 and 13, new at `frontend/src/components/ui/MasteryCircle.tsx`:

```tsx
type MasteryCircleProps = {
  /** 0 to 1. */
  readiness: number;
  /** `row`: the circle on a row, 1.375rem. `heading`: beside a page's heading, 1.875rem. */
  size: 'row' | 'heading';
  className?: string;
};

export default function MasteryCircle({ readiness, size, className }: MasteryCircleProps): ReactNode;
```

- It must render one `<span role="img">` spoken `Mastery N%`, N being `Math.round(readiness * 100)`, LPD8, holding one inline `<svg aria-hidden="true">` on a fixed viewBox: `0 0 22 22` with the outline at `r="9.5"` for `row`, `0 0 30 30` with `r="13.5"` for `heading`, both centred, as the drawings have them. The SVG's size is a class in rem, `size-[1.375rem]` or `size-[1.875rem]`, never a `width` or `height` attribute, ADR 101.
- The outline is a `<circle>` filled surface and stroked ink at `strokeWidth={1.5}` with `vector-effect="non-scaling-stroke"`, so it stays the same hairline as `tappable`'s outline at every text size.
- The fill is one `<path>` in ink from the centre to the top, then an arc clockwise through `readiness` of a turn at the outline's radius, closed to the centre, as the drawings' paths are; at 0 there is no path, and at 1 or above the fill is a full `<circle>` in ink. No number is drawn, LPD8.
- Colours are `var(--color-ink)` and `var(--color-surface)` only, ADR 090.

Where it sits, PDR 023 and LPD7:

- `ListRow.tsx` gains `trailing?: ReactNode`, rendered `shrink-0` between the text column and the chevron. `LibraryPage.tsx` passes a `row` circle for each subject whose `readiness` is not `null`, and `DeckRow.tsx` for each deck likewise; a `null` readiness passes nothing, so a subject or deck with no card shows no circle.
- `CardList.tsx` takes `CardSummary` rows and sets a `row` circle at the right of each card's lead line, the label and value column taking the rest of the width, as drawing 13 has it.
- `SubjectDetailPage.tsx` sets a `heading` circle at the right of the heading row, after the name, when `readiness` is not `null`, as drawing 12 has it.
- `DeckDetailPage.tsx` sets a `heading` circle directly after the heading text, before Practice, when `readiness` is not `null`, as drawing 13 has it; the name keeps `flex-1`.
- `RunBreakdown.tsx` replaces the card row's mastery number with a `row` circle, and the sheet's field row's mastery number with a `row` circle; the change number, the outcome badge, the sort and every other word stay as they are, since the summary's cycle redraws them.

The vocabulary, LPD8, in `docs/vocabulary.md`: the row "How well a card or field is known" leaves the Summary area, and one row enters under a new Area, "Mastery", placed between the Run rows and the Summary rows, exactly:

```
| Mastery | How ready the user is to recall a card or field, from not ready to ready | a circle filled as far as the user is ready; "Mastery N%", spoken | Library; subject page; deck page; summary | `readiness`; `MasteryCircle`; `app/mastery/readiness.py`; `mastery_log` |
```

No other row changes; "A change in mastery" and "A card's outcome" stay until the summary's cycle.

Tests: `MasteryCircle.test.tsx` checks the spoken name at 0.424 reads `Mastery 42%`, that 0 renders no path, that 1 renders a filled circle, and that 0.25's path ends at the circle's right-hand point within 0.01. The page and row tests check a row with `readiness: null` shows no element named `Mastery`, and one with 0.42 shows `Mastery 42%`.

The screen check, as cycle 031 has it: headless Chromium through playwright-core from the session scratchpad against `localhost:5173`, signed out of Clerk with `DEV_AUTH_USER_ID` and `ENV=development`, at 390 wide.

**Out of scope**

- The summary's badges, kinds of change, counts, "Order by" and the sheet's marks and key: the summary's cycle.
- Home's circles: Home's cycle.
- Any size token in `index.css`: the two sizes are one-offs of this component, ADR 101.

**Done when**

- `cd frontend && npx vitest run src/components/ui src/components/library src/components/practice src/pages/LibraryPage.test.tsx src/pages/SubjectDetailPage.test.tsx src/pages/DeckDetailPage.test.tsx` passes, `MasteryCircle.test.tsx` among them.
- `grep -c '^| Mastery |' docs/vocabulary.md` prints `1`, and `grep -c "How well a card or field is known\|CardMasteryRead" docs/vocabulary.md` prints `0`.
- A script in headless Chromium prints, on `/library` on each tab, on a subject's page, on a deck's page and on a completed practice's summary, the number of `[role="img"][aria-label^="Mastery"]` elements and the number of rows; on each list they are equal save for rows whose deck or subject has no card, and each page heading has one, the output being the evidence.
- The cycle's judgement: on a deck whose cards are unpracticed, the script reads the first card's, the deck's and its subject's spoken names, then a practice of that deck is run with the first card rated Good and every other card left unrated, and the three names are read again; the card's N has risen, and the deck's and the subject's have risen by less, the six values being the evidence.
- Screenshots at 390 wide of Your library on each tab, a subject's page, a deck's page on the Cards tab and a summary, saved in the session scratchpad and named in the Debrief, for the engineer to set beside drawings 11, 12 and 13.

**Debrief**

None.
