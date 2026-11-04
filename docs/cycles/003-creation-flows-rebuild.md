# 003 — Creation flows rebuild

## Goal

Outcome: The three library artifacts, Subject, Deck and Card, can each be created from three entry points, with atomic backend writes.

Scope: Creating, editing and deleting subjects, decks and cards, mobile-first: the mobile viewport (360–430px) is the design target, and desktop must not be broken but gets no layout work except where a task says otherwise. Not covered: practice, which is an activity, not an artifact; any endpoint beyond the API contracts the tasks state; and the deferred `desktop-grid` (grid presentation of the editor above a breakpoint, column-header type select, header drag reorder), `paste-import` (paste TSV/CSV into the grid to create cards), `draft-persistence` (a localStorage draft for the editor with "Resume draft?"), `icon-picker` and `field-types`, none of which is built without the engineer's explicit go-ahead.

Judgement: None.

## Records

- ADR 018: `last_activity_at` as the sole recency column — no `updated_at`

## Tasks

### T1 — Backend: subject defaults

**Status**

- [x]

**Goal**

`subject.description` and `subject.icon` are NOT NULL with server defaults, and the API accepts them as optional.

**Dependencies**

None.

**Files**

- An Alembic migration
- The subject SQLModel model
- The `SubjectCreate` schema
- A backend unit test
- `frontend/src/api/types.ts`

**Details**

Subject defaults must live in the backend; a client must never need to know the default.

The subject create contract:

```
POST /api/subjects
  body: { name: string, description?: string, icon?: string }
  201 → Subject { id, name, description, icon }
```

`description` defaults to `""`. `icon` defaults to a constant defined in one place in the backend (e.g. `DEFAULT_SUBJECT_ICON`). Both columns are NOT NULL.

The migration makes both columns NOT NULL with server defaults, backfilling existing nulls first. Set the defaults on the SQLModel model; `SubjectCreate` marks both optional. A unit test: `POST /api/subjects` with only `name` returns the defaults populated.

**Out of scope**

- Any frontend consumption of the defaults: T4 onward.

**Done when**

- The migration applies cleanly up and down.
- At `/docs`, `POST /api/subjects` with `{"name":"Test"}` returns 201 with non-null `description` and `icon`, and a `GET` of the same subject shows them.

**Debrief**

None.

### T2 — Backend: atomic deck create + DeckDetail

**Status**

- [x]

**Goal**

`POST /api/decks` creates a deck as one atomic, fully validated transaction, and `GET /api/decks/{id}` returns the `DeckDetail` read shape.

**Dependencies**

- T1

**Files**

- The `FieldType` enum
- The deck router and its create and read handlers
- Backend tests
- `frontend/src/api/types.ts`

**Details**

Creation must be atomic: a deck is created in a single request containing its name, subject, field definitions and initial cards, with no draft rows and no "save as you go" in create mode. Nothing half-finished must ever reach the database.

A deck must always have at least two field_defs. The create endpoint rejects `field_defs.length < 2`, the batch edit endpoint rejects a changeset whose resulting active field count is `< 2` (T14), and the editor UI disables remove when two fields remain (T9). Archiving counts as removing: a deck must never archive down to fewer than two active fields.

The create payload is positional: `field_defs[i]` has `position = i`, and `cards[j].values[i]` belongs to `field_defs[i]`. Never client-side IDs.

`card_field_value` must be dense over active field_defs: every card has exactly one `card_field_value` row per field_def active on its deck, never sparse, and an unfilled field stores `""`, never a missing row. This is separate from the all-empty-card drop, under which the create endpoint drops a card whose values are all blank rather than persisting it. Whatever changes a deck's field set maintains the invariant: the create endpoint writes a row for every field on every persisted card; the batch edit's field-add backfills a `""` row for every existing card in the same transaction (T14); field-delete's rows go away through the FK cascade. Archived fields are excluded from the invariant.

`field_def.archived_at` must never cascade a delete of that field's `card_field_value` rows; they stay as inert history. An archived field is not part of the deck's fields for any purpose: it is excluded from the density invariant (a newly created card owes it no row), and every read path that returns a card's values or a deck's field list (`DeckDetail.field_defs`, `CardRead.values`, the standalone card endpoints) reflects active fields only.

A deck with zero cards is allowed.

`FieldType` enum (`text` only at this point). `POST /api/decks` follows the contract below with every listed validation rule, in one transaction. `GET /api/decks/{id}` returns the `DeckDetail` shape below.

The deck create contract:

```
POST /api/decks
  body: {
    name: string,
    subject_id: uuid,
    field_defs: [ { name: string, type: FieldType } ],   // position = index
    cards:      [ { values: (string | null)[] } ]        // aligned to field_defs
  }
  201 → DeckDetail
```

Validation, 422 on failure, with a message naming the offending item:

- `name` non-empty after trim.
- `subject_id` exists and belongs to the caller.
- `field_defs` length ≥ 2; names non-empty after trim; names unique within the deck, case-insensitive.
- every `cards[j].values` has length == `field_defs.length`.
- a card whose values are all null or empty is dropped, not rejected.
- `type` is a member of `FieldType`.

Side effects, in one transaction: the deck row; field_def rows with `position = index`; card rows; `card_field_value` rows for every field_def on every persisted card, `""` where the incoming value is null or empty. Never change whether `card_field_mastery` rows are created eagerly here or lazily on first review; follow whatever the existing mastery code does.

The `DeckDetail` read shape:

```
DeckDetail {
  id, name, subject_id, created_at,
  field_defs: [ { id, name, type, position } ],   // sorted by position, active only
  cards: [ { id, created_at, values: { [field_id]: string } } ]  // one key per active field_def, dense
}
```

If the existing `GET /api/decks/{id}` doesn't return this shape, extend it, or add `?include=cards`.

The backend `FieldType`:

```
FieldType = "text" | "image" | "audio"     // backend enum, pre-existing
```

Never shrink it. The create and batch-edit endpoints accept any member.

**Out of scope**

- The batch edit endpoint: T14.
- Single-card endpoint conformance: T10.
- Pagination: large decks are a later concern.

**Done when**

- A backend test covers the happy path.
- Backend tests cover fewer than two fields, zero and one, each returning 422.
- A backend test covers duplicate field names returning 422.
- A backend test covers a misaligned `values` length returning 422.
- A backend test covers an all-empty card being dropped.
- A backend test covers card values being dense over field_defs: `len(values) == len(field_defs)` for every persisted card, including one with a blank value stored as `""`.
- A backend test covers rollback when a later card fails validation, with nothing persisted.
- At `/docs`, creating a deck with two fields and three cards, one of them all-empty, then `GET`ting it shows two fields with positions 0 and 1 and two cards, each with exactly two values keyed by field id.
- At `/docs`, a payload with zero `field_defs` returns 422 with a readable message.

**Debrief**

None.

### T3 — Backend: invariants and cascade

**Status**

- [x]

**Goal**

T2 is corrected with the density invariant, and the deletion policy is implemented.

**Dependencies**

- T2: `POST /api/decks`

**Files**

- SQLModel FK declarations
- An Alembic migration with a working downgrade
- The one-off density backfill migration
- `_requeue_failed_card`

**Details**

Every persisted card gets a `card_field_value` row for every active field, `""` when blank. A one-off Alembic migration backfills a `""` row for every missing `(card, active field_def)` pair in pre-existing data.

The deletion policy, in both the SQLModel FK declarations and an Alembic migration with a working downgrade:

- `card`, `field_def`, `card_field_value`, `card_field_mastery`, `deck_practice_config`, `practice_deck`: `ON DELETE CASCADE` from `deck`.
- `practice_card.card_id`: NOT NULL, `ON DELETE CASCADE`.
- `review_log`: never deleted. Every FK on it (`card_id`, `practice_card_id`, `field_def_id`) is nullable with `ON DELETE SET NULL`.
- `field_def.archived_at` soft-archive is unchanged and unaffected by any of the above.

Fix the `DELETE /api/decks/{id}` 500.

Remove the defensive `None` guard in `_requeue_failed_card`; `practice_card.card_id` being NOT NULL makes the case impossible.

**Out of scope**

- An in-flight `practice_session` whose remaining practice cards are all cascade-deleted transitioning to a terminal status on its next read rather than erroring: deferred to the practice work.

**Done when**

- The migration applies up and down.

**Debrief**

None.

### T4 — Frontend: Create sheet + library/detail pages (read-only)

**Status**

- [x]

**Goal**

The routes, the Create sheet, and read-only library, subject and deck pages are wired against real data.

**Dependencies**

- T3

**Files**

- Router wiring for the routes below
- `CreateSheet`
- `LibraryPage`
- `SubjectDetailPage`
- `DeckDetailPage`
- TanStack Query hooks over the kept API layer
- Tests

**Details**

Each component this task builds must ship with a Vitest and React Testing Library test.

The routes, wired into the shell's router:

| Route | Page | Create entry points present |
| --- | --- | --- |
| `/library` | Library — tabs: **Subjects**, **Decks** | Subject (list page), Deck (list page) |
| `/subjects/:subjectId` | Subject detail — header + decks in this subject | Deck (contextual, subject locked) |
| `/decks/:deckId` | Deck detail — header + cards | Card (contextual, deck locked); `Edit` opens editor in edit mode |
| `/decks/new` | Deck editor, create mode | — |
| `/decks/:deckId/edit` | Deck editor, edit mode | — |

`Create` in the top bar opens the Create sheet from anywhere. The sidebar's **Your library** item points at `/library`. Cards have no global list; their list page is the deck detail page, so for cards the list-page and contextual entry points coincide.

`CreateSheet` is a bottom sheet, reusing the shell's sheet primitive, with a drag handle and three rows, each `[icon] [label]`: **Subject**, **Deck**, **Card**. Tapping a row closes the sheet and opens the corresponding form or editor with no parent prefilled. If the user has zero decks, the Card row stays enabled but shows a muted subline `Create a deck first` and opens the deck editor instead.

Wire `CreateSheet` to the top-bar `Create` button, replacing the no-op stub. Forms don't exist yet, so each row navigates to a placeholder route or page that says which form will open.

`LibraryPage` has Subjects and Decks tabs reading real data through TanStack Query hooks over the kept API layer.

`SubjectDetailPage` and `DeckDetailPage` are read-only, with create buttons present but pointing at the same placeholders.

Every list has an empty state.

**Out of scope**

- Any form or editor: T8 to T11.
- The page layouts: T5, T6 and T7.

**Done when**

- Every route renders without console errors with MSW-mocked data.
- At a narrow viewport, signed in: tapping `Create` opens the sheet with three rows and a drag handle, and a scrim tap and Esc each close it.
- At a narrow viewport, signed in: opening the drawer, then **Your library**, the tabs switch and the lists show real subjects and decks from the backend.
- At a narrow viewport, signed in: tapping a subject shows its decks.
- At a narrow viewport, signed in: tapping a deck shows field chips and card rows.
- At a narrow viewport, signed in: each create button is visible, sized for touch, and leads somewhere that names the pending form.
- Signed out, `/library` redirects or shows a sign-in prompt, whichever the shell already does.

**Debrief**

None.

### T5 — Deck detail page layout

**Status**

- [x]

**Goal**

On `/decks/:deckId`, the parent link, the schema and the data are visually distinct categories.

**Dependencies**

- T4: `DeckDetailPage`

**Files**

- `DeckDetailPage`
- `frontend/src/lib/subjectIcon.ts` (new)
- `frontend/src/components/library/SubjectIcon.tsx` (new)
- The backend's `DEFAULT_SUBJECT_ICON`
- A backfill migration
- Tests

**Details**

Presentation only: no backend changes beyond the icon default, no new endpoints, no new queries. Card and field counts come from `deckDetail.cards.length` and `deckDetail.field_defs.length`; never add count fields, a count endpoint or a separate query.

The page's structure, top to bottom, is the subject breadcrumb, the title and meta, the action row, and the card table.

Subject breadcrumb. It replaces the subject pill and sits above the deck title, rendered as navigation, not as an attribute: `[chevron-left] [subject icon] Subject name`.

- The whole thing is one link to `/subjects/:subjectId`.
- 13px, `text-secondary`, icon at 15px.
- Visually distinct from anything in the schema row: a different position, smaller, no pill background.

Icon rendering. `subject.icon` is an identifier into a curated icon set, never emoji. `frontend/src/lib/subjectIcon.ts` maps a kebab-case identifier (`"brain"`, `"atom"`, `"book-open"`, …) to a `lucide-react` component through a small, statically imported `Record<string, LucideIcon>` of about 25 entries, never through `lucide-react`'s `icons` record. Unrecognized names, blank or missing icons, and legacy emoji values all fall back to `BookOpen`. `frontend/src/components/library/SubjectIcon.tsx` is the render-time wrapper (`<SubjectIcon icon={...} className={...} />`), used everywhere a subject icon appears (library list, subject detail header, deck detail breadcrumb); it must render through `createElement`, never JSX's `<Variable />` tag syntax on a locally resolved component (`react-hooks/static-components`). Backend: `DEFAULT_SUBJECT_ICON` is `"book-open"`, changed from the emoji `"📚"`, with a migration backfilling any row still on the old default.

Title and meta.

- Deck name, 22px, weight 500.
- One muted line beneath: `{cards.length} cards · {field_defs.length} fields`. Singular forms when the count is 1. 13px, `text-muted`.
- This line replaces the standalone `6 cards` label; delete that.

Action row. Three controls in one row, directly under the meta line:

| Control | Style | Behaviour |
| --- | --- | --- |
| **Practice** | Primary, fills remaining width, play icon + label | No-op for now. |
| **New card** | Icon-only, bordered, `plus` icon | Opens the card form (the T4 placeholder for now; T11 wires it) |
| **Edit** | Icon-only, bordered, `edit` icon | Navigates to `/decks/:deckId/edit` (the T9 placeholder for now) |

Icon-only buttons need `aria-label` ("New card", "Edit deck") and must still meet the 44×44 tap target from the shell rebuild even though they render at 38px visually; pad the hit area. Remove the existing standalone `Edit` and `+ New card` pills.

Card table. It replaces both the field-name pill row and the current title/subtitle card list. It is one `<table>`: rows are cards and columns are fields.

The `<table>` with its `<thead>` must render whenever the deck has at least one active field, regardless of card count; the header must never disappear because `<tbody>` is empty. When there are no cards, the empty state (`No cards in this deck yet.` and `New card`) renders below the header row, inside the same wrapper's normal vertical flow but outside the horizontally scrolling region: never in place of the table, and never scrolling away with the header. It stays left-aligned with the table's first column regardless of the header's scroll offset.

Structure:

- A wrapper `<div>` with `overflow-x: auto`, `tabindex="0"`, `aria-label="Cards in {deck name}"` so keyboard users can reach the scroll region.
- `<thead>`: one `<th scope="col">` per field, in `position` order, containing the field name. 12px, `text-muted`, bottom hairline border.
- `<tbody>`: one `<tr>` per card. One `<td>` per field, in the same order, containing `card.values[field.id]`.
- Column width: a fixed `min-width` of about 120px per column so columns don't collapse; the table may exceed the viewport width.
- The first column is frozen: `position: sticky; left: 0` on both its `<th>` and its `<td>`, with an opaque background so scrolled content passes behind it, and a right-edge hairline.
- Header and body scroll as one unit because they share the single wrapper. Never implement per-row scrolling or JS scroll synchronisation.
- A right-edge fade or hairline shadow when the table is scrollable. Never render a `+N` indicator.
- Row hover and press state; tapping a row opens that card (the T4 placeholder for now).
- Use native scrolling. Never add JS drag handling.

Empty values. An empty value is `""`, not a missing key. Render `""` as the word `empty` in italic `text-muted`. Delete the `Untitled card` fallback.

Archived fields are excluded from both the header and the rows. Rows are keyed by `card.id`, never index.

Accessibility:

- The breadcrumb is a real link with discernible text; the icon alone is not enough.
- Icon-only action buttons have `aria-label`.
- The scroll container is focusable and labelled.
- `<th scope="col">` on every header cell.
- Row navigation must be keyboard-reachable. If a whole-row click handler is used, the row needs `tabindex="0"`, `role="link"` or a button, and Enter/Space handling; a nested focusable link inside the first cell is also acceptable and simpler.

Tests:

- Meta line pluralisation at 0, 1 and many for both counts.
- The header renders one cell per non-archived field, in `position` order.
- A card with an empty value renders the `empty` placeholder, not a missing cell, and the row still has one cell per field.
- Archived fields appear in neither header nor rows.
- The breadcrumb links to the correct subject route.
- Icon-only buttons expose their accessible names.
- A deck with one field renders without the frozen column overlapping anything.
- A deck with eight or more fields renders a table wider than its wrapper.
- A deck with zero cards still renders one `<th>` per active field, plus the empty state beneath, not the empty state in place of the table.
- A deck with zero cards and eight fields renders a scrollable header with the empty state anchored beneath it.

**Out of scope**

- Colours and palette.
- Mastery indicators.
- Search or filter within a deck.
- Sorting.
- Desktop grid.
- Practice session behaviour.

**Done when**

- No console errors rendering a deck with 0, 1, and 8+ fields.
- At a narrow viewport: the subject breadcrumb sits above the title, renders a real icon, not the literal identifier string, and navigates to the subject page.
- At a narrow viewport: the meta line reads `6 cards · 4 fields`, and a single-card deck reads `1 card`.
- At a narrow viewport: Practice is the visually dominant action; edit and new-card are icon buttons and both still have comfortable tap targets.
- At a narrow viewport: swiping the card table horizontally, the header row moves with the body, the first column stays put, and nothing desyncs.
- At a narrow viewport: tapping a row still opens the card or its placeholder; the horizontal swipe does not swallow taps, and a tap does not trigger a scroll.
- At a narrow viewport: a card with an empty first field shows `empty` in italic, not `Untitled card`, and the row still has a cell for every field.
- At a narrow viewport: vertical page scroll still works while the finger starts inside the table.
- At a narrow viewport: a deck with 8+ fields shows the right-edge fade, and no `+N` indicator renders anywhere.
- The Debrief reports which `subject.icon` interpretation was found (identifier or emoji), the fallback used, and which row-navigation approach was taken.

**Debrief**

The emoji interpretation shipped first and was superseded after review by the curated-identifier interpretation described in Details.

### T6 — Subject detail and library rows

**Status**

- [x]

**Goal**

`/subjects/:subjectId` reads as the same page grammar as `/decks/:deckId` one level up, and library rows preview their contents.

**Dependencies**

- T5: `SubjectIcon`, and the row-navigation approach it chose

**Files**

- `SubjectDetailPage`
- `LibraryPage` (Subjects tab rows)
- The subject detail response, or the deck list endpoint it uses, if it lacks per-deck counts and field names
- Tests

**Details**

Never revisit subject icon rendering here; reuse T5's `SubjectIcon` at every call site added below.

This page and `/decks/:deckId` read as the same page at different depths: breadcrumb → header block → meta line → action row → labelled list of children, where every row previews what's inside it.

Data. No backend changes by default. All counts derive from data already returned: the deck count for a subject is the length of the subject's deck list; the subject detail page needs, for each deck, its card count and its field names in `position` order. Check what `GET /api/subjects/{id}` currently returns before writing UI. If it returns decks without their card counts and field names, extend that response, or the deck list endpoint it uses, to include per deck: `id`, `name`, `card_count` (integer), and `field_names` (string array, `position` order, archived fields excluded). A per-deck count computed with a single grouped query is fine; never issue one query per deck, and never fetch full card rows just to count them. Library subject rows need a deck count per subject, under the same rule: one grouped query, never N queries.

`/subjects/:subjectId`, top to bottom:

Breadcrumb. `[chevron-left] Your library`, one link to `/library`, 13px, `text-secondary`. It mirrors the deck page's breadcrumb to its subject.

Header block. Horizontal: a 44×44 rounded tile containing the subject icon at 24px, then a text column with the subject name (22px, weight 500) and its description beneath (13px, `text-secondary`). When the description is `""`, render nothing; never reserve space or show a placeholder. Long names wrap; the tile does not shrink.

Meta line. One muted 13px line: `{n} deck · {m} cards` with correct singular and plural on both. `m` is the total card count across the subject's decks. It replaces the standalone `1 decks` label; delete that.

Action row, the same grammar as the deck detail page:

| Control | Style | Behaviour |
| --- | --- | --- |
| **Practice** | Primary, fills remaining width, play icon + label | No-op. |
| **New deck** | Icon-only, bordered, `plus` icon, `aria-label="New deck"` | Opens deck creation with this subject prefilled and locked (the T9 placeholder until then) |
| **Edit** | Icon-only, bordered, `edit` icon, `aria-label="Edit subject"` | Subject edit (placeholder for now) |

Remove the existing `+ New deck` pill. Icon buttons render at 38px but must have a hit area of at least 44×44.

Deck list. A section label `Decks` (12px, `text-muted`) above a hairline, then one row per deck:

- Title: the deck name, 15px, `text-primary`.
- Subtitle: 13px, `text-muted`, single line, `text-overflow: ellipsis`, no wrapping. Composed as `{cards} · {fields}`, where `{cards}` is `{n} cards` (singular at 1), or the literal `No cards yet` when the deck has zero; `{fields}` is the field names joined by `, `, truncated to as many as fit with `+N` appended for the remainder. Compute the cutoff by count, not by measuring text; the first two names plus `+N` is acceptable and deterministic.
- A trailing `chevron-right`, 16px, `text-muted`, as the tappable affordance.
- The whole row navigates to `/decks/:deckId`. Keyed by `deck.id`.

Empty state: when the subject has no decks, replace the list with one line of copy and a `New deck` button. Never render the section label above an empty list.

`/library`, Subjects tab rows. Add a deck count so subject rows preview their contents the same way deck rows do: the subtitle line becomes the description if present; append or replace with `{n} decks` so that a subject with no description still shows its count. The simplest consistent rule: the description on one line, omitted when empty, and the count as a second muted line. Add the trailing `chevron-right`. Never otherwise restyle the library page.

Button labels. Across the app, creation controls use the forms `New subject`, `New deck`, `New card`, as visible labels where a label is shown and as `aria-label` on icon-only buttons. Replace the existing `+ Subject` label on the library page. Grep for other variants and normalise them.

Accessibility. The breadcrumb is a real link with discernible text. Icon-only buttons have the `aria-label`s above. List rows are keyboard-reachable and activate on Enter, using the approach T5 chose so both pages behave identically. The `chevron-right` is decorative: `aria-hidden="true"`.

Tests:

- Meta line pluralisation: 0, 1 and many decks; 0, 1 and many cards.
- Deck row subtitle: zero cards renders `No cards yet`; one card renders `1 card`.
- The deck row subtitle truncates field names with a correct `+N`; a deck with two or fewer fields shows no `+N`.
- Archived fields do not appear in `field_names`.
- A subject with an empty description renders no description line and no reserved gap.
- A subject with no decks renders the empty state, not an empty section label.
- The breadcrumb links to `/library`; a deck row links to the right deck.
- Icon-only buttons expose their accessible names.
- A library subject row shows its deck count.
- The subject detail page issues a bounded number of queries, not one per deck.

**Out of scope**

- Colours and palette.
- Mastery indicators.
- Search or filter.
- Sorting.
- Practice session behaviour.
- Desktop layout.

**Done when**

- No console errors on a subject with 0, 1, and 5+ decks.
- At a narrow viewport: the breadcrumb sits above the header and returns to the library.
- At a narrow viewport: the header shows the icon in a tile with the name and description beside it, and a subject with no description has no blank gap.
- At a narrow viewport: the meta line reads `1 deck · 6 cards`, and a subject with 2 decks reads `2 decks`.
- At a narrow viewport: Practice is visually dominant; New deck and Edit are icon buttons with comfortable tap targets.
- At a narrow viewport: deck rows show card count and field names; a deck with 4+ fields shows `+N`; a deck with no cards reads `No cards yet`.
- At a narrow viewport: a long deck name and a long field list both truncate on one line rather than wrapping.
- At a narrow viewport: tapping a deck row opens that deck, and the chevron is not separately tappable.
- At a narrow viewport: a subject with no decks shows the empty state with a working New deck button.
- At a narrow viewport: Library › Subjects rows show deck counts and chevrons, and the create button reads `New subject`.
- The Debrief reports the subject-detail response shape found and any backend change made, the arrangement chosen for the library row's description plus count, and confirms the query count is bounded.

**Debrief**

None.

### T7 — List row grammar

**Status**

- [x]

**Goal**

`/library` and `/subjects/:subjectId` display their children through one shared `ListRow` grammar: identity and shape on the left, size on the right, chevron last.

**Dependencies**

- T5: `SubjectIcon`, and the row-navigation approach it chose
- T6: `LibraryPage`'s subject rows and `SubjectDetailPage`'s deck rows

**Files**

- The shared `ListRow` component (new)
- `LibraryPage` (Subjects tab rows)
- `SubjectDetailPage` (deck rows)
- Tests

**Details**

Presentation only, no endpoint changes. This task replaces T6's deck list rows and library subject rows; T6's breadcrumb, header block, meta line, action row and empty states stay unchanged.

Build `ListRow` once and use it for both row types.

```
ListRow props:
  leading?:   ReactNode      // icon; omitted on deck rows
  title:      string
  subtitle?:  string         // omitted when empty — no reserved space
  meta?:      string         // right-aligned size/count
  to:         string         // route the whole row navigates to
```

Layout, left to right: `leading` (flex-shrink 0) · a flexible text column (`min-width: 0`) · `meta` (flex-shrink 0) · `chevron-right` (flex-shrink 0).

Rules:

- Vertical padding 14px; a hairline bottom border on every row except the last.
- `title`: 15px, `text-primary`.
- `subtitle`: 13px, `text-secondary`, single line, `white-space: nowrap` + `overflow: hidden` + `text-overflow: ellipsis`. It must never wrap.
- `meta`: 13px, `text-muted`, never truncated.
- `chevron-right`: 16px, `text-muted`, `aria-hidden="true"`, decorative only and not separately tappable.
- The whole row is one navigation target, keyboard-reachable and Enter-activated, using the approach T5 chose.
- Rows are keyed by entity id, never index.

The text column must keep `min-width: 0`.

Library, Subjects tab:

| Slot       | Content                                           |
| ---------- | ------------------------------------------------- |
| `leading`  | Subject icon through T5's `SubjectIcon`           |
| `title`    | Subject name                                      |
| `subtitle` | `subject.description`, omitted entirely when `""` |
| `meta`     | `{n} decks`, singular at 1                        |

A subject with no description renders a two-line row; one with a description renders a two-line row of the same height.

Subject page, deck list:

| Slot | Content |
| --- | --- |
| `leading` | _(none)_ |
| `title` | Deck name |
| `subtitle` | Field names in `position` order, joined by `, `, archived excluded — first two names, with ` +N` appended when more remain. No `+N` at ≤2 fields. |
| `meta` | `{n} cards` (singular at 1), or the literal `No cards` when zero |

Never add the total field count back into the row.

Tests:

- `ListRow` renders no subtitle element and no reserved gap when `subtitle` is absent.
- A very long subtitle ellipsises on one line and does not displace or truncate `meta`.
- Library row: the description shows when present and is omitted when `""`; the deck count pluralises at 0, 1 and many.
- Deck row: the subtitle lists at most two field names; `+N` appears only above two; archived fields are excluded and not counted in `N`.
- Deck row: `meta` reads `No cards` at zero and `1 card` at one.
- Both row types navigate to the correct route from a click and from Enter.
- The chevron is not independently focusable or clickable.
- Rows with and without a subtitle render at the same height.

**Out of scope**

- Endpoint changes.
- Restyling anything beyond the two row types.

**Done when**

- At a narrow viewport: on Library › Subjects every row is the same height whether or not it has a description, and counts sit right-aligned before the chevron.
- At a narrow viewport: a subject with a very long description ellipsises on one line and the count stays put on the right edge.
- At a narrow viewport: on the subject page, deck rows show field names as the subtitle and the card count on the right; a deck with 4+ fields shows `+2`-style overflow; a deck with two fields shows no `+N`.
- At a narrow viewport: a deck with zero cards reads `No cards`.
- At a narrow viewport: tapping anywhere on a row, including on the count, navigates; tapping the chevron does nothing separate.
- At a narrow viewport: tabbing to a row and pressing Enter navigates.
- At a narrow viewport: both pages' rows share the same rhythm: same height, same padding, same right-edge alignment.
- The Debrief confirms `ListRow` is a single shared component used by both pages, not duplicated markup.

**Debrief**

None.

### T8 — Frontend: Subject create and edit

**Status**

- [x]

**Goal**

`SubjectForm` works in both modes with its entry points and delete flow, and any missing single-subject backend endpoints are added.

**Dependencies**

- T6: the subject detail page's `Edit` icon button
- T7

**Files**

- `SubjectForm`
- `SubjectPicker`
- Entry-point wiring
- `PATCH /api/subjects/:id` and `DELETE /api/subjects/:id`, if missing
- Tests

**Details**

Each component this task builds must ship with a Vitest and React Testing Library test.

`SubjectForm` is a full-screen modal with two modes.

- Create: fields `name` (required), `description` (optional, multiline), `icon` (optional; a plain text identifier input for now). Submit → `POST /api/subjects` → close → navigate to `/subjects/:id`.
- Edit: the same form, prefilled from the subject, title `Edit subject`. Submit → `PATCH /api/subjects/:id` → close → stay on the subject page with the header updated. A `Delete subject` action at the bottom, destructive style, behind a confirm that states the count of decks that will cascade. On delete → navigate to `/library`.

The subject detail page's `Edit` icon button (T6) opens it in edit mode. The primary button is a full-width pill at the bottom; the keyboard must never cover it on mobile.

Build `SubjectPicker` with inline create here; T9 first uses it.

Wire create: Create sheet → Subject; Library › Subjects → `New subject`. Subjects have no parent, so there is no contextual entry.

Wire edit: Subject detail → `Edit` icon button → `SubjectForm` in edit mode, with `Delete subject` inside it.

Verify that `PATCH /api/subjects/:id` and `DELETE /api/subjects/:id` exist; add them in this task if missing.

After create, navigate to the new subject's page; after edit, stay, with the header reflecting the changes; after delete, go to `/library`. Lists update through query invalidation, with no manual refresh.

**Out of scope**

- The deck editor and `SubjectPicker`'s consumer: T9.
- The icon picker: deferred, `icon-picker`.

**Done when**

- A test covers form validation: an empty name is blocked in both modes.
- A test covers create submit.
- A test covers that edit submit sends only the form's fields.
- A test covers the delete confirm flow.
- A test covers query invalidation for list and detail.
- In the browser: creating a subject from the sheet with only a name lands on its page, and back on Library it shows with `0 decks`.
- In the browser: creating another from the Library tab with a description shows the description on its row and header.
- In the browser: opening a subject → `Edit` → changing the description → saving updates the header without reload.
- In the browser: on a subject with decks, `Edit` → `Delete subject` shows a confirm naming the deck count, and after confirming you are on `/library` and the subject is gone.
- In the browser: the keyboard doesn't cover the primary button on mobile.
- In the browser: `Cancel` with changes prompts; without changes it doesn't.

**Debrief**

None.

### T9 — Frontend: Deck editor, create mode

**Status**

- [x]

**Goal**

`DeckEditor` works in create mode with `CardFieldsForm`, `CardForm`'s in-editor role, and all three deck-creation entry points.

**Dependencies**

- T2: `POST /api/decks`
- T7: `ListRow`
- T8: `SubjectPicker`

**Files**

- `DeckEditor` (create mode only)
- `CardFieldsForm`
- `CardForm`, in its in-editor role
- `ListRow`, extended with `onClick`
- Entry-point wiring
- Tests

**Details**

Each component this task builds must ship with a Vitest and React Testing Library test.

The card form must be generated from the deck's field_defs: one labelled input per field, in position order. The same component is the per-card view inside the deck editor.

The mobile deck editor must be two lists, never a grid: a Fields section (a reorderable list with type select) and a Cards section (a list of card summaries opening the card form). The grid is a desktop-only follow-up (`desktop-grid`).

The frontend supports only `text` for now. One allowlist, defined once:

```ts
export const SUPPORTED_FIELD_TYPES = [
  "text",
] as const satisfies readonly FieldType[];
```

- The deck editor's type select offers only `SUPPORTED_FIELD_TYPES`.
- `CardFieldsForm` renders a field whose type is not supported as a read-only text input showing the stored value, with a muted note `Unsupported field type`. Existing data with `image` or `audio` fields must still render rather than crash.

Adding a type later is: add a widget to `CardFieldsForm`, add the member to the allowlist. Nothing else.

`CardFieldsForm` props: `fieldDefs: FieldDef[]`, `values: Record<fieldId, string>`, `onChange`. It renders one labelled input per field in position order, the input widget chosen by `type` (only `text` exists). It has no submit button of its own; parents wrap it.

`CardForm` is a full-screen modal. In its in-editor role inside `DeckEditor`, it adds and edits cards in editor state with no network calls, calling back into the reducer instead. Mode is a prop; the form body is identical in every mode.

`DeckEditor` is a full-screen route page. Mode is `create` or `edit`, derived from the route.

State: `{ name, subjectId, fields: EditorField[], cards: EditorCard[] }` plus dirty tracking. `EditorField = { key, id?, name, type }`, `EditorCard = { key, id?, values: Record<fieldKey, string> }`. `key` is a client-generated stable key; `id` is present only in edit mode for pre-existing entities. Keep this state in a reducer; the two persistence paths are pure functions from state, plus the original state in edit mode, to request bodies.

Header, sticky: `Cancel` (confirm if dirty), title `New deck` / `Edit deck`, `Save` (disabled until valid).

Name and subject: a text input; `SubjectPicker` with inline create.

Fields section:

- A reorderable list. Row: `[name input] [type select] [overflow menu] [remove]`.
- An `Add field` button below the list.
- A new deck starts with two `text` fields named `Term` and `Definition`.
- Reorder through Move up and Move down in the row's overflow menu; never drag.
- Remove is disabled when two fields remain, with a tooltip/aria-description: `A deck needs at least two fields.` Removing a field that has any non-empty value in any card prompts a confirm naming the count of affected cards.
- Validation shown inline: empty name, duplicate name.

Cards section:

- The section label shows the count.
- Rows use the shared `ListRow` with `onClick` instead of `to`: add `onClick?: () => void` to `ListRow` and make exactly one of `to`/`onClick` required, keeping the existing `to` behaviour byte-for-byte.
- `title` is the first active field's value, or the italic `text-muted` word `empty` when blank, matching T5's table treatment.
- `subtitle` is the second field's value, omitted when blank or when the deck has one field.
- No `meta`.
- `Add card` opens `CardForm` in its in-editor role with `fieldDefs` taken from editor state; on save it appends to editor state. Tapping a row reopens it; delete lives inside that form.
- Adding a field after cards exist gives every card `""` for it.

Validity, which gates Save: name non-empty; subject chosen; at least two fields; all field names non-empty and unique. Cards with all-empty values are dropped at save time, silently.

Save, create mode: build the T2 create payload (fields in list order; each card's `values` array aligned to that order; `""` → `null`), `POST /api/decks`, navigate to `/decks/:id`.

Wire: Create sheet → Deck; Library › Decks → `New deck`; Subject detail → `New deck` icon button, with the subject locked.

Inline subject creation from inside the editor goes through `SubjectPicker`.

**Out of scope**

- Edit mode: T15.
- Drag reorder: `desktop-grid` territory.

**Done when**

- Reducer tests cover add, rename, reorder and remove field; add, edit and remove card; values realigned after reorder; remove being a no-op at two fields.
- Payload builder tests cover ordering, `""` → `null`, all-empty cards dropped, and never fewer than two field_defs.
- A test covers the type select offering only `text`.
- A test covers submit against MSW.
- A test covers `ListRow` with `onClick` rendering no link and firing the handler on click and on Enter.
- In the browser: Subject detail → `New deck` shows the subject locked.
- In the browser: renaming `Term` to `Word`, adding a third field, and reordering it to first through the overflow menu's Move up all work.
- In the browser: the type select shows only `text`.
- In the browser: with three cards added, one left fully empty and another with a blank first field, the latter's editor row reads `empty`.
- In the browser: after removing down to two fields, removing either is blocked.
- In the browser: removing a field that has values, while three or more remain, shows a confirm naming the card count.
- In the browser: typing a subject that doesn't exist → `Create "…"` → it is selected.
- In the browser: Save lands on deck detail, and the table shows two cards, fields in your order, and `empty` where you left a blank; a reload shows it persisted.
- In the browser: starting a new deck, typing something, then `Cancel` prompts.

**Debrief**

None.

### T10 — Backend: single-card endpoints conform (conditional)

**Status**

- [x]

**Goal**

The pre-existing single-card endpoints conform to the single-card contract, with only what differed fixed.

**Dependencies**

- T9

**Files**

- The card router and its tests
- `frontend/src/api/types.ts`

**Details**

The single-card contract:

```
POST /api/cards
  body: { deck_id: uuid, values: { [field_id]: string } }
  201 → CardRead

PATCH /api/cards/{card_id}
  body: { values: { [field_id]: string } }       // partial; only keys present are changed
  200 → CardRead

DELETE /api/cards/{card_id}
  204

CardRead { id, deck_id, created_at, values: { [field_id]: string } }   // dense over active fields
```

Rules:

- `POST`: any active field omitted from `values` is written as `""`, so the persisted row set is dense regardless of what the client sends. A key that is not an active field of `deck_id` (unknown, archived, or belonging to another deck) → 422 naming it. A card whose values are all blank → 422 `card has no values`.
- `PATCH`: merge semantics over the existing dense row set. The same key validation. It cannot make a card all-blank (→ 422); delete it instead.
- `DELETE`: cascades per T3's deletion policy. Mastery rows for this card are gone; review_log rows remain with `card_id` null.
- Responses are dense: exactly one key per active field.

Single-card operations are atomic per card. They are a different scope from the deck editor's batched changeset (T14).

Read the existing card router and compare it against the contract line by line. If every rule already holds, record that in the Debrief and change nothing; never refactor working code for style. If anything differs, fix it here:

- Dense write on `POST`: omitted active fields → `""`.
- Key validation against the deck's active fields: unknown, archived or foreign → 422.
- All-blank → 422 on `POST` and on a `PATCH` that would leave the card blank.
- Dense `CardRead.values` on every response.
- Tests named for the rule they enforce, e.g. `test_card_create_writes_dense_rows_for_omitted_fields`, `test_card_create_rejects_archived_field_key`, `test_card_patch_cannot_blank_all_values`.

**Out of scope**

- Refactors beyond conformance to the single-card contract.

**Done when**

- At `/docs`, `POST /api/cards` with only one of two fields, then `GET`, shows both keys, the omitted one `""`.
- At `/docs`, `POST /api/cards` with a key from another deck returns 422.
- At `/docs`, a `PATCH` blanking the last non-empty value returns 422.

**Debrief**

None.

### T11 — Frontend: Standalone card create, edit, delete

**Status**

- [x]

**Goal**

The standalone `CardForm` works in both modes, with `DeckPicker` and all card entry points.

**Dependencies**

- T5: the deck detail table's rows
- T9: `CardFieldsForm`, `CardForm`
- T10: the single-card endpoints

**Files**

- `DeckPicker`
- `CardForm`, standalone in both modes
- Entry-point wiring
- Tests

**Details**

Each component this task builds must ship with a Vitest and React Testing Library test.

`CardForm`'s standalone modes:

- Create: at the top, `DeckPicker`, locked when opened contextually. The body: `CardFieldsForm` for the selected deck's active field_defs. If the deck changes after values were typed, confirm, then clear. Submit → `POST /api/cards` → close → the deck's table shows the new row.
- Edit: opened by tapping a row in the deck detail table (T5). Deck locked; prefilled; title `Edit card`. Submit → `PATCH /api/cards/:id` with only the changed keys → close. `Delete card` at the bottom, behind a confirm → `DELETE` → close.

`DeckPicker` has an empty state that leads to `/decks/new`.

Wire create: Create sheet → Card; Deck detail → `New card` icon button, with the deck locked.

Wire edit: a Deck detail table row tap → `CardForm` in edit mode, with `Delete card` inside it.

Changing the deck after typing values → confirm → clear.

After any write, the deck detail query invalidates and the table reflects it.

**Out of scope**

- The deck editor's batched in-editor card edits: T15.
- Picker behaviour changes: T13.

**Done when**

- A test covers the picker's empty state.
- A test covers the deck-change confirm and clear.
- A test covers create submit.
- A test covers that edit submit sends only changed keys.
- A test covers the delete confirm flow.
- A test covers invalidation.
- In the browser: Deck detail → `New card` shows the deck locked and inputs matching the deck's fields in order, and saving adds a new row to the table.
- In the browser: tapping that row opens the form prefilled, and changing one value and saving updates the table.
- In the browser: tapping it again → `Delete card` → confirm removes the row, and the meta line count decrements.
- In the browser: from the sheet → Card → picking a deck → typing → switching deck → confirming clears the inputs.
- In the browser: on a fresh account, sheet → Card shows `Create a deck first` and leads to the deck editor.
- In the browser: a deck containing an `image`-typed field, seeded through `/docs`, renders that field read-only with the unsupported note and does not crash.

**Debrief**

None.

### T12 — Backend: `last_activity_at` and recency ordering

**Status**

- [x]

**Goal**

`subject` and `deck` carry the two timestamp columns, `touch()` bubbles `last_activity_at` at every recency event, and every subject and deck list is ordered by recency server-side.

**Dependencies**

- T11

**Files**

- An Alembic migration for `subject` and `deck`
- The `touch()` helper
- Every handler in the bubbling table below
- The list endpoints
- The `Subject` and `Deck` read schemas
- Tests
- `frontend/src/api/types.ts`

**Details**

`subject` and `deck` carry two timestamps with different contracts:

- `updated_at`: an audit field. It changes only when this row's own columns change. Never bubbled, never touched by hand.
- `last_activity_at`: the sort key. It changes when the row's own columns change or when its direct contents change, in the same transaction. Creation counts as activity: `last_activity_at = created_at` at insert.

Every list of subjects or decks anywhere in the app (library tabs, subject page, pickers) must be ordered by `last_activity_at` descending (ADR 018).

The bubbling rule for `last_activity_at`, and only `last_activity_at`:

| Event | Touches `last_activity_at` on |
| --- | --- |
| Subject name/description/icon edited | subject |
| Deck created, deleted, or moved to another subject | subject (both old and new on move), deck |
| Deck name edited | deck |
| Field created, edited, archived, deleted, reordered | deck |
| Card created, edited, deleted (standalone or via batch edit) | deck |

Editing a card must never touch the subject. Cards get neither column; the deck detail table stays in creation order. "Last practiced" for a card, when it's wanted, is `MAX(card_field_mastery.updated_at)` over that card's mastery rows: derived, never stored.

Schema. An Alembic migration, for both `subject` and `deck`:

- `updated_at timestamptz NOT NULL`, `server_default=now()`, backfilled from `created_at`. Never `onupdate`: every own-column-edit handler sets it explicitly, alongside its `touch()` call.
- `last_activity_at timestamptz NOT NULL`, `server_default=now()`, backfilled from `created_at`. Never `onupdate`: only `touch()` ever sets it, and own-column edits call `touch()` too.
- A working downgrade.

Bubbling. One helper, used everywhere: `touch(session, *rows)` sets `last_activity_at = now()` on the given rows. It never writes `updated_at`. Call it inside the existing transaction, never in a separate commit, at every event in the bubbling table:

- The subject own-column edit handler → `touch(subject)`.
- The deck own-column edit handler → `touch(deck)`.
- The deck create, delete and subject-change handlers → `touch(subject)` (both subjects on a move) and `touch(deck)`.
- Every field_def write path (the `/fields` endpoint family; T14's batch edit when it lands) → `touch(deck)`.
- `POST /api/cards`, `PATCH /api/cards/{id}`, `DELETE /api/cards/{id}` → `touch(deck)`.
- `POST /api/decks` atomic create → the deck's `last_activity_at` set at insert; `touch(subject)`.

Ordering. Every endpoint that returns a list of subjects or decks orders by `last_activity_at DESC, id` server-side. The frontend never sorts these lists. The `Subject` and `Deck` read schemas include both `updated_at` and `last_activity_at`.

**Out of scope**

- Adding either column to `card`, `field_def`, or anything else.
- Any frontend change; recency ordering arrives through the server, verified in the browser.

**Done when**

- The migration applies up and down cleanly.
- `test_subject_timestamps_equal_created_at_on_insert`, and its deck equivalent, pass.
- `test_subject_edit_bumps_updated_at_and_last_activity`, and its deck equivalent, pass.
- `test_deck_create_touches_subject_last_activity`, `test_deck_delete_touches_subject_last_activity` and `test_deck_move_touches_both_subjects_last_activity` pass.
- `test_field_write_touches_deck_last_activity` passes, one per write path that exists today.
- `test_card_create_touches_deck_last_activity`, `test_card_patch_touches_deck_last_activity` and `test_card_delete_touches_deck_last_activity` pass.
- `test_card_edit_does_not_change_deck_updated_at` and `test_field_write_does_not_change_deck_updated_at` pass.
- `test_card_edit_does_not_touch_subject` passes.
- `test_subject_list_ordered_by_last_activity_desc`, `test_deck_list_ordered_by_last_activity_desc` and `test_subject_decks_ordered_by_last_activity_desc` pass.
- At `/docs`: after listing subjects, `PATCH`ing the last subject's description moves it first in a new list, and both its `updated_at` and `last_activity_at` moved.
- At `/docs`: `POST`ing a card into a deck in another subject, then `GET`ting that deck, shows `last_activity_at` moved and `updated_at` not; the deck is first in its subject's deck list, and the subject order is unchanged.
- At `/library`, subjects and decks already appear in recency order with no frontend change.

**Debrief**

None.

### T13 — Frontend: Picker behaviour

**Status**

- [x]

**Goal**

A picker's create row is always present, a contextual parent is preselected rather than locked, and one universal cap limits every search dropdown's list.

**Dependencies**

- T8: `SubjectForm`, `SubjectPicker`
- T9: `DeckEditor`
- T11: `DeckPicker`, `CardStandaloneForm`
- T12: the server's recency order

**Files**

- `frontend/src/lib/pickerConfig.ts` (new)
- The shared picker base component, extracted here if the two pickers don't already share one
- `SubjectPicker`
- `DeckPicker`
- `SubjectForm`'s wrappers
- `DeckEditor` (`returnTo`)
- `CardStandaloneForm`
- Every contextual entry point listed under Contextual entry points below
- Tests

**Details**

Each component this task builds must ship with a Vitest and React Testing Library test.

Every artifact can be created from three entry points: the top-bar `Create` shortcut, its own list page, and contextually from its parent's detail page. All three must render the same form or editor component; the entry point only determines whether the parent picker starts empty or starts with the contextual parent preselected. The picker is always editable in create mode. `locked` remains only for edit mode, where the parent cannot change: a card cannot move between decks.

Missing parents. Creating a deck with no suitable subject: the subject picker's last row is always `New subject…`, which opens the full subject form as an overlay; on success the new subject is selected. Creating a card with no suitable deck: the deck picker's last row is always `New deck…`, which navigates to the deck editor with a return-to; on save the new deck is selected. Creating a card never creates a deck.

Universal list cap:

```ts
// src/lib/pickerConfig.ts
export const PICKER_MAX_ITEMS = 8;
```

Every search dropdown lists at most `PICKER_MAX_ITEMS` matches. One constant, never a literal. With an empty query, the listed items are the first `PICKER_MAX_ITEMS` in the order the server returned them, most recent `last_activity_at` first; never re-sort on the client. When more exist than are shown, a muted non-interactive footer row reads `Showing {shown} of {total} · type to narrow`. The create row always follows it.

Shared picker behaviour. Both pickers share this; if they don't already share a base component, extract one now rather than fixing two copies.

- Opening: focus or click opens the list. With an empty query, show items per the cap, always, including when there are zero items; then the list is just the create row.
- Filtering: case-insensitive substring on name, the cap applied after filtering, server order preserved among matches.
- Create row: always last, a hairline above it, a leading `plus` icon, the label `New subject…` / `New deck…`. Present regardless of query and regardless of matches. Reachable by arrow keys and Enter.
- Remove the in-list empty-state copy (`You don't have any decks yet.`); the create row is the empty state.
- `defaultValue` preselects an item on mount; the input shows its name; clearing the input reopens the full list. Contextual entry points pass the parent this way.
- `locked`: unchanged, a static chip with no combobox. Used only by card edit mode.
- Keep the `role="combobox"` contract and the two focus and filter fixes from T11.

`SubjectPicker` is a combobox on the shared `PickerCombobox`, alongside `DeckPicker`. Its last row opens `SubjectForm`'s create body in a `FullScreenDialog` over whatever the picker is embedded in, and on success the picker's selection becomes the new subject immediately, without waiting for the subjects query to refetch. Props: `defaultValue?: {id, name, icon}` (preselects on mount, still fully editable, not a lock), `locked?: boolean` (a static chip, no combobox; reserved for a future edit-mode use), `onChange`.

`DeckPicker` is the same shared combobox, without inline create: its create row navigates away. Props: `defaultValue?: {id, name}`, `locked?: boolean` (a static chip, card edit mode only), `onChange`, `onCreateNew` (fires when the create row is chosen; the picker itself has no opinion on what that means).

`SubjectPicker` → subject form overlay. Selecting `New subject…`:

- Opens `SubjectForm` in create mode inside the existing `FullScreenDialog`, over the still-mounted deck editor. Editor state is untouched.
- `SubjectForm` is one component with two thin wrappers, as T11 did for cards: the form body takes `onSuccess(subject)` / `onCancel()` / `onDelete?()` instead of navigating itself. The routed page (`/subjects/new`, `/subjects/:id/edit`, unchanged from T8) wraps it and navigates on each callback; `SubjectPicker`'s create overlay wraps the same body, create mode only, in a `FullScreenDialog` and updates the picker's selection instead of navigating. Never duplicate the form.
- Success: the dialog closes, the subjects query invalidates, and the picker value becomes the new subject from the response, without waiting for the refetch.
- Cancel: the dialog closes, the picker value unchanged.
- The dialog has `aria-label="New subject"` and returns focus to the picker on close.

`DeckPicker` → deck editor round-trip. Selecting `New deck…` from the card form:

- If the card form has typed values, the existing deck-change confirm fires first. Confirm → clear and proceed; cancel → stay.
- Navigate to `/decks/new` with `state: { returnTo: location.pathname }`.
- `DeckEditor` reads `returnTo`. On Save, it navigates to `returnTo` with `state: { deckId }` instead of to the deck's detail page. On Cancel, it navigates to `returnTo` with no state.
- `CardStandaloneForm` reads `state.deckId` on mount and preselects through `defaultValue`.
- The deck editor's own subject overlay can open during this trip; `returnTo` survives it.

Contextual entry points. Every create flow that previously passed `locked` now passes `defaultValue`:

- Subject detail → `New deck` → `SubjectPicker defaultValue={subject}`.
- Deck detail → `New card` and its empty-state button → `DeckPicker defaultValue={deck}`.
- Card edit → `DeckPicker locked`, unchanged.

The deck editor's subject row renders the combobox with the subject preselected in create mode, not a static chip.

Tests:

- Zero items → exactly one row: the create row.
- `PICKER_MAX_ITEMS + 3` items, empty query → `PICKER_MAX_ITEMS` rows in server order, the footer, then the create row.
- Typing narrows; the create row is still last and keyboard-reachable.
- `defaultValue` preselects; clearing shows the full list.
- `SubjectPicker` create → overlay; cancel → no change; success → the new subject selected, the editor's other fields untouched.
- `DeckPicker` create with typed values → confirm → `/decks/new` with `returnTo`.
- `DeckEditor` with `returnTo` → there with `deckId` on save, without it on cancel.
- `CardStandaloneForm` preselects from `state.deckId`.
- No client-side sort of subject or deck lists: grep for `.sort(` on those arrays.
- No literal `8` where a picker caps its list: grep.

**Out of scope**

- Backend changes.
- Drag enhancements.
- Any picker consumer beyond the contextual entry points listed in Details.

**Done when**

- At a narrow viewport: Subject detail → `New deck` shows the subject picker with `CompTIA A+` preselected and editable; clearing it shows the full list, most recent activity first, with `New subject…` last.
- At a narrow viewport: `New subject…` opens the form over the editor, and saving returns with the new subject selected and the deck name you'd typed still present.
- At a narrow viewport: the same with Cancel returns with `CompTIA A+` still selected.
- At a narrow viewport: with at least 9 subjects, opening the picker empty shows 8 rows, a `Showing 8 of N` footer and `New subject…`, and typing narrows.
- At a narrow viewport: after editing a subject's description, reopening the picker shows that subject first.
- At a narrow viewport: sheet → Card → opening the deck picker without typing lists decks by recency with `New deck…` last.
- At a narrow viewport: `New deck…` → editor → save returns to the card form with the new deck preselected and its fields rendered.
- At a narrow viewport: the same with Cancel in the editor returns with no deck selected.
- At a narrow viewport: Deck detail → `New card` shows the deck preselected and editable, and tapping a card row opens edit mode with the deck as a static chip.
- At a narrow viewport: after adding a card to a deck, `/library` › Decks shows that deck first.
- The Debrief reports whether the two pickers share a base component and confirms `SubjectForm` is one component with two wrappers.

**Debrief**

None.

### T14 — Backend: batch deck edit

**Status**

- [x]

**Goal**

`PATCH /api/decks/{deck_id}` applies a deck's batch edit in one transaction, in the stated operation order, keeping the two-field floor, the density invariant and the recency bubbling.

**Dependencies**

- T12: `touch()`
- T13

**Files**

- The deck router's batch-edit handler and its tests
- `frontend/src/api/types.ts`

**Details**

Edit mode saves as a single batched changeset; nothing half-finished ever reaches the database.

The batch edit contract:

```
PATCH /api/decks/{deck_id}
  body: {
    name?: string,
    subject_id?: uuid,
    field_defs?: {
      create:  [ { client_key: string, name, type } ],
      update:  [ { id: uuid, name?, type? } ],
      delete:  [ uuid ],
      order:   (uuid | client_key)[]        // full ordered list after all changes
    },
    cards?: {
      create:  [ { values: { [field_id_or_client_key]: string | null } } ],
      update:  [ { id: uuid, values: { [field_id_or_client_key]: string | null } } ],  // partial: only changed fields
      delete:  [ uuid ]
    }
  }
  200 → DeckDetail
```

`client_key` is any string the client chooses for fields that don't exist yet; it is valid only within this request. Apply the changeset in one transaction in this order: field create → field update → field delete → reorder → card delete → card update → card create. Reject with 422 if the resulting deck would have fewer than two active fields, or if any referenced id doesn't belong to this deck. Deleting a field_def cascades its values and mastery rows; the UI confirms before sending.

Density: a `field_defs.create` entry must backfill a `""` `card_field_value` row for every one of the deck's existing cards, in the same transaction as the field's own creation. A `field_defs.delete` entry needs no equivalent code: its rows go away through the existing FK cascade. The test list must include one test per direction, each named after the invariant it maintains (`test_field_create_backfills_dense_card_field_value_rows`, `test_field_delete_cascades_card_field_value_rows`), never folded into a generic field-create or field-delete test.

Recency: any changeset that touches `field_defs` or `cards` → `touch(db, deck)`; a `subject_id` change → `touch(db, old_subject, new_subject)`. When `name` or `subject_id` changes, the handler sets the deck's `updated_at` explicitly, never through a column-level `onupdate`.

**Out of scope**

- The frontend consumer: T15.

**Done when**

- Backend tests cover each operation alone.
- A backend test covers a combined create-field plus add-card using its `client_key`.
- Backend tests cover a delete below two fields returning 422, both from two fields and from one, if reachable.
- A backend test covers a foreign id returning 422.
- A backend test covers a mid-request failure rolling back everything.
- A backend test covers a reorder updating positions contiguously.
- `test_field_create_backfills_dense_card_field_value_rows` passes: adding a field to a deck with existing cards gives every one of them a new `""` row, in the same transaction.
- `test_field_delete_cascades_card_field_value_rows` passes: deleting a field removes its `card_field_value` rows.
- At `/docs`, on the deck from T2: adding a field through `client_key` and a card referencing it in the same request, then `GET`ting, shows both, with the card's value attached to the new field's real id.
- At `/docs`, a delete of every field returns 422.

**Debrief**

None.

### T15 — Frontend: Deck editor, edit mode

**Status**

- [x]

**Goal**

A deck loads into the editor, its edits diff against the frozen original into a batch-edit changeset, and the Edit entry point is wired.

**Dependencies**

- T9: `DeckEditor`
- T14: `PATCH /api/decks/{deck_id}`

**Files**

- `DeckEditor`, edit mode
- The diff function
- `deckDetailToEditorState`
- The Deck detail `Edit` wiring
- Tests

**Details**

Load `DeckDetail` into editor state with ids; keep a frozen copy as `original`.

The diff function turns the current state against `original` into T14's changeset. Unit-test it exhaustively.

Save, edit mode: diff the current state against the loaded original, build the changeset, `PATCH`.

An edit-mode Save with no changes sends no request and navigates back.

Wire Deck detail → `Edit`.

Deleting a field shows the cascade confirm with the count of affected cards.

The Cards section in edit mode uses the same `ListRow` rows as create mode; tapping a row opens `CardForm` in its in-editor role, not the standalone edit mode. Edits here are batched into the changeset, never sent immediately.

**Out of scope**

- Staged-removal presentation and save-in-place: T16.
- Deck deletion: T17.

**Done when**

- Diff tests cover: no-op → empty body; rename only; reorder only; a new field plus a new card referencing it; delete card; mixed.
- A test covers submit against MSW.
- In the browser: editing the T9 deck by renaming a field, adding a field, adding a card with a value in the new field, deleting one old card and reordering, then Save, shows all of it on deck detail, and a reload shows it persisted.
- In the browser: opening edit, changing nothing and saving sends no request, or an empty-body request that's a no-op; the Debrief states which.
- In the browser: opening edit and deleting down to two fields, removing either is blocked in the UI.
- In the browser: editing a card from inside the deck editor, then `Cancel` in the editor, leaves the card unchanged on the detail page.

**Debrief**

This task widened the batch edit's `cards.update.values` to accept a `client_key`.

### T16 — Staged removals and save-in-place

**Status**

- [x]

**Goal**

Staged changes look staged in the deck editor, with pending-removal rows, one global Undo, the destructive confirm moved to Save, and save-in-place.

**Dependencies**

- T15: `deckDetailToEditorState`, the diff builder, `original`

**Files**

- The `DeckEditor` reducer
- The diff builder's call sites
- The header controls
- Their tests

**Details**

Deck editor only: the presentation of staged removals, the confirm's timing, and post-save behaviour.

Pending removal, no per-row undo:

- Existing (saved) fields: Remove no longer deletes the row from the list and no longer shows a confirm. The row enters a `pendingRemoval` state: struck-through name, ghosted (about 50% opacity), name input and type select disabled, drag and move disabled. The row's own remove control is replaced with nothing interactive: no per-row way to reverse just this one field, no inline note, no confirm at click time. The row keeps its position.
- Brand-new fields, added this session with no server id: Remove deletes the row outright, with no staging.
- Cards, the same treatment: deleting a saved card from the in-editor `CardForm` marks its `ListRow` pending-removal (struck-through title, the row no longer opens the form, no per-row affordance). A new card deletes outright.
- Reducer: `EditorField` and `EditorCard` gain `pendingRemoval?: boolean`, meaningful only when `id` is present. `removeField`/`removeCard` on an id-bearing entity toggles it on; no per-row action toggles it back off. The two-field floor counts non-pending fields: marking a field pending when only two active remain is blocked, with the same message as before.
- Diff builder: unchanged. `pendingRemoval` entities land in `field_defs.delete` / `cards.delete`. Pending fields are excluded from `order`, and no card update may reference them. Pending cards contribute no update entries. Removed new-field rows appear nowhere.
- Validity: pending rows are exempt from name validation; a struck-through duplicate name must not block Save.

One global Undo. A single Undo control sits in the header next to Save, edit mode only, enabled exactly when the form is dirty: the same gate as Save, minus validity. Clicking it discards every uncommitted change in one step (renames, reorders, added fields and cards, and every pending removal, struck-through rows included), reverting the whole form to `original`, T15's frozen baseline: the state as loaded, or as last rebased after a successful save. Undo dispatches the same `LOAD` reducer action as the post-save rebuild below, with `original` instead of a fresh server response; no new reducer case. No confirm on Undo itself.

The confirm moves to Save, aggregated. Save shows a confirm only when the changeset is destructive, that is, it contains `field_defs.delete` or `cards.delete` entries. The body states counts only, not a per-field breakdown:

> This deletes 1 field and affects 2 cards. This can't be undone.

Omit whichever noun is zero: fields-only reads "This deletes 1 field. This can't be undone.", and symmetrically for cards-only. Buttons: `Cancel` / `Save changes` (destructive style). Non-destructive saves (renames, adds, reorders) show no confirm. Create mode never shows it.

Save stays on the page in edit mode. On a successful `PATCH`:

- Never navigate. Rebuild editor state from the response `DeckDetail` through the existing `deckDetailToEditorState`, one call, exactly as on load. This rebases `original`, resolves every `client_key` to its real id, and clears all pending flags.
- Save disables again, the state being clean, until the next change; Undo disables under the same gate.
- Feedback: the Save control shows a transient `Saved ✓` state for about 2s before reverting to `Save`. Never build a toast system for this.
- The header's left control reads `Done` when the editor is clean and `Cancel` when dirty. `Done` exits to the deck detail page with no prompt; `Cancel` keeps the existing discard confirm.

Unchanged: create mode still navigates on save, to the new deck or to `returnTo` (T13). The `returnTo` round-trip is untouched. Edit mode is never entered with a `returnTo`. Create mode has no Undo control.

Tests:

- Reducer: `removeField`/`removeCard` still stage saved entities and delete new ones outright; the floor counts non-pending fields only; pending rows are exempt from name validation. Dispatching `LOAD` with the frozen `original` after a mix of a rename, a new field and a staged removal restores the exact original fields, cards, name and subject and clears `dirty`.
- Diff: a pending field → `delete`, excluded from `order`, its values absent from card updates; a pending card → `delete`, no update entry; a state reverted through `LOAD` produces no diff at all.
- Component: a staged row has no interactive undo of its own; the global Undo button is absent or disabled when clean and reverts a mix of edits in one click when dirty; the save confirm appears only for a destructive changeset and reads the aggregate wording; save-in-place (no navigation, state rebuilt from the response, `Saved ✓`, Save disabled, the header reading `Done`, a further edit re-dirtying and re-enabling both Save and Undo); `Done` exits without a prompt, and `Cancel` while dirty still prompts.

**Out of scope**

- The diff and batch architecture.
- A toast system.

**Done when**

- At a narrow viewport on a seeded deck: removing a saved field with values leaves the row in place, struck through and disabled, with no inline note and no per-row undo control, and the network tab shows zero requests.
- At a narrow viewport on a seeded deck: clicking the global Undo reverts everything (the removed field reappears, and any other edits made in the same session revert too), and Undo then disables.
- At a narrow viewport on a seeded deck: adding a field and removing it removes it outright, with nothing staged.
- At a narrow viewport on a seeded deck: removing a saved field and tapping Save shows the aggregate confirm ("This deletes 1 field..."); confirming sends one `PATCH`, the page stays on the editor, the removed row is gone from the list, Save shows `Saved ✓` then disables, the header reads `Done`, and Undo disables.
- At a narrow viewport on a seeded deck: a rename-only edit and Save shows no confirm, sends one `PATCH`, and stays on the page.
- At a narrow viewport on a seeded deck: marking a saved card for deletion strikes its row through, the row no longer opens the form, there is no per-row undo, and the global Undo restores it.
- At a narrow viewport on a seeded deck: with three fields, after marking one pending, marking another is blocked by the two-field floor.
- At a narrow viewport on a seeded deck: `Done` returns to deck detail, which reflects everything actually saved.

**Debrief**

Revised mid-flight after live review of the first implementation: the per-row undo and the per-field cascade notes were replaced by the global Undo and the aggregate save confirm.

### T17 — Deck deletion

**Status**

- [x]

**Goal**

`DeckEditor` has the `Delete deck` action the other two entity forms have, following their convention exactly.

**Dependencies**

- T16

**Files**

- `DeckEditor`

**Details**

- A `Delete deck` button, edit mode only, destructive style, at the bottom of the page, after the Cards section and before the confirm dialogs, mirroring where `SubjectForm` and `CardStandaloneForm` place theirs.
- Behind a `ConfirmDialog`, `title="Delete deck?"`, destructive, `confirmLabel="Delete"`: the description is `This will also delete {n} cards. This can't be undone.` when the deck has cards, else `This can't be undone.` The count is the deck's real, server-known card count, never the live editor state; deleting ignores whatever is staged or unsaved.
- `handleDeleteDeck`: `deleteDeck(deckId)` → invalidate `['decks']`, `['decks', subjectId]`, `['subjects']`, never `['deck', deckId]` → `navigate('/subjects/:subjectId')`, the deck's own parent.
- On failure: the same inline error and re-enable pattern every other delete and save handler in this file uses (`setFormError`/`setSaveError`, `setSubmitting(false)`, close the confirm).

**Out of scope**

- Backend changes.
- New decisions.
- Anything outside `DeckEditor`.

**Done when**

- At a narrow viewport on a seeded deck: create mode shows no `Delete deck` button anywhere on the page.
- At a narrow viewport on a seeded deck: in edit mode on a deck with cards, `Delete deck` shows a confirm naming the real card count, and `Delete` fires the `DELETE` request, lands on the deck's subject page, and the deck is gone from that subject's list.
- At a narrow viewport on a seeded deck: in edit mode on a deck with zero cards, the confirm reads just `This can't be undone.`, with no count clause.
- At a narrow viewport on a seeded deck: typing a rename, not saving, and deleting anyway removes the deck.

**Debrief**

None.

### T18 — Drop `updated_at` from subject/deck

**Status**

- [x]

**Goal**

`subject` and `deck` no longer have the never-consumed `updated_at` audit column.

**Dependencies**

- T12: `updated_at`
- T17

**Files**

- The `Subject`, `SubjectRead`, `Deck`, `DeckRead` and `DeckDetail` schemas and models
- `db_update_subject`
- `apply_deck_batch_edit`
- Migration `d99d2883e31f` (new)
- The affected tests
- `frontend/src/api/types.ts`

**Details**

- `Subject`, `SubjectRead`, `Deck`, `DeckRead`, `DeckDetail`: remove the `updated_at` field (ADR 018).
- `db_update_subject`, `apply_deck_batch_edit`: remove the explicit `row.updated_at = utcnow()` writes.
- A new migration `d99d2883e31f`, with down-revision `053542e7d50b`, never an amendment to it, drops both columns; its downgrade re-adds them with `server_default=now()`.
- Delete `test_field_write_does_not_change_deck_updated_at` and `test_card_edit_does_not_change_deck_updated_at` outright; never adapt them. Rename `test_subject_edit_bumps_updated_at_and_last_activity` and `test_deck_edit_bumps_updated_at_and_last_activity` to drop the `updated_at` half, and keep them asserting `last_activity_at`.

**Out of scope**

- `last_activity_at`: untouched, still the sort key for every subject and deck list.

**Done when**

- The migration applies up, down and up cleanly.
- At `/docs`, `GET` and `PATCH` responses for a subject and a deck include `last_activity_at` but no `updated_at`, and nothing returns 500.

**Debrief**

None.
