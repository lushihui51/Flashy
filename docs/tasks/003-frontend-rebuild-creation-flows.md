# 003 — Frontend rebuild: creation flows

Covers creating the three library artifacts — Subject, Deck, Card — from three entry points, with atomic backend writes. Mobile-first. Practice is an activity, not an artifact, and is out of scope here. Depends on: task file 002 (app shell) merged.

Branch: `rewrite/frontend-crud`, merged via PR #12 (squash `4b9cf23`). **Status: every task below (Phases 0 through 7.7) is executed; Phase 8 remains deferred.** This file is the pre-workflow decompose document reformatted into the standard task-file structure (2026-08-25); content is unchanged, only presentation. Tasks keep their original phase numbers and internal section numbering so cross-references (`2.5 §1.4`, `Phase 5.5 §3`, `§2.3`) still resolve. The original wording is in git history as `docs/plans/003-frontend-rebuild-creation-flows.md`.

Working protocol (as run): tasks are gated — each ends with a "Done when" gate: run the automated checks, print the browser-check list verbatim for the reviewer to walk through on a device or narrow viewport, then end the turn and wait for a go-ahead. On a reported failure, fix within the current task and return to the gate. One PR per task; backend and frontend tasks are separate PRs even when small. Mobile viewport (360–430px) is the design target; desktop must not be broken but gets no layout work except where a task says otherwise. Deferred items carry `// TODO(defer:<tag>)` — tags introduced here: `field-types`, `icon-picker`, `draft-persistence`, `desktop-grid`, `paste-import`; existing tags from the shell rebuild still apply. **Do not invent endpoints.** The API contract is in Contracts §2; if something is missing from it, stop and ask.

## ADRs

- **ADR 015 — deck deletion cascades owned rows, preserves history via SET NULL.** Records **D12** (deletion policy), implemented in Phase 1.5.
- **ADR 018 — `last_activity_at` as the sole recency column, no `updated_at`.** Records the final form of **D13** (recency), implemented in Phase 5.4 and finished by Phase 7.7's drop of `updated_at`.

D12 and D13 are kept in full in the list below so the tasks' "per D12"/"per D13" references resolve in this file.

## Minor decisions

These were settled in discussion. Don't relitigate inside a task; raise it at a "Done when" gate if one seems wrong.

**D1 — Three entry points, one form.** Every artifact can be created from (a) the top-bar `Create` shortcut, (b) its own list page, (c) contextually from its parent's detail page. All three render the _same_ form/editor component; the entry point only determines whether the parent picker starts empty or starts with the contextual parent preselected. It is always editable in create mode. `locked` remains only for edit mode where the parent cannot change (a card cannot move between decks). _(Corrected in Phase 5.5 — contextual entry used to lock the picker; context should set the default, not remove the choice.)_

**D2 — Creation is atomic.** A deck is created in a single request containing its name, subject, field definitions, and initial cards. No draft rows, no "save as you go" in create mode. Edit mode also saves as a single batched changeset. Nothing half-finished ever reaches the database.

**D3 — Invariant: a deck always has ≥2 field_defs.** A practice session requires at least one prompt field and one answer field, and a field is one or the other, never both — so a deck with fewer than two active fields cannot be practised and must not exist. Enforced by the create endpoint (reject `field_defs.length < 2`), by the batch edit endpoint (reject a changeset whose resulting active field count is `< 2`), and by the editor UI (remove is disabled when two fields remain). Archiving counts as removing for this purpose: a deck cannot archive down to fewer than two active fields.

**D4 — Missing parents.** Creating a deck with no suitable subject: the subject picker's last row is always `New subject…`, which opens the full subject form as an overlay; on success the new subject is selected. Creating a card with no suitable deck: the deck picker's last row is always `New deck…`, which navigates to the deck editor with a return-to; on save the new deck is selected. Creating a card never creates a deck. _(Corrected in Phase 5.5 — inline create used to be gated on typed text and limited to name-only; see D9.)_

**D5 — Subject defaults live in the backend.** `description` and `icon` are NOT NULL with server defaults. The API accepts them as optional. Clients never need to know the default.

**D6 — Positional create payload.** In the deck create request, `field_defs[i]` has `position = i` and `cards[j].values[i]` belongs to `field_defs[i]`. No client-side IDs.

**D7 — Card form is generated from the deck's field_defs.** One labelled input per field, in position order. The same component is the per-card view inside the deck editor.

**D8 — Mobile deck editor is two lists, not a grid.** Fields section (reorderable list with type select) and Cards section (list of card summaries opening the card form). The grid is a desktop-only follow-up (`desktop-grid`).

**D9 — deleted in Phase 5.5.** Used to say subject inline-create posts immediately on typing a non-matching name into the picker itself. There is no inline create any more — selecting `New subject…` opens the full subject form as an overlay (§4.3, Phase 5.5 §3), and the subject is only created when that form is submitted, not the moment the row is chosen. A subject with zero decks is still a valid resting state (that part wasn't wrong), it just isn't this decision's job to say so any more — nothing here depends on it.

**D10 — Invariant: `card_field_value` is dense over active field_defs.** Every card has exactly one `card_field_value` row per field_def active on its deck — never sparse. An unfilled field stores `""`, not a missing row, so "empty" and "never written" are never ambiguous. This is a different concern from the all-empty-card-drop rule (D2's create endpoint drops a card whose values are all blank rather than persisting it — about not saving a card the user never filled in at all, not about row density within a card that _is_ saved). The invariant is maintained going forward by whatever changes a deck's field set: the create endpoint (§2.2) writes a row for every field on every persisted card; the batch edit endpoint's field-add (§2.3, Phase 6) backfills a `""` row for every existing card in the same transaction; field-delete's rows go away via FK cascade. Archived fields are excluded from the invariant and from every read path (D11) — archiving a field doesn't touch its existing rows and doesn't need new ones.

**D11 — Archived fields keep their rows; every read path excludes them.** `field_def.archived_at` never cascades a delete of that field's `card_field_value` rows — they stay as inert history. But an archived field is not part of "the deck's fields" for any purpose going forward: it's excluded from D10's density invariant (a newly-created card owes it no row), and every read path that returns a card's values or a deck's field list (`DeckDetail.field_defs`, `CardRead.values`, the standalone card endpoints) only ever reflects active fields. Stated here explicitly so it isn't decided ad hoc later — see AGENTS.md's `card_field_value` entry for the canonical statement.

**D12 — Deletion policy** (→ ADR 015). Implemented in Phase 1.5; recorded here because later tasks (and eventually practice) depend on it.

- `card`, `field_def`, `card_field_value`, `card_field_mastery`, `deck_practice_config`, `practice_deck` — `ON DELETE CASCADE` from `deck`.
- `practice_card.card_id` — **NOT NULL**, `ON DELETE CASCADE`. A practice card without a card cannot exist, so no code path needs to handle a null `card_id`.
- `review_log` — **never deleted.** Every FK on it (`card_id`, `practice_card_id`, `field_def_id`) is nullable with `ON DELETE SET NULL`. Review history survives as aggregate data only; a row whose subject was deleted cannot be attributed to a card, and that is accepted.
- `field_def.archived_at` soft-archive is unchanged and unaffected by any of the above (D11).
- **Deferred to the practice work:** an in-flight `practice_session` whose remaining practice cards are all cascade-deleted should transition to a terminal status on its next read rather than error. Not in scope here.

**D13 — Recency** (→ ADR 018; defined by Phase 5.4, finished by Phase 7.7). `subject` and `deck` carry two timestamps with different contracts:

- **`updated_at`** — audit field. Changes only when _this row's own columns_ change. Never bubbled, never touched by hand. Conventional semantics; anything reading it for "when was this row edited" must get the true answer. **Removed in Phase 7.7** — zero consumers ever used it.
- **`last_activity_at`** — sort key. Changes when the row's own columns change **or when its direct contents change**, in the same transaction. Creation counts as activity (`last_activity_at = created_at` at insert).

Every list of subjects or decks anywhere in the app — library tabs, subject page, pickers — is ordered by `last_activity_at` descending.

Bubbling rule for `last_activity_at` (and only `last_activity_at`):

| Event | Touches `last_activity_at` on |
| --- | --- |
| Subject name/description/icon edited | subject |
| Deck created, deleted, or moved to another subject | subject (both old and new on move), deck |
| Deck name edited | deck |
| Field created, edited, archived, deleted, reordered | deck |
| Card created, edited, deleted (standalone or via batch edit) | deck |

Editing a card does **not** touch the subject — that's two levels up. Cards get neither column; the deck detail table stays in creation order so editing a card never reorders it under the user. "Last practiced" for a card, when it's wanted, is `MAX(card_field_mastery.updated_at)` over that card's mastery rows — derived, not stored.

---

D10 was made retroactively true for pre-existing data by a one-off Alembic migration (backfills a `""` row for every missing `(card, active field_def)` pair) — done alongside Phase 1, not gated behind it, since it's a data fix independent of the new endpoint.

### Open questions

**Resolved since v1** (kept for the record):

- `/library` Decks tab — kept. Cards have no global list; `/library` stays Subjects and Decks.
- Subject inline-create persists immediately — this was v1's answer (D9); Phase 5.5 replaced inline create with the `New subject…` overlay, so it's no longer the current answer to anything (see D9's own entry, which records the change rather than pretending the question never came up).
- Mastery rows on create — follows pre-existing behaviour; Phase 1 did not change it.
- `FieldType` — three members exist; frontend allowlist governs what's creatable (§2.5).
- Deletion policy — D12.

**Still open** (defaults applied unless told otherwise):

1. **Zero-card decks** — allowed. Say if you want ≥1 card required.
2. **Edit-mode no-op Save** — no request sent, just navigate back.
3. **All-blank single-card create → 422** — chosen for explicit single-form submission, deliberately unlike deck create's silent drop (§2.6). Say if you'd rather both behave the same way.
4. **Subject delete cascade from the UI** — `Delete subject` in `SubjectForm` edit mode cascades every deck in it (D12). If that feels too easy to trigger from a form, the alternative is refusing delete while the subject has decks and requiring them to be moved or deleted first. Default: allow with a confirm that names the count.

## Contracts

### 2. API contract

Existing endpoints are assumed for reads and for single-entity subject/card operations; regenerate OpenAPI types after every backend task. New or changed endpoints:

#### 2.1 Subjects (changed)

```
POST /api/subjects
  body: { name: string, description?: string, icon?: string }
  201 → Subject { id, name, description, icon }
```

`description` defaults to `""`. `icon` defaults to a constant defined in one place in the backend (e.g. `DEFAULT_SUBJECT_ICON`). Both columns NOT NULL.

#### 2.2 Deck create (new)

```
POST /api/decks
  body: {
    name: string,
    subject_id: uuid,
    field_defs: [ { name: string, type: FieldType } ],   // position = index
    cards:      [ { values: (string | null)[] } ]        // aligned to field_defs
  }
  201 → DeckDetail (see 2.4)
```

Validation (422 on failure, with a message naming the offending item):

- `name` non-empty after trim.
- `subject_id` exists and belongs to the caller.
- `field_defs` length ≥ 2 (D3: a deck needs at least one prompt field and one answer field); names non-empty after trim; names unique within the deck (case-insensitive).
- every `cards[j].values` has length == `field_defs.length`.
- a card whose values are all null/empty is **dropped** (not rejected).
- `type` is a member of `FieldType`.

Side effects, one transaction: deck row; field_def rows with `position = index`; card rows; `card_field_value` rows **for every field_def, on every persisted card** — `""` where the incoming value is null/empty (D10). This is a row-density rule, not a content rule: it doesn't affect which cards get persisted at all, which is still the all-empty-card-drop rule above. Whether `card_field_mastery` rows are created eagerly here or lazily on first review follows whatever the existing mastery code does — do not change that behaviour in this task.

#### 2.3 Deck batch edit (new, Phase 6)

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

`client_key` is any string the client chooses for fields that don't exist yet; it's valid only within this request. Applied in one transaction in the order: field create → field update → field delete → reorder → card delete → card update → card create. Rejects with 422 if the resulting deck would have fewer than two active fields (D3), or if any referenced id doesn't belong to this deck. Deleting a field_def cascades its values and mastery rows — the UI confirms before sending. _(Widened in Phase 7 — `cards.update.values` originally accepted only real field ids; the deck editor's edit-mode diff needs to set an existing card's value for a field created in the same request, e.g. adding a field and immediately filling it in on an already-saved card, so `client_key` is valid there too. Safe because field creates are always applied before card updates in the stated order, so the field already exists by the time an update references it.)_

**Maintaining D10 (Phase 6 specifically):** a `field_defs.create` entry must backfill a `""` `card_field_value` row for every one of the deck's existing cards, in the same transaction as the field's own creation — this is the mechanism that actually keeps the density invariant true over time (§2.2 only covers cards created atomically with their deck). A `field_defs.delete` entry needs no equivalent code: its rows go away via the existing FK cascade, same as any other field-def delete. Phase 6's test list must include one test per direction, each named after the invariant it maintains (e.g. `test_field_create_backfills_dense_card_field_value_rows`, `test_field_delete_cascades_card_field_value_rows`) — not folded into a generic "field create" / "field delete" test.

**Maintaining D13 (Phase 6 specifically):** any changeset that touches `field_defs` or `cards` → `touch(db, deck)`; a `subject_id` change → `touch(db, old_subject, new_subject)`. At the time this was written, `updated_at` on the deck also moved when `name` or `subject_id` changed, set **explicitly** in the handler rather than via a column-level `onupdate` — Phase 5.4 had tried `onupdate=utcnow` first and found it fires on _any_ UPDATE to the row, including one that only sets `last_activity_at`. Phase 7.7 later dropped `updated_at` entirely (zero consumers), so this paragraph's `updated_at` handling no longer applies — only the `touch()` calls above still happen.

#### 2.4 DeckDetail (read shape)

```
DeckDetail {
  id, name, subject_id, created_at,
  field_defs: [ { id, name, type, position } ],   // sorted by position, active only (D11)
  cards: [ { id, created_at, values: { [field_id]: string } } ]  // one key per active field_def, dense (D10)
}
```

If the existing `GET /api/decks/{id}` doesn't return this shape, extend it (or add `?include=cards`) in Phase 1. Large decks are a later concern; don't paginate yet.

#### 2.5 FieldType

```
FieldType = "text" | "image" | "audio"     // backend enum, pre-existing
```

The backend enum already has three members from the earlier schema rewrite. **Do not shrink it.** The create and batch-edit endpoints accept any member.

The frontend supports only `text` for now. One allowlist, defined once:

```ts
export const SUPPORTED_FIELD_TYPES = [
  "text",
] as const satisfies readonly FieldType[];
```

- The deck editor's type select offers only `SUPPORTED_FIELD_TYPES`.
- `CardFieldsForm` renders a field whose type is _not_ supported as a read-only text input showing the stored value, with a muted note `Unsupported field type`. Existing data with `image`/`audio` fields must still render rather than crash.
- `// TODO(defer:field-types)` at the allowlist and at the read-only fallback.

Adding a type later is: add a widget to `CardFieldsForm`, add the member to the allowlist. Nothing else.

#### 2.6 Single-card endpoints (verify, then conform)

These exist from before the rewrite. Phase 4.5 verifies they conform to the following; if they don't, it fixes them.

```
POST /api/cards
  body: { deck_id: uuid, values: { [field_id]: string } }
  201 → CardRead

PATCH /api/cards/{card_id}
  body: { values: { [field_id]: string } }       // partial; only keys present are changed
  200 → CardRead

DELETE /api/cards/{card_id}
  204

CardRead { id, deck_id, created_at, values: { [field_id]: string } }   // dense over active fields (D10)
```

Rules:

- `POST`: any active field omitted from `values` is written as `""`, so the persisted row set is dense regardless of what the client sends. A key that is not an active field of `deck_id` (unknown, archived, or belonging to another deck) → 422 naming it. A card whose values are all blank → **422** `card has no values`. (This deliberately differs from deck create, which silently drops all-empty cards: there the user is bulk-entering and a stray blank row is noise; here they explicitly submitted one form.)
- `PATCH`: merge semantics over the existing dense row set. Same key validation. Cannot make a card all-blank (→ 422); delete it instead.
- `DELETE`: cascades per D12. Mastery rows for this card are gone; review_log rows remain with `card_id` null.
- Responses are dense: exactly one key per active field.

Single-card operations are atomic per card. They are a different scope from the deck editor's batched changeset (§2.3), not a contradiction of it.

### 3. Routes

| Route | Page | Create entry points present |
| --- | --- | --- |
| `/library` | Library — tabs: **Subjects**, **Decks** | Subject (list page), Deck (list page) |
| `/subjects/:subjectId` | Subject detail — header + decks in this subject | Deck (contextual, subject locked) |
| `/decks/:deckId` | Deck detail — header + cards | Card (contextual, deck locked); `Edit` opens editor in edit mode |
| `/decks/new` | Deck editor, create mode | — |
| `/decks/:deckId/edit` | Deck editor, edit mode | — |

_The "locked" wording in this table predates the Phase 5.5 correction: per D1, contextual entry now preselects the parent (still editable); `locked` survives only in card edit mode._

`Create` in the top bar opens the **Create sheet** (§4.1) from anywhere.

The sidebar's **Your library** item points at `/library`. Cards have no global list; their "list page" is the deck detail page, so for cards entry points (b) and (c) coincide.

### 4. Components

Paths are suggestions; match repo conventions. Every component ships with a Vitest + RTL test.

#### 4.1 `CreateSheet`

Bottom sheet (reuse the shell's sheet primitive) with a drag handle and three rows, each `[icon] [label]`: **Subject**, **Deck**, **Card**. Tapping a row closes the sheet and opens the corresponding form/editor with no parent prefilled. If the user has zero decks, the Card row stays enabled but shows a muted subline `Create a deck first` and opens the deck editor instead.

#### 4.2 `SubjectForm`

Full-screen modal with two modes.

**Create:** fields `name` (required), `description` (optional, multiline), `icon` (optional; plain text identifier input for now, `// TODO(defer:icon-picker)`). Submit → `POST /api/subjects` → close → navigate to `/subjects/:id`.

**Edit:** same form, prefilled from the subject, title `Edit subject`. Submit → `PATCH /api/subjects/:id` (verify it exists; add if not) → close → stay on the subject page with the header updated. Includes a `Delete subject` action at the bottom, destructive style, behind a confirm that states the deck count that will cascade (D12). On delete → navigate to `/library`.

Opened in edit mode from the subject detail page's `Edit` icon button (2.6 §2.4).

Primary button is a full-width pill at the bottom; the keyboard must not cover it on mobile.

One component, two thin wrappers (Phase 5.5 §3): the form body takes `onSuccess(subject)` / `onCancel()` / `onDelete?()` instead of navigating itself. The routed page (`/subjects/new`, `/subjects/:id/edit`, unchanged from Phase 3) wraps it and navigates on each callback; `SubjectPicker`'s create-overlay wraps the _same_ body (create mode only) in a `FullScreenDialog` and just updates the picker's selection instead of navigating anywhere.

#### 4.3 `SubjectPicker`

Combobox (rebuilt on the shared `PickerCombobox`, Phase 5.5 §2, alongside `DeckPicker`). Lists existing subjects, most-recent-`last_activity_at`-first (D13), capped at `PICKER_MAX_ITEMS` with a `Showing X of Y` footer when there's more. Typing filters by substring; the cap and footer still apply to the filtered set. The last row is always `New subject…` — present regardless of query or matches, keyboard-reachable — and opens `SubjectForm`'s create body in a `FullScreenDialog` over whatever this picker is embedded in (Phase 5.5 §3); on success the picker's selection becomes the new subject immediately, without waiting for the subjects query to refetch. Props: `defaultValue?: {id, name, icon}` (preselects on mount, still fully editable — not a lock), `locked?: boolean` (static chip, no combobox — reserved for a future edit-mode use; nothing uses it today), `onChange`.

#### 4.4 `DeckPicker`

Same shared combobox, **without** inline create (D4) — the create row instead navigates away, since a deck editor is too heavy to nest in a dialog (Phase 5.5 §4). Selecting `New deck…`: if the surrounding card form has typed values, that form's own deck-change confirm fires first; either way it then navigates to `/decks/new` with `state: { returnTo: <current path> }`. `DeckEditor` reads `returnTo` and, on Save, returns there with `state: { deckId }` instead of going to the deck's own detail page (on Cancel, returns with no state). The old in-list "you have no decks" empty state is gone — the create row already covers zero items on its own. Props: `defaultValue?: {id, name}`, `locked?: boolean` (static chip — card **edit** mode only, since a card can't move between decks), `onChange`, `onCreateNew` (fires when the create row is chosen; the picker itself has no opinion on what that means, unlike `SubjectPicker`'s built-in overlay).

#### 4.5 `CardFieldsForm`

Props: `fieldDefs: FieldDef[]`, `values: Record<fieldId, string>`, `onChange`. Renders one labelled input per field in position order; input widget chosen by `type` (only `text` exists). No submit button of its own — parents wrap it.

#### 4.6 `CardForm`

Full-screen modal with two modes, plus an in-editor role.

**Create (standalone):** top: `DeckPicker` (locked when opened contextually). Body: `CardFieldsForm` for the selected deck's active field_defs. If the deck changes after values were typed, confirm then clear. Submit → `POST /api/cards` (§2.6) → close → the deck's table shows the new row.

**Edit (standalone):** opened by tapping a row in the deck detail table (2.5 §1.4). Deck locked; prefilled; title `Edit card`. Submit → `PATCH /api/cards/:id` with only changed keys → close. `Delete card` at the bottom behind a confirm → `DELETE` → close.

**In-editor role:** inside `DeckEditor` (§4.7) the same component is used for adding and editing cards in editor state, with no network calls — it calls back into the reducer instead. Mode is a prop; the form body is identical.

#### 4.7 `DeckEditor`

Full-screen route page. Mode is `create` or `edit`, derived from route.

**State:** `{ name, subjectId, fields: EditorField[], cards: EditorCard[] }` plus dirty tracking. `EditorField = { key, id?, name, type }`, `EditorCard = { key, id?, values: Record<fieldKey, string> }`. `key` is a client-generated stable key; `id` is present only in edit mode for pre-existing entities. Keep this state in a reducer; the two persistence paths are pure functions from state (+ original state in edit mode) to request bodies.

**Header (sticky):** `Cancel` (confirm if dirty), title `New deck` / `Edit deck`, `Save` (disabled until valid).

**Name + subject:** text input; `SubjectPicker` with inline create.

**Fields section:**

- Reorderable list. Row: `[name input] [type select] [overflow menu] [remove]`.
- `Add field` button below the list.
- New deck starts with two `text` fields named `Term` and `Definition`.
- Reorder via Move up/Move down in the row's overflow menu — no drag. A pointer-events drag handle was prototyped, but its touch-specific behavior (the long-press gate that keeps an ordinary scroll from being mistaken for a drag) can't be verified against a real device from this environment; shipping it unverified isn't worth it on a mobile-first app when the buttons already cover the same need, fully tested and keyboard-operable besides.
- Remove is disabled when two fields remain (D3), with a tooltip/aria-description: `A deck needs at least two fields.` Removing a field that has any non-empty value in any card prompts a confirm naming the count of affected cards.
- Validation shown inline: empty name, duplicate name.

**Cards section:**

- Section label shows the count.
- Rows use the shared `ListRow` (2.7 §1) with `onClick` instead of `to` — `ListRow` needs to accept either; add `onClick?: () => void` and make exactly one of `to`/`onClick` required.
- `title` is the first active field's value, or the italic `text-muted` word `empty` when blank (matching Phase 2.5's table treatment — there is no `Untitled card` anywhere in the app).
- `subtitle` is the second field's value, omitted when blank or when the deck has one field.
- No `meta`.
- `Add card` opens `CardForm` in its in-editor role with `fieldDefs` taken from editor state; on save it appends to editor state. Tapping a row reopens it; delete lives inside that form.
- Adding a field after cards exist gives every card `""` for it (mirrors D10 locally).

**Validity (gates Save):** name non-empty; subject chosen; ≥2 fields (D3); all field names non-empty and unique. Cards with all-empty values are dropped at save time, silently.

**Save, create mode:** build the §2.2 payload (fields in list order; each card's `values` array aligned to that order; `""` → `null`), `POST /api/decks`, navigate to `/decks/:id`.

**Save, edit mode (Phase 7):** diff current state against the loaded original, build the §2.3 changeset, `PATCH`, stay on the page (Phase 7.5 §4 supersedes the "navigate to `/decks/:id`" above).

**Delete, edit mode (Phase 7.6):** `Delete deck` at the bottom, destructive style, edit mode only — same placement/behavior convention as `SubjectForm`'s `Delete subject` and `CardStandaloneForm`'s `Delete card` (§4.2, §4.6). Behind a confirm naming the cascaded card count (D12): `This will also delete {n} cards. This can't be undone.`, or just `This can't be undone.` when the deck has none. Ignores whatever's unsaved in the editor — deleting the whole deck makes any pending edit moot, same as the other two. `DELETE /api/decks/:id` → invalidate `['decks']`, `['decks', subjectId]`, `['subjects']` → navigate to `/subjects/:subjectId` (the deck's parent, same "go to the thing one level up" pattern as `CardStandaloneForm`'s delete going to `/decks/:id`).

#### 4.8 Pages

The three pages were redesigned in Phases 2.5–2.7, which are authoritative for their layout. Summary of what each now is, for orientation only:

- `LibraryPage` — `Your library` heading; **Subjects** / **Decks** tabs; per-tab count line with a `New subject` / `New deck` button; rows are `ListRow` (2.7 §2 for subjects; the Decks tab uses the same deck-row treatment as 2.7 §3).
- `SubjectDetailPage` — breadcrumb to library → icon tile + name + description → `{n} decks · {m} cards` → action row (Practice primary; New deck, Edit icon buttons) → `Decks` section of `ListRow`s (2.6 §2 + 2.7 §3).
- `DeckDetailPage` — breadcrumb to subject → name → `{n} cards · {m} fields` → action row (Practice primary; New card, Edit icon buttons) → horizontally scrolling card `<table>` with frozen first column, `empty` for blank values (2.5 §1).

Shared grammar: identity and shape on the left, size on the right, chevron last; Practice is always the primary action; icon buttons carry `New …` / `Edit …` aria-labels. Empty states have one line of copy and the relevant create button.

## Tasks

Tasks are named by their original phase numbers (2.5–2.7 are addenda inserted between Phases 2 and 3; 5.4–5.5 between 5 and 6; 7.5–7.7 after 7). They were executed strictly in the order listed; each depends on all tasks before it.

### Phase 0 — Backend: subject defaults

- [x] **Goal:** make `subject.description` and `subject.icon` NOT NULL with server defaults, accepted as optional by the API (D5).
- **Files:** Alembic migration; the subject SQLModel model and `SubjectCreate` schema; a backend unit test; `frontend/src/api/types.ts` via type regeneration — paths per repo convention.
- **Details:** migration makes both columns NOT NULL with server defaults, backfilling existing nulls first. SQLModel defaults; `SubjectCreate` marks both optional. Unit test: `POST /api/subjects` with only `name` returns defaults populated. Regenerate frontend OpenAPI types.
- **Out of scope:** any frontend consumption of the defaults (Phase 2 onward).
- **Done when:** _Automated:_ migration applies cleanly up and down; backend tests green; `tsc --noEmit` green after type regen. _Browser check:_ open `/docs`; `POST /api/subjects` with `{"name":"Test"}` returns 201 with non-null `description` and `icon`; `GET` the same subject and confirm.
- Notes:

### Phase 1 — Backend: atomic deck create + DeckDetail

- [x] **Goal:** ship `POST /api/decks` as one atomic, fully validated transaction (D2, D3, D6, D10) and the `DeckDetail` read shape.
- **Files:** `FieldType` enum, the deck router and its create/read handlers, backend tests, regenerated types — paths per repo convention.
- **Details:** `FieldType` enum (`text` only at this point). `POST /api/decks` per §2.2 with every listed validation rule, in one transaction. `GET /api/decks/{id}` returns the §2.4 shape. Regenerate types.
- **Out of scope:** the batch edit endpoint (§2.3, Phase 6); single-card endpoint conformance (§2.6, Phase 4.5); pagination (§2.4: large decks are a later concern).
- **Done when:** _Automated:_ backend tests green, covering — happy path; fewer than two fields (zero, and one) → 422; duplicate field names → 422; misaligned `values` length → 422; all-empty card dropped; card values are dense over field_defs — `len(values) == len(field_defs)` for every persisted card, including one with a blank value stored as `""` (D10); rollback when a later card fails validation (nothing persisted). Types regenerated; `tsc` green. _Browser check:_ in `/docs`, create a deck with two fields and three cards (one of them all-empty); `GET` it and confirm two fields with positions 0 and 1, **two** cards, each with exactly two values keyed by field id (D10). Try a payload with zero `field_defs` and confirm 422 with a readable message.
- Notes:

### Phase 1.5 — Backend: invariants and cascade

- [x] **Goal:** correct Phase 1 with the D10 density invariant and implement the D12 deletion policy, as one PR before Phase 2.
- **Files:** SQLModel FK declarations; an Alembic migration with a working downgrade; the one-off D10 backfill migration; `_requeue_failed_card` — paths per repo convention.
- **Details:**
  - D10 density invariant: every persisted card gets a `card_field_value` row for every active field, `""` when blank; one-off migration backfilled pre-existing sparse data.
  - D12 deletion policy: cascade and `SET NULL` constraints per the D12 entry, in both SQLModel FK declarations and an Alembic migration with a working downgrade. Fixed the `DELETE /api/decks/{id}` 500.
  - Removed the defensive `None` guard in `_requeue_failed_card`; `practice_card.card_id` being NOT NULL makes the case impossible.
- **Out of scope:** the in-flight-session terminal-status transition (deferred to the practice work per D12).
- **Done when:** the corrections above are shipped as one PR before Phase 2 starts, with backend tests green and the migration applying up and down.
- Notes: recorded at the time as "(done)" — this task was written up after the fact as corrections to Phase 1.

### Phase 2 — Frontend: Create sheet + library/detail pages (read-only)

- [x] **Goal:** wire the routes, the Create sheet, and read-only library/subject/deck pages against real data — forms come later.
- **Files:** router wiring for the §3 routes; `CreateSheet` (§4.1); `LibraryPage`, `SubjectDetailPage`, `DeckDetailPage` (§4.8); TanStack Query hooks over the kept API layer; tests — paths per repo convention.
- **Details:**
  - Routes from §3 wired into the shell's router.
  - `CreateSheet` wired to the top-bar `Create` button (replaces the no-op stub). Rows navigate to the right place; forms don't exist yet, so for this task each row navigates to a placeholder route or page that says which form will open. Card row shows the `Create a deck first` subline when there are no decks.
  - `LibraryPage` with Subjects/Decks tabs reading real data via TanStack Query hooks over the kept API layer.
  - `SubjectDetailPage` and `DeckDetailPage` read-only, with create buttons present but pointing at the same placeholders.
  - Empty states for all lists.
- **Out of scope:** any form or editor (Phases 3–5); the page layouts later redesigned by Phases 2.5–2.7.
- **Done when:** _Automated:_ frontend tests green; every route renders without console errors with MSW-mocked data. _Browser check (narrow viewport, signed in):_ tap `Create` → sheet opens with three rows and a drag handle; scrim tap and Esc close it. Open drawer → **Your library** → tabs switch, lists show real subjects and decks from the backend. Tap a subject → its decks. Tap a deck → field chips and card rows. Each create button is visible, sized for touch, and leads somewhere that names the pending form. Sign out → `/library` behaves sensibly (redirect or sign-in prompt, whichever the shell already does).
- Notes:

### Phase 2.5 — Deck detail page layout

- [x] **Goal:** restructure `/decks/:deckId` so the parent link, the schema, and the data are visually distinct categories — presentation only.
- **Files:** `DeckDetailPage`; `frontend/src/lib/subjectIcon.ts` (new); `frontend/src/components/library/SubjectIcon.tsx` (new); backend `DEFAULT_SUBJECT_ICON` + a backfill migration; tests.
- **Details:** addendum between Phase 2 and Phase 3. No backend changes beyond the icon default, no new endpoints, no new queries — card and field counts come from `deckDetail.cards.length` and `deckDetail.field_defs.length`; do not add count fields, a count endpoint, or a separate query.

  **§0 Why.** The current page renders three different kinds of information in one visual form: the parent subject and the deck's field names are identical pills, and the card rows show two unlabelled values with no indication which fields they belong to. This task separates those categories and ties the schema to the data it describes.

  **§1 Page structure, top to bottom:**

  **§1.1 Subject breadcrumb.** Replaces the subject pill. Sits **above** the deck title, rendered as navigation, not as an attribute: `[chevron-left] [subject icon] Subject name`.
  - Whole thing is one link to `/subjects/:subjectId`.
  - 13px, `text-secondary`, icon at 15px.
  - Visually distinct from anything in the schema row — different position, smaller, no pill background.

  **Icon rendering.** `subject.icon` is an **identifier into a curated icon set** — not emoji. (This task originally shipped the emoji interpretation, since the Phase 0 default `"📚"` was a literal emoji glyph and the plan's own decision rule pointed there; superseded after review.) `frontend/src/lib/subjectIcon.ts` maps a kebab-case identifier (`"brain"`, `"atom"`, `"book-open"`, …) to a `lucide-react` component via a small, statically-imported `Record<string, LucideIcon>` (~25 entries, tree-shakes normally — the full ~1737-icon library would ship in the bundle regardless of usage if imported via `lucide-react`'s `icons` record instead). Unrecognized names, blank/missing icons, and legacy emoji values all fall back to `BookOpen`. `frontend/src/components/library/SubjectIcon.tsx` is the render-time wrapper (`<SubjectIcon icon={...} className={...} />`), used everywhere a subject icon appears (library list, subject detail header, deck detail breadcrumb) — it renders via `createElement` rather than JSX's `<Variable />` tag syntax on a locally-resolved component, to satisfy `react-hooks/static-components` (the lint rule can't verify the resolved icon stays referentially stable across renders, even though it does here since the underlying map holds module-level constants). Backend: `DEFAULT_SUBJECT_ICON` is `"book-open"` (changed from the emoji `"📚"`), with a migration backfilling any row still on the old default.

  **§1.2 Title and meta.**
  - Deck name, 22px, weight 500.
  - One muted line beneath: `{cards.length} cards · {field_defs.length} fields`. Singular forms when the count is 1. 13px, `text-muted`.
  - This line replaces the standalone `6 cards` label; delete that.

  **§1.3 Action row.** Three controls in one row, directly under the meta line:

  | Control | Style | Behaviour |
  | --- | --- | --- |
  | **Practice** | Primary, fills remaining width, play icon + label | No-op for now. `// TODO(defer:nav-targets)` |
  | **New card** | Icon-only, bordered, `plus` icon | Opens the card form (currently the Phase 2 placeholder; Phase 5 wires it for real) |
  | **Edit** | Icon-only, bordered, `edit` icon | Navigates to `/decks/:deckId/edit` (currently the Phase 4 placeholder) |

  Practice is primary because it's the reason the deck exists; edit and add-card are maintenance. Icon-only buttons need `aria-label` ("New card", "Edit deck") and must still meet the 44×44 tap target from the shell rebuild even though they render at 38px visually — pad the hit area. Remove the existing standalone `Edit` and `+ New card` pills.

  **§1.4 Card table.** Replaces both the field-name pill row and the current title/subtitle card list. This is one `<table>`, because rows are cards and columns are fields — the semantics are genuinely tabular and give screen readers column association for free.

  **The `<table>` with its `<thead>` renders whenever the deck has ≥1 active field, regardless of card count.** A zero-card deck still has a schema, and that's exactly the information an empty deck has to offer — the header must not disappear just because `<tbody>` is empty. When there are no cards, the empty state (`No cards in this deck yet.` and `New card`) renders below the header row, inside the same wrapper's normal vertical flow but **outside** the horizontally-scrolling region — not in place of the table, and not scrolling away with the header. That keeps it "left-aligned with the table's first column" (which is pinned via `sticky left-0` and therefore always at the same on-screen position) regardless of the header's current scroll offset.

  Structure:
  - Wrapper `<div>` with `overflow-x: auto`, `tabindex="0"`, `aria-label="Cards in {deck name}"` so keyboard users can reach the scroll region.
  - `<thead>`: one `<th scope="col">` per field, in `position` order, containing the field name. 12px, `text-muted`, bottom hairline border.
  - `<tbody>`: one `<tr>` per card. One `<td>` per field, in the same order, containing `card.values[field.id]`.
  - Column width: fixed `min-width` (~120px) per column so columns don't collapse; the table is allowed to exceed the viewport width.
  - The **first column is frozen** — `position: sticky; left: 0` on both its `<th>` and its `<td>`, with an opaque background so scrolled content passes behind it, and a right-edge hairline.
  - Header and body scroll as one unit because they share the single wrapper. Do not implement per-row scrolling or JS scroll synchronisation.
  - Right-edge fade or hairline shadow when the table is scrollable, to signal there's more. **Do not** render a `+N` indicator — the scroll affordance replaces it.
  - Row hover/press state; tapping a row opens that card (Phase 5 placeholder for now).
  - Use native scrolling. Do not add JS drag handling — browsers already distinguish a horizontal swipe from a tap, and hand-rolled drag detection breaks that.

  **Empty values.** Under the invariant established in Phase 1.5, every card has a `card_field_value` row for every non-archived field, so an empty value is `""`, not a missing key. Render `""` as the word `empty` in italic `text-muted`. Delete the `Untitled card` fallback — it described a card as untitled when what was actually empty was one field.

  **Archived fields** are excluded from both the header and the rows. **Row keying** is `card.id`, never index.

  **§2 Accessibility.**
  - Breadcrumb is a real link with discernible text (icon alone is not enough).
  - Icon-only action buttons have `aria-label`.
  - Scroll container is focusable and labelled.
  - `<th scope="col">` on every header cell.
  - Row navigation must be keyboard-reachable. If a whole-row click handler is used, the row needs `tabindex="0"`, `role="link"` or a button, and Enter/Space handling. State in the report which approach was taken; a nested focusable link inside the first cell is also acceptable and simpler.

  **§3 Tests.**
  - Meta line pluralisation at 0, 1, and many for both counts.
  - Header renders one cell per non-archived field, in `position` order.
  - A card with an empty value renders the `empty` placeholder, not a missing cell — and the row still has one cell per field.
  - Archived fields appear in neither header nor rows.
  - Breadcrumb links to the correct subject route.
  - Icon-only buttons expose their accessible names.
  - Deck with one field renders without the frozen column overlapping anything.
  - Deck with many fields (≥8) renders a table wider than its wrapper.
  - Deck with zero cards still renders one `<th>` per active field, plus the empty state beneath — not the empty state in place of the table.
  - Deck with zero cards and eight fields renders a scrollable header with the empty state anchored beneath it.

- **Out of scope:** colours/palette, mastery indicators, search or filter within a deck, sorting, desktop grid, practice session behaviour.
- **Done when:** _Automated:_ frontend tests green; `npx tsc -b` clean; no console errors rendering a deck with 0, 1, and 8+ fields. _Browser check (narrow viewport):_
  1. Subject breadcrumb sits above the title, renders a real icon (not the literal identifier string), and navigates to the subject page.
  2. Meta line reads `6 cards · 4 fields`; check a single-card deck reads `1 card`.
  3. Practice is the visually dominant action; edit and new-card are icon buttons and both still have comfortable tap targets.
  4. Swipe the card table horizontally — the header row moves with the body, the first column stays put, and nothing desyncs.
  5. Tapping a row still opens the card (or its placeholder) — the horizontal swipe does not swallow taps, and a tap does not trigger a scroll.
  6. A card with an empty first field shows `empty` in italic, not `Untitled card`, and the row still has a cell for every field.
  7. Vertical page scroll still works while the finger starts inside the table.
  8. Open a deck with 8+ fields and confirm the right-edge fade appears and no `+N` indicator is rendered anywhere.

  Report which `subject.icon` interpretation was found (identifier vs emoji), the fallback used, and which row-navigation approach was taken.

- Notes: the emoji interpretation shipped first and was superseded after review by the curated-identifier interpretation described in §1.1.

### Phase 2.6 — Subject detail and library rows

- [x] **Goal:** make `/subjects/:subjectId` read as the same page grammar as `/decks/:deckId` at one level up, and make library rows preview their contents.
- **Files:** `SubjectDetailPage`; `LibraryPage` (Subjects tab rows); the subject detail response (or the deck list endpoint it uses) if it lacks per-deck counts/field names; tests — paths per repo convention.
- **Details:** addendum after Phase 2.5, before Phase 3. Subject icon rendering was fixed in Phase 2.5 and is not revisited here — reuse the existing helper at every call site added below.

  **§0 Why.** `/subjects/:subjectId` has the same problems the deck page had: no way back up, a header with no hierarchy, and list rows that carry no information. A deck row currently renders its name and nothing else, so nothing distinguishes one deck from another and the page is empty below the fold. The target is that this page and `/decks/:deckId` read as the same page at different depths: breadcrumb → header block → meta line → action row → labelled list of children, where every row previews what's inside it.

  **§1 Data.** No backend changes by default. All counts derive from data already returned: deck count for a subject is the length of the subject's deck list; the subject detail page needs, for each deck, its card count and its field names in `position` order. **Check what `GET /api/subjects/{id}` currently returns before writing UI.** If it returns decks without their card counts and field names, extend that response (or the deck list endpoint it uses) to include, per deck: `id`, `name`, `card_count` (integer), and `field_names` (string array, `position` order, archived fields excluded). A per-deck count computed with a single grouped query is fine; do **not** issue one query per deck, and do **not** fetch full card rows just to count them. State in the report which shape was found and what changed. Library subject rows need a deck count per subject — same rule: one grouped query, not N queries.

  **§2 `/subjects/:subjectId`**, top to bottom:

  **§2.1 Breadcrumb.** `[chevron-left] Your library` — one link to `/library`, 13px, `text-secondary`. Mirrors the deck page's breadcrumb to its subject.

  **§2.2 Header block.** Horizontal: a 44×44 rounded tile containing the subject icon at 24px, then a text column with the subject name (22px, weight 500) and its description beneath (13px, `text-secondary`). The description may be `""` (backend default from Phase 0) — when empty, render nothing; do not reserve space or show a placeholder. Long names wrap; the tile does not shrink.

  **§2.3 Meta line.** One muted 13px line: `{n} deck · {m} cards` with correct singular/plural on both. `m` is the total card count across the subject's decks. Replaces the current standalone `1 decks` label — delete it. (`1 decks` is a live pluralisation bug.)

  **§2.4 Action row.** Same grammar as the deck detail page:

  | Control | Style | Behaviour |
  | --- | --- | --- |
  | **Practice** | Primary, fills remaining width, play icon + label | No-op. `// TODO(defer:nav-targets)` |
  | **New deck** | Icon-only, bordered, `plus` icon, `aria-label="New deck"` | Opens deck creation with this subject prefilled and locked (Phase 4 placeholder until then) |
  | **Edit** | Icon-only, bordered, `edit` icon, `aria-label="Edit subject"` | Subject edit (placeholder for now) |

  Practice is primary because a session can span multiple decks (`practice_deck` supports it), so "practice this subject" is a real action, not a stand-in. Remove the existing `+ New deck` pill. Icon buttons render at 38px but must have a ≥44×44 hit area.

  **§2.5 Deck list.** Section label `Decks` (12px, `text-muted`) above a hairline, then one row per deck:
  - **Title:** deck name, 15px, `text-primary`.
  - **Subtitle:** 13px, `text-muted`, single line, `text-overflow: ellipsis`, no wrapping. Composed as `{cards} · {fields}` where `{cards}` is `{n} cards` (singular at 1), or the literal `No cards yet` when the deck has zero; `{fields}` is the field names joined by `, `, truncated to as many as fit with `+N` appended for the remainder. Compute the cutoff by count, not by measuring text — first two names plus `+N` is acceptable and deterministic.
  - **Trailing `chevron-right`**, 16px, `text-muted`, as the tappable affordance.
  - Whole row navigates to `/decks/:deckId`. Keyed by `deck.id`.

  _(Superseded by Phase 2.7 §3, which moves the card count into `meta` and makes the subtitle purely schema.)_

  **Empty state:** when the subject has no decks, replace the list with one line of copy and a `New deck` button. Do not render the section label above an empty list.

  **§3 `/library` — Subjects tab rows.** Subject rows currently show icon, name, and description. Add a deck count so they preview their contents the same way deck rows do: subtitle line becomes the description if present; append or replace with `{n} decks` such that a subject with no description still shows its count. Simplest consistent rule: description on one line (omitted when empty), count as a second muted line. State which arrangement was used. Add the trailing `chevron-right` for consistency with deck rows. Do not otherwise restyle the library page. _(Superseded by Phase 2.7 §2.)_

  **§4 Button label consistency.** Across the app, creation controls use the forms `New subject`, `New deck`, `New card` — as visible labels where a label is shown, and as `aria-label` on icon-only buttons. Replace the existing `+ Subject` label on the library page accordingly. Grep for other variants and normalise.

  **§5 Accessibility.** Breadcrumb is a real link with discernible text. Icon-only buttons have the `aria-label`s above. List rows are keyboard-reachable and activate on Enter; use the same approach chosen in Phase 2.5 so both pages behave identically. The `chevron-right` is decorative — `aria-hidden="true"`.

  **§6 Tests.**
  - Meta line pluralisation: 0/1/many decks, 0/1/many cards.
  - Deck row subtitle: zero cards renders `No cards yet`; one card renders `1 card`.
  - Deck row subtitle truncates field names with a correct `+N`; a deck with ≤2 fields shows no `+N`.
  - Archived fields do not appear in `field_names`.
  - Subject with empty description renders no description line and no reserved gap.
  - Subject with no decks renders the empty state, not an empty section label.
  - Breadcrumb links to `/library`; deck row links to the right deck.
  - Icon-only buttons expose their accessible names.
  - Library subject row shows its deck count.
  - Assert the subject detail page issues a bounded number of queries — not one per deck.

- **Out of scope:** colours/palette, mastery indicators, search or filter, sorting, practice session behaviour, desktop layout.
- **Done when:** _Automated:_ frontend and backend tests green; `npx tsc -b` clean; no console errors on a subject with 0, 1, and 5+ decks. _Browser check (narrow viewport):_
  1. Breadcrumb sits above the header and returns to the library.
  2. Header shows the icon in a tile with the name and description beside it; check a subject with no description has no blank gap.
  3. Meta line reads `1 deck · 6 cards`; confirm a subject with 2 decks reads `2 decks`.
  4. Practice is visually dominant; New deck and Edit are icon buttons with comfortable tap targets.
  5. Deck rows show card count and field names; a deck with 4+ fields shows `+N`; a deck with no cards reads `No cards yet`.
  6. A long deck name and a long field list both truncate on one line rather than wrapping.
  7. Tapping a deck row opens that deck; the chevron is not separately tappable.
  8. A subject with no decks shows the empty state with a working New deck button.
  9. Library › Subjects rows now show deck counts and chevrons; the create button reads `New subject`.

  Report the subject-detail response shape found and any backend change made, the arrangement chosen for library row description-plus-count, and confirm the query count is bounded.

- Notes:

### Phase 2.7 — List row grammar

- [x] **Goal:** one shared `ListRow` grammar for how `/library` and `/subjects/:subjectId` display their children — identity and shape on the left, size on the right, chevron last.
- **Files:** the shared `ListRow` component (new); `LibraryPage` (Subjects tab rows); `SubjectDetailPage` (deck rows); tests — paths per repo convention.
- **Details:** addendum after Phase 2.6, before Phase 3. Presentation only, no endpoint changes. **Supersedes** Phase 2.6 §2.5 (deck list rows) and §3 (library subject rows); everything else in 2.6 stands — breadcrumb, header block, meta line, action row, empty states are unchanged.

  **§0 Why.** Both pages list children, and both currently stack every piece of information in one left column at similar weight. On library rows the description and the deck count are indistinguishable. On subject-page deck rows the subtitle packs a quantity and a schema list into one string joined by a middot that has to mean two different things. The fix is one grammar for both: **identity and shape on the left, size on the right, chevron last.** Position separates the categories, so no typographic trick is needed.

  **§1 Shared `ListRow` component.** Build this once and use it for both row types, so the consistency is structural rather than a convention that drifts.

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
  - Vertical padding 14px; hairline bottom border on every row except the last.
  - `title` — 15px, `text-primary`.
  - `subtitle` — 13px, `text-secondary`, **single line**, `white-space: nowrap` + `overflow: hidden` + `text-overflow: ellipsis`. It must never wrap, or rows with and without subtitles end up at different heights.
  - `meta` — 13px, `text-muted`, never truncated (the subtitle absorbs the pressure instead).
  - `chevron-right` — 16px, `text-muted`, `aria-hidden="true"`, decorative only and not separately tappable.
  - The whole row is one navigation target, keyboard-reachable and Enter-activated, using the same approach chosen in Phase 2.5.
  - Rows are keyed by entity id, never index.

  The `min-width: 0` on the text column is load-bearing — without it, a long subtitle pushes `meta` off the row instead of ellipsising.

  **§2 Library — Subjects tab.** Replaces the three-line stacked arrangement from 2.6 §3.

  | Slot       | Content                                           |
  | ---------- | ------------------------------------------------- |
  | `leading`  | Subject icon via the Phase 2.5 helper             |
  | `title`    | Subject name                                      |
  | `subtitle` | `subject.description`, omitted entirely when `""` |
  | `meta`     | `{n} decks`, singular at 1                        |

  A subject with no description renders a two-line row; one with a description renders a two-line row of the same height. That evenness is the point.

  **§3 Subject page — deck list.** Replaces the composite subtitle from 2.6 §2.5.

  | Slot | Content |
  | --- | --- |
  | `leading` | _(none)_ |
  | `title` | Deck name |
  | `subtitle` | Field names in `position` order, joined by `, `, archived excluded — first two names, with ` +N` appended when more remain. No `+N` at ≤2 fields. |
  | `meta` | `{n} cards` (singular at 1), or the literal `No cards` when zero |

  Note two changes from 2.6: the card count moves out of the subtitle into `meta` (the subtitle is now purely schema), and `No cards yet` shortens to `No cards` (it occupies a metadata slot now, not a sentence position). The subtitle is `text-secondary`, not `text-muted` — field names are the substantive thing about a deck, and shouldn't be as quiet as a count.

  **Accepted tradeoff:** the row no longer states the total field count; `+2` says how many are hidden, not how many exist. The total lives on the deck detail page's meta line. Do not add it back into the row.

  **§4 Tests.**
  - `ListRow` renders no subtitle element and no reserved gap when `subtitle` is absent.
  - A very long subtitle ellipsises on one line and does not displace or truncate `meta`.
  - Library row: description shown when present, omitted when `""`; deck count pluralises at 0/1/many.
  - Deck row: subtitle lists at most two field names; `+N` appears only above two; archived fields excluded and not counted in `N`.
  - Deck row: `meta` reads `No cards` at zero, `1 card` at one.
  - Both row types navigate to the correct route from a click and from Enter.
  - The chevron is not independently focusable or clickable.
  - Rows with and without a subtitle render at the same height.

- **Out of scope:** endpoint changes; restyling anything beyond the two row types.
- **Done when:** _Automated:_ frontend tests green; `npx tsc -b` clean. _Browser check (narrow viewport):_
  1. Library › Subjects — every row is the same height whether or not it has a description; counts sit right-aligned before the chevron.
  2. Add a subject with a very long description — it ellipsises on one line and the count stays put on the right edge.
  3. Subject page — deck rows show field names as the subtitle and the card count on the right; a deck with 4+ fields shows `+2`-style overflow; a deck with two fields shows no `+N`.
  4. A deck with zero cards reads `No cards`.
  5. Tap anywhere on a row (including on the count) and it navigates; tapping the chevron does nothing separate.
  6. Tab to a row and press Enter — it navigates.
  7. Both pages' rows share visibly the same rhythm: same height, same padding, same right-edge alignment.

  Confirm `ListRow` is a single shared component used by both pages, not duplicated markup.

- Notes:

### Phase 3 — Frontend: Subject create and edit

- [x] **Goal:** ship `SubjectForm` in both modes with its entry points, delete flow, and any missing single-subject backend endpoints.
- **Files:** `SubjectForm` (§4.2); `SubjectPicker` (§4.3) — built here, first used in Phase 4; entry-point wiring; `PATCH /api/subjects/:id` and `DELETE /api/subjects/:id` if missing; tests — paths per repo convention.
- **Details:**
  - `SubjectForm` in both modes (§4.2); `SubjectPicker` with inline create (§4.3 — as specified at the time; Phase 5.5 later replaced inline create with the overlay).
  - Wire create: Create sheet → Subject; Library › Subjects → `New subject`. (No contextual entry; subjects have no parent.)
  - Wire edit: Subject detail → `Edit` icon button → `SubjectForm` in edit mode; `Delete subject` inside it.
  - Verify `PATCH /api/subjects/:id` and `DELETE /api/subjects/:id` exist with sensible shapes; add if missing (small backend change, same PR is acceptable here since it's additive).
  - After create → navigate to the new subject's page; after edit → stay, header reflects changes; after delete → `/library`. Lists update via query invalidation, no manual refresh.
- **Out of scope:** the deck editor and `SubjectPicker`'s consumer (Phase 4); the icon picker (`icon-picker`, deferred).
- **Done when:** _Automated:_ form validation (empty name blocked in both modes); create submit; edit submit sends only the form's fields; delete confirm flow; query invalidation for list and detail. _Browser check:_ create a subject from the sheet with only a name → lands on its page → back to Library shows it with `0 decks`. Create another from the Library tab with a description → description shows on its row and header. Open a subject → `Edit` → change the description → save → header updates without reload. Open `Edit` on a subject with decks → `Delete subject` → confirm names the deck count → after confirming, you're on `/library` and it's gone. Keyboard doesn't cover the primary button on mobile. `Cancel` with changes prompts; without changes doesn't.
- Notes:

### Phase 4 — Frontend: Deck editor, create mode

- [x] **Goal:** ship `DeckEditor` in create mode with `CardFieldsForm`, `CardForm`'s in-editor role, and all three deck-creation entry points.
- **Files:** `DeckEditor` (§4.7, create mode only); `CardFieldsForm` (§4.5); `CardForm` in its in-editor role (§4.6); `ListRow` extended with `onClick` (§4.7); entry-point wiring; tests — paths per repo convention.
- **Details:**
  - `DeckEditor` per §4.7 in create mode only; `CardFieldsForm` honouring `SUPPORTED_FIELD_TYPES` (§2.5); `CardForm` in its in-editor role only.
  - Extend `ListRow` with `onClick` (§4.7) — keep the existing `to` behaviour byte-for-byte.
  - Wire: Create sheet → Deck; Library › Decks → `New deck`; Subject detail → `New deck` icon button (subject locked, as specified at the time; Phase 5.5 §5 later changed this to preselected-and-editable).
  - Inline subject creation from inside the editor via `SubjectPicker`.
- **Out of scope:** edit mode (Phase 7); drag reorder (`desktop-grid` territory; Move up/Move down only per §4.7).
- **Done when:** _Automated:_ reducer tests (add/rename/reorder/remove field; add/edit/remove card; values realigned after reorder; remove is a no-op at two fields, D3); payload builder (ordering, `""`→`null`, all-empty cards dropped, never fewer than two field_defs); type select offers only `text`; submit against MSW; `ListRow` with `onClick` renders no link and fires the handler on click and Enter. _Browser check:_ from Subject detail → `New deck` → subject locked. Rename `Term` to `Word`, add a third field, reorder it to first via the overflow menu's Move up. Type select shows only `text`. Add three cards, leave one fully empty; leave another with a blank first field → its editor row reads `empty`. Remove down to two fields, then try to remove either → blocked on both (D3). Remove a field that has values (while three or more remain) → confirm names the card count. Type a subject that doesn't exist → `Create "…"` → selected. Save → lands on deck detail; the table shows two cards, fields in your order, `empty` where you left a blank. Reload → persisted. Start a new deck, type something, `Cancel` → prompt.
- Notes:

### Phase 4.5 — Backend: single-card endpoints conform to §2.6 (conditional)

- [x] **Goal:** verify the pre-existing single-card endpoints against §2.6 line by line, and fix only what differs.
- **Files:** the card router and its tests; regenerated types — paths per repo convention; possibly nothing, if every rule already holds.
- **Details:** read the existing card router and compare against §2.6 line by line. If every rule already holds, record that in the report and skip to Phase 5 — do not refactor working code for style. If anything differs, fix it here:
  - Dense write on `POST` (omitted active fields → `""`).
  - Key validation against the deck's active fields (unknown/archived/foreign → 422).
  - All-blank → 422 on `POST` and on a `PATCH` that would leave the card blank.
  - Dense `CardRead.values` on every response.
  - Tests named for the rule they enforce, e.g. `test_card_create_writes_dense_rows_for_omitted_fields`, `test_card_create_rejects_archived_field_key`, `test_card_patch_cannot_blank_all_values`.
  - Regenerate types.
- **Out of scope:** refactors beyond §2.6 conformance.
- **Done when:** _Automated:_ backend tests green; types regenerated; `tsc -b` clean. _Browser check:_ in `/docs`, `POST /api/cards` with only one of two fields → `GET` shows both keys, the omitted one `""`. `POST` with a key from another deck → 422. `PATCH` blanking the last non-empty value → 422.
- Notes:

### Phase 5 — Frontend: Standalone card create, edit, delete

- [x] **Goal:** ship the standalone `CardForm` in both modes with `DeckPicker` and all card entry points.
- **Files:** `DeckPicker` (§4.4); `CardForm` standalone in both modes (§4.6); entry-point wiring; tests — paths per repo convention.
- **Details:**
  - `DeckPicker` with empty state → `/decks/new` (as specified at the time; Phase 5.5 replaced the in-list empty state with the always-present create row).
  - `CardForm` standalone in both modes (§4.6).
  - Wire create: Create sheet → Card; Deck detail → `New card` icon button (deck locked, as specified at the time; Phase 5.5 §5 changed this to preselected).
  - Wire edit: Deck detail table row tap → `CardForm` in edit mode; `Delete card` inside it.
  - Changing the deck after typing values → confirm → clear.
  - After any write, the deck detail query invalidates and the table reflects it.
- **Out of scope:** the deck editor's batched in-editor card edits (Phase 7); picker behaviour changes (Phase 5.5).
- **Done when:** _Automated:_ picker empty state; deck-change confirm/clear; create submit; edit submit sends only changed keys; delete confirm flow; invalidation. _Browser check:_ Deck detail → `New card` → deck locked, inputs match the deck's fields in order → save → new row in the table. Tap that row → form prefilled → change one value → save → table updates. Tap it again → `Delete card` → confirm → row gone; meta line count decrements. From the sheet → Card → pick a deck → type → switch deck → confirm → inputs cleared. On a fresh account, sheet → Card shows `Create a deck first` and leads to the deck editor. A deck containing an `image`-typed field (seed one via `/docs`) renders that field read-only with the unsupported note and does not crash.
- Notes:

### Phase 5.4 — Backend: `last_activity_at` and recency ordering

- [x] **Goal:** implement D13 — the two timestamp columns, the `touch()` bubbling helper at every event, and server-side recency ordering for every subject/deck list.
- **Files:** Alembic migration for `subject` and `deck`; the `touch()` helper; every handler in D13's bubbling table; list endpoints; `Subject`/`Deck` read schemas; tests; regenerated types — paths per repo convention.
- **Details:**

  **§1 Schema.** Alembic migration, for both `subject` and `deck`:
  - `updated_at timestamptz NOT NULL`, `server_default=now()`, backfilled from `created_at`. **No `onupdate`**, despite that being the obvious first instinct: SQLAlchemy's column-level `onupdate` fires on _any_ UPDATE to the row, not only ones that changed that specific column — combined with `touch()` writing `last_activity_at` on rows whose own columns didn't change, it would wrongly bump `updated_at` on those too. Set explicitly instead, by every own-column-edit handler, alongside its `touch()` call (see §2). _(Phase 7.7 later dropped this column entirely.)_
  - `last_activity_at timestamptz NOT NULL`, `server_default=now()`, backfilled from `created_at`. Also no `onupdate` — this column is only ever set explicitly by `touch()` (own-column edits call `touch()` too; see §2).
  - Working downgrade.

  **§2 Bubbling.** One helper, used everywhere: `touch(session, *rows)` sets `last_activity_at = now()` on the given rows. It never writes `updated_at`. Call it inside the existing transaction — never a separate commit — at every event in D13's table:
  - Subject own-column edit handler → `touch(subject)`.
  - Deck own-column edit handler → `touch(deck)`.
  - Deck create/delete/subject-change handlers → `touch(subject)` (both subjects on a move) and `touch(deck)`.
  - Every field_def write path (the `/fields` endpoint family; Phase 6's batch edit when it lands) → `touch(deck)`.
  - `POST /api/cards`, `PATCH /api/cards/{id}`, `DELETE /api/cards/{id}` → `touch(deck)`.
  - `POST /api/decks` atomic create → deck's `last_activity_at` set at insert; `touch(subject)`.

  The D13-maintenance note was added to §2.3 so Phase 6 is built against it (updated after §1's `onupdate` attempt turned out not to work: `updated_at` is set explicitly by the handler, not automatically).

  **§3 Ordering.** Every endpoint that returns a list of subjects or decks orders by `last_activity_at DESC, id` server-side. The frontend never sorts these lists. `Subject` and `Deck` read schemas included both `updated_at` and `last_activity_at` (Phase 7.7 dropped `updated_at`; only `last_activity_at` remains).

- **Out of scope:** adding either column to `card`, `field_def`, or anything else; any frontend change (recency ordering arrives free via the server, verified in the browser check).
- **Done when:** _Automated:_ migration up and down clean; backend tests green, named for the rule they enforce —
  - `test_subject_timestamps_equal_created_at_on_insert` (and deck).
  - `test_subject_edit_bumps_updated_at_and_last_activity` (and deck).
  - `test_deck_create_touches_subject_last_activity`, `test_deck_delete_touches_subject_last_activity`, `test_deck_move_touches_both_subjects_last_activity`.
  - `test_field_write_touches_deck_last_activity` (one per write path that exists today).
  - `test_card_create_touches_deck_last_activity`, `test_card_patch_touches_deck_last_activity`, `test_card_delete_touches_deck_last_activity`.
  - **`test_card_edit_does_not_change_deck_updated_at`** — the guard that keeps the audit field honest. Same for field writes: `test_field_write_does_not_change_deck_updated_at`.
  - `test_card_edit_does_not_touch_subject`.
  - `test_subject_list_ordered_by_last_activity_desc`, `test_deck_list_ordered_by_last_activity_desc`, `test_subject_decks_ordered_by_last_activity_desc`.

  Types regenerated; `tsc -b` clean. _Browser check:_ in `/docs`, list subjects → note the order. `PATCH` the last subject's description → list again → it's first, and its `updated_at` and `last_activity_at` both moved. `POST` a card into a deck in another subject → `GET` that deck → `last_activity_at` moved, **`updated_at` did not**; it's first in its subject's deck list; the subject order is unchanged. Open `/library` → subjects and decks already appear in recency order with no frontend change.

- Notes: Phase 7.7 later removed `updated_at` and the two `does_not_change_deck_updated_at` guard tests along with it.

### Phase 5.5 — Frontend: Picker behaviour

- [x] **Goal:** correct the two picker spec errors (create row always present; contextual parent preselected, not locked) and add the universal list cap.
- **Files:** `frontend/src/lib/pickerConfig.ts` (new); the shared picker base component (extracted here if the two pickers don't already share one); `SubjectPicker`; `DeckPicker`; `SubjectForm`'s wrappers; `DeckEditor` (`returnTo`); `CardStandaloneForm`; every contextual entry point (§5 below); tests — paths per repo convention.
- **Details:**

  **§0 What changes and why.** Two spec errors being corrected:
  1. **Inline create was gated on typed text.** The `Create "…"` option only appeared after typing a non-matching name, so a user who just opened the picker never saw any way to create. The create option is now always present.
  2. **Contextual creation locked the parent.** Context should set the default, not remove the choice.

  And one new rule: one universal cap on how many items any search dropdown lists. This task rewrote D1's last sentence, rewrote D4's first sentence, and deleted D9 — the decisions list above already reads in its corrected form.

  **§1 Universal list cap.**

  ```ts
  // src/lib/pickerConfig.ts
  export const PICKER_MAX_ITEMS = 8;
  ```

  Every search dropdown lists at most `PICKER_MAX_ITEMS` matches. One constant, never a literal. With an empty query, the listed items are the first `PICKER_MAX_ITEMS` in the order the server returned them (D13: most recent `last_activity_at` first — do not re-sort on the client). When more exist than are shown, a muted non-interactive footer row reads `Showing {shown} of {total} · type to narrow`. The create row always follows it.

  **§2 Shared picker behaviour.** Both pickers share this; if they don't already share a base component, extract one now rather than fixing two copies.
  - **Opening:** focus or click opens the list. With an empty query, show items per §1 — **always**, including when there are zero items (then the list is just the create row).
  - **Filtering:** case-insensitive substring on name, cap applied after filtering, server order preserved among matches.
  - **Create row:** always last, hairline above it, leading `plus` icon, label `New subject…` / `New deck…`. Present regardless of query and regardless of matches. Reachable by arrow keys and Enter.
  - The in-list empty-state copy (`You don't have any decks yet.`) is removed — the create row _is_ the empty state.
  - **`defaultValue`** preselects an item on mount; the input shows its name; clearing the input reopens the full list. This is how contextual entry points pass the parent.
  - **`locked`:** unchanged — static chip, no combobox. Used only by card edit mode.
  - Keep the `role="combobox"` contract and the two focus/filter fixes from Phase 5.

  **§3 `SubjectPicker` → subject form overlay.** Selecting `New subject…`:
  - Opens `SubjectForm` (create mode) inside the existing `FullScreenDialog`, **over the still-mounted deck editor**. Editor state is untouched.
  - `SubjectForm` must work both as a routed page (Phase 3, unchanged) and as a dialog body. Do what Phase 5 did for cards: the form body takes `onSuccess(subject)` / `onCancel()`; the route page and the dialog are two thin wrappers. Do not duplicate the form.
  - **Success:** dialog closes, subjects query invalidates, picker value becomes the new subject (from the response — don't wait for the refetch).
  - **Cancel:** dialog closes, picker value unchanged.
  - Dialog has `aria-label="New subject"` and returns focus to the picker on close.

  **§4 `DeckPicker` → deck editor round-trip.** This path is deliberately different from §3: a deck editor is too heavy to nest in a dialog, and the card form has nothing to lose before a deck is chosen. Selecting `New deck…` from the card form:
  - If the card form has typed values, the existing deck-change confirm fires first. Confirm → clear and proceed; cancel → stay.
  - Navigate to `/decks/new` with `state: { returnTo: location.pathname }`.
  - `DeckEditor` reads `returnTo`. On **Save**, it navigates to `returnTo` with `state: { deckId }` instead of to the deck's detail page. On **Cancel**, it navigates to `returnTo` with no state.
  - `CardStandaloneForm` reads `state.deckId` on mount and preselects via `defaultValue`.
  - The deck editor's own subject overlay can open during this trip; `returnTo` survives it.

  **§5 Contextual entry points.** Every create flow that previously passed `locked` now passes `defaultValue`:
  - Subject detail → `New deck` → `SubjectPicker defaultValue={subject}`.
  - Deck detail → `New card` and its empty-state button → `DeckPicker defaultValue={deck}`.
  - Card **edit** → `DeckPicker locked` — unchanged.

  The deck editor's subject row renders the combobox with the subject preselected in create mode, not a static chip.

  **§6 Tests.**
  - Zero items → exactly one row: the create row.
  - `PICKER_MAX_ITEMS + 3` items, empty query → `PICKER_MAX_ITEMS` rows in server order, the footer, then the create row.
  - Typing narrows; create row still last and keyboard-reachable.
  - `defaultValue` preselects; clearing shows the full list.
  - `SubjectPicker` create → overlay; cancel → no change; success → new subject selected, editor's other fields untouched.
  - `DeckPicker` create with typed values → confirm → `/decks/new` with `returnTo`.
  - `DeckEditor` with `returnTo` → there with `deckId` on save, without on cancel.
  - `CardStandaloneForm` preselects from `state.deckId`.
  - No client-side sort of subject or deck lists — grep for `.sort(` on those arrays.
  - No literal `8` where a picker caps its list — grep.

- **Out of scope:** backend changes; drag enhancements; any picker consumer beyond the entry points listed in §5.
- **Done when:** _Automated:_ frontend tests green; `tsc -b` and `eslint .` clean. _Browser check (narrow viewport):_
  1. Subject detail → `New deck` → subject picker shows `CompTIA A+` preselected **and editable**. Clear it → full list, most recent activity first, `New subject…` last.
  2. `New subject…` → form over the editor → save → back with the new subject selected and the deck name you'd typed still present.
  3. Same, Cancel → back with `CompTIA A+` still selected.
  4. With ≥ 9 subjects, open empty → 8 rows, `Showing 8 of N` footer, `New subject…`. Type to narrow.
  5. Edit a subject's description, reopen the picker → that subject is now first.
  6. Sheet → Card → open the deck picker without typing → decks listed by recency, `New deck…` last.
  7. `New deck…` → editor → save → back on the card form with the new deck preselected and its fields rendered.
  8. Same, Cancel in the editor → back with no deck selected.
  9. Deck detail → `New card` → deck preselected and editable; tap a card row → edit mode → deck is a static chip.
  10. Add a card to a deck → go to `/library` › Decks → that deck is first.

  Report whether the two pickers share a base component and confirm `SubjectForm` is one component with two wrappers.

- Notes:

### Phase 6 — Backend: batch deck edit

- [x] **Goal:** ship `PATCH /api/decks/{id}` per §2.3 — one transaction, stated operation order, D3/D10/D13 maintained.
- **Files:** the deck router's batch-edit handler and its tests; regenerated types — paths per repo convention.
- **Details:** `PATCH /api/decks/{id}` per §2.3, single transaction, stated operation order, including the D10 and D13 maintenance paragraphs there.
- **Out of scope:** the frontend consumer (Phase 7).
- **Done when:** _Automated:_ backend tests green — each operation alone; combined create-field + add-card-using-client_key; delete-below-two-fields → 422 (both from two fields and from one, if reachable); foreign id → 422; mid-request failure rolls back everything; reorder updates positions contiguously; **`test_field_create_backfills_dense_card_field_value_rows`** — adding a field to a deck with existing cards gives every one of them a new `""` row, in the same transaction; **`test_field_delete_cascades_card_field_value_rows`** — deleting a field removes its `card_field_value` rows (D10/D11). Types regenerated; `tsc` green. _Browser check:_ in `/docs`, on the deck from Phase 1: add a field via `client_key` and a card referencing it in the same request; `GET` and confirm both exist with the card's value attached to the new field's real id. Send a delete of every field → 422.
- Notes:

### Phase 7 — Frontend: Deck editor, edit mode

- [x] **Goal:** load a deck into the editor, diff against the frozen original into a §2.3 changeset, and wire the Edit entry point.
- **Files:** `DeckEditor` edit mode; the diff function; `deckDetailToEditorState`; Deck detail `Edit` wiring; tests — paths per repo convention.
- **Details:**
  - Load `DeckDetail` into editor state with ids; keep a frozen copy as `original`.
  - Diff function → §2.3 changeset. Unit-test it exhaustively; it's the riskiest pure code in the feature.
  - Wire Deck detail → `Edit`.
  - Deleting a field shows the cascade confirm with the count of affected cards (this time it's destructive on the server).
  - Cards section in edit mode uses the same `ListRow` rows as create mode; tapping a row opens `CardForm` in its in-editor role, not the standalone edit mode — edits here are batched into the changeset, not sent immediately.
- **Out of scope:** staged-removal presentation and save-in-place (Phase 7.5); deck deletion (Phase 7.6).
- **Done when:** _Automated:_ diff tests (no-op → empty body; rename only; reorder only; new field + new card referencing it; delete card; mixed); submit against MSW. _Browser check:_ edit the Phase 4 deck: rename a field, add a field, add a card with a value in the new field, delete one old card, reorder → Save → detail reflects all of it → reload → persisted. Open edit, change nothing, Save → no request is sent (or an empty-body request that's a no-op — state which). Open edit, delete down to two fields, then try either → blocked in UI (D3). Edit a card from inside the deck editor, then `Cancel` the editor → the card is unchanged on the detail page.
- Notes: this task widened §2.3's `cards.update.values` to accept `client_key` (see the annotation there).

### Phase 7.5 — Staged removals and save-in-place

- [x] **Goal:** make staged changes look staged in the deck editor — pending-removal rows, one global Undo, the destructive confirm moved to Save, and save-in-place.
- **Files:** `DeckEditor` reducer, diff builder call sites, header controls, and their tests — paths per repo convention.
- **Details:** addendum before Phase 8; deck editor only — presentation of staged removals, the confirm's timing, and post-save behaviour. _(Revised after the first implementation shipped and was reviewed live — the per-row undo buttons and the per-field "clears values on N cards" note added more UI than wanted. This revision replaces both with one global Undo and one aggregate save-time warning; everything else about the shipped version — staging instead of deleting, the diff builder's handling of pending rows, save-in-place — is unchanged.)_

  **§0 Grounding.** Nothing in the editor reaches the backend before Save — Phase 7 verified this by request interception. This task fixes the _perception_: removals used to vanish instantly behind a present-tense confirm, which reads as "applied." Staged changes must look staged — and reverting them, or the rest of an in-progress edit, should be one obvious action rather than something to hunt for per row.

  **§1 Pending removal, no per-row undo.**
  - **Existing (saved) fields:** Remove no longer deletes the row from the list and no longer shows a confirm. The row enters a `pendingRemoval` state: struck-through name, ghosted (~50% opacity), name input and type select disabled, drag/move disabled. The row's own remove control is replaced with nothing interactive — there is no per-row way to reverse just this one field, no inline note, no confirm at click time. The row keeps its position.
  - **Brand-new fields** (added this session, no server id): Remove deletes the row outright, no staging — nothing to stage, nothing to undo.
  - **Cards, same treatment for consistency:** deleting a _saved_ card from the in-editor `CardForm` marks its `ListRow` pending-removal (struck-through title, row no longer opens the form, no per-row affordance). A _new_ card deletes outright.
  - **Reducer:** `EditorField`/`EditorCard` gain `pendingRemoval?: boolean`, meaningful only when `id` is present. `removeField`/`removeCard` on an id-bearing entity toggles it on; there is no per-row action that toggles it back off (that's §2's job now). The two-field floor (D3) counts **non-pending** fields: marking a field pending when only two active remain is blocked, same message as before.
  - **Diff builder:** unchanged from the shipped version. `pendingRemoval` entities land in `field_defs.delete` / `cards.delete`. Pending fields are excluded from `order`, and no card update may reference them. Pending cards contribute no update entries. New-field rows that were removed appear nowhere.
  - **Validity:** pending rows are exempt from name validation (a struck-through duplicate name must not block Save).

  **§2 One global Undo.** A single **Undo** control sits in the header next to Save, edit mode only, enabled exactly when the form is dirty (same gate as Save, minus validity — Undo doesn't care whether the current state is valid, only whether there's anything to revert). Clicking it discards every uncommitted change in one step — renames, reorders, added fields/cards, and every pending removal (struck-through rows included) — reverting the whole form back to `original`, the frozen baseline from Phase 7's own diffing (the state as loaded, or as last rebased after a successful save, per §4). Implementation-wise this is the same `LOAD` reducer action §4 already needs for the post-save rebuild, just dispatched with `original` instead of a fresh server response — no new reducer case. No confirm on Undo itself — nothing has reached the server yet, so a misclick just means re-doing local edits, not lost server state.

  **§3 The confirm moves to Save, aggregated.** Save shows a confirm **only when the changeset is destructive** — i.e. it contains `field_defs.delete` entries or `cards.delete` entries. The body states counts only, not a per-field breakdown:

  > This deletes 1 field and affects 2 cards. This can't be undone.

  Omit whichever noun is zero — fields-only reads "This deletes 1 field. This can't be undone.", and symmetrically for cards-only. Buttons: `Cancel` / `Save changes` (destructive style). Non-destructive saves (renames, adds, reorders) show no confirm at all. Create mode never shows it — nothing exists yet to destroy.

  **§4 Save stays on the page (edit mode).** On a successful `PATCH`:
  - **Do not navigate.** Rebuild editor state from the response `DeckDetail` via the existing `deckDetailToEditorState` — one call, exactly as on load. This rebases `original`, resolves every `client_key` to its real id, and clears all pending flags naturally. Everything just saved, so nothing is lost by rebuilding.
  - Save disables again (state is clean) until the next change; Undo disables under the same gate.
  - Feedback: the Save control shows a transient `Saved ✓` state (~2s) before reverting to `Save`. No toast system exists; don't build one for this.
  - Header left control reads **`Done`** when the editor is clean and **`Cancel`** when dirty. `Done` exits to the deck detail page with no prompt; `Cancel` keeps the existing discard confirm. (After a save the button therefore reads `Done`, which is the exit path.)

  **Unchanged:** create mode still navigates on save (to the new deck, or to `returnTo` per Phase 5.5). The `returnTo` round-trip is untouched. Edit mode is never entered with a `returnTo`. Create mode has no Undo control — there's nothing saved yet to revert to; Cancel already covers it.

  **§5 Tests.**
  - Reducer: `removeField`/`removeCard` still stage saved entities and delete new ones outright; floor counts non-pending fields only; pending rows exempt from name validation. New: dispatching `LOAD` with the frozen `original` after a mix of a rename, a new field, and a staged removal restores the exact original fields/cards/name/subject and clears `dirty` — this is "Undo all" end to end.
  - Diff: pending field → `delete`, excluded from `order`, its values absent from card updates; pending card → `delete`, no update entry; state reverted via `LOAD` produces no diff at all.
  - Component: a staged row has no interactive undo of its own; the global Undo button is absent/disabled when clean and reverts a mix of edits in one click when dirty; save confirm appears only for a destructive changeset and reads the new aggregate wording; save-in-place (no navigation, state rebuilt from response, `Saved ✓`, Save disabled, header reads `Done`, a further edit re-dirties and re-enables both Save and Undo); `Done` exits without prompt, `Cancel` while dirty still prompts.

- **Out of scope:** the diff/batch architecture (untouched); a toast system.
- **Done when:** _Automated:_ frontend tests green; `tsc -b`, `eslint .` clean. _Browser check (narrow viewport, seeded deck):_
  1. Remove a saved field with values → row stays, struck through, disabled, no inline note, no per-row undo control. **Network tab: zero requests.**
  2. Click the global Undo → everything reverts (the removed field reappears; any other edits made in the same session revert too). Undo then disables (clean again).
  3. Add a field, remove it → gone outright, nothing staged.
  4. Remove a saved field, tap Save → aggregate confirm ("This deletes 1 field...") → confirm → **one** `PATCH`; still on the editor; removed row gone from the list (it's gone from the response); Save shows `Saved ✓` then disables; header reads `Done`; Undo also disables.
  5. Rename-only edit → Save → no confirm, one `PATCH`, still on the page.
  6. Mark a saved card for deletion → its row is struck through and no longer opens the form, no per-row undo; the global Undo restores it.
  7. With three fields, mark one pending → try marking another → blocked by the two-field floor.
  8. `Done` returns to deck detail, which reflects everything actually saved.
- Notes: revised mid-flight after live review of the first implementation (per-row undo and per-field cascade notes replaced by the global Undo and the aggregate save confirm).

### Phase 7.6 — Deck deletion

- [x] **Goal:** give `DeckEditor` the `Delete deck` action the other two entity forms have always had — a plain gap-fill, copying the established convention exactly.
- **Files:** `DeckEditor` only — paths per repo convention.
- **Details:** addendum to Phase 7 (§4.7's `DeckEditor` spec), before Phase 8. `SubjectForm` and `CardStandaloneForm` have always had a `Delete {entity}` action in edit mode (§4.2, §4.6); `DeckEditor` never got its equivalent, and `DELETE /api/decks/{id}` has existed since Phase 1.5 with no frontend caller. No new backend work, no new decisions.
  - `Delete deck` button, edit mode only, placed at the bottom of the page (after the Cards section, before the confirm dialogs) — mirrors where `SubjectForm`/`CardStandaloneForm` place theirs.
  - Behind a `ConfirmDialog`, `title="Delete deck?"`, destructive, `confirmLabel="Delete"`: description is `This will also delete {n} cards. This can't be undone.` when the deck has cards, else `This can't be undone.` — same phrasing shape as `SubjectForm`'s deck-count confirm. The count is the deck's real (server-known) card count, not the live editor state — deleting ignores whatever's staged/unsaved, same as the other two entities' delete already does.
  - `handleDeleteDeck`: `deleteDeck(deckId)` → invalidate `['decks']`, `['decks', subjectId]`, `['subjects']` (deliberately not `['deck', deckId]` — that query is still mounted on this page until `navigate()` unmounts it, and invalidating it triggers an immediate refetch that 404s before navigation runs) → `navigate('/subjects/:subjectId')` (the deck's own parent, same "one level up" pattern as a card's delete going to its deck).
  - On failure: same inline error + re-enable pattern already used by every other delete/save handler in this file (`setFormError`/`setSaveError`, `setSubmitting(false)`, close the confirm).
- **Out of scope:** backend changes; new decisions; anything outside `DeckEditor`.
- **Done when:** _Automated:_ frontend tests green; `tsc -b`, `eslint .` clean. _Browser check (narrow viewport, seeded deck):_
  1. Create mode → no `Delete deck` button anywhere on the page.
  2. Edit mode, deck with cards → `Delete deck` → confirm names the real card count → `Delete` → `DELETE` request fires → lands on the deck's subject page → the deck is gone from that subject's list.
  3. Edit mode, deck with zero cards → confirm reads just `This can't be undone.` (no count clause).
  4. Deleting ignores unsaved edits: type a rename, don't save, delete anyway → deck is gone (the typed rename never mattered).
- Notes:

### Phase 7.7 — Drop `updated_at` from subject/deck

- [x] **Goal:** remove the never-consumed `updated_at` audit column from `subject` and `deck`, finalizing D13 (→ ADR 018).
- **Files:** `Subject`, `SubjectRead`, `Deck`, `DeckRead`, `DeckDetail` schemas/models; `db_update_subject`; `apply_deck_batch_edit`; migration `d99d2883e31f`; the affected tests; regenerated types.
- **Details:** addendum to Phase 5.4 (D13). `updated_at` shipped as an audit field alongside `last_activity_at`, but a review of every consumer found none — nothing reads, displays, sorts, or branches on it anywhere in the backend or frontend; the API returned it and nothing more. `last_activity_at` remains untouched and is still the sort key for every subject/deck list.
  - `Subject`, `SubjectRead`, `Deck`, `DeckRead`, `DeckDetail` — `updated_at` field removed.
  - `db_update_subject`, `apply_deck_batch_edit` — the explicit `row.updated_at = utcnow()` writes removed (each was set by hand, never via `onupdate` — see Phase 5.4 §1).
  - New migration `d99d2883e31f` (down-revision of `053542e7d50b`, not an amendment to it) drops both columns; downgrade re-adds them with `server_default=now()`.
  - Phase 5.4 §1's schema list and its `does_not_change_deck_updated_at` guard tests (`test_field_write_does_not_change_deck_updated_at`, `test_card_edit_does_not_change_deck_updated_at`) no longer apply — deleted outright, not adapted, since the invariant they enforced (own-column-only, no bubbling) no longer has a column to enforce it on. The `updated_at`-named own-column-edit tests (`test_subject_edit_bumps_updated_at_and_last_activity`, `test_deck_edit_bumps_updated_at_and_last_activity`) were renamed to drop the `updated_at` half and keep asserting `last_activity_at`.
- **Out of scope:** `last_activity_at` (untouched).
- **Done when:** _Automated:_ migration up/down/up clean; backend tests green; types regenerated; frontend `tsc -b`, `vitest run`, `eslint .` clean. _Browser check:_ in `/docs`, `GET`/`PATCH` a subject and a deck — response bodies include `last_activity_at` but no `updated_at`; nothing 500s.
- Notes:

## Deferred — do not build (Phase 8; do not start without explicit go-ahead)

- `desktop-grid`: grid presentation of the editor above a breakpoint, column-header type select, header drag reorder.
- `paste-import`: paste TSV/CSV into the grid to create cards.
- `draft-persistence`: localStorage draft for the editor with "Resume draft?".
- `icon-picker`, `field-types`.
