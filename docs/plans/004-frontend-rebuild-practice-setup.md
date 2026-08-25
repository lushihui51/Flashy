# Flashy Practice Setup — Execution Plan

Covers everything up to and including _creating_ a practice session: the overview, deck configuration authoring, session creation, and the entry points that lead into them. **Running** a session (showing prompts, rating, requeueing) is the next task on its own branch and is out of scope here — this plan ends when a freshly created session's detail page is on screen.

## How to use this document

Execute **one phase per session**. Do not run ahead. At the end of each phase, stop and report against the acceptance criteria; wait for confirmation before starting the next.

Work on branch `rewrite/practice-setup`. The follow-up run-flow task will branch as `rewrite/practice-run` off this one once merged. Commit at each phase boundary with the message given in the phase.

Component, route, and hook names below are **descriptive, not prescriptive** — name the actual artifacts according to the project's current frontend conventions. Database and API vocabulary, however, is exact and must match the schema, and the words shown to a user are fixed by the Canonical vocabulary below.

**This document is the sole source for this task.** It was written from a braindump that is now fully absorbed into it, including the two places the braindump had to be corrected. Do not go back to that braindump for requirements, and do not quote it: where the two would disagree, this wins.

---

## Non-negotiable invariants

These carry over from `001-schema-rewrite.md` or were decided for this task. If an implementation seems to require breaking one, stop and raise it.

1. **`practice_deck` has no configuration lineage.** There is no `source_config_id` and none may be added. A practice does not know which `deck_practice_config` it came from, by design (schema invariant 5) — so "which practices relate to this subject/deck" is answerable *only* through `practice_deck.deck_id → deck → subject`, and any definition of relevance that starts from a configuration is unimplementable.
2. **Create = start.** The practice creation page's Create button runs the full Phase 4.2 session-start path: create `practice_session`, snapshot one `practice_deck` per selected configuration, generate all `practice_card` rows. There is no draft state, no deferred generation, no session that exists but has no cards.
3. **Editing or deleting a `deck_practice_config` never touches any practice** — past or active. The UI must not imply otherwise (no "this will affect N sessions" warnings).
4. **Fields are referenced by `field_def.id` everywhere.** Names are display strings. The builder's payload contains uuids only.
5. **Archived fields never appear in the configuration builder.** Not in the drag source, not in any row. (An existing configuration that references a since-archived field loads without it, and the backend rejects one that has gone stale at session start.)
6. **The four field arrays of a configuration are pairwise disjoint** — the builder enforces this _by construction_: dragging a field into a row moves it (a field lives in exactly one place: the unassigned box or one row), never copies it.
7. **One configuration per deck per practice.** `UNIQUE (practice_session_id, deck_id)` backs this; the creation page enforces it in the selection UI and still surfaces the server error if it slips through.
8. **The default session name is computed on the client**, in the browser's timezone. The server stores whatever string it receives and has no timezone logic. (See Phase 0 for the mechanism.)
9. **Ownership stays query-scoped** (schema invariant 7). Any endpoint added in Phase 0 takes `user_id` in the query, returning 404 for foreign resources.

---

## Canonical vocabulary

One word per concept. The middle column is what a user reads — in a heading, a button, a
confirm, or an error; the right column is what the code and the schema call the same thing.

| Concept | Written as | Entity |
| --- | --- | --- |
| one run of practice | **practice** | `practice_session` |
| a deck's prompt/answer field layout | **deck configuration** (**configuration** where the deck is already the context) | `deck_practice_config` |
| the copy a practice takes at start | never shown, and never called a configuration | `practice_deck` |
| the list of practices | **Practice** | — |
| where a practice is created | **New practice** | — |
| where a configuration is authored | **New configuration** / **Edit configuration** | — |
| one practice's own page | practice detail | — |

**Never write "practice config" (corrected 2026-08-24).** A `deck_practice_config` configures a
**deck** — which of that deck's fields act as prompts and which as answers. It is deck-owned
(`deck_id` cascades, `UNIQUE (deck_id, name)`, and every field id in it must be live on that
deck), and no practice ever references one: a practice *copies* what it needs at start
(invariant 1). What configures a practice is the *selection* of deck configurations plus its
name, which is the New practice surface. Calling the template a "practice config" collapses
those two ideas and makes New practice read as a duplicate.

The table, models and endpoints keep the name `deck_practice_config` — it is already deck-first
and accurate. Reasoning: `docs/cc/2026-08-24-deck-configuration-naming.md`.

---

## Phase 0 — Backend verification and gap-fill

**Goal:** confirm what Phase 4.1/4.2 actually shipped, and close the gaps this UI needs. Assume nothing about which endpoints exist; read the code.

**Verify (read the code, do not assume):**

- `deck_practice_config` CRUD: create, **update, delete**, and list/get all exist with validation running on create _and_ update, per Phase 4.1.
- Session start endpoint: exact request shape (does it take a list of configuration ids? does it re-validate and snapshot per 4.2?), response shape, and the error it returns when a stale configuration fails validation (e.g. all prompt fields archived since saving) — the creation page needs to render this distinctly.
- Pool-count semantics at generation time: how `prompt_pool_counts` with multiple values is consumed (which count is drawn per card). Record the answer in this document's margin or the phase report — the builder's frequency-checkbox help text depends on it. Do not guess.
- Session list endpoint: exists? pagination style (memory says keyset pagination exists for sessions — confirm scope)?

**Build / adjust (API-first, per the Phase 7 lesson — fix shapes here, not with client-side joins later):**

1. **Migration: add `name varchar NOT NULL` to `practice_session`.** The client always sends it. Mechanism for the default: the creation page pre-fills the name input with the current local date-time formatted via `new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })` (browser timezone, user-editable before submit). The server never derives names and never touches timezones. No uniqueness constraint on session names.
2. **Session list endpoint** returning list-ready rows: `id, name, status, created_at`, plus an embedded deck summary per session: `decks: [{deck_id, deck_name, subject_id, subject_name}]` sourced from `practice_deck → deck → subject`. This is what makes overview filtering possible without client-side joins. Accept optional `subject_id` / `deck_id` query filters (EXISTS over `practice_deck`); given current data volumes client-side filtering would work, but the query params keep the contract honest — implement them.
3. **Deck configuration list endpoint** returning list-ready rows: the configuration's own fields plus `deck_name, subject_id, subject_name`, filterable by `subject_id` / `deck_id`.
4. **Deck detail for the builder**: an endpoint (likely existing) returning a deck's **live** (`archived_at IS NULL`) `field_def`s with `id, name, type, position`.
5. Regenerate OpenAPI types after all of the above.

**Acceptance:** one Alembic revision for the name column; `alembic check` clean; the verification findings written into the phase report (including the pool-count semantics answer); new/changed endpoints have tests including the two-user 404 check; regenerated types compile.

**Commit:** `feat: practice_session name and list endpoints for practice UI`

---

## Phase 1 — practice_overview and entry points

**Overview surface:**

- Lists the user's sessions from the Phase 0 list endpoint, newest first.
- **Filters: subject and deck.** Both are selectable; the deck options narrow to the selected subject when one is set (two decks may share a name across subjects, so the deck filter is by deck **id**, with the subject providing disambiguation). Filters combine with AND. Relevance per invariant 1: a session matches if any of its `practice_deck` rows points to a matching deck.
- **Status handling (in scope, decided 2026-08-24):** the session model is **two statuses — `active` and `completed`; `abandoned` is dropped.** Backend pre-steps for this phase:
  - shrink `SessionStatus` (enum + CHECK migration) and change the ADR 015 read-path transition in `get_current_practice_card` to set `completed` when no pending card remains;
  - record the decision as an amendment to ADR 015. The accepted blur: a session stranded by deck deletion also reads Completed. Mitigate in display only — when `practice_deck.deck_id` is null, render its deck chip as "deleted deck".

  Tab row: All · Active · Completed. Each row shows name, status badge, created date, and deck/subject chips. Clicking any session opens practice_details (Phase 4 defines what details shows per status).

- **Session delete (in scope, decided 2026-08-24):** with `abandoned` gone, user delete is the only way a session ever leaves the list, so it ships now. Backend pre-steps: verify/add `ON DELETE CASCADE` on `practice_card.practice_session_id` and `practice_deck.practice_session_id` (ADR 015 defined deck-delete cascades, not session-delete — a `practice_deck` survives its _deck_ dying but is owned by its _session_), then a DELETE endpoint. `review_log` is untouched: its `practice_card_id` already goes SET NULL and `card_id`/`field_def_id` stay populated, so history and mastery rebuilds are unaffected. UI: delete with confirm from the overview row and from practice_details.
- **New practice** button → session creation surface, carrying current filters as initial state. Its route (`/practice/new`) has no page until this phase builds one.
- Filter state lives in the URL (query params), so entry points below can deep-link.

**Entry points:**

1. **Top bar:** Practice item beside Create → overview with no filters.
2. **Side bar:** same target, same route. (Duplicating a primary action across nav levels is fine practice; keep it literally the same link so there is one code path.)
3. **Home page launchers:** deferred. Do not build.
4. **Subject page Practice button** → overview with `subject` pre-filtered to that subject. **Deck page Practice button** → overview with `deck` (and its subject) pre-filtered. These replace the current "dumb" buttons.

**Acceptance:** overview renders real sessions; subject/deck/status filters compose correctly (verify with a seeded multi-subject fixture containing two same-named decks in different subjects); all four entry points land with the right pre-filters; MSW tests cover the filter logic.

**Commit:** `feat: practice overview with subject/deck/status filters and entry points`

---

## Phase 2 — deck configuration builder (create + edit) and configuration management

The centrepiece of this task. Build it as one surface used for both create and edit (edit loads an existing configuration and pre-populates).

**Flow:**

- Like card creation: nothing renders below the deck picker until a deck is chosen and its live field_defs are fetched.
- **Deck picker (combobox) context rules**, driven by how the user arrived (router state from the pre-filter chain, see Phase 4):
  - arrived with a subject in context → that subject's decks sort first;
  - arrived with a deck in context → that deck **pre-selected**, its subject's other decks sorted first in the dropdown;
  - no context → all decks, grouped or labeled by subject.
- **Name input** naming the **configuration**, not a practice — a practice is named later, on New practice (`deck_practice_config.name`, unique per deck). Pre-filled with the current local date-time via `formatDate`/`formatDateTime` (ADR 019). On save, a `UNIQUE (deck_id, name)` violation is surfaced inline on this input, not as a toast-and-lose-work.
- Changing the selected deck after fields have been assigned resets the board (with a confirm if any assignment exists).

**The assignment board:**

- Top: a draggable box holding the deck's live field_defs (by `name`), i.e. the _unassigned_ set.
- Below: a table with four rows — `prompt_fields`, `answer_fields`, `prompt_pool`, `answer_pool` — and columns: row label · **fields** (drop zone) · **frequency**.
- Drag is **move** semantics (invariant 6): box → row, row → row, row → box. A field exists in exactly one place.
- **Frequency column:** for the two pool rows only, a checkbox list labeled 1…n where n = number of fields currently in that row. Zero fields in a pool row, or any non-pool row → show `N/A`. When a field is dragged out of a pool row and n shrinks, **prune any checked value now greater than n**. Checked values become the `*_pool_counts` array (sorted ascending).
- **Payload mapping:** row contents → `prompt_field_ids`, `answer_field_ids`, `prompt_pool_ids` + `prompt_pool_counts`, `answer_pool_ids` + `answer_pool_counts`. Uuids only.

**Client-side validation, mirroring the backend exactly (backend remains authoritative):**

- at least one producible prompt: `prompt_fields` non-empty, OR `prompt_pool` non-empty with ≥1 count checked; same for the answer side;
- a pool row with fields but zero checked counts is invalid;
- disjointness needs no validation — it is structural.

Save stays disabled with an inline explanation until valid.

**Configuration management (in scope, decided; revised 2026-08-24):**

- A deck's configurations live **on that deck's own page**, as a `Cards` / `Configurations` tab pair using the same grammar the library uses for Subjects / Decks. There is no cross-deck list: a configuration belongs to exactly one deck, and Phase 3 presents them grouped by deck as part of choosing what to practise. The active tab is a URL param so the builder can navigate away and land back on the list it came from.
- Routes are `/deck-configurations/new` and `/deck-configurations/:configId/edit`, mirroring `/cards/new` — the other deck-owned thing with both a deck-page entry point and a standalone form that opens on a deck picker.
- Edit → this builder, pre-populated. Delete → plain confirm; copy in the confirm states that existing practices are unaffected (invariant 3) — no scarier than that.

**Acceptance:** create, edit, and delete round-trip against the real backend; a configuration referencing a since-archived field never shows it in the builder; frequency pruning verified when dragging fields out of a pool; each backend validation rule has a matching disabled-save state client-side; duplicate-name error renders inline; MSW tests for the payload mapping (drag state → arrays).

**Commit:** `feat: deck_practice_config builder with drag assignment and config management`

_Shipped in `4c32349`, renamed to this vocabulary in `b24b4aa`._

---

## Phase 3 — practice creation (session start)

- **Filters:** subject and deck, same semantics and same component as the overview's (deck narrowed by subject). Relevant configurations: all whose deck is in the selected subject, or whose deck is the selected deck; no filter → all of the user's configurations.
- **Configuration list, grouped by deck** (deck name + subject name as the group header — this is where same-named decks in different subjects stay distinguishable). Selection is **radio-per-deck**: at most one configuration selected within each deck's group (invariant 7), any number of decks. A "New configuration" button opens the Phase 2 builder carrying the current subject/deck context; on save, return here with the new configuration selected. This list is also the only cross-deck view of configurations there is — Phase 2 put management on each deck's page.
- **Name input**, pre-filled with the client-side local date-time string (Phase 0 mechanism), editable.
- **Create button:** enabled when ≥1 configuration selected. Calls the session-start endpoint with the name and selected configuration ids. On success → navigate to practice_details for the new session.
- **Failure states:** a stale-configuration validation failure at start (Phase 0 verified the error shape: `{code: "stale_config", config_id, message}`) renders against the _specific offending configuration_ in the list — "this configuration no longer produces any prompts; edit it" — selection preserved, nothing else lost. Also handle the empty states: no configurations exist at all (point to New configuration), and filters that match zero (say so; offer to clear filters).

**Acceptance:** integration test — filter, select two configurations from two decks, create, land on details, and verify via API that the session has two `practice_deck` snapshot rows and generated `practice_card`s; radio-per-deck enforced in UI and the server's uniqueness error still handled; stale-configuration failure path exercised with a seeded configuration whose fields were archived after saving.

**Commit:** `feat: practice creation flow with configuration selection`

---

## Phase 4 — practice_details and the contextual pre-filter chain

**practice_details (deliberately thin — the run task will grow it):**

- Session name, status badge, created date, deck/subject chips.
- **Active:** a Start Practice button. Since create = start (invariant 2), the cards already exist; the button is **pure navigation** to the run surface. Until that surface exists, it navigates to a stub route.
- **Completed:** same header, no Start button; body says a summary is coming later. Do not build stats now.
- **Delete** with confirm (Phase 1's endpoint), also surfaced here; on success, navigate back to the overview.
- Reachable from overview click-through and as the landing page after creation.

**Wire and verify the full pre-filter chain, end to end:**

- Subject page → overview (subject filtered) → New practice (subject filtered) → New configuration (subject's decks prioritized in the picker).
- Deck page → overview (deck filtered) → New practice (deck filtered) → New configuration (deck pre-selected, same-subject decks prioritized).

Context rides on URL params/router state established in Phases 1–3; this phase is where the chain is tested as a whole rather than per page.

**Acceptance:** both chains verified in the browser and by an MSW-backed test walking each chain; details renders correctly for both statuses (seed one of each) and for a session whose deck was deleted (chip shows "deleted deck"); delete round-trips and `review_log` rows survive it; `tsc` clean; full test suite green.

**Commit:** `feat: practice details and contextual pre-filter chain`

---

## Deferred — do not build

- The run surface (prompt rendering, rating, requeue display) — next task, `rewrite/practice-run`, which will also decide what a completed session's summary shows.
- Home page practice launchers.
- **Restart** ("run again" on practice_details). Design is settled, build is deferred to the run task: create a new session from the old session's own `practice_deck` snapshot rows — never from the saved `deck_practice_config`, which may have changed or been deleted — then delete the old session. One transaction, **creation first**, so a failed restart (e.g. every snapshot field since archived, zero cards survive the 4.2 skip rules) leaves the old session intact. Snapshots with `deck_id` null are unrestartable. The new run regenerates against current mastery, so ordering and prompt/answer combinations will differ from the original — intended.
- Any "stale" badge on configuration lists (configurations referencing since-archived fields). Session start already handles it, and opening one in the builder silently drops the dead ids; revisit only if users hit the failure state often.
- Session rename from the UI. Out of scope for this task; raise separately if wanted.
